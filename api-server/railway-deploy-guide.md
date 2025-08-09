# 🚂 Railway 部署詳細步驟

## 📋 部署前檢查

✅ **已準備好的文件：**
- `package.json` - Node.js 項目配置
- `server.js` - 主服務器文件
- `Procfile` - Heroku/Railway 部署配置
- 所有必要的依賴已安裝

## 🚀 Railway 部署步驟

### 步驟 1: 註冊 Railway 賬號

1. **訪問 Railway 官網**
   - 打開瀏覽器，訪問：https://railway.app
   - 點擊 "Get Started" 或 "Sign Up"

2. **使用 GitHub 註冊**
   - 選擇 "Continue with GitHub"
   - 授權 Railway 訪問您的 GitHub 賬號
   - 完成郵箱驗證

### 步驟 2: 創建新項目

1. **點擊 "New Project"**
   - 在 Railway 控制台點擊 "New Project" 按鈕

2. **選擇部署方式**
   - 選擇 "Deploy from GitHub repo"
   - 如果沒有看到您的倉庫，點擊 "Configure GitHub App"

3. **選擇倉庫和目錄**
   - 選擇您的 GitHub 倉庫
   - 在 "Root Directory" 中輸入：`api-server`
   - 點擊 "Deploy Now"

### 步驟 3: 配置環境變量

部署開始後，需要配置環境變量：

1. **進入項目設置**
   - 點擊項目名稱
   - 選擇 "Variables" 標籤

2. **添加環境變量**
   點擊 "New Variable" 添加以下變量：

   ```
   MONGODB_URI=mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   DB_NAME=test
   API_PUBLIC_KEY=ttdrcccy
   API_PRIVATE_KEY=2b207365-cbf0-4e42-a3bf-f932c84557c4
   ```

3. **保存配置**
   - 點擊 "Add" 保存每個變量
   - 等待部署重新啟動

### 步驟 4: 獲取部署URL

1. **查看部署狀態**
   - 在 "Deployments" 標籤查看部署進度
   - 等待狀態變為 "Deployed"

2. **獲取域名**
   - 在 "Settings" 標籤找到 "Domains" 部分
   - 複製提供的 HTTPS URL，例如：
     `https://swimming-attendance-api-production.up.railway.app`

### 步驟 5: 測試部署

使用提供的測試腳本測試部署：

```bash
# 設置您的實際URL
set API_URL=https://your-app-name.up.railway.app
node test-deployment.js
```

## 🔧 修改 Android 應用

### 1. 更新 API 配置

在 `Android_app/app/src/main/java/com/swimming/attendance/network/APIConfig.kt` 中：

```kotlin
// 將這行
private const val DEFAULT_BASE_URL = "http://203.145.95.240:3001"

// 改為您的 Railway URL
private const val DEFAULT_BASE_URL = "https://your-app-name.up.railway.app"
```

### 2. 重新構建 APK

```bash
cd Android_app
.\build_new_apk.bat
```

## 🧪 測試清單

### 1. API 健康檢查
```bash
curl https://your-app-name.up.railway.app/health
```

### 2. 登入功能測試
```bash
curl -X POST https://your-app-name.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -H "X-API-Public-Key: ttdrcccy" \
  -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
  -d '{"phone":"53004900","password":"123456","userType":"parent"}'
```

### 3. Android 應用測試
- 安裝新構建的 APK
- 使用測試用戶登入：
  - 家長：53004900 / 123456
  - 教練：1236874 / 123456

## 📊 監控和維護

### 1. 查看日誌
- 在 Railway 控制台的 "Deployments" 標籤
- 點擊最新的部署查看實時日誌

### 2. 性能監控
- 在 "Metrics" 標籤查看：
  - CPU 使用率
  - 內存使用情況
  - 網絡流量

### 3. 訪問統計
- 查看 API 調用次數
- 監控響應時間

## 🔒 安全注意事項

1. **HTTPS 自動啟用** - Railway 自動提供 SSL 證書
2. **環境變量安全** - 敏感信息不會暴露在代碼中
3. **API 密鑰驗證** - 每個請求都需要驗證
4. **訪問控制** - 可以設置 IP 白名單

## 💰 費用說明

### 免費額度
- 每月 $5 免費額度
- 適合開發和測試
- 小型應用完全免費

### 付費計劃
- 按使用量付費
- 無限制部署
- 更多資源和功能

## 🚨 常見問題

### Q: 部署失敗怎麼辦？
A: 檢查日誌，常見問題：
- 環境變量未設置
- package.json 格式錯誤
- 依賴安裝失敗

### Q: 如何更新代碼？
A: 推送代碼到 GitHub，Railway 會自動重新部署

### Q: 如何查看錯誤日誌？
A: 在 Railway 控制台的 "Deployments" 標籤查看

## 🎉 完成！

部署成功後，您的API服務器就可以供全球用戶使用了！

**下一步：**
1. 測試所有功能
2. 更新 Android 應用
3. 分發 APK 給用戶
4. 監控使用情況 