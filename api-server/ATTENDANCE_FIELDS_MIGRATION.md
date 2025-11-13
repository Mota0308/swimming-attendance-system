# 出席狀態字段遷移說明

## 📋 遷移內容

### 目標
為 `students_timeslot` 集合的所有現有記錄添加 `isAttended` 和 `isLeave` 字段。

### 字段說明
- **isAttended**: Boolean 類型，表示學生是否出席（默認值：`false`）
- **isLeave**: Boolean 類型，表示學生是否請假（默認值：`false`）

### 狀態組合
- **正常狀態**: `isAttended: false`, `isLeave: false` （藍色顯示）
- **出席狀態**: `isAttended: true`, `isLeave: false` （綠色顯示）
- **請假狀態**: `isAttended: false`, `isLeave: true` （黃色顯示）

## 🔧 遷移腳本

### 文件位置
`api-server/migrate-attendance-fields.js`

### 執行方式
```bash
cd api-server
npm run migrate:attendance-fields
# 或
node migrate-attendance-fields.js
```

### 腳本功能
1. 查找所有缺少 `isAttended` 或 `isLeave` 字段的記錄
2. 為這些記錄添加缺失的字段，初始化為 `false`
3. 更新 `updatedAt` 時間戳
4. 驗證所有記錄都已包含這些字段

### 遷移結果
- ✅ **總記錄數**: 3 條
- ✅ **成功更新**: 3 條
- ✅ **失敗**: 0 條
- ✅ **驗證通過**: 所有記錄都已包含 `isAttended` 和 `isLeave` 字段

## 📊 數據庫結構

### students_timeslot 集合
```javascript
{
  _id: ObjectId,
  studentId: String,        // 8位數字學生ID
  studentPhone: String,
  location: String,
  courseType: String,
  classFormat: String,
  instructorType: String,
  instructorName: String,
  classTime: String,
  weekday: String,
  classDate: String,        // YYYY-MM-DD 格式
  // ✅ 新增字段
  isAttended: Boolean,      // 是否出席（默認: false）
  isLeave: Boolean,         // 是否請假（默認: false）
  // ... 其他字段
  createdAt: Date,
  updatedAt: Date
}
```

## 🔄 相關 API 端點

### 1. 更新出席狀態
- **端點**: `PUT /attendance/timeslot/status`
- **請求體**:
  ```json
  {
    "recordId": "ObjectId字符串",
    "isAttended": true,
    "isLeave": false
  }
  ```

### 2. 移動學生時段（拖拽）
- **端點**: `PUT /attendance/timeslot/move`
- **請求體**:
  ```json
  {
    "recordId": "ObjectId字符串",
    "classTime": "0900-1200",
    "classFormat": "幼兒私人班1:1",
    "instructorType": "固定泳班導師",
    "classDate": "2025-02-06",
    "location": "九龍公園游泳池"
  }
  ```

### 3. 更新日期/地點
- **端點**: `PUT /attendance/timeslot/date-location`
- **請求體**:
  ```json
  {
    "recordId": "ObjectId字符串",
    "classDate": "2025-02-07",
    "location": "美孚游泳池"
  }
  ```

## ✅ 驗證

### 檢查所有記錄
```javascript
// MongoDB shell
db.students_timeslot.find({
  $or: [
    { isAttended: { $exists: false } },
    { isLeave: { $exists: false } }
  ]
}).count()
// 應該返回 0
```

### 檢查字段值
```javascript
// MongoDB shell
db.students_timeslot.find({
  $or: [
    { isAttended: { $ne: false, $ne: true } },
    { isLeave: { $ne: false, $ne: true } }
  ]
}).count()
// 應該返回 0（所有值都應該是 true 或 false）
```

## 📝 注意事項

1. **向後兼容**: 新創建的記錄會自動包含 `isAttended: false` 和 `isLeave: false`
2. **數據完整性**: 遷移腳本只更新缺少字段的記錄，不會覆蓋現有值
3. **性能**: 遷移腳本使用批量更新，適合大量記錄
4. **安全性**: 遷移腳本會驗證所有記錄都已包含必要字段

## 🎯 前端功能

遷移完成後，前端出席管理模塊支持：
- ✅ 點擊學生卡片切換出席狀態（正常 → 出席 → 請假 → 正常）
- ✅ 拖拽學生到不同時段（同一日期和地點內）
- ✅ 修改學生的上課日期和地點

---

**遷移日期**: 2025-02-06
**狀態**: ✅ 已完成






