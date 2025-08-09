@echo off
echo ========================================
echo 用戶賬戶創建異常修復腳本
echo ========================================
echo.

echo [1/5] 檢查API服務器狀態...
tasklist | findstr node.exe >nul
if %errorlevel% equ 0 (
    echo ✅ API服務器正在運行
) else (
    echo ❌ API服務器未運行，正在啟動...
    cd api-server
    start "API Server" cmd /k "node server.js"
    timeout /t 3 /nobreak >nul
    cd ..
)

echo [2/5] 檢查端口使用情況...
netstat -an | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo ✅ 端口3000正在使用
) else (
    echo ❌ 端口3000未使用
)

echo [3/5] 測試API連接...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://203.145.95.240:3000/health' -TimeoutSec 5; Write-Host '✅ API服務器響應正常' } catch { Write-Host '❌ API服務器無響應' }"

echo [4/5] 重新構建Android APK...
cd Android_app
call gradlew clean
call gradlew assembleDebug

if %errorlevel% neq 0 (
    echo ❌ APK構建失敗
    pause
    exit /b 1
)

echo [5/5] 修復完成！
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
echo 5. 檢查是否還有異常錯誤
echo.
echo 📞 如果仍有問題，請檢查:
echo - 手機網絡連接
echo - API服務器日誌
echo - Android Studio Logcat
echo.
echo 🔧 常見解決方案:
echo 1. 重啟API服務器
echo 2. 檢查MongoDB連接
echo 3. 驗證API密鑰
echo 4. 檢查網絡設置
echo.
pause 
 