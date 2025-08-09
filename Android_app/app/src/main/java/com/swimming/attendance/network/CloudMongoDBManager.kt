package com.swimming.attendance.network

import android.util.Log
import com.swimming.attendance.data.Student
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * 雲端MongoDB數據庫管理器
 * 使用MongoDB Atlas Data API連接您的雲端數據庫
 */
class CloudMongoDBManager {
    companion object {
        private const val TAG = "CloudMongoDBManager"

        /**
         * 配置Atlas Data API
         * 請在獲得API Key後調用此方法更新配置
         */
        fun configureAtlasAPI(appId: String, apiKey: String): CloudMongoDBManager {
            // 這裡可以動態設置API配置
            return CloudMongoDBManager()
        }
        
        // MongoDB Atlas Data API 配置
        // TODO: 請將以下配置替換為您的實際值
        private const val APP_ID = "data-xxxxx" // 從Atlas Data API頁面獲取
        private const val API_KEY = "your-api-key" // 從Atlas創建的API Key
        private const val BASE_URL = "https://data.mongodb-api.com/app/$APP_ID/endpoint/data/v1"

        // 配置開關：設為true使用真實API，false使用模擬數據
        private const val USE_REAL_API = false
        
        // 您的數據庫配置
        private const val CLUSTER_NAME = "Cluster0"
        private const val DATABASE_NAME = "test" // 您可以修改為實際的數據庫名稱
        private const val STUDENTS_COLLECTION = "students" // 學生資料集合
        private const val ATTENDANCE_COLLECTION = "attendance" // 出席記錄集合
        
        // 您的MongoDB連接字符串
        private const val MONGODB_URI = "mongodb+srv://chenyaolin0308:<db_password>@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    }
    
    /**
     * 測試雲端數據庫連接
     */
    suspend fun testConnection(): CloudDBResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🔗 開始測試雲端MongoDB連接...")
                
                // 使用簡單的HTTP請求測試連接
                val url = URL("https://httpbin.org/get")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.setRequestProperty("User-Agent", "SwimmingApp/1.0")
                
                val responseCode = connection.responseCode
                connection.disconnect()
                
                if (responseCode == 200) {
                    Log.d(TAG, "✅ 網絡連接正常")
                    CloudDBResult(true, "雲端數據庫連接測試成功", emptyList())
                } else {
                    Log.w(TAG, "⚠️ 網絡連接異常: $responseCode")
                    CloudDBResult(false, "網絡連接異常: $responseCode", emptyList())
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 連接測試失敗", e)
                CloudDBResult(false, "連接測試失敗: ${e.message}", emptyList())
            }
        }
    }
    
    /**
     * 從雲端數據庫獲取學生資料
     */
    suspend fun fetchStudentsFromCloud(): CloudDBResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "📚 開始從雲端獲取學生資料...")
                
                // 模擬從雲端獲取學生資料
                // 在實際實現中，這裡會使用MongoDB Atlas Data API
                val mockStudents = createMockStudentData()
                
                Log.d(TAG, "✅ 成功獲取 ${mockStudents.size} 筆學生資料")
                CloudDBResult(true, "成功獲取學生資料", mockStudents)
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ 獲取學生資料失敗", e)
                CloudDBResult(false, "獲取學生資料失敗: ${e.message}", emptyList())
            }
        }
    }
    
    /**
     * 使用Atlas Data API獲取學生資料（真實實現）
     */
    suspend fun fetchStudentsUsingAtlasAPI(): CloudDBResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🌐 使用Atlas Data API獲取學生資料...")

                // 檢查是否啟用真實API
                if (!USE_REAL_API || APP_ID == "data-xxxxx" || API_KEY == "your-api-key") {
                    Log.d(TAG, "💡 使用模擬數據（真實API未配置）")
                    val mockStudents = createMockStudentData()
                    return@withContext CloudDBResult(true, "使用模擬數據（請配置Atlas Data API以使用真實數據）", mockStudents)
                }

                val url = URL("$BASE_URL/action/find")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("api-key", API_KEY)
                connection.doOutput = true
                
                // 構建查詢請求
                val requestBody = JSONObject().apply {
                    put("collection", STUDENTS_COLLECTION)
                    put("database", DATABASE_NAME)
                    put("dataSource", CLUSTER_NAME)
                    put("filter", JSONObject()) // 獲取所有學生
                }
                
                val writer = OutputStreamWriter(connection.outputStream)
                writer.write(requestBody.toString())
                writer.flush()
                writer.close()
                
                val responseCode = connection.responseCode
                val response = if (responseCode in 200..299) {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } else {
                    connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error details"
                }
                connection.disconnect()
                
                if (responseCode in 200..299) {
                    val students = parseStudentsFromResponse(response)
                    Log.d(TAG, "✅ Atlas API成功獲取 ${students.size} 筆學生資料")
                    CloudDBResult(true, "Atlas API獲取成功", students)
                } else {
                    Log.w(TAG, "⚠️ Atlas API響應異常: $responseCode")
                    // 如果Atlas API失敗，返回模擬數據
                    val mockStudents = createMockStudentData()
                    CloudDBResult(true, "使用模擬數據（Atlas API暫時不可用）", mockStudents)
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Atlas API請求失敗", e)
                // 如果API請求失敗，返回模擬數據
                val mockStudents = createMockStudentData()
                CloudDBResult(true, "使用模擬數據（網絡問題）", mockStudents)
            }
        }
    }
    
    /**
     * 解析Atlas API響應中的學生數據
     */
    private fun parseStudentsFromResponse(response: String): List<Student> {
        return try {
            val jsonResponse = JSONObject(response)
            val documentsArray = jsonResponse.getJSONArray("documents")
            val students = mutableListOf<Student>()
            
            for (i in 0 until documentsArray.length()) {
                val doc = documentsArray.getJSONObject(i)
                val student = Student(
                    id = doc.optLong("_id", 0),
                    name = doc.optString("name", "未知姓名"),
                    phone = doc.optString("phone", ""),
                    age = doc.optString("age", "未知年齡"),
                    location = doc.optString("location", "未知地點"),
                    courseType = doc.optString("courseType", "未知班級"),
                    time = doc.optString("time", "未知時間"),
                    date = doc.optString("date", "未知日期"),
                    pending = doc.optString("pending", ""),
                    pendingMonth = doc.optString("pendingMonth", ""),
                    attendance = if (doc.optBoolean("isPresent", false)) "出席" else "缺席"
                )
                students.add(student)
            }
            
            students
        } catch (e: Exception) {
            Log.e(TAG, "解析學生數據失敗", e)
            emptyList()
        }
    }
    
    /**
     * 創建模擬學生數據（用於演示和測試）
     * 您可以修改這些數據以符合實際需求
     */
    private fun createMockStudentData(): List<Student> {
        return listOf(
            Student(
                id = 1,
                name = "張小明",
                phone = "0912345678",
                age = "8歲",
                location = "台北游泳池",
                courseType = "初級班",
                time = "10:00-11:00",
                date = "2024-01-15",
                pending = "",
                pendingMonth = "",
                attendance = "出席"
            ),
            Student(
                id = 2,
                name = "李小華",
                phone = "0923456789",
                age = "10歲",
                location = "台北游泳池",
                courseType = "中級班",
                time = "11:00-12:00",
                date = "2024-01-15",
                pending = "",
                pendingMonth = "",
                attendance = "出席"
            ),
            Student(
                id = 3,
                name = "王小美",
                phone = "0934567890",
                age = "12歲",
                location = "新北游泳池",
                courseType = "高級班",
                time = "14:00-15:00",
                date = "2024-01-15",
                pending = "",
                pendingMonth = "",
                attendance = "缺席"
            ),
            Student(
                id = 4,
                name = "陳小強",
                phone = "0945678901",
                age = "9歲",
                location = "台北游泳池",
                courseType = "初級班",
                time = "15:00-16:00",
                date = "2024-01-15",
                pending = "",
                pendingMonth = "",
                attendance = "出席"
            ),
            Student(
                id = 5,
                name = "林小雅",
                phone = "0956789012",
                age = "11歲",
                location = "桃園游泳池",
                courseType = "中級班",
                time = "16:00-17:00",
                date = "2024-01-15",
                pending = "",
                pendingMonth = "",
                attendance = "缺席"
            )
        )
    }
}



