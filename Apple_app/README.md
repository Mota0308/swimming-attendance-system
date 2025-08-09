# Apple 游泳課程管理應用

## 項目概述
這是一個用於管理游泳課程的iOS應用，包含兩個UI系統：
- 家長版本：查看學生的出席記錄
- 教練版本：管理課程和學生資料

## 功能特點
- 雙UI系統（家長/教練）
- 用戶認證系統
- 雲端數據同步
- 出席記錄管理

## 技術棧
- SwiftUI
- Firebase (Firestore)
- Combine Framework

## 項目結構
```
Apple_app/
├── SwimmingApp/
│   ├── SwimmingAppApp.swift
│   ├── Views/
│   │   ├── MainView.swift
│   │   ├── LoginView.swift
│   │   ├── CreateAccountView.swift
│   │   ├── ParentDashboardView.swift
│   │   └── CoachDashboardView.swift
│   ├── Models/
│   │   ├── StudentAccount.swift
│   │   └── AttendanceRecord.swift
│   ├── ViewModels/
│   │   ├── LoginViewModel.swift
│   │   ├── CreateAccountViewModel.swift
│   │   └── ParentDashboardViewModel.swift
│   ├── Services/
│   │   └── FirebaseService.swift
│   └── Utils/
│       └── Constants.swift
├── SwimmingApp.xcodeproj/
└── README.md
```

## 安裝和運行
1. 使用Xcode打開項目
2. 配置Firebase項目
3. 運行應用 