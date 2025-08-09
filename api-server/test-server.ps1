# 測試 API 服務器
Write-Host "🧪 測試 API 服務器連接..." -ForegroundColor Green
Write-Host ""

# 測試健康檢查端點
Write-Host "📋 測試健康檢查端點..." -ForegroundColor Yellow
try {
    $headers = @{
        "X-API-Public-Key" = "ttdrcccy"
        "X-API-Private-Key" = "2b207365-cbf0-4e42-a3bf-f932c84557c4"
    }
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Headers $headers -Method GET
    Write-Host "✅ 健康檢查成功!" -ForegroundColor Green
    Write-Host "📊 響應內容:" -ForegroundColor Cyan
    Write-Host $response.Content
} catch {
    Write-Host "❌ 健康檢查失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 測試獲取學生資料端點..." -ForegroundColor Yellow
try {
    $headers = @{
        "X-API-Public-Key" = "ttdrcccy"
        "X-API-Private-Key" = "2b207365-cbf0-4e42-a3bf-f932c84557c4"
    }
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/students" -Headers $headers -Method GET
    Write-Host "✅ 獲取學生資料成功!" -ForegroundColor Green
    Write-Host "📊 學生數量: $($response.Content.Length) 字符" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 獲取學生資料失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 測試完成!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 手機 APP 配置:" -ForegroundColor Cyan
Write-Host "   基礎 URL: http://203.145.95.240:3000" -ForegroundColor White
Write-Host "   公開密鑰: ttdrcccy" -ForegroundColor White
Write-Host "   私有密鑰: 2b207365-cbf0-4e42-a3bf-f932c84557c4" -ForegroundColor White 