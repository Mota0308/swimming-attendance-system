# 游泳課程出席管理系統 - Android版本

這是一個基於Android的游泳課程出席管理系統，包含家長版本和教練版本。

## 功能特點

### 家長版本
- 用戶登入和賬號創建
- 查看出席記錄
- 按日期、地點、班級、時間篩選
- 只顯示出席記錄相關功能

### 教練版本
- 用戶登入和賬號創建
- 查看出席記錄
- 系統配置功能
- 導出雲端資料
- 上傳資料到雲端

## 技術架構

- **開發語言**: Kotlin
- **UI框架**: Material Design Components
- **數據庫**: Room (本地) + MongoDB (雲端)
- **網絡**: Retrofit + MongoDB Driver
- **架構模式**: MVVM
- **異步處理**: Coroutines

## 數據庫結構

### 本地數據庫 (Room)
- `students` - 學生資料表
- `student_accounts` - 用戶賬號表

### 雲端數據庫 (MongoDB)
- `test.students` - 學生資料集合
- `test.Student_account` - 用戶賬號集合

## 構建和運行

### 前置要求
- Android Studio Arctic Fox 或更高版本
- JDK 11 或更高版本
- Android SDK API 24 或更高版本

### 構建步驟

1. 克隆項目到本地
2. 在Android Studio中打開項目
3. 等待Gradle同步完成
4. 連接Android設備或啟動模擬器
5. 點擊運行按鈕

### 生成APK

```bash
# 在項目根目錄執行
./gradlew assembleRelease
```

生成的APK文件位於: `app/build/outputs/apk/release/app-release.apk`

## 項目結構

```
app/src/main/
├── java/com/swimming/attendance/
│   ├── data/                    # 數據層
│   │   ├── AppDatabase.kt      # Room數據庫
│   │   ├── Student.kt          # 學生數據模型
│   │   ├── UserAccount.kt      # 用戶賬號模型
│   │   ├── StudentDao.kt       # 學生數據訪問對象
│   │   └── UserAccountDao.kt   # 用戶賬號數據訪問對象
│   ├── network/                 # 網絡層
│   │   └── MongoDBService.kt   # MongoDB服務
│   └── ui/                      # UI層
│       ├── login/              # 登入界面
│       ├── parent/             # 家長版本
│       └── coach/              # 教練版本
└── res/
    ├── layout/                 # 佈局文件
    ├── values/                 # 資源文件
    ├── drawable/               # 圖標資源
    └── menu/                   # 菜單文件
```

## 配置說明

### MongoDB連接
在 `MongoDBService.kt` 中配置MongoDB連接字符串：

```kotlin
private const val MONGO_URI = "your_mongodb_connection_string"
private const val DB_NAME = "test"
```

### 應用配置
在 `app/build.gradle` 中修改應用ID和版本信息：

```gradle
android {
    defaultConfig {
        applicationId "com.swimming.attendance"
        versionCode 1
        versionName "1.0"
    }
}
```

## 注意事項

1. 確保設備有網絡連接以訪問MongoDB
2. 首次使用需要創建賬號
3. 家長版本只能查看出席記錄
4. 教練版本可以進行數據導出和上傳操作

## 版本歷史

- v1.0.0 - 初始版本，包含基本功能

## 許可證

本項目僅供學習和研究使用。 