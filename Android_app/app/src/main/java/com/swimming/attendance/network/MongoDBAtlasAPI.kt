package com.swimming.attendance.network

import android.util.Log
import com.swimming.attendance.data.Student
import com.swimming.attendance.data.UserAccount
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
 * MongoDB Atlas Data API 客戶端
 * 使用HTTP REST API訪問MongoDB，避免直接連接問題
 */
class MongoDBAtlasAPI {
    companion object {
        private const val TAG = "MongoDBAtlasAPI"
        
        // MongoDB Atlas Data API 配置
        private const val APP_ID = "data-xxxxx" // 需要配置
        private const val API_KEY = "your-api-key" // 需要配置
        private const val BASE_URL = "https://data.mongodb-api.com/app/$APP_ID/endpoint/data/v1"
        
        // 數據庫配置
        private const val CLUSTER_NAME = "Cluster0"
        private const val DATABASE_NAME = "test"
        private const val ACCOUNTS_COLLECTION = "Student_account"
        private const val STUDENTS_COLLECTION = "students"
        
        // 備用方案：使用簡單的測試服務
        private const val TEST_MODE = true
        private const val TEST_BASE_URL = "https://httpbin.org"
    }
    
    /**
     * 測試API連接
     */
    suspend fun testConnection(): APITestResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🧪 開始測試Atlas Data API連接...")
                
                if (TEST_MODE) {
                    // 測試模式：使用httpbin.org測試HTTP功能
                    return@withContext testHTTPConnection()
                } else {
                    // 正式模式：使用真實的Atlas Data API
                    return@withContext testAtlasAPI()
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ API連接測試失敗", e)
                APITestResult(false, "API測試失敗: ${e.message}")
            }
        }
    }
    
    /**
     * 測試HTTP連接功能
     */
    private suspend fun testHTTPConnection(): APITestResult {
        return try {
            Log.d(TAG, "🌐 測試HTTP連接功能...")
            
            val url = URL("$TEST_BASE_URL/get")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.setRequestProperty("User-Agent", "SwimmingApp/1.0")
            
            val responseCode = connection.responseCode
            val response = if (responseCode == 200) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                "HTTP Error: $responseCode"
            }
            connection.disconnect()
            
            if (responseCode == 200) {
                Log.d(TAG, "✅ HTTP連接測試成功")
                APITestResult(true, "HTTP API連接正常", responseCode, response.take(100))
            } else {
                Log.w(TAG, "⚠️ HTTP連接異常: $responseCode")
                APITestResult(false, "HTTP響應異常: $responseCode", responseCode)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ HTTP連接測試失敗", e)
            APITestResult(false, "HTTP連接失敗: ${e.message}")
        }
    }
    
    /**
     * 測試Atlas Data API
     */
    private suspend fun testAtlasAPI(): APITestResult {
        return try {
            Log.d(TAG, "🔗 測試Atlas Data API...")
            
            val url = URL("$BASE_URL/action/findOne")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("api-key", API_KEY)
            connection.doOutput = true
            
            // 測試查詢
            val requestBody = JSONObject().apply {
                put("collection", ACCOUNTS_COLLECTION)
                put("database", DATABASE_NAME)
                put("dataSource", CLUSTER_NAME)
                put("filter", JSONObject())
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
                Log.d(TAG, "✅ Atlas Data API測試成功")
                APITestResult(true, "Atlas Data API連接正常", responseCode, response.take(100))
            } else {
                Log.w(TAG, "⚠️ Atlas Data API異常: $responseCode")
                APITestResult(false, "Atlas API響應異常: $responseCode", responseCode, response.take(100))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Atlas Data API測試失敗", e)
            APITestResult(false, "Atlas API連接失敗: ${e.message}")
        }
    }
    
    /**
     * 創建用戶賬號（使用API）
     */
    suspend fun createUserAccount(user: UserAccount): APITestResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "👤 開始創建用戶賬號: ${user.phone}")
                
                if (TEST_MODE) {
                    return@withContext createUserAccountTest(user)
                } else {
                    return@withContext createUserAccountAtlas(user)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 創建用戶賬號失敗", e)
                APITestResult(false, "創建賬號失敗: ${e.message}")
            }
        }
    }
    
    /**
     * 測試模式創建用戶賬號
     */
    private suspend fun createUserAccountTest(user: UserAccount): APITestResult {
        return try {
            Log.d(TAG, "🧪 測試模式創建用戶賬號...")
            
            val url = URL("$TEST_BASE_URL/post")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            
            // 創建測試用戶數據
            val userData = JSONObject().apply {
                put("action", "createAccount")
                put("collection", ACCOUNTS_COLLECTION)
                put("database", DATABASE_NAME)
                put("document", JSONObject().apply {
                    put("phone", user.phone)
                    put("password", user.password)
                    put("userType", user.userType)
                    put("createdAt", user.createdAt)
                    put("testMode", true)
                })
            }
            
            val writer = OutputStreamWriter(connection.outputStream)
            writer.write(userData.toString())
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
                Log.d(TAG, "✅ 測試模式創建賬號成功")
                APITestResult(true, "賬號創建成功（測試模式）", responseCode, response.take(100))
            } else {
                Log.w(TAG, "⚠️ 測試模式創建賬號失敗: $responseCode")
                APITestResult(false, "創建賬號失敗: $responseCode", responseCode, response.take(100))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ 測試模式創建賬號異常", e)
            APITestResult(false, "創建賬號異常: ${e.message}")
        }
    }
    
    /**
     * Atlas模式創建用戶賬號
     */
    private suspend fun createUserAccountAtlas(user: UserAccount): APITestResult {
        return try {
            Log.d(TAG, "🔗 Atlas模式創建用戶賬號...")
            
            val url = URL("$BASE_URL/action/insertOne")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("api-key", API_KEY)
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("collection", ACCOUNTS_COLLECTION)
                put("database", DATABASE_NAME)
                put("dataSource", CLUSTER_NAME)
                put("document", JSONObject().apply {
                    put("phone", user.phone)
                    put("password", user.password)
                    put("userType", user.userType)
                    put("createdAt", user.createdAt)
                })
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
                Log.d(TAG, "✅ Atlas模式創建賬號成功")
                APITestResult(true, "賬號創建成功", responseCode, response.take(100))
            } else {
                Log.w(TAG, "⚠️ Atlas模式創建賬號失敗: $responseCode")
                APITestResult(false, "創建賬號失敗: $responseCode", responseCode, response.take(100))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Atlas模式創建賬號異常", e)
            APITestResult(false, "創建賬號異常: ${e.message}")
        }
    }
    
    /**
     * 驗證用戶登入
     */
    suspend fun validateUserLogin(phone: String, password: String): APITestResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🔍 開始驗證用戶登入: $phone")

                // 測試模式：模擬登入驗證
                if (TEST_MODE) {
                    // 支持多個測試賬號
                    val validAccounts = mapOf(
                        "test" to "123456",
                        "0912345678" to "123456",
                        "admin" to "admin123",
                        "demo" to "demo123"
                    )

                    if (validAccounts[phone] == password) {
                        APITestResult(true, "登入成功（測試模式）", 200, "用戶類型: parent")
                    } else {
                        APITestResult(false, "登入失敗（測試模式）", 401, "用戶名或密碼錯誤")
                    }
                } else {
                    // Atlas模式：實際API查詢
                    // TODO: 實現Atlas登入驗證
                    APITestResult(false, "Atlas登入驗證尚未實現", 501)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 驗證用戶登入失敗", e)
                APITestResult(false, "登入驗證失敗: ${e.message}")
            }
        }
    }
}

/**
 * API測試結果
 */
data class APITestResult(
    val success: Boolean,
    val message: String,
    val responseCode: Int = 0,
    val responseData: String = ""
)
