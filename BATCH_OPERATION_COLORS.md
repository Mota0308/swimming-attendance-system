# 批量操作中每个类型代表的颜色

## 概述
本文档列出了批量操作功能中所有类型及其对应的颜色定义。

---

## 1. 工作类型 (Work Type)

### 主样式文件 (`styles.css`)
- **背景色**: `#fb923c` (橙色)
- **文字颜色**: `#7c2d12` (深棕色)
- **边框颜色**: `#f97316` (深橙色)
- **字体粗细**: 600

### 备用样式文件 (`batch-operation-extraction/batch-operation-styles.css`)
- **背景色**: `#3b82f6` (蓝色)
- **文字颜色**: `white` (白色)
- **字体粗细**: 600

**CSS 类名**: `.batch-calendar-work-selected`

---

## 2. 请假类型 (Leave Types)

### 2.1 基础请假类型 (默认)
- **背景色**: `#fef3c7` (浅黄色)
- **文字颜色**: `#92400e` (深黄色)
- **说明**: 当没有具体假期类型时使用

**CSS 类名**: `.batch-calendar-leave-selected` (无具体类型)

---

### 2.2 常假 (Normal Leave)
- **背景色**: `#fef3c7` (黄色)
- **文字颜色**: `#78350f` (深棕色)
- **边框颜色**: `#fbbf24` (金黄色)

**CSS 类名**: `.batch-calendar-leave-selected.batch-calendar-leave-normal`

---

### 2.3 例假 (Regular Leave)
- **背景色**: `#fef3c7` (黄色)
- **文字颜色**: `#78350f` (深棕色)
- **边框颜色**: `#fbbf24` (金黄色)

**CSS 类名**: `.batch-calendar-leave-selected.batch-calendar-leave-regular`

---

### 2.4 年假 (Annual Leave)
- **背景色**: `#dcfce7` (浅绿色)
- **文字颜色**: `#065f46` (深绿色)
- **边框颜色**: `#22c55e` (绿色)

**CSS 类名**: `.batch-calendar-leave-selected.batch-calendar-leave-annual`

---

### 2.5 产假 (Maternity Leave)
- **背景色**: `#fce7f3` (粉色)
- **文字颜色**: `#831843` (深粉色)
- **边框颜色**: `#ec4899` (粉红色)

**CSS 类名**: `.batch-calendar-leave-selected.batch-calendar-leave-maternity`

---

### 2.6 病假 (Sick Leave)
- **背景色**: `#000000` (黑色)
- **文字颜色**: `#ffffff` (白色)
- **边框颜色**: `#000000` (黑色)

**CSS 类名**: `.batch-calendar-leave-selected.batch-calendar-leave-sick`

---

### 2.7 No Paid (无薪假)
- **背景色**: `#787a80` (灰色)
- **文字颜色**: `white` (白色)
- **边框颜色**: `#4b5563` (深灰色)

**CSS 类名**: `.batch-calendar-leave-selected.batch-calendar-leave-nopaid`

---

### 2.8 法定劳工假 (Statutory Leave)
- **背景色**: `#e0e7ff` (浅紫色)
- **文字颜色**: `#3730a3` (深紫色)
- **边框颜色**: `#6366f1` (紫色)

**CSS 类名**: `.batch-calendar-leave-selected.batch-calendar-leave-statutory`

---

## 3. 不上班日期 (Unavailable / isClicked=true)

### 未选中状态
- **背景色**: `#dc2626` (红色)
- **文字颜色**: `#ffffff` (白色)
- **边框颜色**: `#dc2626` (红色)
- **字体粗细**: 600
- **透明度**: 1 (完全不透明)

**CSS 类名**: `.batch-calendar-unavailable:not(.batch-calendar-work-selected):not(.batch-calendar-leave-selected)`

**说明**: 
- 当日期有 `isClicked=true` 且未被工作类型或请假类型选中时，显示红色
- 如果被工作类型或请假类型选中，则显示对应类型的颜色（不显示红色）

---

## 4. 当前操作类型选中状态 (Current Selected)

### 样式
- **字体粗细**: 700 (加粗)
- **透明度**: 1 (完整显示颜色)
- **说明**: 不改变背景色，只增强当前操作类型的视觉效果

**CSS 类名**: `.batch-calendar-current-selected`

---

## 5. 被其他类型占用 (Occupied)

### 样式
- **透明度**: 0.5 (半透明)
- **光标**: pointer (可点击)
- **标记**: 右上角显示 "↻" 符号
- **说明**: 保持原有背景颜色，但降低透明度，表示被其他类型占用

**CSS 类名**: `.batch-calendar-occupied`

---

## 6. 星期列选中日期 (Weekday Selected)

### 样式
- **说明**: 当通过星期列选择日期时，会添加额外的类来高亮显示
- **效果**: 增强选中日期的视觉效果

**CSS 类名**: `.batch-calendar-weekday-selected-day`

---

## 颜色总结表

| 类型 | 背景色 | 文字颜色 | 边框颜色 | CSS 类名 |
|------|--------|----------|----------|----------|
| **工作类型** (styles.css) | `#fb923c` (橙色) | `#7c2d12` (深棕) | `#f97316` (深橙) | `.batch-calendar-work-selected` |
| **工作类型** (batch-styles.css) | `#3b82f6` (蓝色) | `white` (白色) | - | `.batch-calendar-work-selected` |
| **常假/例假** | `#fef3c7` (黄色) | `#78350f` (深棕) | `#fbbf24` (金黄) | `.batch-calendar-leave-normal` / `.batch-calendar-leave-regular` |
| **年假** | `#dcfce7` (浅绿) | `#065f46` (深绿) | `#22c55e` (绿色) | `.batch-calendar-leave-annual` |
| **产假** | `#fce7f3` (粉色) | `#831843` (深粉) | `#ec4899` (粉红) | `.batch-calendar-leave-maternity` |
| **病假** | `#000000` (黑色) | `#ffffff` (白色) | `#000000` (黑色) | `.batch-calendar-leave-sick` |
| **No Paid** | `#787a80` (灰色) | `white` (白色) | `#4b5563` (深灰) | `.batch-calendar-leave-nopaid` |
| **法定劳工假** | `#e0e7ff` (浅紫) | `#3730a3` (深紫) | `#6366f1` (紫色) | `.batch-calendar-leave-statutory` |
| **不上班日期** (未选中) | `#dc2626` (红色) | `#ffffff` (白色) | `#dc2626` (红色) | `.batch-calendar-unavailable` |
| **被占用** | 保持原色 | 保持原色 | 保持原色 | `.batch-calendar-occupied` (透明度 0.5) |

---

## 注意事项

1. **样式文件差异**: 
   - `styles.css` 中工作类型使用橙色 (`#fb923c`)
   - `batch-operation-extraction/batch-operation-styles.css` 中工作类型使用蓝色 (`#3b82f6`)
   - 根据实际使用的样式文件，颜色会有所不同

2. **优先级规则**:
   - 当日期被工作类型或请假类型选中时，不上班日期（红色）不会显示
   - 当前操作类型的选中状态会增强视觉效果（加粗字体）
   - 被其他类型占用时会降低透明度（50%）

3. **动态颜色**:
   - 如果 `isClicked=true` 的日期被点击选中为工作类型或请假类型，会显示对应类型的颜色，而不是红色

---

## 文件位置

- **主样式文件**: `Web_app/styles.css` (行 7001-7070)
- **备用样式文件**: `Web_app/batch-operation-extraction/batch-operation-styles.css` (行 2784-2852)

