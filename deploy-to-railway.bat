@echo off
echo 🚀 游泳系統 - Railway 部署腳本
echo ========================================
echo.

echo 📝 檢查 Git 狀態...
git status

echo.
echo 📦 添加所有修改的文件...
git add .

echo.
echo 💾 提交修改...
git commit -m "修复API路径问题: 添加/api前缀到所有API端点"

echo.
echo 🌿 推送到 GitHub...
git push

echo.
echo 🎉 部署完成！
echo.
echo 📋 下一步：
echo 1. 等待 GitHub Actions 自動部署到 Railway
echo 2. 或者手動在 Railway 儀表板中觸發部署
echo.
echo 🔗 Railway 儀表板：
echo https://railway.app/dashboard
echo.
pause 