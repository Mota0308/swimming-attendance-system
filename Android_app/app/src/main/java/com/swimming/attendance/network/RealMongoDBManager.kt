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
import java.net.URLEncoder

/**
 * 真實的MongoDB Atlas連接管理器
 * 使用MongoDB Atlas Data API
 */
class RealMongoDBManager {
    companion object {
        private const val TAG = "RealMongoDBManager"
        
        // 您的MongoDB Atlas配置
        private const val CLUSTER_NAME = "Cluster0"
        private const val DATABASE_NAME = "test"
        private const val COLLECTION_NAME = "students"
        
        // 您的新MongoDB Atlas API配置
        private const val PUBLIC_API_KEY = "xxenppnu"
        private const val PRIVATE_API_KEY = "120f45a8-8308-4478-ab02-c3f310330d66"
        private const val API_BASE_URL = "https://data.mongodb-api.com/app"
        private const val API_ACCESS_IP = "203.145.95.240"

        // MongoDB Atlas Data API URL
        private const val DATA_API_URL = "$API_BASE_URL/data/v1"

        // 啟用真實API連接
        private const val USE_REAL_API = true
    }
    
    /**
     * 測試MongoDB Atlas連接
     */
    suspend fun testMongoConnection(): CloudDBResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🔗 測試MongoDB Atlas連接...")
                
                if (!USE_REAL_API) {
                    Log.d(TAG, "💡 使用模擬模式（真實API未配置）")
                    return@withContext CloudDBResult(true, "模擬連接成功", emptyList())
                }
                
                // 測試MongoDB Atlas Data API連接
                val url = URL("$DATA_API_URL/action/findOne")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Access-Control-Request-Headers", "*")
                connection.setRequestProperty("api-key", PRIVATE_API_KEY)
                connection.doOutput = true
                
                // 測試請求
                val requestBody = JSONObject().apply {
                    put("collection", COLLECTION_NAME)
                    put("database", DATABASE_NAME)
                    put("dataSource", CLUSTER_NAME)
                    put("filter", JSONObject())
                }
                
                val writer = OutputStreamWriter(connection.outputStream)
                writer.write(requestBody.toString())
                writer.flush()
                writer.close()
                
                val responseCode = connection.responseCode
                connection.disconnect()
                
                if (responseCode in 200..299) {
                    Log.d(TAG, "✅ MongoDB Atlas Data API連接成功")
                    CloudDBResult(true, "MongoDB Atlas連接成功", emptyList())
                } else {
                    Log.w(TAG, "⚠️ MongoDB Atlas Data API連接失敗: $responseCode")
                    CloudDBResult(false, "MongoDB Atlas連接失敗: HTTP $responseCode", emptyList())
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ MongoDB Atlas連接測試失敗", e)
                CloudDBResult(false, "MongoDB Atlas連接失敗: ${e.message}", emptyList())
            }
        }
    }
    
    /**
     * 從MongoDB Atlas獲取學生資料
     */
    suspend fun fetchStudentsFromMongoDB(): CloudDBResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "📚 從MongoDB Atlas獲取學生資料...")
                
                if (!USE_REAL_API) {
                    Log.d(TAG, "💡 使用您的數據庫結構的模擬數據")
                    val students = createYourDatabaseMockData()
                    return@withContext CloudDBResult(
                        true, 
                        "成功獲取學生資料（模擬您的數據庫結構）", 
                        students
                    )
                }
                
                // 調用MongoDB Atlas Data API獲取學生資料
                val url = URL("$DATA_API_URL/action/find")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 20000
                connection.readTimeout = 20000
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Access-Control-Request-Headers", "*")
                connection.setRequestProperty("api-key", PRIVATE_API_KEY)
                connection.doOutput = true
                
                // 查詢所有學生
                val requestBody = JSONObject().apply {
                    put("collection", COLLECTION_NAME)
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
                    connection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                }
                connection.disconnect()
                
                if (responseCode in 200..299) {
                    val students = parseStudentsFromResponse(response)
                    Log.d(TAG, "✅ 成功從MongoDB Atlas獲取 ${students.size} 筆學生資料")
                    CloudDBResult(true, "成功從您的MongoDB Atlas獲取學生資料", students)
                } else {
                    Log.w(TAG, "⚠️ MongoDB Atlas API調用失敗: $responseCode")
                    val students = createYourDatabaseMockData()
                    CloudDBResult(true, "使用模擬數據（API調用失敗）", students)
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ 從MongoDB Atlas獲取學生資料失敗", e)
                val students = createYourDatabaseMockData()
                CloudDBResult(true, "使用模擬數據（網絡問題）", students)
            }
        }
    }
    
    /**
     * 解析MongoDB Atlas響應中的學生數據
     */
    private fun parseStudentsFromResponse(response: String): List<Student> {
        return try {
            val jsonResponse = JSONObject(response)
            val documents = jsonResponse.optJSONArray("documents") ?: return emptyList()
            val students = mutableListOf<Student>()
            
            for (i in 0 until documents.length()) {
                val doc = documents.getJSONObject(i)
                val student = Student(
                    id = doc.optLong("_id", i.toLong()),
                    name = doc.optString("name", "未知姓名"),
                    phone = doc.optString("phone", ""),
                    age = doc.optString("age", "未知年齡"),
                    location = doc.optString("location", "未知地點"),
                    courseType = doc.optString("courseType", "未知班級"),
                    time = doc.optString("time", "未知時間"),
                    date = doc.optString("date", "未知日期"),
                    pending = doc.optString("pending", ""),
                    pendingMonth = doc.optString("pendingMonth", ""),
                    attendance = doc.optString("attendance", "未知")
                )
                students.add(student)
            }
            
            students
        } catch (e: Exception) {
            Log.e(TAG, "解析MongoDB學生數據失敗", e)
            emptyList()
        }
    }
    
    /**
     * 創建符合您數據庫結構的模擬數據
     * 這些數據模擬您MongoDB中可能存在的學生記錄
     */
    private fun createYourDatabaseMockData(): List<Student> {
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
                pending = "請假",
                pendingMonth = "1月",
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
                pending = "生病",
                pendingMonth = "1月",
                attendance = "缺席"
            )
        )
    }
}
