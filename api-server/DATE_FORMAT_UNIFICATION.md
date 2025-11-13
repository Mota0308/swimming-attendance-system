# 日期格式統一說明

## 📋 更新內容

已將以下字段的返回數據格式統一為 **YYYY-MM-DD** 字符串格式：

1. **Student_account** 集合中的 `birthday` 字段
2. **trail_bill** 集合中的 `trialDate` 字段
3. **Coach_roster** 集合中的 `date` 字段

## ✅ 修改內容

### 1. **日期格式化輔助函數**

在 `api-server/server.js` 中添加了 `formatDateToYYYYMMDD()` 函數：

```javascript
function formatDateToYYYYMMDD(dateValue) {
    if (!dateValue) return null;
    
    // 如果已經是 YYYY-MM-DD 格式的字符串，直接返回
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }
    
    // 如果是 Date 對象，轉換為 YYYY-MM-DD
    let date;
    if (dateValue instanceof Date) {
        date = dateValue;
    } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
    } else {
        return null;
    }
    
    // 檢查日期是否有效
    if (isNaN(date.getTime())) {
        return null;
    }
    
    // 格式化為 YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}
```

### 2. **修改的 API 端點**

#### ✅ GET /students（Student_account 數據）
- **位置**：`api-server/server.js` 第 2551-2607 行
- **修改**：格式化 `birthday` 字段為 YYYY-MM-DD
- **影響**：數據管理模塊的"正式會員"標籤頁

```javascript
// ✅ 格式化 birthday 字段為 YYYY-MM-DD
const formattedStudents = students.map(student => {
  const formatted = { ...student };
  if (formatted.birthday) {
    formatted.birthday = formatDateToYYYYMMDD(formatted.birthday);
  }
  return formatted;
});
```

#### ✅ GET /roster（Coach_roster 數據）
- **位置**：`api-server/server.js` 第 890-993 行
- **修改**：格式化 `date` 字段為 YYYY-MM-DD
- **影響**：教練更表管理模塊

```javascript
// ✅ 格式化 date 字段為 YYYY-MM-DD
date: formatDateToYYYYMMDD(item.date) || item.date,
```

#### ✅ GET /trial-bill/all（trail_bill 數據）
- **位置**：`api-server/server.js` 第 2952-2993 行
- **修改**：格式化 `trialDate` 字段為 YYYY-MM-DD
- **影響**：數據管理模塊的"非正式會員"標籤頁

```javascript
// ✅ 格式化 trialDate 字段為 YYYY-MM-DD
const formattedTrials = trials.map(trial => {
  const formatted = { ...trial };
  if (formatted.trialDate) {
    formatted.trialDate = formatDateToYYYYMMDD(formatted.trialDate);
  }
  return formatted;
});
```

#### ✅ GET /trial-bill/:trailId（trail_bill 數據）
- **位置**：`api-server/server.js` 第 2996-3040 行
- **修改**：格式化 `trialDate` 字段為 YYYY-MM-DD
- **影響**：根據 TrailID 查詢試堂資料

```javascript
// ✅ 格式化 trialDate 字段為 YYYY-MM-DD
const formattedTrials = trials.map(trial => {
  const formatted = { ...trial };
  if (formatted.trialDate) {
    formatted.trialDate = formatDateToYYYYMMDD(formatted.trialDate);
  }
  return formatted;
});
```

## 📊 數據格式對比

### 修改前
- `birthday`: Date 對象或 ISO 字符串（例如：`2025-01-15T00:00:00.000Z`）
- `trialDate`: Date 對象或 ISO 字符串（例如：`2025-01-15T00:00:00.000Z`）
- `date`: Date 對象或 ISO 字符串（例如：`2025-01-15T00:00:00.000Z`）

### 修改後
- `birthday`: YYYY-MM-DD 字符串（例如：`2025-01-15`）
- `trialDate`: YYYY-MM-DD 字符串（例如：`2025-01-15`）
- `date`: YYYY-MM-DD 字符串（例如：`2025-01-15`）

## 🔍 驗證方法

1. **Student_account birthday**：
   - 打開數據管理模塊 → "正式會員"標籤
   - 檢查 `birthday` 字段是否為 YYYY-MM-DD 格式

2. **trail_bill trialDate**：
   - 打開數據管理模塊 → "非正式會員"標籤
   - 檢查 `trialDate` 字段是否為 YYYY-MM-DD 格式

3. **Coach_roster date**：
   - 打開教練更表管理模塊
   - 檢查 `date` 字段是否為 YYYY-MM-DD 格式

## ⚠️ 注意事項

1. **數據庫存儲格式**：
   - 數據庫中仍然存儲為 Date 對象
   - 只在 API 返回時格式化為 YYYY-MM-DD 字符串

2. **向後兼容**：
   - 如果日期已經是 YYYY-MM-DD 格式，直接返回
   - 如果日期為 null 或無效，返回 null

3. **前端處理**：
   - 前端接收到的日期都是 YYYY-MM-DD 格式
   - 可以直接用於 `<input type="date">` 元素

## 🔧 技術細節

### 格式化邏輯
1. 檢查值是否為 null 或 undefined
2. 如果已經是 YYYY-MM-DD 格式字符串，直接返回
3. 如果是 Date 對象，轉換為 YYYY-MM-DD
4. 如果是字符串，先轉換為 Date 對象，再格式化
5. 驗證日期有效性，無效日期返回 null

### 性能考慮
- 格式化函數輕量級，對性能影響極小
- 只在返回數據時格式化，不影響數據庫查詢性能

---

**更新日期**：2025-02-06
**狀態**：✅ 已完成
























