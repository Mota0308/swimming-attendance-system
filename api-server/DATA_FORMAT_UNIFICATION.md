# 數據格式統一說明

## 📋 問題描述

同一個賬單創建功能創建的數據有兩種不同的格式：

### 格式1：有具體日期的記錄
```javascript
{
  classDate: ISODate("2025-10-20T00:00:00.000Z"),  // Date 對象
  // 沒有 pendingYear, pendingMonth, pendingLessons, isPending
}
```

### 格式2：待約堂數記錄
```javascript
{
  // 沒有 classDate
  pendingYear: 2025,
  pendingMonth: 11,
  pendingLessons: 1,
  isPending: true
}
```

## ✅ 修復方案

### 1. 統一 classDate 格式
- **舊格式**：`ISODate("2025-10-20T00:00:00.000Z")` (Date 對象)
- **新格式**：`"2025-10-20"` (YYYY-MM-DD 字符串)

### 2. 統一數據結構
兩種記錄都包含 `classDate` 字段：
- **具體日期記錄**：`classDate: "2025-10-20"` (實際日期)
- **待約堂數記錄**：`classDate: "2025-11-01"` (該月第一天，標記為待約)

## 🔧 代碼修改

### 修改1：具體日期記錄
```javascript
// 舊代碼
const classDate = new Date(year, month - 1, day);
const timeslotRecord = {
    classDate: classDate,  // Date 對象
    // ...
};

// 新代碼
const classDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const timeslotRecord = {
    classDate: classDate,  // "YYYY-MM-DD" 字符串
    // ...
};
```

### 修改2：待約堂數記錄
```javascript
// 舊代碼
const pendingRecord = {
    // 沒有 classDate
    pendingYear: year,
    pendingMonth: month,
    pendingLessons: count,
    isPending: true,
    // ...
};

// 新代碼
const pendingRecord = {
    classDate: null,  // 待約堂數記錄的 classDate 為空白
    pendingYear: year,
    pendingMonth: month,
    pendingLessons: count,
    isPending: true,
    // ...
};
```

## 📊 統一後的數據格式

### 格式1：具體日期記錄
```javascript
{
  studentId: "00000001",
  studentPhone: "12345678",
  classDate: "2025-10-20",  // ✅ YYYY-MM-DD 字符串
  location: "美孚",
  courseType: "全年私人班",
  // ... 其他字段
  // 沒有 pendingYear, pendingMonth, pendingLessons, isPending
}
```

### 格式2：待約堂數記錄
```javascript
{
  studentId: "00000001",
  studentPhone: "12345678",
  classDate: null,  // ✅ 待約堂數記錄的 classDate 為空白
  location: "美孚",
  courseType: "全年私人班",
  pendingYear: 2025,
  pendingMonth: 11,
  pendingLessons: 1,
  isPending: true,
  // ... 其他字段
}
```

## 🎯 優勢

### 1. 格式統一
- ✅ 具體日期記錄：`classDate` 為 `YYYY-MM-DD` 字符串格式
- ✅ 待約堂數記錄：`classDate` 為 `null`（空白）
- ✅ 方便區分具體日期和待約記錄

### 2. 查詢優化
```javascript
// 可以統一使用 classDate 進行查詢
db.students_timeslot.find({ 
  classDate: { $gte: "2025-10-01", $lte: "2025-10-31" }
})

// 可以區分具體日期和待約記錄
db.students_timeslot.find({ 
  classDate: null,  // 待約記錄的 classDate 為 null
  isPending: true
})

// 查詢有具體日期的記錄
db.students_timeslot.find({ 
  classDate: { $ne: null }  // 有具體日期的記錄
})
```

### 3. 數據一致性
- ✅ 所有記錄都有相同的核心字段
- ✅ 日期格式統一，便於處理
- ✅ 向後兼容（保留 pendingYear, pendingMonth 等字段）

## ⚠️ 注意事項

### 1. 查詢邏輯更新
如果現有代碼使用 `classDate` 進行日期比較，需要更新：
```javascript
// 舊代碼（Date 對象）
const date = new Date("2025-10-20");
db.find({ classDate: date });

// 新代碼（字符串）
const date = "2025-10-20";
db.find({ classDate: date });
```

### 2. 日期範圍查詢
字符串格式的日期可以直接進行字符串比較：
```javascript
// 查詢 2025年10月的記錄
db.find({ 
  classDate: { 
    $gte: "2025-10-01", 
    $lte: "2025-10-31" 
  } 
})
```

### 3. 索引更新
`classDate` 索引仍然有效，因為字符串也可以建立索引：
```javascript
// 索引仍然有效
db.students_timeslot.createIndex({ classDate: 1 });
db.students_timeslot.createIndex({ studentId: 1, classDate: 1 });
```

## 📝 遷移建議

### 現有數據遷移
如果需要遷移現有數據，可以運行以下腳本：

```javascript
// 將 Date 對象轉換為 YYYY-MM-DD 字符串
db.students_timeslot.find({ classDate: { $type: "date" } }).forEach(doc => {
  const date = doc.classDate;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  db.students_timeslot.updateOne(
    { _id: doc._id },
    { $set: { classDate: dateString } }
  );
});

// 為待約記錄添加 classDate
db.students_timeslot.find({ 
  isPending: true,
  classDate: { $exists: false }
}).forEach(doc => {
  const year = doc.pendingYear;
  const month = String(doc.pendingMonth).padStart(2, '0');
  const dateString = `${year}-${month}-01`;
  
  db.students_timeslot.updateOne(
    { _id: doc._id },
    { $set: { classDate: dateString } }
  );
});
```

## ✅ 總結

### 修復內容
1. ✅ 具體日期記錄：`classDate` 格式為 `YYYY-MM-DD` 字符串
2. ✅ 待約堂數記錄：`classDate` 為 `null`（空白）
3. ✅ 所有記錄都包含 `classDate` 字段（具體日期或 null）

### 優勢
- ✅ 數據格式統一
- ✅ 查詢更方便
- ✅ 向後兼容

---

**修復日期**：2025-02-06
**狀態**：✅ 已完成

