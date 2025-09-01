# 直接部署到 Railway swimming-system-web 项目
Write-Host "🚀 开始部署到 Railway swimming-system-web 项目..." -ForegroundColor Green

# 检查当前目录
Write-Host "📁 当前目录: $PWD" -ForegroundColor Blue

# 检查文件是否存在
$files = @("scheduler-light.js", "scheduler-light-fixed.js")
foreach ($file in $files) {
    if (Test-Path $file) {
        $fileInfo = Get-Item $file
        Write-Host "✅ $file 存在 - 大小: $($fileInfo.Length) 字节" -ForegroundColor Green
    } else {
        Write-Host "❌ $file 不存在" -ForegroundColor Red
    }
}

Write-Host ""

# 检查修复内容
Write-Host "🔧 检查修复内容..." -ForegroundColor Yellow

# 检查函数导出
$exportedFunctions = @(
    "buildFromStudents",
    "renderAll", 
    "createStudentCard",
    "normalizeStudent",
    "fetchStudentsRaw"
)

Write-Host "🔍 检查函数导出..." -ForegroundColor Cyan
$allFunctionsExported = $true
foreach ($func in $exportedFunctions) {
    $check = Select-String "window\.$func" "scheduler-light.js"
    if ($check) {
        Write-Host "  ✅ $func" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $func" -ForegroundColor Red
        $allFunctionsExported = $false
    }
}

Write-Host ""

# 检查控制台日志
Write-Host "🔍 检查控制台日志..." -ForegroundColor Cyan
$consoleLog = Select-String "console.log.*scheduler-light.js.*所有函数已导出" "scheduler-light.js"
if ($consoleLog) {
    Write-Host "  ✅ 控制台日志已添加" -ForegroundColor Green
} else {
    Write-Host "  ❌ 控制台日志未找到" -ForegroundColor Red
}

Write-Host ""

# 检查 hasReschedule 逻辑
Write-Host "🔍 检查 hasReschedule 逻辑..." -ForegroundColor Cyan
$hasRescheduleLogic = Select-String "hasReschedule.*span.*🔁" "scheduler-light.js"
if ($hasRescheduleLogic) {
    Write-Host "  ✅ 🔁符号逻辑已添加" -ForegroundColor Green
} else {
    Write-Host "  ❌ 🔁符号逻辑未找到" -ForegroundColor Red
}

Write-Host ""

# 部署状态总结
Write-Host "📋 部署状态总结:" -ForegroundColor Cyan
Write-Host "  - 文件完整性: $(if (Test-Path "scheduler-light.js") { "✅" } else { "❌" })" -ForegroundColor White
Write-Host "  - 函数导出: $(if ($allFunctionsExported) { "✅" } else { "❌" })" -ForegroundColor White
Write-Host "  - 控制台日志: $(if ($consoleLog) { "✅" } else { "❌" })" -ForegroundColor White
Write-Host "  - 🔁符号逻辑: $(if ($hasRescheduleLogic) { "✅" } else { "❌" })" -ForegroundColor White

Write-Host ""

# 检查 Railway 配置
Write-Host "🚂 检查 Railway 配置..." -ForegroundColor Cyan
if (Test-Path "../railway.toml") {
    Write-Host "  ✅ railway.toml 配置存在" -ForegroundColor Green
    $railwayConfig = Get-Content "../railway.toml"
    $staticUrl = $railwayConfig | Select-String "RAILWAY_STATIC_URL"
    if ($staticUrl) {
        Write-Host "  📍 静态URL: $($staticUrl.Line.Trim())" -ForegroundColor Blue
    }
} else {
    Write-Host "  ❌ railway.toml 配置不存在" -ForegroundColor Red
}

Write-Host ""

# 部署方法选择
Write-Host "🚀 选择部署方法:" -ForegroundColor Cyan
Write-Host "1. 使用 Railway CLI 直接部署" -ForegroundColor White
Write-Host "2. 通过 Git 推送触发自动部署" -ForegroundColor White
Write-Host "3. 手动上传文件到 Railway 仪表板" -ForegroundColor White

Write-Host ""

# 推荐部署方法
if ($allFunctionsExported -and $consoleLog -and $hasRescheduleLogic) {
    Write-Host "🎉 所有修复内容已确认，推荐使用 Railway CLI 直接部署！" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📝 Railway CLI 部署步骤:" -ForegroundColor Cyan
    Write-Host "1. 确保已安装 Railway CLI: npm install -g @railway/cli" -ForegroundColor White
    Write-Host "2. 登录 Railway: railway login" -ForegroundColor White
    Write-Host "3. 切换到项目目录: cd .." -ForegroundColor White
    Write-Host "4. 执行部署: railway up" -ForegroundColor White
    Write-Host "5. 等待部署完成" -ForegroundColor White
    
    Write-Host ""
    Write-Host "🔗 或者使用 Git 推送:" -ForegroundColor Cyan
    Write-Host "1. git add ." -ForegroundColor White
    Write-Host "2. git commit -m '修复scheduler-light.js函数导出问题'" -ForegroundColor White
    Write-Host "3. git push" -ForegroundColor White
    Write-Host "4. 等待 GitHub Actions 自动部署" -ForegroundColor White
} else {
    Write-Host "⚠️  发现一些问题，建议先修复后再部署" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 部署后验证:" -ForegroundColor Cyan
Write-Host "1. 访问 Railway 应用URL" -ForegroundColor White
Write-Host "2. 按 Ctrl+Shift+R 强制刷新页面" -ForegroundColor White
Write-Host "3. 打开控制台检查成功消息" -ForegroundColor White
Write-Host "4. 验证🔁符号是否正确显示" -ForegroundColor White

Write-Host ""
Write-Host "✅ 部署检查完成！" -ForegroundColor Green

Read-Host "按任意键退出" 