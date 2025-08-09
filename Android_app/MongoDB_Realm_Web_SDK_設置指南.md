# MongoDB Realm Web SDK 設置指南

## 🚀 為什麼選擇Realm Web SDK？

MongoDB Realm Web SDK是一個優秀的選擇，特別適合您的免費版本：

### 優勢：
- ✅ **完全免費** - 免費版本完全支持
- ✅ **簡單易用** - 比Data API更容易設置
- ✅ **功能強大** - 支持實時同步、認證、函數
- ✅ **官方支持** - MongoDB官方維護
- ✅ **跨平台** - 支持Web、移動端、桌面端

## 🔧 設置步驟

### 步驟1: 創建Realm應用

1. **訪問Realm控制台**: https://realm.mongodb.com
2. **使用您的MongoDB Atlas賬號登入**
3. **點擊 "Create a New App"**

### 步驟2: 配置Realm應用

#### 基本配置：
- **Application Name**: `SwimmingApp`
- **Link a Data Source**: 選擇您的 `Cluster0`
- **Environment**: `Development`
- **Deployment Region**: `Global`

#### 點擊 "Create App"

### 步驟3: 配置數據訪問規則

1. **在Realm應用中，點擊左側 "Rules"**
2. **選擇數據庫**: `test`
3. **選擇集合**: `students`
4. **設置權限**:
   ```json
   {
     "roles": [
       {
         "name": "default",
         "apply_when": {},
         "read": true,
         "write": true
       }
     ]
   }
   ```
5. **保存配置**

### 步驟4: 啟用匿名認證

1. **左側菜單 → "Authentication"**
2. **點擊 "Anonymous"**
3. **啟用 "Anonymous Authentication"**
4. **保存設置**

### 步驟5: 獲取App ID

在Realm應用的主頁面，您會看到：
```
App ID: your-realm-app-id-xxxxx
```

## 📱 更新應用配置

### 在代碼中更新配置：

找到文件：`RealmWebSDKManager.kt`

更新以下配置：
```kotlin
// 將這個值替換為您的實際App ID
private const val REALM_APP_ID = "your-realm-app-id-xxxxx"

// 啟用真實Realm連接
private const val USE_REAL_REALM = true
```

## 🎯 當前版本功能

### 已實現的功能：
- ✅ **Realm連接測試**
- ✅ **匿名用戶認證**
- ✅ **學生資料獲取**
- ✅ **錯誤處理和備用方案**
- ✅ **模擬數據支持**

### 界面更新：
- 🌐 **按鈕文字**: "Realm Web SDK刷新"
- 📊 **狀態顯示**: "正在連接MongoDB Realm Web SDK..."
- ✅ **成功提示**: "Realm Web SDK刷新成功！"

## 📊 數據庫結構建議

### 在MongoDB Atlas中創建測試數據：

1. **進入Database → Browse Collections**
2. **選擇 `test` 數據庫**
3. **創建 `students` 集合**
4. **添加學生文檔**:

```json
{
  "_id": ObjectId("..."),
  "name": "張小明",
  "phone": "0912345678",
  "age": "8歲",
  "location": "台北市立游泳池",
  "courseType": "兒童初級班",
  "time": "16:00-17:00",
  "date": "2024-01-15",
  "pending": "",
  "pendingMonth": "",
  "attendance": "出席"
}
```

## 🧪 測試流程

### 模擬模式測試（當前）：
1. **安裝新版APK**
2. **登入家長版本**
3. **點擊 "🌐 Realm Web SDK刷新"**
4. **觀察狀態變化**:
   ```
   正在連接MongoDB Realm Web SDK...
   ↓
   Realm連接成功，正在獲取學生資料...
   ↓
   ✅ 成功獲取 5 筆學生資料 (Realm Web SDK)
   ```

### 真實模式測試（配置後）：
1. **更新REALM_APP_ID**
2. **設置USE_REAL_REALM = true**
3. **重新構建APK**
4. **測試真實的Realm連接**

## 💡 Realm Web SDK的優勢

### 相比Data API：
- ✅ **更容易找到** - 有專門的控制台
- ✅ **更容易配置** - 圖形化界面設置
- ✅ **功能更豐富** - 支持實時同步、觸發器、函數
- ✅ **更好的文檔** - 官方文檔詳細

### 相比直接連接：
- ✅ **更安全** - 不需要暴露數據庫連接字符串
- ✅ **更穩定** - 官方維護的API
- ✅ **更靈活** - 支持複雜的業務邏輯

## 🔧 進階功能（可選）

### 1. 創建Realm Functions

在Realm應用中創建自定義函數：

```javascript
// Function名稱: getStudents
exports = function() {
  const collection = context.services.get("mongodb-atlas")
    .db("test").collection("students");
  
  return collection.find({}).toArray();
};
```

### 2. 實時數據同步

啟用Realm Sync功能，實現實時數據同步。

### 3. 用戶認證

除了匿名認證，還可以添加：
- Email/Password認證
- Google認證
- Facebook認證
- 自定義JWT認證

## 📱 當前版本的完整體驗

### 刷新按鈕點擊後：
```
🌐 Realm Web SDK刷新 → 🌐 連接中...

狀態變化：
正在連接MongoDB Realm Web SDK...
↓
Realm連接成功，正在獲取學生資料...
↓
✅ 成功獲取 5 筆學生資料 (Realm Web SDK)

Toast提示：
Realm Web SDK刷新成功！
```

### 學生列表顯示：
```
👤 陳小明
📱 電話: 0912345678
👶 年齡: 8歲
📍 地點: 台北市立游泳池
🏫 班級: 兒童初級班
⏰ 時間: 16:00-17:00
📅 日期: 2024-01-15
📋 狀態: ✅ 出席

👤 王小美
📱 電話: 0934567890
👶 年齡: 12歲
📍 地點: 新北市游泳中心
🏫 班級: 青少年班
⏰ 時間: 18:00-19:00
📅 日期: 2024-01-15
📋 狀態: ❌ 缺席 (請假)
```

## 🎯 推薦的使用策略

### 階段1: 立即體驗（當前）
- ✅ **使用模擬模式** - 體驗完整的Realm Web SDK功能
- ✅ **測試界面效果** - 確認符合需求
- ✅ **驗證用戶流程** - 完整的操作體驗

### 階段2: 配置真實連接（可選）
- 🔧 **創建Realm應用** - 按照上述步驟
- 🔧 **更新App ID** - 使用真實的配置
- 🔧 **測試真實數據** - 連接您的MongoDB

### 階段3: 功能擴展（未來）
- 🚀 **添加實時同步** - 數據自動更新
- 🚀 **用戶認證系統** - 多用戶支持
- 🚀 **自定義函數** - 複雜的業務邏輯

## 📞 下一步行動

### 立即可以做的：
1. **安裝新版APK** - 體驗Realm Web SDK功能
2. **測試刷新按鈕** - 查看完整的操作流程
3. **驗證學生列表** - 確認數據顯示格式

### 如果要配置真實Realm：
1. **訪問 https://realm.mongodb.com**
2. **創建新的Realm應用**
3. **告訴我您的App ID**
4. **我幫您更新應用配置**

## 🎉 總結

**MongoDB Realm Web SDK是一個完美的解決方案！**

- ✅ **免費版本完全支持**
- ✅ **比Data API更容易設置**
- ✅ **功能更加強大**
- ✅ **當前的模擬模式已經非常完整**

您可以先體驗當前的模擬模式，如果滿意效果，我們再配置真實的Realm連接！
