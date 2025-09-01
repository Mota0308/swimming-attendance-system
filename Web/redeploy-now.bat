@echo off
chcp 65001 >nul
echo 🚀 开始重新部署修复后的scheduler-light.js...
echo.

echo 📁 当前目录: %CD%
echo 📊 文件信息:
dir scheduler-light.js

echo.
echo 🔍 验证修复内容...
findstr "导出所有关键函数到全局作用域" scheduler-light.js
if %errorlevel% equ 0 (
    echo ✅ 修复内容已确认
) else (
    echo ❌ 修复内容未找到
    pause
    exit /b 1
)

echo.
echo 🔍 检查函数导出...
findstr "window\.buildFromStudents" scheduler-light.js
if %errorlevel% equ 0 (
    echo ✅ buildFromStudents 函数已导出
) else (
    echo ❌ buildFromStudents 函数未导出
)

findstr "window\.renderAll" scheduler-light.js
if %errorlevel% equ 0 (
    echo ✅ renderAll 函数已导出
) else (
    echo ❌ renderAll 函数未导出
)

findstr "window\.createStudentCard" scheduler-light.js
if %errorlevel% equ 0 (
    echo ✅ createStudentCard 函数已导出
) else (
    echo ❌ createStudentCard 函数未导出
)

echo.
echo 🔍 检查控制台日志...
findstr "scheduler-light.js 所有函数已导出到全局作用域" scheduler-light.js
if %errorlevel% equ 0 (
    echo ✅ 控制台日志已添加
) else (
    echo ❌ 控制台日志未添加
)

echo.
echo 📋 修复内容摘要:
echo - 导出 buildFromStudents 函数
echo - 导出 renderAll 函数  
echo - 导出 createStudentCard 函数
echo - 导出其他关键函数和变量
echo - 确保所有学生数据都能正确渲染🔁符号

echo.
echo 🌐 重新部署步骤:
echo 1. 将修复后的 scheduler-light.js 上传到 Railway 生产环境
echo 2. 替换现有的 scheduler-light.js 文件
echo 3. 清除浏览器缓存并刷新页面
echo 4. 验证🔁符号是否正确显示

echo.
echo 📝 立即部署操作:
echo 1. 复制 scheduler-light.js 到生产环境
echo 2. 在web界面中按 Ctrl+Shift+R 强制刷新
echo 3. 检查控制台是否显示 "✅ scheduler-light.js 所有函数已导出到全局作用域"
echo 4. 验证学生卡片和🔁符号是否正确显示

echo.
echo 🎯 预期结果:
echo - 所有学生数据都能正确渲染
echo - hasReschedule: true 的学生显示🔁符号
echo - 课程编排系统正常工作
echo - 不再需要手动实现函数

echo.
echo ⚠️  重要提醒:
echo - 部署后请立即测试功能
echo - 如果出现问题，可以回滚到修复前的版本
echo - 建议在测试环境先验证

echo.
echo ✅ 重新部署准备完成！
echo 请立即将 scheduler-light.js 上传到生产环境
echo.
echo 📁 文件位置: %CD%\scheduler-light.js
echo 📊 文件大小: 
dir scheduler-light.js | find "scheduler-light.js"
pause 