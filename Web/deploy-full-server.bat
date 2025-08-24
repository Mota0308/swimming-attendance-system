@echo off
echo 🚀 部署完整版服务器（包含数据库连接）...
echo.

echo 📍 当前目录: %CD%
echo 🔧 检查配置文件...

if exist full-server.js (
    echo ✅ full-server.js 存在
) else (
    echo ❌ full-server.js 不存在
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
echo 📋 完整版服务器特点:
echo - 包含数据库连接和API代理
echo - 支持地点和泳会数据获取
echo - 完整的用户认证集成
echo - 端口配置: 3001
echo - 数据库: MongoDB Atlas
echo.

echo 🚀 开始部署完整版服务器...
echo 📍 目标: Railway 平台
echo 🔧 启动文件: full-server.js
echo 🗄️ 数据库: MongoDB Atlas (已集成)
echo.

echo 📦 重新安装依赖...
npm install

echo.
echo 🚀 重新部署...
railway up

echo.
echo ✅ 完整版服务器部署完成！
echo 🌐 网页版地址: https://swimming-system-web-production.up.railway.app
echo.
echo 📋 部署后请:
echo 1. 等待2-3分钟让服务完全启动
echo 2. 测试健康检查: /health
echo 3. 测试数据库连接: /test-db-connection
echo 4. 测试地点数据: /locations
echo 5. 测试泳会数据: /clubs
echo.
echo 🎯 现在网页应用将完全连接到你的云端数据库！
pause 