# 学生堂数表格各列计算逻辑说明

本文档详细说明学生堂数表格中每一列的计算逻辑。

## 数据来源
- 数据表：`students_timeslot` 集合
- 支持筛选：按学期（semester）和年份（year）筛选

---

## 各列计算逻辑

### 1. **本期已購堂數** (`purchasedClasses` / `currentPurchasedClasses`)
**计算逻辑：**
- 根据学期/年份筛选后的记录数量
- 代码位置：`api-server/server.js:3402`
```javascript
const currentPurchasedClasses = timeslots.length;
```
- **说明**：如果指定了学期或年份筛选，只计算符合筛选条件的记录数量；否则计算该学生的所有记录数量。

---

### 2. **上期剩餘堂數** (`lastPeriodRemaining`)
**计算逻辑：**
- 上期已購堂數 - 上期已出席 - 上期已缺席
- 代码位置：`api-server/server.js:3630`
```javascript
lastPeriodRemaining = Math.max(0, lastPeriodPurchasedClasses - lastPeriodAttendedBooked - lastPeriodAbsences);
```
- **说明**：
  - `lastPeriodAttendedBooked` 已经包含了所有 `isAttended === true` 的记录（包括补堂已出席）
  - 不需要再减去 `lastPeriodAttendedMakeup`，否则会重复扣除
  - 使用 `Math.max(0, ...)` 确保结果不会小于 0
  - 只有在指定了学期和年份筛选时才会计算上期剩余堂数
  - 上一期的确定规则：
    - 如果当前学期不是第一期（1-2月），上一期是同一年的上一期
    - 如果当前学期是第一期（1-2月），上一期是上一年的最后一期（11-12月）
  - 如果没有指定学期/年份筛选，上期剩余堂数为 0

---

### 3. **本期剩餘堂數** (`currentPeriodRemaining`)
**计算逻辑：**
- 本期已購堂數 - 本期已出席 - 本期已缺席
- 代码位置：`api-server/server.js:3402`
```javascript
const currentPeriodRemaining = Math.max(0, currentPurchasedClasses - attendedBooked - absences);
```
- **说明**：
  - `attendedBooked` 已经包含了所有 `isAttended === true` 的记录（包括补堂已出席）
  - 不需要再减去 `attendedMakeup`，否则会重复扣除
  - 使用 `Math.max(0, ...)` 确保结果不会小于 0

---

### 4. **已定日子課堂** (`scheduledClasses`)
**计算逻辑：**
- 有 `classDate` 且 `isLeave !== true` 的记录数量
- 代码位置：`api-server/server.js:3382`
```javascript
const scheduledClasses = timeslots.filter(s => s.classDate && s.classDate !== '' && s.isLeave !== true).length;
```
- **说明**：已定日子课堂不包括请假的记录

---

### 5. **已出席** (`attendedBooked`)
**计算逻辑：**
- `isAttended === true` 的记录数量
- 代码位置：`api-server/server.js:3385`
```javascript
const attendedBooked = timeslots.filter(s => s.isAttended === true).length;
```

---

### 6. **缺席** (`absences`)
**计算逻辑：**
- `isAttended === false` 的记录数量
- 代码位置：`api-server/server.js:3394`
```javascript
const absences = timeslots.filter(s => s.isAttended === false).length;
```
- **说明**：
  - 只要 `isAttended === false` 就算缺席，不区分日期和请假状态

---

### 7. **本期請假堂數** (`currentPeriodLeaveRequests`)
**计算逻辑：**
- 本期资料格中 `isLeave === true` 的记录数量
- 代码位置：`api-server/server.js:3388`
```javascript
const currentPeriodLeaveRequests = timeslots.filter(s => s.isLeave === true).length;
```

---

### 8. **待約** (`pendingClasses`)
**计算逻辑：**
- `isPending === true` 的记录数量
- 代码位置：`api-server/server.js:3477`
```javascript
const pendingClasses = allPendingRecords.length;
```
- **说明**：
  - 如果指定了学期/年份筛选，会根据 `receiptImageUrl` 关联的 `classDate` 来判断待约记录是否属于指定学期/年份
  - 如果待约记录本身没有 `classDate`，会通过 `receiptImageUrl` 查找其他相同 `receiptImageUrl` 的记录来确定学期/年份

---

### 9. **可約補堂** (`bookableMakeup`)
**计算逻辑：**
- 上期剩餘堂數 + 本期請假堂數 + 待約
- 代码位置：`api-server/server.js:3642`
```javascript
const bookableMakeup = lastPeriodRemaining + currentPeriodLeaveRequests + pendingClasses;
```

---

### 10. **已約補堂** (`bookedMakeup`)
**计算逻辑：**
- `isChangeDate === true` 或 `isChangeLocation === true` 的记录数量（不包括 `isChangeTime`）
- 代码位置：`api-server/server.js:3480`
```javascript
const bookedMakeup = timeslots.filter(s => s.isChangeDate === true || s.isChangeLocation === true).length;
```
- **说明**：只计算改日期或改地点的补堂，不包括只改时间的补堂

---

### 11. **補堂已出席** (`attendedMakeup`)
**计算逻辑：**
- 已約補堂且已出席的记录数量（`isChangeDate === true` 或 `isChangeLocation === true`）&& `isAttended === true`
- 代码位置：`api-server/server.js:3391`
```javascript
const attendedMakeup = timeslots.filter(s => (s.isChangeDate === true || s.isChangeLocation === true) && s.isAttended === true).length;
```

---

### 12. **本期剩餘時數** (`currentPeriodRemainingTimeSlots`)
**计算逻辑：**
- （本期已購堂數 - 本期已出席 - 本期補堂已出席 - 本期已缺席）的剩餘資料格的 `total_time_slot` 的总和
- 代码位置：`api-server/server.js:3644-3662`
```javascript
// 找出剩余记录（排除已出席、补堂已出席、已缺席的记录）
const remainingRecords = timeslots.filter(s => {
    if (s.isAttended === true) return false;
    if ((s.isChangeDate === true || s.isChangeLocation === true) && s.isAttended === true) return false;
    if (s.classDate && s.isLeave !== true) {
        const classDateStr = formatDateToYYYYMMDD(s.classDate) || s.classDate;
        if (classDateStr < todayString && s.isAttended === false) return false;
    }
    return true;
});

// 计算剩余时数
const currentPeriodRemainingTimeSlots = remainingRecords.reduce((sum, slot) => {
    const timeSlot = slot.total_time_slot || 1;
    return sum + timeSlot;
}, 0);
```
- **说明**：
  - 剩余记录 = 本期已購堂數 - 已出席 - 補堂已出席 - 已缺席
  - 如果 `total_time_slot` 为空，默认为 1

---

### 13. **可補時數** (`bookableMakeupTimeSlots`)
**计算逻辑：**
- （上期剩餘堂數 + 本期請假堂數 + 待約）的對應資料格的 `total_time_slot` 的总和
- 代码位置：`api-server/server.js:3664-3699`
```javascript
// 找出可补时数对应的记录：
// 1. 本期请假的记录（isLeave === true）
// 2. 待约的记录（isPending === true）
// 3. 上期剩余的记录（如果有上一期数据）
let bookableMakeupSlots = [];

// 本期请假的记录
const currentLeaveSlots = timeslots.filter(s => s.isLeave === true);
bookableMakeupSlots.push(...currentLeaveSlots);

// 待约的记录
bookableMakeupSlots.push(...allPendingRecords);

// 上期剩余的记录（如果有上一期数据）
if (semesterFilter && yearFilter && lastPeriodRemaining > 0) {
    const lastPeriodRemainingRecords = lastPeriodTimeslots.filter(s => {
        // 排除已出席、补堂已出席、已缺席的记录
        // ...过滤逻辑
    });
    bookableMakeupSlots.push(...lastPeriodRemainingRecords);
}

// 计算可补时数
const bookableMakeupTimeSlots = bookableMakeupSlots.reduce((sum, slot) => {
    const timeSlot = slot.total_time_slot || 1;
    return sum + timeSlot;
}, 0);
```
- **说明**：
  - 可补时数对应的记录包括：
    1. 本期请假的记录
    2. 待约的记录
    3. 上期剩余的记录（如果有）
  - 如果 `total_time_slot` 为空，默认为 1

---

## 重要说明

### 日期处理
- 如果记录本身没有 `classDate`，系统会尝试通过 `receiptImageUrl` 查找其他相同 `receiptImageUrl` 的记录来确定日期
- 日期格式统一使用 `formatDateToYYYYMMDD()` 函数处理

### 学期定义
- 1-2月、3-4月、5-6月、7-8月、9-10月、11-12月

### 筛选条件
- 如果指定了学期或年份筛选，所有计算都基于筛选后的记录
- 如果没有指定筛选条件，计算基于该学生的所有记录

### 时数计算
- `total_time_slot` 字段用于计算时数
- 如果 `total_time_slot` 为空或未定义，默认为 1

---

## 相关代码文件
- 后端计算逻辑：`api-server/server.js` (第 3188-3762 行)
- 前端显示：`Web_app/main-app.js` (第 1773-1840 行)
- 字段标签映射：`Web_app/main-app.js` (第 2018-2032 行)

