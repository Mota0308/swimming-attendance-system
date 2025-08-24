@echo off
echo 🚀 修复端口配置并重新部署网页应用...
echo.

echo 📍 当前目录: %CD%
echo 🔧 检查配置文件...

if exist server.js (
    echo ✅ server.js 存在
) else (
    echo ❌ server.js 不存在
    pause
    exit /b 1
)

if exist railway.toml (
    echo ✅ railway.toml 存在
) else (
    echo ❌ railway.toml 不存在
    pause
    exit /b 1
)

echo.
echo 📋 端口配置信息:
echo - 强制端口: 3001
echo - API服务器端口: 3001
echo - 网页应用端口: 3001 (强制设置)
echo.

echo 🚀 开始部署...
echo 📍 目标: Railway 平台
echo 🔧 端口: 3001 (与API服务器一致)
echo.

railway up

echo.
echo ✅ 部署完成！
echo 🌐 网页版地址: https://swimming-system-web-production.up.railway.app
echo 📍 端口: 3001 (与API服务器一致)
echo.
echo 📋 部署后请等待1-2分钟让服务完全启动
echo 🔍 然后访问网页版测试是否正常
echo.
echo ⚠️  注意: 如果端口仍然是8080，请在Railway Dashboard中手动设置环境变量 PORT=3001
pause 