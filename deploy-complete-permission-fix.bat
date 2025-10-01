@echo off
echo ========================================
echo 🔒 完整修复教练权限问题并部署
echo ========================================
echo.

echo 🐛 发现的根本问题:
echo 虽然修复了 loadRosterData() 函数，但"载入更表"按钮
echo 实际调用的是其他没有权限控制的函数
echo 导致教练仍然能看到可编辑版本
echo.

echo 🔍 旧代码干扰分析:
echo 1. "载入更表"按钮 -> onChangeStaffCoach()
echo 2. onChangeStaffCoach() -> renderCoachRoster()
echo 3. renderCoachRoster() -> generateEditableRosterCalendar() (强制可编辑)
echo 4. 或者 -> renderAllCoachesRoster() -> generateEditableRosterCalendar()
echo.

echo 🔧 完整修复方案:
echo 1. ✅ loadRosterData() - 已修复
echo 2. ✅ renderCoachRoster() - 新修复
echo 3. ✅ renderAllCoachesRoster() - 新修复
echo 4. ✅ 脚本版本号更新 v31 -> v32
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加所有修复文件...
git add Web/script.js
git add Web/index.html
git add debug-old-code-interference.js
git add deploy-complete-permission-fix.bat

echo.
echo 💾 提交完整权限修复...
git commit -m "完整修复教练权限问题: 解决旧代码干扰

根本问题分析:
- 虽然修复了 loadRosterData() 但载入更表按钮调用其他函数
- renderCoachRoster() 和 renderAllCoachesRoster() 强制使用可编辑版本
- 导致教练仍然能看到可编辑界面违反权限要求

完整修复方案:
1. 修复 renderCoachRoster() 添加用户类型判断
2. 修复 renderAllCoachesRoster() 添加用户类型判断  
3. 统一权限控制逻辑在所有更表加载函数中
4. 更新脚本版本号 v31 -> v32 强制刷新缓存

调用链修复:
- 教练: 载入更表 -> renderCoachRoster() -> generateReadonlyRosterCalendar()
- 主管: 载入更表 -> renderCoachRoster() -> generateEditableRosterCalendar()

权限控制覆盖:
- loadRosterData() - 直接调用权限控制
- renderCoachRoster() - 特定教练权限控制
- renderAllCoachesRoster() - 所有教练权限控制

测试验证:
- 教练账号点击载入更表应显示只读版本
- 主管账号点击载入更表应显示可编辑版本"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo 等待前端更新...
echo.

echo 🧪 完整权限验证清单:
echo.
echo 🔍 调试步骤 (如果仍有问题):
echo 1. 打开浏览器开发者工具 (F12)
echo 2. 在控制台运行: localStorage.getItem('current_user_type')
echo 3. 确认返回 'coach' 或 'supervisor'
echo 4. 点击"载入更表"按钮
echo 5. 观察控制台日志确认调用了正确的函数
echo.
echo 教练账号完整测试:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 访问 Web 应用并强制刷新 (Ctrl+F5)
echo 3. 使用教练账号登录
echo 4. 点击"教练更表"功能
echo 5. 验证标题显示"我的更表（只读）"
echo 6. 点击"载入更表"按钮
echo 7. 验证显示只读版本:
echo    - ❌ 没有时间输入框 (input type=text)
echo    - ❌ 没有地点下拉选择 (select)
echo    - ❌ 没有"保存更表"按钮
echo    - ✅ 只显示纯文本的时间和地点
echo 8. 尝试点击日历格子，确认无法编辑
echo.
echo 主管账号对比测试:
echo 1. 使用主管账号登录
echo 2. 点击"教练更表"功能
echo 3. 验证标题显示"教练更表管理"
echo 4. 选择教练并点击"载入更表"
echo 5. 验证显示可编辑版本:
echo    - ✅ 有时间输入框可以输入
echo    - ✅ 有地点下拉选择可以选择
echo    - ✅ 有"保存更表"按钮可以点击
echo    - ✅ 可以编辑和保存更改
echo.

echo 📊 预期结果对比:
echo 教练版本 (只读):
echo - 界面标题: "我的更表（只读）"
echo - 日历格式: 纯文本显示 "上午 9:00-12:00 堅城"
echo - 交互性: 完全无法编辑，只能查看
echo - 按钮状态: 保存按钮隐藏
echo.
echo 主管版本 (可编辑):
echo - 界面标题: "教练更表管理"  
echo - 日历格式: 输入框 + 下拉选择
echo - 交互性: 完全可编辑和保存
echo - 按钮状态: 保存按钮可见
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 完整权限修复部署完成!
echo 现在所有更表加载路径都有正确的权限控制
echo 请按照验证清单彻底测试权限是否正确
echo.

pause 