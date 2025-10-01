@echo off
echo ========================================
echo 🚨 紧急API路径修复部署
echo ========================================
echo.

echo 🐛 发现的问题:
echo 1. 后台大量API失败 (404错误)
echo 2. 统计表不见了
echo 3. 前端调用 /api/work-hours 但后端是 /coach-work-hours
echo 4. 前端调用 /api/coach-roster 但后端是 /coach-roster
echo.

echo 🔍 根本原因:
echo 1. API路径不匹配:
echo    - 前端: /api/work-hours
echo    - 后端: /coach-work-hours
echo 2. API路径不匹配:
echo    - 前端: /api/coach-roster
echo    - 后端: /coach-roster
echo 3. 导致所有数据获取失败
echo 4. 统计表无法显示
echo.

echo 🔧 修复方案:
echo 1. 添加API路由别名映射
echo 2. /api/work-hours -> /coach-work-hours
echo 3. /api/coach-roster -> /coach-roster
echo 4. /api/coach-roster/batch -> /coach-roster/batch
echo 5. 保持完整的API逻辑
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add api-server/server.js
git add deploy-api-fix-emergency.bat

echo.
echo 💾 提交API修复...
git commit -m "🚨紧急修复：添加API路径别名解决404错误

问题发现:
- 后台大量API失败 (404错误)
- 统计表不见了
- 前端和后端API路径不匹配

根本原因:
- 前端调用: /api/work-hours
- 后端实际: /coach-work-hours
- 前端调用: /api/coach-roster  
- 后端实际: /coach-roster

修复方案:
1. 添加API路由别名映射:
   - /api/work-hours -> /coach-work-hours
   - /api/coach-roster -> /coach-roster
   - /api/coach-roster/batch -> /coach-roster/batch

2. 完整复制API逻辑:
   - 保持所有参数处理
   - 保持所有查询逻辑
   - 保持所有错误处理
   - 添加[API别名]日志标识

3. 解决的问题:
   - 修复404 API错误
   - 恢复统计表显示
   - 恢复更表功能
   - 恢复工时数据获取

预期效果:
- 所有API调用成功
- 统计表正常显示
- 格子高度160px生效
- 用户体验完全恢复"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 紧急部署中...
echo 等待API修复生效...
echo.

echo 🧪 API修复验证清单:
echo.
echo 基础验证:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 强制刷新浏览器 (Ctrl+Shift+R)
echo 3. 打开开发者工具 (F12)
echo 4. 查看控制台是否还有404错误
echo.
echo API调用验证:
echo 1. 查看Network标签中的API请求
echo 2. /api/work-hours 应该返回200状态
echo 3. /api/coach-roster 应该返回200状态
echo 4. 不应该再有404错误
echo.
echo 功能验证:
echo 1. 登录教练或主管账号
echo 2. 进入"教练更表"功能
echo 3. 点击"载入更表"按钮
echo 4. 验证统计表是否显示:
echo    - ✅ 应该看到"每日上课地点统计表"
echo    - ✅ 应该有地点和日期表格
echo    - ✅ 应该有教练名称数据
echo    - ✅ 格子高度应该是160px
echo.
echo 格子高度验证:
echo 1. 右键点击任意日历格子
echo 2. 选择"检查元素"
echo 3. 查看CSS样式
echo 4. 确认 min-height: 160px
echo 5. 确认所有内容完整显示
echo.

echo 🔧 如果仍有问题的调试步骤:
echo.
echo API调试:
echo 1. 查看控制台Network标签
echo 2. 找到失败的API请求
echo 3. 查看请求URL和响应状态
echo 4. 确认是否还有路径不匹配
echo.
echo 后端日志检查:
echo 1. 访问 Railway 控制台
echo 2. 查看部署日志
echo 3. 搜索 "[API别名]" 标识
echo 4. 确认API别名路由生效
echo.
echo 数据库连接验证:
echo 1. 确认MongoDB Atlas连接正常
echo 2. 确认API密钥配置正确
echo 3. 确认数据库中有数据
echo.

echo 📊 预期结果:
echo ✅ 所有API调用返回200状态
echo ✅ 统计表正常显示
echo ✅ 格子高度160px生效
echo ✅ 所有内容完整可见
echo ✅ 404错误完全消失
echo ✅ 用户体验完全恢复
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 紧急API修复部署完成!
echo 请按照验证清单确认修复效果
echo.

pause 