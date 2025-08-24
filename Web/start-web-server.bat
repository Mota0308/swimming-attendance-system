@echo off
echo 正在啟動游泳系統Web服務器...
echo.
echo 端口配置:
echo - Web前端: 8080 (公網可訪問)
echo - API後端: 3001 (本地)
echo.
echo 請確保:
echo 1. API服務器已在3001端口運行
echo 2. 防火牆已開放8080端口
echo 3. 路由器已配置端口轉發
echo.

cd /d "%~dp0"
echo 當前目錄: %CD%
echo.

echo 檢查Node.js...
node --version
if %errorlevel% neq 0 (
    echo 錯誤: 未找到Node.js，請先安裝Node.js
    pause
    exit /b 1
)

echo.
echo 檢查依賴包...
if not exist "node_modules" (
    echo 安裝依賴包...
    npm install
)

echo.
echo 啟動Web服務器...
echo 服務器將在端口8080上運行
echo 公網訪問地址: http://您的公網IP:8080
echo.
echo 按 Ctrl+C 停止服務器
echo.

node server.js
pause 