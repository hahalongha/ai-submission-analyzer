@echo off
chcp 65001 >nul
title AI Submission Analyzer
echo ============================================
echo   AI辅助投稿分析工具 - 启动中...
echo ============================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 自动创建虚拟环境（如果不存在）
if not exist ".venv\Scripts\python.exe" (
    echo [信息] 正在创建虚拟环境...
    python -m venv .venv
    echo [信息] 正在安装依赖...
    .venv\Scripts\python.exe -m pip install --upgrade pip -q
    .venv\Scripts\python.exe -m pip install -r requirements.txt -q
    echo [信息] 环境准备完成！
    echo.
)

REM 检查端口占用
netstat -ano | findstr ":7860" >nul 2>&1
if %errorlevel%==0 (
    echo [信息] 检测到端口 7860 已被占用，正在释放...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7860"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo [信息] 启动完成！浏览器将自动打开 http://localhost:7860
echo [提示] 首次使用请先配置 API 密钥（设置页 → API密钥管理）
echo.
start http://localhost:7860
.venv\Scripts\python.exe app.py

pause
