# 🌐 网页应用API端点部署指南

## 概述
本文档说明如何为网页应用添加和部署API端点，使网页应用能够与您的MongoDB数据库进行交互。

## 新增的API端点

### 1. 健康检查端点
```
GET /api/health
```
**功能**: 检查网页应用API服务状态
**响应**: 服务状态、版本、功能列表

### 2. 地点数据端点
```
GET /api/locations
```
**功能**: 获取所有地点数据
**响应**: 地点列表、数量、时间戳

### 3. 泳会数据端点
```
GET /api/clubs
```
**功能**: 获取所有泳会数据
**响应**: 泳会列表、数量、时间戳

### 4. 学生数据端点
```
GET /api/students?location={location}&club={club}
```
**功能**: 获取学生数据，支持地点和泳会过滤
**参数**: 
- `location`: 地点（可选）
- `club`: 泳会（可选）
**响应**: 学生列表、过滤条件、数量

### 5. 出席记录端点
```
GET /api/attendance?month={month}&location={location}&club={club}
```
**功能**: 获取出席记录，支持多条件过滤
**参数**:
- `month`: 月份（可选）
- `location`: 地点（可选）
- `club`: 泳会（可选）
**响应**: 出席记录列表、过滤条件、数量

### 6. 工时数据端点
```
GET /api/work-hours?month={month}
```
**功能**: 获取教练工时数据
**参数**:
- `month`: 月份（可选）
**响应**: 工时统计、每日记录、月份信息

### 7. 更表数据端点
```
GET /api/roster?month={month}
```
**功能**: 获取教练更表数据
**参数**:
- `month`: 月份（可选）
**响应**: 更表信息、班次列表、月份信息

### 8. 登录端点
```
POST /api/auth/login
```
**功能**: 网页应用用户登录
**请求体**:
```json
{
    "phone": "12345678",
    "password": "password123",
    "userType": "coach"
}
```
**响应**: 登录结果、用户信息、时间戳

## 部署步骤

### 步骤1：更新API服务器
1. 将新的API端点代码添加到您的 `server.js` 文件
2. 或者将 `web-api-endpoints.js` 文件集成到您的服务器

### 步骤2：重启API服务器
```bash
# 如果使用PM2
pm2 restart server

# 如果使用Node.js直接运行
node server.js

# 如果部署在Railway，会自动重新部署
```

### 步骤3：测试API端点
使用提供的测试脚本：
```bash
cd api-server
node test-web-api.js
```

## 测试API端点

### 1. 使用测试脚本
```bash
# 安装依赖
npm install axios

# 运行测试
node test-web-api.js
```

### 2. 手动测试
使用浏览器或Postman测试各个端点：

**健康检查**:
```
GET https://swimming-attendance-system-production.up.railway.app/api/health
```

**地点数据**:
```
GET https://swimming-attendance-system-production.up.railway.app/api/locations
```

**登录测试**:
```
POST https://swimming-attendance-system-production.up.railway.app/api/auth/login
Content-Type: application/json

{
    "phone": "12345678",
    "password": "test123",
    "userType": "coach"
}
```

## 数据集成

### 当前状态
- **模拟数据**: 所有端点目前返回模拟数据
- **MongoDB集成**: 需要进一步开发以连接实际数据库

### 下一步开发
1. **连接MongoDB**: 将模拟数据替换为实际数据库查询
2. **数据验证**: 添加输入验证和错误处理
3. **权限控制**: 实现用户权限验证
4. **数据缓存**: 添加数据缓存机制

## 安全考虑

### 当前安全措施
- **CORS支持**: 允许跨域请求
- **错误处理**: 完整的错误捕获和响应
- **日志记录**: 详细的请求和响应日志

### 建议增强
- **API密钥验证**: 添加API密钥验证中间件
- **速率限制**: 实现请求速率限制
- **输入验证**: 添加请求参数验证
- **HTTPS强制**: 确保所有通信使用HTTPS

## 监控和日志

### 日志记录
所有API请求都会记录：
- 请求时间
- 请求方法
- 请求路径
- 客户端IP
- 响应状态
- 响应时间

### 监控建议
- 监控API响应时间
- 监控错误率
- 监控请求量
- 设置告警机制

## 故障排除

### 常见问题

#### 1. 端点返回404
**原因**: 端点未正确部署或路径错误
**解决**: 检查服务器代码和部署状态

#### 2. CORS错误
**原因**: 跨域请求被阻止
**解决**: 确认CORS配置正确

#### 3. 响应时间过长
**原因**: 数据库查询慢或网络延迟
**解决**: 优化数据库查询，添加缓存

### 调试步骤
1. 检查服务器日志
2. 验证端点路径
3. 测试数据库连接
4. 检查网络配置

## 性能优化

### 当前优化
- **异步处理**: 所有端点使用async/await
- **错误处理**: 完整的错误捕获和处理
- **日志优化**: 结构化日志记录

### 建议优化
- **数据缓存**: 实现Redis缓存
- **连接池**: 优化MongoDB连接
- **压缩**: 启用响应压缩
- **CDN**: 使用CDN加速静态资源

## 版本控制

### 当前版本
- **API版本**: 1.0.0
- **兼容性**: 向后兼容现有手机APP API

### 版本管理
- 使用语义化版本号
- 保持向后兼容性
- 提供版本迁移指南

## 联系支持

如有问题或建议，请联系开发团队。

---

🌐 **网页应用API端点已准备就绪，等待您的部署！** 