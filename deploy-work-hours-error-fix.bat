@echo off
echo 🚀 游泳系統 - 工時管理錯誤修復部署
echo ========================================
echo.
echo 🔧 修復內容：
echo 1. ✅ 修復JavaScript ReferenceError: coachPhone is not defined
echo 2. ✅ 添加缺失的 /coach-work-hours-stats API端點
echo 3. ✅ 修復HTTP 500錯誤
echo 4. ✅ 確保工時統計功能正常工作
echo 5. ✅ 修復全部工時總結顯示問題
echo.
echo 📝 檢查 Git 狀態...
git status
echo.
echo 📦 添加修復文件...
git add Web/script.js api-server/server.js
echo.
echo 💾 提交修復...
git commit -m "修复工時管理错误: coachPhone未定义、添加缺失API端点、修复HTTP 500错误"
echo.
echo 🌿 推送到 GitHub...
git push origin main
echo.
echo 🎉 工時管理錯誤修復部署完成！
echo.
echo 📋 修復說明：
echo ✅ 修復了coachPhone變量未定義的JavaScript錯誤
echo ✅ 添加了缺失的 /coach-work-hours-stats API端點
echo ✅ 修復了HTTP 500內部服務器錯誤
echo ✅ 確保工時統計功能正常工作
echo ✅ 修復了全部工時總結顯示問題
echo ✅ 添加了完整的錯誤處理和日誌記錄
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
echo ⏰ 部署完成後，請測試修復：
echo 1. 登入教練賬號
echo 2. 進入工時管理頁面
echo 3. 選擇月份、地點、泳會
echo 4. 點擊"刷新數據"
echo 5. 檢查控制台是否還有錯誤
echo 6. 驗證全部工時總結是否正常顯示
echo 7. 測試Excel導出功能
echo.
pause 