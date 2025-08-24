# 手機APP管理員界面地點搜索UI代碼

## 概述
本文檔展示了手機APP管理員版本中"出席記錄"頁面的地點搜索UI代碼，包括完整的布局結構和樣式定義。

## 主要布局文件
**文件位置**: `Android_app/app/src/main/res/layout/activity_admin_main.xml`

## 出席記錄部分完整代碼

### 1. 出席記錄容器
```xml
<LinearLayout
    android:id="@+id/sectionAttendance"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:background="#FFFFFF"
    android:padding="20dp"
    android:visibility="gone"
    android:elevation="2dp">
```

### 2. 頁面標題
```xml
<TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="📊 出席記錄"
    android:textSize="20sp"
    android:textStyle="bold"
    android:textColor="#1976D2"
    android:layout_marginBottom="20dp" />
```

### 3. 搜索功能容器
```xml
<!-- 搜索功能 -->
<LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:background="#F8F9FA"
    android:padding="16dp"
    android:layout_marginBottom="20dp">
```

### 4. 搜索功能標題
```xml
<TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="🔍 搜索功能"
    android:textSize="16sp"
    android:textStyle="bold"
    android:textColor="#333333"
    android:layout_marginBottom="12dp" />
```

### 5. 搜索條件行（地點搜索 + 日期搜索）
```xml
<LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:gravity="center_vertical"
    android:layout_marginBottom="12dp">

    <!-- 地點搜索標籤 -->
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="地點搜索："
        android:textSize="14sp"
        android:textColor="#333333"
        android:layout_marginEnd="8dp" />

    <!-- 地點搜索下拉選單 -->
    <Spinner
        android:id="@+id/attendanceLocationSpinner"
        android:layout_width="0dp"
        android:layout_height="48dp"
        android:layout_weight="1"
        android:background="@drawable/bg_text_border"
        android:layout_marginEnd="12dp" />

    <!-- 日期搜索標籤 -->
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="日期搜索："
        android:textSize="14sp"
        android:textColor="#333333"
        android:layout_marginEnd="8dp" />

    <!-- 日期顯示文本 -->
    <TextView
        android:id="@+id/attendanceDateText"
        android:layout_width="0dp"
        android:layout_height="48dp"
        android:layout_weight="1"
        android:text="選擇日期"
        android:gravity="center"
        android:background="@drawable/bg_text_border"
        android:textColor="#666666"
        android:layout_marginEnd="12dp" />

    <!-- 日期選擇按鈕 -->
    <Button
        android:id="@+id/attendancePickDateButton"
        android:layout_width="48dp"
        android:layout_height="48dp"
        android:text="📅"
        android:textSize="16sp"
        android:backgroundTint="#FF9800"
        android:textColor="#FFFFFF" />
</LinearLayout>
```

### 6. 操作按鈕行
```xml
<LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:gravity="end">

    <!-- 搜索按鈕 -->
    <Button
        android:id="@+id/attendanceSearchButton"
        android:layout_width="wrap_content"
        android:layout_height="40dp"
        android:text="搜索"
        android:textSize="14sp"
        android:backgroundTint="#4CAF50"
        android:textColor="#FFFFFF"
        android:layout_marginEnd="8dp" />

    <!-- 重置按鈕 -->
    <Button
        android:id="@+id/attendanceResetButton"
        android:layout_width="wrap_content"
        android:layout_height="40dp"
        android:text="重置"
        android:textSize="14sp"
        android:backgroundTint="#9E9E9E"
        android:textColor="#FFFFFF" />
</LinearLayout>
```

### 7. 學生資料表格容器
```xml
<!-- 學生資料表格 -->
<LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="📋 學生資料表格"
        android:textSize="16sp"
        android:textStyle="bold"
        android:textColor="#333333"
        android:layout_marginBottom="12dp" />

    <ScrollView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:scrollbars="vertical"
        android:fadeScrollbars="false">

        <LinearLayout
            android:id="@+id/attendanceTableContainer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical" />

    </ScrollView>
</LinearLayout>
```

## 背景樣式定義

### 文本邊框背景
**文件位置**: `Android_app/app/src/main/res/drawable/bg_text_border.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <stroke
        android:width="2dp"
        android:color="#CCCCCC" />
    <corners android:radius="8dp" />
</shape>
```

## UI設計特點

### 1. 布局結構
- **垂直布局**: 使用LinearLayout垂直排列各個元素
- **水平排列**: 地點搜索和日期搜索在同一行
- **響應式設計**: 使用layout_weight實現等寬分配

### 2. 視覺設計
- **顏色方案**: 
  - 主色調: #1976D2 (藍色)
  - 背景色: #FFFFFF (白色)
  - 搜索區域背景: #F8F9FA (淺灰色)
  - 按鈕顏色: #4CAF50 (綠色搜索), #9E9E9E (灰色重置), #FF9800 (橙色日期)
- **圓角設計**: 8dp圓角邊框
- **陰影效果**: 2dp elevation

### 3. 交互元素
- **地點搜索**: Spinner下拉選單
- **日期搜索**: TextView + 日期選擇按鈕
- **操作按鈕**: 搜索和重置按鈕
- **表格容器**: 可滾動的學生資料顯示區域

### 4. 尺寸規格
- **容器內邊距**: 20dp
- **搜索區域內邊距**: 16dp
- **元素間距**: 8dp-12dp
- **按鈕高度**: 40dp-48dp
- **文字大小**: 14sp-20sp

## 功能對應關係

### 控件ID與功能
| 控件ID | 功能描述 | 控件類型 |
|--------|----------|----------|
| `attendanceLocationSpinner` | 地點搜索下拉選單 | Spinner |
| `attendanceDateText` | 日期顯示文本 | TextView |
| `attendancePickDateButton` | 日期選擇按鈕 | Button |
| `attendanceSearchButton` | 搜索執行按鈕 | Button |
| `attendanceResetButton` | 重置搜索條件按鈕 | Button |
| `attendanceTableContainer` | 學生資料表格容器 | LinearLayout |

### 布局層次結構
```
sectionAttendance (LinearLayout)
├── 頁面標題 (TextView)
├── 搜索功能容器 (LinearLayout)
│   ├── 搜索功能標題 (TextView)
│   ├── 搜索條件行 (LinearLayout)
│   │   ├── 地點搜索標籤 (TextView)
│   │   ├── 地點搜索下拉選單 (Spinner)
│   │   ├── 日期搜索標籤 (TextView)
│   │   ├── 日期顯示文本 (TextView)
│   │   └── 日期選擇按鈕 (Button)
│   └── 操作按鈕行 (LinearLayout)
│       ├── 搜索按鈕 (Button)
│       └── 重置按鈕 (Button)
└── 學生資料表格容器 (LinearLayout)
    ├── 表格標題 (TextView)
    └── 表格內容容器 (ScrollView)
        └── 表格容器 (LinearLayout)
```

## 響應式設計特點

### 1. 權重分配
- 地點搜索和日期搜索各佔50%寬度 (layout_weight="1")
- 確保在不同屏幕尺寸下保持比例

### 2. 滾動支持
- 表格區域使用ScrollView支持內容滾動
- 防止內容超出屏幕範圍

### 3. 可見性控制
- 使用visibility="gone"控制頁面顯示/隱藏
- 支持標籤頁切換功能

## 總結

地點搜索UI設計採用了現代化的Material Design風格，具有以下特點：

1. **清晰的視覺層次**: 使用顏色、字體大小和間距建立清晰的視覺層次
2. **直觀的交互設計**: 下拉選單、按鈕等交互元素設計直觀易用
3. **響應式布局**: 使用權重和彈性布局適應不同屏幕尺寸
4. **一致的設計語言**: 與整個應用保持一致的設計風格
5. **良好的可訪問性**: 適當的文字大小和對比度確保可讀性

這個UI設計為用戶提供了清晰、直觀的地點搜索功能，同時保持了良好的視覺效果和用戶體驗。 