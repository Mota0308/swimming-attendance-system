/**
 * 日志工具
 * 使用 Winston 进行日志记录和监控
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 创建日志目录
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志记录器
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'swimming-api' },
    transports: [
        // 错误日志
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        // 所有日志
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        // 安全事件日志
        new winston.transports.File({
            filename: path.join(logDir, 'security.log'),
            level: 'warn',
            maxsize: 5242880,
            maxFiles: 10,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

// 开发环境也输出到控制台
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// 安全事件日志
function logSecurityEvent(event, details, req) {
    logger.warn('Security Event', {
        event,
        details,
        ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
        userAgent: req?.get('user-agent') || 'unknown',
        url: req?.originalUrl || 'unknown',
        method: req?.method || 'unknown',
        timestamp: new Date().toISOString()
    });
}

// 错误日志
function logError(error, req) {
    logger.error('Error', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
        url: req?.originalUrl || 'unknown',
        method: req?.method || 'unknown',
        timestamp: new Date().toISOString()
    });
}

// 信息日志
function logInfo(message, data) {
    logger.info(message, {
        ...data,
        timestamp: new Date().toISOString()
    });
}

module.exports = {
    logger,
    logSecurityEvent,
    logError,
    logInfo
};

