# S3/R2 收据图片上传配置指南

本指南将帮助你在 Railway Variables 中配置 S3/R2 环境变量，实现收据图片的持久化存储。

## 📋 推荐方案：Cloudflare R2

Cloudflare R2 是推荐的方案，因为它：
- ✅ 免费额度：每月 10GB 存储 + 100 万次读取/写入操作
- ✅ 无出站流量费用（与 AWS S3 不同）
- ✅ 与 Cloudflare CDN 集成良好
- ✅ 支持 S3 API，易于使用

---

## 🔧 步骤 1：创建 Cloudflare R2 Bucket

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2** 服务
3. 点击 **Create bucket**
4. 输入 Bucket 名称（例如：`swimming-receipts`）
5. 选择位置（建议选择离你用户最近的区域）
6. 点击 **Create bucket**

---

## 🔑 步骤 2：获取 API 凭证

1. 在 Cloudflare Dashboard 中，进入 **R2** → **Manage R2 API Tokens**
2. 点击 **Create API token**
3. 设置：
   - **Token name**: `swimming-receipts-upload`（自定义名称）
   - **Permissions**: `Object Read & Write`
   - **TTL**: 留空（永久）或设置过期时间
   - **R2 Token scopes**:
     - Bucket: 选择你刚创建的 bucket
     - Access: `Object Read & Write`
4. 点击 **Create API token**
5. **重要**：复制显示的 **Access Key ID** 和 **Secret Access Key**（只显示一次）

---

## 🌐 步骤 3：设置公开访问（Public Access）

为了让上传的图片可以公开访问，需要：

### 方法 A：使用 R2 的公共访问域名（推荐）

1. 在 R2 Dashboard 中，进入你的 Bucket
2. 点击 **Settings** 标签
3. 找到 **Public Access** 部分
4. 点击 **Allow Access**（如果还没启用）
5. 你会看到一个格式如下的域名：
   ```
   https://pub-<account-id>.r2.dev
   ```
   或者如果你绑定了自定义域名：
   ```
   https://receipts.yourdomain.com
   ```

### 方法 B：使用自定义域名（可选）

1. 在 R2 Bucket Settings 中，找到 **Custom Domains**
2. 添加你的域名（例如：`receipts.yourdomain.com`）
3. 按照提示配置 DNS 记录
4. 等待 DNS 生效后，使用这个自定义域名

---

## 📝 步骤 4：在 Railway Variables 中设置环境变量

在 Railway Dashboard 中：
1. 进入你的项目
2. 选择 **api-server** 服务
3. 点击 **Variables** 标签
4. 添加以下环境变量：

### ✅ 必需的环境变量

| 变量名 | 值 | 说明 | 示例 |
|--------|-----|------|------|
| `S3_BUCKET` | 你的 R2 Bucket 名称 | 在第 1 步创建的 bucket 名称 | `swimming-receipts` |
| `S3_ACCESS_KEY_ID` | Access Key ID | 在第 2 步复制的 Access Key ID | `abc123def456...` |
| `S3_SECRET_ACCESS_KEY` | Secret Access Key | 在第 2 步复制的 Secret Access Key | `xyz789uvw012...` |
| `S3_ENDPOINT` | R2 API 端点 | R2 的 S3 兼容端点 | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_REGION` | 区域 | R2 使用 `auto` | `auto` |
| `S3_PUBLIC_BASE_URL` | 公开访问 URL | 在第 3 步获取的公共访问域名 | `https://pub-<account-id>.r2.dev` |

### 🔍 如何找到 S3_ENDPOINT

1. 在 Cloudflare Dashboard 中，进入 **R2** → 你的 Bucket
2. 点击 **Settings** 标签
3. 在 **S3 API** 部分，你会看到：
   ```
   https://<account-id>.r2.cloudflarestorage.com
   ```
   这就是你的 `S3_ENDPOINT`

   **提示**：`<account-id>` 是你的 Cloudflare Account ID，可以在 Dashboard 右侧栏或 R2 Overview 页面找到。

### ⚙️ 可选的环境变量

| 变量名 | 值 | 说明 | 默认值 |
|--------|-----|------|--------|
| `S3_PREFIX` | 文件前缀路径 | 上传文件的路径前缀 | `receipts` |
| `S3_FORCE_PATH_STYLE` | `true` 或 `false` | R2 建议使用 `true` | `true` |

**完整的变量配置示例：**

```
S3_BUCKET=swimming-receipts
S3_ACCESS_KEY_ID=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567
S3_SECRET_ACCESS_KEY=xyz789uvw012rst345ghi678jkl901mno234pqr567stu890vwx123
S3_ENDPOINT=https://a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.r2.cloudflarestorage.com
S3_REGION=auto
S3_PUBLIC_BASE_URL=https://pub-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.r2.dev
S3_PREFIX=receipts
S3_FORCE_PATH_STYLE=true
```

---

## ✅ 步骤 5：验证配置

1. 保存所有环境变量
2. Railway 会自动重新部署服务
3. 部署完成后，查看日志，应该看到：
   ```
   ✅ S3/R2 收据上传已启用
   ```
4. 在前端尝试上传一张收据图片
5. 上传成功后，检查返回的 URL 是否指向你的 R2 域名
6. 点击"查看图片"，确认可以正常访问

---

## 🔒 安全建议

1. **不要**在代码中硬编码这些凭证
2. **不要**将包含这些凭证的 `.env` 文件提交到 Git
3. 定期轮换 API Token（建议每 90 天）
4. 使用最小权限原则（只给 R2 Token 必要的权限）
5. 如果使用自定义域名，建议启用 Cloudflare CDN 的缓存和 DDoS 保护

---

## ❓ 常见问题

### Q: 如果我不配置这些变量会怎样？

A: 系统会自动回退到本地 `uploads/` 目录存储（非持久化）。文件在 redeploy/重启后可能丢失。

### Q: 可以使用 AWS S3 吗？

A: 可以！只需要：
- `S3_ENDPOINT` 可以留空（AWS S3 会自动使用）
- `S3_REGION` 设置为你的 S3 Bucket 所在区域（例如：`us-east-1`）
- `S3_PUBLIC_BASE_URL` 设置为你的 S3 Bucket 的公共访问 URL（需要配置 Bucket 策略允许公开读取）

### Q: 旧的收据图片（404）怎么办？

A: B1 方案只能保证**以后上传的收据**不会丢失。旧的 404 链接需要用户重新上传替换。

### Q: 如何迁移旧的本地文件到 R2？

A: 需要编写迁移脚本，读取本地 `uploads/` 目录，逐个上传到 R2，然后更新数据库中的 URL。这不是必须的，只是为了避免用户重新上传。

---

## 📚 参考资料

- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Cloudflare R2 S3 API 兼容性](https://developers.cloudflare.com/r2/api/s3/api/)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

