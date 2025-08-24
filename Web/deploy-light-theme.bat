@echo off
echo ========================================
echo 部署淺色主題到 Railway
echo ========================================
echo.

echo 正在檢查文件...
if not exist "scheduler-light-theme.css" (
    echo 錯誤：找不到 scheduler-light-theme.css
    pause
    exit /b 1
)

if not exist "scheduler-light.js" (
    echo 錯誤：找不到 scheduler-light.js
    pause
    exit /b 1
)

if not exist "attendance-board-light.css" (
    echo 錯誤：找不到 attendance-board-light.css
    pause
    exit /b 1
)

if not exist "attendance-board-light.js" (
    echo 錯誤：找不到 attendance-board-light.js
    pause
    exit /b 1
)

echo 所有文件檢查完成！
echo.

echo 正在部署到 Railway...
echo.

echo 步驟 1: 登入 Railway...
railway login

echo.
echo 步驟 2: 連接到項目...
railway link

echo.
echo 步驟 3: 部署代碼...
railway up

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 請訪問以下網址查看效果：
echo https://swimming-system-web-production.up.railway.app/
echo.
echo 登入後點擊「出席記錄管理」查看新的淺色主題
echo.

pause 