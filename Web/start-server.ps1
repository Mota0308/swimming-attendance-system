Write-Host "🚀 启动网页服务器..." -ForegroundColor Green
Write-Host ""

Write-Host "📍 当前目录: $PWD" -ForegroundColor Cyan
Write-Host "📁 检查文件..." -ForegroundColor Yellow

if (Test-Path "server.js") {
    Write-Host "✅ server.js 存在" -ForegroundColor Green
} else {
    Write-Host "❌ server.js 不存在" -ForegroundColor Red
    Read-Host "按回车键继续..."
    exit 1
}

Write-Host ""
Write-Host "🔧 检查依赖..." -ForegroundColor Yellow
npm list --depth=0

Write-Host ""
Write-Host "🚀 启动服务器在端口 3001..." -ForegroundColor Green
Write-Host "📍 服务器地址: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📍 健康检查: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "📍 端口信息: http://localhost:3001/port-info" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  注意: 不要关闭此窗口，服务器需要保持运行" -ForegroundColor Yellow
Write-Host "🔴 要停止服务器，按 Ctrl+C" -ForegroundColor Red
Write-Host ""
Write-Host "🚀 正在启动..." -ForegroundColor Green

# 启动服务器
node server.js

Write-Host ""
Write-Host "📋 服务器已停止" -ForegroundColor Yellow
Read-Host "按回车键继续..." 