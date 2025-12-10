/**
 * 会话管理工具函数
 * 使用 JWT 进行无状态身份认证
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// 生成 JWT Token
function generateToken(user) {
    if (!user || !user._id) {
        throw new Error('用户信息不完整');
    }
    
    const payload = {
        id: user._id.toString(),
        phone: user.phone || user.studentPhone,
        type: user.type || user.userType,
        name: user.name || user.studentName,
        iat: Math.floor(Date.now() / 1000) // 签发时间
    };
    
    try {
        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
        return token;
    } catch (error) {
        console.error('❌ Token 生成失败:', error);
        throw new Error('Token 生成失败');
    }
}

// 验证 JWT Token
function verifyToken(token) {
    if (!token || typeof token !== 'string') {
        return null;
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.warn('⚠️ Token 已过期');
        } else if (error.name === 'JsonWebTokenError') {
            console.warn('⚠️ Token 无效');
        } else {
            console.error('❌ Token 验证失败:', error);
        }
        return null;
    }
}

// 从请求头提取 Token
function extractTokenFromHeader(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return null;
    }
    
    // 支持 "Bearer TOKEN" 格式
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
    }
    
    return null;
}

module.exports = {
    generateToken,
    verifyToken,
    extractTokenFromHeader
};

