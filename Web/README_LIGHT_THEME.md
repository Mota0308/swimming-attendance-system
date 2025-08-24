# 課程編排系統 - 淺色主題版本

## 概述

這是游泳系統中"出席記錄管理"模組的"課程編排系統"的淺色主題重新設計版本。相比原來的深色主題，新版本提供了更現代化、更友好的用戶體驗。

## 主要特點

### 🎨 現代化設計
- **淺色主題**：減少視覺疲勞，提供更舒適的閱讀體驗
- **Material Design**：採用Google Material Design設計語言
- **圓角設計**：柔和的圓角和陰影效果
- **漸變背景**：精緻的漸變效果和懸停動畫

### 📱 響應式設計
- **多設備支持**：完美適配桌面、平板和手機
- **自適應佈局**：智能網格系統，自動調整列數
- **觸控友好**：優化的移動端交互體驗

### ⚡ 交互體驗
- **拖拽排序**：直觀的拖拽操作來調整學生課程
- **即時反饋**：平滑的動畫過渡和狀態指示
- **智能提示**：Toast通知和操作確認

## 文件結構

```
Web/
├── scheduler-light-theme.css      # 課程編排系統淺色主題樣式
├── scheduler-light.js             # 課程編排系統淺色主題邏輯
├── attendance-board-light.css     # 出席排列板淺色主題樣式
├── attendance-board-light.js      # 出席排列板淺色主題邏輯
├── scheduler-light-demo.html      # 演示頁面
└── README_LIGHT_THEME.md         # 本說明文件
```

## 使用方法

### 1. 引入CSS文件

在HTML頁面的`<head>`部分添加：

```html
<link rel="stylesheet" href="scheduler-light-theme.css">
<link rel="stylesheet" href="attendance-board-light.css">
```

### 2. 引入JavaScript文件

在HTML頁面的`</body>`前添加：

```html
<script src="scheduler-light.js"></script>
<script src="attendance-board-light.js"></script>
```

### 3. 初始化系統

在頁面載入完成後調用初始化函數：

```javascript
// 初始化課程編排系統
initSchedulerLight('schedulerContainer');

// 初始化出席排列板
initAttendanceBoardLight('attendanceBoardContainer');
```

### 4. HTML容器

確保頁面中有對應的容器元素：

```html
<!-- 課程編排系統容器 -->
<div id="schedulerContainer"></div>

<!-- 出席排列板容器 -->
<div id="attendanceBoardContainer"></div>
```

## 功能特性

### 課程編排系統

- **時段管理**：新增、編輯、刪除課程時段
- **學生管理**：添加、移除學生，管理出席狀態
- **拖拽排序**：拖拽學生卡片到不同時段
- **狀態追蹤**：出席狀態（出席/缺席/未知）
- **教師統計**：教師工作時數統計
- **數據持久化**：本地存儲課程安排

### 出席排列板

- **視覺化佈局**：按時間和課程類型分組顯示
- **拖拽操作**：支持學生卡片拖拽排序
- **響應式設計**：自適應不同屏幕尺寸
- **實時更新**：與課程編排系統數據同步

## 樣式自定義

### 顏色主題

主要顏色變量：

```css
/* 主色調 */
--primary-color: #1a73e8;        /* 藍色 */
--success-color: #34a853;         /* 綠色 */
--danger-color: #ea4335;          /* 紅色 */
--warning-color: #fbbc04;         /* 黃色 */

/* 背景色 */
--bg-primary: #ffffff;            /* 主背景 */
--bg-secondary: #f8f9fa;          /* 次要背景 */
--bg-tertiary: #fafbfc;           /* 第三級背景 */

/* 文字色 */
--text-primary: #202124;          /* 主要文字 */
--text-secondary: #5f6368;        /* 次要文字 */
--text-muted: #9aa0a6;            /* 靜音文字 */

/* 邊框色 */
--border-primary: #e8eaed;        /* 主要邊框 */
--border-secondary: #dadce0;      /* 次要邊框 */
```

### 響應式斷點

```css
/* 桌面端 */
@media (min-width: 1200px) { ... }

/* 平板端 */
@media (max-width: 1199px) and (min-width: 768px) { ... }

/* 手機端 */
@media (max-width: 767px) { ... }

/* 小屏手機 */
@media (max-width: 480px) { ... }
```

## 瀏覽器兼容性

- **現代瀏覽器**：Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **CSS特性**：支持CSS Grid、Flexbox、CSS Variables
- **JavaScript特性**：支持ES6+、Async/Await、Template Literals

## 性能優化

- **CSS優化**：使用CSS Grid和Flexbox實現高效佈局
- **JavaScript優化**：事件委託、防抖處理、異步加載
- **渲染優化**：虛擬滾動、懶加載、DOM片段重用

## 開發指南

### 添加新功能

1. 在對應的CSS文件中添加樣式
2. 在JavaScript文件中實現邏輯
3. 更新HTML模板結構
4. 測試響應式設計

### 自定義主題

1. 複製現有CSS文件
2. 修改顏色變量
3. 調整字體和間距
4. 測試不同設備的顯示效果

## 故障排除

### 常見問題

1. **樣式不生效**：檢查CSS文件路徑和引入順序
2. **JavaScript錯誤**：檢查控制台錯誤信息和依賴項
3. **響應式問題**：檢查CSS媒體查詢和容器寬度
4. **拖拽不工作**：檢查瀏覽器兼容性和事件綁定

### 調試技巧

- 使用瀏覽器開發者工具檢查元素
- 查看控制台錯誤信息
- 測試不同設備和瀏覽器
- 檢查網絡請求和API響應

## 更新日誌

### v1.0.0 (2025-01-XX)
- 初始版本發布
- 淺色主題設計
- 響應式佈局
- 拖拽功能
- 出席狀態管理

## 貢獻指南

歡迎提交問題報告和功能建議！

## 授權

本項目採用MIT授權協議。 