@echo off
echo ========================================
echo 🚀 部署教练更表格式修改到 Railway
echo ========================================
echo.

echo 📋 本次部署内容:
echo ✅ 教练更表日历格式修改 (每格3行: 上午/下午/晚上)
echo ✅ Excel样式地点统计表
echo ✅ 教练更表与统计表关联逻辑
echo ✅ 新增CSS样式支持
echo.

echo 🔍 检查修改的文件...
echo - Web/script.js (更新教练更表功能)
echo - Web/styles.css (新增Excel样式)
echo - 教练更表格式修改完成报告.md
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加所有修改的文件...
git add Web/script.js
git add Web/styles.css
git add 教练更表格式修改完成报告.md
git add test-roster-format-update.js
git add deploy-roster-format-update.bat
git add deploy-roster-update-to-railway.bat

echo.
echo 💾 提交修改...
git commit -m "教练更表格式重大更新: 支持三时段编辑和Excel样式统计表

- 修改教练更表日历为每格3行格式(上午/下午/晚上)
- 重写每日地点统计表为Excel样式布局
- 建立教练更表与统计表的数据关联
- 添加专业的CSS样式支持
- 支持一天多时段的详细安排
- 提供清晰的地点分配视图

功能特点:
- 每个日期格子包含3个时段的时间和地点选择
- 统计表按地点为行、日期+时段为列的Excel格式
- 数据实时关联，编辑后统计表自动更新
- 支持多教练在同一地点同一时段"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo.
echo 📊 部署状态监控:
echo 1. Railway 检测到 GitHub 推送
echo 2. 自动触发构建和部署
echo 3. 更新 Web 应用程序
echo.

echo 🔗 Railway 控制台:
echo https://railway.app/dashboard
echo.

echo 📱 部署完成后的测试步骤:
echo 1. 访问 Web 应用 URL
echo 2. 登录主管账号
echo 3. 选择"教练更表"功能
echo 4. 测试新的三时段编辑格式
echo 5. 查看Excel样式的地点统计表
echo.

echo 🎯 新功能使用说明:
echo - 每个日期格子现在有3行: 上午、下午、晚上
echo - 每行包含时间输入框和地点下拉选择
echo - 统计表显示所有地点在各时段的教练分配
echo - 编辑更表后统计表会自动更新
echo.

echo ✅ 部署脚本执行完成!
echo 请等待 Railway 完成自动部署...
echo.

pause 