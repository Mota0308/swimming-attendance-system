Write-Host "🚀 重新部署修复后的网页应用..." -ForegroundColor Green
Write-Host ""

Write-Host "📦 安装依赖..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "🔧 检查配置..." -ForegroundColor Cyan
Write-Host "- 主文件: server.js" -ForegroundColor White
Write-Host "- 启动命令: npm start" -ForegroundColor White
Write-Host "- 健康检查: /health" -ForegroundColor White

Write-Host ""
Write-Host "🚀 部署到Railway..." -ForegroundColor Yellow
railway up

Write-Host ""
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "🌐 网页版地址: https://swiming-production.up.railway.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 部署后请等待1-2分钟让服务完全启动" -ForegroundColor Yellow
Write-Host "🔍 然后访问网页版测试是否正常" -ForegroundColor Yellow

Read-Host "按回车键继续..." 