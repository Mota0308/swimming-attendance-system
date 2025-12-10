/**
 * 速率限制中间件
 * 防止暴力破解和 DDoS 攻击
 */

const rateLimit = require('express-rate-limit');

// 登录速率限制（严格）
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 最多5次尝试
    message: {
        success: false,
        message: '登錄嘗試過多，請15分鐘後再試'
    },
    standardHeaders: true, // 返回 RateLimit-* 头
    legacyHeaders: false, // 禁用 X-RateLimit-* 头
    // 使用IP地址作为键
    keyGenerator: (req) => {
        // 优先使用 X-Forwarded-For（代理/负载均衡器）
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        // 否则使用直接连接的IP
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    // 跳过成功请求（只计算失败次数）
    skipSuccessfulRequests: true,
    // 跳过失败请求（只计算成功次数）- 不启用
    skipFailedRequests: false
});

// API 通用速率限制（中等）
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 100, // 最多100个请求
    message: {
        success: false,
        message: '請求過於頻繁，請稍後再試'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // 如果有用户信息，使用用户ID；否则使用IP
        if (req.user && req.user.id) {
            return `user:${req.user.id}`;
        }
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        return req.ip || req.connection.remoteAddress || 'unknown';
    }
});

// 严格速率限制（用于敏感操作）
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 10, // 最多10次
    message: {
        success: false,
        message: '操作過於頻繁，請1小時後再試'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (req.user && req.user.id) {
            return `user:${req.user.id}`;
        }
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        return req.ip || req.connection.remoteAddress || 'unknown';
    }
});

// 创建自定义速率限制器
function createRateLimiter(options) {
    return rateLimit({
        windowMs: options.windowMs || 60 * 1000,
        max: options.max || 100,
        message: options.message || { success: false, message: '請求過於頻繁' },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: options.keyGenerator || ((req) => {
            const forwarded = req.headers['x-forwarded-for'];
            if (forwarded) {
                return forwarded.split(',')[0].trim();
            }
            return req.ip || req.connection.remoteAddress || 'unknown';
        }),
        ...options
    });
}

module.exports = {
    loginLimiter,
    apiLimiter,
    strictLimiter,
    createRateLimiter
};

