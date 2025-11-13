# 變更追蹤功能說明

## 📋 功能概述

在 `students_timeslot` 集合中添加了三個變更追蹤字段，用於標記記錄是否發生了日期、時間或地點的變更。

## ✅ 新增字段

### 1. `isChangeDate` - 日期變更標記
- **類型**: Boolean
- **初始值**: `false`
- **觸發條件**: 當 `classDate` 字段發生變化時，自動設置為 `true`
- **顯示符號**: 🔄

### 2. `isChangeTime` - 時間變更標記
- **類型**: Boolean
- **初始值**: `false`
- **觸發條件**: 當 `classTime` 字段發生變化時，自動設置為 `true`
- **顯示符號**: ✨

### 3. `isChangeLocation` - 地點變更標記
- **類型**: Boolean
- **初始值**: `false`
- **觸發條件**: 當 `location` 字段發生變化時，自動設置為 `true`
- **顯示符號**: 🔄

## 🔄 變更檢測邏輯

### 創建記錄時
```javascript
{
  isChangeDate: false,
  isChangeTime: false,
  isChangeLocation: false
}
```

### 更新記錄時
系統會比較新舊值，如果發現變化，自動設置對應標記為 `true`：

1. **更新 classDate**:
   - **限制**: 如果從空白（null/空字符串）變為非空白 → `isChangeDate` 保持為 `false`（不設置）
   - 如果原始 `classDate` 有值，新 `classDate` 也有值但不同 → `isChangeDate = true`
   - 如果原始 `classDate` 有值，新 `classDate` 變為空白 → `isChangeDate = true`
   - 如果值沒有改變 → 保持原有 `isChangeDate` 值

2. **更新 classTime**:
   - 如果 `originalRecord.classTime !== newClassTime` → `isChangeTime = true`

3. **更新 location**:
   - 如果 `originalRecord.location !== newLocation` → `isChangeLocation = true`

## 📊 計算邏輯更新

### `bookedMakeup` - 已約補堂
```javascript
// 計算 students_timeslot 中相同 studentId 的記錄中
// isChangeDate || isChangeTime || isChangeLocation 為 true 的記錄數量
if (slot.isChangeDate === true || slot.isChangeTime === true || slot.isChangeLocation === true) {
  stats.bookedMakeup++;
}
```

### `attendedMakeup` - 補堂已出席
```javascript
// 計算相同 studentId 的記錄中
// (isChangeDate || isChangeTime || isChangeLocation) && isAttended 為 true 的記錄數量
if (slot.isChangeDate === true || slot.isChangeTime === true || slot.isChangeLocation === true) {
  stats.bookedMakeup++;
  if (slot.isAttended === true) {
    stats.attendedMakeup++;
  }
}
```

## 🎨 前端顯示

### 出席管理模塊
在學生名字的右邊顯示對應的變更符號：

- **🔄**: 表示日期或地點發生了變更（`isChangeDate` 或 `isChangeLocation` 為 `true`）
- **✨**: 表示時間發生了變更（`isChangeTime` 為 `true`）

**顯示邏輯**:
```javascript
const changeIcons = [];
if (student.isChangeDate === true) {
  changeIcons.push('🔄');
}
if (student.isChangeTime === true) {
  changeIcons.push('✨');
}
if (student.isChangeLocation === true) {
  changeIcons.push('🔄');
}
// 顯示: "學生姓名 🔄 ✨"
```

## 🔧 實現細節

### 後端修改

1. **創建記錄** (`/create-student-bill`):
   - 在創建 `students_timeslot` 記錄時，初始化三個字段為 `false`

2. **更新記錄** (`/attendance/timeslot/move`):
   - 更新 `classTime`, `classDate`, `location` 時檢測變化
   - 如果值改變，設置對應標記為 `true`

3. **更新日期/地點** (`/attendance/timeslot/date-location`):
   - 更新 `classDate` 或 `location` 時檢測變化
   - 如果值改變，設置對應標記為 `true`

4. **獲取出席數據** (`/attendance/timeslots`):
   - 返回數據中包含 `isChangeDate`, `isChangeTime`, `isChangeLocation` 字段

5. **獲取學生堂數** (`/student-classes`):
   - 計算 `bookedMakeup` 和 `attendedMakeup` 時使用變更標記

### 前端修改

1. **出席管理模塊** (`attendance-board.js`):
   - 在學生卡片中顯示變更符號
   - 根據變更標記動態生成符號字符串

## 📝 數據遷移

對於現有的 `students_timeslot` 記錄，如果沒有這些字段，系統會：
- 在查詢時使用 `|| false` 確保默認值為 `false`
- 在更新時如果字段不存在，會保持原有值（如果存在）或使用默認值

## ⚠️ 注意事項

1. **標記持久性**: 一旦設置為 `true`，標記會保持為 `true`，除非手動重置
2. **多個變更**: 一個記錄可能同時有多個變更標記為 `true`
3. **符號顯示**: 如果同時有多個變更，會顯示多個符號（例如：`🔄 ✨`）
4. **計算邏輯**: `bookedMakeup` 和 `attendedMakeup` 的計算基於變更標記，而不是實際的補堂邏輯
5. **特殊限制**: 當 `classDate` 從空白（null/空字符串）變為非空白時，`isChangeDate` 保持為 `false`，因為這是首次設定日期，不是變更

## 🔍 使用場景

1. **補堂追蹤**: 通過變更標記識別哪些記錄是補堂記錄
2. **視覺提示**: 在出席管理界面中快速識別發生變更的記錄
3. **統計分析**: 統計補堂數量和補堂出席情況

---

**更新日期**: 2025-02-06
**狀態**: ✅ 已完成

