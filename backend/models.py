# backend/models.py
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# آدرس دیتابیس
SQLALCHEMY_DATABASE_URL = "sqlite:///./music.db"

# اتصال به دیتابیس
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# سشن برای ارتباط با دیتابیس
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# کلاس پایه برای مدل‌ها
Base = declarative_base()

# ========== مدل کاربر ==========
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    security_question = Column(String, nullable=True)
    security_answer = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)

# ========== مدل هنرمند ==========
class Artist(Base):
    __tablename__ = "artists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    
    songs = relationship("Song", back_populates="artist")

# ========== مدل آلبوم ==========
class Album(Base):
    __tablename__ = "albums"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    artist_id = Column(Integer, ForeignKey("artists.id"))
    
    artist = relationship("Artist")
    songs = relationship("Song", back_populates="album")

# ========== مدل آهنگ ==========
class Song(Base):
    __tablename__ = "songs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    artist_id = Column(Integer, ForeignKey("artists.id"), nullable=False)
    album_id = Column(Integer, ForeignKey("albums.id"), nullable=True)
    file_path = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    duration = Column(Float, default=0.0)
    danceability = Column(Float, default=0.0)
    energy = Column(Float, default=0.0)
    valence = Column(Float, default=0.0)
    approved = Column(Boolean, default=False)
    
    artist = relationship("Artist", back_populates="songs")
    album = relationship("Album", back_populates="songs")

# ========== مدل لایک ==========
class UserLike(Base):
    __tablename__ = "user_likes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)

# ========== مدل پلی ==========
class UserPlay(Base):
    __tablename__ = "user_plays"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)

# ========== مدل پلی‌لیست ==========
class Playlist(Base):
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    share_id = Column(String, unique=True, index=True, nullable=False)
    is_public = Column(Boolean, default=False)
    cover_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="playlists")
    songs = relationship("PlaylistSong", back_populates="playlist", cascade="all, delete-orphan")

# ========== مدل لایک پلی‌لیست ==========
class PlaylistLike(Base):
    __tablename__ = "playlist_likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)

# ========== مدل آهنگ‌های پلی‌لیست ==========
class PlaylistSong(Base):
    __tablename__ = "playlist_songs"
    
    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    playlist = relationship("Playlist", back_populates="songs")
    song = relationship("Song")

# ========== مدل نشست‌های کاربر (Persistent Sessions) ==========
class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    
    user = relationship("User")

# ========== ایجاد جداول ==========
Base.metadata.create_all(bind=engine)