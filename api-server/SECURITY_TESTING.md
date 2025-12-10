# 安全措施测试指南

## 已实施的安全措施

✅ **第一阶段：密码哈希（bcrypt）**
- 登录时使用 bcrypt 验证密码
- 支持向后兼容（明文密码仍可登录）
- 密码不会在响应中返回

✅ **第二阶段：环境变量管理**
- 生产环境强制使用环境变量
- 开发环境使用默认值（向后兼容）

✅ **第三阶段：输入验证**
- 登录路由添加输入验证
- 验证电话号码格式、密码长度等

✅ **第四阶段：速率限制**
- 登录路由：15分钟内最多5次尝试
- API 路由：1分钟内最多100个请求

✅ **第五阶段：错误处理**
- 统一错误处理中间件
- 生产环境不暴露详细错误信息
- 404 处理

✅ **第六阶段：HTTPS 和 Helmet**
- 设置安全 HTTP 头
- HSTS、CSP、XSS 保护等

✅ **第七阶段：日志和监控**
- 记录安全事件（登录失败、API 密钥验证失败）
- 日志文件保存在 `logs/` 目录

## 测试步骤

### 1. 测试密码哈希功能

#### 测试场景1：使用现有密码登录（向后兼容）
```bash
# 使用现有的明文密码登录，应该仍然可以登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-API-Public-Key: ttdrcccy" \
  -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
  -d '{
    "phone": "12345678",
    "password": "your_password",
    "userType": "coach"
  }'
```

**预期结果**：登录成功（向后兼容）

#### 测试场景2：运行密码迁移脚本
```bash
# 先备份数据库！
node security/migrations/migrate-passwords.js
```

**预期结果**：所有密码被哈希，登录仍然可以工作

#### 测试场景3：使用哈希密码登录
```bash
# 迁移后，使用相同密码登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-API-Public-Key: ttdrcccy" \
  -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
  -d '{
    "phone": "12345678",
    "password": "your_password",
    "userType": "coach"
  }'
```

**预期结果**：登录成功

### 2. 测试输入验证

#### 测试场景1：无效的电话号码格式
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-API-Public-Key: ttdrcccy" \
  -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
  -d '{
    "phone": "123",
    "password": "test",
    "userType": "coach"
  }'
```

**预期结果**：返回 400 错误，提示电话号码格式无效

#### 测试场景2：密码太短
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-API-Public-Key: ttdrcccy" \
  -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
  -d '{
    "phone": "12345678",
    "password": "123",
    "userType": "coach"
  }'
```

**预期结果**：返回 400 错误，提示密码长度无效

### 3. 测试速率限制

#### 测试场景1：登录速率限制
```bash
# 连续发送6次登录请求（超过5次限制）
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -H "X-API-Public-Key: ttdrcccy" \
    -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
    -d '{
      "phone": "12345678",
      "password": "wrong_password",
      "userType": "coach"
    }'
  echo "Request $i"
done
```

**预期结果**：前5次返回 401，第6次返回 429（Too Many Requests）

### 4. 测试错误处理

#### 测试场景1：访问不存在的路由
```bash
curl http://localhost:3000/nonexistent
```

**预期结果**：返回 404，格式化的错误响应

#### 测试场景2：数据库错误
```bash
# 使用无效的 MongoDB URI 测试（需要修改代码临时测试）
```

**预期结果**：返回 500，但不暴露详细错误信息（生产环境）

### 5. 测试安全头

#### 测试场景：检查响应头
```bash
curl -I http://localhost:3000/
```

**预期结果**：包含以下安全头：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 6. 测试日志记录

#### 检查日志文件
```bash
# 查看错误日志
cat logs/error.log

# 查看安全事件日志
cat logs/security.log

# 查看所有日志
cat logs/combined.log
```

**预期结果**：
- 登录失败事件被记录
- API 密钥验证失败被记录
- 错误信息被记录

## 功能验证清单

- [ ] 现有用户可以使用原密码登录（向后兼容）
- [ ] 密码迁移后，用户仍可使用相同密码登录
- [ ] 无效输入被正确拒绝
- [ ] 速率限制正常工作
- [ ] 错误信息不泄露敏感信息
- [ ] 安全头正确设置
- [ ] 日志文件正常生成
- [ ] 所有现有 API 功能正常工作

## 注意事项

1. **密码迁移前必须备份数据库**
2. **测试时使用开发环境**（NODE_ENV=development）
3. **生产环境部署前**，确保所有环境变量已设置
4. **监控日志文件**，检查是否有异常

## 回滚计划

如果出现问题：

1. **恢复代码**：
   ```bash
   git checkout HEAD~1
   ```

2. **恢复数据库**：使用备份恢复

3. **检查环境变量**：确保 `.env` 文件正确

4. **重启服务**：
   ```bash
   npm start
   ```

