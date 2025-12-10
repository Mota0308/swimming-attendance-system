/**
 * 错误处理中间件
 * 统一处理错误，避免泄露敏感信息
 */

// 自定义错误类
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// 错误处理中间件（必须在所有路由之后）
function errorHandler(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;
    
    // 记录错误（生产环境应该使用日志系统）
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    });
    
    // MongoDB 错误
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        const message = '數據庫操作失敗';
        error = new AppError(message, 500);
    }
    
    // MongoDB 重复键错误
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || '字段';
        const message = `${field} 已存在`;
        error = new AppError(message, 409);
    }
    
    // 验证错误
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors || {})
            .map(val => val.message || val)
            .join(', ');
        error = new AppError(message, 400);
    }
    
    // JWT 错误
    if (err.name === 'JsonWebTokenError') {
        const message = '無效的認證令牌';
        error = new AppError(message, 401);
    }
    
    if (err.name === 'TokenExpiredError') {
        const message = '認證令牌已過期';
        error = new AppError(message, 401);
    }
    
    // 类型错误
    if (err.name === 'TypeError' || err.name === 'ReferenceError') {
        const message = process.env.NODE_ENV === 'production' 
            ? '服務器內部錯誤' 
            : err.message;
        error = new AppError(message, 500);
    }
    
    // 默认错误
    const statusCode = error.statusCode || 500;
    const message = error.message || '服務器內部錯誤';
    
    // 生产环境不暴露详细错误
    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? (statusCode === 500 ? '服務器內部錯誤，請稍後重試' : message)
            : message,
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            error: {
                name: err.name,
                code: err.code
            }
        })
    });
}

// 404 错误处理
function notFoundHandler(req, res, next) {
    const error = new AppError(`找不到路徑: ${req.originalUrl}`, 404);
    next(error);
}

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler
};

