# 手機 APP API 使用指南

## 概述
本指南說明如何在 Android 應用程序中使用 API 密鑰訪問雲端數據庫。

## 已配置的 API 密鑰
- **公開 API 密鑰**: `ttdrcccy`
- **私有 API 密鑰**: `2b207365-cbf0-4e42-a3bf-f932c84557c4`

## 新增的文件

### 1. CloudAPIService.kt
雲端數據庫 API 服務類，提供以下功能：
- 測試 API 連接
- 從雲端獲取學生資料
- 上傳學生資料到雲端
- 用戶身份驗證

### 2. APIConfig.kt
API 配置管理類，提供以下功能：
- 管理 API 密鑰
- 配置基礎 URL
- 數據庫設置
- 配置驗證

## 使用方法

### 1. 初始化 API 服務
```kotlin
// 在 Activity 或 Fragment 中
private lateinit var cloudApiService: CloudAPIService

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    cloudApiService = CloudAPIService(this)
}
```

### 2. 測試 API 連接
```kotlin
lifecycleScope.launch {
    try {
        val result = cloudApiService.testConnection()
        if (result.success) {
            Log.d("API", "✅ 連接成功: ${result.message}")
        } else {
            Log.e("API", "❌ 連接失敗: ${result.message}")
        }
    } catch (e: Exception) {
        Log.e("API", "❌ 連接異常", e)
    }
}
```

### 3. 從雲端獲取學生資料
```kotlin
lifecycleScope.launch {
    try {
        val students = cloudApiService.fetchStudentsFromCloud()
        Log.d("API", "✅ 獲取到 ${students.size} 條學生資料")
        // 處理學生資料
        updateUI(students)
    } catch (e: Exception) {
        Log.e("API", "❌ 獲取學生資料失敗", e)
    }
}
```

### 4. 上傳學生資料到雲端
```kotlin
lifecycleScope.launch {
    try {
        val result = cloudApiService.uploadStudentsToCloud(studentsList)
        if (result.success) {
            Log.d("API", "✅ 上傳成功: ${result.message}")
        } else {
            Log.e("API", "❌ 上傳失敗: ${result.message}")
        }
    } catch (e: Exception) {
        Log.e("API", "❌ 上傳異常", e)
    }
}
```

### 5. 用戶身份驗證
```kotlin
lifecycleScope.launch {
    try {
        val result = cloudApiService.authenticateUser(username, password)
        if (result.success) {
            Log.d("API", "✅ 登入成功")
            // 跳轉到主界面
            startMainActivity()
        } else {
            Log.w("API", "⚠️ 登入失敗: ${result.message}")
            // 顯示錯誤信息
            showLoginError(result.message)
        }
    } catch (e: Exception) {
        Log.e("API", "❌ 登入異常", e)
    }
}
```

## 配置管理

### 1. 獲取配置信息
```kotlin
val apiConfig = APIConfig.getInstance(this)
val configInfo = apiConfig.getConfigInfo()
Log.d("Config", "配置信息: $configInfo")
```

### 2. 更新 API 密鑰
```kotlin
val apiConfig = APIConfig.getInstance(this)
apiConfig.setPublicApiKey("新的公開密鑰")
apiConfig.setPrivateApiKey("新的私有密鑰")
```

### 3. 更新基礎 URL
```kotlin
val apiConfig = APIConfig.getInstance(this)
apiConfig.setBaseUrl("https://your-new-api-domain.com")
```

### 4. 驗證配置
```kotlin
val apiConfig = APIConfig.getInstance(this)
if (apiConfig.isValidConfig()) {
    Log.d("Config", "✅ 配置有效")
} else {
    Log.w("Config", "⚠️ 配置無效")
}
```

## API 端點說明

### 1. 健康檢查
- **端點**: `GET /health`
- **用途**: 測試 API 連接狀態
- **響應**: 連接狀態信息

### 2. 獲取學生資料
- **端點**: `GET /students`
- **用途**: 從雲端獲取所有學生資料
- **響應**: 學生資料 JSON 數組

### 3. 批量上傳學生資料
- **端點**: `POST /students/batch`
- **用途**: 批量上傳學生資料到雲端
- **請求體**: 學生資料 JSON 數組
- **響應**: 上傳結果

### 4. 用戶登入
- **端點**: `POST /auth/login`
- **用途**: 驗證用戶身份
- **請求體**: 用戶名和密碼
- **響應**: 登入結果

## 請求頭配置

所有 API 請求都包含以下請求頭：
- `Content-Type: application/json`
- `User-Agent: SwimmingApp/1.0`
- `X-API-Public-Key: [您的公開API密鑰]`
- `X-API-Private-Key: [您的私有API密鑰]`
- `Accept: application/json`

## 錯誤處理

### 1. 網絡錯誤
```kotlin
try {
    val result = cloudApiService.testConnection()
    // 處理結果
} catch (e: Exception) {
    when (e) {
        is java.net.UnknownHostException -> {
            // 處理 DNS 解析錯誤
            showError("無法連接到服務器，請檢查網絡連接")
        }
        is java.net.SocketTimeoutException -> {
            // 處理超時錯誤
            showError("連接超時，請稍後重試")
        }
        else -> {
            // 處理其他錯誤
            showError("連接失敗: ${e.message}")
        }
    }
}
```

### 2. API 錯誤
```kotlin
val result = cloudApiService.authenticateUser(username, password)
when (result.errorCode) {
    401 -> showError("用戶名或密碼錯誤")
    403 -> showError("API 密鑰無效")
    404 -> showError("API 端點不存在")
    500 -> showError("服務器內部錯誤")
    else -> showError("未知錯誤: ${result.message}")
}
```

## 安全注意事項

### 1. API 密鑰保護
- API 密鑰存儲在 SharedPreferences 中
- 私有密鑰在日誌中會被部分隱藏
- 建議定期更換 API 密鑰

### 2. 網絡安全
- 使用 HTTPS 協議
- 設置適當的超時時間
- 處理網絡異常

### 3. 數據驗證
- 驗證 API 響應格式
- 檢查必要字段是否存在
- 處理空數據情況

## 調試技巧

### 1. 啟用詳細日誌
```kotlin
// 在 Application 類中
if (BuildConfig.DEBUG) {
    Log.d("API", "詳細日誌已啟用")
}
```

### 2. 測試連接
```kotlin
// 在開發階段測試 API 連接
lifecycleScope.launch {
    val result = cloudApiService.testConnection()
    Log.d("Debug", "API 測試結果: $result")
}
```

### 3. 檢查配置
```kotlin
val apiConfig = APIConfig.getInstance(this)
Log.d("Debug", "當前配置: ${apiConfig.getConfigInfo()}")
```

## 部署檢查清單

### 開發環境
- [ ] API 密鑰已正確配置
- [ ] 基礎 URL 指向正確的服務器
- [ ] 網絡權限已添加
- [ ] API 連接測試通過

### 生產環境
- [ ] 使用生產環境的 API 端點
- [ ] 驗證 API 密鑰權限
- [ ] 測試所有 API 功能
- [ ] 檢查錯誤處理機制

## 故障排除

### 常見問題

1. **連接失敗**
   - 檢查網絡連接
   - 驗證 API 端點 URL
   - 確認 API 密鑰正確

2. **認證失敗**
   - 檢查 API 密鑰格式
   - 驗證密鑰權限
   - 確認請求頭設置正確

3. **數據解析錯誤**
   - 檢查 JSON 格式
   - 驗證響應結構
   - 處理空數據情況

### 調試步驟
1. 檢查 Logcat 日誌
2. 驗證 API 配置
3. 測試網絡連接
4. 檢查服務器狀態

## 聯繫支持

如有任何問題，請聯繫開發團隊或查看相關文檔。 