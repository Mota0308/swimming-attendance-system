# API 密鑰設置指南

## 概述
本項目已整合您提供的 API 密鑰，並實現了安全的配置管理。

## 已配置的 API 密鑰
- **Public API Key**: `ttdrcccy`
- **Private API Key**: `2b207365-cbf0-4e42-a3bf-f932c84557c4`

## 配置文件結構

### config.js (實際配置文件)
```javascript
module.exports = {
    mongodb: {
        uri: 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
        dbName: 'test',
        collectionName: 'students'
    },
    api: {
        publicKey: 'ttdrcccy',
        privateKey: '2b207365-cbf0-4e42-a3bf-f932c84557c4'
    },
    app: {
        name: '游泳課程出席管理系統',
        version: '1.0.0',
        unlockCodeKey: 'swimming_unlock_code'
    }
};
```

## 安全措施

### 1. 版本控制保護
- `config.js` 文件已添加到 `.gitignore`
- 敏感信息不會被提交到版本控制系統

### 2. 配置分離
- 使用 `config.example.js` 作為模板
- 實際配置存儲在 `config.js` 中

### 3. 模塊化設計
- 所有配置集中在一個文件中
- 便於管理和維護

## 使用方法

### 在 main.js 中使用配置
```javascript
const config = require('./config');

// 使用 MongoDB 配置
const MONGO_URI = config.mongodb.uri;
const DB_NAME = config.mongodb.dbName;

// 使用 API 密鑰
const publicKey = config.api.publicKey;
const privateKey = config.api.privateKey;
```

### 在 renderer.js 中使用配置
```javascript
// 通過 IPC 從主進程獲取配置
const config = await window.electronAPI.getConfig();
```

## 部署注意事項

### 開發環境
1. 確保 `config.js` 文件存在
2. 驗證 API 密鑰是否正確
3. 測試 MongoDB 連接

### 生產環境
1. 更新 MongoDB 連接字符串
2. 驗證 API 密鑰權限
3. 確保網絡安全配置

## 故障排除

### 常見問題
1. **配置文件未找到**: 確保 `config.js` 存在於項目根目錄
2. **API 密鑰無效**: 檢查密鑰格式和權限
3. **MongoDB 連接失敗**: 驗證連接字符串和網絡設置

### 調試步驟
1. 檢查控制台錯誤信息
2. 驗證配置文件格式
3. 測試 API 密鑰連接

## 更新 API 密鑰

如需更新 API 密鑰：
1. 編輯 `config.js` 文件
2. 更新相應的密鑰值
3. 重啟應用程序
4. 測試功能正常性

## 聯繫支持

如有任何問題，請聯繫開發團隊。 