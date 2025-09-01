@echo off
echo 🚀 开始部署修复后的scheduler-light.js...

echo 📁 当前目录: %CD%
echo 📁 检查文件是否存在...

if exist "scheduler-light.js" (
    echo ✅ scheduler-light.js 文件存在
    echo 📊 文件大小: 
    dir scheduler-light.js | find "scheduler-light.js"
) else (
    echo ❌ scheduler-light.js 文件不存在
    pause
    exit /b 1
)

echo.
echo 🔧 检查修复内容...
findstr "导出所有关键函数到全局作用域" scheduler-light.js
if %errorlevel% equ 0 (
    echo ✅ 修复内容已添加
) else (
    echo ❌ 修复内容未找到
    pause
    exit /b 1
)

echo.
echo 📋 修复内容摘要:
echo - 导出 buildFromStudents 函数
echo - 导出 renderAll 函数  
echo - 导出 createStudentCard 函数
echo - 导出其他关键函数和变量
echo - 确保所有学生数据都能正确渲染🔁符号

echo.
echo 🌐 部署说明:
echo 1. 将修复后的 scheduler-light.js 上传到生产环境
echo 2. 替换现有的 scheduler-light.js 文件
echo 3. 清除浏览器缓存并刷新页面
echo 4. 验证🔁符号是否正确显示

echo.
echo 📝 部署步骤:
echo 1. 上传 scheduler-light.js 到 Railway 生产环境
echo 2. 在 web 界面中刷新页面
echo 3. 检查控制台是否显示 "✅ scheduler-light.js 所有函数已导出到全局作用域"
echo 4. 验证学生卡片和🔁符号是否正确显示

echo.
echo 🎯 预期结果:
echo - 所有学生数据都能正确渲染
echo - hasReschedule: true 的学生显示🔁符号
echo - 课程编排系统正常工作
echo - 不再需要手动实现函数

echo.
echo ✅ 部署脚本准备完成！
echo 请按照上述步骤进行部署
pause 