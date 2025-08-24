@echo off
echo 🚨 紧急修复网页应用502错误...
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

echo.
echo 📋 问题诊断:
echo - 网页应用返回502错误
echo - API服务器正常工作
echo - 可能是端口配置或代码问题
echo.

echo 🚀 开始紧急修复部署...
echo 📍 目标: Railway 平台
echo 🔧 强制端口: 3001
echo.

echo 📦 重新安装依赖...
npm install

echo.
echo 🚀 重新部署...
railway up

echo.
echo ✅ 紧急修复部署完成！
echo 🌐 网页版地址: https://swimming-system-web-production.up.railway.app
echo.
echo 📋 部署后请:
echo 1. 等待2-3分钟让服务完全启动
echo 2. 在Railway Dashboard中查看日志
echo 3. 检查环境变量 PORT=3001
echo 4. 测试网页版是否正常
echo.
echo ⚠️  如果仍有问题，请分享Railway日志信息
pause 