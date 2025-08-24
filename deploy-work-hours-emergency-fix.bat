@echo off
echo 🚨 游泳系統 - 工時管理緊急錯誤修復部署
echo ========================================
echo.
echo 🔧 緊急修復內容：
echo 1. ✅ 修復coachPhone變量作用域問題
echo 2. ✅ 將coachPhone變量移到函數頂部
echo 3. ✅ 確保變量在整個函數中可用
echo 4. ✅ 修復ReferenceError錯誤
echo 5. ✅ 確保全部工時總結正常顯示
echo.
echo 📝 檢查 Git 狀態...
git status
echo.
echo 📦 添加緊急修復文件...
git add Web/script.js
echo.
echo 💾 提交緊急修復...
git commit -m "紧急修复工時管理coachPhone变量作用域问题"
echo.
echo 🌿 推送到 GitHub...
git push origin main
echo.
echo 🎉 工時管理緊急錯誤修復部署完成！
echo.
echo 📋 修復說明：
echo ✅ 將coachPhone變量從if塊內部移到函數頂部
echo ✅ 使用let聲明確保變量在整個函數中可用
echo ✅ 修復了ReferenceError: coachPhone is not defined錯誤
echo ✅ 確保updateAllWorkHoursSummary函數能正常調用
echo ✅ 修復了全部工時總結顯示問題
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
echo ⏰ 部署完成後，請立即測試：
echo 1. 刷新頁面清除緩存
echo 2. 重新登入教練賬號
echo 3. 進入工時管理頁面
echo 4. 選擇月份、地點、泳會
echo 5. 點擊"刷新數據"
echo 6. 檢查控制台是否還有ReferenceError
echo 7. 驗證全部工時總結是否正常顯示
echo.
pause 