package com.swimming.attendance.network

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * MongoDB REST API客戶端 - 使用HTTP請求而不是MongoDB驅動
 * 這是一個更安全的替代方案，避免Android上的MongoDB驅動兼容性問題
 */
class MongoDBRestClient {
    companion object {
        private const val TAG = "MongoDBRestClient"
        
        // MongoDB Atlas Data API配置
        private const val CLUSTER_NAME = "cluster0"
        private const val DATABASE_NAME = "test"
        private const val API_KEY = "your_api_key_here" // 需要配置
        private const val BASE_URL = "https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1"
        
        // 備用方案：使用簡單的測試API
        private const val TEST_API_URL = "https://httpbin.org/post"
    }
    
    /**
     * 測試基本HTTP連接
     */
    suspend fun testHttpConnection(): RestTestResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🌐 開始測試HTTP連接...")
                
                val url = URL("https://httpbin.org/get")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.setRequestProperty("User-Agent", "SwimmingApp/1.0")
                
                val responseCode = connection.responseCode
                val responseMessage = connection.responseMessage
                
                if (responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    connection.disconnect()
                    
                    Log.d(TAG, "✅ HTTP連接測試成功")
                    RestTestResult(true, "HTTP連接正常", responseCode, response.take(200))
                } else {
                    connection.disconnect()
                    Log.w(TAG, "⚠️ HTTP連接異常: $responseCode $responseMessage")
                    RestTestResult(false, "HTTP響應異常: $responseCode $responseMessage", responseCode)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ HTTP連接測試失敗", e)
                RestTestResult(false, "HTTP連接失敗: ${e.message}")
            }
        }
    }
    
    /**
     * 測試POST請求（模擬創建文檔）
     */
    suspend fun testPostRequest(): RestTestResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "📤 開始測試POST請求...")
                
                val url = URL(TEST_API_URL)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("User-Agent", "SwimmingApp/1.0")
                connection.doOutput = true
                
                // 創建測試數據
                val testData = JSONObject().apply {
                    put("phone", "test${System.currentTimeMillis()}")
                    put("password", "123456")
                    put("userType", "parent")
                    put("createdAt", System.currentTimeMillis())
                    put("testMode", true)
                }
                
                // 發送數據
                val writer = OutputStreamWriter(connection.outputStream)
                writer.write(testData.toString())
                writer.flush()
                writer.close()
                
                val responseCode = connection.responseCode
                
                if (responseCode in 200..299) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    connection.disconnect()
                    
                    Log.d(TAG, "✅ POST請求測試成功")
                    RestTestResult(true, "POST請求正常", responseCode, response.take(200))
                } else {
                    val errorResponse = try {
                        connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "無錯誤詳情"
                    } catch (e: Exception) {
                        "無法讀取錯誤詳情"
                    }
                    connection.disconnect()
                    
                    Log.w(TAG, "⚠️ POST請求異常: $responseCode")
                    RestTestResult(false, "POST請求異常: $responseCode", responseCode, errorResponse.take(200))
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ POST請求測試失敗", e)
                RestTestResult(false, "POST請求失敗: ${e.message}")
            }
        }
    }
    
    /**
     * 模擬創建用戶賬號（使用測試API）
     */
    suspend fun createTestAccount(phone: String, password: String, userType: String): RestTestResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "👤 開始創建測試賬號: $phone")
                
                val url = URL(TEST_API_URL)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("User-Agent", "SwimmingApp/1.0")
                connection.doOutput = true
                
                // 創建賬號數據
                val accountData = JSONObject().apply {
                    put("collection", "Student_account")
                    put("database", DATABASE_NAME)
                    put("document", JSONObject().apply {
                        put("phone", phone)
                        put("password", password)
                        put("userType", userType)
                        put("createdAt", System.currentTimeMillis())
                        put("source", "android_app")
                    })
                }
                
                // 發送數據
                val writer = OutputStreamWriter(connection.outputStream)
                writer.write(accountData.toString())
                writer.flush()
                writer.close()
                
                val responseCode = connection.responseCode
                
                if (responseCode in 200..299) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    connection.disconnect()
                    
                    Log.d(TAG, "✅ 測試賬號創建成功")
                    RestTestResult(true, "賬號創建成功", responseCode, response.take(200))
                } else {
                    val errorResponse = try {
                        connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "無錯誤詳情"
                    } catch (e: Exception) {
                        "無法讀取錯誤詳情"
                    }
                    connection.disconnect()
                    
                    Log.w(TAG, "⚠️ 測試賬號創建失敗: $responseCode")
                    RestTestResult(false, "賬號創建失敗: $responseCode", responseCode, errorResponse.take(200))
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 創建測試賬號異常", e)
                RestTestResult(false, "創建賬號異常: ${e.message}")
            }
        }
    }
    
    /**
     * 執行完整的REST API測試
     */
    suspend fun runFullRestTest(): List<RestTestResult> {
        val results = mutableListOf<RestTestResult>()
        
        // 1. 測試基本HTTP連接
        results.add(testHttpConnection())
        
        // 2. 測試POST請求
        results.add(testPostRequest())
        
        // 3. 測試創建賬號
        val testPhone = "test${System.currentTimeMillis()}"
        results.add(createTestAccount(testPhone, "123456", "parent"))
        
        return results
    }
}

/**
 * REST API測試結果
 */
data class RestTestResult(
    val success: Boolean,
    val message: String,
    val responseCode: Int = 0,
    val responseData: String = ""
)
