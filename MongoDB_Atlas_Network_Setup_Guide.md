# MongoDB Atlas 網絡設置指南

## 設置允許所有IP訪問 (0.0.0.0/0)

### 步驟 1: 登錄 MongoDB Atlas
1. 訪問 [MongoDB Atlas](https://cloud.mongodb.com)
2. 使用你的賬號登錄

### 步驟 2: 選擇你的集群
1. 在儀表板中找到你的集群 `cluster0.0dhi0qc`
2. 點擊集群名稱進入詳細頁面

### 步驟 3: 配置網絡訪問
1. 在左側導航欄中點擊 **"Network Access"**
2. 點擊 **"ADD IP ADDRESS"** 按鈕

### 步驟 4: 添加IP地址
1. 選擇 **"Allow Access from Anywhere"** (允許從任何地方訪問)
2. 這會自動設置IP地址為 `0.0.0.0/0`
3. 點擊 **"Confirm"** 確認

### 步驟 5: 驗證設置
1. 在Network Access頁面中，你應該看到：
   - IP Address: `0.0.0.0/0`
   - Description: `Allow Access from Anywhere`
   - Status: `Active`

## 安全注意事項

⚠️ **重要警告**: 允許所有IP訪問會降低安全性，建議：

1. **僅在開發階段使用** `0.0.0.0/0`
2. **生產環境中** 應該只允許特定IP地址
3. **定期檢查** 網絡訪問設置
4. **使用強密碼** 和適當的用戶權限

## 替代方案（推薦用於生產環境）

### 方案 1: 只允許特定IP
```
你的Android設備IP: xxx.xxx.xxx.xxx/32
你的開發機器IP: yyy.yyy.yyy.yyy/32
```

### 方案 2: 使用VPN
1. 設置VPN服務器
2. 只允許VPN IP範圍訪問MongoDB Atlas

### 方案 3: 使用API服務器
1. 在雲端部署API服務器
2. 只允許API服務器IP訪問MongoDB
3. Android應用通過API服務器訪問數據

## 測試連接

設置完成後，可以使用以下方式測試：

### 1. 使用提供的測試腳本
```bash
cd Android_app/api-server
node test_mongodb_connection.js
```

### 2. 在Android應用中測試
- 打開Android應用
- 進入創建賬號頁面
- 查看日誌輸出，應該顯示連接成功

### 3. 檢查日誌
在Android Studio中查看Logcat，搜索標籤：
- `MongoDBManager`
- `CreateAccountActivity`

## 常見問題

### Q: 仍然無法連接？
A: 檢查以下項目：
1. 網絡訪問設置是否正確
2. 連接字符串是否正確
3. 用戶名和密碼是否正確
4. 防火牆設置

### Q: 連接成功但創建賬號失敗？
A: 檢查以下項目：
1. 數據庫權限設置
2. 集合是否存在
3. 應用程序日誌中的詳細錯誤信息

### Q: 如何查看詳細錯誤？
A: 在Android Studio中：
1. 打開Logcat
2. 過濾標籤：`MongoDBManager` 或 `CreateAccountActivity`
3. 查看詳細的錯誤堆疊信息

## 聯繫支持

如果問題仍然存在，請：
1. 收集完整的錯誤日誌
2. 截圖MongoDB Atlas設置
3. 提供Android應用的詳細錯誤信息 