@echo off
echo ========================================
echo 創建賬號404錯誤修復腳本
echo ========================================
echo.

echo [1/4] 檢查API服務器狀態...
cd api-server
node -e "console.log('Node.js版本:', process.version)"
if %errorlevel% neq 0 (
    echo ❌ Node.js未安裝或未配置
    echo 請先安裝Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo [2/4] 啟動API服務器...
start "API Server" cmd /k "node server.js"
timeout /t 3 /nobreak >nul

echo [3/4] 重新構建Android APK...
cd ..
cd Android_app
call gradlew clean
call gradlew assembleDebug

if %errorlevel% neq 0 (
    echo ❌ APK構建失敗
    pause
    exit /b 1
)

echo [4/4] 修復完成！
echo.
echo ✅ API服務器已啟動
echo ✅ APK已重新構建
echo.
echo 📱 安裝APK:
echo 路徑: Android_app\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 🧪 測試步驟:
echo 1. 將APK安裝到手機
echo 2. 打開應用
echo 3. 進入創建賬號頁面
echo 4. 輸入測試資料並點擊創建
echo 5. 應該不再出現404錯誤
echo.
echo 📞 如果仍有問題，請檢查:
echo - 手機網絡連接
echo - API服務器是否運行 (http://203.145.95.240:3000/health)
echo - 防火牆設置
echo.
pause 
 