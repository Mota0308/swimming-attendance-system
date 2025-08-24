@echo off
echo 🚀 使用简化版服务器重新部署...
echo.

echo 📍 当前目录: %CD%
echo 🔧 检查配置文件...

if exist simple-server.js (
    echo ✅ simple-server.js 存在
) else (
    echo ❌ simple-server.js 不存在
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
echo 📋 简化版服务器特点:
echo - 移除了复杂的数据库连接器
echo - 简化了错误处理
echo - 专注于基本功能
echo - 端口配置: 3001
echo.

echo 🚀 开始部署简化版服务器...
echo 📍 目标: Railway 平台
echo 🔧 启动文件: simple-server.js
echo.

echo 📦 重新安装依赖...
npm install

echo.
echo 🚀 重新部署...
railway up

echo.
echo ✅ 简化版服务器部署完成！
echo 🌐 网页版地址: https://swimming-system-web-production.up.railway.app
echo.
echo 📋 部署后请:
echo 1. 等待2-3分钟让服务完全启动
echo 2. 测试健康检查: /health
echo 3. 测试主页面: /
echo.
echo ⚠️  如果仍有502错误，请分享Railway日志信息
pause 