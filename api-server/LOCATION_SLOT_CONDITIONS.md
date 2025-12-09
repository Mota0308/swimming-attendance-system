# Location 对应三个 Slot 的条件说明

## 📋 概述

在 Coach_roster 集合中，`location` 字段可以保存为：
- **数组格式**：`['地點1', '地點2', '地點3']` - 对应三个 slot（上午、下午、晚上）
- **字符串格式**：`'地點'` - 旧格式，只对应一个 slot

## 🔍 条件说明

### 1. **保存时（POST /coach-roster/batch）**

#### 条件：`entry.slot` 存在（truthy）

```javascript
if (entry.slot) {
    // ✅ 会处理为数组格式
    const slotIndex = entry.slot - 1;
    dateGroup.locationArray[slotIndex] = locationValue;
}
```

**处理逻辑：**
1. 前端发送多个 entry，每个 entry 包含：
   - `date`: 日期
   - `slot`: 1, 2, 或 3（上午、下午、晚上）
   - `location`: 地点字符串

2. 后端按日期分组，合并同一日期的多个 entry：
   ```javascript
   // 同一日期可能有多个 entry：
   { date: '2025-01-15', slot: 1, location: '九龍公園' }
   { date: '2025-01-15', slot: 2, location: '美孚' }
   { date: '2025-01-15', slot: 3, location: '堅尼地城' }
   
   // 合并为：
   locationArray: ['九龍公園', '美孚', '堅尼地城']
   ```

3. **保存到数据库**：
   ```javascript
   location: ['九龍公園', '美孚', '堅尼地城']  // ✅ 数组格式
   ```

**关键条件：**
- ✅ `entry.slot` 存在且为 1, 2, 或 3
- ✅ 同一日期有多个 entry（不同 slot）
- ✅ 后端会自动合并为数组格式

---

### 2. **读取时（GET /roster）**

#### 条件：`Array.isArray(locationValue)` 为 true

```javascript
const isLocationArray = Array.isArray(locationValue);

if (isTimeArray || isLocationArray) {
    // ✅ 如果是数组，根据 slot 展开为多条记录
    const arrayIndex = slot - 1;
    const location = isLocationArray ? (locationValue[arrayIndex] || '') : locationValue;
}
```

**处理逻辑：**
1. 从数据库读取记录
2. 检查 `location` 是否为数组：
   ```javascript
   const locationValue = item.location || item.place || '';
   const isLocationArray = Array.isArray(locationValue);
   ```

3. **如果是数组**：
   - 根据 `slot` 值提取对应的 location
   - `slot: 1` → `locationValue[0]` (上午)
   - `slot: 2` → `locationValue[1]` (下午)
   - `slot: 3` → `locationValue[2]` (晚上)

4. **如果不是数组**（旧格式）：
   - 直接使用字符串值
   - 所有 slot 都返回相同的 location

**关键条件：**
- ✅ 数据库中 `location` 字段是数组类型
- ✅ `Array.isArray(locationValue)` 返回 `true`

---

## 📊 数据流程示例

### 场景 1：批量操作（三个 slot 都有数据）

**前端发送：**
```json
[
  { "date": "2025-01-15", "slot": 1, "location": "九龍公園" },
  { "date": "2025-01-15", "slot": 2, "location": "美孚" },
  { "date": "2025-01-15", "slot": 3, "location": "堅尼地城" }
]
```

**后端处理：**
```javascript
// 按日期分组
dateGroup = {
  date: '2025-01-15',
  locationArray: ['九龍公園', '美孚', '堅尼地城']  // ✅ 合并为数组
}
```

**数据库保存：**
```javascript
{
  date: Date('2025-01-15'),
  location: ['九龍公園', '美孚', '堅尼地城'],  // ✅ 数组格式
  slot: 1  // 使用第一个 entry 的 slot
}
```

**前端读取：**
```javascript
// 根据 slot 展开为多条记录
{ date: '2025-01-15', slot: 1, location: '九龍公園' }  // locationValue[0]
{ date: '2025-01-15', slot: 2, location: '美孚' }      // locationValue[1]
{ date: '2025-01-15', slot: 3, location: '堅尼地城' }  // locationValue[2]
```

---

### 场景 2：确认更表（三个 slot 都有数据）

**前端发送：**
```json
[
  { "date": "2025-01-15", "slot": 1, "location": "九龍公園" },
  { "date": "2025-01-15", "slot": 2, "location": "美孚" },
  { "date": "2025-01-15", "slot": 3, "location": "堅尼地城" }
]
```

**处理逻辑：** 与批量操作相同

---

### 场景 3：只有部分 slot 有数据

**前端发送：**
```json
[
  { "date": "2025-01-15", "slot": 1, "location": "九龍公園" },
  { "date": "2025-01-15", "slot": 2, "location": "" }  // 空字符串
]
```

**后端处理：**
```javascript
locationArray: ['九龍公園', '', '']  // ✅ 空字符串也会保存
```

**数据库保存：**
```javascript
{
  location: ['九龍公園', '', '']  // ✅ 数组格式，包含空字符串
}
```

---

## ⚠️ 特殊情况

### 1. 没有 slot 字段（旧格式）

```javascript
if (!entry.slot) {
    // 如果没有 slot，设置到 slot 1
    dateGroup.locationArray[0] = entry.location || '';
}
```

**条件：**
- ❌ `entry.slot` 不存在或为 falsy
- ✅ `entry.location` 存在

**结果：** location 保存到 `locationArray[0]`（上午）

---

### 2. location 为 null 或 undefined

```javascript
let locationValue = '';
if (entry.location !== undefined && entry.location !== null) {
    locationValue = entry.location;
}
dateGroup.locationArray[slotIndex] = (locationValue !== null && locationValue !== undefined) ? locationValue : '';
```

**处理：**
- `null` → 转换为空字符串 `''`
- `undefined` → 转换为空字符串 `''`

---

## 📝 总结

### Location 保存为数组格式的条件：

1. ✅ **前端发送的 entry 包含 `slot` 字段**（1, 2, 或 3）
2. ✅ **同一日期有多个 entry**（不同 slot）
3. ✅ **后端自动合并**为 `locationArray: ['', '', '']`

### Location 读取为数组格式的条件：

1. ✅ **数据库中 `location` 字段是数组类型**
2. ✅ **`Array.isArray(locationValue)` 返回 `true`**
3. ✅ **根据 `slot` 值提取对应的数组元素**

### 关键代码位置：

- **保存逻辑**：`api-server/server.js` 第 693-727 行
- **读取逻辑**：`api-server/server.js` 第 949-979 行

