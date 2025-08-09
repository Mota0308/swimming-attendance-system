@echo off
echo 🚀 構建修復版本的游泳課程出席管理系統 APK...
echo.

echo 📦 清理項目...
call gradlew clean

echo 🔧 編譯項目...
call gradlew assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 構建成功！
    echo 📱 APK文件位置: app\build\outputs\apk\release\app-release.apk
    echo.
    echo 🎯 修復內容:
    echo    • 跳過API連接測試，直接進行登入驗證
    echo    • 使用測試登入端點 /auth/test-login
    echo    • 支持測試用戶登入（不依賴數據庫）
    echo    • 改進了錯誤處理
    echo.
    echo 📋 測試賬號:
    echo    電話: test, 密碼: 123456
    echo    電話: 0912345678, 密碼: 123456
    echo    電話: admin, 密碼: admin123
    echo    電話: demo, 密碼: demo123
    echo.
    echo 📋 使用說明:
    echo    1. 安裝新的 APK 到手機
    echo    2. 選擇家長版本
    echo    3. 使用測試賬號登入
    echo    4. 驗證登入功能
    echo.
    echo 🔗 API 服務器地址: http://203.145.95.240:3001
    echo 🔑 API 密鑰: ttdrcccy / 2b207365-cbf0-4e42-a3bf-f932c84557c4
    echo.
    echo 請將 APK 文件安裝到 Android 設備上進行測試。
) else (
    echo.
    echo ❌ 構建失敗，請檢查錯誤信息。
)

pause 