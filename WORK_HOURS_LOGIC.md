# 工时管理功能处理逻辑说明

## 一、核心概念：editorType 系统

### 1.1 editorType 的作用
`editorType` 用于区分不同角色编辑的工时记录，确保数据隔离和正确显示。

### 1.2 editorType 的三种类型
- **`'supervisor'`**：主管编辑的记录
- **`'admin'`**：管理员编辑自己的记录
- **`'coach'`**：教练编辑的记录

### 1.3 editorType 的确定规则

#### 加载数据时（`loadWorkHoursData`）：
1. **主管页面** (`prefix === 'supervisorWorkHours'`)：
   - 无论选择哪个员工（教练、管理员、其他主管），都使用 `editorType='supervisor'`
   - 原因：主管统一管理所有员工的工时

2. **管理员页面** (`prefix === 'workHours'`)：
   - **选择自己**：使用 `editorType='admin'`（编辑自己的记录）
   - **选择其他员工**：使用 `editorType='supervisor'`（和主管共用记录）
   - 原因：管理员编辑其他员工时，与主管使用同一套数据

3. **教练页面** (`prefix === 'coachWorkHours'`)：
   - 使用 `editorType='coach'`（编辑自己的记录）

#### 保存数据时（`saveWorkHours`）：
- 使用与加载时相同的逻辑确定 `effectiveEditorType`
- **关键**：必须在收集记录前设置 `window.__currentEffectiveEditorType`，确保 `collectWorkHoursRecords()` 使用正确的 `editorType`

## 二、数据加载流程

### 2.1 页面前缀检测
```javascript
function detectCurrentPrefix()
```
- 检测当前页面类型：`coachWorkHours`、`supervisorWorkHours`、`workHours`
- 用于确定使用哪个页面的选择器和容器

### 2.2 数据加载主流程（`loadWorkHoursData`）

1. **获取页面信息**：
   - 从选择器获取年份、月份、员工
   - 确定当前员工（`currentEmployee`）

2. **确定 editorType**：
   - 根据页面类型和用户类型确定 `effectiveEditorType`
   - 保存到 `window.__currentEffectiveEditorType`

3. **检查缓存**：
   - 缓存键格式：`{employeeId}-{year}-{month}-{editorType}`
   - 缓存时间：
     - `supervisor` 类型：30秒（确保主管和管理员页面同步）
     - `admin` 和 `coach` 类型：5分钟

4. **加载数据**：
   - 调用 `loadAllLocationClubWorkHours(effectiveEditorType)`
   - 只加载指定 `editorType` 的记录
   - 并行加载对比结果（`compareWorkHours`）

5. **生成表格**：
   - 调用 `generateWorkHoursTable(comparisonResults)`
   - 传入对比结果，用于显示对比颜色

6. **绑定事件**：
   - `bindInputEvents()`：绑定输入框事件
   - `bindCollapseEvents()`：绑定收缩/展开事件

## 三、数据保存流程

### 3.1 保存主流程（`saveWorkHours`）

1. **保存页面前缀**：
   - 保存到 `window.__currentWorkHoursPrefix`
   - 用于重新加载时保持在同一页面

2. **确定 editorType**：
   - 使用与加载时相同的逻辑
   - **关键**：在收集记录前设置 `window.__currentEffectiveEditorType`

3. **收集记录**（`collectWorkHoursRecords`）：
   - 遍历所有输入框（包括隐藏的 `input[data-field="content"]`）
   - 按 `{date}-{locationClubKey}` 分组
   - 为每条记录设置 `editorType`（从 `window.__currentEffectiveEditorType` 获取）

4. **发送保存请求**：
   - 调用 `window.App.saveStaffWorkHours(records, phone, name, effectiveEditorType)`
   - 后端根据 `editorType` 保存到数据库

5. **清除缓存**：
   - 清除所有相关的数据缓存（包括不同 `editorType` 的缓存）
   - 清除对比结果缓存

6. **重新加载数据**：
   - 保存当前收缩状态
   - 调用 `loadWorkHoursData()` 重新加载
   - 恢复收缩状态

## 四、数据对比逻辑

### 4.1 对比目的
- 在主管/管理员页面，对比显示教练和管理员/主管填写的差异
- 用颜色标识：红色=有差异，绿色=一致

### 4.2 对比流程

1. **加载对比数据**（`compareWorkHours`）：
   - 调用后端 API：`/work-hours/compare/:employeeId/:year/:month`
   - 返回两个版本的记录对比结果

2. **生成对比结果**：
   - 每条记录包含：
     - `coachRecord`：教练填写的记录
     - `adminRecord` 或 `supervisorRecord`：管理员/主管填写的记录
     - `hasDifferences`：是否有差异
     - `onlyOneVersion`：是否只有一个版本

3. **应用对比颜色**（`generateWorkHoursTable`）：
   - 遍历每个单元格，查找对应的对比记录
   - 根据 `hasDifferences` 设置背景色：
     - 有差异：红色（`#f8d7da`）
     - 一致：绿色（`#d4edda`）

4. **显示对比颜色条件**（`shouldShowComparisonColors`）：
   - 教练页面：不显示对比颜色
   - 管理员页面查看自己：不显示对比颜色
   - 其他情况：显示对比颜色

## 五、表格生成逻辑

### 5.1 表格结构（`generateWorkHoursTable`）

1. **表头**：
   - 日期列（"總時數"、"日期"）
   - 地点泳会列（动态生成，如 "堅尼地城-SH"）
   - Office 列（如果存在）
   - 内容列

2. **数据行**：
   - 每天一行
   - 每个地点泳会组合一列
   - 每个单元格包含：
     - 输入框（工时时数）
     - 对比颜色（如果有对比数据）
     - 点击查看功能（如果有另一个版本的数据）

3. **内容列特殊处理**：
   - 使用 `div.content-cell-display` 显示格式化内容
   - 使用 `input[type="hidden"][data-field="content"]` 存储原始 JSON 数据
   - 支持点击编辑（`openContentEditor`）

### 5.2 数据获取（`getExistingRecordByLocationClub`）

- 从 `currentWorkHoursData` 中查找记录
- **关键**：必须匹配 `editorType`，确保只显示当前角色的数据
- 匹配条件：
  - `workDate === dateStr`
  - `locationClubKey === locationClubKey`
  - `editorType === effectiveEditorType`

## 六、内容编辑逻辑

### 6.1 内容数据结构
- 存储格式：JSON 数组
- 示例：`[{"type":"泳池入場費","amount":"20"},{"type":"雜費(請註明)","amount":"30","note":"備註"}]`

### 6.2 内容编辑流程

1. **打开编辑器**（`openContentEditor`）：
   - 从 `data-original-value` 获取原始内容
   - 解析 JSON 数组
   - 显示在弹窗中

2. **保存内容**（`saveContentEditor`）：
   - 收集所有选项和输入
   - 转换为 JSON 字符串
   - 更新 `div.content-cell-display` 的显示
   - 更新 `input[type="hidden"]` 的值
   - **不自动保存**：需要点击"保存"按钮才会保存到后端

3. **内容显示**（`formatContentDisplay`）：
   - 解析 JSON 数组
   - 格式化为可读文本：`类型: 金额 (备注)`
   - 多个项目用逗号分隔

## 七、收缩/展开状态管理

### 7.1 状态保存
- 保存到后端：`/user-preferences/work-hours-collapse`
- 键格式：`workHoursCollapseStates-{accountPhone}-{employeePhone}`
- 按账号+员工独立保存

### 7.2 状态恢复
- 加载时从后端获取状态
- 应用 `hidden` 类到对应的列
- 保存后重新加载时，先保存当前状态，加载后恢复

## 八、唯一标识符系统

### 8.1 从 phone 迁移到 employeeId
- **旧系统**：使用 `phone` 作为唯一标识符
- **新系统**：使用 `employeeId` 作为唯一标识符
- **兼容性**：如果 `employeeId` 不存在，使用 `phone` 作为后备

### 8.2 使用位置
- 缓存键：`{employeeId || phone}-{year}-{month}-{editorType}`
- 后端 API：`/staff-work-hours/:employeeId/:year/:month`
- 数据库索引：基于 `employeeId`

## 九、关键全局变量

- `currentWorkHoursData`：当前加载的工时数据数组
- `currentEmployee`：当前查看的员工对象
- `currentYear`、`currentMonth`：当前查看的年月
- `locationClubs`：地点泳会组合列表
- `window.__currentEffectiveEditorType`：当前使用的 editorType
- `window.__currentWorkHoursPrefix`：当前页面前缀（用于保存后恢复）

## 十、数据隔离保证

### 10.1 前端隔离
- `getExistingRecordByLocationClub` 严格匹配 `editorType`
- 只显示当前 `editorType` 的记录
- 缓存键包含 `editorType`，避免不同角色的缓存互相覆盖

### 10.2 后端隔离
- 数据库查询时过滤 `editorType`
- 保存时设置 `editorType` 字段
- 对比时分别查询不同 `editorType` 的记录

## 十一、保存后刷新逻辑

1. **保存收缩状态**：记录当前所有列的收缩状态
2. **清除缓存**：清除相关数据缓存和对比缓存
3. **重新加载数据**：使用保存的 `prefix` 和 `editorType` 重新加载
4. **恢复收缩状态**：等待表格渲染完成后恢复状态

## 十二、点击查看另一个版本

### 12.1 触发条件
- 在主管/管理员页面
- 单元格有 `coach-data-clickable` 类
- 存在另一个版本的数据（`data-other-version-*` 属性）

### 12.2 显示逻辑
- 从 `data-other-version-type` 获取版本类型
- 根据 `editorType` 显示正确的标签：
  - `'supervisor'` → "主管"
  - `'admin'` → "管理員"
  - `'coach'` → "教練"
- 显示另一个版本的数据和当前输入值

### 12.3 当前值获取
- 对于内容列：从 `input[data-field="content"]` 获取
- 对于其他列：从普通 `input` 获取
- 如果值为空，尝试从 `data-original-value` 获取



