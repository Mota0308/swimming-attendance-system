@echo off
echo ========================================
echo 📝 缩小更表字体大小修复
echo ========================================
echo.

echo 🐛 用户反馈问题:
echo "無法看得到格子内的所有内容，爲我縮小文字大小"
echo.

echo 🔍 问题分析:
echo 1. 当前字体大小为 11px，格子高度为 120px
echo 2. 三个时段内容 (上午/下午/晚上) 无法完全显示
echo 3. 需要缩小字体和元素高度让所有内容可见
echo.

echo 🔧 修复方案:
echo 1. 字体大小: 11px -> 9px
echo 2. 元素高度: 24px -> 20px  
echo 3. 同时修改主管版本和教练版本保持一致
echo 4. 更新脚本版本号 v35 -> v36
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add Web/script.js
git add Web/index.html
git add deploy-font-size-fix.bat

echo.
echo 💾 提交字体大小修复...
git commit -m "缩小更表字体大小让所有内容可见

用户反馈:
- 无法看到格子内的所有内容
- 三个时段内容显示不全

修复方案:
1. 字体大小调整: 11px -> 9px
   - 时段标签 (上午/下午/晚上)
   - 时间输入框/显示框
   - 地点选择框/显示框

2. 元素高度调整: 24px -> 20px
   - 输入框高度
   - 选择框高度
   - 只读显示框高度

3. 同时修改两个版本:
   - 主管版本 (generateEditableRosterCalendar)
   - 教练版本 (generateReadonlyRosterCalendar)

4. 保持格式一致性:
   - 相同的字体大小
   - 相同的元素高度
   - 相同的间距布局

5. 更新脚本版本号 v35 -> v36

修复位置:
- 主管版本: 第2407-2429行 (三个时段)
- 教练版本: 第3096-3112行 (三个时段)

预期效果:
- 所有三个时段内容都能在格子内完整显示
- 保持主管和教练版本格式一致
- 提升内容可读性和用户体验"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo 等待前端更新...
echo.

echo 🧪 字体大小修复验证清单:
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
echo 4. 验证内容显示:
echo    - ✅ 应该能看到完整的三个时段标签
echo    - ✅ 应该能看到完整的时间内容
echo    - ✅ 应该能看到完整的地点内容
echo    - ✅ 字体大小应该是 9px (更小更清晰)
echo    - ✅ 所有内容都在格子内完整显示
echo.
echo 主管账号测试:
echo 1. 使用主管账号登录
echo 2. 点击"教练更表"功能
echo 3. 选择教练并点击"载入更表"
echo 4. 验证内容显示:
echo    - ✅ 应该能看到完整的三个时段标签
echo    - ✅ 输入框和下拉选择应该更紧凑
echo    - ✅ 字体大小应该是 9px
echo    - ✅ 所有编辑元素都在格子内完整显示
echo    - ✅ 可以正常编辑和保存
echo.

echo 📏 尺寸对比检查:
echo 修复前:
echo - 字体大小: 11px
echo - 元素高度: 24px
echo - 问题: 内容显示不全
echo.
echo 修复后:
echo - 字体大小: 9px (缩小18%%)
echo - 元素高度: 20px (缩小17%%)
echo - 效果: 所有内容可见
echo.

echo 🎯 格式一致性检查:
echo 教练版本 (只读):
echo - 时段标签: 9px, 灰色 (#666)
echo - 内容框: 9px, 20px高, 灰色背景
echo.
echo 主管版本 (可编辑):
echo - 时段标签: 9px, 灰色 (#666)  
echo - 输入框: 9px, 20px高, 白色背景
echo - 选择框: 9px, 20px高, 白色背景
echo.

echo 📊 预期结果:
echo ✅ 所有格子内容完整可见
echo ✅ 三个时段都能正常显示
echo ✅ 教练和主管版本格式一致
echo ✅ 字体更小但仍然清晰可读
echo ✅ 用户体验显著改善
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 字体大小修复部署完成!
echo 请按照验证清单测试内容显示是否完整
echo.

pause 