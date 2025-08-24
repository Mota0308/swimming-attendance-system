# 游泳系統Web服務器啟動腳本
Write-Host "正在啟動游泳系統Web服務器..." -ForegroundColor Green
Write-Host ""

Write-Host "端口配置:" -ForegroundColor Yellow
Write-Host "- Web前端: 8080 (公網可訪問)" -ForegroundColor Cyan
Write-Host "- API後端: 3001 (本地)" -ForegroundColor Cyan
Write-Host ""

Write-Host "請確保:" -ForegroundColor Yellow
Write-Host "1. API服務器已在3001端口運行" -ForegroundColor White
Write-Host "2. 防火牆已開放8080端口" -ForegroundColor White
Write-Host "3. 路由器已配置端口轉發" -ForegroundColor White
Write-Host ""

# 切換到腳本所在目錄
Set-Location $PSScriptRoot
Write-Host "當前目錄: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

# 檢查Node.js
Write-Host "檢查Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "錯誤: 未找到Node.js，請先安裝Node.js" -ForegroundColor Red
    Read-Host "按Enter鍵退出"
    exit 1
}

Write-Host ""

# 檢查依賴包
Write-Host "檢查依賴包..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "安裝依賴包..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "啟動Web服務器..." -ForegroundColor Green
Write-Host "服務器將在端口8080上運行" -ForegroundColor Cyan
Write-Host "公網訪問地址: http://您的公網IP:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止服務器" -ForegroundColor Yellow
Write-Host ""

# 啟動服務器
node server.js 