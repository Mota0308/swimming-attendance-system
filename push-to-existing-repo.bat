@echo off
echo 🚀 游泳系統 - 推送到現有 GitHub 倉庫
echo ========================================
echo.
echo 📍 目標倉庫: https://github.com/Mota0308/swimming-attendance-system.git
echo.

echo 📝 檢查 Git 狀態...
git status

echo.
echo 📦 添加所有修改的文件...
git add .

echo.
echo 💾 提交修改...
git commit -m "修复API路径问题: 添加/api前缀到所有API端点，优化API代理响应处理"

echo.
echo 🌿 推送到 GitHub 主分支...
git push origin main

echo.
echo 🎉 推送完成！
echo.
echo 📋 下一步：
echo 1. 等待 GitHub Actions 自動部署到 Railway
echo 2. 或者手動在 Railway 儀表板中觸發部署
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
pause 