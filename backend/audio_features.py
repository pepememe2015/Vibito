import librosa
import numpy as np

def extract_features(file_path):
    try:
        # دریافت کل زمان آهنگ از روی فایل (بدون لود کردن کل دیتا در رم)
        total_duration = librosa.get_duration(path=file_path)
        
        y, sr = librosa.load(file_path, duration=15)  # فقط 15 ثانیه اول برای استخراج ویژگی‌ها
        danceability = np.mean(librosa.beat.beat_track(y=y, sr=sr)[1]) / 10  # نرمالیزه ساده
        energy = np.mean(librosa.feature.rms(y=y))
        valence = np.mean(librosa.feature.tonnetz(y=y, sr=sr))  # تقریب ساده
        return {
            "duration": total_duration,
            "danceability": float(danceability),
            "energy": float(energy),
            "valence": float(valence)
        }
    except Exception as e:
        print(f"Error extracting features: {e}")
        return {"duration": 0.0, "danceability": 0.0, "energy": 0.0, "valence": 0.0}