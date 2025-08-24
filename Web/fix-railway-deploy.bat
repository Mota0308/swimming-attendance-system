@echo off
echo ========================================
echo 修復Railway部署配置
echo ========================================
echo.

echo 正在檢查當前目錄...
if not exist "package.json" (
    echo ❌ 錯誤：請在Web文件夾中運行此腳本
    echo.
    echo 請執行：
    echo cd Web
    echo fix-railway-deploy.bat
    pause
    exit /b 1
)

echo ✅ 當前在Web文件夾中
echo.

echo 正在清理舊的部署配置...
if exist "railway.json" del "railway.json"
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del "package-lock.json"

echo ✅ 清理完成
echo.

echo 正在安裝依賴...
npm install

if %errorlevel% neq 0 (
    echo ❌ 安裝依賴失敗
    pause
    exit /b 1
)

echo ✅ 依賴安裝完成
echo.

echo 正在重新部署到Railway...
railway up

if %errorlevel% equ 0 (
    echo.
    echo ✅ 部署成功！
    echo.
    echo 🎉 您的Web應用已成功部署到Railway！
    echo 現在可以24/7在線訪問，無需啟動本地服務器
) else (
    echo.
    echo ❌ 部署失敗，請檢查錯誤信息
)

echo.
pause 