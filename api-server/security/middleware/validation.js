/**
 * 输入验证中间件
 * 使用 express-validator 进行输入验证和清理
 */

const { body, query, param, validationResult } = require('express-validator');
const validator = require('validator');

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '输入验证失败',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// 登录验证规则
const validateLogin = [
    body('phone')
        .trim()
        .notEmpty().withMessage('电话号碼不能為空')
        .isLength({ min: 8, max: 8 }).withMessage('电话号碼必須是8位數字')
        .matches(/^\d{8}$/).withMessage('电话号碼格式無效'),
    body('password')
        .trim()
        .notEmpty().withMessage('密碼不能為空')
        .isLength({ min: 4, max: 100 }).withMessage('密碼長度必須在4-100字符之間'),
    body('userType')
        .optional()
        .trim()
        .isIn(['coach', 'supervisor', 'admin', 'manager', 'student']).withMessage('無效的用戶類型'),
    handleValidationErrors
];

// 电话号码验证
const validatePhone = [
    param('phone')
        .trim()
        .notEmpty().withMessage('电话号碼不能為空')
        .matches(/^\d{8}$/).withMessage('电话号碼必須是8位數字'),
    handleValidationErrors
];

// 日期验证
const validateDate = [
    query('month')
        .optional()
        .trim()
        .matches(/^\d{1,2}$|^\d{4}-\d{1,2}$/).withMessage('無效的月份格式'),
    handleValidationErrors
];

// 分页验证
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('頁碼必須是正整數')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 }).withMessage('每頁數量必須在1-1000之間')
        .toInt(),
    handleValidationErrors
];

// 清理和验证 MongoDB ObjectId
function validateObjectId(id) {
    if (!id) {
        throw new Error('ID 不能為空');
    }
    
    if (typeof id !== 'string') {
        throw new Error('ID 必須是字符串');
    }
    
    if (!validator.isMongoId(id)) {
        throw new Error('無效的 ID 格式');
    }
    
    return id;
}

// 清理字符串输入
function sanitizeString(input) {
    if (typeof input !== 'string') {
        return '';
    }
    return validator.escape(validator.trim(input));
}

// 清理数字输入
function sanitizeNumber(input, min = -Infinity, max = Infinity) {
    const num = parseFloat(input);
    if (isNaN(num)) {
        return null;
    }
    return Math.max(min, Math.min(max, num));
}

// 验证电话号码格式
function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
        throw new Error('电话号碼必須是字符串');
    }
    
    const cleaned = phone.trim();
    if (!/^\d{8}$/.test(cleaned)) {
        throw new Error('电话号碼必須是8位數字');
    }
    
    return cleaned;
}

module.exports = {
    validateLogin,
    validatePhone,
    validateDate,
    validatePagination,
    validateObjectId,
    sanitizeString,
    sanitizeNumber,
    validatePhoneNumber,
    handleValidationErrors
};

