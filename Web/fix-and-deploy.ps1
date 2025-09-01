# 修复并重新部署 scheduler-light.js
Write-Host "🚀 开始修复并重新部署 scheduler-light.js..." -ForegroundColor Green

# 检查当前目录
Write-Host "📁 当前目录: $PWD" -ForegroundColor Blue

# 检查文件是否存在
if (Test-Path "scheduler-light.js") {
    Write-Host "✅ scheduler-light.js 文件存在" -ForegroundColor Green
    
    # 获取文件信息
    $fileInfo = Get-Item "scheduler-light.js"
    Write-Host "📊 文件大小: $($fileInfo.Length) 字节" -ForegroundColor Blue
    Write-Host "📅 最后修改时间: $($fileInfo.LastWriteTime)" -ForegroundColor Blue
} else {
    Write-Host "❌ scheduler-light.js 文件不存在" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""

# 检查修复内容
Write-Host "🔧 检查修复内容..." -ForegroundColor Yellow
$fixContent = Select-String "导出所有关键函数到全局作用域" "scheduler-light.js"
if ($fixContent) {
    Write-Host "✅ 修复内容已确认存在" -ForegroundColor Green
    Write-Host "📍 位置: 第 $($fixContent.LineNumber) 行" -ForegroundColor Blue
} else {
    Write-Host "❌ 修复内容未找到，需要重新修复" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""

# 检查函数导出
Write-Host "🔍 检查函数导出..." -ForegroundColor Yellow
$exportedFunctions = @(
    "buildFromStudents",
    "renderAll", 
    "createStudentCard",
    "buildSchedulerSkeleton",
    "bindHeader",
    "initData",
    "fetchStudentsRaw",
    "normalizeStudent"
)

$missingFunctions = @()
foreach ($func in $exportedFunctions) {
    $check = Select-String "window\.$func" "scheduler-light.js"
    if ($check) {
        Write-Host "  ✅ $func" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $func" -ForegroundColor Red
        $missingFunctions += $func
    }
}

if ($missingFunctions.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  发现缺失的函数导出:" -ForegroundColor Yellow
    foreach ($func in $missingFunctions) {
        Write-Host "  - $func" -ForegroundColor Red
    }
    Write-Host "需要重新修复文件" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""
Write-Host "✅ 所有关键函数导出检查完成" -ForegroundColor Green

# 检查全局变量导出
Write-Host ""
Write-Host "🔍 检查全局变量导出..." -ForegroundColor Yellow
$exportedVars = @("scheduleData", "allStudentsCache", "dragging")
foreach ($var in $exportedVars) {
    $check = Select-String "window\.$var" "scheduler-light.js"
    if ($check) {
        Write-Host "  ✅ $var" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $var" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📋 修复内容摘要:" -ForegroundColor Cyan
Write-Host "  - 导出 buildFromStudents 函数" -ForegroundColor White
Write-Host "  - 导出 renderAll 函数" -ForegroundColor White
Write-Host "  - 导出 createStudentCard 函数" -ForegroundColor White
Write-Host "  - 导出其他关键函数和变量" -ForegroundColor White
Write-Host "  - 确保所有学生数据都能正确渲染🔁符号" -ForegroundColor White

Write-Host ""
Write-Host "🌐 部署说明:" -ForegroundColor Cyan
Write-Host "1. 将修复后的 scheduler-light.js 上传到 Railway 生产环境" -ForegroundColor White
Write-Host "2. 替换现有的 scheduler-light.js 文件" -ForegroundColor White
Write-Host "3. 清除浏览器缓存并刷新页面" -ForegroundColor White
Write-Host "4. 验证🔁符号是否正确显示" -ForegroundColor White

Write-Host ""
Write-Host "📝 立即部署操作:" -ForegroundColor Cyan
Write-Host "1. 复制 scheduler-light.js 到生产环境" -ForegroundColor White
Write-Host "2. 在web界面中按 Ctrl+Shift+R 强制刷新" -ForegroundColor White
Write-Host "3. 检查控制台是否显示 '✅ scheduler-light.js 所有函数已导出到全局作用域'" -ForegroundColor White
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
Write-Host "3. 检查是否有 '✅ scheduler-light.js 所有函数已导出到全局作用域' 消息" -ForegroundColor White
Write-Host "4. 验证学生卡片是否正确显示" -ForegroundColor White
Write-Host "5. 检查🔁符号是否出现在hasReschedule: true的学生姓名旁边" -ForegroundColor White

Write-Host ""
Write-Host "✅ 修复和部署检查完成！" -ForegroundColor Green
Write-Host "文件已准备就绪，请立即部署到生产环境" -ForegroundColor White

Read-Host "按任意键退出" 