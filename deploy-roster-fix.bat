@echo off
echo 🚀 游泳系統 - 更表數據修復部署
echo ========================================
echo.
echo 🔧 修復內容：
echo 1. ✅ 修復 /coaches -> /api/coaches
echo 2. ✅ 修復 /coach-roster -> /api/coach-roster
echo 3. ✅ 所有API調用都使用 /api 前綴
echo 4. ✅ 更表數據應該能正常顯示
echo.

echo 📝 檢查 Git 狀態...
git status

echo.
echo 📦 添加修復文件...
git add Web/database-connector.js

echo.
echo 💾 提交修復...
git commit -m "修复更表数据API路径: /coaches和/coach-roster都使用/api前缀"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🎉 更表修復部署完成！
echo.
echo 📋 修復說明：
echo ✅ 教練信息API: /coaches -> /api/coaches
echo ✅ 更表數據API: /coach-roster -> /api/coach-roster
echo ✅ 所有API調用都通過代理 /api/* 路由
echo ✅ 更表管理面板應該能正常顯示數據
echo ✅ 編輯更表功能應該能正常載入和保存
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
echo ⏰ 部署完成後，請刷新頁面測試更表功能
echo.
pause 