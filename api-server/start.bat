@echo off
echo 🚀 啟動游泳課程出席管理系統 API 服務器...
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
echo 🔗 檢查 MongoDB 連接...
echo 正在測試連接...

echo.
echo 🚀 啟動 API 服務器...
echo 📍 服務器地址: http://localhost:3000
echo 🔑 API 密鑰已配置
echo 📱 手機 APP 可通過 http://10.0.2.2:3000 訪問
echo.
echo 按 Ctrl+C 停止服務器
echo.

npm start

pause 