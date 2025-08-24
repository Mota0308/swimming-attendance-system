@echo off
echo 🚀 游泳系統 - 完整API修復部署
echo ========================================
echo.
echo 🔧 修復內容：
echo 1. ✅ 前端API baseURL 使用當前域名
echo 2. ✅ scheduler-light.js 修復 /students -> /api/students
echo 3. ✅ scheduler.js 修復 /students -> /api/students
echo 4. ✅ 通過代理正確訪問後端API
echo 5. ✅ 解決所有 "Unexpected token '<'" 錯誤
echo.

echo 📝 檢查 Git 狀態...
git status

echo.
echo 📦 添加所有修復文件...
git add Web/database-connector.js
git add Web/scheduler-light.js
git add Web/scheduler.js
git add Web/full-server.js

echo.
echo 💾 提交修復...
git commit -m "完整修复API路径问题: 所有前端API调用都使用/api前缀，通过代理访问后端"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🎉 完整API修復部署完成！
echo.
echo 📋 修復說明：
echo ✅ 前端現在使用 window.location.origin 作為 baseURL
echo ✅ scheduler-light.js 和 scheduler.js 都使用 /api/students
echo ✅ 所有API調用都通過代理 /api/* 路由
echo ✅ 解決了相對路徑不支持的問題
echo ✅ 解決了 "Unexpected token '<'" JSON解析錯誤
echo ✅ 數據庫連接狀態應該能正常顯示
echo ✅ 學生名單應該能正常獲取
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
echo ⏰ 部署完成後，請刷新頁面測試功能
echo.
pause 