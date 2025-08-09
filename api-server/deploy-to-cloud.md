# 🌐 雲端部署指南 - 讓所有用戶都能使用APP

## 📋 部署選項

### 選項1: Heroku (免費，推薦)
- **優點**: 免費、簡單、自動HTTPS
- **缺點**: 免費版有休眠限制
- **適合**: 小型應用、測試環境

### 選項2: Railway (推薦)
- **優點**: 免費額度大、部署簡單、自動HTTPS
- **缺點**: 免費版有使用限制
- **適合**: 中小型應用

### 選項3: Vercel (推薦)
- **優點**: 免費、快速、自動HTTPS、全球CDN
- **缺點**: 主要支持Node.js
- **適合**: 前端+API應用

### 選項4: 阿里雲/騰訊雲 (付費)
- **優點**: 穩定、高性能、完全控制
- **缺點**: 需要付費、配置複雜
- **適合**: 生產環境

## 🚀 Heroku 部署步驟

### 1. 準備文件
```bash
# 在api-server目錄創建以下文件
```

### 2. 創建 package.json
```json
{
  "name": "swimming-attendance-api",
  "version": "1.0.0",
  "description": "Swimming Attendance API Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^5.7.0",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 3. 創建 Procfile
```
web: node server.js
```

### 4. 部署到Heroku
```bash
# 安裝Heroku CLI
npm install -g heroku

# 登錄Heroku
heroku login

# 創建應用
heroku create swimming-attendance-api

# 部署
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# 查看日誌
heroku logs --tail
```

## 🚀 Railway 部署步驟

### 1. 準備文件
- 確保有 package.json
- 確保有 server.js

### 2. 部署步驟
1. 註冊 Railway 賬號
2. 連接 GitHub 倉庫
3. 選擇 api-server 目錄
4. 自動部署

## 🔧 修改Android應用配置

部署完成後，修改Android應用的API配置：

```kotlin
// 在 APIConfig.kt 中
private const val DEFAULT_BASE_URL = "https://your-app-name.herokuapp.com"
```

## 📱 測試部署

### 1. 測試API健康檢查
```bash
curl https://your-app-name.herokuapp.com/health
```

### 2. 測試登入功能
```bash
curl -X POST https://your-app-name.herokuapp.com/auth/login \
  -H "Content-Type: application/json" \
  -H "X-API-Public-Key: ttdrcccy" \
  -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
  -d '{"phone":"53004900","password":"123456","userType":"parent"}'
```

## 🔒 安全考慮

### 1. 環境變量
```bash
# 設置MongoDB連接字符串
heroku config:set MONGODB_URI="your-mongodb-connection-string"

# 設置API密鑰
heroku config:set API_PUBLIC_KEY="your-public-key"
heroku config:set API_PRIVATE_KEY="your-private-key"
```

### 2. 修改server.js使用環境變量
```javascript
const MONGO_URI = process.env.MONGODB_URI || 'your-local-mongodb-uri';
const PUBLIC_KEY = process.env.API_PUBLIC_KEY || 'ttdrcccy';
const PRIVATE_KEY = process.env.API_PRIVATE_KEY || '2b207365-cbf0-4e42-a3bf-f932c84557c4';
```

## 📊 監控和維護

### 1. 查看應用狀態
```bash
heroku ps
heroku logs --tail
```

### 2. 重啟應用
```bash
heroku restart
```

### 3. 擴展應用
```bash
heroku ps:scale web=1
```

## 🎯 最佳實踐

1. **使用HTTPS**: 所有雲端平台都自動提供HTTPS
2. **環境變量**: 敏感信息使用環境變量
3. **日誌監控**: 定期檢查應用日誌
4. **備份數據**: 定期備份MongoDB數據
5. **性能優化**: 根據需要調整資源配置 