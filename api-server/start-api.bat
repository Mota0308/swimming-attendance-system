@echo off
echo ========================================
echo   游泳課程出席管理系統 API 服務器
echo ========================================
echo.

echo 📦 檢查依賴...
if not exist "node_modules" (
    echo ⏳ 安裝依賴包...
    npm install
    if errorlevel 1 (
        echo ❌ 依賴安裝失敗
        pause
        exit /b 1
    )
    echo ✅ 依賴安裝完成
) else (
    echo ✅ 依賴已存在
)

echo.
echo 🚀 啟動 API 服務器...
echo 📍 本地地址: http://localhost:3000
echo 🌐 服務器地址: http://203.145.95.240:3000
echo 🔑 API 密鑰已配置
echo.

echo 💡 測試命令:
echo    curl -H "X-API-Public-Key: ttdrcccy" -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" http://localhost:3000/health
echo.

echo ⏰ 啟動時間: %date% %time%
echo ========================================
echo.

npm start

echo.
echo ========================================
echo 🛑 API 服務器已停止
echo ========================================
pause 