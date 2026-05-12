import os
import re
import shutil
import uuid
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
import models
import recommender
import audio_features
from fastapi.concurrency import run_in_threadpool
from models import SessionLocal, Song, UserLike, UserPlay, User
from auth import get_current_user, get_admin_user, create_token, hash_password, verify_password, revoke_token, security
from mutagen.mp3 import MP3
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, APIC
import io

# ========== راه‌اندازی ==========
app = FastAPI()

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# پوشه‌ها
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_path):
    app.mount("/frontend", StaticFiles(directory=frontend_path), name="frontend")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ========== دیتابیس ==========
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========== مدل ساده ==========
class UserCreate(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

# ========== تابع پاکسازی نام خواننده ==========
def clean_artist_name(raw: str) -> str:
    """پاکسازی نام خواننده از متن‌های اضافی مثل www، (Official)، و ..."""
    if not raw:
        return "Unknown Artist"
    # حذف محتوای داخل پرانتز، کروشه، بریس (و خود پرانتزها)
    raw = re.sub(r'[\(\[{].*?[\)\]}]', '', raw)
    # حذف کلمات حاوی http, www, .com, .ir, bandmusic و ...
    raw = re.sub(r'\S*?(?:www|http|\.com|\.ir|bandmusic|band|channel)\S*', '', raw, flags=re.IGNORECASE)
    # حذف عبارات رایج اضافی
    raw = re.sub(r'(?i)(official|channel|vevo|topic|\|-topic|music video|audio|official music video|official video|\(?official\)?)', '', raw)
    # حذف کاراکترهای جداکننده (خط تیره، عمود، دو نقطه) و گرفتن قسمت اول
    raw = re.split(r'[-–—:|]', raw)[0].strip()
    # حذف spaces اضافی و علائم تکراری
    raw = re.sub(r'\s+', ' ', raw).strip()
    # حذف نقطه و ویرگول انتهایی
    raw = re.sub(r'[,.;:]$', '', raw).strip()
    # اگر خالی شد، Unknown Artist
    return raw if raw else "Unknown Artist"

# ========== تصویر پیش‌فرض برای کاور ==========
def default_cover():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#1ed760"/>
        <circle cx="100" cy="80" r="30" fill="white"/>
        <rect x="75" y="95" width="50" height="40" fill="white"/>
        <text x="100" y="165" text-anchor="middle" fill="white" font-size="40">🎵</text>
    </svg>'''
    return StreamingResponse(io.BytesIO(svg.encode()), media_type="image/svg+xml")

# ========== دریافت کاور آهنگ ==========
@app.get("/cover/{song_id}")
def get_cover(song_id: int, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song or not os.path.exists(song.file_path):
        return default_cover()
    
    try:
        audio = MP3(song.file_path, ID3=ID3)
        if audio.tags:
            for tag in audio.tags.values():
                if isinstance(tag, APIC):
                    image_data = tag.data
                    mime = tag.mime if tag.mime else 'image/jpeg'
                    return StreamingResponse(io.BytesIO(image_data), media_type=mime)
        return default_cover()
    except Exception as e:
        print(f"Error getting cover for song {song_id}: {e}")
        return default_cover()

# ========== مسیرهای عمومی ==========
@app.get("/")
def root():
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "API is running, but index.html was not found in frontend folder"}

@app.get("/ping")
def ping():
    return {"message": "pong"}

# ========== سایت‌مپ و robots.txt برای سئو ==========
SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "https://vibinoo.ir")

@app.get("/robots.txt", response_class=StreamingResponse)
def robots_txt():
    content = f"""User-agent: *
Allow: /
Disallow: /admin/
Disallow: /uploads/

Sitemap: {SITE_BASE_URL}/sitemap.xml
"""
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/plain"
    )

@app.get("/sitemap.xml", response_class=StreamingResponse)
def sitemap_xml(db: Session = Depends(get_db)):
    from datetime import datetime

    songs = db.query(models.Song).filter(models.Song.approved == True).all()
    artists = db.query(models.Artist).all()
    public_playlists = db.query(models.Playlist).filter(models.Playlist.is_public == True).all()

    today = datetime.utcnow().strftime("%Y-%m-%d")

    urls = []

    # صفحه اصلی
    urls.append(f"""  <url>
    <loc>{SITE_BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>{today}</lastmod>
  </url>""")

    # صفحات آهنگ‌ها
    for song in songs:
        artist_name = song.artist.name if song.artist else "Unknown"
        urls.append(f"""  <url>
    <loc>{SITE_BASE_URL}/?song={song.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>{today}</lastmod>
  </url>""")

    # صفحات خواننده‌ها
    for artist in artists:
        import urllib.parse
        encoded = urllib.parse.quote(artist.name)
        urls.append(f"""  <url>
    <loc>{SITE_BASE_URL}/#artist_{encoded}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>{today}</lastmod>
  </url>""")

    # پلی‌لیست‌های همگانی
    for pl in public_playlists:
        urls.append(f"""  <url>
    <loc>{SITE_BASE_URL}/#playlist_{pl.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <lastmod>{today}</lastmod>
  </url>""")

    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
    xml_content += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n'
    xml_content += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n'
    xml_content += "\n".join(urls)
    xml_content += "\n</urlset>"

    return StreamingResponse(
        io.BytesIO(xml_content.encode("utf-8")),
        media_type="application/xml"
    )

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(400, "Username taken")
    
    new_user = User(
        username=user.username,
        hashed_password=hash_password(user.password),
        is_admin=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token = create_token(new_user.id, new_user.username, db)
    return {"access_token": token, "token_type": "bearer", "user_id": new_user.id}

@app.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(401, "Wrong credentials")
    token = create_token(db_user.id, db_user.username, db)
    return {"access_token": token, "token_type": "bearer", "user_id": db_user.id}

@app.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    revoke_token(credentials.credentials, db)
    return {"message": "Logged out successfully"}

@app.post("/change-password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(401, "کلمه عبور فعلی اشتباه است.")
    
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "رمز عبور با موفقیت تغییر کرد."}


@app.get("/search/")
def search_songs(q: str, skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    if not q:
        return {"items": [], "total": 0}
    
    query = db.query(Song).join(models.Artist).filter(
        Song.approved == True,
        or_(
            Song.title.ilike(f"%{q}%"),
            models.Artist.name.ilike(f"%{q}%")
        )
    )
    total = query.count()
    songs = query.offset(skip).limit(limit).all()
    
    result = []
    for song in songs:
        like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
        result.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else "Unknown Artist",
            "like_count": like_count,
            "uploader_id": song.user_id
        })
    return {"total": total, "items": result}


@app.get("/songs/")
def list_songs(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    query = db.query(Song).filter(Song.approved == True)
    total = query.count()
    songs = query.offset(skip).limit(limit).all()
    result = []
    for song in songs:
        like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
        result.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else "Unknown",
            "like_count": like_count,
            "uploader_id": song.user_id
        })
    return {"total": total, "items": result}

@app.get("/song/{song_id}")
def get_song(song_id: int, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id, Song.approved == True).first()
    if not song:
        raise HTTPException(404, "Song not found")
    like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
    return {
        "id": song.id,
        "title": song.title,
        "artist": song.artist.name if song.artist else "Unknown",
        "like_count": like_count,
        "uploader_id": song.user_id
    }

@app.get("/like/status/{song_id}")
def like_status(song_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(UserLike).filter(
        UserLike.user_id == current_user.id,
        UserLike.song_id == song_id
    ).first()
    return {"liked": existing is not None}

@app.get("/most-liked/")
def most_liked_songs(limit: int = 50, db: Session = Depends(get_db)):
    songs = db.query(Song).filter(Song.approved == True).all()
    result = []
    for song in songs:
        like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
        result.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else "Unknown",
            "like_count": like_count,
            "uploader_id": song.user_id
        })
    result.sort(key=lambda x: x["like_count"], reverse=True)
    return result[:limit]

@app.get("/stream/{song_id}")
def stream_song(song_id: int, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song or not os.path.exists(song.file_path):
        raise HTTPException(404, "Song not found")
    
    file_size = os.path.getsize(song.file_path)
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": "audio/mpeg",
        "Content-Length": str(file_size)
    }
    
    return FileResponse(
        song.file_path,
        media_type="audio/mpeg",
        headers=headers
    )

@app.get("/download/{song_id}")
def download_song(song_id: int, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song or not os.path.exists(song.file_path):
        raise HTTPException(404, "Song not found")
    
    # Force download by setting filename
    return FileResponse(
        song.file_path,
        media_type="audio/mpeg",
        filename=f"{song.artist.name if song.artist else 'Unknown'} - {song.title}.mp3"
    )

# ========== مسیر آپلود (نسخه اصلاح شده با ذخیره موقت و چک داپلیکیت) ==========
@app.post("/upload/")
async def upload_song(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # استفاده از basename برای جلوگیری از path traversal
    safe_filename = os.path.basename(file.filename)
    temp_filename = f"{uuid.uuid4().hex}_{safe_filename}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # استخراج متادیتا از ID3
    detected_title = os.path.splitext(file.filename)[0]
    detected_artist = "Unknown Artist"
    try:
        audio = MP3(temp_path, ID3=EasyID3)
        if audio.get('title'):
            detected_title = str(audio.get('title')[0])
        if audio.get('artist'):
            detected_artist = str(audio.get('artist')[0])
    except Exception as e:
        print(f"Could not read ID3 tags: {e}")
    
    # پاکسازی نام خواننده
    cleaned_artist = clean_artist_name(detected_artist)
    cleaned_title = detected_title.strip()
    
    # پیدا کردن یا ایجاد آرتیست
    artist_obj = db.query(models.Artist).filter(models.Artist.name == cleaned_artist).first()
    if not artist_obj:
        artist_obj = models.Artist(name=cleaned_artist)
        db.add(artist_obj)
        db.commit()
        db.refresh(artist_obj)
        
    # پیدا کردن یا ایجاد آلبوم (برای سادگی فعلا آلبوم با نام خواننده یا تایتل ساخته می‌شود، اگر تگ آلبوم باشد بهتر است، ولی در اینجا خالی می‌گذاریم)
    album_name = "Single"
    try:
        if audio.get('album'):
            album_name = str(audio.get('album')[0])
    except:
        pass
        
    album_obj = db.query(models.Album).filter(models.Album.title == album_name, models.Album.artist_id == artist_obj.id).first()
    if not album_obj:
        album_obj = models.Album(title=album_name, artist_id=artist_obj.id)
        db.add(album_obj)
        db.commit()
        db.refresh(album_obj)
    
    # بررسی داپلیکیت
    existing_song = db.query(Song).filter(
        Song.title == cleaned_title,
        Song.artist_id == artist_obj.id
    ).first()
    
    if existing_song:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail="این آهنگ قبلاً با همین خواننده آپلود شده است.")
    
    # تعیین نام نهایی
    final_filename = f"{current_user.id}_{uuid.uuid4().hex}_{safe_filename}"
    final_path = os.path.join(UPLOAD_DIR, final_filename)
    if os.path.exists(final_path):
        os.remove(final_path)
    os.rename(temp_path, final_path)
    
    features = await run_in_threadpool(audio_features.extract_features, final_path)
    
    new_song = Song(
        title=cleaned_title,
        artist_id=artist_obj.id,
        album_id=album_obj.id,
        file_path=final_path,
        user_id=current_user.id,
        duration=features["duration"],
        danceability=features["danceability"],
        energy=features["energy"],
        valence=features["valence"],
        approved=True
    )
    db.add(new_song)
    db.commit()
    db.refresh(new_song)
    
    return {"message": "Uploaded successfully!", "song_id": new_song.id}

# ========== لایک کردن/برداشتن لایک ==========
@app.post("/like/{song_id}")
def toggle_like(song_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(UserLike).filter(
        UserLike.user_id == current_user.id,
        UserLike.song_id == song_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False, "message": "Like removed"}
    else:
        like = UserLike(user_id=current_user.id, song_id=song_id)
        db.add(like)
        db.commit()
        return {"liked": True, "message": "Liked"}

@app.post("/play/")
def play_song(song_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    play = UserPlay(user_id=current_user.id, song_id=song_id)
    db.add(play)
    db.commit()
    return {"ok": True}

@app.get("/recommend/")
def recommend(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        rec_ids = recommender.get_recommendations(db, current_user.id)
        songs = db.query(Song).filter(Song.id.in_(rec_ids), Song.approved == True).all()
        result = []
        for song in songs:
            like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
            result.append({
                "id": song.id,
                "title": song.title,
                "artist": song.artist.name if song.artist else "Unknown",
                "like_count": like_count,
                "uploader_id": song.user_id
            })
        return result
    except Exception as e:
        print(f"Recommendation error: {e}")
        return []

# ========== مسیرهای ادمین ==========
@app.get("/admin/stats")
def admin_stats(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_songs = db.query(Song).count()
    pending_songs = db.query(Song).filter(Song.approved == False).count()
    total_likes = db.query(UserLike).count()
    total_plays = db.query(UserPlay).count()
    
    return {
        "total_users": total_users,
        "total_songs": total_songs,
        "pending_songs": pending_songs,
        "total_likes": total_likes,
        "total_plays": total_plays
    }

@app.get("/admin/users")
def admin_users(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "is_admin": u.is_admin} for u in users]

@app.post("/admin/make_admin/{user_id}")
def make_admin(user_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_admin = True
    db.commit()
    return {"message": f"User {user.username} is now admin"}

@app.delete("/admin/delete_user/{user_id}")
def delete_user(user_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.username} deleted"}

@app.get("/admin/songs")
def admin_songs(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    songs = db.query(Song).all()
    result = []
    for song in songs:
        like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
        result.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else "Unknown",
            "approved": song.approved,
            "like_count": like_count
        })
    return result

@app.post("/admin/approve_song/{song_id}")
def approve_song(song_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(404, "Song not found")
    song.approved = True
    db.commit()
    return {"message": f"Song {song.title} approved"}

@app.delete("/admin/delete_song/{song_id}")
def delete_song(song_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    try:
        song = db.query(Song).filter(Song.id == song_id).first()
        if not song:
            return JSONResponse(status_code=404, content={"detail": "Song not found"})
        
        if os.path.exists(song.file_path):
            os.remove(song.file_path)
        
        db.query(UserLike).filter(UserLike.song_id == song_id).delete()
        db.query(UserPlay).filter(UserPlay.song_id == song_id).delete()
        db.delete(song)
        db.commit()
        
        return {"message": f"Song {song.title} deleted"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

# ========== دریافت آهنگ‌های لایک شده کاربر جاری ==========
@app.get("/liked-songs/")
def get_liked_songs(
    skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(UserLike).filter(UserLike.user_id == current_user.id)
    total = query.count()
    likes = query.offset(skip).limit(limit).all()
    song_ids = [like.song_id for like in likes]
    
    if not song_ids:
        return {"total": total, "items": []}
    
    songs = db.query(Song).filter(Song.id.in_(song_ids), Song.approved == True).all()
    
    result = []
    for song in songs:
        like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
        result.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else "Unknown",
            "like_count": like_count,
            "uploader_id": song.user_id
        })
    
    return {"total": total, "items": result}

# ========== دریافت آهنگ‌های آپلود شده توسط کاربر جاری ==========
@app.get("/my-songs/")
def get_my_songs(
    skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Song).filter(Song.user_id == current_user.id)
    total = query.count()
    songs = query.offset(skip).limit(limit).all()
    
    result = []
    for song in songs:
        like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
        result.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else "Unknown",
            "file_path": song.file_path,
            "like_count": like_count,
            "uploader_id": song.user_id
        })
    return {"total": total, "items": result}

# ========== حذف آهنگ توسط کاربر (فقط آهنگ‌های خودش) ==========
@app.delete("/my-song/{song_id}")
def delete_my_song(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    song = db.query(Song).filter(Song.id == song_id).first()
    
    if not song:
        return JSONResponse(status_code=404, content={"detail": "Song not found"})
    
    if song.user_id != current_user.id and not current_user.is_admin:
        return JSONResponse(status_code=403, content={"detail": "You can only delete your own songs"})
    
    if os.path.exists(song.file_path):
        os.remove(song.file_path)
    
    db.query(UserLike).filter(UserLike.song_id == song_id).delete()
    db.query(UserPlay).filter(UserPlay.song_id == song_id).delete()
    db.delete(song)
    db.commit()
    
    return {"message": f"Song '{song.title}' deleted successfully"}

# ========== پلی‌لیست ==========
@app.get("/playlists/")
def get_user_playlists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    playlists = db.query(models.Playlist).filter(
        models.Playlist.user_id == current_user.id
    ).all()
    
    result = []
    for pl in playlists:
        song_count = db.query(models.PlaylistSong).filter(
            models.PlaylistSong.playlist_id == pl.id
        ).count()
        like_count = db.query(models.PlaylistLike).filter(
            models.PlaylistLike.playlist_id == pl.id
        ).count()
        preview_song_ids = [ps.song_id for ps in pl.songs[:4]]
        result.append({
            "id": pl.id,
            "name": pl.name,
            "song_count": song_count,
            "share_id": pl.share_id,
            "is_public": pl.is_public,
            "cover_path": pl.cover_path,
            "preview_song_ids": preview_song_ids,
            "like_count": like_count,
            "created_at": pl.created_at
        })
    return result

@app.get("/playlists/public")
def get_public_playlists(
    db: Session = Depends(get_db)
):
    playlists = db.query(models.Playlist).filter(
        models.Playlist.is_public == True
    ).all()
    
    result = []
    for pl in playlists:
        song_count = db.query(models.PlaylistSong).filter(
            models.PlaylistSong.playlist_id == pl.id
        ).count()
        like_count = db.query(models.PlaylistLike).filter(
            models.PlaylistLike.playlist_id == pl.id
        ).count()
        preview_song_ids = [ps.song_id for ps in pl.songs[:4]]
        result.append({
            "id": pl.id,
            "name": pl.name,
            "creator": pl.user.username if pl.user else "Unknown",
            "song_count": song_count,
            "share_id": pl.share_id,
            "cover_path": pl.cover_path,
            "preview_song_ids": preview_song_ids,
            "like_count": like_count,
            "created_at": pl.created_at
        })
    # مرتب‌سازی بر اساس تعداد لایک (رنکینگ)
    result.sort(key=lambda x: x["like_count"], reverse=True)
    return result

@app.post("/playlist/create")
def create_playlist(
    name: str,
    is_public: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    import secrets
    share_id = secrets.token_urlsafe(8)
    
    new_playlist = models.Playlist(
        name=name,
        user_id=current_user.id,
        share_id=share_id,
        is_public=is_public
    )
    db.add(new_playlist)
    db.commit()
    db.refresh(new_playlist)
    
    return {"id": new_playlist.id, "name": new_playlist.name, "share_id": share_id, "is_public": is_public}

@app.post("/playlist/{playlist_id}/toggle-public")
def toggle_playlist_public(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id,
        models.Playlist.user_id == current_user.id
    ).first()
    
    if not playlist:
        raise HTTPException(404, "Playlist not found")
    
    playlist.is_public = not playlist.is_public
    db.commit()
    return {"id": playlist.id, "is_public": playlist.is_public}

@app.post("/playlist/{playlist_id}/upload-cover")
async def upload_playlist_cover(
    playlist_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id,
        models.Playlist.user_id == current_user.id
    ).first()
    
    if not playlist:
        raise HTTPException(404, "Playlist not found")
    
    # ذخیره تصویر
    filename = f"playlist_{playlist_id}_{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # حذف کاور قبلی اگر وجود داشت
    if playlist.cover_path and os.path.exists(playlist.cover_path):
        try:
            os.remove(playlist.cover_path)
        except:
            pass
            
    playlist.cover_path = file_path
    db.commit()
    
    return {"message": "Cover uploaded", "cover_url": f"/uploads/{filename}"}

@app.get("/playlist-cover/{playlist_id}")
def get_playlist_cover(playlist_id: int, db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist or not playlist.cover_path or not os.path.exists(playlist.cover_path):
        # بازگشت خالی یا هندل کردن در فرانت‌اند برای کلاژ
        return JSONResponse(status_code=404, content={"detail": "No custom cover"})
    
    return FileResponse(playlist.cover_path)

@app.post("/playlist/{playlist_id}/like")
def toggle_playlist_like(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.PlaylistLike).filter(
        models.PlaylistLike.user_id == current_user.id,
        models.PlaylistLike.playlist_id == playlist_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False}
    else:
        new_like = models.PlaylistLike(user_id=current_user.id, playlist_id=playlist_id)
        db.add(new_like)
        db.commit()
        return {"liked": True}

@app.get("/playlist/like/status/{playlist_id}")
def playlist_like_status(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.PlaylistLike).filter(
        models.PlaylistLike.user_id == current_user.id,
        models.PlaylistLike.playlist_id == playlist_id
    ).first()
    return {"liked": existing is not None}

@app.get("/playlist/{playlist_id}")
def get_playlist_songs(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id
    ).filter(
        or_(
            models.Playlist.user_id == current_user.id,
            models.Playlist.is_public == True
        )
    ).first()
    
    if not playlist:
        raise HTTPException(404, "Playlist not found")
    
    songs = db.query(models.Song).join(
        models.PlaylistSong,
        models.PlaylistSong.song_id == models.Song.id
    ).filter(
        models.PlaylistSong.playlist_id == playlist_id,
        models.Song.approved == True
    ).all()
    
    result = []
    for song in songs:
        like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
        result.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else "Unknown",
            "like_count": like_count,
            "uploader_id": song.user_id
        })
    return {
        "id": playlist.id,
        "name": playlist.name,
        "creator": playlist.user.username if playlist.user else "Unknown",
        "cover_path": playlist.cover_path,
        "songs": result
    }

@app.post("/playlist/{playlist_id}/add/{song_id}")
def add_to_playlist(
    playlist_id: int,
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id,
        models.Playlist.user_id == current_user.id
    ).first()
    
    if not playlist:
        raise HTTPException(404, "Playlist not found")
    
    existing = db.query(models.PlaylistSong).filter(
        models.PlaylistSong.playlist_id == playlist_id,
        models.PlaylistSong.song_id == song_id
    ).first()
    
    if existing:
        return {"message": "Song already in playlist"}
    
    playlist_song = models.PlaylistSong(
        playlist_id=playlist_id,
        song_id=song_id
    )
    db.add(playlist_song)
    db.commit()
    
    return {"message": "Song added to playlist"}

@app.delete("/playlist/{playlist_id}/remove/{song_id}")
def remove_from_playlist(
    playlist_id: int,
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id,
        models.Playlist.user_id == current_user.id
    ).first()
    
    if not playlist and not current_user.is_admin:
        raise HTTPException(403, "Not authorized to modify this playlist")

    playlist_song = db.query(models.PlaylistSong).filter(
        models.PlaylistSong.playlist_id == playlist_id,
        models.PlaylistSong.song_id == song_id
    ).first()
    
    if not playlist_song:
        raise HTTPException(404, "Song not in playlist")
    
    db.delete(playlist_song)
    db.commit()
    
    return {"message": "Song removed from playlist"}

@app.delete("/playlist/{playlist_id}")
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id,
        models.Playlist.user_id == current_user.id
    ).first()
    
    if not playlist:
        raise HTTPException(404, "Playlist not found")
    
    db.query(models.PlaylistSong).filter(
        models.PlaylistSong.playlist_id == playlist_id
    ).delete()
    
    db.query(models.PlaylistLike).filter(
        models.PlaylistLike.playlist_id == playlist_id
    ).delete()
    
    db.delete(playlist)
    db.commit()
    
    return {"message": "Playlist deleted"}

@app.get("/shared-playlist/{share_id}")
def get_shared_playlist(
    share_id: str,
    db: Session = Depends(get_db)
):
    playlist = db.query(models.Playlist).filter(
        models.Playlist.share_id == share_id
    ).first()
    
    if not playlist:
        raise HTTPException(404, "Playlist not found")
    
    songs = db.query(models.Song).join(
        models.PlaylistSong,
        models.PlaylistSong.song_id == models.Song.id
    ).filter(
        models.PlaylistSong.playlist_id == playlist.id,
        models.Song.approved == True
    ).all()
    
    result = []
    for song in songs:
        like_count = db.query(UserLike).filter(UserLike.song_id == song.id).count()
        result.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else "Unknown",
            "like_count": like_count,
            "uploader_id": song.user_id
        })
    
    return {
        "playlist_name": playlist.name,
        "creator": playlist.user.username if playlist.user else "Unknown",
        "songs": result
    }

@app.get("/user-play-history/")
def get_user_play_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plays = db.query(UserPlay).filter(UserPlay.user_id == current_user.id).all()
    result = []
    for play in plays:
        song = db.query(Song).filter(Song.id == play.song_id).first()
        if song:
            result.append({
                "song_id": song.id,
                "title": song.title,
                "artist": song.artist.name if song.artist else "Unknown"
            })
    return result

# ========== اجرا ==========
if __name__ == "__main__":
    import uvicorn
    print("🚀 Server is starting on http://127.0.0.1:8765")
    uvicorn.run("main:app", host="127.0.0.1", port=8765, reload=False)