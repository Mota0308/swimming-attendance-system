package com.swimming.attendance.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

/**
 * 網絡測試管理器 - 用於測試基本網絡連接
 */
class NetworkTestManager {
    companion object {
        private const val TAG = "NetworkTestManager"
        private const val MONGODB_HOST = "cluster0.0dhi0qc.mongodb.net"
        private const val TEST_URL = "https://www.google.com"
    }
    
    /**
     * 檢查網絡連接狀態
     */
    fun isNetworkAvailable(context: Context): Boolean {
        return try {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

            // 檢查Android版本
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork
                if (network == null) {
                    Log.w(TAG, "❌ 無活動網絡")
                    return false
                }

                val activeNetwork = connectivityManager.getNetworkCapabilities(network)
                if (activeNetwork == null) {
                    Log.w(TAG, "❌ 無法獲取網絡能力")
                    return false
                }

                val hasInternet = activeNetwork.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                val isValidated = activeNetwork.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)

                when {
                    activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                        Log.d(TAG, "📶 WiFi連接可用 (Internet: $hasInternet, Validated: $isValidated)")
                        hasInternet
                    }
                    activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                        Log.d(TAG, "📱 行動數據連接可用 (Internet: $hasInternet, Validated: $isValidated)")
                        hasInternet
                    }
                    activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> {
                        Log.d(TAG, "🔌 以太網連接可用 (Internet: $hasInternet, Validated: $isValidated)")
                        hasInternet
                    }
                    else -> {
                        Log.w(TAG, "❌ 未知網絡類型")
                        false
                    }
                }
            } else {
                // Android 6.0以下的舊方法
                @Suppress("DEPRECATION")
                val networkInfo = connectivityManager.activeNetworkInfo
                val isConnected = networkInfo?.isConnectedOrConnecting == true
                Log.d(TAG, "📱 舊版Android網絡檢查: $isConnected")
                isConnected
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ 網絡狀態檢查異常", e)
            false
        }
    }
    
    /**
     * 測試基本網絡連接
     */
    suspend fun testBasicConnection(): NetworkTestResult {
        return withContext(Dispatchers.IO) {
            // 嘗試多個測試URL
            val testUrls = listOf(
                "https://www.google.com",
                "https://httpbin.org/get",
                "https://www.baidu.com",
                "https://1.1.1.1" // Cloudflare DNS
            )

            for (testUrl in testUrls) {
                try {
                    Log.d(TAG, "🌐 測試連接: $testUrl")

                    val url = URL(testUrl)
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "HEAD" // 使用HEAD請求，更快
                    connection.connectTimeout = 8000
                    connection.readTimeout = 8000
                    connection.setRequestProperty("User-Agent", "SwimmingApp/1.0")

                    val responseCode = connection.responseCode
                    connection.disconnect()

                    if (responseCode in 200..399) {
                        Log.d(TAG, "✅ 基本網絡連接測試成功 ($testUrl)")
                        return@withContext NetworkTestResult(true, "網絡連接正常 (通過 $testUrl)")
                    } else {
                        Log.w(TAG, "⚠️ $testUrl 響應異常: $responseCode")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ $testUrl 連接失敗: ${e.message}")
                }
            }

            Log.e(TAG, "❌ 所有測試URL都連接失敗")
            NetworkTestResult(false, "無法連接到任何測試服務器，請檢查網絡")
        }
    }
    
    /**
     * 測試MongoDB主機連接
     */
    suspend fun testMongoDBHost(): NetworkTestResult {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🔗 開始測試MongoDB主機連接...")

                // 方法1: 嘗試TCP連接到MongoDB端口
                val mongoResult = testMongoDBTcpConnection()
                if (mongoResult.success) {
                    return@withContext mongoResult
                }

                // 方法2: 嘗試HTTP連接（某些網絡環境下可能有效）
                val httpResult = testMongoDBHttpConnection()
                if (httpResult.success) {
                    return@withContext httpResult
                }

                // 方法3: 檢查MongoDB Atlas API
                val atlasResult = testMongoDBAtlasAPI()

                return@withContext atlasResult

            } catch (e: Exception) {
                Log.e(TAG, "❌ MongoDB主機連接測試失敗", e)
                NetworkTestResult(false, "MongoDB主機測試異常: ${e.message}")
            }
        }
    }

    /**
     * 測試MongoDB TCP連接
     */
    private suspend fun testMongoDBTcpConnection(): NetworkTestResult {
        return try {
            Log.d(TAG, "🔌 嘗試TCP連接到MongoDB...")

            // MongoDB Atlas通常使用27017端口
            val socket = java.net.Socket()
            socket.connect(java.net.InetSocketAddress(MONGODB_HOST, 27017), 10000)
            socket.close()

            Log.d(TAG, "✅ MongoDB TCP連接成功")
            NetworkTestResult(true, "MongoDB主機TCP連接正常")
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ MongoDB TCP連接失敗: ${e.message}")
            NetworkTestResult(false, "MongoDB TCP連接失敗: ${e.message}")
        }
    }

    /**
     * 測試MongoDB HTTP連接
     */
    private suspend fun testMongoDBHttpConnection(): NetworkTestResult {
        return try {
            Log.d(TAG, "🌐 嘗試HTTP連接到MongoDB主機...")

            val url = URL("https://$MONGODB_HOST")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "HEAD"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val responseCode = connection.responseCode
            connection.disconnect()

            Log.d(TAG, "✅ MongoDB主機HTTP可達，響應碼: $responseCode")
            NetworkTestResult(true, "MongoDB主機HTTP可達")
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ MongoDB主機HTTP連接失敗: ${e.message}")
            NetworkTestResult(false, "MongoDB主機HTTP不可達: ${e.message}")
        }
    }

    /**
     * 測試MongoDB Atlas API
     */
    private suspend fun testMongoDBAtlasAPI(): NetworkTestResult {
        return try {
            Log.d(TAG, "🔗 嘗試連接MongoDB Atlas API...")

            // 測試MongoDB Atlas的公共API端點
            val url = URL("https://cloud.mongodb.com/api/atlas/v1.0/")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val responseCode = connection.responseCode
            connection.disconnect()

            if (responseCode in 200..499) {
                Log.d(TAG, "✅ MongoDB Atlas API可達，響應碼: $responseCode")
                NetworkTestResult(true, "MongoDB Atlas服務可達")
            } else {
                Log.w(TAG, "⚠️ MongoDB Atlas API異常響應: $responseCode")
                NetworkTestResult(false, "MongoDB Atlas API響應異常: $responseCode")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ MongoDB Atlas API連接失敗", e)
            NetworkTestResult(false, "MongoDB Atlas API不可達: ${e.message}")
        }
    }
    
    /**
     * 測試DNS解析
     */
    suspend fun testDNSResolution(): NetworkTestResult {
        return withContext(Dispatchers.IO) {
            // 測試多個主機的DNS解析
            val testHosts = listOf(
                MONGODB_HOST,
                "www.google.com",
                "www.baidu.com",
                "1.1.1.1"
            )

            val results = mutableListOf<String>()
            var successCount = 0

            for (host in testHosts) {
                try {
                    Log.d(TAG, "🔍 測試DNS解析: $host")

                    val address = java.net.InetAddress.getByName(host)
                    val ip = address.hostAddress

                    Log.d(TAG, "✅ DNS解析成功: $host -> $ip")
                    results.add("$host -> $ip")
                    successCount++

                    // 如果MongoDB主機解析成功，立即返回成功
                    if (host == MONGODB_HOST) {
                        return@withContext NetworkTestResult(true, "DNS解析正常: $ip")
                    }

                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ DNS解析失敗: $host - ${e.message}")
                    results.add("$host -> 失敗")
                }
            }

            if (successCount > 0) {
                Log.d(TAG, "✅ 部分DNS解析成功 ($successCount/${testHosts.size})")
                NetworkTestResult(true, "DNS部分正常 ($successCount/${testHosts.size}個成功)")
            } else {
                Log.e(TAG, "❌ 所有DNS解析都失敗")
                NetworkTestResult(false, "DNS解析完全失敗")
            }
        }
    }
    
    /**
     * 執行完整的網絡診斷
     */
    suspend fun runFullDiagnostic(context: Context): List<DiagnosticResult> {
        val results = mutableListOf<DiagnosticResult>()

        // 1. 檢查網絡狀態
        Log.d(TAG, "🔍 開始檢查網絡狀態...")
        val networkAvailable = isNetworkAvailable(context)
        results.add(DiagnosticResult("網絡狀態", networkAvailable, if (networkAvailable) "網絡可用" else "網絡不可用"))

        // 2. 檢查詳細網絡信息
        val networkInfo = getDetailedNetworkInfo(context)
        results.add(DiagnosticResult("網絡詳情", true, networkInfo))

        // 3. 測試基本連接（只有在網絡可用時才測試）
        if (networkAvailable) {
            Log.d(TAG, "🔍 開始測試基本連接...")
            val basicTest = testBasicConnection()
            results.add(DiagnosticResult("基本連接", basicTest.success, basicTest.message))

            // 4. 測試DNS解析（只有在基本連接成功時才測試）
            if (basicTest.success) {
                Log.d(TAG, "🔍 開始測試DNS解析...")
                val dnsTest = testDNSResolution()
                results.add(DiagnosticResult("DNS解析", dnsTest.success, dnsTest.message))

                // 5. 測試MongoDB主機（只有在DNS解析成功時才測試）
                if (dnsTest.success) {
                    Log.d(TAG, "🔍 開始測試MongoDB主機...")
                    val mongoHostTest = testMongoDBHost()
                    results.add(DiagnosticResult("MongoDB主機", mongoHostTest.success, mongoHostTest.message))
                }
            }
        } else {
            results.add(DiagnosticResult("基本連接", false, "跳過測試（網絡不可用）"))
            results.add(DiagnosticResult("DNS解析", false, "跳過測試（網絡不可用）"))
            results.add(DiagnosticResult("MongoDB主機", false, "跳過測試（網絡不可用）"))
        }

        return results
    }

    /**
     * 詳細DNS診斷
     */
    suspend fun runDNSDiagnostic(): List<DiagnosticResult> {
        val results = mutableListOf<DiagnosticResult>()

        // 測試不同的DNS服務器
        val dnsServers = listOf(
            "8.8.8.8" to "Google DNS",
            "1.1.1.1" to "Cloudflare DNS",
            "114.114.114.114" to "114 DNS",
            "223.5.5.5" to "阿里DNS"
        )

        for ((dnsServer, name) in dnsServers) {
            try {
                Log.d(TAG, "🔍 測試DNS服務器: $name ($dnsServer)")

                // 嘗試解析DNS服務器本身
                val address = java.net.InetAddress.getByName(dnsServer)
                val resolved = address.hostAddress

                if (resolved == dnsServer) {
                    results.add(DiagnosticResult("$name 可達", true, "$dnsServer 可達"))
                } else {
                    results.add(DiagnosticResult("$name 異常", false, "解析結果異常: $resolved"))
                }

            } catch (e: Exception) {
                results.add(DiagnosticResult("$name 失敗", false, "無法連接: ${e.message}"))
            }
        }

        // 測試MongoDB主機解析 - 使用多種方法
        try {
            Log.d(TAG, "🔍 專門測試MongoDB主機DNS解析...")

            // 方法1: 直接解析
            try {
                val mongoAddress = java.net.InetAddress.getByName(MONGODB_HOST)
                val mongoIP = mongoAddress.hostAddress
                results.add(DiagnosticResult("MongoDB DNS", true, "$MONGODB_HOST -> $mongoIP"))
            } catch (e: Exception) {
                Log.w(TAG, "直接DNS解析失敗: ${e.message}")

                // 方法2: 嘗試解析MongoDB Atlas的其他域名
                try {
                    val atlasAddress = java.net.InetAddress.getByName("cloud.mongodb.com")
                    val atlasIP = atlasAddress.hostAddress
                    results.add(DiagnosticResult("MongoDB Atlas", true, "cloud.mongodb.com -> $atlasIP"))
                    results.add(DiagnosticResult("MongoDB DNS", false, "主機DNS解析失敗，但Atlas服務可達"))
                } catch (e2: Exception) {
                    results.add(DiagnosticResult("MongoDB DNS", false, "MongoDB DNS完全解析失敗: ${e.message}"))
                }
            }
        } catch (e: Exception) {
            results.add(DiagnosticResult("MongoDB DNS", false, "MongoDB DNS測試異常: ${e.message}"))
        }

        return results
    }

    /**
     * 獲取詳細的網絡信息
     */
    private fun getDetailedNetworkInfo(context: Context): String {
        return try {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val info = mutableListOf<String>()

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork
                if (network != null) {
                    val capabilities = connectivityManager.getNetworkCapabilities(network)
                    if (capabilities != null) {
                        when {
                            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> info.add("WiFi")
                            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> info.add("行動數據")
                            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> info.add("以太網")
                        }

                        if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
                            info.add("有網際網路")
                        }
                        if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                            info.add("已驗證")
                        }
                    }
                }
            }

            info.joinToString(", ").ifEmpty { "無詳細信息" }
        } catch (e: Exception) {
            "獲取網絡信息失敗: ${e.message}"
        }
    }
}

/**
 * 網絡測試結果
 */
data class NetworkTestResult(
    val success: Boolean,
    val message: String
)

/**
 * 診斷結果
 */
data class DiagnosticResult(
    val testName: String,
    val success: Boolean,
    val message: String
)
