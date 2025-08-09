Write-Host "🔍 API服務器連接診斷工具" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

# 1. 檢查Node.js進程
Write-Host "1️⃣ 檢查Node.js進程..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "✅ 發現 $($nodeProcesses.Count) 個Node.js進程" -ForegroundColor Green
    $nodeProcesses | ForEach-Object {
        Write-Host "   PID: $($_.Id), 啟動時間: $($_.StartTime)" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ 未發現Node.js進程" -ForegroundColor Red
}

Write-Host ""

# 2. 檢查端口使用情況
Write-Host "2️⃣ 檢查端口使用情況..." -ForegroundColor Yellow
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "✅ 端口3001正在使用" -ForegroundColor Green
    Write-Host "   進程ID: $($port3001.OwningProcess)" -ForegroundColor Cyan
} else {
    Write-Host "❌ 端口3001未使用" -ForegroundColor Red
}

$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "⚠️ 端口3000正在使用" -ForegroundColor Yellow
    Write-Host "   進程ID: $($port3000.OwningProcess)" -ForegroundColor Cyan
}

Write-Host ""

# 3. 測試本地連接
Write-Host "3️⃣ 測試本地API連接..." -ForegroundColor Yellow
try {
    $headers = @{
        "x-api-public-key" = "ttdrcccy"
        "x-api-private-key" = "2b207365-cbf0-4e42-a3bf-f932c84557c4"
    }
    
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers $headers -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ 本地API連接成功" -ForegroundColor Green
    Write-Host "   狀態碼: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "   響應: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 本地API連接失敗" -ForegroundColor Red
    Write-Host "   錯誤: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 4. 測試公網連接
Write-Host "4️⃣ 測試公網API連接..." -ForegroundColor Yellow
try {
    $headers = @{
        "x-api-public-key" = "ttdrcccy"
        "x-api-private-key" = "2b207365-cbf0-4e42-a3bf-f932c84557c4"
    }
    
    $response = Invoke-WebRequest -Uri "http://203.145.95.240:3001/health" -Headers $headers -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ 公網API連接成功" -ForegroundColor Green
    Write-Host "   狀態碼: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "   響應: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 公網API連接失敗" -ForegroundColor Red
    Write-Host "   錯誤: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 5. 檢查防火牆
Write-Host "5️⃣ 檢查防火牆規則..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule -DisplayName "*3001*" -ErrorAction SilentlyContinue
if ($firewallRules) {
    Write-Host "✅ 發現防火牆規則" -ForegroundColor Green
    $firewallRules | ForEach-Object {
        Write-Host "   規則: $($_.DisplayName), 狀態: $($_.Enabled)" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠️ 未發現端口3001的防火牆規則" -ForegroundColor Yellow
}

Write-Host ""

# 6. 建議解決方案
Write-Host "6️⃣ 診斷結果和建議..." -ForegroundColor Yellow
Write-Host ""

if (-not $nodeProcesses) {
    Write-Host "🔧 建議1: 啟動API服務器" -ForegroundColor Green
    Write-Host "   執行: node server.js" -ForegroundColor Cyan
    Write-Host ""
}

if (-not $port3001) {
    Write-Host "🔧 建議2: 檢查服務器是否正確啟動" -ForegroundColor Green
    Write-Host "   確保服務器監聽端口3001" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "🔧 建議3: 檢查Android應用配置" -ForegroundColor Green
Write-Host "   確保APIConfig.kt中的端口設置為3001" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔧 建議4: 測試網絡連接" -ForegroundColor Green
Write-Host "   在Android設備上測試: http://203.145.95.240:3001/health" -ForegroundColor Cyan
Write-Host ""

Write-Host "按任意鍵繼續..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 