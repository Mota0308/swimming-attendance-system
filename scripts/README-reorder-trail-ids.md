# 重新排序 trail_bill 中的 trailId

這個腳本用於重新排序 `trail_bill` 集合中的所有 `trailId`，確保它們按照創建時間順序從 `T000001` 開始連續編號。

## 功能

1. ✅ 查詢所有 `trail_bill` 記錄
2. ✅ 按照創建時間（`createdAt`）排序，如果沒有 `createdAt` 則使用 `_id` 的時間戳
3. ✅ 重新分配 `trailId` 從 `T000001` 開始
4. ✅ 更新 `Counters` 集合中的計數器，確保後續生成的 `trailId` 不會重複
5. ✅ 移除舊格式的 `TrailID` 字段（如果存在）

## 使用方法

### 方法 1：使用 Node.js 直接執行（推薦）

```bash
# 設置環境變量（可選）
export MONGODB_URI="mongodb://your-connection-string"
export DB_NAME="your-database-name"

# 執行腳本
node scripts/reorder-trail-ids.js
```

### 方法 2：使用 Shell 腳本（Linux/Mac）

```bash
# 設置環境變量（可選）
export MONGODB_URI="mongodb://your-connection-string"
export DB_NAME="your-database-name"

# 執行腳本
chmod +x scripts/reorder-trail-ids.sh
./scripts/reorder-trail-ids.sh
```

### 方法 3：使用批處理文件（Windows）

```cmd
REM 設置環境變量（可選）
set MONGODB_URI=mongodb://your-connection-string
set DB_NAME=your-database-name

REM 執行腳本
scripts\reorder-trail-ids.bat
```

## 環境變量

| 變量名 | 說明 | 默認值 |
|--------|------|--------|
| `MONGODB_URI` | MongoDB 連接字符串 | `mongodb://localhost:27017` |
| `DB_NAME` | 數據庫名稱 | `swimming_attendance_system` |

## 注意事項

⚠️ **重要：執行此腳本前請務必備份數據庫！**

1. **數據備份**：建議先備份 `trail_bill` 集合
   ```bash
   mongodump --db=swimming_attendance_system --collection=trail_bill --out=backup/
   ```

2. **依賴檢查**：確保已安裝 `mongodb` 包
   ```bash
   cd api-server
   npm install mongodb
   ```

3. **權限要求**：確保 MongoDB 用戶有讀寫權限

4. **執行時間**：根據記錄數量，可能需要幾分鐘到幾小時

## 輸出示例

```
🔌 連接到 MongoDB...
✅ MongoDB 連接成功
📋 查詢所有 trail_bill 記錄...
✅ 找到 150 條記錄
🔄 按創建時間排序...
✅ 排序完成
🔍 檢查重複的 trailId...
✅ 沒有發現重複的 trailId
🔄 開始重新分配 trailId...
   📝 記錄 1: T000001 → T000001
   📝 記錄 2: T000015 → T000002
   📝 記錄 3: T000003 → T000003
   ...

💾 開始批量更新 120 條記錄...
✅ 批量更新完成:
   - 已更新: 120 條
   - 已匹配: 120 條

🔄 更新 Counters 集合中的計數器...
✅ 計數器已更新為: 150
   （下一個 trailId 將是: T000151）

✅ 重新排序完成！
📊 統計:
   - 總記錄數: 150
   - 已更新: 120
   - 無需更新: 30

✅ 腳本執行成功
```

## 故障排除

### 錯誤：未找到 Node.js
- **解決方案**：安裝 Node.js（建議 v14 或更高版本）

### 錯誤：Cannot find module 'mongodb'
- **解決方案**：
  ```bash
  cd api-server
  npm install mongodb
  ```

### 錯誤：MongoDB 連接失敗
- **解決方案**：
  1. 檢查 MongoDB 服務是否運行
  2. 檢查連接字符串是否正確
  3. 檢查網絡連接和防火牆設置

### 錯誤：權限不足
- **解決方案**：確保 MongoDB 用戶有 `readWrite` 權限

## 相關文件

- `scripts/reorder-trail-ids.js` - 主腳本文件
- `scripts/reorder-trail-ids.sh` - Linux/Mac Shell 腳本
- `scripts/reorder-trail-ids.bat` - Windows 批處理文件

