@echo off
echo 🚀 游泳系統 - 主管功能部署
echo ========================================
echo.
echo 🔧 新增功能：
echo 1. ✅ 添加主管登录身份
echo 2. ✅ 主管工时管理页面（显示所有教练数据）
echo 3. ✅ 主管更表管理页面（显示所有教练数据）
echo 4. ✅ 支持月份、地点、泳会筛选
echo 5. ✅ 创建主管测试账号
echo 6. ✅ 添加type字段到数据库
echo.
echo 📝 檢查 Git 狀態...
git status
echo.
echo 📦 添加新功能文件...
git add Web/index.html Web/script.js Web/database-connector.js api-server/server.js api-server/create-supervisor-accounts.js
echo.
echo 💾 提交新功能...
git commit -m "添加主管功能: 支持主管登录、查看所有教练数据、工时管理、更表管理"
echo.
echo 🌿 推送到 GitHub...
git push origin main
echo.
echo 🎉 主管功能部署完成！
echo.
echo 📋 功能說明：
echo ✅ 主管登录身份：支持supervisor身份登录
echo ✅ 主管工时管理：显示所有教练的工时数据
echo ✅ 主管更表管理：显示所有教练的日历表
echo ✅ 灵活筛选：支持月份、地点、泳会组合筛选
echo ✅ 数据库字段：添加type字段（supervisor/staff/admin）
echo ✅ 测试账号：创建主管测试账号
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
echo ⏰ 部署完成後，請執行以下步驟：
echo 1. 運行主管賬號創建腳本：
echo    cd api-server
echo    node create-supervisor-accounts.js
echo.
echo 2. 測試主管功能：
echo    - 使用主管賬號登入：supervisor001 / supervisor123
echo    - 進入工時管理頁面，查看所有教練數據
echo    - 進入更表管理頁面，查看所有教練日曆表
echo    - 測試篩選功能：月份、地點、泳會
echo.
echo 3. 驗證功能：
echo    - 主管可以查看所有教練的數據
echo    - 教練只能查看自己的數據
echo    - 篩選功能正常工作
echo    - 用戶身份顯示正確
echo.
pause 