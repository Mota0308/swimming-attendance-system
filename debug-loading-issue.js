console.log('🔍 调试载入问题');
console.log('=====================================');

console.log('📋 可能的问题原因:');
console.log('1. generateReadonlyRosterCalendar 函数调用失败');
console.log('2. 数据获取失败');
console.log('3. 容器ID不匹配');
console.log('4. JavaScript错误导致执行中断');

console.log('\n🔧 调试步骤:');
console.log('1. 检查浏览器控制台是否有JavaScript错误');
console.log('2. 检查用户类型是否正确识别');
console.log('3. 检查数据是否正确获取');
console.log('4. 检查函数调用是否成功');

console.log('\n💡 浏览器控制台调试命令:');
console.log('// 检查用户类型');
console.log('console.log("用户类型:", localStorage.getItem("current_user_type"));');

console.log('\n// 检查容器是否存在');
console.log('console.log("容器存在:", !!document.getElementById("rosterCalendar"));');

console.log('\n// 检查函数是否存在');
console.log('console.log("只读函数存在:", typeof generateReadonlyRosterCalendar);');
console.log('console.log("可编辑函数存在:", typeof generateEditableRosterCalendar);');

console.log('\n// 手动测试函数调用');
console.log('try {');
console.log('  const userType = localStorage.getItem("current_user_type");');
console.log('  console.log("准备调用函数，用户类型:", userType);');
console.log('  if (userType === "supervisor") {');
console.log('    console.log("应该调用可编辑版本");');
console.log('  } else {');
console.log('    console.log("应该调用只读版本");');
console.log('  }');
console.log('} catch (e) {');
console.log('  console.error("调试错误:", e);');
console.log('}');

console.log('\n🎯 常见问题和解决方案:');
console.log('问题1: JavaScript错误');
console.log('- 解决: 检查控制台错误信息，修复语法错误');

console.log('\n问题2: 函数未定义');
console.log('- 解决: 确认脚本版本号是否更新，强制刷新浏览器');

console.log('\n问题3: 容器ID不匹配');
console.log('- 解决: 检查HTML容器ID是否正确');

console.log('\n问题4: 数据获取失败');
console.log('- 解决: 检查网络请求是否成功，API是否正常');

console.log('\n🔍 快速诊断清单:');
console.log('1. ✅ 强制刷新浏览器 (Ctrl+F5)');
console.log('2. ✅ 打开开发者工具 (F12)');
console.log('3. ✅ 查看控制台错误信息');
console.log('4. ✅ 运行上述调试命令');
console.log('5. ✅ 检查网络请求是否成功');

console.log('\n📊 预期行为:');
console.log('教练账号:');
console.log('- 用户类型应该是 "coach"');
console.log('- 应该调用 generateReadonlyRosterCalendar()');
console.log('- 应该显示只读格式的日历');

console.log('\n主管账号:');
console.log('- 用户类型应该是 "supervisor"');
console.log('- 应该调用 generateEditableRosterCalendar()');
console.log('- 应该显示可编辑格式的日历');

console.log('\n✅ 调试脚本准备完成');
console.log('请在浏览器控制台运行上述命令进行诊断'); 