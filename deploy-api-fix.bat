@echo off
echo 🚀 游泳系統 - 部署API修復
echo ========================================
echo.
echo 🔧 修復內容：
echo 1. 前端API baseURL 使用當前域名
echo 2. 通過代理正確訪問後端API
echo 3. 解決 "Only absolute URLs are supported" 錯誤
echo.

echo 📝 檢查 Git 狀態...
git status

echo.
echo 📦 添加修復文件...
git add Web/database-connector.js
git add Web/full-server.js

echo.
echo 💾 提交修復...
git commit -m "修复前端API调用问题: 使用当前域名baseURL，通过代理访问后端API"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🎉 API修復部署完成！
echo.
echo 📋 修復說明：
echo ✅ 前端現在使用 window.location.origin 作為 baseURL
echo ✅ 所有API調用都通過代理 /api/* 路由
echo ✅ 解決了相對路徑不支持的問題
echo ✅ 數據庫連接狀態應該能正常顯示
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
pause 