@echo off
echo 🚀 启动网页服务器并测试...
echo.

echo 📍 当前目录: %CD%
echo 📁 检查文件...
if exist server.js (
    echo ✅ server.js 存在
) else (
    echo ❌ server.js 不存在
    pause
    exit /b 1
)

if exist package.json (
    echo ✅ package.json 存在
) else (
    echo ❌ package.json 不存在
    pause
    exit /b 1
)

echo.
echo 🔧 检查依赖...
npm list --depth=0

echo.
echo 🚀 启动服务器...
echo 按 Ctrl+C 停止服务器
echo.
node server.js

echo.
echo 📋 服务器已停止
pause 