@echo off
echo ========================================
echo 🔄 新更表系统部署
echo ========================================
echo.

echo 🆕 新更表系统特性:
echo 1. 重命名"教練更表"为"更表"
echo 2. 教练登录验证：position=staff, type检查
echo 3. 全新UI界面：月份选择、保存、载入、提交按钮
echo 4. Part-time教练：点击列选择整个星期
echo 5. Full-time教练：默认全选，点击×取消
echo 6. 红色×按钮功能
echo 7. 提交到主管系统
echo 8. 新的数据库集合：Coach_roster_submissions
echo.

echo 🔧 实现的功能:
echo.
echo 前端功能:
echo • 工作类型指示器和操作说明
echo • 响应式日历界面
echo • Part-time: 列选择 + 单独取消
echo • Full-time: 全选 + 单独取消
echo • 本地保存和载入
echo • 提交到后端API
echo • 成功状态显示
echo.
echo 后端功能:
echo • 登录验证：position="staff"检查
echo • 工作类型验证：full-time/part-time
echo • POST /api/roster/submit - 提交更表
echo • GET /api/roster/submissions - 查看提交记录
echo • POST /api/roster/approve - 审批更表
echo • 新数据库集合存储
echo.
echo CSS样式:
echo • 现代化界面设计
echo • 工作类型指示器样式
echo • 日历网格和交互效果
echo • 响应式设计
echo • 动画和过渡效果
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加新更表系统文件...
git add Web/index.html
git add Web/styles.css
git add Web/script.js
git add api-server/server.js
git add deploy-new-roster-system.bat

echo.
echo 💾 提交新更表系统...
git commit -m "🆕实现全新更表系统：教练排班报更功能

新功能概述:
✅ 重命名"教練更表"为"更表"
✅ 增强教练登录验证(position=staff, type检查)
✅ 全新UI界面设计
✅ Part-time和Full-time教练不同操作逻辑
✅ 红色×按钮取消功能
✅ 提交到主管系统

前端实现:
1. 全新HTML结构:
   - 月份选择下拉菜单
   - 保存更表、载入更表、提交更表按钮
   - 工作类型指示器和操作说明
   - 现代化日历界面

2. JavaScript功能:
   - initNewRosterSystem() - 初始化系统
   - generateNewRosterCalendar() - 生成日历
   - selectWeekdayColumn() - Part-time列选择
   - toggleDaySelection() - 单日切换
   - toggleDayUnavailable() - 红色×按钮
   - saveRosterData() - 本地保存
   - loadRosterData() - 本地载入
   - submitRosterData() - 提交到后端

3. CSS样式:
   - .roster-controls - 控制面板
   - .work-type-indicator - 工作类型指示
   - .new-roster-calendar - 日历容器
   - .calendar-day - 日期格子
   - .remove-btn - 红色×按钮
   - 响应式设计和动画效果

后端实现:
1. 登录验证增强:
   - 检查position='staff'
   - 验证type='full-time'或'part-time'
   - 返回完整用户信息

2. 新API端点:
   - POST /api/roster/submit - 提交更表
   - GET /api/roster/submissions - 查看提交
   - POST /api/roster/approve - 审批更表

3. 数据库设计:
   - 新集合: Coach_roster_submissions
   - 字段: phone, name, month, year, workType, availableDays
   - 状态管理: submitted, approved, rejected

操作逻辑:
1. Part-time教练:
   - 点击星期标题选择整列日期
   - 选中日期变绿色(可上班)
   - 点击红色×取消单个日期
   - 提交选中的可上班日期

2. Full-time教练:
   - 所有日期默认绿色(可上班)
   - 点击红色×标记不上班(变红色)
   - 提交除了×标记外的所有日期

数据流程:
教练选择日期 → 本地保存 → 提交到后端 → 存储到数据库 → 主管查看和审批

版本更新:
- HTML: 全新更表界面结构
- CSS: v8 → v9 (新更表样式)
- JS: v40 → v41 (新更表逻辑)
- 后端: 新API端点和验证逻辑

预期效果:
- 教练可以根据工作类型进行排班报更
- 直观的日历界面和操作指导
- 数据安全提交到主管系统
- 完整的审批工作流程"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 新更表系统部署中...
echo 等待部署完成...
echo.

echo 🧪 新更表系统验证清单:
echo.
echo 基础验证:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 强制刷新浏览器 (Ctrl+Shift+R)
echo 3. 检查页面标题已改为"更表"
echo 4. 检查新的控制面板界面
echo.
echo 登录验证:
echo 1. 使用教练账号登录
echo 2. 验证position=staff检查
echo 3. 验证type=full-time/part-time检查
echo 4. 确认工作类型正确显示
echo.
echo Part-time教练测试:
echo 1. 登录part-time教练账号
echo 2. 看到黄色工作类型指示器
echo 3. 点击星期标题选择整列
echo 4. 验证日期变绿色(可上班)
echo 5. 点击红色×取消单个日期
echo 6. 测试保存和载入功能
echo 7. 测试提交功能
echo.
echo Full-time教练测试:
echo 1. 登录full-time教练账号
echo 2. 看到蓝色工作类型指示器
echo 3. 验证所有日期默认绿色
echo 4. 点击红色×标记不上班
echo 5. 验证日期变红色(不上班)
echo 6. 测试保存和载入功能
echo 7. 测试提交功能
echo.
echo API功能验证:
echo 1. 检查控制台无错误
echo 2. 验证POST /api/roster/submit正常
echo 3. 验证数据存储到数据库
echo 4. 测试重复提交更新功能
echo.
echo 主管系统验证:
echo 1. 登录主管账号
echo 2. 查看是否能看到教练提交的更表
echo 3. 测试审批功能(如果已实现)
echo.

echo 🔧 如果遇到问题的调试:
echo.
echo 前端问题:
echo 1. 检查浏览器控制台错误
echo 2. 验证JavaScript版本加载(v41)
echo 3. 检查CSS样式加载(v9)
echo 4. 确认localStorage数据
echo.
echo 后端问题:
echo 1. 检查Railway日志
echo 2. 验证API端点响应
echo 3. 检查数据库连接
echo 4. 确认数据存储格式
echo.
echo 登录问题:
echo 1. 检查用户数据中的position字段
echo 2. 验证type字段值
echo 3. 确认数据库用户记录
echo 4. 测试不同工作类型账号
echo.

echo 📊 预期结果:
echo ✅ 页面标题显示"更表"
echo ✅ 工作类型正确识别和显示
echo ✅ Part-time: 列选择功能正常
echo ✅ Full-time: 全选默认功能正常
echo ✅ 红色×按钮功能正常
echo ✅ 保存/载入功能正常
echo ✅ 提交功能正常
echo ✅ 后端API正常响应
echo ✅ 数据库正确存储
echo ✅ 主管可查看提交记录
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 新更表系统部署完成!
echo 请按照验证清单测试新功能
echo.

pause 