@echo off
echo ========================================
echo 🚨 紧急缓存问题修复部署
echo ========================================
echo.

echo 🐛 发现的问题:
echo 1. 浏览器控制台显示仍在加载 script.js?v=28
echo 2. HTML中preload和script标签版本号不一致
echo 3. 格子高度修改没有生效 (仍显示旧版本)
echo.

echo 🔍 根本原因:
echo 1. HTML文件中有两个不同的版本号:
echo    - preload: script.js?v=28 (旧版本)
echo    - script: script.js?v=37 (新版本)
echo 2. 浏览器优先使用preload的旧版本
echo 3. 导致160px格子高度修改无效
echo.

echo 🔧 紧急修复:
echo 1. 统一所有版本号为 v=38
echo 2. 确保preload和script使用相同版本
echo 3. 强制浏览器加载新版本
echo 4. 立即部署到Railway
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add Web/index.html
git add deploy-cache-fix-emergency.bat

echo.
echo 💾 提交缓存修复...
git commit -m "🚨紧急修复：统一脚本版本号解决缓存问题

问题发现:
- 浏览器控制台显示仍在加载 script.js?v=28
- HTML中preload和script标签版本号不一致
- 格子高度160px修改没有生效

根本原因:
- preload: script.js?v=28 (旧版本)
- script: script.js?v=37 (新版本)
- 浏览器优先使用preload缓存

紧急修复:
1. 统一版本号: v=28 -> v=38
   - preload: script.js?v=38
   - script: script.js?v=38

2. 确保版本一致性:
   - 避免preload和script版本冲突
   - 强制浏览器重新加载脚本

3. 格子高度修改应该生效:
   - min-height: 160px (主管版本)
   - min-height: 160px (教练版本)

预期效果:
- 浏览器加载 script.js?v=38
- 格子高度从120px变为160px
- 所有三个时段内容完整显示
- 缓存问题彻底解决"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 紧急部署中...
echo 等待缓存修复生效...
echo.

echo 🧪 缓存修复验证清单:
echo.
echo 基础验证:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 打开浏览器开发者工具 (F12)
echo 3. 切换到 Network 标签页
echo 4. 强制刷新页面 (Ctrl+Shift+R 或 Ctrl+F5)
echo 5. 查看是否加载 script.js?v=38
echo.
echo 脚本版本验证:
echo 1. 在 Network 标签中查找 script.js 请求
echo 2. 确认URL为: script.js?v=38
echo 3. 确认状态码为: 200 (不是304缓存)
echo 4. 确认文件大小合理 (不是0字节)
echo.
echo 格子高度验证:
echo 1. 登录任意账号 (教练或主管)
echo 2. 进入"教练更表"功能
echo 3. 点击"载入更表"
echo 4. 右键点击任意日历格子
echo 5. 选择"检查元素" (Inspect)
echo 6. 查看CSS样式中的 min-height 值
echo 7. 应该显示: min-height: 160px
echo.
echo 内容显示验证:
echo 1. 查看格子是否明显变高
echo 2. 三个时段标签是否完整显示
echo 3. 时间和地点内容是否完整可见
echo 4. 是否没有内容被截断
echo.

echo 🔧 如果仍有问题的调试步骤:
echo.
echo 浏览器缓存清理:
echo 1. 按 F12 打开开发者工具
echo 2. 右键点击刷新按钮
echo 3. 选择"清空缓存并硬性重新加载"
echo 4. 或者按 Ctrl+Shift+Delete 清除浏览器数据
echo.
echo 版本号验证:
echo 1. 在控制台输入: document.querySelector('script[src*=\"script.js\"]').src
echo 2. 应该返回包含 v=38 的URL
echo 3. 如果不是，说明仍有缓存问题
echo.
echo Railway部署验证:
echo 1. 访问: https://railway.app/dashboard
echo 2. 查看最新部署状态
echo 3. 确认部署成功且没有错误
echo 4. 查看部署日志确认文件更新
echo.

echo 📊 预期结果:
echo ✅ 浏览器加载 script.js?v=38
echo ✅ 格子高度显示为 160px
echo ✅ 所有内容完整可见
echo ✅ 缓存问题彻底解决
echo ✅ 用户体验显著改善
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 紧急缓存修复部署完成!
echo 请按照验证清单确认修复效果
echo.

pause 