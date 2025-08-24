@echo off
echo ========================================
echo 游泳系統網頁應用 - Railway部署腳本
echo ========================================
echo.

echo 正在檢查Railway CLI安裝...
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI 未安裝
    echo.
    echo 請先安裝Railway CLI:
    echo npm install -g @railway/cli
    echo.
    pause
    exit /b 1
)

echo ✅ Railway CLI 已安裝
echo.

echo 正在檢查登入狀態...
railway whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未登入Railway
    echo.
    echo 請先登入:
    echo railway login
    echo.
    pause
    exit /b 1
)

echo ✅ 已登入Railway
echo.

echo 正在部署到Railway...
railway up

if %errorlevel% equ 0 (
    echo.
    echo ✅ 部署成功！
    echo.
    echo 正在獲取部署狀態...
    railway status
    echo.
    echo 🎉 您的應用已成功部署到Railway！
    echo 用戶現在可以24/7在線訪問，無需啟動本地服務器
) else (
    echo.
    echo ❌ 部署失敗，請檢查錯誤信息
)

echo.
pause 