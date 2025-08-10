package com.swimming.attendance.network

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

/**
 * API 配置管理類
 * 管理 API 密鑰和相關配置
 */
class APIConfig private constructor(context: Context) {
    companion object {
        private const val TAG = "APIConfig"
        private const val PREFS_NAME = "api_config"
        private const val KEY_PUBLIC_API_KEY = "public_api_key"
        private const val KEY_PRIVATE_API_KEY = "private_api_key"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_DATABASE_NAME = "database_name"
        
        // 默認配置
        private const val DEFAULT_PUBLIC_API_KEY = "ttdrcccy"
        private const val DEFAULT_PRIVATE_API_KEY = "2b207365-cbf0-4e42-a3bf-f932c84557c4"
        
        // 智能API地址配置 - 根據環境自動選擇
        private const val DEFAULT_BASE_URL = "https://swimming-attendance-system-production.up.railway.app" // Railway生產環境服務器（默認）
        private const val LOCAL_EMULATOR_URL = "http://10.0.2.2:3001" // Android模擬器
        private const val LOCAL_WIFI_URL = "http://192.168.1.24:3001" // 本地Wi-Fi網絡
        private const val ALTERNATIVE_WIFI_URL = "http://192.168.137.1:3001" // 其他Wi-Fi網絡
        
        private const val DEFAULT_DATABASE_NAME = "test"
        
        @Volatile
        private var INSTANCE: APIConfig? = null
        
        fun getInstance(context: Context): APIConfig {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: APIConfig(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val appContext: Context = context.applicationContext
    
    /**
     * 獲取公開 API 密鑰
     */
    fun getPublicApiKey(): String {
        return prefs.getString(KEY_PUBLIC_API_KEY, DEFAULT_PUBLIC_API_KEY) ?: DEFAULT_PUBLIC_API_KEY
    }
    
    /**
     * 設置公開 API 密鑰
     */
    fun setPublicApiKey(apiKey: String) {
        prefs.edit().putString(KEY_PUBLIC_API_KEY, apiKey).apply()
        Log.d(TAG, "✅ 公開 API 密鑰已更新")
    }
    
    /**
     * 獲取私有 API 密鑰
     */
    fun getPrivateApiKey(): String {
        return prefs.getString(KEY_PRIVATE_API_KEY, DEFAULT_PRIVATE_API_KEY) ?: DEFAULT_PRIVATE_API_KEY
    }
    
    /**
     * 設置私有 API 密鑰
     */
    fun setPrivateApiKey(apiKey: String) {
        prefs.edit().putString(KEY_PRIVATE_API_KEY, apiKey).apply()
        Log.d(TAG, "✅ 私有 API 密鑰已更新")
    }
    
    /**
     * 獲取基礎 URL
     */
    fun getBaseUrl(): String {
        return prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
    }
    
    /**
     * 智能獲取最佳API地址
     * 根據設備環境自動選擇最適合的API服務器地址
     */
    fun getSmartBaseUrl(): String {
        // 強制使用 Railway API 進行測試
        Log.d(TAG, "🌐 強制使用 Railway 生產環境API服務器")
        return DEFAULT_BASE_URL
        
        // 以下代碼暫時註釋，用於本地測試
        /*
        // 首先檢查是否有手動設置的URL
        val manualUrl = prefs.getString(KEY_BASE_URL, null)
        if (manualUrl != null && manualUrl != DEFAULT_BASE_URL) {
            return manualUrl
        }
        
        // 檢查是否為Android模擬器環境
        if (isEmulator()) {
            Log.d(TAG, "📱 檢測到Android模擬器，使用本地API服務器")
            return LOCAL_EMULATOR_URL
        }
        
        // 檢查是否在本地Wi-Fi網絡
        if (isLocalNetwork()) {
            Log.d(TAG, "🏠 檢測到本地網絡，使用本地API服務器")
            return LOCAL_WIFI_URL
        }
        
        // 默認使用生產環境服務器
        Log.d(TAG, "🌐 使用生產環境API服務器")
        return DEFAULT_BASE_URL
        */
    }
    
    /**
     * 檢測是否為Android模擬器
     */
    private fun isEmulator(): Boolean {
        return try {
            val buildConfig = this.javaClass.classLoader?.loadClass("android.os.Build")
            val field = buildConfig?.getDeclaredField("FINGERPRINT")
            field?.isAccessible = true
            val fingerprint = field?.get(null) as? String
            fingerprint?.contains("generic") == true || fingerprint?.contains("sdk") == true
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * 檢測是否在本地網絡
     */
    private fun isLocalNetwork(): Boolean {
        return try {
            val connectivityManager = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            
            // 檢查是否為Wi-Fi連接
            val isWifi = capabilities?.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI) == true
            
            // 檢查IP地址是否為本地網絡
            val isLocalIP = getLocalIPAddress()?.startsWith("192.168.") == true || 
                           getLocalIPAddress()?.startsWith("10.0.") == true
            
            isWifi && isLocalIP
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * 獲取本地IP地址
     */
    private fun getLocalIPAddress(): String? {
        return try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is java.net.Inet4Address) {
                        return address.hostAddress
                    }
                }
            }
            null
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * 設置基礎 URL
     */
    fun setBaseUrl(url: String) {
        prefs.edit().putString(KEY_BASE_URL, url).apply()
        Log.d(TAG, "✅ 基礎 URL 已更新: $url")
    }
    
    /**
     * 獲取數據庫名稱
     */
    fun getDatabaseName(): String {
        return prefs.getString(KEY_DATABASE_NAME, DEFAULT_DATABASE_NAME) ?: DEFAULT_DATABASE_NAME
    }
    
    /**
     * 設置數據庫名稱
     */
    fun setDatabaseName(name: String) {
        prefs.edit().putString(KEY_DATABASE_NAME, name).apply()
        Log.d(TAG, "✅ 數據庫名稱已更新: $name")
    }
    
    /**
     * 重置為默認配置
     */
    fun resetToDefaults() {
        prefs.edit().apply {
            putString(KEY_PUBLIC_API_KEY, DEFAULT_PUBLIC_API_KEY)
            putString(KEY_PRIVATE_API_KEY, DEFAULT_PRIVATE_API_KEY)
            putString(KEY_BASE_URL, DEFAULT_BASE_URL)
            putString(KEY_DATABASE_NAME, DEFAULT_DATABASE_NAME)
        }.apply()
        Log.d(TAG, "✅ 配置已重置為默認值")
    }
    
    /**
     * 獲取完整配置信息
     */
    fun getConfigInfo(): Map<String, String> {
        return mapOf(
            "publicApiKey" to getPublicApiKey(),
            "privateApiKey" to getPrivateApiKey().take(8) + "***", // 隱藏部分私有密鑰
            "baseUrl" to getBaseUrl(),
            "databaseName" to getDatabaseName()
        )
    }
    
    /**
     * 驗證配置是否有效
     */
    fun isValidConfig(): Boolean {
        val publicKey = getPublicApiKey()
        val privateKey = getPrivateApiKey()
        val baseUrl = getBaseUrl()
        
        return publicKey.isNotEmpty() && 
               privateKey.isNotEmpty() && 
               baseUrl.isNotEmpty() && 
               baseUrl.startsWith("http")
    }
} 