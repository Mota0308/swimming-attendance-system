@echo off
echo ========================================
echo 🚀 部署多时段显示修复到 Railway
echo ========================================
echo.

echo 🐛 修复的问题:
echo 当同一教练在同一天的三个时段都进行编辑时，
echo 每日上课地点统计表只显示最后一个选项的问题
echo.

echo 🔧 修复内容:
echo 1. 修改 dailyLocations 存储方式从单值改为数组
echo 2. 避免同一天多个时段的地点被覆盖  
echo 3. 更新显示逻辑支持数组格式的地点数据
echo 4. 保持向后兼容性
echo.

echo 📋 修复前后对比:
echo 修复前: 张教练 10月1日 -> 只显示維園(最后一个)
echo 修复后: 张教练 10月1日 -> 堅城(上午) + 中山(下午) + 維園(晚上)
echo.

echo 📝 检查 Git 状态...
git status
echo.

echo 📦 添加修复的文件...
git add Web/script.js
git add test-multi-period-fix.js
git add deploy-multi-period-fix.bat

echo.
echo 💾 提交修复...
git commit -m "修复多时段显示问题: 同一教练同一天多时段统计表显示

问题描述:
- 当同一教练在同一天的三个时段都进行编辑时
- 每日上课地点统计表只显示最后一个时段的地点
- 前面时段的安排被覆盖

修复内容:
- 修改 dailyLocations 存储从单值改为数组格式
- 避免同一天多个时段地点被覆盖
- 更新显示逻辑支持新的数组格式
- 保持向后兼容性

测试场景:
- 张教练 10月1日: 上午堅城 + 下午中山 + 晚上維園
- 现在统计表会正确显示所有三个时段的安排"

echo.
echo 🌿 推送到 GitHub...
git push origin main

echo.
echo 🚂 Railway 自动部署中...
echo.

echo 🎯 修复验证步骤:
echo 1. 访问 Web 应用
echo 2. 登录主管账号  
echo 3. 选择"教练更表"功能
echo 4. 选择任一教练，编辑某一天的三个时段:
echo    - 上午: 填写时间 + 选择地点A
echo    - 下午: 填写时间 + 选择地点B  
echo    - 晚上: 填写时间 + 选择地点C
echo 5. 点击"保存更表"
echo 6. 查看"每日上课地点统计表"
echo 7. 验证三个地点都正确显示该教练
echo.

echo 📊 预期结果:
echo - 地点A的上午列显示该教练
echo - 地点B的下午列显示该教练
echo - 地点C的晚上列显示该教练
echo - 不再只显示最后一个地点
echo.

echo ✅ 部署完成!
echo 多时段显示问题已修复并部署到 Railway
echo.

pause 