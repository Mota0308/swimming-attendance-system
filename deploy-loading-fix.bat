@echo off
echo ========================================
echo 🔧 修复载入不出内容问题并部署
echo ========================================
echo.

echo 🐛 发现的载入问题:
echo 用户反馈权限修复后"载入不出内容"
echo 经过分析发现是容器ID时序问题
echo.

echo 🔍 问题根本原因:
echo 1. generateReadonlyRosterCalendar() 查找 'rosterCalendar' 容器
echo 2. 但调用时容器ID可能已经被改回 'staffRosterCalendars'
echo 3. 导致函数找不到容器，无法渲染内容
echo 4. 缺少 await 关键字可能导致异步执行问题
echo.

echo 🔧 修复方案:
echo 1. 调整容器ID设置的时序
echo 2. 确保在调用日历生成函数时容器ID正确
echo 3. 添加 await 关键字确保异步执行顺序
echo 4. 更新脚本版本号 v32 -> v33
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add Web/script.js
git add Web/index.html
git add debug-loading-issue.js
git add deploy-loading-fix.bat

echo.
echo 💾 提交载入问题修复...
git commit -m "修复载入不出内容问题: 解决容器ID时序问题

问题分析:
- generateReadonlyRosterCalendar() 查找 'rosterCalendar' 容器
- 调用时容器ID可能已经被改回 'staffRosterCalendars'
- 导致函数找不到容器无法渲染内容
- 缺少 await 可能导致异步执行问题

修复方案:
1. 调整 renderCoachRoster() 中容器ID设置时序
2. 调整 renderAllCoachesRoster() 中容器ID设置时序
3. 确保在调用日历生成函数时容器ID为 'rosterCalendar'
4. 添加 await 关键字确保异步执行顺序
5. 更新脚本版本号 v32 -> v33

修复位置:
- renderCoachRoster() 第2292-2302行
- renderAllCoachesRoster() 第2206-2216行  
- loadRosterData() 第1955-1962行

测试验证:
- 教练和主管账号都应该能正常载入更表内容
- 教练看到只读版本，主管看到可编辑版本"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo 等待前端更新...
echo.

echo 🧪 载入问题验证清单:
echo.
echo 基础验证:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 访问 Web 应用并强制刷新 (Ctrl+F5)
echo 3. 打开浏览器开发者工具 (F12)
echo 4. 查看控制台是否有JavaScript错误
echo.
echo 教练账号测试:
echo 1. 使用教练账号登录
echo 2. 点击"教练更表"功能
echo 3. 点击"载入更表"按钮
echo 4. 验证是否显示内容:
echo    - ✅ 应该显示日历格子
echo    - ✅ 应该显示更表数据 (如果有)
echo    - ✅ 应该是只读格式 (纯文本)
echo    - ❌ 不应该有输入框和下拉选择
echo.
echo 主管账号测试:
echo 1. 使用主管账号登录
echo 2. 点击"教练更表"功能
echo 3. 选择教练并点击"载入更表"
echo 4. 验证是否显示内容:
echo    - ✅ 应该显示日历格子
echo    - ✅ 应该显示更表数据 (如果有)
echo    - ✅ 应该是可编辑格式 (输入框+下拉)
echo    - ✅ 应该可以编辑和保存
echo.

echo 🔍 如果仍有问题的调试步骤:
echo 1. 在浏览器控制台运行:
echo    console.log("用户类型:", localStorage.getItem('current_user_type'));
echo 2. 检查容器是否存在:
echo    console.log("容器存在:", !!document.getElementById('rosterCalendar'));
echo 3. 检查函数是否存在:
echo    console.log("只读函数:", typeof generateReadonlyRosterCalendar);
echo 4. 查看网络请求是否成功 (Network 标签页)
echo.

echo 📊 预期结果:
echo ✅ 教练和主管都能正常载入更表内容
echo ✅ 教练看到只读版本 (纯文本显示)
echo ✅ 主管看到可编辑版本 (输入框+下拉)
echo ✅ 不再出现"载入不出内容"的问题
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 载入问题修复部署完成!
echo 请按照验证清单测试载入功能是否恢复正常
echo.

pause 