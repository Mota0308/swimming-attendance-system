@echo off
chcp 65001 >nul
echo 🚀 直接部署到 Railway swimming-system-web 项目
echo ================================================
echo.

echo 📁 当前目录: %CD%
echo 📊 检查修复文件...

if exist "scheduler-light.js" (
    echo ✅ scheduler-light.js 文件存在
    dir scheduler-light.js | find "scheduler-light.js"
) else (
    echo ❌ scheduler-light.js 文件不存在
    pause
    exit /b 1
)

echo.
echo 🔍 检查修复内容...
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
echo 🚂 检查 Railway 配置...
if exist "..\railway.toml" (
    echo ✅ railway.toml 配置存在
    findstr "RAILWAY_STATIC_URL" ..\railway.toml
) else (
    echo ❌ railway.toml 配置不存在
)

echo.
echo 🚀 选择部署方法:
echo 1. 使用 Railway CLI 直接部署 (推荐)
echo 2. 通过 Git 推送触发自动部署
echo 3. 手动上传到 Railway 仪表板

echo.
echo 📝 Railway CLI 部署步骤:
echo 1. 安装 Railway CLI: npm install -g @railway/cli
echo 2. 登录 Railway: railway login
echo 3. 切换到项目根目录: cd ..
echo 4. 执行部署: railway up
echo 5. 等待部署完成

echo.
echo 🔗 Git 推送部署步骤:
echo 1. git add .
echo 2. git commit -m "修复scheduler-light.js函数导出问题"
echo 3. git push
echo 4. 等待 GitHub Actions 自动部署

echo.
echo 🌐 部署后验证:
echo 1. 访问 Railway 应用URL
echo 2. 按 Ctrl+Shift+R 强制刷新页面
echo 3. 打开控制台检查成功消息
echo 4. 验证🔁符号是否正确显示

echo.
echo ✅ 部署准备完成！
echo 请选择上述方法之一进行部署
pause 