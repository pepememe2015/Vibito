import os
import sys
from models import SessionLocal, Song, UserLike, UserPlay

def clean_artist_name(raw: str) -> str:
    """همان تابع پاکسازی که در main.py استفاده شده (برای هماهنگی)"""
    import re
    if not raw:
        return "Unknown Artist"
    raw = re.sub(r'[\(\[{].*?[\)\]}]', '', raw)
    raw = re.sub(r'\S*?(?:www|http|\.com|\.ir|bandmusic|band|channel)\S*', '', raw, flags=re.IGNORECASE)
    raw = re.sub(r'(?i)(official|channel|vevo|topic|\|-topic|music video|audio|official music video|official video|\(?official\)?)', '', raw)
    raw = re.split(r'[-–—:|]', raw)[0].strip()
    raw = re.sub(r'\s+', ' ', raw).strip()
    raw = re.sub(r'[,.;:]$', '', raw).strip()
    return raw if raw else "Unknown Artist"

def remove_duplicate_songs():
    db = SessionLocal()
    all_songs = db.query(Song).all()
    
    # دیکشنری برای نگهداری اولین آهنگ از هر کلید (title, artist) بعد از پاکسازی
    # توجه: برای آهنگ‌های موجود، نام خواننده را هم پاکسازی می‌کنیم تا یکدست شود.
    # اما اگر نخواهیم نام خواننده آهنگ‌های موجود را تغییر دهیم، می‌توانیم فقط همان artist اصلی را مقایسه کنیم.
    # برای دقت بیشتر، پیشنهاد می‌کنم ابتدا نام خواننده موجود را هم پاکسازی کنی و بعد مقایسه.
    # در این اسکریپت، ما آهنگ‌ها را بر اساس (title, artist_cleaned) گروه‌بندی می‌کنیم.
    
    groups = {}  # key: (title, cleaned_artist) -> list of song objects
    for song in all_songs:
        cleaned = clean_artist_name(song.artist)
        key = (song.title, cleaned)
        if key not in groups:
            groups[key] = []
        groups[key].append(song)
    
    to_delete = []
    for key, songs in groups.items():
        if len(songs) > 1:
            # اولین آهنگ را نگه دار، بقیه را حذف کن
            keep = songs[0]
            for dup in songs[1:]:
                to_delete.append(dup)
    
    if not to_delete:
        print("✅ هیچ آهنگ تکراری یافت نشد.")
        db.close()
        return
    
    print(f"🔍 {len(to_delete)} آهنگ تکراری پیدا شد. در حال حذف...")
    for song in to_delete:
        if os.path.exists(song.file_path):
            os.remove(song.file_path)
            print(f"   حذف فایل: {song.file_path}")
        # حذف لایک‌ها و پلی‌های مرتبط
        db.query(UserLike).filter(UserLike.song_id == song.id).delete()
        db.query(UserPlay).filter(UserPlay.song_id == song.id).delete()
        db.delete(song)
    
    db.commit()
    print(f"✅ {len(to_delete)} آهنگ تکراری با موفقیت حذف شدند.")
    db.close()

if __name__ == "__main__":
    remove_duplicate_songs()