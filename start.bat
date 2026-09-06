@echo off
title NER SmartLogix Launcher
echo ========================================================
echo        Starting NER SmartLogix Platform...
echo ========================================================

echo Starting Backend Server on http://localhost:5000 ...
start "SmartLogix Backend (Port 5000)" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 >nul

echo Starting ML Risk Service on http://localhost:8000 ...
if exist "%~dp0.venv\Scripts\python.exe" (
  start "SmartLogix ML (Port 8000)" cmd /k "cd /d %~dp0ml && ..\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000"
) else (
  echo ML service skipped: .venv was not found. Create it with: py -m venv .venv
)

timeout /t 2 >nul

echo Starting Frontend Server on http://localhost:3000 ...
start "SmartLogix Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npx serve . -p 3000"

timeout /t 2 >nul

echo Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo Both servers are running!
echo Keep both terminal windows open while using the website.
