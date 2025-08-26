@echo off
echo 🚀 游泳系統 - 學生分類修復部署
echo ========================================
echo.
echo 🔧 修復內容：
echo 1. ✅ 新增學生按日期分類到指定位置
echo 2. ✅ 新增學生按時間不同分類到不同框格
echo 3. ✅ 新增學生按課程類型不同分類到不同框格
echo 4. ✅ 智能排序：先按日期，再按時間
echo 5. ✅ 修復 scheduler-light.js 和 scheduler.js
echo.

echo 📝 檢查 Git 狀態...
git status

echo.
echo 📦 添加修復文件...
git add Web/scheduler-light.js
git add Web/scheduler.js

echo.
echo 💾 提交修復...
git commit -m "修复学生分类逻辑: 按日期、时间、课程类型智能分类，支持拖拽到指定位置"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🎉 學生分類修復部署完成！
echo.
echo 📋 修復說明：
echo ✅ 學生現在按上課日期分類到指定位置
echo ✅ 不同時間段的學生分類到不同框格
echo ✅ 不同課程類型的學生分類到不同框格
echo ✅ 智能排序：日期優先，時間其次
echo ✅ 支持拖拽學生到指定日期和時段
echo.
echo 🔗 檢查部署狀態：
echo GitHub: https://github.com/Mota0308/swimming-attendance-system
echo Railway: https://railway.app/dashboard
echo.
echo ⏰ 部署完成後，請測試新增學生功能：
echo 1. 新增不同日期的學生 → 應該分類到不同位置
echo 2. 新增不同時間的學生 → 應該分類到不同框格
echo 3. 新增不同類型的學生 → 應該分類到不同框格
echo.
pause 