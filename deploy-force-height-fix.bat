@echo off
echo ========================================
echo 🚨 强制高度修复部署 - 使用!important
echo ========================================
echo.

echo 🐛 持续存在的问题:
echo 1. 格子高度仍然很矮，没有变化
echo 2. 三个时段内容仍被截断
echo 3. 可能有其他未知的CSS或JS覆盖
echo 4. 需要使用最高优先级的样式设置
echo.

echo 🔍 可能的原因:
echo 1. 浏览器缓存问题
echo 2. 其他CSS规则优先级更高
echo 3. JavaScript动态设置被其他代码覆盖
echo 4. 样式加载顺序问题
echo.

echo 🔧 强制修复方案:
echo 1. CSS添加!important强制优先级:
echo    - min-height: 160px !important
echo    - height: auto !important
echo 2. JavaScript使用setProperty强制设置:
echo    - setProperty('height', '160px', 'important')
echo    - setProperty('min-height', '160px', 'important')
echo 3. 更新所有版本号:
echo    - CSS: v=7 -> v=8
echo    - JS: v=39 -> v=40
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add Web/styles.css
git add Web/script.js
git add Web/index.html
git add deploy-force-height-fix.bat

echo.
echo 💾 提交强制高度修复...
git commit -m "🚨强制修复：使用!important确保格子高度160px

问题持续:
- 格子高度仍然很矮，没有变化
- 三个时段内容仍被截断
- 可能有未知的样式覆盖

强制修复方案:
1. CSS强制优先级:
   - .cal-cell { min-height: 160px !important; height: auto !important; }
   - 所有媒体查询都添加!important
   - 确保最高优先级

2. JavaScript强制设置:
   - c.style.setProperty('height', '160px', 'important')
   - c.style.setProperty('min-height', '160px', 'important')
   - 使用setProperty方法强制覆盖

3. 版本号全面更新:
   - CSS版本: v=7 -> v=8
   - JS版本: v=39 -> v=40
   - 强制浏览器重新加载所有资源

修复位置:
- styles.css 第54行: 基础样式添加!important
- styles.css 第397行: 大屏媒体查询添加!important  
- styles.css 第412行: 小屏媒体查询添加!important
- script.js 第1401-1404行: 使用setProperty强制设置

预期效果:
- 任何其他样式都无法覆盖160px高度
- 格子高度强制为160px
- 三个时段内容完整显示
- 解决所有可能的样式冲突"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 强制部署中...
echo 等待!important样式生效...
echo.

echo 🧪 强制高度修复验证清单:
echo.
echo 基础验证:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 完全清除浏览器缓存 (Ctrl+Shift+Delete)
echo 3. 强制刷新页面 (Ctrl+Shift+R)
echo 4. 确认加载 styles.css?v=8
echo 5. 确认加载 script.js?v=40
echo.
echo 样式优先级验证:
echo 1. 右键点击格子 -> 检查元素
echo 2. 查看Computed样式
echo 3. 确认min-height: 160px
echo 4. 确认height: 160px或auto
echo 5. 查看Styles面板确认!important生效
echo.
echo 视觉效果验证:
echo 1. 格子应该明显变高 (比之前高2倍)
echo 2. 三个时段标签完整显示:
echo    - ✅ 上午 (完整可见)
echo    - ✅ 下午 (完整可见)
echo    - ✅ 晚上 (完整可见)
echo 3. 时间和地点内容完整显示
echo 4. 不应该有任何内容被截断
echo.
echo 功能完整性验证:
echo 1. 教练版本测试:
echo    - 登录教练账号
echo    - 进入"教练更表"
echo    - 点击"载入更表"
echo    - 验证格子高度和内容显示
echo 2. 主管版本测试:
echo    - 登录主管账号
echo    - 进入"教练更表"
echo    - 选择教练并载入
echo    - 验证格子高度和编辑功能
echo.

echo 🔧 如果仍有问题的终极调试:
echo.
echo 浏览器完全重置:
echo 1. 关闭所有浏览器窗口
echo 2. 清除所有浏览器数据
echo 3. 重启浏览器
echo 4. 重新访问网站
echo.
echo 开发者工具深度检查:
echo 1. F12 -> Elements标签
echo 2. 找到.cal-cell元素
echo 3. 查看Styles面板所有规则
echo 4. 确认!important规则存在且生效
echo 5. 查看Computed标签最终计算值
echo.
echo 手动样式测试:
echo 1. 在控制台输入:
echo    document.querySelectorAll('.cal-cell').forEach(c => {
echo        c.style.setProperty('height', '200px', 'important');
echo    });
echo 2. 如果这样能生效，说明代码有问题
echo 3. 如果这样也不生效，说明有更深层的问题
echo.

echo 📊 预期结果:
echo ✅ !important样式强制生效
echo ✅ 格子高度固定为160px
echo ✅ 三个时段内容完整显示
echo ✅ 所有样式冲突彻底解决
echo ✅ 教练和主管版本都正常
echo ✅ 用户体验完全改善
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 强制高度修复部署完成!
echo 请按照验证清单确认修复效果
echo 如果仍有问题，请使用终极调试方法
echo.

pause 