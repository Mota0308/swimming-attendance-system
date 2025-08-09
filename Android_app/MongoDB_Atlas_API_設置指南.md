# MongoDB Atlas Data API 免費設置指南

## 🎯 是的！您可以免費獲得MongoDB Atlas Data API

MongoDB Atlas提供免費的Data API訪問權限，無需下載CLI，直接通過Web界面即可設置。

## 🔧 設置步驟（完全免費）

### 步驟1: 登入MongoDB Atlas
1. 訪問 https://cloud.mongodb.com
2. 使用您的賬號登入
3. 選擇您的項目和集群 `Cluster0`

### 步驟2: 啟用Data API
1. 在左側菜單中找到 **Data API**
2. 點擊 **Enable the Data API**
3. 確認啟用（完全免費）

### 步驟3: 創建API Key
1. 點擊 **Create API Key**
2. 設置API Key名稱：`SwimmingApp`
3. 選擇權限：**Read and write**
4. 點擊 **Create API Key**
5. **重要**：複製生成的API Key（只顯示一次！）

### 步驟4: 獲取App ID
在Data API頁面，您會看到URL Endpoint：
```
https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1
```
其中 `data-xxxxx` 就是您的App ID

## 📱 更新應用配置

### 方法1: 修改代碼配置（推薦）

找到文件：`Android_app/app/src/main/java/com/swimming/attendance/network/CloudMongoDBManager.kt`

更新以下配置：
```kotlin
// 將這些值替換為您的實際配置
private const val APP_ID = "data-xxxxx" // 您的App ID
private const val API_KEY = "your-api-key" // 您的API Key
private const val USE_REAL_API = true // 改為true啟用真實API
```

### 方法2: 使用配置界面（未來版本）

我可以為您添加一個設置界面，讓您直接在應用中輸入API配置。

## 🎯 配置示例

### 假設您的配置是：
- **App ID**: `data-abcd1234`
- **API Key**: `xyz789abc123def456`

### 更新代碼：
```kotlin
private const val APP_ID = "data-abcd1234"
private const val API_KEY = "xyz789abc123def456"
private const val USE_REAL_API = true
```

## 🔧 數據庫結構設置

### 建議的數據庫結構：
```
數據庫名稱: test
集合名稱: students

學生文檔結構:
{
  "_id": ObjectId("..."),
  "name": "張小明",
  "phone": "0912345678",
  "age": "8歲",
  "location": "台北游泳池",
  "courseType": "初級班",
  "time": "10:00-11:00",
  "date": "2024-01-15",
  "pending": "",
  "pendingMonth": "",
  "attendance": "出席",
  "isPresent": true
}
```

### 在MongoDB Atlas中添加測試數據：
1. 進入 **Database** → **Browse Collections**
2. 選擇 `test` 數據庫
3. 選擇或創建 `students` 集合
4. 點擊 **Insert Document**
5. 添加上述格式的學生數據

## 🧪 測試API連接

### 使用curl測試（可選）：
```bash
curl -X POST \
  https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1/action/find \
  -H 'Content-Type: application/json' \
  -H 'api-key: your-api-key' \
  -d '{
    "collection": "students",
    "database": "test",
    "dataSource": "Cluster0"
  }'
```

## 📱 應用中的使用

### 當前狀態：
- ✅ **模擬數據模式** - 顯示示例學生資料
- ⚠️ **真實API待配置** - 需要您的API Key

### 配置後的效果：
- ✅ **真實數據連接** - 從您的MongoDB獲取實際數據
- ✅ **實時同步** - 數據庫更新後立即反映在應用中
- ✅ **完整功能** - 支持增刪改查操作

## 🔒 安全性說明

### API Key安全：
- ✅ **僅用於Data API** - 不是數據庫連接字符串
- ✅ **權限控制** - 可以限制讀寫權限
- ✅ **可以撤銷** - 隨時在Atlas中撤銷或重新生成
- ✅ **IP限制** - 可以設置IP白名單

### 最佳實踐：
- 🔐 **不要在代碼中硬編碼** - 考慮使用配置文件
- 🔄 **定期更換** - 定期更換API Key
- 📊 **監控使用** - 在Atlas中監控API使用情況

## 💰 費用說明

### 完全免費的部分：
- ✅ **Data API功能** - 無額外費用
- ✅ **API Key創建** - 無限制
- ✅ **基本請求** - 免費額度內
- ✅ **M0集群** - 512MB免費存儲

### 可能的費用（僅在超出免費額度時）：
- 📊 **大量API請求** - 超出免費額度後按使用量計費
- 💾 **存儲空間** - 超出512MB後按存儲量計費
- 🌐 **網絡傳輸** - 大量數據傳輸可能產生費用

### 對於您的應用：
- ✅ **完全免費** - 正常使用情況下不會產生費用
- ✅ **免費額度充足** - 足夠支持中小型應用

## 🚀 立即開始

### 現在就可以做的：
1. **登入MongoDB Atlas**
2. **啟用Data API**
3. **創建API Key**
4. **告訴我您的App ID和API Key**
5. **我幫您更新應用配置**

### 或者：
1. **使用當前版本** - 先體驗模擬數據功能
2. **稍後配置** - 隨時可以啟用真實API

## 🎯 配置完成後的效果

### 刷新按鈕將會：
1. **連接您的真實MongoDB數據庫**
2. **獲取實際的學生資料**
3. **顯示真實的出席記錄**
4. **支持實時數據更新**

### 您可以：
- 📝 **在MongoDB Atlas中管理數據**
- 📱 **在應用中查看最新數據**
- 🔄 **實時同步數據變更**
- 📊 **分析出席統計**

## 📞 需要幫助？

如果您：
1. **已經獲得了API Key** - 告訴我，我幫您配置
2. **遇到設置問題** - 我可以提供詳細指導
3. **想要配置界面** - 我可以添加設置功能
4. **需要其他功能** - 我可以繼續擴展

**總結：MongoDB Atlas Data API完全免費，設置簡單，無需CLI，直接通過Web界面即可完成！**
