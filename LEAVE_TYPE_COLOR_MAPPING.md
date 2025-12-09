# LeaveType 内容和颜色对应关系

## 概述
本文档展示了系统中所有假期类型（LeaveType）与其对应的颜色配置。

## 颜色配置表

| LeaveType 值 | 中文名称 | 背景颜色 | 边框颜色 | 颜色预览 |
|-------------|---------|---------|---------|---------|
| `regular` | 例假 | `#fef3c7` (浅黄色) | `#fbbf24` (深黄色) | 🟨 黄色 |
| `annual` | 年假 | `#dcfce7` (浅绿色) | `#22c55e` (深绿色) | 🟩 绿色 |
| `maternity` | 产假 | `#fce7f3` (浅粉色) | `#ec4899` (深粉色) | 🩷 粉色 |
| `sick` | 病假 | `#fee2e2` (浅红色) | `#ef4444` (深红色) | 🟥 红色 |
| `nopaid` | No Paid | `#787a80` (灰色) | `#4b5563` (深灰色) | ⬛ 灰色 |
| `statutory` | 法定劳工假 | `#e0e7ff` (浅紫色) | `#6366f1` (深紫色) | 🟪 紫色 |

## 详细颜色值

### 背景颜色 (LEAVE_TYPE_COLORS)
```javascript
{
    'regular': '#fef3c7',    // 例假 - 浅黄色
    'annual': '#dcfce7',     // 年假 - 浅绿色（根据图片修改）
    'maternity': '#fce7f3',   // 产假 - 浅粉色
    'sick': '#fee2e2',       // 病假 - 浅红色（根据图片修改）
    'nopaid': '#787a80',     // No Paid - 灰色（根据图片修改）
    'statutory': '#e0e7ff'   // 法定劳工假 - 浅紫色
}
```

### 边框颜色 (LEAVE_TYPE_BORDER_COLORS)
```javascript
{
    'regular': '#fbbf24',    // 例假 - 深黄色边框
    'annual': '#22c55e',     // 年假 - 深绿色边框（根据图片修改）
    'maternity': '#ec4899',  // 产假 - 深粉色边框
    'sick': '#ef4444',       // 病假 - 深红色边框（根据图片修改）
    'nopaid': '#4b5563',     // No Paid - 深灰色边框（根据图片修改）
    'statutory': '#6366f1'   // 法定劳工假 - 深紫色边框
}
```

## 使用位置

### 前端文件
- `Web_app/supervisor-functions.js` - 批量操作和月份更表
- `Web_app/coach-functions.js` - 员工更表日历
- `Web_app/styles.css` - CSS 样式定义

### 后端处理
- `api-server/server.js` - 保存 `leaveType` 字段到数据库
- 后端不定义颜色，只存储 `leaveType` 字符串值

## 数据库字段
- **字段名**: `leaveType`
- **类型**: `String` 或 `null`
- **可能的值**: `'regular'`, `'annual'`, `'maternity'`, `'sick'`, `'nopaid'`, `'statutory'`, 或 `null`

## 注意事项
1. 如果 `leaveType` 为 `null` 或未设置，系统会显示红色（员工初始提交状态）
2. 所有颜色定义已暴露到 `window.LEAVE_TYPE_COLORS` 和 `window.LEAVE_TYPE_BORDER_COLORS`，确保全局一致性
3. 颜色在以下位置使用：
   - 批量操作日历中的假期格子
   - 月份更表中的假期显示
   - 对应员工更表中的假期格子

