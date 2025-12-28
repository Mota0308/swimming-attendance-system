# Railway GitHub 自動部署配置指南

## 📋 步驟 1: 在 Railway Dashboard 連接 GitHub Repository

1. 登入 [Railway Dashboard](https://railway.app/dashboard)
2. 進入你的項目 `Swiming`（或 `swimming-attendance-system`）
3. 點擊你的服務 `swimming-attendance-system`
4. 進入 **Settings** 標籤
5. 找到 **Source** 或 **GitHub** 部分
6. 點擊 **Connect GitHub** 或 **Change Source**
7. 選擇你的 GitHub repository: `Mota0308/swimming-attendance-system`
8. 選擇分支: `main`
9. 設置 **Root Directory**: `api-server`
   - ⚠️ **重要**: 必須設置為 `api-server`，因為你的 API 服務器代碼在這個子目錄中

## 📋 步驟 2: 配置構建和部署設置

在 Railway 服務的 **Settings** 中確認以下設置：

### Build Settings:
- **Root Directory**: `api-server`
- **Build Command**: `npm install`（或留空，Railway 會自動檢測）
- **Start Command**: `npm start`

### Health Check:
- **Healthcheck Path**: `/health`
- **Healthcheck Timeout**: 300

## 📋 步驟 3: 配置環境變量

在 Railway 服務的 **Variables** 標籤中設置以下環境變量：

### 必需環境變量:
```
MONGO_BASE_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
PUBLIC_API_KEY=你的公開API密鑰
PRIVATE_API_KEY=你的私有API密鑰
NODE_ENV=production
```

### 可選環境變量:
```
DEFAULT_DB_NAME=test
CLUBS=你的俱樂部配置JSON字符串（如果需要）
```

## 📋 步驟 4: 確認自動部署已啟用

1. 在 **Settings** → **Deployments** 中
2. 確認 **Auto Deploy** 已啟用
3. 確認部署分支是 `main`

## 📋 步驟 5: 測試自動部署

1. 在本地對代碼進行修改
2. 提交並推送到 GitHub:
   ```bash
   git add .
   git commit -m "test: trigger railway deployment"
   git push origin main
   ```
3. 返回 Railway Dashboard，應該會看到新的部署自動開始
4. 點擊 **Deployments** 標籤查看部署進度

## 🔧 故障排除

### 問題 1: 部署失敗，找不到根目錄
- **解決方案**: 確保在 Railway Settings 中 **Root Directory** 設置為 `api-server`

### 問題 2: 構建失敗
- **檢查**: 確保 `api-server/package.json` 存在且正確
- **檢查**: 確保 `api-server/server.js` 存在

### 問題 3: 環境變量未設置
- **解決方案**: 在 Railway Variables 標籤中添加所有必需的環境變量

### 問題 4: 健康檢查失敗
- **檢查**: 確保 `/health` 端點在 `api-server/server.js` 中正確實現
- **檢查**: 確保服務器正常啟動

## 📝 部署後驗證

部署完成後，檢查：
1. Railway Dashboard 顯示服務狀態為 **Active**
2. 訪問健康檢查端點確認服務正常:
   ```
   https://你的域名.railway.app/health
   ```
3. 檢查日誌確認沒有錯誤:
   ```bash
   railway logs
   ```

## 🔄 後續更新流程

以後只需要：
1. 修改代碼
2. 提交到本地 Git
3. 推送到 GitHub
4. Railway 會自動檢測並部署

無需手動運行 `railway up`！

