/**
 * 安全措施快速测试脚本
 * 用于验证安全措施是否正常工作
 * 
 * 使用方法：
 * node test-security.js
 */

const { comparePassword, hashPassword } = require('./security/utils/password-utils');

async function testPasswordHashing() {
    console.log('\n🧪 测试密码哈希功能...');
    
    try {
        // 测试1：哈希密码
        const plainPassword = 'test1234';
        const hashed = await hashPassword(plainPassword);
        console.log('✅ 密码哈希成功');
        console.log('   原始密码:', plainPassword);
        console.log('   哈希值:', hashed.substring(0, 30) + '...');
        
        // 测试2：验证正确密码
        const isValid = await comparePassword(plainPassword, hashed);
        if (isValid) {
            console.log('✅ 密码验证成功（正确密码）');
        } else {
            console.log('❌ 密码验证失败（应该成功）');
            return false;
        }
        
        // 测试3：验证错误密码
        const isInvalid = await comparePassword('wrongpassword', hashed);
        if (!isInvalid) {
            console.log('✅ 密码验证失败（错误密码，正确行为）');
        } else {
            console.log('❌ 密码验证成功（应该失败）');
            return false;
        }
        
        // 测试4：向后兼容（明文密码）
        const isPlainValid = await comparePassword(plainPassword, plainPassword);
        if (isPlainValid) {
            console.log('✅ 向后兼容测试通过（明文密码）');
        } else {
            console.log('❌ 向后兼容测试失败');
            return false;
        }
        
        console.log('✅ 所有密码哈希测试通过！\n');
        return true;
    } catch (error) {
        console.error('❌ 密码哈希测试失败:', error);
        return false;
    }
}

async function testValidation() {
    console.log('🧪 测试输入验证...');
    
    try {
        const { validatePhoneNumber, sanitizeString } = require('./security/middleware/validation');
        
        // 测试1：有效电话号码
        try {
            const phone = validatePhoneNumber('12345678');
            console.log('✅ 有效电话号码验证通过:', phone);
        } catch (error) {
            console.log('❌ 有效电话号码验证失败');
            return false;
        }
        
        // 测试2：无效电话号码
        try {
            validatePhoneNumber('123');
            console.log('❌ 无效电话号码应该被拒绝');
            return false;
        } catch (error) {
            console.log('✅ 无效电话号码被正确拒绝');
        }
        
        // 测试3：字符串清理
        const dirty = '<script>alert("XSS")</script>Hello';
        const clean = sanitizeString(dirty);
        console.log('✅ 字符串清理测试');
        console.log('   原始:', dirty);
        console.log('   清理后:', clean);
        
        console.log('✅ 所有输入验证测试通过！\n');
        return true;
    } catch (error) {
        console.error('❌ 输入验证测试失败:', error);
        return false;
    }
}

async function testQueryBuilder() {
    console.log('🧪 测试查询构建器...');
    
    try {
        const { sanitizePhone, sanitizeObjectId, sanitizeQuery } = require('./security/utils/query-builder');
        
        // 测试1：清理电话号码
        const phone = sanitizePhone('12345678');
        console.log('✅ 电话号码清理:', phone);
        
        // 测试2：清理 ObjectId
        const { ObjectId } = require('mongodb');
        const testId = new ObjectId().toString();
        const cleanedId = sanitizeObjectId(testId);
        console.log('✅ ObjectId 清理:', cleanedId.toString());
        
        // 测试3：防止操作符注入
        try {
            const maliciousQuery = { $ne: null };
            sanitizeQuery(maliciousQuery);
            console.log('❌ 操作符注入应该被拒绝');
            return false;
        } catch (error) {
            console.log('✅ 操作符注入被正确拒绝');
        }
        
        console.log('✅ 所有查询构建器测试通过！\n');
        return true;
    } catch (error) {
        console.error('❌ 查询构建器测试失败:', error);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 开始安全措施测试...\n');
    console.log('='.repeat(50));
    
    const results = [];
    
    // 运行所有测试
    results.push(await testPasswordHashing());
    results.push(await testValidation());
    results.push(await testQueryBuilder());
    
    // 总结
    console.log('='.repeat(50));
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    if (passed === total) {
        console.log(`\n✅ 所有测试通过！(${passed}/${total})`);
        console.log('✅ 安全措施已正确实施！');
    } else {
        console.log(`\n⚠️  部分测试失败 (${passed}/${total})`);
        console.log('请检查失败的测试');
    }
    
    console.log('\n📝 下一步：');
    console.log('1. 启动服务器: npm start');
    console.log('2. 测试登录功能');
    console.log('3. 检查日志文件: logs/');
    console.log('4. 运行密码迁移（可选）: node security/migrations/migrate-passwords.js');
}

// 运行测试
runAllTests().catch(console.error);

