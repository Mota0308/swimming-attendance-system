# 🚂 Railway 部署指南

## 📋 Railway 簡介
Railway 是一個現代化的雲端平台，提供簡單的部署體驗和免費額度。

## 🚀 部署步驟

### 1. 註冊 Railway 賬號
1. 訪問 https://railway.app
2. 使用 GitHub 賬號註冊
3. 完成驗證

### 2. 創建新項目
1. 點擊 "New Project"
2. 選擇 "Deploy from GitHub repo"
3. 選擇您的 GitHub 倉庫
4. 選擇 `api-server` 目錄

### 3. 配置環境變量
在 Railway 項目設置中添加以下環境變量：

```
MONGODB_URI=mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=test
API_PUBLIC_KEY=ttdrcccy
API_PRIVATE_KEY=2b207365-cbf0-4e42-a3bf-f932c84557c4
```

### 4. 部署
1. Railway 會自動檢測 package.json
2. 自動安裝依賴
3. 自動啟動服務

### 5. 獲取域名
部署完成後，Railway 會提供一個 HTTPS 域名，例如：
`https://swimming-attendance-api-production.up.railway.app`

## 🔧 修改 Android 應用

部署完成後，修改 Android 應用的 API 配置：

```kotlin
// 在 APIConfig.kt 中
private const val DEFAULT_BASE_URL = "https://your-app-name.up.railway.app"
```

## 🧪 測試部署

### 1. 健康檢查
```bash
curl https://your-app-name.up.railway.app/health
```

### 2. 登入測試
```bash
curl -X POST https://your-app-name.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -H "X-API-Public-Key: ttdrcccy" \
  -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
  -d '{"phone":"53004900","password":"123456","userType":"parent"}'
```

## 📊 監控

### 1. 查看日誌
在 Railway 控制台可以實時查看應用日誌

### 2. 性能監控
Railway 提供 CPU、內存使用情況監控

### 3. 訪問統計
可以查看 API 調用次數和響應時間

## 💰 費用

### 免費額度
- 每月 $5 免費額度
- 適合小型應用和測試

### 付費計劃
- 按使用量付費
- 無限制部署

## 🔒 安全

### 1. HTTPS
Railway 自動提供 HTTPS 證書

### 2. 環境變量
敏感信息通過環境變量管理

### 3. 訪問控制
可以設置 IP 白名單

## 🎯 優點

1. **簡單部署**: 一鍵部署，無需複雜配置
2. **自動擴展**: 根據流量自動調整資源
3. **全球CDN**: 快速響應全球用戶
4. **實時監控**: 提供詳細的性能監控
5. **免費額度**: 適合開發和測試

## 🚨 注意事項

1. **免費額度限制**: 注意每月使用量
2. **休眠機制**: 免費版可能會有休眠
3. **數據備份**: 定期備份 MongoDB 數據
4. **監控日誌**: 定期檢查應用日誌 