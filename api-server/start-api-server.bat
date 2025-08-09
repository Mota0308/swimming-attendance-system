@echo off
echo 正在啟動游泳課程管理系統 API 服務器...
echo.

:: 設置工作目錄
cd /d "%~dp0"

:: 檢查Node.js是否安裝
node --version >nul 2>&1
if errorlevel 1 (
    echo 錯誤：未找到 Node.js，請先安裝 Node.js
    pause
    exit /b 1
)

:: 檢查PM2是否安裝
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo 正在安裝 PM2...
    npm install -g pm2
)

:: 啟動API服務器
echo 正在啟動 API 服務器...
pm2 start ecosystem.config.js --env production

:: 顯示狀態
echo.
echo API 服務器狀態：
pm2 status

echo.
echo API 服務器已啟動！
echo 本地地址: http://localhost:3001
echo 公網地址: http://203.145.95.240:3001
echo.
echo 按任意鍵退出...
pause >nul 