@echo off
echo 🔧 最終登入問題修復
echo ================================
echo.

echo 1️⃣ 停止API服務器...
taskkill /f /im node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ 已停止API服務器
) else (
    echo ℹ️ 沒有運行中的API服務器
)

echo.
echo 2️⃣ 等待進程完全停止...
timeout /t 3 /nobreak >nul

echo.
echo 3️⃣ 檢查服務器代碼...
findstr /C:"auth/test-login" server.js >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ 測試登入端點已存在
) else (
    echo ❌ 測試登入端點不存在，需要重新添加
)

echo.
echo 4️⃣ 啟動API服務器...
start "API Server" cmd /k "cd /d %~dp0 && node server.js"

echo.
echo 5️⃣ 等待服務器啟動...
timeout /t 5 /nobreak >nul

echo.
echo 6️⃣ 測試API連接...
node quick-test.js

echo.
echo 7️⃣ 顯示修復信息...
echo.
echo 📱 Android應用修復:
echo    • 已跳過連接測試
echo    • 使用測試登入端點 /auth/test-login
echo    • 需要重新構建APK
echo.
echo 🧪 測試賬號:
echo    電話: test, 密碼: 123456
echo    電話: 0912345678, 密碼: 123456
echo    電話: admin, 密碼: admin123
echo    電話: demo, 密碼: demo123
echo.
echo 📋 下一步:
echo    1. 在Android_app目錄運行: .\build_fixed_apk.bat
echo    2. 安裝新APK到手機
echo    3. 使用測試賬號登入
echo.

pause 