@echo off
echo 🚀 部署游泳課程出席管理系統 API 服務器到您的服務器...
echo.

echo 📦 檢查 Node.js 安裝...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js 未安裝，請先安裝 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js 已安裝

echo.
echo 📥 安裝依賴包...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 依賴安裝失敗
    pause
    exit /b 1
)

echo ✅ 依賴安裝完成

echo.
echo 🔧 配置服務器...
echo 📍 服務器 IP: 203.145.95.240
echo 🌐 API 地址: http://203.145.95.240:3000
echo 🔑 API 密鑰已配置

echo.
echo 🚀 啟動 API 服務器...
echo 📱 手機 APP 將連接到: http://203.145.95.240:3000
echo.
echo 按 Ctrl+C 停止服務器
echo.

npm start

pause 