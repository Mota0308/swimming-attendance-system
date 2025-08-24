Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署淺色主題到 Railway" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查文件
Write-Host "正在檢查文件..." -ForegroundColor Yellow

$requiredFiles = @(
    "scheduler-light-theme.css",
    "scheduler-light.js", 
    "attendance-board-light.css",
    "attendance-board-light.js"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "錯誤：找不到 $file" -ForegroundColor Red
        Read-Host "按 Enter 鍵退出"
        exit 1
    }
}

Write-Host "所有文件檢查完成！" -ForegroundColor Green
Write-Host ""

Write-Host "正在部署到 Railway..." -ForegroundColor Yellow
Write-Host ""

# 步驟 1: 登入 Railway
Write-Host "步驟 1: 登入 Railway..." -ForegroundColor Cyan
railway login

Write-Host ""
Write-Host "步驟 2: 連接到項目..." -ForegroundColor Cyan
railway link

Write-Host ""
Write-Host "步驟 3: 部署代碼..." -ForegroundColor Cyan
railway up

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "請訪問以下網址查看效果：" -ForegroundColor Yellow
Write-Host "https://swimming-system-web-production.up.railway.app/" -ForegroundColor Cyan
Write-Host ""
Write-Host "登入後點擊「出席記錄管理」查看新的淺色主題" -ForegroundColor Yellow
Write-Host ""

Read-Host "按 Enter 鍵退出" 