@echo off
echo 🚀 重新部署修复后的网页应用...
echo.

echo 📦 安装依赖...
npm install

echo.
echo 🔧 检查配置...
echo - 主文件: server.js
echo - 启动命令: npm start
echo - 健康检查: /health

echo.
echo 🚀 部署到Railway...
railway up

echo.
echo ✅ 部署完成！
echo 🌐 网页版地址: https://swiming-production.up.railway.app
echo.
echo 📋 部署后请等待1-2分钟让服务完全启动
echo 🔍 然后访问网页版测试是否正常
pause 