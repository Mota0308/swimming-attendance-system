# MongoDB連接測試說明

## 🎯 目標
測試Android應用是否能夠成功連接到您的MongoDB雲端資料庫，並將創建的賬號資料保存到`test`數據庫的`Student_account`集合中。

## 📱 測試步驟

### 1. 安裝最新APK
```
app\build\outputs\apk\release\app-release.apk
```
文件大小：6.3MB（包含MongoDB驅動程序）

### 2. 測試創建賬號功能

1. **打開應用**
   - 啟動游泳課程出席管理系統應用

2. **選擇用戶類型**
   - 選擇"家長版本"或"教練版本"

3. **創建新賬號**
   - 輸入電話號碼（例如：0912345678）
   - 輸入密碼（至少6位）
   - 點擊"創建賬號"按鈕

4. **檢查結果**
   - 如果成功，會顯示"賬號創建成功"
   - 如果失敗，會顯示錯誤信息

### 3. 測試登入功能

1. **使用剛創建的賬號登入**
   - 輸入相同的電話號碼和密碼
   - 點擊"登入"按鈕

2. **檢查登入結果**
   - 成功登入會進入主界面
   - 失敗會顯示錯誤信息

## 🔍 驗證MongoDB連接

### 方法一：檢查MongoDB Atlas控制台

1. **登入MongoDB Atlas**
   - 訪問 https://cloud.mongodb.com
   - 使用您的賬號登入

2. **查看數據庫**
   - 進入您的Cluster
   - 點擊"Browse Collections"
   - 選擇`test`數據庫
   - 查看`Student_account`集合

3. **檢查數據**
   - 應該能看到新創建的用戶記錄
   - 記錄包含：phone、password、userType、createdAt

### 方法二：使用MongoDB Compass

1. **連接字符串**
   ```
   mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```

2. **查看數據**
   - 連接到`test`數據庫
   - 查看`Student_account`集合

## ⚠️ 常見問題

### 問題1：網絡連接錯誤
**症狀**：顯示"網絡錯誤"或"連接失敗"
**解決方案**：
- 檢查手機網絡連接
- 確保MongoDB Atlas網絡訪問設置正確
- 檢查防火牆設置

### 問題2：認證失敗
**症狀**：顯示"登入失敗"或"賬號不存在"
**解決方案**：
- 檢查MongoDB用戶名和密碼是否正確
- 確認數據庫名稱是否為`test`
- 確認集合名稱是否為`Student_account`

### 問題3：應用崩潰
**症狀**：應用突然關閉
**解決方案**：
- 檢查Android版本是否支持（需要Android 8.0+）
- 確保有足夠的存儲空間
- 重新安裝應用

## 📊 預期結果

### 成功的數據結構
```json
{
  "_id": ObjectId("..."),
  "phone": "0912345678",
  "password": "123456",
  "userType": "parent",
  "createdAt": 1703123456789
}
```

### 成功的用戶體驗
1. 創建賬號時顯示"賬號創建成功"
2. 登入時成功進入主界面
3. MongoDB中能看到新創建的記錄

## 🔧 技術配置

### MongoDB連接配置
- **連接字符串**：已配置在`MongoDBService.kt`中
- **數據庫名稱**：`test`
- **集合名稱**：`Student_account`
- **網絡安全**：已配置允許MongoDB連接

### Android配置
- **網絡權限**：已添加INTERNET和ACCESS_NETWORK_STATE
- **網絡安全配置**：已配置允許MongoDB域名
- **MongoDB驅動**：已添加mongodb-driver-sync依賴

## 📞 技術支持

如果遇到問題，請檢查：
1. MongoDB Atlas是否正常運行
2. 網絡連接是否穩定
3. 應用權限是否正確授予
4. 數據庫和集合是否存在

## 🎉 成功標誌

當您看到以下情況時，表示MongoDB連接成功：
- ✅ 應用能夠創建新賬號
- ✅ 應用能夠登入現有賬號
- ✅ MongoDB中出現新的用戶記錄
- ✅ 沒有網絡錯誤或連接失敗 