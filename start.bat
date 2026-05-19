@echo off
title AI Submission Analyzer

echo ============================================
echo   AI Submission Analyzer - Starting...
echo ============================================
echo.

REM Check if port 7860 is in use
netstat -ano | findstr ":7860" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Port 7860 is occupied. Releasing...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7860"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    echo [ OK ] Port 7860 released.
)

echo [INFO] Launching at http://localhost:7860
start http://localhost:7860
python app.py
pause
