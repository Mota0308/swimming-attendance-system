@echo off
echo 🚀 启动网页服务器...
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

echo.
echo 🔧 检查依赖...
npm list --depth=0

echo.
echo 🚀 启动服务器在端口 3001...
echo 📍 服务器地址: http://localhost:3001
echo 📍 健康检查: http://localhost:3001/health
echo 📍 端口信息: http://localhost:3001/port-info
echo.
echo ⚠️  注意: 不要关闭此窗口，服务器需要保持运行
echo 🔴 要停止服务器，按 Ctrl+C
echo.
echo 🚀 正在启动...
node server.js

echo.
echo 📋 服务器已停止
pause 