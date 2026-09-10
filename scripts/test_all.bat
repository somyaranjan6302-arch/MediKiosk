@echo off
title MediKiosk Automated Test Runner
echo ==============================================================================
echo                      MediKiosk (SIH26047) - Test Suite
echo ==============================================================================
echo.

set "NODE_DIR=%LOCALAPPDATA%\Programs\node-portable"
set "PYTHON_EXE=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
set "PATH=%NODE_DIR%;%PATH%"
set "PYTHONPATH=%~dp0..\backend"

echo [1/2] Running Backend Unit and E2E Tests with Pytest...
cd /d "%~dp0..\backend"
"%PYTHON_EXE%" -m pytest tests/ -v
if %errorlevel% neq 0 (
    echo [FAIL] Backend tests failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Running Frontend TypeScript & Production Build Verification...
cd /d "%~dp0..\frontend"
"%NODE_DIR%\npm.cmd" run build
if %errorlevel% neq 0 (
    echo [FAIL] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo [SUCCESS] All MediKiosk test suites passed completely!
echo ==============================================================================
pause
