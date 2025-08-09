# REST API 連接 MongoDB 數據庫使用指南

## 概述
本指南詳細說明如何通過REST API讓手機應用間接連接MongoDB數據庫，實現安全的雲端數據訪問。

## 🚀 快速開始

### 1. 啟動API服務器
```bash
# 進入API服務器目錄
cd api-server

# 安裝依賴（首次運行）
npm install

# 啟動服務器
npm start
```

### 2. 測試連接
```bash
# 使用提供的測試腳本
test-api.bat

# 或手動測試
curl -H "X-API-Public-Key: ttdrcccy" \
     -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
     http://localhost:3000/health
```

## 📊 API 端點詳解

### 🔍 健康檢查
```
GET /health
```
**用途**: 測試API服務器狀態
**請求頭**:
```
X-API-Public-Key: ttdrcccy
X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4
```
**響應示例**:
```json
{
  "success": true,
  "message": "API 服務器運行正常",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "server": "http://203.145.95.240:3000",
  "database": "MongoDB Atlas",
  "version": "1.0.0"
}
```

### 👥 學生資料管理

#### 獲取所有學生
```
GET /students
```
**響應**: 學生資料JSON數組
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "張小明",
    "age": 10,
    "level": "初級",
    "phone": "0912345678",
    "parentName": "張爸爸",
    "parentPhone": "0987654321",
    "joinDate": "2024-01-15T00:00:00.000Z",
    "status": "active"
  }
]
```

#### 批量上傳學生
```
POST /students/batch
```
**請求體**:
```json
[
  {
    "name": "李小華",
    "age": 8,
    "level": "初級",
    "phone": "0923456789",
    "parentName": "李媽媽",
    "parentPhone": "0976543210",
    "joinDate": "2024-12-19T10:30:00.000Z",
    "status": "active"
  }
]
```
**響應**:
```json
{
  "success": true,
  "message": "成功上傳 1 條學生資料",
  "insertedCount": 1,
  "insertedIds": ["507f1f77bcf86cd799439012"]
}
```

#### 獲取單個學生
```
GET /students/:id
```
**響應**: 單個學生資料

#### 更新學生資料
```
PUT /students/:id
```
**請求體**: 更新的學生資料
**響應**:
```json
{
  "success": true,
  "message": "學生資料更新成功",
  "modifiedCount": 1
}
```

#### 刪除學生資料
```
DELETE /students/:id
```
**響應**:
```json
{
  "success": true,
  "message": "學生資料刪除成功",
  "deletedCount": 1
}
```

### 🔐 用戶認證

#### 用戶登入
```
POST /auth/login
```
**請求體**:
```json
{
  "username": "coach",
  "password": "password123"
}
```
**響應**:
```json
{
  "success": true,
  "message": "登入成功",
  "user": {
    "id": "507f1f77bcf86cd799439013",
    "username": "coach",
    "role": "coach"
  }
}
```

## 📱 手機應用整合

### Android 應用配置

#### 1. API 配置類
```kotlin
// APIConfig.kt
class APIConfig private constructor(context: Context) {
    companion object {
        private const val DEFAULT_BASE_URL = "http://203.145.95.240:3000"
        private const val DEFAULT_PUBLIC_API_KEY = "ttdrcccy"
        private const val DEFAULT_PRIVATE_API_KEY = "2b207365-cbf0-4e42-a3bf-f932c84557c4"
    }
    
    fun getBaseUrl(): String = DEFAULT_BASE_URL
    fun getPublicApiKey(): String = DEFAULT_PUBLIC_API_KEY
    fun getPrivateApiKey(): String = DEFAULT_PRIVATE_API_KEY
}
```

#### 2. API 服務類
```kotlin
// CloudAPIService.kt
class CloudAPIService(private val context: Context) {
    private val apiConfig = APIConfig.getInstance(context)
    
    suspend fun testConnection(): APIResponse {
        return makeRequest("/health", "GET")
    }
    
    suspend fun fetchStudentsFromCloud(): List<Student> {
        val response = makeRequest("/students", "GET")
        return parseStudents(response.data)
    }
    
    suspend fun uploadStudentsToCloud(students: List<Student>): APIResponse {
        return makeRequest("/students/batch", "POST", students)
    }
    
    suspend fun authenticateUser(username: String, password: String): APIResponse {
        val loginData = mapOf("username" to username, "password" to password)
        return makeRequest("/auth/login", "POST", loginData)
    }
    
    private suspend fun makeRequest(endpoint: String, method: String, data: Any? = null): APIResponse {
        return withContext(Dispatchers.IO) {
            val url = URL(apiConfig.getBaseUrl() + endpoint)
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = method
            connection.setRequestProperty("X-API-Public-Key", apiConfig.getPublicApiKey())
            connection.setRequestProperty("X-API-Private-Key", apiConfig.getPrivateApiKey())
            connection.setRequestProperty("Content-Type", "application/json")
            
            if (data != null && method == "POST") {
                connection.doOutput = true
                val jsonData = JSONObject(data as Map<*, *>).toString()
                connection.outputStream.write(jsonData.toByteArray())
            }
            
            val responseCode = connection.responseCode
            val response = readResponse(connection)
            
            APIResponse(responseCode == 200, response)
        }
    }
}
```

#### 3. 使用示例
```kotlin
// 在 Activity 中使用
class MainActivity : AppCompatActivity() {
    private lateinit var cloudApiService: CloudAPIService
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cloudApiService = CloudAPIService(this)
        
        // 測試連接
        lifecycleScope.launch {
            try {
                val result = cloudApiService.testConnection()
                if (result.success) {
                    Log.d("API", "✅ 連接成功")
                } else {
                    Log.e("API", "❌ 連接失敗")
                }
            } catch (e: Exception) {
                Log.e("API", "❌ 連接異常", e)
            }
        }
        
        // 獲取學生資料
        lifecycleScope.launch {
            try {
                val students = cloudApiService.fetchStudentsFromCloud()
                Log.d("API", "✅ 獲取到 ${students.size} 條學生資料")
                updateUI(students)
            } catch (e: Exception) {
                Log.e("API", "❌ 獲取學生資料失敗", e)
            }
        }
    }
}
```

## 🔧 配置說明

### API 密鑰
- **公開密鑰**: `ttdrcccy`
- **私有密鑰**: `2b207365-cbf0-4e42-a3bf-f932c84557c4`

### 數據庫配置
- **MongoDB URI**: `mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/`
- **數據庫名稱**: `test`
- **學生集合**: `students`
- **賬號集合**: `Student_account`

### 服務器配置
- **端口**: 3000
- **服務器IP**: 203.145.95.240
- **基礎URL**: `http://203.145.95.240:3000`

## 🛡️ 安全特性

### 1. API 密鑰驗證
所有請求必須包含有效的API密鑰：
```
X-API-Public-Key: ttdrcccy
X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4
```

### 2. CORS 支持
服務器已配置CORS中間件，支持跨域請求。

### 3. 請求日誌
所有API請求都會被記錄，包括：
- 請求時間
- 請求方法
- 請求路徑
- 客戶端IP
- 響應狀態

### 4. 錯誤處理
統一的錯誤響應格式：
```json
{
  "success": false,
  "message": "錯誤描述",
  "error": "詳細錯誤信息"
}
```

## 📋 測試指南

### 1. 使用測試腳本
```bash
# 運行完整測試
node test-api.js

# 或使用批處理文件
test-api.bat
```

### 2. 使用 curl 測試
```bash
# 健康檢查
curl -H "X-API-Public-Key: ttdrcccy" \
     -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
     http://localhost:3000/health

# 獲取學生資料
curl -H "X-API-Public-Key: ttdrcccy" \
     -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
     http://localhost:3000/students

# 用戶登入
curl -X POST \
     -H "X-API-Public-Key: ttdrcccy" \
     -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}' \
     http://localhost:3000/auth/login
```

### 3. 使用 Postman 測試
1. 創建新的請求
2. 設置請求頭：
   - `X-API-Public-Key: ttdrcccy`
   - `X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4`
   - `Content-Type: application/json`
3. 發送請求到相應端點

## 🚀 部署指南

### 本地開發
```bash
cd api-server
npm run dev
```

### 生產環境
```bash
# 使用 PM2 進程管理器
npm install -g pm2
pm2 start server.js --name "swimming-api"
pm2 startup
pm2 save
```

### 雲端部署選項
1. **Heroku** - 免費層級，簡單部署
2. **Vercel** - 快速部署，自動擴展
3. **Railway** - 簡單易用，支持數據庫
4. **DigitalOcean** - 完全控制，成本較低

## 🔍 故障排除

### 常見問題

#### 1. 服務器無法啟動
**問題**: 端口被佔用
**解決**: 
```bash
lsof -i :3000
kill -9 <PID>
```

#### 2. MongoDB 連接失敗
**問題**: 網絡連接或憑證問題
**解決**: 
- 檢查網絡連接
- 驗證MongoDB URI
- 確認數據庫憑證

#### 3. API 密鑰驗證失敗
**問題**: 請求頭設置錯誤
**解決**: 檢查API密鑰格式和請求頭設置

#### 4. CORS 錯誤
**問題**: 跨域請求被阻止
**解決**: 確保CORS中間件已正確配置

### 調試步驟
1. 檢查服務器日誌
2. 驗證API配置
3. 測試網絡連接
4. 檢查數據庫狀態

## 📊 性能優化

### 1. 數據庫連接池
```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 2. 緩存
```bash
npm install redis
```

### 3. 壓縮
```bash
npm install compression
```

```javascript
const compression = require('compression');
app.use(compression());
```

## 📈 監控和日誌

### 日誌記錄
```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

### 錯誤監控
```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🔄 備份和恢復

### 數據庫備份
```bash
# MongoDB 備份
mongodump --uri="mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/test"

# 恢復備份
mongorestore --uri="mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/test" dump/
```

### 代碼備份
使用Git進行版本控制：
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <repository-url>
git push -u origin main
```

## 📞 聯繫支持

如有任何問題，請聯繫開發團隊或查看相關文檔。

---

**版本**: 1.0.0  
**最後更新**: 2024年12月  
**維護者**: Swimming Attendance System Team 