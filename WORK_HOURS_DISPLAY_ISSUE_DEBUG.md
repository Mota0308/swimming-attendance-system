# 工时管理数据显示问题调试指南

## 问题描述
后端有数据，但前端没有显示。

## 可能的原因

### 1. 月份不匹配
- **问题**：用户选择了12月，但数据库中的数据是11月的
- **检查**：查看浏览器控制台中的日志，确认：
  - 前端请求的年月：`📥 準備載入: ... year=${currentYear}, month=${currentMonth}`
  - 后端返回的数据日期：`📋 第一條記錄示例: workDate: "2025-11-01"`

### 2. 数据格式不匹配

#### 2.1 `locationClubKey` 格式不匹配
- **问题**：前端生成的 `locationClubKey` 与后端数据中的格式不一致
- **检查**：
  - 前端生成：`${locationClub.location}-${club || ''}` (例如：`"維園泳池-SH"`)
  - 后端数据：检查 `location` 和 `club` 字段是否存在，格式是否正确
- **修复**：已在 `getExistingRecordByLocationClub` 函数中添加了自动构建 `locationClubKey` 的逻辑

#### 2.2 `workDate` 格式不匹配
- **问题**：`workDate` 可能是 Date 对象或字符串，格式不一致
- **检查**：查看控制台日志中的 `workDateType` 和 `workDate` 值
- **修复**：已在匹配逻辑中支持 Date 对象和字符串两种格式

#### 2.3 `editorType` 不匹配
- **问题**：前端使用的 `editorType` 与数据库中的不匹配
- **检查**：
  - 前端使用的 `editorType`：查看日志 `editorType=${editorTypeToUse}`
  - 数据库中的 `editorType`：查看日志 `editorType: r.editorType`
- **常见情况**：
  - 教练页面：应该使用 `editorType='coach'`
  - 主管页面：应该使用 `editorType='supervisor'`
  - 管理员页面查看其他员工：应该使用 `editorType='supervisor'`
  - 管理员页面查看自己：应该使用 `editorType='admin'`

### 3. `employeeId` 或 `phone` 不匹配
- **问题**：前端使用的标识符与数据库中的不匹配
- **检查**：
  - 前端使用的标识符：`employeeId=${currentEmployee.employeeId || currentEmployee.phone}`
  - 数据库中的标识符：查看后端日志中的 `employeeId` 和 `phone` 字段
- **修复**：后端API已支持使用 `$or` 查询，同时匹配 `phone` 和 `employeeId`

## 调试步骤

### 1. 检查浏览器控制台日志
查看以下关键日志：
```
📥 準備載入: 維園泳池-SH, editorType=coach, employeeId=C0002
📥 載入結果: 維園泳池-SH, 獲取到 X 條記錄 (editorType=coach)
📊 載入數據統計: 總計 X 條記錄
  - 記錄示例 (前3條): {...}
```

### 2. 检查数据匹配日志
如果数据加载了但没有显示，查看：
```
🔍 匹配檢查 [記錄0]: {
  recordWorkDate: "2025-11-01",
  targetDate: "2025-12-01",
  matchDate: false,
  ...
}
```

### 3. 检查未找到记录的警告
如果看到以下警告，说明数据格式不匹配：
```
⚠️ 未找到匹配記錄: dateStr=2025-12-01, locationClubKey=維園泳池-SH, editorType=coach
📋 當前數據中的記錄示例 (前3條): {...}
```

## 已添加的修复

### 1. 改进 `getExistingRecordByLocationClub` 函数
- ✅ 支持 Date 对象和字符串两种 `workDate` 格式
- ✅ 自动构建 `locationClubKey`（如果记录中没有）
- ✅ 添加详细的调试日志

### 2. 改进数据加载日志
- ✅ 显示更详细的数据格式信息
- ✅ 显示前3条记录的完整信息
- ✅ 如果没有加载到数据，显示可能的原因

### 3. 后端API改进
- ✅ 支持使用 `phone` 或 `employeeId` 查询
- ✅ 添加详细的查询日志

## 下一步操作

1. **刷新页面**，查看浏览器控制台的新日志
2. **检查日志**，确认：
   - 数据是否成功加载（查看 `📊 載入數據統計`）
   - 数据格式是否正确（查看 `記錄示例`）
   - 匹配是否成功（查看 `🔍 匹配檢查`）
3. **如果数据加载了但没有显示**，查看 `⚠️ 未找到匹配記錄` 的警告，检查：
   - `workDate` 是否匹配
   - `locationClubKey` 是否匹配
   - `editorType` 是否匹配

## 常见问题解决

### Q: 数据加载了但显示为0
**A**: 检查 `editorType` 是否匹配。如果数据库中的记录是 `editorType='coach'`，但前端使用的是 `editorType='supervisor'`，则不会显示。

### Q: 月份选择器选择了12月，但数据是11月的
**A**: 这是正常的。需要将月份选择器切换到11月才能看到数据。

### Q: `locationClubKey` 格式不匹配
**A**: 已修复。现在会自动构建 `locationClubKey`，即使记录中没有该字段也能匹配。

