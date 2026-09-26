@echo off
echo ===================================================
echo   HireFlow - AI-Powered Export Outreach Platform
echo ===================================================
echo.
echo Starting Backend (FastAPI on http://localhost:8000)...
start "HireFlow Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo Starting Frontend (Vite on http://localhost:5173)...
start "HireFlow Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================================
echo   HireFlow is running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo.
echo   Demo Login:
echo   Email    : admin@hireflow.com
echo   Password : admin123
echo ===================================================
