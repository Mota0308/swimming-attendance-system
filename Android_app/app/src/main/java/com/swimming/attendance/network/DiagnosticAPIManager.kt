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
import java.util.Base64

/**
 * 診斷API管理器
 * 詳細測試和診斷MongoDB Atlas連接問題
 */
class DiagnosticAPIManager {
    companion object {
        private const val TAG = "DiagnosticAPIManager"
        
        // 您的新MongoDB Atlas配置
        private const val PROJECT_ID = "687da4aa0623041875130d8a"
        private const val CLIENT_ID = "mdb_sa_id_6890692e8606f1598fa18993"
        private const val APP_ID = "ff42e178-9aeb-4ce0-8ab3-a86b1ddf77a7"
        private const val PUBLIC_API_KEY = "xxenppnu"
        private const val PRIVATE_API_KEY = "120f45a8-8308-4478-ab02-c3f310330d66"
        
        // 測試用的基本URL
        private const val TEST_URL = "https://httpbin.org/get"
        private const val GOOGLE_URL = "https://www.google.com"
    }
    
    /**
     * 全面診斷網絡和API連接
     */
    suspend fun runFullDiagnostic(): CloudDBResult {
        return withContext(Dispatchers.IO) {
            val diagnosticResults = mutableListOf<String>()
            
            try {
                Log.d(TAG, "🔍 開始全面診斷...")
                diagnosticResults.add("=== MongoDB Atlas 連接診斷報告 ===")
                
                // 1. 基本網絡連接測試
                val networkResult = testBasicNetwork()
                diagnosticResults.add("1. 基本網絡連接: ${if (networkResult) "✅ 成功" else "❌ 失敗"}")
                
                // 2. HTTPS連接測試
                val httpsResult = testHTTPSConnection()
                diagnosticResults.add("2. HTTPS連接: ${if (httpsResult) "✅ 成功" else "❌ 失敗"}")
                
                // 3. 測試httpbin.org（用於驗證HTTP請求）
                val httpbinResult = testHttpBin()
                diagnosticResults.add("3. HTTP請求測試: $httpbinResult")
                
                // 4. 測試MongoDB Atlas域名解析
                val dnsResult = testMongoDBDNS()
                diagnosticResults.add("4. MongoDB DNS解析: $dnsResult")

                // 4.5. 檢測當前IP地址
                val ipResult = detectCurrentIP()
                diagnosticResults.add("4.5. 當前設備IP: $ipResult")
                
                // 5. 測試API Key格式
                val keyFormatResult = validateAPIKeyFormat()
                diagnosticResults.add("5. API Key格式: $keyFormatResult")
                
                // 6. 測試基本認證格式
                val authResult = testBasicAuth()
                diagnosticResults.add("6. 基本認證格式: $authResult")
                
                // 7. 嘗試簡化的Atlas API調用
                val atlasResult = testSimplifiedAtlasAPI()
                diagnosticResults.add("7. 簡化Atlas API: $atlasResult")

                // 8. 嘗試不同的認證方式
                val altAuthResult = testAlternativeAuth()
                diagnosticResults.add("8. 替代認證方式: $altAuthResult")

                // 9. 詳細API Key測試
                val keyTestResult = testAPIKeyDetails()
                diagnosticResults.add("9. API Key詳細測試: $keyTestResult")

                // 9.5. 測試不同認證方式
                val authTestResult = testDifferentAuthMethods()
                diagnosticResults.add("9.5. 不同認證方式測試: $authTestResult")

                // 10. 建議解決方案
                val suggestions = generateSuggestions(atlasResult, keyTestResult)
                diagnosticResults.add("10. 建議解決方案: $suggestions")
                
                // 10. 創建診斷報告
                val fullReport = diagnosticResults.joinToString("\n")
                Log.d(TAG, "診斷報告:\n$fullReport")
                
                // 返回結果和模擬數據
                val students = createDiagnosticStudents()
                CloudDBResult(true, fullReport, students)
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ 診斷過程失敗", e)
                diagnosticResults.add("診斷過程異常: ${e.message}")
                val students = createDiagnosticStudents()
                CloudDBResult(true, diagnosticResults.joinToString("\n"), students)
            }
        }
    }
    
    /**
     * 測試基本網絡連接
     */
    private suspend fun testBasicNetwork(): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL(GOOGLE_URL)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                
                val responseCode = connection.responseCode
                connection.disconnect()
                
                Log.d(TAG, "Google連接測試: $responseCode")
                responseCode in 200..399
            } catch (e: Exception) {
                Log.e(TAG, "基本網絡連接失敗", e)
                false
            }
        }
    }
    
    /**
     * 測試HTTPS連接
     */
    private suspend fun testHTTPSConnection(): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("https://www.mongodb.com")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val responseCode = connection.responseCode
                connection.disconnect()
                
                Log.d(TAG, "MongoDB.com連接測試: $responseCode")
                responseCode in 200..399
            } catch (e: Exception) {
                Log.e(TAG, "HTTPS連接失敗", e)
                false
            }
        }
    }
    
    /**
     * 測試HTTP請求功能
     */
    private suspend fun testHttpBin(): String {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL(TEST_URL)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val responseCode = connection.responseCode
                val response = if (responseCode == 200) {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } else {
                    "HTTP $responseCode"
                }
                connection.disconnect()
                
                Log.d(TAG, "HttpBin測試: $responseCode")
                if (responseCode == 200) "✅ 成功" else "❌ 失敗 ($responseCode)"
            } catch (e: Exception) {
                Log.e(TAG, "HttpBin測試失敗", e)
                "❌ 異常: ${e.message}"
            }
        }
    }
    
    /**
     * 測試MongoDB Atlas域名解析
     */
    private suspend fun testMongoDBDNS(): String {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("https://cloud.mongodb.com")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "HEAD"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val responseCode = connection.responseCode
                connection.disconnect()
                
                Log.d(TAG, "MongoDB Atlas DNS測試: $responseCode")
                if (responseCode in 200..399) "✅ 可達" else "❌ 不可達 ($responseCode)"
            } catch (e: Exception) {
                Log.e(TAG, "MongoDB DNS測試失敗", e)
                "❌ DNS解析失敗: ${e.message}"
            }
        }
    }
    
    /**
     * 驗證API Key格式
     */
    private fun validateAPIKeyFormat(): String {
        return try {
            val publicKeyValid = PUBLIC_API_KEY.isNotEmpty() && PUBLIC_API_KEY.length >= 8
            val privateKeyValid = PRIVATE_API_KEY.isNotEmpty() && PRIVATE_API_KEY.contains("-")
            
            when {
                publicKeyValid && privateKeyValid -> "✅ 格式正確"
                !publicKeyValid -> "❌ Public Key格式異常"
                !privateKeyValid -> "❌ Private Key格式異常"
                else -> "❌ 格式未知問題"
            }
        } catch (e: Exception) {
            "❌ 驗證異常: ${e.message}"
        }
    }
    
    /**
     * 測試基本認證格式
     */
    private fun testBasicAuth(): String {
        return try {
            val credentials = "$PUBLIC_API_KEY:$PRIVATE_API_KEY"
            val basicAuth = "Basic " + Base64.getEncoder().encodeToString(credentials.toByteArray())
            
            Log.d(TAG, "認證字符串長度: ${basicAuth.length}")
            if (basicAuth.length > 20) "✅ 認證格式正確" else "❌ 認證格式異常"
        } catch (e: Exception) {
            "❌ 認證格式異常: ${e.message}"
        }
    }
    
    /**
     * 測試簡化的Atlas API調用
     */
    private suspend fun testSimplifiedAtlasAPI(): String {
        return withContext(Dispatchers.IO) {
            try {
                val credentials = "$PUBLIC_API_KEY:$PRIVATE_API_KEY"
                val basicAuth = "Basic " + Base64.getEncoder().encodeToString(credentials.toByteArray())
                
                // 嘗試最簡單的Atlas API調用
                val url = URL("https://cloud.mongodb.com/api/atlas/v1.0/groups")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.setRequestProperty("Authorization", basicAuth)
                connection.setRequestProperty("Accept", "application/json")
                
                val responseCode = connection.responseCode
                val response = if (responseCode in 200..299) {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } else {
                    connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error details"
                }
                connection.disconnect()
                
                Log.d(TAG, "簡化Atlas API測試: $responseCode")
                Log.d(TAG, "Atlas API響應: ${response.take(200)}")
                
                when (responseCode) {
                    200 -> "✅ API調用成功"
                    401 -> "❌ 認證失敗 (API Key無效或權限不足)"
                    403 -> "❌ 權限被拒絕 (IP不在白名單或權限不足)"
                    404 -> "❌ 端點不存在 (URL路徑錯誤)"
                    429 -> "❌ 請求過於頻繁 (API限流)"
                    500 -> "❌ 服務器內部錯誤"
                    else -> "❌ HTTP $responseCode: ${response.take(100)}"
                }
            } catch (e: Exception) {
                Log.e(TAG, "簡化Atlas API測試失敗", e)
                "❌ 網絡異常: ${e.message}"
            }
        }
    }

    /**
     * 檢測當前設備IP地址
     */
    private suspend fun detectCurrentIP(): String {
        return withContext(Dispatchers.IO) {
            try {
                // 使用httpbin.org檢測IP
                val url = URL("https://httpbin.org/ip")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000

                val responseCode = connection.responseCode
                val response = if (responseCode == 200) {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } else {
                    "檢測失敗"
                }
                connection.disconnect()

                if (responseCode == 200) {
                    // 解析JSON響應獲取IP
                    val jsonResponse = JSONObject(response)
                    val currentIP = jsonResponse.optString("origin", "未知")

                    Log.d(TAG, "檢測到的IP: $currentIP")
                    Log.d(TAG, "允許的IP: 203.145.95.240")

                    if (currentIP == "203.145.95.240") {
                        "✅ $currentIP (匹配白名單)"
                    } else {
                        "❌ $currentIP (不在白名單中，需要添加到Atlas API Access List)"
                    }
                } else {
                    "❌ IP檢測失敗 (HTTP $responseCode)"
                }
            } catch (e: Exception) {
                Log.e(TAG, "IP檢測失敗", e)
                "❌ IP檢測異常: ${e.message}"
            }
        }
    }

    /**
     * 測試替代認證方式
     */
    private suspend fun testAlternativeAuth(): String {
        return withContext(Dispatchers.IO) {
            try {
                // 嘗試使用不同的API端點和認證方式
                val credentials = "$PUBLIC_API_KEY:$PRIVATE_API_KEY"
                val basicAuth = "Basic " + Base64.getEncoder().encodeToString(credentials.toByteArray())

                // 嘗試組織級別的API調用
                val url = URL("https://cloud.mongodb.com/api/atlas/v1.0/orgs")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.setRequestProperty("Authorization", basicAuth)
                connection.setRequestProperty("Accept", "application/json")

                val responseCode = connection.responseCode
                connection.disconnect()

                Log.d(TAG, "替代認證測試: $responseCode")

                when (responseCode) {
                    200 -> "✅ 組織級API成功"
                    401 -> "❌ API Key完全無效"
                    403 -> "❌ 項目權限不足"
                    else -> "❌ HTTP $responseCode"
                }
            } catch (e: Exception) {
                Log.e(TAG, "替代認證測試失敗", e)
                "❌ 網絡異常: ${e.message}"
            }
        }
    }

    /**
     * 測試API Key詳細信息
     */
    private suspend fun testAPIKeyDetails(): String {
        return withContext(Dispatchers.IO) {
            try {
                val credentials = "$PUBLIC_API_KEY:$PRIVATE_API_KEY"
                val basicAuth = "Basic " + Base64.getEncoder().encodeToString(credentials.toByteArray())

                // 測試最基本的認證端點
                val url = URL("https://cloud.mongodb.com/api/atlas/v1.0/")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.setRequestProperty("Authorization", basicAuth)
                connection.setRequestProperty("Accept", "application/json")

                val responseCode = connection.responseCode
                val response = if (responseCode in 200..299) {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } else {
                    connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error details"
                }
                connection.disconnect()

                Log.d(TAG, "API Key詳細測試: $responseCode")
                Log.d(TAG, "詳細響應: ${response.take(200)}")

                when (responseCode) {
                    200 -> "✅ API Key基本認證成功"
                    401 -> {
                        if (response.contains("Invalid API key")) {
                            "❌ API Key格式錯誤或已失效"
                        } else if (response.contains("API key not found")) {
                            "❌ API Key不存在或已被刪除"
                        } else {
                            "❌ API Key認證失敗: ${response.take(100)}"
                        }
                    }
                    403 -> "❌ API Key權限不足或被禁用"
                    404 -> "❌ API端點不存在"
                    else -> "❌ HTTP $responseCode: ${response.take(100)}"
                }
            } catch (e: Exception) {
                Log.e(TAG, "API Key詳細測試失敗", e)
                "❌ 測試異常: ${e.message}"
            }
        }
    }

    /**
     * 測試不同的認證方式
     */
    private suspend fun testDifferentAuthMethods(): String {
        return withContext(Dispatchers.IO) {
            val results = mutableListOf<String>()

            try {
                // 方法1: 標準Basic Auth (Public:Private)
                val method1Result = testBasicAuthMethod1()
                results.add("Basic Auth (Public:Private): $method1Result")

                // 方法2: 只使用Private Key
                val method2Result = testPrivateKeyOnly()
                results.add("Private Key Only: $method2Result")

                // 方法3: API Key Header方式
                val method3Result = testAPIKeyHeader()
                results.add("API Key Header: $method3Result")

                results.joinToString(" | ")
            } catch (e: Exception) {
                "測試異常: ${e.message}"
            }
        }
    }

    /**
     * 測試HTTP Digest Auth (MongoDB Atlas正確方式)
     */
    private suspend fun testBasicAuthMethod1(): String {
        return withContext(Dispatchers.IO) {
            try {
                // MongoDB Atlas使用HTTP Digest Authentication
                // 但Android HttpURLConnection不直接支持Digest Auth
                // 我們需要實現Digest認證流程

                val url = URL("https://cloud.mongodb.com/api/atlas/v2/groups")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.setRequestProperty("Accept", "application/vnd.atlas.2024-08-05+json")
                connection.setRequestProperty("Content-Type", "application/json")

                // 第一次請求 - 獲取401和WWW-Authenticate header
                val responseCode = connection.responseCode

                if (responseCode == 401) {
                    val wwwAuth = connection.getHeaderField("WWW-Authenticate")
                    connection.disconnect()

                    if (wwwAuth != null && wwwAuth.contains("Digest")) {
                        // 解析Digest challenge並重新請求
                        val digestResult = performDigestAuth(wwwAuth)
                        return@withContext digestResult
                    } else {
                        return@withContext "❌無Digest認證"
                    }
                } else {
                    connection.disconnect()
                    return@withContext "❌意外響應$responseCode"
                }
            } catch (e: Exception) {
                "❌異常: ${e.message}"
            }
        }
    }

    /**
     * 測試只使用Private Key
     */
    private suspend fun testPrivateKeyOnly(): String {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("https://cloud.mongodb.com/api/atlas/v1.0/groups")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.setRequestProperty("Authorization", "Bearer $PRIVATE_API_KEY")
                connection.setRequestProperty("Accept", "application/json")

                val responseCode = connection.responseCode
                connection.disconnect()

                if (responseCode == 200) "✅成功" else "❌$responseCode"
            } catch (e: Exception) {
                "❌異常"
            }
        }
    }

    /**
     * 測試API Key Header方式
     */
    private suspend fun testAPIKeyHeader(): String {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("https://cloud.mongodb.com/api/atlas/v1.0/groups")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.setRequestProperty("X-API-Key", PRIVATE_API_KEY)
                connection.setRequestProperty("Accept", "application/json")

                val responseCode = connection.responseCode
                connection.disconnect()

                if (responseCode == 200) "✅成功" else "❌$responseCode"
            } catch (e: Exception) {
                "❌異常"
            }
        }
    }

    /**
     * 執行HTTP Digest認證
     */
    private suspend fun performDigestAuth(wwwAuthHeader: String): String {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "WWW-Authenticate header: $wwwAuthHeader")

                // 解析Digest challenge
                val realm = extractValue(wwwAuthHeader, "realm")
                val nonce = extractValue(wwwAuthHeader, "nonce")
                val qop = extractValue(wwwAuthHeader, "qop")

                if (realm.isEmpty() || nonce.isEmpty()) {
                    return@withContext "❌Digest解析失敗"
                }

                // 計算Digest響應
                val uri = "/api/atlas/v2/groups"
                val method = "GET"
                val nc = "00000001"
                val cnonce = generateCnonce()

                val ha1 = md5("$PUBLIC_API_KEY:$realm:$PRIVATE_API_KEY")
                val ha2 = md5("$method:$uri")

                val response = if (qop.isNotEmpty()) {
                    md5("$ha1:$nonce:$nc:$cnonce:$qop:$ha2")
                } else {
                    md5("$ha1:$nonce:$ha2")
                }

                // 構建Authorization header
                val authHeader = buildString {
                    append("Digest ")
                    append("username=\"$PUBLIC_API_KEY\", ")
                    append("realm=\"$realm\", ")
                    append("nonce=\"$nonce\", ")
                    append("uri=\"$uri\", ")
                    if (qop.isNotEmpty()) {
                        append("qop=$qop, ")
                        append("nc=$nc, ")
                        append("cnonce=\"$cnonce\", ")
                    }
                    append("response=\"$response\"")
                }

                // 發送認證請求
                val url = URL("https://cloud.mongodb.com/api/atlas/v2/groups")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.setRequestProperty("Authorization", authHeader)
                connection.setRequestProperty("Accept", "application/vnd.atlas.2024-08-05+json")
                connection.setRequestProperty("Content-Type", "application/json")

                val responseCode = connection.responseCode
                connection.disconnect()

                Log.d(TAG, "Digest認證響應碼: $responseCode")

                if (responseCode == 200) "✅Digest認證成功" else "❌Digest認證失敗$responseCode"

            } catch (e: Exception) {
                Log.e(TAG, "Digest認證異常", e)
                "❌Digest異常: ${e.message}"
            }
        }
    }

    /**
     * 從WWW-Authenticate header中提取值
     */
    private fun extractValue(header: String, key: String): String {
        val pattern = "$key=\"([^\"]*)\""
        val regex = Regex(pattern)
        val match = regex.find(header)
        return match?.groupValues?.get(1) ?: ""
    }

    /**
     * 生成客戶端nonce
     */
    private fun generateCnonce(): String {
        val chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        return (1..8).map { chars.random() }.joinToString("")
    }

    /**
     * MD5哈希函數
     */
    private fun md5(input: String): String {
        val md = java.security.MessageDigest.getInstance("MD5")
        val digest = md.digest(input.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    /**
     * 生成解決方案建議
     */
    private fun generateSuggestions(atlasResult: String, keyTestResult: String): String {
        return when {
            keyTestResult.contains("API Key不存在或已被刪除") -> {
                """
                🚨 API Key已被刪除或不存在！

                🔧 解決方案：
                1. 登入MongoDB Atlas
                2. Organization Settings → API Keys
                3. 檢查API Key: gwvoqswy 是否還存在
                4. 如果不存在，創建新的API Key：
                   - Description: SwimmingApp-New
                   - Organization Permissions: Organization Member
                   - Project Access: 選擇項目 687da4aa...
                   - Project Permissions: Project Owner
                   - IP Access List: 203.145.95.240
                5. 告訴開發者新的Public/Private Key
                """.trimIndent()
            }
            keyTestResult.contains("API Key格式錯誤或已失效") -> {
                """
                🔑 API Key已失效！

                🔧 解決方案：
                1. 檢查API Key是否被禁用
                2. 檢查API Key是否過期
                3. 重新創建API Key（推薦）
                4. 確保新API Key有正確的權限
                """.trimIndent()
            }
            keyTestResult.contains("API Key權限不足") -> {
                """
                🔐 API Key權限不足！

                🔧 解決方案：
                1. 編輯現有API Key
                2. 增加組織權限：Organization Member
                3. 增加項目權限：Project Owner
                4. 確保項目訪問包含：687da4aa0623041875130d8a
                """.trimIndent()
            }
            atlasResult.contains("認證失敗") -> {
                """
                🔧 綜合解決方案：

                基於診斷結果，建議重新創建API Key：
                1. 登入MongoDB Atlas
                2. Organization Settings → API Keys
                3. Create API Key
                4. 設置完整權限和IP白名單
                5. 使用新的API Key更新應用
                """.trimIndent()
            }
            atlasResult.contains("權限被拒絕") -> {
                """
                🔐 權限問題解決方案：
                1. 檢查API Key是否有項目訪問權限
                2. 確認項目ID是否正確
                3. 聯繫MongoDB Atlas管理員
                """.trimIndent()
            }
            atlasResult.contains("端點不存在") -> {
                """
                🌐 端點問題解決方案：
                1. 檢查API版本是否正確
                2. 確認Atlas API端點URL
                3. 嘗試不同的API版本
                """.trimIndent()
            }
            else -> {
                """
                🔧 通用解決方案：
                1. 重新創建API Key並設置完整權限
                2. 添加IP白名單：0.0.0.0/0
                3. 確認項目ID和配置正確
                """.trimIndent()
            }
        }
    }

    /**
     * 創建診斷用的學生數據
     */
    private fun createDiagnosticStudents(): List<Student> {
        return listOf(
            Student(
                id = 1,
                name = "診斷測試 - 張小明",
                phone = "0912345678",
                age = "8歲",
                location = "診斷模式 - 台北游泳池",
                courseType = "診斷班級",
                time = "診斷時間",
                date = "2024-01-15",
                pending = "",
                pendingMonth = "",
                attendance = "診斷狀態"
            ),
            Student(
                id = 2,
                name = "網絡測試 - 李小華",
                phone = "0923456789",
                age = "10歲",
                location = "測試模式 - 新北游泳池",
                courseType = "測試班級",
                time = "測試時間",
                date = "2024-01-15",
                pending = "",
                pendingMonth = "",
                attendance = "測試狀態"
            )
        )
    }
}
