@echo off
echo 🚀 構建更新後的游泳課程出席管理系統 APK...
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
    echo    • 家長版本刷新功能已更新為使用 API 服務器
    echo    • 支持從 http://203.145.95.240:3001 獲取學生資料
    echo    • 添加了 API 配置查看功能
    echo    • 改進了錯誤處理和狀態顯示
    echo.
    echo 📋 使用說明:
    echo    1. 安裝新的 APK 到手機
    echo    2. 登入家長版本
    echo    3. 點擊 "🔄 刷新學生資料" 按鈕
    echo    4. 查看從 API 服務器獲取的學生資料
    echo    5. 點擊 "⚙️ API 配置" 查看當前配置
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