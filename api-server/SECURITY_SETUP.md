# 安全措施设置指南

## 已完成的工作

✅ 代码已提交到 GitHub  
✅ 创建了安全措施模块化文件夹结构  
✅ 实现了所有安全措施的基础代码

## 文件夹结构

```
api-server/
├── security/
│   ├── README.md                    # 安全措施说明
│   ├── INTEGRATION_GUIDE.md         # 集成指南
│   ├── utils/                       # 工具函数
│   │   ├── password-utils.js        # 密码哈希
│   │   ├── session-utils.js         # JWT 会话
│   │   ├── query-builder.js         # 安全查询
│   │   └── logger.js                # 日志工具
│   ├── middleware/                   # 中间件
│   │   ├── auth.js                  # 身份认证
│   │   ├── validation.js            # 输入验证
│   │   ├── rate-limit.js            # 速率限制
│   │   └── error-handler.js         # 错误处理
│   └── migrations/                  # 迁移脚本
│       └── migrate-passwords.js     # 密码迁移
```

## 下一步操作

### 1. 安装依赖

```bash
cd api-server
npm install
```

这将安装以下新依赖：
- bcrypt (密码哈希)
- express-rate-limit (速率限制)
- express-validator (输入验证)
- helmet (HTTPS 安全头)
- jsonwebtoken (JWT)
- validator (数据验证)
- winston (日志)

### 2. 创建环境变量文件

在 `api-server/` 目录创建 `.env` 文件：

```env
# API 密钥
PUBLIC_API_KEY=your_public_key_here
PRIVATE_API_KEY=your_private_key_here

# MongoDB
MONGO_BASE_URI=your_mongodb_connection_string
DEFAULT_DB_NAME=test

# JWT
JWT_SECRET=your-random-jwt-secret-key
JWT_EXPIRES_IN=24h

# Session
SESSION_SECRET=your-random-session-secret-key

# 服务器
PORT=3000
NODE_ENV=development

# 日志
LOG_LEVEL=info
```

### 3. 按照集成指南逐步实施

参考 `security/INTEGRATION_GUIDE.md` 文件，按照以下顺序实施：

1. **第一阶段**：密码哈希（必需）
2. **第二阶段**：环境变量管理
3. **第三阶段**：输入验证
4. **第四阶段**：JWT 会话管理
5. **第五阶段**：速率限制
6. **第六阶段**：错误处理
7. **第七阶段**：HTTPS 和 Helmet
8. **第八阶段**：日志和监控

## 重要提示

⚠️ **运行密码迁移脚本前，请先备份数据库！**

```bash
# 备份数据库后运行
node security/migrations/migrate-passwords.js
```

## 测试

每个阶段实施后，请测试：
- 登录功能
- API 请求
- 错误处理
- 日志记录

## 回滚

如果出现问题：
1. 从 Git 恢复代码：`git checkout HEAD~1`
2. 恢复数据库备份
3. 检查环境变量配置

