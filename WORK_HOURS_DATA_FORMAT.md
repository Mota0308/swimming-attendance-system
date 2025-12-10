# 工时管理数据格式说明

## 一、前端发送到后端的数据格式

### 1. HTTP 请求格式

**端点**: `POST /staff-work-hours/batch`

**请求体**:
```json
{
  "records": [
    {
      // 单条记录格式见下方
    }
  ],
  "submittedBy": "63559985",           // 提交者的电话（当前登录用户）
  "submittedByName": "黃子峰",          // 提交者的姓名
  "submittedByType": "supervisor"      // 提交者的类型：'coach' | 'supervisor' | 'admin'
}
```

### 2. 单条记录格式（records 数组中的元素）

#### 2.1 教练（Coach）编辑的数据格式

```json
{
  "phone": "91638221",                  // ✅ 必须：员工的电话
  "employeeId": "C0002",                // ✅ 必须：员工的ID（格式：C0002）
  "name": "孫子健",                     // 员工姓名
  "type": "coach",                      // 员工类型：'coach'
  "editorType": "coach",                // ✅ 关键字段：编辑者类型='coach'
  "workDate": "2025-12-01",            // 工作日期（格式：YYYY-MM-DD）
  "year": 2025,                         // 年份
  "month": 12,                          // 月份（1-12）
  "location": "維園泳池",               // 工作地点
  "club": "SH",                         // 泳会（可为空字符串）
  "timeSlot1": 0.125,                   // 时段1工时（小时）
  "timeSlot2": 0.125,                   // 时段2工时（小时）
  "timeSlot3": 0.125,                   // 时段3工时（小时）
  "timeSlot4": 0.125,                   // 时段4工时（小时）
  "totalHours": 0.5,                    // 总工时（小时）
  "miscellaneousFee": 0,                // 杂费（金额）
  "feeContent": "",                     // 费用内容（JSON字符串或普通字符串）
  "bankAccount": "",                    // 银行账户
  "bankName": ""                        // 银行名称
}
```

#### 2.2 主管（Supervisor）编辑的数据格式

```json
{
  "phone": "91638221",                  // ✅ 必须：员工的电话
  "employeeId": "C0002",                // ✅ 必须：员工的ID（格式：C0002）
  "name": "孫子健",                     // 员工姓名
  "type": "coach",                      // 员工类型：'coach'（被编辑的员工类型）
  "editorType": "supervisor",           // ✅ 关键字段：编辑者类型='supervisor'
  "workDate": "2025-12-01",            // 工作日期（格式：YYYY-MM-DD）
  "year": 2025,                         // 年份
  "month": 12,                          // 月份（1-12）
  "location": "維園泳池",               // 工作地点
  "club": "SH",                         // 泳会（可为空字符串）
  "timeSlot1": 0.25,                    // 时段1工时（小时）
  "timeSlot2": 0.25,                    // 时段2工时（小时）
  "timeSlot3": 0.25,                    // 时段3工时（小时）
  "timeSlot4": 0.25,                    // 时段4工时（小时）
  "totalHours": 1.0,                    // 总工时（小时）
  "miscellaneousFee": 0,                // 杂费（金额）
  "feeContent": "",                     // 费用内容（JSON字符串或普通字符串）
  "bankAccount": "Suen Tsz Kin",       // 银行账户
  "bankName": "HSBC"                    // 银行名称
}
```

#### 2.3 管理员（Admin）编辑的数据格式

**情况1：管理员编辑自己的记录**
```json
{
  "editorType": "admin",                // ✅ 关键字段：编辑者类型='admin'
  // ... 其他字段同上
}
```

**情况2：管理员编辑其他员工的记录**
```json
{
  "editorType": "supervisor",           // ✅ 关键字段：编辑者类型='supervisor'（与主管共用）
  // ... 其他字段同上
}
```

## 二、后端保存到数据库的数据格式

后端在接收到数据后，会进行以下处理：

1. **补充缺失的字段**：
   - 如果记录缺少 `phone` 或 `employeeId`，从 `Admin_account` 表中查找并补充
   - 如果无法从 `Admin_account` 找到，会尝试从记录本身推断

2. **添加提交信息**：
   - `submittedBy`: 提交者的电话（从请求体获取）
   - `submittedByName`: 提交者的姓名（从请求体获取）
   - `submittedByType`: 提交者的类型（从请求体获取）
   - `updatedAt`: 更新时间（ISO 8601 格式）

3. **最终保存到数据库的记录格式**：

```json
{
  "_id": ObjectId("..."),               // MongoDB 自动生成的ID
  "phone": "91638221",                  // ✅ 必须：员工的电话
  "employeeId": "C0002",                // ✅ 必须：员工的ID
  "name": "孫子健",                     // 员工姓名
  "type": "coach",                      // 员工类型
  "editorType": "coach" | "supervisor" | "admin",  // ✅ 关键字段：区分编辑者
  "workDate": "2025-12-01",            // 工作日期
  "year": 2025,                         // 年份
  "month": 12,                          // 月份
  "location": "維園泳池",               // 工作地点
  "club": "SH",                         // 泳会
  "timeSlot1": 0.125,                   // 时段1工时
  "timeSlot2": 0.125,                   // 时段2工时
  "timeSlot3": 0.125,                   // 时段3工时
  "timeSlot4": 0.125,                   // 时段4工时
  "totalHours": 0.5,                    // 总工时
  "miscellaneousFee": 0,                // 杂费
  "feeContent": "",                     // 费用内容
  "bankAccount": "",                    // 银行账户
  "bankName": "",                       // 银行名称
  "submittedBy": "63559985",           // ✅ 后端添加：提交者的电话
  "submittedByName": "黃子峰",          // ✅ 后端添加：提交者的姓名
  "submittedByType": "supervisor",      // ✅ 后端添加：提交者的类型
  "updatedAt": ISODate("2025-12-09T12:08:28.675Z")  // ✅ 后端添加：更新时间
}
```

## 三、关键字段说明

### 1. `editorType` 字段（最重要）

| 编辑者 | `editorType` 值 | 说明 |
|--------|----------------|------|
| 教练 | `"coach"` | 教练自己编辑自己的工时记录 |
| 主管 | `"supervisor"` | 主管编辑任何员工的工时记录 |
| 管理员（编辑自己） | `"admin"` | 管理员编辑自己的工时记录 |
| 管理员（编辑他人） | `"supervisor"` | 管理员编辑其他员工的工时记录（与主管共用） |

### 2. `phone` 和 `employeeId` 字段

- **`phone`**: 员工的电话号码（8位数字，如 `"91638221"`）
- **`employeeId`**: 员工的ID（格式：`"C0002"`，首字母+4位数字）

**重要**：
- 前端发送时必须同时包含 `phone` 和 `employeeId`
- 后端会确保保存的记录同时包含这两个字段
- 如果前端发送时缺少某个字段，后端会从 `Admin_account` 表中查找并补充

### 3. 数据匹配规则

后端使用以下条件匹配和更新记录：
```javascript
{
  $or: [
    { phone: phoneToUse },
    { employeeId: employeeIdToUse }
  ],
  workDate: record.workDate,
  editorType: record.editorType
}
```

这意味着：
- 同一员工、同一日期、同一 `editorType` 的记录会被更新（而不是创建新记录）
- 不同 `editorType` 的记录会分别保存（例如：教练填写的和主管填写的会分开保存）

## 四、数据格式统一性

### 前端要求
- ✅ 必须同时包含 `phone` 和 `employeeId`
- ✅ 必须包含 `editorType` 字段
- ✅ 如果缺少 `phone` 或 `employeeId`，前端会抛出错误

### 后端处理
- ✅ 自动补充缺失的 `phone` 或 `employeeId`（从 `Admin_account` 表查找）
- ✅ 如果无法从 `Admin_account` 找到，会尝试从记录本身推断
- ✅ 确保保存的记录同时包含 `phone` 和 `employeeId`

## 五、示例对比

### 教练编辑的记录
```json
{
  "phone": "91638221",
  "employeeId": "91638221",  // 注意：可能是电话号码格式
  "editorType": "coach",
  "totalHours": 0.5,
  "submittedBy": "91638221",
  "submittedByType": "coach"
}
```

### 主管编辑的记录
```json
{
  "phone": "91638221",
  "employeeId": "C0002",      // 注意：标准格式
  "editorType": "supervisor",
  "totalHours": 1.0,
  "submittedBy": "63559985",
  "submittedByType": "supervisor"
}
```

**关键区别**：
- `editorType`: `"coach"` vs `"supervisor"`
- `submittedBy`: 教练的电话 vs 主管的电话
- `submittedByType`: `"coach"` vs `"supervisor"`

