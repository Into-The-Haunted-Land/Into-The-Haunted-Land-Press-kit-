@echo off
cd /d "%~dp0"

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://127.0.0.1:4173'"

echo Starting local press kit server...
echo.
echo URL: http://127.0.0.1:4173
echo.
echo Press Ctrl+C in this window to stop the server.
echo.

python -m http.server 4173 --bind 127.0.0.1
