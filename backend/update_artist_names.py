import os
import re
from models import SessionLocal, Song

def clean_artist_name(raw: str) -> str:
    if not raw:
        return "Unknown Artist"
    raw = re.sub(r'[\(\[{].*?[\)\]}]', '', raw)
    raw = re.sub(r'\S*?(?:www|http|\.com|\.ir|bandmusic|band|channel)\S*', '', raw, flags=re.IGNORECASE)
    raw = re.sub(r'(?i)(official|channel|vevo|topic|\|-topic|music video|audio|official music video|official video|\(?official\)?)', '', raw)
    raw = re.split(r'[-–—:|]', raw)[0].strip()
    raw = re.sub(r'\s+', ' ', raw).strip()
    raw = re.sub(r'[,.;:]$', '', raw).strip()
    return raw if raw else "Unknown Artist"

def update_all_artists():
    db = SessionLocal()
    songs = db.query(Song).all()
    updated = 0
    for song in songs:
        new_artist = clean_artist_name(song.artist)
        if new_artist != song.artist:
            print(f"Updating: '{song.artist}' -> '{new_artist}' for song '{song.title}'")
            song.artist = new_artist
            updated += 1
    db.commit()
    print(f"✅ Updated {updated} songs.")
    db.close()

if __name__ == "__main__":
    update_all_artists()