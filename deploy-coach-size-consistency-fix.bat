@echo off
echo ========================================
echo 🎯 教练版本尺寸一致性修复部署
echo ========================================
echo.

echo 🐛 发现的问题:
echo 1. 主管版本格子高度正确 (160px)
echo 2. 教练版本格子高度可能不一致
echo 3. adjustCalendarSizing函数覆盖了CSS设置
echo 4. 需要确保两个版本尺寸完全一致
echo.

echo 🔍 根本原因:
echo 1. adjustCalendarSizing函数冲突:
echo    - 动态计算: height = Math.max(60, 宽度)
echo    - 覆盖设置: 忽略min-height: 160px
echo    - 只影响教练版本: generateReadonlyRosterCalendar调用
echo 2. 主管版本可能没有调用此函数
echo 3. 导致两个版本高度不一致
echo.

echo 🔧 修复方案:
echo 1. 修改adjustCalendarSizing函数:
echo    - 检测更表日历容器
echo    - 更表日历使用固定160px高度
echo    - 其他日历保持原有逻辑
echo 2. 更新脚本版本号: v=38 -> v=39
echo 3. 确保主管和教练版本完全一致
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add Web/script.js
git add Web/index.html
git add deploy-coach-size-consistency-fix.bat

echo.
echo 💾 提交教练版本尺寸修复...
git commit -m "🎯修复教练版本尺寸一致性：解决adjustCalendarSizing冲突

问题发现:
- 主管版本格子高度正确显示160px
- 教练版本可能因adjustCalendarSizing函数覆盖高度设置
- 需要确保两个版本尺寸完全一致

根本原因:
- adjustCalendarSizing函数动态计算高度
- 使用 height = Math.max(60, cellWidth) 覆盖CSS设置
- generateReadonlyRosterCalendar调用此函数
- 导致教练版本高度可能不是160px

修复方案:
1. 智能检测更表日历容器:
   - 检查containerEl.id === 'rosterCalendar'
   - 或检查是否包含rosterCalendar元素

2. 分别处理不同类型日历:
   - 更表日历: 固定使用160px高度
   - 其他日历: 保持原有宽度=高度逻辑

3. 确保版本一致性:
   - 主管版本: min-height: 160px (CSS + JS)
   - 教练版本: height: 160px (adjustCalendarSizing)
   - 结果: 两个版本都是160px

4. 更新脚本版本号 v=38 -> v=39

修复代码:
```javascript
function adjustCalendarSizing(containerEl) {
    // 检查是否为更表日历容器
    const isRosterCalendar = containerEl.id === 'rosterCalendar' || 
                            containerEl.querySelector('#rosterCalendar');
    
    if (isRosterCalendar) {
        // 更表日历使用固定高度160px
        cells.forEach(c => { c.style.height = '160px'; });
    } else {
        // 其他日历使用原有逻辑
        cells.forEach(c => { c.style.height = Math.max(60, cellWidth) + 'px'; });
    }
}
```

预期效果:
- 教练版本格子高度固定为160px
- 主管版本格子高度保持160px
- 两个版本尺寸完全一致
- 三个时段内容都能完整显示"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 最终部署中...
echo 等待尺寸一致性修复生效...
echo.

echo 🧪 教练版本尺寸验证清单:
echo.
echo 基础验证:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 强制刷新浏览器 (Ctrl+Shift+R)
echo 3. 确认加载 script.js?v=39
echo 4. 确认加载 styles.css?v=7
echo.
echo 教练版本测试:
echo 1. 使用教练账号登录
echo 2. 进入"教练更表"功能
echo 3. 点击"载入更表"按钮
echo 4. 验证格子尺寸:
echo    - ✅ 格子高度应该是160px
echo    - ✅ 与主管版本高度完全一致
echo    - ✅ 三个时段完整显示
echo    - ✅ 内容不被截断
echo.
echo 主管版本对比测试:
echo 1. 使用主管账号登录
echo 2. 进入"教练更表"功能
echo 3. 选择教练并载入更表
echo 4. 对比两个版本:
echo    - ✅ 格子高度应该相同
echo    - ✅ 布局结构应该相同
echo    - ✅ 只有编辑性不同 (主管可编辑，教练只读)
echo.
echo 技术验证:
echo 1. 右键检查任意格子元素
echo 2. 查看Computed样式
echo 3. 确认height值为160px
echo 4. 确认来源是adjustCalendarSizing函数
echo.

echo 🔧 如果仍有问题的调试步骤:
echo.
echo 函数调用验证:
echo 1. 在控制台查看是否有JavaScript错误
echo 2. 确认adjustCalendarSizing函数被正确调用
echo 3. 确认isRosterCalendar检测逻辑正确
echo.
echo 高度设置验证:
echo 1. 在Elements标签查看格子元素
echo 2. 确认style属性包含 height: 160px
echo 3. 确认没有其他样式覆盖
echo.
echo 版本一致性检查:
echo 1. 同时打开主管和教练版本
echo 2. 使用浏览器测量工具
echo 3. 对比格子的实际像素高度
echo 4. 确认完全相同
echo.

echo 📊 预期结果:
echo ✅ 教练版本格子高度160px
echo ✅ 主管版本格子高度160px
echo ✅ 两个版本尺寸完全一致
echo ✅ 三个时段内容完整显示
echo ✅ adjustCalendarSizing冲突解决
echo ✅ 用户体验完全统一
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 教练版本尺寸一致性修复部署完成!
echo 请按照验证清单确认两个版本尺寸一致
echo.

pause 