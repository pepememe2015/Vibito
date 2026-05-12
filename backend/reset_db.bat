@echo off
echo ========================================
echo    Resetting Database
echo ========================================
echo.

cd /d G:\project\music_project\backend

if exist music.db (
    echo Deleting old database...
    del music.db
    echo Database deleted.
) else (
    echo No database found.
)

echo.
echo Now run run.bat to create fresh database.
pause