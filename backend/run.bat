@echo off
title Music Platform Server

echo ========================================
echo    Music Platform Server Launcher
echo ========================================
echo.

:: رفتن به مسیر درست
cd /d G:\project\music_project\backend

:: فعال کردن محیط مجازی
echo [1/4] Activating virtual environment...
if exist venv\Scripts\activate (
    call venv\Scripts\activate
) else (
    echo [!] Virtual environment not found. Creating...
    python -m venv venv
    call venv\Scripts\activate
)

:: نصب کتابخانه‌های مورد نیاز
echo [2/4] Installing dependencies...
pip install fastapi uvicorn sqlalchemy python-multipart mutagen scikit-learn -q

:: بررسی دیتابیس
if exist music.db (
    echo [3/4] Database already exists. Skipping creation.
) else (
    echo [3/4] Database not found. Creating new database with admin...
    python -c "from models import Base, engine; Base.metadata.create_all(bind=engine); print('Database created.')"
    python -c "from models import SessionLocal, User; from auth import hash_password; db=SessionLocal(); admin=db.query(User).filter(User.username=='admin').first(); exec('db.add(User(username=\"admin\", hashed_password=hash_password(\"admin123\"), is_admin=True)) if not admin else None'); db.commit(); db.close(); print('Admin user: admin / admin123')"
)

:: نمایش تمام آی‌پی‌های محلی
echo.
echo ========================================
echo    Server is starting on ALL interfaces
echo    Access from same network (phone/other devices) using ONE of these links:
echo ========================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    set temp_ip=%%a
    setlocal EnableDelayedExpansion
    set temp_ip=!temp_ip: =!
    echo    http://!temp_ip!:8765/frontend/index.html
    endlocal
)
echo.
echo    Admin panel:
echo    (Replace index.html with admin.html in the links above)
echo    Press Ctrl+C to stop the server
echo ========================================
echo.

:: استفاده از uvicorn به جای python main.py
uvicorn main:app --host 0.0.0.0 --port 8765 --reload

pause