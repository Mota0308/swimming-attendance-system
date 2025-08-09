@echo off
echo 🚀 構建 Railway API 版本的游泳課程出席管理系統 APK...
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
    echo 🎯 新功能:
    echo    • 使用 Railway 雲端 API 服務器
    echo    • 智能 URL 選擇系統
    echo    • 支持 HTTPS 安全連接
    echo    • 改進的網絡配置界面
    echo.
    echo 📋 使用說明:
    echo    1. 安裝新的 APK 到手機
    echo    2. 登入家長或教練版本
    echo    3. 使用網絡配置功能切換 API 服務器
    echo    4. 測試登錄功能
    echo.
    echo 🔗 Railway API 地址: https://swiming-production.up.railway.app
    echo 🔑 API 密鑰: ttdrcccy / 2b207365-cbf0-4e42-a3bf-f932c84557c4
    echo.
    echo 🌐 支持的環境:
    echo    • 生產環境: Railway HTTPS
    echo    • 本地開發: 模擬器和 Wi-Fi
    echo.
    echo 請將 APK 文件安裝到 Android 設備上進行測試。
) else (
    echo.
    echo ❌ 構建失敗，請檢查錯誤信息。
)

pause 