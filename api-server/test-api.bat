@echo off
echo ========================================
echo   API 服務器測試工具
echo ========================================
echo.

echo 🧪 開始測試 API 服務器...
echo.

if not exist "test-api.js" (
    echo ❌ 測試腳本不存在
    pause
    exit /b 1
)

echo 📍 測試地址: http://localhost:3001
echo 🔑 API 密鑰: ttdrcccy / 2b207365-cbf0-4e42-a3bf-f932c84557c4
echo.

echo 💡 請確保 API 服務器已啟動
echo    運行 start-api.bat 來啟動服務器
echo.

echo ⏳ 執行測試...
node test-api.js

echo.
echo ========================================
echo 🎉 測試完成
echo ========================================
pause 