@echo off
echo ========================================
echo   API 服務器快速測試
echo ========================================
echo.

echo 🧪 測試API服務器連接...
echo 📍 服務器地址: http://203.145.95.240:3000
echo.

echo 📋 測試1: 健康檢查
curl -H "X-API-Public-Key: ttdrcccy" -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" http://203.145.95.240:3000/health
echo.
echo.

echo 📥 測試2: 獲取學生資料
curl -H "X-API-Public-Key: ttdrcccy" -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" http://203.145.95.240:3000/students
echo.
echo.

echo 🔐 測試3: 用戶登入
curl -X POST -H "X-API-Public-Key: ttdrcccy" -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" -H "Content-Type: application/json" -d "{\"username\":\"test\",\"password\":\"test\"}" http://203.145.95.240:3000/auth/login
echo.
echo.

echo ========================================
echo 🎉 測試完成！
echo.
echo 💡 如果看到JSON響應，說明API服務器正常運行
echo 💡 如果看到錯誤信息，請檢查網絡連接
echo.
echo 📱 現在可以安裝APK進行手機測試
echo ========================================
pause 