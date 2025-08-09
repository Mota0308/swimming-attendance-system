@echo off
echo 🔧 修復登入網絡連接問題
echo ================================
echo.

echo 1️⃣ 停止所有Node.js進程...
taskkill /f /im node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ 已停止所有Node.js進程
) else (
    echo ℹ️ 沒有運行中的Node.js進程
)

echo.
echo 2️⃣ 等待進程完全停止...
timeout /t 3 /nobreak >nul

echo.
echo 3️⃣ 啟動API服務器...
start "API Server" cmd /k "cd /d %~dp0 && node server.js"

echo.
echo 4️⃣ 等待服務器啟動...
timeout /t 5 /nobreak >nul

echo.
echo 5️⃣ 測試API連接...
powershell -Command "try { $headers = @{'x-api-public-key'='ttdrcccy'; 'x-api-private-key'='2b207365-cbf0-4e42-a3bf-f932c84557c4'}; $response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -Headers $headers -UseBasicParsing -TimeoutSec 10; Write-Host '✅ API服務器連接成功' -ForegroundColor Green; Write-Host '狀態碼:' $response.StatusCode -ForegroundColor Cyan } catch { Write-Host '❌ API服務器連接失敗' -ForegroundColor Red; Write-Host '錯誤:' $_.Exception.Message -ForegroundColor Red }"

echo.
echo 6️⃣ 檢查端口狀態...
netstat -an | findstr :3001
if %ERRORLEVEL% EQU 0 (
    echo ✅ 端口3001正在監聽
) else (
    echo ❌ 端口3001未監聽
)

echo.
echo 7️⃣ 顯示API配置信息...
echo.
echo 📱 Android應用配置:
echo    基礎URL: http://203.145.95.240:3001
echo    公開密鑰: ttdrcccy
echo    私有密鑰: 2b207365-cbf0-4e42-a3bf-f932c84557c4
echo.
echo 🧪 測試命令:
echo    curl -H "x-api-public-key: ttdrcccy" -H "x-api-private-key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" http://203.145.95.240:3001/health
echo.
echo 📋 下一步:
echo    1. 確保API服務器正在運行
echo    2. 重新構建Android APK
echo    3. 在手機上安裝新APK
echo    4. 測試登入功能
echo.

pause 