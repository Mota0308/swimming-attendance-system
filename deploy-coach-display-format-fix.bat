@echo off
echo ========================================
echo 🎨 修复教练版本更表显示格式
echo ========================================
echo.

echo 📋 修复内容:
echo 1. 修改教练版本更表显示格式与主管版本完全一致
echo 2. 保持教练版本只读功能不变
echo 3. 删除旧的教练显示代码
echo.

echo 🔧 具体修改:
echo 1. 更新 generateReadonlyRosterCalendar() 函数
echo    - 使用与主管版本相同的三时段布局
echo    - 相同的字体大小 (11px)
echo    - 相同的格子高度 (min-height: 120px)
echo    - 只读样式：灰色背景 + 不可编辑
echo.
echo 2. 删除旧的 renderCoachRosterReadonly() 函数
echo    - 统一使用 renderCoachRoster() 函数
echo    - 根据用户类型自动选择显示模式
echo.
echo 3. 更新脚本版本号 v34 -> v35
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add Web/script.js
git add Web/index.html
git add deploy-coach-display-format-fix.bat

echo.
echo 💾 提交教练显示格式修复...
git commit -m "修复教练版本更表显示格式与主管版本保持一致

修复内容:
1. 更新 generateReadonlyRosterCalendar() 函数
   - 使用与主管版本相同的三时段布局 (上午/下午/晚上)
   - 相同的字体大小 (font-size: 11px)
   - 相同的格子高度 (min-height: 120px)
   - 相同的时段标签和布局结构
   - 只读样式: 灰色背景 (#f9fafb) + 不可编辑

2. 删除旧代码
   - 删除 renderCoachRosterReadonly() 函数
   - 更新所有调用点使用统一的 renderCoachRoster() 函数
   - 根据用户类型自动选择可编辑/只读模式

3. 显示效果对比
   - 修复前: 教练版本使用简单的文本显示，格式与主管版本不同
   - 修复后: 教练版本使用与主管版本完全相同的格式，只是内容只读

4. 更新脚本版本号 v34 -> v35

测试验证:
- 教练账号: 显示格式与主管版本一致，但内容只读
- 主管账号: 显示格式不变，内容可编辑
- 字体大小、布局、颜色完全统一"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo 等待前端更新...
echo.

echo 🧪 教练显示格式验证清单:
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
echo 4. 验证显示格式:
echo    - ✅ 格子高度应该与主管版本一致 (120px)
echo    - ✅ 应该有三个时段: 上午/下午/晚上
echo    - ✅ 每个时段有时间框和地点框
echo    - ✅ 字体大小应该是 11px
echo    - ✅ 时段标签颜色应该是灰色 (#666)
echo    - ✅ 内容框应该是只读样式 (灰色背景)
echo    - ❌ 不应该有输入框或下拉选择功能
echo.
echo 主管账号对比测试:
echo 1. 使用主管账号登录
echo 2. 点击"教练更表"功能
echo 3. 选择教练并点击"载入更表"
echo 4. 对比显示格式:
echo    - ✅ 格子高度应该相同
echo    - ✅ 三个时段布局应该相同
echo    - ✅ 字体大小应该相同
echo    - ✅ 时段标签样式应该相同
echo    - ✅ 主管版本应该可以编辑 (白色背景)
echo    - ✅ 教练版本应该只读 (灰色背景)
echo.

echo 🎨 样式对比检查:
echo 教练版本 (只读):
echo - 背景色: #f9fafb (浅灰色)
echo - 边框色: #e5e7eb (灰色)
echo - 文字色: #374151 (深灰色)
echo - 不可编辑
echo.
echo 主管版本 (可编辑):
echo - 背景色: 白色
echo - 边框色: #d1d5db (浅灰色)
echo - 文字色: 黑色
echo - 可编辑输入
echo.

echo 📊 预期结果:
echo ✅ 教练和主管版本显示格式完全一致
echo ✅ 教练版本保持只读功能
echo ✅ 字体大小、布局、结构统一
echo ✅ 只有编辑权限和背景色不同
echo ✅ 用户体验更加一致和专业
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 教练显示格式修复部署完成!
echo 请按照验证清单测试显示格式是否统一
echo.

pause 