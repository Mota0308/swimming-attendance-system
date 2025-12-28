# 學生堂數計算邏輯說明

## 計算邏輯詳解

### 1. **總堂數 (purchasedClasses / currentPurchasedClasses)**
```javascript
currentPurchasedClasses = timeslots.length
```
- **定義**：本期已購堂數（根據學期/年份過濾後的記錄總數）
- **數據來源**：`students_timeslot` 集合中，符合當前學期/年份過濾條件的記錄數量
- **計算方式**：直接計算過濾後的 `timeslots` 數組長度

### 2. **已定日子課堂 (scheduledClasses)**
```javascript
scheduledClasses = timeslots.filter(s => 
    s.classDate && s.classDate !== '' && s.isLeave !== true
).length
```
- **定義**：已經安排了具體日期的課堂（不包括請假）
- **條件**：
  - 必須有 `classDate`（不為空）
  - `isLeave !== true`（不是請假記錄）

### 3. **已出席 (attendedBooked)**
```javascript
attendedBooked = timeslots.filter(s => s.isAttended === true).length
```
- **定義**：已經出席的課堂（包括普通已出席和補堂已出席）
- **條件**：`isAttended === true`
- **注意**：這個數字包含了所有已出席的記錄，包括補堂已出席

### 4. **缺席 (absences)**
```javascript
absences = timeslots.filter(s => s.isAttended === false && s.isLeave !== true).length
```
- **定義**：已缺席的課堂（不包括請假）
- **條件**：`isAttended === false` 且 `isLeave !== true`
- **注意**：請假記錄不應被計入缺席，因為請假可以補堂

### 5. **請假堂數 (currentPeriodLeaveRequests)**
```javascript
currentPeriodLeaveRequests = timeslots.filter(s => s.isLeave === true).length
```
- **定義**：本期請假的堂數
- **條件**：`isLeave === true`

### 6. **剩餘堂數 (currentPeriodRemaining)**
```javascript
currentPeriodRemaining = Math.max(0, 
    currentPurchasedClasses - attendedBooked - absences
)
```
- **定義**：本期剩餘可用的堂數
- **計算公式**：本期已購堂數 - 已出席 - 缺席
- **邏輯說明**：
  - 不包括請假的記錄（請假不減少剩餘堂數）
  - 不包括待約的記錄（待約屬於剩餘堂數的一部分）
  - 使用 `Math.max(0, ...)` 確保不會出現負數

### 7. **待約 (pendingClasses)**
```javascript
pendingClasses = allPendingRecords.filter(...).length
```
- **定義**：尚未安排具體日期的課堂（`isPending === true`）
- **數據來源**：查詢 `students_timeslot` 中 `isPending === true` 的記錄

### 8. **補堂相關數據**

#### 8.1 **已約補堂 (bookedMakeup)**
```javascript
bookedMakeup = timeslots.filter(s => 
    s.isChangeDate === true || s.isChangeLocation === true
).length
```
- **定義**：已經約定的補堂（改日期或改地點）
- **條件**：`isChangeDate === true` 或 `isChangeLocation === true`

#### 8.2 **補堂已出席 (attendedMakeup)**
```javascript
attendedMakeup = timeslots.filter(s => 
    (s.isChangeDate === true || s.isChangeLocation === true) && 
    s.isAttended === true
).length
```
- **定義**：補堂已經出席的數量
- **條件**：是補堂（`isChangeDate === true` 或 `isChangeLocation === true`）且已出席（`isAttended === true`）
- **關係**：`attendedMakeup` 是 `attendedBooked` 的子集

#### 8.3 **可約補堂 (bookableMakeup)**
```javascript
bookableMakeup = lastPeriodRemaining + currentPeriodLeaveRequests + pendingClasses
```
- **定義**：可以安排的補堂數量
- **計算公式**：上期剩餘堂數 + 本期請假堂數 + 待約堂數

### 9. **上期剩餘堂數 (lastPeriodRemaining)**
```javascript
// 需要查詢上一期的記錄
lastPeriodRemaining = Math.max(0, 
    lastPeriodPurchasedClasses - lastPeriodAttendedBooked - lastPeriodAbsences
)
```
- **定義**：上一期剩餘的堂數
- **計算方式**：上期已購堂數 - 上期已出席 - 上期缺席
- **條件**：需要指定學期和年份才能計算，否則為 0

### 10. **剩餘時數 (currentPeriodRemainingTimeSlots)**
```javascript
// ⚠️ 邏輯問題：過濾條件有冗餘
const remainingRecords = timeslots.filter(s => {
    if (s.isAttended === true) return false;  // 排除已出席
    if ((s.isChangeDate === true || s.isChangeLocation === true) && s.isAttended === true) return false;  // 這行永遠不會執行
    if (s.isAttended === false) return false;  // 排除缺席
    return true;  // 剩下的是 isAttended === null/undefined 的記錄
});

currentPeriodRemainingTimeSlots = remainingRecords.reduce((sum, slot) => {
    return sum + (slot.total_time_slot || 1);
}, 0);
```
- **定義**：本期剩餘的時數（以分鐘為單位）
- **實際邏輯**：計算所有 `isAttended` 為 `null` 或 `undefined` 的記錄的 `total_time_slot` 總和
- **問題**：第二個條件永遠不會執行，因為所有 `isAttended === true` 的記錄已經被第一個條件排除了

### 11. **可補時數 (bookableMakeupTimeSlots)**
```javascript
bookableMakeupTimeSlots = (
    本期請假記錄 + 待約記錄 + 上期剩餘記錄
).reduce((sum, slot) => {
    return sum + (slot.total_time_slot || 1);
}, 0)
```
- **定義**：可以補的時數
- **組成**：
  1. 本期請假的記錄（`isLeave === true`）
  2. 待約的記錄（`isPending === true`）
  3. 上期剩餘的記錄（上期中 `isAttended` 為 `null/undefined` 的記錄）

## 📊 數據關係說明

### 字段之間的關係

```
currentPurchasedClasses (本期已購堂數)
  = scheduledClasses (已定日子課堂) + pendingClasses (待約) + 其他未分類記錄

scheduledClasses (已定日子課堂)
  = attendedBooked (已出席) + absences (缺席) + 尚未上課的已定日子課堂

attendedBooked (已出席)
  = 普通已出席 + attendedMakeup (補堂已出席)

currentPeriodRemaining (本期剩餘堂數)
  = currentPurchasedClasses - attendedBooked - absences
  = 尚未上課狀態的記錄數（isAttended === null/undefined）

bookableMakeup (可約補堂)
  = lastPeriodRemaining (上期剩餘) + currentPeriodLeaveRequests (本期請假) + pendingClasses (待約)
```

## ⚠️ 潛在的邏輯矛盾和問題

### 1. **剩餘時數計算邏輯冗餘（已修復）**
**位置**：`api-server/server.js:6427-6435`

**問題**：
```javascript
const remainingRecords = timeslots.filter(s => {
    if (s.isAttended === true) return false;  // 已經排除了所有 isAttended === true
    if ((s.isChangeDate === true || s.isChangeLocation === true) && s.isAttended === true) return false;  // ⚠️ 這行永遠不會執行
    if (s.isAttended === false) return false;
    return true;
});
```

**修復建議**：
```javascript
const remainingRecords = timeslots.filter(s => {
    // 排除已出席的記錄（包括普通已出席和補堂已出席）
    if (s.isAttended === true) return false;
    // 排除已缺席的記錄
    if (s.isAttended === false) return false;
    // 返回 isAttended === null/undefined 的記錄（尚未上課狀態）
    return true;
});
```

### 2. **請假記錄在計算中的處理**

**當前邏輯**：
- `currentPeriodLeaveRequests` = `isLeave === true` 的記錄數
- `currentPurchasedClasses` = 所有記錄數（包括請假）
- `currentPeriodRemaining` = 總數 - 已出席 - 缺席（不包括請假）

**邏輯分析**：
- 請假記錄被包含在 `currentPurchasedClasses` 中
- 但在計算剩餘時，請假記錄的 `isAttended` 通常是 `null`，所以會被算入剩餘
- 請假記錄又可以通過 `bookableMakeup` 補堂，這是正確的

**結論**：邏輯基本正確，但需要明確：
- 請假記錄應該算作剩餘堂數（因為可以補）
- `bookableMakeup` 包含了請假記錄，這是合理的

### 3. **已定日子課堂與剩餘堂數的關係**
**位置**：`api-server/server.js:6164`

**當前邏輯**：
```javascript
currentPeriodRemaining = Math.max(0, currentPurchasedClasses - attendedBooked - absences)
```

**潛在問題**：
- 請假（`isLeave === true`）的記錄應該算作剩餘堂數的一部分，因為可以補堂
- 但目前的計算邏輯中，請假記錄被包含在 `currentPurchasedClasses` 中，但在計算剩餘時沒有明確處理

**建議**：
- 如果請假不算作已消耗的堂數，則邏輯正確
- 但如果請假應該算作剩餘堂數（因為可以補），則需要在計算中明確考慮

**潛在矛盾**：
- `scheduledClasses` = 有日期的非請假記錄數
- `currentPeriodRemaining` = 總數 - 已出席 - 缺席

**邏輯分析**：
- `scheduledClasses` 包含：
  - 已出席的記錄（`isAttended === true`）
  - 已缺席的記錄（`isAttended === false`）
  - 尚未上課的已定日子課堂（`isAttended === null/undefined`）
- `currentPeriodRemaining` 包含：
  - 待約記錄（`isPending === true`）
  - 請假記錄（`isLeave === true`，`isAttended === null/undefined`）
  - 尚未上課的已定日子課堂（`isAttended === null/undefined`）

**關係**：
```
scheduledClasses + pendingClasses + 其他 = currentPurchasedClasses
currentPeriodRemaining = 尚未上課的記錄數（包括待約、請假、已定日子但未上課）
```

**結論**：邏輯正確，沒有矛盾

### 4. **補堂相關字段的一致性**
**位置**：註釋中提到的邏輯

**說明**：
- `attendedMakeup` 是 `attendedBooked` 的子集
- `bookedMakeup` 可能包含已出席的補堂（`attendedMakeup`）
- 關係：`attendedMakeup <= bookedMakeup <= bookableMakeup`

**邏輯檢查**：
- ✅ `attendedMakeup <= bookedMakeup`（已約補堂可能已出席）
- ✅ `bookedMakeup <= bookableMakeup`（已約補堂不能超過可約補堂）
- ✅ 在計算 `currentPeriodRemaining` 時，只減去 `attendedBooked`，沒有重複計算

**結論**：邏輯正確

### 5. **上期剩餘記錄計算的相同問題（已修復）**
**位置**：`api-server/server.js:6459-6467`

**原問題**：與本期剩餘時數計算有相同的冗餘條件
**狀態**：已修復，移除了冗餘條件

### 6. **待約記錄在剩餘堂數中的處理**

**邏輯檢查**：
- `pendingClasses`（待約）= `isPending === true` 的記錄（通過單獨查詢獲得）
- `currentPeriodRemaining` = 所有 `isAttended === null/undefined` 的記錄（從 `timeslots` 過濾）
- 待約記錄的 `isAttended` 通常是 `null`，所以會被包含在剩餘堂數中

**重要發現**：
- ⚠️ **邏輯不一致**：`pendingClasses` 是從單獨的查詢獲得的（`isPending === true`），而 `currentPeriodRemaining` 是從過濾後的 `timeslots` 計算的
- 如果 `pendingClasses` 的記錄不在過濾後的 `timeslots` 中（因為過濾條件不同），就會導致不一致

**潛在問題**：
- `bookableMakeup` = `lastPeriodRemaining + currentPeriodLeaveRequests + pendingClasses`
- 這意味著待約記錄被計算了兩次：
  1. 在 `currentPeriodRemaining` 中（如果 `isAttended === null` 且在 `timeslots` 中）
  2. 在 `bookableMakeup` 中

**結論**：
- 這是合理的，因為待約記錄既算作剩餘堂數，也算作可約補堂的來源
- 但需要確保邏輯一致性：
  1. 待約記錄應該包含在 `timeslots` 中，或者在計算 `currentPeriodRemaining` 時單獨添加
  2. 如果待約記錄被用來補堂，它應該從 `pendingClasses` 中移除（通過設置 `isPending = false`）

## ✅ 已修復的問題

### 1. **剩餘時數計算邏輯冗餘（已修復）**
- **位置**：`api-server/server.js:6427-6435` 和 `6459-6467`
- **問題**：過濾條件中有冗餘的檢查（永遠不會執行的條件）
- **修復**：已移除冗餘條件，簡化邏輯

### 2. **標記請假時 isAttended 的處理問題（已修復）**
- **位置**：`Web_app/attendance-board.js:342-344`
- **問題**：標記請假時將 `isAttended` 設為 `false`，導致請假被計入缺席
- **修復**：
  - 前端：將標記請假時的 `isAttended` 改為 `null`（而不是 `false`）
  - 後端：修改缺席計算邏輯，排除請假記錄（`isAttended === false && isLeave !== true`）

### 3. **缺席計算邏輯優化（已修復）**
- **位置**：`api-server/server.js:6156` 和 `6410`
- **問題**：缺席計算未排除請假記錄，導致請假被計入缺席
- **修復**：修改缺席計算邏輯為 `s.isAttended === false && s.isLeave !== true`，確保請假記錄不會被計入缺席

## 📋 總結

### 計算邏輯正確性

✅ **正確的計算**：
1. 總堂數 = 過濾後的記錄總數
2. 已出席 = `isAttended === true` 的記錄數（包括補堂已出席）
3. 缺席 = `isAttended === false` 的記錄數
4. 剩餘堂數 = 總數 - 已出席 - 缺席
5. 補堂相關字段的關係正確
6. 請假記錄的處理邏輯正確（請假不算已消耗，可以補堂）

⚠️ **需要注意的點**：
1. **待約記錄的雙重計算**：
   - 待約記錄同時出現在 `currentPeriodRemaining` 和 `bookableMakeup` 中
   - 這是合理的，因為待約既是剩餘堂數，也是補堂來源
   - 但如果待約被安排為補堂，應該從 `pendingClasses` 中移除

2. **已定日子課堂與剩餘堂數的關係**：
   - `scheduledClasses` 可能包含已出席、缺席和尚未上課的記錄
   - `currentPeriodRemaining` 包含待約、請假和尚未上課的已定日子課堂
   - 兩者有交集但不完全相同，這是正常的

3. **數據一致性**：
   - 所有計算都基於 `students_timeslot` 集合的記錄
   - 需要確保 `isAttended`、`isLeave`、`isPending` 等字段的狀態正確
   - 建議添加數據驗證，確保不會出現矛盾狀態（如 `isLeave === true` 且 `isAttended === true`）

### 數據驗證建議

建議添加以下驗證邏輯：
1. **狀態互斥檢查**：
   - `isAttended === true` 時，不應該是 `isPending === true`
   - `isLeave === true` 時，`isAttended` 應該是 `null` 或 `undefined`
   - `isAttended === false` 時，不應該是 `isPending === true`

2. **數據一致性檢查**：
   - `bookedMakeup` 不應該超過 `bookableMakeup`
   - `attendedMakeup` 不應該超過 `bookedMakeup`
   - `currentPeriodRemaining` 不應該超過 `currentPurchasedClasses`
   - `attendedBooked >= attendedMakeup`（已出席應該大於等於補堂已出席）

3. **邏輯關係檢查**：
   - `currentPeriodRemaining + attendedBooked + absences` 應該等於 `currentPurchasedClasses`（理論上，實際可能有請假記錄需要特別處理）
   - `scheduledClasses <= currentPurchasedClasses`
   - `pendingClasses` 應該等於查詢到的 `isPending === true` 的記錄數

