@echo off
echo ========================================
echo 🔒 修复教练更表权限问题并部署
echo ========================================
echo.

echo 🐛 发现的权限问题:
echo 教练账号登录后点击"载入更表"显示可编辑版本
echo 违反了教练只能查看不能编辑的权限要求
echo.

echo 🔧 权限修复方案:
echo 1. 修改 loadRosterData() 函数权限控制
echo 2. 教练版本调用 generateReadonlyRosterCalendar()
echo 3. 主管版本调用 generateEditableRosterCalendar()
echo 4. 更新界面标题区分不同用户类型
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add Web/script.js
git add Web/index.html
git add test-coach-readonly-fix.js
git add deploy-coach-readonly-fix.bat

echo.
echo 💾 提交权限修复...
git commit -m "修复教练更表权限问题: 确保教练只能查看不能编辑

问题分析:
- loadRosterData() 函数无论用户类型都调用可编辑版本
- 教练登录后可以看到时间输入框和地点下拉选择
- 违反了教练只读权限的设计要求

修复方案:
1. 修改 loadRosterData() 函数添加用户类型判断
2. 教练版本: 调用 generateReadonlyRosterCalendar()
3. 主管版本: 调用 generateEditableRosterCalendar()
4. 更新界面标题: 教练显示'我的更表（只读）'
5. 更新界面标题: 主管显示'教练更表管理'
6. 更新脚本版本号 v30 -> v31

权限控制:
- 教练: 只读日历，隐藏保存按钮，隐藏教练选择
- 主管: 可编辑日历，显示保存按钮，显示教练选择

测试验证:
- 教练账号应该看到只读版本的更表
- 主管账号应该看到可编辑版本的更表"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo 等待前端更新...
echo.

echo 🧪 权限修复验证清单:
echo.
echo 教练账号测试:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 访问 Web 应用并强制刷新 (Ctrl+F5)
echo 3. 使用教练账号登录
echo 4. 点击"教练更表"功能
echo 5. 验证标题显示"我的更表（只读）"
echo 6. 点击"载入更表"按钮
echo 7. 验证显示只读版本:
echo    - ❌ 没有时间输入框
echo    - ❌ 没有地点下拉选择
echo    - ❌ 没有"保存更表"按钮
echo    - ✅ 只显示文本形式的时间和地点
echo.
echo 主管账号测试:
echo 1. 使用主管账号登录
echo 2. 点击"教练更表"功能
echo 3. 验证标题显示"教练更表管理"
echo 4. 选择教练并点击"载入更表"
echo 5. 验证显示可编辑版本:
echo    - ✅ 有时间输入框
echo    - ✅ 有地点下拉选择
echo    - ✅ 有"保存更表"按钮
echo    - ✅ 可以编辑和保存
echo.

echo 📊 预期结果:
echo ✅ 教练版本: 完全只读，无法编辑
echo ✅ 主管版本: 完全可编辑，可以保存
echo ✅ 界面标题正确区分用户类型
echo ✅ 权限控制符合业务要求
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 教练权限修复部署完成!
echo 请按照验证清单测试不同账号的权限
echo.

pause 