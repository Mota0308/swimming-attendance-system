/**
 * 安全查询构建器
 * 防止 NoSQL 注入攻击
 */

const { ObjectId } = require('mongodb');
const validator = require('validator');

// 清理电话号码
function sanitizePhone(phone) {
    if (typeof phone !== 'string') {
        throw new Error('电话号碼必須是字符串');
    }
    
    const cleaned = phone.trim();
    if (!/^\d{8}$/.test(cleaned)) {
        throw new Error('电话号碼格式無效，必須是8位數字');
    }
    
    return cleaned;
}

// 清理日期
function sanitizeDate(dateStr) {
    if (!dateStr) {
        return null;
    }
    
    if (typeof dateStr !== 'string') {
        throw new Error('日期必須是字符串');
    }
    
    // 验证 YYYY-MM-DD 格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
        throw new Error('日期格式無效，必須是 YYYY-MM-DD');
    }
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        throw new Error('無效的日期');
    }
    
    return dateStr.trim();
}

// 清理月份
function sanitizeMonth(monthStr) {
    if (!monthStr) {
        return null;
    }
    
    // 支持 "10" 或 "2025-10" 格式
    if (monthStr.includes('-')) {
        const [year, month] = monthStr.split('-');
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            throw new Error('無效的年份');
        }
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            throw new Error('無效的月份');
        }
        
        return { year: yearNum, month: monthNum };
    } else {
        const monthNum = parseInt(monthStr);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            throw new Error('無效的月份');
        }
        return { year: new Date().getFullYear(), month: monthNum };
    }
}

// 清理 ObjectId
function sanitizeObjectId(id) {
    if (!id) {
        return null;
    }
    
    if (typeof id !== 'string') {
        throw new Error('ID 必須是字符串');
    }
    
    if (!ObjectId.isValid(id)) {
        throw new Error('無效的 ID 格式');
    }
    
    return new ObjectId(id);
}

// 构建安全的查询对象
function buildSafeQuery(fields) {
    const query = {};
    
    if (fields.phone) {
        query.phone = sanitizePhone(fields.phone);
    }
    
    if (fields.studentId) {
        // 清理学生ID
        if (typeof fields.studentId !== 'string') {
            throw new Error('學生ID必須是字符串');
        }
        query.studentId = fields.studentId.trim();
    }
    
    if (fields.type) {
        const allowedTypes = ['coach', 'supervisor', 'admin', 'manager', 'student'];
        if (!allowedTypes.includes(fields.type)) {
            throw new Error(`無效的用戶類型: ${fields.type}`);
        }
        query.type = fields.type;
    }
    
    if (fields._id) {
        query._id = sanitizeObjectId(fields._id);
    }
    
    return query;
}

// 防止操作符注入
function sanitizeQuery(query) {
    if (!query || typeof query !== 'object') {
        return {};
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
        // 禁止 MongoDB 操作符作为键
        if (key.startsWith('$')) {
            throw new Error('不允許使用操作符');
        }
        
        // 递归清理嵌套对象
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof ObjectId)) {
            // 检查嵌套对象中是否有操作符
            for (const nestedKey in value) {
                if (nestedKey.startsWith('$')) {
                    throw new Error('不允許使用操作符');
                }
            }
            sanitized[key] = sanitizeQuery(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'object' && item !== null ? sanitizeQuery(item) : item
            );
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

module.exports = {
    sanitizePhone,
    sanitizeDate,
    sanitizeMonth,
    sanitizeObjectId,
    buildSafeQuery,
    sanitizeQuery
};

