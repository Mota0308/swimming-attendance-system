@echo off
title 游泳課程管理系統 API 服務器
echo ========================================
echo 游泳課程管理系統 API 服務器自動啟動
echo ========================================
echo.

:: 設置工作目錄
cd /d "%~dp0"

:: 檢查Node.js
echo 檢查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo 錯誤：未找到 Node.js
    pause
    exit /b 1
)

:: 檢查PM2
echo 檢查 PM2...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo 安裝 PM2...
    npm install -g pm2
)

:: 停止所有現有進程
echo 停止現有進程...
pm2 stop all >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

:: 啟動API服務器
echo 啟動 API 服務器...
pm2 start ecosystem.config.js --env production

:: 顯示狀態
echo.
echo API 服務器狀態：
pm2 status

echo.
echo ========================================
echo API 服務器已啟動！
echo 本地地址: http://localhost:3000
echo 公網地址: http://203.145.95.240:3000
echo ========================================
echo.
echo 此窗口將保持開啟以維持服務器運行
echo 請勿關閉此窗口！
echo.
pause 