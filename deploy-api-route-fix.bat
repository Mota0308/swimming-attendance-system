@echo off
echo ========================================
echo 🔧 API路由修复部署
echo ========================================
echo.

echo 🐛 发现的API问题:
echo 1. 前端调用 /api/coach-work-hours
echo 2. 后端只有 /api/work-hours 别名
echo 3. 导致400错误：路由不匹配
echo 4. 旧的重复路由定义冲突
echo.

echo 🔍 错误分析:
echo 从控制台错误信息:
echo - Failed to load resource: /api/coach-work-hour...year=2025^&month=8:1
echo - 直接查询工时API失败: 400
echo - 直接查询更表API失败: 400
echo.

echo 🔧 修复方案:
echo 1. 删除旧的重复 /api/work-hours 路由 (第308行)
echo 2. 添加 /api/coach-work-hours 别名路由
echo 3. 确保前后端路径完全匹配
echo 4. 保持所有现有功能不变
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add api-server/server.js
git add deploy-api-route-fix.bat

echo.
echo 💾 提交API路由修复...
git commit -m "🔧修复API路由不匹配问题：添加/api/coach-work-hours别名

问题诊断:
- 前端调用: /api/coach-work-hours
- 后端只有: /api/work-hours 别名
- 结果: 400错误，路由不匹配

根本原因:
1. 重复路由定义冲突:
   - 第308行: 旧的简单版本 /api/work-hours
   - 第1912行: 新的完整版本 /api/work-hours
   - Express.js使用第一个匹配的路由

2. 前后端路径不匹配:
   - 前端: database-connector.js 调用 /api/coach-work-hours
   - 后端: 只有 /api/work-hours 别名
   - 缺少: /api/coach-work-hours 别名

修复实施:
1. 删除旧路由 (第308-341行):
   - 删除简单版本的 /api/work-hours
   - 避免路由冲突
   - 确保使用完整版本

2. 添加新别名 (第1951行后):
   - app.get('/api/coach-work-hours', ...)
   - 与 /api/work-hours 相同逻辑
   - 支持所有相同参数和功能

3. 路由映射关系:
   - /api/work-hours -> /coach-work-hours (原有)
   - /api/coach-work-hours -> /coach-work-hours (新增)
   - /api/coach-roster -> /coach-roster (原有)
   - /api/coach-roster/batch -> /coach-roster/batch (原有)

修复代码:
```javascript
// 删除旧的重复路由
// app.get('/api/work-hours', async (req, res) => { ... }); // 已删除

// 添加新的别名路由
app.get('/api/coach-work-hours', validateApiKeys, async (req, res) => {
    // 与 /api/work-hours 相同的完整逻辑
    // 支持 phone, year, month, location, club, userType 参数
    // 返回 { success: true, records: [...] } 格式
});
```

预期效果:
- 前端 /api/coach-work-hours 调用成功
- 后端正确处理所有参数
- 400错误完全解决
- 工时和更表数据正常加载
- 格子高度修复同时生效"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway API修复部署中...
echo 等待路由修复生效...
echo.

echo 🧪 API修复验证清单:
echo.
echo 基础验证:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 强制刷新浏览器 (Ctrl+Shift+R)
echo 3. 打开开发者工具 -> Console 标签
echo 4. 检查是否还有400错误
echo.
echo API功能验证:
echo 1. 登录教练账号
echo 2. 进入"教练更表"功能
echo 3. 点击"载入更表"按钮
echo 4. 验证API调用:
echo    - ✅ /api/coach-work-hours 应该返回200
echo    - ✅ /api/coach-roster 应该返回200
echo    - ✅ 控制台无400错误
echo    - ✅ 数据正常加载
echo.
echo 数据显示验证:
echo 1. 更表日历应该正常显示
echo 2. 格子高度应该是160px (之前的修复)
echo 3. 三个时段内容完整显示
echo 4. 统计表应该正常生成
echo.
echo 主管版本验证:
echo 1. 登录主管账号
echo 2. 测试相同功能
echo 3. 确认API调用正常
echo 4. 确认数据加载正常
echo.

echo 🔧 如果仍有问题的调试:
echo.
echo API调用检查:
echo 1. Network标签查看实际请求URL
echo 2. 确认请求路径正确
echo 3. 查看响应状态码和内容
echo 4. 检查请求头和参数
echo.
echo 后端日志检查:
echo 1. Railway控制台 -> Logs
echo 2. 查看API调用日志
echo 3. 确认路由匹配成功
echo 4. 检查数据库查询结果
echo.
echo 手动API测试:
echo 1. 直接访问API端点
echo 2. 使用Postman或curl测试
echo 3. 验证参数和响应格式
echo 4. 确认路由别名工作正常
echo.

echo 📊 预期结果:
echo ✅ 所有400 API错误消失
echo ✅ /api/coach-work-hours 正常工作
echo ✅ /api/coach-roster 正常工作
echo ✅ 工时数据正常加载
echo ✅ 更表数据正常加载
echo ✅ 格子高度160px正常显示
echo ✅ 统计表功能正常
echo ✅ 前后端完全匹配
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ API路由修复部署完成!
echo 请按照验证清单确认API功能正常
echo.

pause 