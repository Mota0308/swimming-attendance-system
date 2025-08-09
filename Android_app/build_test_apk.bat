@echo off
echo ========================================
echo   構建 Android API 測試 APK
echo ========================================
echo.

echo 📦 檢查環境...
if not exist "gradlew.bat" (
    echo ❌ 未找到 gradlew.bat，請確保在正確的目錄中
    pause
    exit /b 1
)

echo.
echo 🧹 清理舊的構建文件...
call gradlew.bat clean
if errorlevel 1 (
    echo ❌ 清理失敗
    pause
    exit /b 1
)

echo.
echo 🔨 構建 Debug APK...
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo ❌ 構建失敗
    pause
    exit /b 1
)

echo.
echo ✅ 構建成功！
echo.
echo 📱 APK 文件位置:
echo    Android_app\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 💡 安裝說明:
echo    1. 將 APK 文件傳輸到手機
echo    2. 在手機上啟用"未知來源"安裝
echo    3. 安裝 APK 文件
echo    4. 打開應用並進入"API連接測試"
echo.
echo 🧪 測試步驟:
echo    1. 點擊"📋 顯示配置信息"
echo    2. 點擊"🧪 測試API連接"
echo    3. 點擊"📥 測試獲取學生資料"
echo    4. 點擊"🔐 測試用戶登入"
echo.

echo ⏰ 構建完成時間: %date% %time%
echo ========================================
pause 