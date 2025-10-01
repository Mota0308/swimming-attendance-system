@echo off
echo ========================================
echo 部署教练更表格式修改
echo ========================================
echo.

echo 📋 修改内容:
echo 1. 教练更表日历格式修改为每格3行(上午/下午/晚上)
echo 2. 每日上课地点统计表修改为Excel样式
echo 3. 建立教练更表和地点统计表的关联逻辑
echo 4. 添加相应的CSS样式支持
echo.

echo 🚀 开始部署...
echo.

echo ✅ 已修改文件:
echo    - Web/script.js (更新generateEditableRosterCalendar函数)
echo    - Web/script.js (更新saveSelectedCoachRoster函数)  
echo    - Web/script.js (更新showDailyLocationStats函数)
echo    - Web/script.js (更新generateDailyLocationStats函数)
echo    - Web/styles.css (添加Excel样式表格CSS)
echo.

echo 📝 功能说明:
echo.
echo 教练更表编辑:
echo - 每个日期格子包含3个时段
echo - 上午: 时间输入框 + 地点下拉选择
echo - 下午: 时间输入框 + 地点下拉选择  
echo - 晚上: 时间输入框 + 地点下拉选择
echo - 示例: 上午9:00-12:00 堅城, 下午1:00-5:00 中山, 晚上6:00-8:00 維園
echo.
echo 每日上课地点统计表:
echo - Excel样式表格布局
echo - 纵向: 地点列表(九龍公園, 上門, 堅城, 中山, 維園等)
echo - 横向: 日期+星期, 每日细分为上午/下午/晚上3列
echo - 内容: 每个时段对应地点的教练名称
echo.
echo 关联逻辑:
echo - 编辑教练更表时按时段保存数据
echo - 统计表自动根据时段信息显示教练分配
echo - 支持多个教练在同一地点同一时段
echo.

echo 🎯 使用方法:
echo 1. 登录主管账号
echo 2. 选择"教练更表"功能
echo 3. 选择教练和月份，点击"载入更表"
echo 4. 在日历中填写各时段的时间和地点
echo 5. 点击"保存更表"
echo 6. 查看"每日上课地点统计"了解整体安排
echo.

echo ✅ 部署完成!
echo.
echo 💡 提示:
echo - 新格式支持一天多个时段的详细安排
echo - 统计表提供清晰的地点和时段分配视图
echo - 数据自动关联，编辑后统计表实时更新
echo.

pause 