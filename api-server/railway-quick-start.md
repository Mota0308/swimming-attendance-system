# 🚂 Railway 快速啟動指南

## ✅ 部署前檢查完成

您的項目已經通過所有檢查，可以立即部署到 Railway！

## 🚀 立即開始部署

### 步驟 1: 訪問 Railway
1. 打開瀏覽器，訪問：**https://railway.app**
2. 點擊 "Get Started" 或 "Sign Up"

### 步驟 2: 註冊賬號
1. 選擇 "Continue with GitHub"
2. 授權 Railway 訪問您的 GitHub 賬號
3. 完成郵箱驗證

### 步驟 3: 創建項目
1. 點擊 "New Project"
2. 選擇 "Deploy from GitHub repo"
3. 選擇您的 GitHub 倉庫
4. 在 "Root Directory" 中輸入：**`api-server`**
5. 點擊 "Deploy Now"

### 步驟 4: 配置環境變量
部署開始後，立即配置環境變量：

1. 點擊項目名稱進入設置
2. 選擇 "Variables" 標籤
3. 點擊 "New Variable" 添加以下變量：

```
MONGODB_URI=mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=test
API_PUBLIC_KEY=ttdrcccy
API_PRIVATE_KEY=2b207365-cbf0-4e42-a3bf-f932c84557c4
```

### 步驟 5: 獲取域名
1. 等待部署完成（狀態變為 "Deployed"）
2. 在 "Settings" 標籤找到 "Domains"
3. 複製 HTTPS URL，例如：
   `https://swimming-attendance-api-production.up.railway.app`

## 🧪 測試部署

部署完成後，使用以下命令測試：

```bash
# 設置您的實際URL
set API_URL=https://your-app-name.up.railway.app
node test-deployment.js
```

## 🔧 更新 Android 應用

1. 修改 `Android_app/app/src/main/java/com/swimming/attendance/network/APIConfig.kt`：
   ```kotlin
   private const val DEFAULT_BASE_URL = "https://your-app-name.up.railway.app"
   ```

2. 重新構建 APK：
   ```bash
   cd Android_app
   .\build_new_apk.bat
   ```

## 📱 測試用戶

部署完成後，使用以下用戶測試：

**家長版本：**
- 電話：`53004900`，密碼：`123456`
- 電話：`12345678`，密碼：`111111`

**教練版本：**
- 電話：`1236874`，密碼：`123456`

## 🎯 預期結果

部署成功後，您將獲得：
- ✅ 全球可訪問的 HTTPS API 服務器
- ✅ 自動擴展的雲端服務
- ✅ 實時監控和日誌
- ✅ 99.9% 服務可用性
- ✅ 免費額度（每月 $5）

## 🚨 重要提醒

1. **保存域名** - 部署完成後請保存您的 Railway 域名
2. **測試功能** - 部署後立即測試所有功能
3. **監控日誌** - 定期檢查 Railway 控制台的日誌
4. **備份數據** - 定期備份 MongoDB 數據

## 🎉 完成！

部署完成後，您的游泳課程出席管理系統就可以供全球用戶使用了！

**下一步：**
1. 測試所有功能
2. 更新 Android 應用
3. 分發 APK 給用戶
4. 開始使用！

---

📖 **詳細指南：** railway-deploy-guide.md
🔧 **故障排除：** 查看 Railway 控制台的日誌
💬 **需要幫助：** 查看 Railway 文檔或聯繫支持 