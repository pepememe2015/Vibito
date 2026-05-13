import os
import sqlite3
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, APIC

# Config
DB_PATH = "music.db"
UPLOAD_DIR = "uploads"
COVERS_DIR = os.path.join(UPLOAD_DIR, "covers")

if not os.path.exists(COVERS_DIR):
    os.makedirs(COVERS_DIR)

def extract_covers():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, file_path FROM songs")
    songs = cursor.fetchall()
    
    success_count = 0
    fail_count = 0
    
    for song_id, file_path in songs:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            fail_count += 1
            continue
            
        try:
            audio = MP3(file_path, ID3=ID3)
            extracted = False
            if audio.tags:
                for tag in audio.tags.values():
                    if isinstance(tag, APIC):
                        image_data = tag.data
                        cover_path = os.path.join(COVERS_DIR, f"{song_id}.jpg")
                        with open(cover_path, "wb") as f:
                            f.write(image_data)
                        extracted = True
                        success_count += 1
                        break
            if not extracted:
                fail_count += 1
                # print(f"No cover found for song {song_id}")
        except Exception as e:
            print(f"Error processing song {song_id}: {e}")
            fail_count += 1
            
    conn.close()
    print(f"Finished! Successfully extracted: {success_count}, Failed/No cover: {fail_count}")

if __name__ == "__main__":
    extract_covers()
