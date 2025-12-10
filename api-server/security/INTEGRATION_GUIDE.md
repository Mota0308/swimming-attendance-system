# 安全措施集成指南

本指南说明如何将安全措施逐步集成到主应用中。

## 前置准备

### 1. 安装依赖

```bash
cd api-server
npm install bcrypt express-rate-limit express-validator helmet jsonwebtoken validator winston
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入实际值：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置所有必需的环境变量。

## 集成步骤

### 第一阶段：密码哈希（必需）

#### 步骤 1：修改登录路由

在 `server.js` 中：

```javascript
// 1. 引入密码工具
const { comparePassword } = require('./security/utils/password-utils');

// 2. 修改登录验证逻辑（第219行附近）
app.post('/auth/login', validateApiKeys, async (req, res) => {
    // ... 现有代码 ...
    
    // 修改密码验证部分
    if (loginType === 'coach' || loginType === 'supervisor' || loginType === 'admin' || loginType === 'manager') {
        const collection = db.collection('Admin_account');
        user = await collection.findOne({
            phone: phone,
            type: loginType
        });
        
        // ✅ 使用密码哈希验证
        if (user && user.password) {
            const isPasswordValid = await comparePassword(password, user.password);
            if (!isPasswordValid) {
                user = null;
            }
        } else {
            user = null;
        }
        
        // ... 其余代码 ...
    }
});
```

#### 步骤 2：运行密码迁移脚本

```bash
node security/migrations/migrate-passwords.js
```

**重要**：运行前请先备份数据库！

### 第二阶段：环境变量管理

#### 步骤 1：修改 server.js

```javascript
// 修改第13-19行
const MONGO_BASE_URI = process.env.MONGO_BASE_URI;
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// ✅ 强制使用环境变量
if (!MONGO_BASE_URI) {
    throw new Error('❌ MONGO_BASE_URI environment variable is required');
}

const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY;
const PRIVATE_API_KEY = process.env.PRIVATE_API_KEY;

if (!PUBLIC_API_KEY || !PRIVATE_API_KEY) {
    throw new Error('❌ API keys must be set in environment variables');
}
```

#### 步骤 2：更新前端代码

在 `Web_app/main-app.js` 中，将硬编码的 API 密钥改为从环境变量读取（或使用配置文件）。

### 第三阶段：输入验证

#### 步骤 1：在路由中使用验证中间件

```javascript
const { validateLogin, validatePhone, validatePagination } = require('./security/middleware/validation');

// 登录路由
app.post('/auth/login', validateApiKeys, validateLogin, async (req, res) => {
    // req.body 已经过验证和清理
    // ...
});

// 学生列表路由
app.get('/students', validateApiKeys, validatePagination, async (req, res) => {
    // req.query 已经过验证
    // ...
});
```

### 第四阶段：JWT 会话管理

#### 步骤 1：修改登录路由返回 Token

```javascript
const { generateToken } = require('./security/utils/session-utils');

// 在登录成功时
if (user) {
    const token = generateToken(user);
    res.json({
        success: true,
        message: '登入成功',
        token: token, // ✅ 返回 Token
        user: { /* ... */ }
    });
}
```

#### 步骤 2：使用认证中间件

```javascript
const { authenticateJWT, requireRole } = require('./security/middleware/auth');

// 替换 validateApiKeys（可选，或两者同时使用）
app.get('/students', authenticateJWT, async (req, res) => {
    // req.user 包含用户信息
    // ...
});

// 仅管理员可访问
app.post('/admin/create-employee', authenticateJWT, requireRole('admin'), async (req, res) => {
    // ...
});
```

### 第五阶段：速率限制

#### 步骤 1：应用速率限制

```javascript
const { loginLimiter, apiLimiter } = require('./security/middleware/rate-limit');

// 登录路由
app.post('/auth/login', loginLimiter, validateApiKeys, async (req, res) => {
    // ...
});

// 所有 API 路由
app.use('/api/', apiLimiter);
```

### 第六阶段：错误处理

#### 步骤 1：添加错误处理中间件

在 `server.js` 末尾（所有路由之后）：

```javascript
const { errorHandler, notFoundHandler } = require('./security/middleware/error-handler');

// 404 处理
app.use(notFoundHandler);

// 错误处理（必须在最后）
app.use(errorHandler);
```

### 第七阶段：HTTPS 和 Helmet

#### 步骤 1：添加 Helmet

```javascript
const helmet = require('helmet');

// 在中间件部分添加
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true
    }
}));
```

### 第八阶段：日志和监控

#### 步骤 1：在关键位置添加日志

```javascript
const { logSecurityEvent, logError } = require('./security/utils/logger');

// 在登录失败时
if (!user) {
    logSecurityEvent('LOGIN_FAILED', { phone, loginType }, req);
}

// 在错误处理中
catch (error) {
    logError(error, req);
    // ...
}
```

## 测试清单

完成每个阶段后，请测试：

- [ ] 登录功能正常
- [ ] 密码验证正确
- [ ] API 请求需要认证
- [ ] 输入验证工作正常
- [ ] 速率限制生效
- [ ] 错误信息不泄露敏感信息
- [ ] 日志文件正常生成

## 回滚计划

如果出现问题，可以：

1. 从 Git 恢复之前的代码
2. 恢复数据库备份
3. 检查环境变量配置

## 注意事项

1. **逐步实施**：每次只添加一个安全措施，测试通过后再继续
2. **备份数据**：运行迁移脚本前必须备份数据库
3. **环境变量**：确保所有环境变量都已正确设置
4. **测试充分**：每个阶段都要进行充分测试
5. **文档更新**：更新 API 文档，说明新的认证方式

