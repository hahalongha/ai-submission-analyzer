@echo off
setlocal enabledelayedexpansion
title AI Submission Analyzer

echo ============================================
echo   AI Submission Analyzer - Starting...
echo ============================================
echo.

REM Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3.8+ is required but not found.
    echo Please install from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [ OK ] Python found.

REM Setup venv and install deps if needed
if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Setting up virtual environment...
    python -m venv .venv
    echo [INFO] Installing dependencies (this may take a while)...
    .venv\Scripts\python.exe -m pip install --upgrade pip -q
    .venv\Scripts\python.exe -m pip install -r requirements.txt -q
    echo [ OK ] Environment ready!
)

REM Release port if in use
netstat -ano | findstr ":7860" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Port 7860 is occupied. Releasing...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7860"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo [INFO] Launching at http://localhost:7860
echo [HINT] Configure API Key in: Settings -> API Keys
echo.

start http://localhost:7860
.venv\Scripts\python.exe app.py
pause
