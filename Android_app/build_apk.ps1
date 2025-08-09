Write-Host "🚀 構建新的游泳課程出席管理系統 APK (端口3001)..." -ForegroundColor Green
Write-Host ""

Write-Host "📦 清理項目..." -ForegroundColor Yellow
& .\gradlew clean

Write-Host "🔧 編譯項目..." -ForegroundColor Yellow
& .\gradlew assembleRelease

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 構建成功！" -ForegroundColor Green
    Write-Host "📱 APK文件位置: app\build\outputs\apk\release\app-release.apk" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 更新內容:" -ForegroundColor Yellow
    Write-Host "   • API服務器端口已更新為3001" -ForegroundColor White
    Write-Host "   • 支持從 http://203.145.95.240:3001 獲取學生資料" -ForegroundColor White
    Write-Host "   • 家長版本刷新功能已更新" -ForegroundColor White
    Write-Host "   • 改進了錯誤處理和狀態顯示" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 使用說明:" -ForegroundColor Yellow
    Write-Host "   1. 安裝新的 APK 到手機" -ForegroundColor White
    Write-Host "   2. 登入家長版本" -ForegroundColor White
    Write-Host "   3. 點擊 '🔄 刷新學生資料' 按鈕" -ForegroundColor White
    Write-Host "   4. 查看從 API 服務器獲取的學生資料" -ForegroundColor White
    Write-Host "   5. 點擊 '⚙️ API 配置' 查看當前配置" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 API 服務器地址: http://203.145.95.240:3001" -ForegroundColor Cyan
    Write-Host "🔑 API 密鑰: ttdrcccy / 2b207365-cbf0-4e42-a3bf-f932c84557c4" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "請將 APK 文件安裝到 Android 設備上進行測試。" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ 構建失敗，請檢查錯誤信息。" -ForegroundColor Red
}

Write-Host ""
Write-Host "按任意鍵繼續..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 