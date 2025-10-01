@echo off
echo ========================================
echo 🚀 完整修复多时段显示问题并部署
echo ========================================
echo.

echo 🐛 发现的根本问题:
echo 1. 前端: dailyLocations 被覆盖 (已修复)
echo 2. 后端: 数据库保存时同一天多时段相互覆盖 (新发现)
echo 3. 缓存: 浏览器使用旧版本脚本 (已修复)
echo.

echo 🔧 完整修复方案:
echo 前端修复:
echo - 修改 dailyLocations 存储为数组格式
echo - 更新显示逻辑支持多时段
echo - 更新脚本版本号 v28 -> v30
echo.
echo 后端修复:
echo - 修改数据库 filter 条件，添加 time 字段
echo - 避免同一天不同时段的数据相互覆盖
echo - 确保每个时段独立保存
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加所有修复文件...
git add Web/script.js
git add Web/index.html
git add api-server/server.js
git add debug-multi-period-issue.js
git add deploy-complete-multi-period-fix.bat

echo.
echo 💾 提交完整修复...
git commit -m "完整修复多时段显示问题: 前端+后端双重修复

根本问题分析:
1. 前端 dailyLocations 被覆盖导致统计表只显示最后一个时段
2. 后端数据库保存时 filter 条件不包含 time，导致同一天多时段相互覆盖
3. 浏览器缓存导致使用旧版本脚本

完整修复方案:
前端修复:
- 修改 dailyLocations 从单值存储改为数组存储
- 更新显示逻辑支持新的数组格式
- 更新脚本版本号确保浏览器加载最新版本

后端修复:
- 修改 /coach-roster/batch API 的 filter 条件
- 添加 time 字段到 filter: {phone, name, date, time}
- 确保每个时段作为独立记录保存

测试验证:
- 同一教练同一天三个时段应该独立保存和显示
- 统计表应该正确显示所有时段的教练分配"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo 等待前端和后端同时更新...
echo.

echo 🧪 修复验证清单:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 访问 Web 应用并强制刷新 (Ctrl+F5)
echo 3. 登录主管账号
echo 4. 选择教练，编辑同一天的三个时段:
echo    - 上午: 9:00-12:00 + 堅城
echo    - 下午: 1:00-5:00 + 中山  
echo    - 晚上: 6:00-8:00 + 維園
echo 5. 点击"保存更表"
echo 6. 查看"每日上课地点统计表"
echo 7. 验证三个地点都显示该教练:
echo    - 堅城上午列: 教练名
echo    - 中山下午列: 教练名
echo    - 維園晚上列: 教练名
echo.

echo 📊 预期结果:
echo ✅ 前端正确处理多时段数据
echo ✅ 后端独立保存每个时段记录  
echo ✅ 统计表显示所有时段安排
echo ✅ 不再只显示最后一个时段
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 完整修复部署完成!
echo 请按照验证清单测试修复效果
echo.

pause 