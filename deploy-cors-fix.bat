@echo off
echo 🚀 游泳系統 - CORS修復部署
echo ========================================
echo.
echo 🔧 修復內容：
echo 1. ✅ 修復CORS配置，允許前端域名訪問
echo 2. ✅ 修復前端API配置，使用代理避免CORS問題
echo 3. ✅ 支持登入、OPTIONS預檢請求
echo 4. ✅ 允許必要的請求頭和憑證
echo 5. ✅ 解決 "Failed to fetch" 登入錯誤
echo.

echo 📝 檢查 Git 狀態...
git status

echo.
echo 📦 添加修復文件...
git add Web/full-server.js
git add Web/script.js

echo.
echo 💾 提交修復...
git commit -m "修复CORS问题: 配置跨域访问，修复前端API配置，解决登录失败问题"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🎉 CORS修復部署完成！
echo.
echo 📋 修復說明：
echo ✅ 後端現在允許前端域名跨域訪問
echo ✅ 前端使用代理API，避免直接調用後端
echo ✅ 支持登入、OPTIONS預檢請求
echo ✅ 允許必要的請求頭和憑證
echo ✅ 登入功能應該能正常工作
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
echo ⏰ 部署完成後，請測試登入功能：
echo 1. 刷新頁面
echo 2. 嘗試使用教練賬號登入
echo 3. 應該不再出現 "Failed to fetch" 錯誤
echo.
pause 