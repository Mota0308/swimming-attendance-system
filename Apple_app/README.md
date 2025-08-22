# Apple 游泳課程管理應用

## 項目概述
最小可用的 iOS SwiftUI 應用，支持：
- 教練登入（本地暫存）
- 查詢更表（/coach-roster）
- 查詢工時（/coach-work-hours）

## 結構
```
Apple_app/
├── project.yml                # XcodeGen 專案定義
├── SwimmingApp/
│   ├── Info.plist
│   ├── Config.plist           # 配置 API BaseURL 與密鑰
│   ├── SwimmingAppApp.swift   # App 入口
│   ├── Services/
│   │   └── APIClient.swift
│   └── Views/
│       ├── RootView.swift
│       ├── LoginView.swift
│       └── CoachDashboardView.swift
└── README.md
```

## 構建步驟（建議使用 XcodeGen）
1. 安裝 XcodeGen（如未安裝）
```bash
brew install xcodegen
```
2. 在 `Apple_app` 目錄執行：
```bash
xcodegen generate
```
會生成 `SwimmingApp.xcodeproj`

3. 用 Xcode 打開 `SwimmingApp.xcodeproj`
4. 在 `SwimmingApp/Config.plist` 設置：
   - BaseURL: 你的 API 服務器
   - PublicApiKey / PrivateApiKey: 與 Android 相同的 API Key
5. 設置團隊簽名（Signing & Capabilities -> Team）
6. 選擇 iOS Simulator 或真機，點擊 Run

## 備註
- 目前登入僅本地保存電話與姓名，無伺服器驗證。
- 工時請求需要 `location` 與 `club`；本示例暫傳空字串，你可擴展 UI 增加地點/泳會選擇並傳入參數。
- 之後可逐步補齊家長端、出席記錄等功能。 