@echo off
title MediKiosk - Dual Mode Runner (Backend & Frontend)
echo ==============================================================================
echo                      MediKiosk (SIH26047) - Dev Launcher
echo               AI-Powered Patient Case-Taking & Triage System
echo ==============================================================================
echo.

set "NODE_DIR=%LOCALAPPDATA%\Programs\node-portable"
set "PYTHON_EXE=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
set "PATH=%NODE_DIR%;%PATH%"
set "PYTHONPATH=%~dp0..\backend"

echo [1/3] Verifying Python and Node runtimes...
"%PYTHON_EXE%" --version
if %errorlevel% neq 0 (
    echo Error: Python executable not found at %PYTHON_EXE%
    pause
    exit /b 1
)

"%NODE_DIR%\node.exe" --version
if %errorlevel% neq 0 (
    echo Error: Node executable not found at %NODE_DIR%
    pause
    exit /b 1
)

echo [2/3] Starting FastAPI Backend on http://localhost:8000...
start "MediKiosk Backend (Port 8000)" cmd /k "cd /d %~dp0..\backend && set PYTHONPATH=. && "%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Starting React + Vite Frontend on http://localhost:3000...
start "MediKiosk Frontend (Port 3000)" cmd /k "cd /d %~dp0..\frontend && set "PATH=%NODE_DIR%;%PATH%" && "%NODE_DIR%\npm.cmd" run dev"

echo.
echo ==============================================================================
echo MediKiosk is now launching!
echo Kiosk & Dashboard UI: http://localhost:3000
echo FastAPI Swagger Docs: http://localhost:8000/docs
echo ==============================================================================
timeout /t 3 >nul
start http://localhost:3000
