# Railway 部署指南

## 📋 當前配置

`railway.toml` 文件已重新創建，配置如下：

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install --no-cache"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[deploy.envs]
NODE_ENV = "production"
PORT = "$PORT"
```

## ⚠️ 重要說明

**如果 `railway.toml` 在 `api-server` 目錄內：**

### 情況 1：Railway 服務從項目根目錄部署
- 需要在 Railway Dashboard 中設置 **Root Directory** 為 `api-server`
- 或者在此文件中添加 `rootDirectory = "api-server"`

### 情況 2：Railway 服務從 `api-server` 目錄部署
- 不需要設置 `rootDirectory`
- Railway 會自動使用當前目錄

## 🚀 部署步驟

### 方法 1：使用 Railway Dashboard（推薦）

1. **打開 Railway Dashboard**
   - 訪問：https://railway.app
   - 登入您的帳號

2. **選擇服務**
   - 找到項目：`swimming-attendance-system`
   - 點擊服務：`swimming-attendance-system`

3. **檢查根目錄設置**
   - 點擊 "Settings" 標籤
   - 找到 "Source" 或 "Root Directory" 設置
   - **如果從項目根目錄部署**：設置為 `api-server`
   - **如果從 `api-server` 目錄部署**：留空或設置為 `.`

4. **清除緩存**
   - 找到 "Build Cache" 或 "Clear Cache" 選項
   - 點擊 "Clear Cache"

5. **重新部署**
   - 點擊 "Deployments" 標籤
   - 點擊 "Redeploy" 或 "Deploy"
   - 等待部署完成（約 2-5 分鐘）

6. **驗證部署**
   - 查看部署日誌，確認：
     - ✅ 看到 `npm install --no-cache` 執行
     - ✅ 看到 `🚀 API 服務器啟動成功`
     - ✅ 看到端點信息日誌

### 方法 2：使用 Git 部署

如果 Railway 連接到 Git 倉庫：

```bash
cd "C:\Program Files\Relife\desktop-app"
git add api-server/railway.toml
git commit -m "Fix: Recreate railway.toml for proper deployment"
git push
```

## 🔍 如果仍然出現 "Could not find root directory" 錯誤

1. **在 Railway Dashboard 中檢查服務設置**
   - Settings → Source → Root Directory
   - 確保設置正確

2. **如果從項目根目錄部署，修改 railway.toml：**
   ```toml
   [deploy]
   rootDirectory = "api-server"  # 添加這一行
   startCommand = "npm start"
   ...
   ```

3. **如果從 `api-server` 目錄部署，確保 railway.toml 中沒有 rootDirectory**

## ✅ 驗證部署成功

部署完成後，測試以下功能：
- ✅ 創建學生賬單（包含圖片上傳）
- ✅ 確認不再出現 `PayloadTooLargeError`
- ✅ 確認不再出現 `404 端點不存在`
- ✅ 確認圖片上傳成功
- ✅ 確認學生賬單創建成功













