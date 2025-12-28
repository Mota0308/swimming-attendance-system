# Railway Redirect URI 生成器

## 📍 如何获取您的 Railway Redirect URI

### 步骤 1：部署到 Railway

1. 登录 Railway：https://railway.app/
2. 创建新项目并部署 Vocard
3. 等待部署完成

### 步骤 2：获取您的 Railway 域名

部署完成后，Railway 会为您的服务分配一个域名：

**格式：**
```
https://your-service-name.up.railway.app
```

**如何查找：**
1. 在 Railway 项目页面
2. 点击您的服务
3. 进入 "Settings" > "Networking"
4. 查看 "Public Domain" 或 "Custom Domain"

### 步骤 3：生成 Redirect URI

根据您的服务配置，Redirect URI 格式如下：

#### 标准回调（推荐）
```
https://your-service-name.up.railway.app/callback
```

#### Dashboard 回调（如果启用了 Dashboard）
```
https://your-service-name.up.railway.app:8080/callback
```

#### 自定义域名（如果设置了）
```
https://your-custom-domain.com/callback
```

## 🔧 快速生成工具

将下面的 `your-service-name` 替换为您的实际 Railway 服务名称：

**标准 Redirect URI：**
```
https://your-service-name.up.railway.app/callback
```

**示例：**
如果您的服务名称是 `vocard-bot`，则 Redirect URI 为：
```
https://vocard-bot.up.railway.app/callback
```

## 📝 在 Spotify 设置

1. 访问 https://developer.spotify.com/dashboard
2. 选择您的 Spotify 应用
3. 点击 "Edit Settings"
4. 在 "Redirect URIs" 字段中，添加上面生成的 URI
5. 点击 "Add" 然后 "Save"

## ⚠️ 重要提示

1. **使用 HTTPS**：Railway 自动提供 HTTPS，确保使用 `https://` 而不是 `http://`
2. **路径必须匹配**：确保路径是 `/callback`（区分大小写）
3. **可以添加多个**：您可以同时添加多个 Redirect URI（本地开发和生产环境）

## 🔄 如果更改了域名

如果之后更改了 Railway 域名或设置了自定义域名：

1. 更新 Spotify 开发者仪表板中的 Redirect URI
2. 确保新 URI 与代码中的配置一致
3. 重新部署应用（如果需要）

## ✅ 验证

设置完成后，测试 Spotify 集成：

1. 在 Discord 中使用 Spotify 相关命令
2. 检查机器人日志确认连接成功
3. 如果遇到 "Invalid redirect URI" 错误，检查 URI 是否完全匹配




