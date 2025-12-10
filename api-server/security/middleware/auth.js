/**
 * 身份认证中间件
 * 使用 JWT Token 进行身份验证和权限控制
 */

const { verifyToken, extractTokenFromHeader } = require('../utils/session-utils');

// JWT 认证中间件
function authenticateJWT(req, res, next) {
    // 尝试从 Authorization 头提取 Token
    let token = extractTokenFromHeader(req);
    
    // 如果没有，尝试从查询参数获取（不推荐，但为了向后兼容）
    if (!token) {
        token = req.query.token;
    }
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '需要认证令牌，请在请求头中添加: Authorization: Bearer <token>'
        });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({
            success: false,
            message: '无效或过期的认证令牌'
        });
    }
    
    // 将用户信息附加到请求对象
    req.user = decoded;
    next();
}

// 角色检查中间件
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: '需要认证'
            });
        }
        
        const userRole = req.user.type;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `权限不足，需要以下角色之一: ${allowedRoles.join(', ')}`
            });
        }
        
        next();
    };
}

// 可选认证（如果有 Token 则验证，没有也不阻止）
function optionalAuth(req, res, next) {
    const token = extractTokenFromHeader(req) || req.query.token;
    
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }
    
    next();
}

module.exports = {
    authenticateJWT,
    requireRole,
    optionalAuth
};

