# 清理 Android Gradle 緩存文件
Write-Host "🧹 清理 Android Gradle 緩存文件..." -ForegroundColor Green

# 刪除 Gradle 緩存目錄
$gradleDirs = @(
    "Android_app\gradle-8.0-bin",
    "Android_app\.gradle", 
    "Android_app\build",
    "Android_app\app\build"
)

foreach ($dir in $gradleDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "✅ 已刪除 $dir" -ForegroundColor Green
    }
}

# 刪除 APK 文件
Get-ChildItem -Path "." -Filter "*.apk" | Remove-Item -Force
Write-Host "✅ 已刪除 APK 文件" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 清理完成！" -ForegroundColor Green
Write-Host ""

# 初始化 Git 倉庫
Write-Host "📦 初始化 Git 倉庫..." -ForegroundColor Yellow
git init

Write-Host "📝 添加文件到暫存區..." -ForegroundColor Yellow
git add .

Write-Host "💾 創建初始提交..." -ForegroundColor Yellow
git commit -m "Initial commit: Swimming Attendance System"

Write-Host "🌿 設置主分支..." -ForegroundColor Yellow
git branch -M main

Write-Host ""
Write-Host "🎯 下一步操作：" -ForegroundColor Cyan
Write-Host "1. 在 GitHub 上創建新倉庫" -ForegroundColor White
Write-Host "2. 運行以下命令連接遠程倉庫：" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/swimming-attendance-system.git" -ForegroundColor Yellow
Write-Host "3. 推送代碼：" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "請將 YOUR_USERNAME 替換為你的 GitHub 用戶名" -ForegroundColor Red 