@echo off
echo ========================================
echo 🔧 修复教练载入更表数据逻辑错误
echo ========================================
echo.

echo 🐛 发现的根本问题:
echo 用户点击"载入更表"按钮后仍然没有内容
echo 经过深入分析发现是数据获取逻辑错误
echo.

echo 🔍 问题根本原因:
echo 1. 教练用户点击"载入更表" -> onChangeStaffCoach()
echo 2. onChangeStaffCoach() 对教练调用 renderAllCoachesRoster()
echo 3. renderAllCoachesRoster() 获取所有教练数据 fetchRoster(month, '')
echo 4. 教练应该只看自己的数据，不是所有人的数据
echo 5. 获取所有人数据可能返回空或者权限不足
echo.

echo 🔧 修复方案:
echo 1. 修改 onChangeStaffCoach() 函数逻辑
echo 2. 教练用户获取 current_user_phone 作为自己的手机号
echo 3. 调用 renderCoachRoster(currentUserPhone) 获取自己的数据
echo 4. 主管未选择教练时才调用 renderAllCoachesRoster()
echo 5. 更新脚本版本号 v33 -> v34
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复文件...
git add Web/script.js
git add Web/index.html
git add deploy-coach-data-fix.bat

echo.
echo 💾 提交教练数据获取修复...
git commit -m "修复教练载入更表数据逻辑错误

问题分析:
- 教练点击'载入更表'调用 onChangeStaffCoach()
- onChangeStaffCoach() 对教练用户调用 renderAllCoachesRoster()
- renderAllCoachesRoster() 获取所有教练数据 fetchRoster(month, '')
- 教练应该只看自己的数据，不是所有人的数据
- 获取所有人数据可能返回空或权限不足导致无内容

修复方案:
1. 修改 onChangeStaffCoach() 函数逻辑
2. 教练用户从 localStorage.getItem('current_user_phone') 获取自己手机号
3. 调用 renderCoachRoster(currentUserPhone) 获取自己的数据
4. 主管未选择教练时才调用 renderAllCoachesRoster()
5. 添加错误处理：未找到用户信息时提示重新登录

修复位置:
- onChangeStaffCoach() 函数 (第2242-2262行)

逻辑变更:
- 教练: 载入更表 -> 获取自己的数据 (renderCoachRoster(自己手机号))
- 主管: 载入更表 -> 获取选中教练数据 或 所有教练数据

测试验证:
- 教练账号应该能看到自己的更表数据
- 主管账号应该能看到选中教练或所有教练数据"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo 等待前端更新...
echo.

echo 🧪 教练数据获取验证清单:
echo.
echo 基础验证:
echo 1. 等待 Railway 部署完成 (约2-3分钟)
echo 2. 访问 Web 应用并强制刷新 (Ctrl+F5)
echo 3. 打开浏览器开发者工具 (F12)
echo 4. 查看控制台是否有JavaScript错误
echo.
echo 教练账号测试:
echo 1. 使用教练账号登录 (确保有手机号)
echo 2. 点击"教练更表"功能
echo 3. 点击"载入更表"按钮
echo 4. 验证数据获取:
echo    - ✅ 应该显示自己的更表数据
echo    - ✅ 应该是只读格式 (纯文本)
echo    - ✅ 如果没有数据应该显示空日历
echo    - ❌ 不应该显示其他教练的数据
echo    - ❌ 不应该有输入框和下拉选择
echo.
echo 主管账号测试:
echo 1. 使用主管账号登录
echo 2. 点击"教练更表"功能
echo 3. 测试两种情况:
echo    a) 选择特定教练 -> 点击"载入更表"
echo       - ✅ 应该显示该教练的数据
echo       - ✅ 应该是可编辑格式
echo    b) 不选择教练 -> 点击"载入更表"  
echo       - ✅ 应该显示所有教练的合并数据
echo       - ✅ 应该是可编辑格式
echo.

echo 🔍 调试方法:
echo 如果教练仍然看不到数据，在浏览器控制台运行:
echo.
echo 1. 检查用户信息:
echo    console.log("用户类型:", localStorage.getItem('current_user_type'));
echo    console.log("用户手机:", localStorage.getItem('current_user_phone'));
echo.
echo 2. 检查函数调用:
echo    // 在点击"载入更表"前运行
echo    console.log("准备点击载入更表按钮");
echo.
echo 3. 查看网络请求:
echo    // 在 Network 标签页查看是否有 fetchRoster API 调用
echo    // 检查请求参数和响应数据
echo.

echo 📊 预期结果:
echo ✅ 教练能正常载入自己的更表数据
echo ✅ 主管能正常载入选中教练或所有教练数据  
echo ✅ 权限控制正确 (教练只读，主管可编辑)
echo ✅ 不再出现"载入不出内容"的问题
echo.

echo 🔗 相关链接:
echo - Web应用: https://swimming-system-web-production.up.railway.app
echo - Railway控制台: https://railway.app/dashboard
echo.

echo ✅ 教练数据获取修复部署完成!
echo 请按照验证清单测试载入功能是否恢复正常
echo.

pause 