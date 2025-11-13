# Railway 新部署配置文件說明

## 📁 文件說明

我為您創建了兩個新的 Railway 部署配置文件：

1. **`railway.toml.new`** - 簡潔版本，包含基本配置
2. **`railway.deploy.toml`** - 詳細版本，包含完整註釋和說明

## 🚀 使用步驟

### 步驟 1: 選擇配置文件

根據您的需求選擇一個配置文件：

- **如果從項目根目錄部署**：使用 `railway.deploy.toml`，取消註釋 `rootDirectory = "api-server"` 這一行
- **如果從 `api-server` 目錄直接部署**：使用 `railway.toml.new`，保持 `rootDirectory` 註釋狀態

### 步驟 2: 重命名配置文件

將選中的配置文件重命名為 `railway.toml`：

```bash
# 選項 A: 使用簡潔版本
copy railway.toml.new railway.toml

# 選項 B: 使用詳細版本
copy railway.deploy.toml railway.toml
```

### 步驟 3: 配置環境變量

在 Railway Dashboard 中設置以下環境變量：

1. 登入 Railway Dashboard: https://railway.app
2. 選擇您的項目和服務
3. 進入 **Variables** 標籤
4. 添加以下環境變量：

#### 必需環境變量：

| 變量名 | 說明 | 示例值 |
|--------|------|--------|
| `MONGO_BASE_URI` | MongoDB 連接字符串 | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `PUBLIC_API_KEY` | 公開 API 密鑰 | `ttdrcccy` |
| `PRIVATE_API_KEY` | 私有 API 密鑰 | `2b207365-cbf0-4e42-a3bf-f932c84557c4` |

#### 可選環境變量：

| 變量名 | 說明 | 默認值 |
|--------|------|--------|
| `DEFAULT_DB_NAME` | 默認數據庫名稱 | `test` |
| `CLUBS` | 俱樂部配置 JSON 字符串 | - |

**注意**：`PORT` 和 `NODE_ENV` 會自動設置，無需手動配置。

### 步驟 4: 設置根目錄（如果需要）

如果從項目根目錄部署：

1. 在 Railway Dashboard 中進入服務的 **Settings** 標籤
2. 找到 **Source** 或 **Root Directory** 設置
3. 設置為 `api-server`

或者在 `railway.toml` 中取消註釋：
```toml
[deploy]
rootDirectory = "api-server"
```

### 步驟 5: 部署

#### 方法 A: 通過 Git 部署（推薦）

```bash
cd "C:\Program Files\Relife\desktop-app"
git add api-server/railway.toml
git commit -m "Add new Railway deployment configuration"
git push
```

Railway 會自動檢測到變更並開始部署。

#### 方法 B: 通過 Railway Dashboard 部署

1. 在 Railway Dashboard 中點擊 **Deployments** 標籤
2. 點擊 **Redeploy** 按鈕
3. 等待部署完成（約 2-5 分鐘）

### 步驟 6: 驗證部署

部署完成後，檢查以下內容：

1. **查看部署日誌**：
   - ✅ 看到 `npm install --no-cache` 執行成功
   - ✅ 看到 `🚀 API 服務器啟動成功` 消息
   - ✅ 看到端口監聽信息

2. **測試健康檢查端點**：
   ```bash
   curl https://your-service.railway.app/health
   ```
   應該返回 `{"status":"ok"}`

3. **測試 API 功能**：
   - 創建學生賬單（包含圖片上傳）
   - 確認不再出現 `PayloadTooLargeError`
   - 確認圖片上傳成功

## 🔧 配置說明

### 構建配置

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install --no-cache"
```

- 使用 `nixpacks` 作為構建器（Railway 默認）
- `--no-cache` 確保安裝最新版本的依賴

### 部署配置

```toml
[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

- `startCommand`: 使用 `npm start` 啟動服務器
- `healthcheckPath`: 健康檢查端點路徑
- `healthcheckTimeout`: 健康檢查超時時間（秒）
- `restartPolicyType`: 失敗時自動重啟
- `restartPolicyMaxRetries`: 最多重試 10 次

## 🐛 故障排除

### 問題 1: "Could not find root directory"

**解決方案**：
- 確保在 Railway Dashboard 中設置了正確的 Root Directory
- 或在 `railway.toml` 中取消註釋 `rootDirectory = "api-server"`

### 問題 2: "Module not found" 或依賴安裝失敗

**解決方案**：
- 檢查 `package.json` 是否在正確的位置
- 清除 Railway 構建緩存
- 確保 Node.js 版本 >= 18.0.0

### 問題 3: 健康檢查失敗

**解決方案**：
- 檢查 `/health` 端點是否正常響應
- 增加 `healthcheckTimeout` 值
- 檢查服務器日誌中的錯誤信息

### 問題 4: MongoDB 連接失敗

**解決方案**：
- 確認 `MONGO_BASE_URI` 環境變量設置正確
- 檢查 MongoDB Atlas 網絡訪問列表（允許 Railway IP）
- 確認 MongoDB 用戶名和密碼正確

## 📝 注意事項

1. **安全性**：
   - 不要在配置文件中硬編碼敏感信息（如 API 密鑰、數據庫密碼）
   - 使用 Railway 的環境變量功能存儲敏感信息

2. **性能**：
   - Railway 會自動處理負載均衡
   - 健康檢查確保服務可用性

3. **監控**：
   - 定期檢查 Railway Dashboard 中的日誌
   - 監控服務的資源使用情況

## ✅ 部署檢查清單

- [ ] 選擇並重命名配置文件為 `railway.toml`
- [ ] 配置 `rootDirectory`（如果需要）
- [ ] 在 Railway Dashboard 中設置所有必需的環境變量
- [ ] 提交並推送代碼到 Git（或手動觸發部署）
- [ ] 驗證部署日誌無錯誤
- [ ] 測試健康檢查端點
- [ ] 測試 API 功能（創建賬單、上傳圖片等）

---

**需要幫助？** 查看 Railway 官方文檔：https://docs.railway.app
























