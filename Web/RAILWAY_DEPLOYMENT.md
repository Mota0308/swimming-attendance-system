# 🚀 Railway部署指南

## 概述
本指南将帮助您将游泳系统网页应用部署到Railway云平台，实现24/7在线访问。

## 部署前准备

### 1. 安装Railway CLI
```bash
# 使用npm安装
npm install -g @railway/cli

# 或使用yarn
yarn global add @railway/cli
```

### 2. 登录Railway
```bash
railway login
```

## 部署步骤

### 步骤1：初始化项目
```bash
cd Web
railway init
```

### 步骤2：配置项目
- 选择"Deploy from GitHub"或"Deploy from local directory"
- 如果是本地部署，选择当前目录
- 项目名称建议：`swimming-system-web`

### 步骤3：部署应用
```bash
railway up
```

### 步骤4：获取部署URL
```bash
railway status
```

## 环境变量配置

### 在Railway Dashboard中设置：
1. 进入项目设置
2. 选择"Variables"标签
3. 添加以下环境变量：

```
NODE_ENV=production
PORT=3000
```

## 自动部署配置

### GitHub集成（推荐）
1. 将代码推送到GitHub仓库
2. 在Railway中连接GitHub仓库
3. 设置自动部署分支（通常是main或master）

### 本地部署
```bash
# 每次更新后重新部署
railway up

# 查看部署状态
railway status

# 查看日志
railway logs
```

## 部署后配置

### 1. 自定义域名（可选）
- 在Railway Dashboard中添加自定义域名
- 配置DNS记录指向Railway提供的IP

### 2. HTTPS配置
- Railway自动提供HTTPS证书
- 无需额外配置

### 3. 监控和日志
- 在Railway Dashboard查看应用状态
- 监控资源使用情况
- 查看错误日志

## 故障排除

### 常见问题

#### 1. 部署失败
```bash
# 查看详细日志
railway logs

# 重新部署
railway up
```

#### 2. 应用无法访问
- 检查环境变量配置
- 确认端口设置正确
- 查看Railway Dashboard状态

#### 3. 性能问题
- 检查资源使用情况
- 考虑升级Railway计划
- 优化静态资源

## 维护和更新

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新部署
railway up
```

### 回滚部署
- 在Railway Dashboard中选择之前的部署版本
- 点击"Redeploy"回滚

## 成本控制

### Railway定价
- **免费计划**：每月500小时，适合开发测试
- **付费计划**：按使用量计费，适合生产环境

### 优化建议
- 使用免费计划进行开发和测试
- 生产环境考虑付费计划以获得更好性能
- 监控资源使用，避免意外费用

## 安全考虑

### 1. API密钥保护
- 确保API密钥不会暴露在前端代码中
- 使用环境变量存储敏感信息

### 2. 访问控制
- 考虑添加身份验证
- 限制API访问频率

### 3. 数据安全
- 确保数据传输使用HTTPS
- 定期备份重要数据

## 部署完成后的优势

✅ **24/7在线访问**：用户无需启动本地服务器
✅ **全球CDN**：快速访问，低延迟
✅ **自动扩展**：根据访问量自动调整资源
✅ **专业监控**：实时监控应用状态
✅ **自动备份**：Railway自动备份部署
✅ **团队协作**：多人可以同时管理部署

## 下一步

部署完成后，您可以：
1. 分享Railway提供的URL给用户
2. 配置自定义域名（可选）
3. 设置监控和告警
4. 开始使用在线版本

---

🎉 **恭喜！您的游泳系统网页应用现在可以24/7在线访问了！** 