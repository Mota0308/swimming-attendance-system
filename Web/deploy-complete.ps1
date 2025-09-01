# 完整部署脚本
Write-Host "🚀 开始完整部署 scheduler-light.js..." -ForegroundColor Green

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
foreach ($func in $exportedFunctions) {
    $check = Select-String "window\.$func" "scheduler-light.js"
    if ($check) {
        Write-Host "  ✅ $func" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $func" -ForegroundColor Red
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
Write-Host "  - 函数导出: $(if ($exportedFunctions | ForEach-Object { Select-String "window\.$_" "scheduler-light.js" } | Where-Object { $_ }) { "✅" } else { "❌" })" -ForegroundColor White
Write-Host "  - 控制台日志: $(if ($consoleLog) { "✅" } else { "❌" })" -ForegroundColor White
Write-Host "  - 🔁符号逻辑: $(if ($hasRescheduleLogic) { "✅" } else { "❌" })" -ForegroundColor White

Write-Host ""

# 部署说明
Write-Host "🌐 部署说明:" -ForegroundColor Cyan
Write-Host "1. 将修复后的 scheduler-light.js 上传到 Railway 生产环境" -ForegroundColor White
Write-Host "2. 替换现有的 scheduler-light.js 文件" -ForegroundColor White
Write-Host "3. 清除浏览器缓存并刷新页面" -ForegroundColor White
Write-Host "4. 验证🔁符号是否正确显示" -ForegroundColor White

Write-Host ""
Write-Host "📝 立即部署操作:" -ForegroundColor Cyan
Write-Host "1. 复制 scheduler-light.js 到生产环境" -ForegroundColor White
Write-Host "2. 在web界面中按 Ctrl+Shift+R 强制刷新" -ForegroundColor White
Write-Host "3. 检查控制台是否显示成功消息" -ForegroundColor White
Write-Host "4. 验证学生卡片和🔁符号是否正确显示" -ForegroundColor White

Write-Host ""
Write-Host "🎯 预期结果:" -ForegroundColor Cyan
Write-Host "  - 所有学生数据都能正确渲染" -ForegroundColor White
Write-Host "  - hasReschedule: true 的学生显示🔁符号" -ForegroundColor White
Write-Host "  - 课程编排系统正常工作" -ForegroundColor White
Write-Host "  - 不再需要手动实现函数" -ForegroundColor White

Write-Host ""
Write-Host "🔍 验证方法:" -ForegroundColor Cyan
Write-Host "1. 刷新web页面" -ForegroundColor White
Write-Host "2. 打开浏览器控制台" -ForegroundColor White
Write-Host "3. 检查是否有成功消息" -ForegroundColor White
Write-Host "4. 验证学生卡片是否正确显示" -ForegroundColor White
Write-Host "5. 检查🔁符号是否出现在hasReschedule: true的学生姓名旁边" -ForegroundColor White

Write-Host ""
Write-Host "✅ 部署检查完成！" -ForegroundColor Green

if ($consoleLog -and $hasRescheduleLogic) {
    Write-Host "🎉 所有修复内容已确认，文件准备就绪！" -ForegroundColor Green
    Write-Host "请立即部署到生产环境" -ForegroundColor White
} else {
    Write-Host "⚠️  发现一些问题，建议重新检查文件" -ForegroundColor Yellow
}

Read-Host "按任意键退出" 