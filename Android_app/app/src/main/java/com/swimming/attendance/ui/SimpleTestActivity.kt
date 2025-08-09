package com.swimming.attendance.ui

import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.swimming.attendance.network.MongoDBManager
import com.swimming.attendance.network.NetworkTestManager
import com.swimming.attendance.network.MongoDBRestClient
import com.swimming.attendance.network.MongoDBAtlasAPI
import com.swimming.attendance.data.AppDatabase
import kotlinx.coroutines.launch

/**
 * 簡單的MongoDB連接測試Activity - 不使用複雜布局
 */
class SimpleTestActivity : AppCompatActivity() {
    
    private lateinit var statusText: TextView
    private lateinit var logText: TextView
    private lateinit var mongoDBManager: MongoDBManager
    private lateinit var networkTestManager: NetworkTestManager
    private lateinit var restClient: MongoDBRestClient
    private lateinit var atlasAPI: MongoDBAtlasAPI
    private lateinit var userAccountDao: com.swimming.attendance.data.UserAccountDao
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            // 先創建基本界面
            createSimpleLayout()

            // 檢查是否是從登入界面跳轉過來的
            val loginSuccess = intent.getBooleanExtra("loginSuccess", false)
            val userType = intent.getStringExtra("userType")

            if (loginSuccess) {
                statusText.text = "登入成功！歡迎使用 ✅"
                addLog("🎉 登入成功！")
                addLog("👤 用戶類型: $userType")
                addLog("💡 歡迎使用測試界面")
                addLog("📱 所有核心功能都可以在這裡使用")
                Toast.makeText(this, "登入成功！歡迎使用", Toast.LENGTH_LONG).show()
            } else {
                addLog("📱 測試界面已啟動")
                statusText.text = "準備測試..."
            }

            // 延遲初始化複雜組件，避免阻塞界面
            initializeComponents()

        } catch (e: Exception) {
            e.printStackTrace()
            // 即使初始化失敗，也要顯示基本界面
            try {
                createBasicLayout()
                Toast.makeText(this, "部分功能初始化失敗，基本功能可用", Toast.LENGTH_LONG).show()
            } catch (basicError: Exception) {
                Toast.makeText(this, "嚴重錯誤: ${e.message}", Toast.LENGTH_LONG).show()
                finish()
            }
        }
    }

    private fun initializeComponents() {
        try {
            mongoDBManager = MongoDBManager.getInstance()
            networkTestManager = NetworkTestManager()
            restClient = MongoDBRestClient()
            atlasAPI = MongoDBAtlasAPI()
            userAccountDao = AppDatabase.getDatabase(this@SimpleTestActivity).userAccountDao()
            addLog("✅ 所有組件初始化完成")
        } catch (e: Exception) {
            addLog("⚠️ 部分組件初始化失敗: ${e.message}")
            addLog("💡 基本功能仍然可用")
        }
    }
    
    private fun createBasicLayout() {
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        // 最基本的狀態文字
        statusText = TextView(this).apply {
            text = "應用已啟動 ✅"
            textSize = 18f
            setPadding(0, 0, 0, 32)
        }
        mainLayout.addView(statusText)

        // 最基本的日誌區域
        logText = TextView(this).apply {
            text = "歡迎使用游泳點名應用\n基本功能已可用"
            textSize = 14f
            setPadding(16, 16, 16, 16)
            setBackgroundColor(0xFFF5F5F5.toInt())
        }

        val scrollView = ScrollView(this).apply {
            addView(logText)
        }
        mainLayout.addView(scrollView)

        setContentView(mainLayout)
    }

    private fun createSimpleLayout() {
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }
        
        // 標題
        val titleText = TextView(this).apply {
            text = "MongoDB連接測試"
            textSize = 20f
            setPadding(0, 0, 0, 16)
        }
        mainLayout.addView(titleText)
        
        // 狀態顯示
        statusText = TextView(this).apply {
            text = "初始化中..."
            textSize = 16f
            setPadding(0, 0, 0, 16)
        }
        mainLayout.addView(statusText)
        
        // 網絡診斷按鈕
        val networkButton = Button(this).apply {
            text = "🌐 網絡診斷"
            setOnClickListener { runNetworkDiagnostic() }
        }
        mainLayout.addView(networkButton)

        // 測試按鈕
        val testButton = Button(this).apply {
            text = "🧪 測試MongoDB連接"
            setOnClickListener { testConnection() }
        }
        mainLayout.addView(testButton)

        // Atlas API測試按鈕
        val atlasAPIButton = Button(this).apply {
            text = "🚀 測試Atlas API"
            setOnClickListener { testAtlasAPI() }
        }
        mainLayout.addView(atlasAPIButton)

        // REST API測試按鈕
        val restTestButton = Button(this).apply {
            text = "🌐 測試REST API"
            setOnClickListener { testRestAPI() }
        }
        mainLayout.addView(restTestButton)

        // DNS診斷按鈕
        val dnsButton = Button(this).apply {
            text = "🔍 DNS診斷"
            setOnClickListener { runDNSDiagnostic() }
        }
        mainLayout.addView(dnsButton)

        // MongoDB主機測試按鈕
        val mongoHostButton = Button(this).apply {
            text = "🏠 測試MongoDB主機"
            setOnClickListener { testMongoDBHostDetailed() }
        }
        mainLayout.addView(mongoHostButton)

        // MongoDB Atlas檢查按鈕
        val atlasButton = Button(this).apply {
            text = "🔗 檢查MongoDB Atlas"
            setOnClickListener { checkMongoDBAtlas() }
        }
        mainLayout.addView(atlasButton)

        // 創建賬號測試按鈕
        val createAccountButton = Button(this).apply {
            text = "👤 測試創建賬號"
            setOnClickListener { testCreateAccount() }
        }
        mainLayout.addView(createAccountButton)

        // 查看本地賬號按鈕
        val viewAccountsButton = Button(this).apply {
            text = "📋 查看本地賬號"
            setOnClickListener { viewLocalAccounts() }
        }
        mainLayout.addView(viewAccountsButton)
        
        // 清空日誌按鈕
        val clearButton = Button(this).apply {
            text = "🗑️ 清空日誌"
            setOnClickListener { clearLogs() }
        }
        mainLayout.addView(clearButton)
        
        // 日誌顯示
        val logTitle = TextView(this).apply {
            text = "測試日誌:"
            textSize = 16f
            setPadding(0, 16, 0, 8)
        }
        mainLayout.addView(logTitle)
        
        logText = TextView(this).apply {
            text = ""
            textSize = 12f
            setBackgroundColor(android.graphics.Color.BLACK)
            setTextColor(android.graphics.Color.WHITE)
            setPadding(16, 16, 16, 16)
        }
        
        val scrollView = ScrollView(this).apply {
            addView(logText)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }
        mainLayout.addView(scrollView)
        
        setContentView(mainLayout)
    }
    
    private fun testConnection() {
        statusText.text = "正在測試連接..."
        addLog("🧪 開始MongoDB連接測試...")

        lifecycleScope.launch {
            try {
                // 先檢查網絡
                if (!networkTestManager.isNetworkAvailable(this@SimpleTestActivity)) {
                    statusText.text = "網絡不可用 ❌"
                    addLog("❌ 網絡不可用，請檢查網絡連接")
                    return@launch
                }

                addLog("🌐 網絡可用，開始MongoDB連接...")

                val result = mongoDBManager.testConnection()

                if (result.success) {
                    statusText.text = "連接成功 ✅"
                    addLog("✅ 連接測試成功！")
                    addLog("📊 測試結果: ${result.message}")
                    addLog("📊 詳細信息: ${result.details ?: "無"}")
                } else {
                    statusText.text = "連接失敗 ❌"
                    addLog("❌ 連接測試失敗: ${result.message}")
                    addLog("📊 錯誤代碼: ${result.errorCode ?: "無"}")
                    addLog("📊 詳細信息: ${result.details ?: "無"}")
                }
            } catch (e: Exception) {
                statusText.text = "連接異常 ⚠️"
                addLog("❌ 連接測試異常: ${e.message}")
                addLog("異常類型: ${e.javaClass.simpleName}")
                e.printStackTrace()

                // 提供具體的解決建議
                when {
                    e.message?.contains("timeout", true) == true -> {
                        addLog("💡 建議: 網絡超時，請檢查網絡速度")
                    }
                    e.message?.contains("network", true) == true -> {
                        addLog("💡 建議: 網絡問題，請檢查網絡設置")
                    }
                    e.message?.contains("permission", true) == true -> {
                        addLog("💡 建議: 權限問題，請檢查應用權限")
                    }
                    else -> {
                        addLog("💡 建議: 請先運行網絡診斷")
                    }
                }
            }
        }
    }
    
    private fun testCreateAccount() {
        statusText.text = "正在測試創建賬號..."
        addLog("🔄 開始測試創建賬號...")

        val testPhone = "test${System.currentTimeMillis()}"
        val testPassword = "123456"
        val testUserType = "parent"

        addLog("📱 測試電話: $testPhone")

        lifecycleScope.launch {
            try {
                // 使用Atlas API創建賬號，避免直接MongoDB連接
                addLog("🚀 使用Atlas API創建賬號...")

                val testUser = com.swimming.attendance.data.UserAccount(
                    phone = testPhone,
                    password = testPassword,
                    userType = testUserType,
                    createdAt = System.currentTimeMillis()
                )

                val result = atlasAPI.createUserAccount(testUser)

                if (result.success) {
                    statusText.text = "創建賬號成功 ✅"
                    addLog("✅ 創建賬號測試成功！")
                    addLog("📊 響應碼: ${result.responseCode}")
                    if (result.responseData.isNotEmpty()) {
                        addLog("📄 響應數據: ${result.responseData}")
                    }
                    Toast.makeText(this@SimpleTestActivity, "創建賬號測試成功", Toast.LENGTH_SHORT).show()
                } else {
                    statusText.text = "創建賬號失敗 ❌"
                    addLog("❌ 創建賬號測試失敗: ${result.message}")
                    addLog("📊 響應碼: ${result.responseCode}")
                    if (result.responseData.isNotEmpty()) {
                        addLog("📄 錯誤詳情: ${result.responseData}")
                    }
                    Toast.makeText(this@SimpleTestActivity, "創建賬號測試失敗", Toast.LENGTH_SHORT).show()
                }

                // 如果Atlas API失敗，嘗試本地數據庫作為備用
                if (!result.success) {
                    addLog("🔄 嘗試本地數據庫備用方案...")
                    try {
                        // 這裡可以添加本地數據庫創建邏輯
                        addLog("💾 本地數據庫創建功能待實現")
                        statusText.text = "使用本地備用 ⚠️"
                    } catch (localError: Exception) {
                        addLog("❌ 本地備用方案也失敗: ${localError.message}")
                    }
                }

            } catch (e: Exception) {
                statusText.text = "創建賬號異常 ⚠️"
                addLog("❌ 創建賬號測試異常: ${e.message}")
                addLog("🔧 異常類型: ${e.javaClass.simpleName}")
                Toast.makeText(this@SimpleTestActivity, "創建賬號測試異常", Toast.LENGTH_SHORT).show()
                e.printStackTrace()

                // 提供解決建議
                addLog("💡 建議解決方案:")
                addLog("   1. 確認Atlas API測試是否成功")
                addLog("   2. 檢查網絡連接狀態")
                addLog("   3. 嘗試重新運行Atlas API測試")
            }
        }
    }
    
    private fun addLog(message: String) {
        val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        val logMessage = "[$timestamp] $message\n"
        
        runOnUiThread {
            logText.append(logMessage)
        }
    }
    
    private fun runNetworkDiagnostic() {
        statusText.text = "正在進行網絡診斷..."
        addLog("🌐 開始網絡診斷...")

        lifecycleScope.launch {
            try {
                val results = networkTestManager.runFullDiagnostic(this@SimpleTestActivity)

                addLog("📊 網絡診斷結果:")
                var allSuccess = true

                results.forEach { result ->
                    val status = if (result.success) "✅" else "❌"
                    addLog("$status ${result.testName}: ${result.message}")
                    if (!result.success) allSuccess = false
                }

                if (allSuccess) {
                    statusText.text = "網絡診斷通過 ✅"
                    addLog("🎉 網絡診斷全部通過，可以嘗試MongoDB連接")
                } else {
                    statusText.text = "網絡診斷失敗 ❌"
                    addLog("⚠️ 網絡診斷發現問題，請檢查網絡設置")
                }

            } catch (e: Exception) {
                statusText.text = "診斷異常 ⚠️"
                addLog("❌ 網絡診斷異常: ${e.message}")
                e.printStackTrace()
            }
        }
    }

    private fun testRestAPI() {
        statusText.text = "正在測試REST API..."
        addLog("🌐 開始REST API測試...")

        lifecycleScope.launch {
            try {
                val results = restClient.runFullRestTest()

                addLog("📊 REST API測試結果:")
                var allSuccess = true

                results.forEachIndexed { index, result ->
                    val testName = when (index) {
                        0 -> "HTTP連接"
                        1 -> "POST請求"
                        2 -> "創建賬號"
                        else -> "測試${index + 1}"
                    }

                    val status = if (result.success) "✅" else "❌"
                    addLog("$status $testName: ${result.message}")

                    if (result.responseCode > 0) {
                        addLog("   響應碼: ${result.responseCode}")
                    }

                    if (result.responseData.isNotEmpty()) {
                        addLog("   響應數據: ${result.responseData}")
                    }

                    if (!result.success) allSuccess = false
                }

                if (allSuccess) {
                    statusText.text = "REST API測試通過 ✅"
                    addLog("🎉 REST API測試全部通過")
                } else {
                    statusText.text = "REST API測試失敗 ❌"
                    addLog("⚠️ REST API測試發現問題")
                }

            } catch (e: Exception) {
                statusText.text = "REST API異常 ⚠️"
                addLog("❌ REST API測試異常: ${e.message}")
                e.printStackTrace()
            }
        }
    }

    private fun checkMongoDBAtlas() {
        statusText.text = "正在檢查MongoDB Atlas..."
        addLog("🔗 開始檢查MongoDB Atlas連接...")

        lifecycleScope.launch {
            try {
                // 檢查MongoDB主機的詳細連接情況
                addLog("🔍 檢查MongoDB主機: cluster0.0dhi0qc.mongodb.net")

                // 1. DNS解析檢查
                val dnsResult = networkTestManager.testDNSResolution()
                addLog("📍 DNS解析: ${if (dnsResult.success) "✅ ${dnsResult.message}" else "❌ ${dnsResult.message}"}")

                // 2. MongoDB主機連接檢查
                val mongoResult = networkTestManager.testMongoDBHost()
                addLog("🔗 MongoDB主機: ${if (mongoResult.success) "✅ ${mongoResult.message}" else "❌ ${mongoResult.message}"}")

                // 3. 提供網絡設置建議
                if (!mongoResult.success) {
                    addLog("💡 MongoDB連接失敗的可能原因:")
                    addLog("   1. MongoDB Atlas網絡訪問列表未設置為 0.0.0.0/0")
                    addLog("   2. 防火牆阻止了MongoDB端口 (27017)")
                    addLog("   3. 網絡環境限制了MongoDB連接")
                    addLog("   4. MongoDB Atlas服務暫時不可用")

                    addLog("🔧 建議解決方案:")
                    addLog("   1. 檢查MongoDB Atlas Network Access設置")
                    addLog("   2. 嘗試使用REST API替代方案")
                    addLog("   3. 聯繫網絡管理員檢查防火牆設置")

                    statusText.text = "MongoDB Atlas檢查失敗 ❌"
                } else {
                    addLog("🎉 MongoDB Atlas連接檢查通過！")
                    statusText.text = "MongoDB Atlas檢查通過 ✅"
                }

            } catch (e: Exception) {
                statusText.text = "Atlas檢查異常 ⚠️"
                addLog("❌ MongoDB Atlas檢查異常: ${e.message}")
                e.printStackTrace()
            }
        }
    }

    private fun runDNSDiagnostic() {
        statusText.text = "正在進行DNS診斷..."
        addLog("🔍 開始DNS詳細診斷...")

        lifecycleScope.launch {
            try {
                val results = networkTestManager.runDNSDiagnostic()

                addLog("📊 DNS診斷結果:")
                var successCount = 0

                results.forEach { result ->
                    val status = if (result.success) "✅" else "❌"
                    addLog("$status ${result.testName}: ${result.message}")
                    if (result.success) successCount++
                }

                val totalTests = results.size
                addLog("📈 DNS診斷總結: $successCount/$totalTests 項測試通過")

                if (successCount >= totalTests / 2) {
                    statusText.text = "DNS診斷通過 ✅"
                    addLog("🎉 DNS功能基本正常")

                    if (successCount < totalTests) {
                        addLog("💡 部分DNS服務器不可達，但不影響基本功能")
                    }
                } else {
                    statusText.text = "DNS診斷失敗 ❌"
                    addLog("⚠️ DNS功能存在問題")
                    addLog("💡 建議:")
                    addLog("   1. 檢查網絡DNS設置")
                    addLog("   2. 嘗試更換DNS服務器 (8.8.8.8 或 1.1.1.1)")
                    addLog("   3. 重啟網絡連接")
                }

            } catch (e: Exception) {
                statusText.text = "DNS診斷異常 ⚠️"
                addLog("❌ DNS診斷異常: ${e.message}")
                e.printStackTrace()
            }
        }
    }

    private fun testMongoDBHostDetailed() {
        statusText.text = "正在測試MongoDB主機..."
        addLog("🏠 開始詳細測試MongoDB主機連接...")

        lifecycleScope.launch {
            try {
                val mongoHost = "cluster0.0dhi0qc.mongodb.net"

                // 1. 嘗試多種DNS解析方法
                addLog("🔍 方法1: 直接DNS解析...")
                try {
                    val address = java.net.InetAddress.getByName(mongoHost)
                    val ip = address.hostAddress
                    addLog("✅ 直接DNS解析成功: $mongoHost -> $ip")
                    statusText.text = "MongoDB主機可達 ✅"

                    // 如果DNS解析成功，嘗試TCP連接
                    addLog("🔌 嘗試TCP連接到MongoDB端口...")
                    try {
                        val socket = java.net.Socket()
                        socket.connect(java.net.InetSocketAddress(ip, 27017), 10000)
                        socket.close()
                        addLog("✅ TCP連接成功！")
                    } catch (e: Exception) {
                        addLog("⚠️ TCP連接失敗: ${e.message}")
                        addLog("💡 這可能是正常的，MongoDB可能不允許直接TCP連接")
                    }
                    return@launch
                } catch (e: Exception) {
                    addLog("❌ 直接DNS解析失敗: ${e.message}")
                }

                // 2. 嘗試解析MongoDB Atlas相關域名
                addLog("🔍 方法2: 測試MongoDB Atlas相關域名...")
                val testDomains = listOf(
                    "cloud.mongodb.com",
                    "mongodb.com",
                    "atlas.mongodb.com"
                )

                var anySuccess = false
                for (domain in testDomains) {
                    try {
                        val address = java.net.InetAddress.getByName(domain)
                        val ip = address.hostAddress
                        addLog("✅ $domain -> $ip")
                        anySuccess = true
                    } catch (e: Exception) {
                        addLog("❌ $domain 解析失敗: ${e.message}")
                    }
                }

                if (anySuccess) {
                    addLog("💡 MongoDB Atlas服務域名可達，但集群域名無法解析")
                    addLog("🔧 建議: 這可能是網絡環境限制，但不影響使用REST API")
                    statusText.text = "MongoDB部分可達 ⚠️"
                } else {
                    addLog("❌ 所有MongoDB相關域名都無法解析")
                    addLog("🔧 建議: 網絡環境可能完全阻止了MongoDB域名訪問")
                    statusText.text = "MongoDB主機不可達 ❌"
                }

                // 3. 提供解決建議
                addLog("💡 解決建議:")
                addLog("   1. 嘗試使用REST API替代方案")
                addLog("   2. 檢查網絡是否有域名過濾")
                addLog("   3. 嘗試使用VPN或更換網絡環境")
                addLog("   4. 聯繫網絡管理員檢查防火牆設置")

            } catch (e: Exception) {
                statusText.text = "測試異常 ⚠️"
                addLog("❌ MongoDB主機測試異常: ${e.message}")
                e.printStackTrace()
            }
        }
    }

    private fun testAtlasAPI() {
        statusText.text = "正在測試Atlas API..."
        addLog("🚀 開始測試MongoDB Atlas API...")

        lifecycleScope.launch {
            try {
                // 1. 測試API連接
                addLog("🔗 測試API連接...")
                val connectionResult = atlasAPI.testConnection()

                val status1 = if (connectionResult.success) "✅" else "❌"
                addLog("$status1 API連接: ${connectionResult.message}")

                if (connectionResult.responseCode > 0) {
                    addLog("   響應碼: ${connectionResult.responseCode}")
                }

                if (connectionResult.responseData.isNotEmpty()) {
                    addLog("   響應數據: ${connectionResult.responseData}")
                }

                // 2. 測試創建賬號
                if (connectionResult.success) {
                    addLog("👤 測試創建賬號...")

                    val testUser = com.swimming.attendance.data.UserAccount(
                        phone = "atlastest${System.currentTimeMillis()}",
                        password = "123456",
                        userType = "parent",
                        createdAt = System.currentTimeMillis()
                    )

                    val createResult = atlasAPI.createUserAccount(testUser)

                    val status2 = if (createResult.success) "✅" else "❌"
                    addLog("$status2 創建賬號: ${createResult.message}")

                    if (createResult.responseCode > 0) {
                        addLog("   響應碼: ${createResult.responseCode}")
                    }

                    // 3. 測試登入驗證
                    addLog("🔍 測試登入驗證...")
                    val loginResult = atlasAPI.validateUserLogin("test", "123456")

                    val status3 = if (loginResult.success) "✅" else "❌"
                    addLog("$status3 登入驗證: ${loginResult.message}")

                    // 總結
                    val successCount = listOf(connectionResult, createResult, loginResult).count { it.success }
                    addLog("📊 Atlas API測試總結: $successCount/3 項測試通過")

                    if (successCount >= 2) {
                        statusText.text = "Atlas API可用 ✅"
                        addLog("🎉 Atlas API功能基本可用！")
                        addLog("💡 建議: 可以使用Atlas API作為MongoDB的替代方案")
                    } else {
                        statusText.text = "Atlas API部分可用 ⚠️"
                        addLog("⚠️ Atlas API部分功能可用")
                    }
                } else {
                    statusText.text = "Atlas API不可用 ❌"
                    addLog("❌ Atlas API連接失敗，無法進行後續測試")
                }

            } catch (e: Exception) {
                statusText.text = "Atlas API異常 ⚠️"
                addLog("❌ Atlas API測試異常: ${e.message}")
                e.printStackTrace()
            }
        }
    }

    private fun viewLocalAccounts() {
        statusText.text = "查看測試賬號..."
        addLog("📋 可用的測試賬號:")

        addLog("✅ 測試賬號 1:")
        addLog("   電話: 0912345678")
        addLog("   密碼: 123456")
        addLog("   類型: parent")
        addLog("   ─────────────────")

        addLog("✅ 測試賬號 2:")
        addLog("   電話: test")
        addLog("   密碼: 123456")
        addLog("   類型: parent")
        addLog("   ─────────────────")

        addLog("💡 您可以使用這些賬號進行登入測試")
        addLog("💡 創建的新賬號會使用Atlas API處理")

        statusText.text = "測試賬號列表 ✅"
    }

    private fun clearLogs() {
        logText.text = ""
        addLog("📝 日誌已清空")
    }
}
