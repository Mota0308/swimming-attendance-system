# Student_bill 數據遷移總結

## 📋 遷移概述

已成功為所有現有學生創建 `Student_bill` 記錄，基於 `students_timeslot` 計算統計數據。

## ✅ 遷移結果

### 數據統計
- **總學生數**: 4
- **創建記錄**: 4
- **更新記錄**: 0
- **失敗**: 0
- **成功率**: 100%

### 驗證結果
- ✅ `Student_bill` 總記錄數: 4
- ✅ 所有有 `studentId` 的學生都已創建對應的 `Student_bill` 記錄
- ✅ `studentId` 唯一索引已創建

### 統計數據摘要
- **總已購堂數**: 11
- **總已定日子課堂**: 10
- **總已出席**: 0
- **總缺席**: 10
- **總請假次數**: 1
- **總已約補堂**: 0
- **總補堂已出席**: 0

## 📊 數據結構

每個 `Student_bill` 記錄包含：

```javascript
{
  studentId: String,        // 學生ID（8位數字，唯一索引）
  name: String,              // 學生姓名
  purchasedClasses: Number, // 已購堂數（總記錄數量）
  scheduledClasses: Number, // 已定日子課堂（classDate 有內容的記錄數量）
  attendedBooked: Number,  // 已出席（isAttended 為 true 的記錄數量）
  absences: Number,         // 缺席（過去日期 && isAttended 為 false）
  leaveRequests: Number,    // 請假次數（isLeave 為 true 的記錄數量）
  bookedMakeup: Number,     // 已約補堂（變更標記為 true 的記錄數量）
  attendedMakeup: Number,   // 補堂已出席（變更標記 && isAttended 為 true）
  createdAt: Date,          // 創建時間
  updatedAt: Date          // 更新時間
}
```

## 🔧 計算邏輯

### 1. purchasedClasses（已購堂數）
- 計算方式：`students_timeslot` 中相同 `studentId` 的總記錄數量

### 2. scheduledClasses（已定日子課堂）
- 計算方式：`students_timeslot` 中相同 `studentId` 且 `classDate` 有內容且 `isLeave` 為 `false` 的記錄數量

### 3. attendedBooked（已出席）
- 計算方式：`students_timeslot` 中相同 `studentId` 且 `isAttended` 為 `true` 的記錄數量

### 4. absences（缺席）
- 計算方式：`students_timeslot` 中相同 `studentId` 且 `classDate` 為過去日期（小於今天）且 `isAttended` 不為 `true` 的記錄數量

### 5. leaveRequests（請假次數）
- 計算方式：`students_timeslot` 中相同 `studentId` 且 `isLeave` 為 `true` 的記錄數量

### 6. bookedMakeup（已約補堂）
- 計算方式：`students_timeslot` 中相同 `studentId` 且 `isChangeDate || isChangeTime || isChangeLocation` 為 `true` 的記錄數量

### 7. attendedMakeup（補堂已出席）
- 計算方式：`students_timeslot` 中相同 `studentId` 且 `(isChangeDate || isChangeTime || isChangeLocation) && isAttended` 為 `true` 的記錄數量

## 🔄 自動更新機制

系統會在以下情況自動更新 `Student_bill`：

1. **創建賬單時** (`/create-student-bill`)
   - 創建 `students_timeslot` 記錄後，自動計算並更新 `Student_bill`

2. **更新出席狀態時** (`/attendance/timeslot/status`)
   - 更新 `isAttended` 或 `isLeave` 後，自動更新對應學生的 `Student_bill`

3. **移動學生時段時** (`/attendance/timeslot/move`)
   - 移動學生時段後，自動更新對應學生的 `Student_bill`

4. **更新日期/地點時** (`/attendance/timeslot/date-location`)
   - 更新日期或地點後，自動更新對應學生的 `Student_bill`

## 📝 索引配置

### Student_bill 集合索引
- **studentId**: 唯一索引（`idx_studentId_unique`）
  - 確保每個學生只有一條 `Student_bill` 記錄
  - 用於快速查詢和更新

## 🚀 使用方式

### 查詢學生堂數
```javascript
GET /student-classes?page=1&limit=50
```

返回數據直接從 `Student_bill` 集合讀取，無需實時計算，性能更優。

### 遷移腳本
```bash
npm run migrate:student-bill
# 或
node migrate-student-bill.js
```

## ⚠️ 注意事項

1. **數據一致性**：`Student_bill` 的數據是基於 `students_timeslot` 計算的，確保 `students_timeslot` 數據正確
2. **自動更新**：系統會自動更新 `Student_bill`，無需手動維護
3. **唯一性**：每個 `studentId` 只能有一條 `Student_bill` 記錄（通過唯一索引保證）
4. **空數據處理**：如果學生沒有時段記錄，所有統計值為 0

## 📅 遷移日期

**執行時間**: 2025-02-06
**狀態**: ✅ 已完成
**數據庫**: test

---

**相關文檔**:
- `api-server/migrate-student-bill.js` - 遷移腳本源代碼
- `api-server/create-indexes.js` - 索引創建腳本
- `api-server/STUDENT_BILL_COLLECTION_ANALYSIS.md` - Student_bill 集合分析

























