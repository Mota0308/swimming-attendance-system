/**
 * 密码工具函数
 * 使用 bcrypt 进行密码哈希和验证
 */

const bcrypt = require('bcrypt');

// 哈希密码
async function hashPassword(password) {
    if (!password || typeof password !== 'string') {
        throw new Error('密码必须是字符串');
    }
    
    const saltRounds = 10; // 成本因子，值越大越安全但越慢
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        console.error('❌ 密码哈希失败:', error);
        throw new Error('密码处理失败');
    }
}

// 验证密码
async function comparePassword(plainPassword, hashedPassword) {
    if (!plainPassword || typeof plainPassword !== 'string') {
        return false;
    }
    
    if (!hashedPassword || typeof hashedPassword !== 'string') {
        return false;
    }
    
    try {
        // 检查是否是旧格式的明文密码（向后兼容）
        if (!hashedPassword.startsWith('$2')) {
            // 旧格式，直接比较（不推荐，但为了向后兼容）
            return plainPassword === hashedPassword;
        }
        
        // 新格式，使用 bcrypt 验证
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        return isMatch;
    } catch (error) {
        console.error('❌ 密码验证失败:', error);
        return false;
    }
}

// 检查密码是否需要更新（从明文迁移到哈希）
function needsPasswordUpdate(hashedPassword) {
    if (!hashedPassword || typeof hashedPassword !== 'string') {
        return true;
    }
    
    // bcrypt 哈希值以 $2a$, $2b$, $2y$ 开头
    return !hashedPassword.startsWith('$2');
}

module.exports = {
    hashPassword,
    comparePassword,
    needsPasswordUpdate
};

