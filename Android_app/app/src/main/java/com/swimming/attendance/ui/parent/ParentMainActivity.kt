package com.swimming.attendance.ui.parent

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.R
import com.swimming.attendance.data.AppDatabase
import com.swimming.attendance.data.Student
import com.swimming.attendance.network.MongoDBService
import com.swimming.attendance.network.CloudMongoDBManager
import com.swimming.attendance.network.RealmWebSDKManager
import com.swimming.attendance.network.RealMongoDBManager
import com.swimming.attendance.network.AtlasDataAPIManager
import com.swimming.attendance.network.AtlasAdminAPIManager
import com.swimming.attendance.network.AtlasClientAPIManager
import com.swimming.attendance.network.DiagnosticAPIManager
import com.swimming.attendance.network.CloudAPIService
import com.swimming.attendance.network.APIConfig
import com.swimming.attendance.ui.login.LoginActivity
import com.swimming.attendance.databinding.ActivityParentMainBinding
import com.swimming.attendance.ui.StudentsAdapter
import com.swimming.attendance.ui.AttendanceTableAdapter
import kotlinx.coroutines.launch

class ParentMainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityParentMainBinding
    private lateinit var mongoDBService: MongoDBService
    private lateinit var studentDao: com.swimming.attendance.data.StudentDao
    private lateinit var attendanceAdapter: AttendanceAdapter
    private lateinit var cloudMongoDBManager: CloudMongoDBManager
    private lateinit var realmWebSDKManager: RealmWebSDKManager
    private lateinit var realMongoDBManager: RealMongoDBManager
    private lateinit var atlasDataAPIManager: AtlasDataAPIManager
    private lateinit var atlasAdminAPIManager: AtlasAdminAPIManager
    private lateinit var atlasClientAPIManager: AtlasClientAPIManager
    private lateinit var diagnosticAPIManager: DiagnosticAPIManager
    private lateinit var cloudApiService: CloudAPIService
    private lateinit var apiConfig: APIConfig

    private var selectedDate = ""
    private var selectedLocation = ""
    private var selectedClass = ""
    private var selectedTime = ""

    // UI組件
    private lateinit var statusText: TextView
    private lateinit var refreshButton: Button
    private lateinit var studentsRecyclerView: RecyclerView
    private lateinit var studentsAdapter: StudentsAdapter
    private lateinit var attendanceTableAdapter: AttendanceTableAdapter
    private lateinit var expandableStudentAdapter: ExpandableStudentAdapter
    private lateinit var userInfoTextView: TextView // 新增用戶信息TextView的引用

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            // 初始化雲端數據庫管理器
            cloudMongoDBManager = CloudMongoDBManager()
            realmWebSDKManager = RealmWebSDKManager()
            realMongoDBManager = RealMongoDBManager()
            atlasDataAPIManager = AtlasDataAPIManager()
            atlasAdminAPIManager = AtlasAdminAPIManager()
            atlasClientAPIManager = AtlasClientAPIManager()
            diagnosticAPIManager = DiagnosticAPIManager()
            cloudApiService = CloudAPIService(this)
            apiConfig = APIConfig.getInstance(this)

            // 創建主界面
            createMainLayoutWithStudentList()

            Toast.makeText(this, "歡迎使用家長版本！", Toast.LENGTH_LONG).show()

        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(this, "主界面初始化失敗: ${e.message}", Toast.LENGTH_LONG).show()
            // 如果初始化完全失敗，返回登入界面
            finish()
        }
    }

    override fun onBackPressed() {
        AlertDialog.Builder(this)
            .setTitle("是否退出登入？")
            .setMessage("確定要登出並返回登入畫面嗎？")
            .setPositiveButton("確認") { _, _ ->
                // 跳轉回登入畫面
                val intent = Intent(this, LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }
            .setNegativeButton("取消") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    private fun createMainLayoutWithStudentList() {
        // 創建主布局
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
        }

        // 標題
        val titleText = TextView(this).apply {
            text = "游泳課程出席管理系統 - 家長版本"
            textSize = 18f
            setPadding(0, 0, 0, 16)
            gravity = android.view.Gravity.CENTER
            setTextColor(0xFF2196F3.toInt())
        }
        mainLayout.addView(titleText)

        // 用戶信息顯示
        val userInfoText = TextView(this).apply {
            id = View.generateViewId() // 為TextView分配ID，以便後續更新
            val currentPhone = getCurrentUserPhone()
            text = "👤 當前用戶: $currentPhone | 學生: 載入中..."
            textSize = 14f
            setPadding(8, 8, 8, 8)
            setBackgroundColor(0xFFE3F2FD.toInt())
            setTextColor(0xFF1976D2.toInt())
        }
        mainLayout.addView(userInfoText)
        
        // 保存用戶信息TextView的引用，以便後續更新
        this.userInfoTextView = userInfoText

        // 狀態顯示
        statusText = TextView(this).apply {
            text = "點擊刷新按鈕獲取您的學生資料"
            textSize = 14f
            setPadding(8, 8, 8, 8)
            setBackgroundColor(0xFFF5F5F5.toInt())
        }
        mainLayout.addView(statusText)

        // 按鈕區域
        val buttonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 16, 0, 16)
        }

        // 刷新按鈕
        refreshButton = Button(this).apply {
            text = "🔄 獲取我的學生資料"
            setOnClickListener { fetchUserStudentData() }
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        buttonLayout.addView(refreshButton)

        // 總覽按鈕
        val overviewButton = Button(this).apply {
            text = "📊 總覽"
            setOnClickListener { showStudentOverview() }
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = 8
            }
        }
        buttonLayout.addView(overviewButton)

        // 測試界面按鈕 - 已隱藏
        /*
        val testButton = Button(this).apply {
            text = "🧪 測試界面"
            setOnClickListener {
                val intent = Intent(this@ParentMainActivity, com.swimming.attendance.ui.SimpleTestActivity::class.java)
                intent.putExtra("userType", "parent")
                intent.putExtra("fromMain", true)
                startActivity(intent)
            }
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = 8
            }
        }
        buttonLayout.addView(testButton)
        */

        // API 配置按鈕 - 已隱藏
        /*
        val configButton = Button(this).apply {
            text = "⚙️ API 配置"
            setOnClickListener { showAPIConfig() }
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = 8
            }
        }
        buttonLayout.addView(configButton)
        */

        mainLayout.addView(buttonLayout)

        // 學生資料表格標題
        val tableTitleText = TextView(this).apply {
            text = "📋 我的學生出席記錄"
            textSize = 16f
            setPadding(0, 16, 0, 8)
            setTextColor(0xFF333333.toInt())
        }
        mainLayout.addView(tableTitleText)

        // 學生資料RecyclerView
        studentsRecyclerView = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@ParentMainActivity)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            setBackgroundColor(0xFFFFFFFF.toInt())
        }
        mainLayout.addView(studentsRecyclerView)

        // 初始化學生適配器
        studentsAdapter = StudentsAdapter(emptyList())
        attendanceTableAdapter = AttendanceTableAdapter(emptyList())
        expandableStudentAdapter = ExpandableStudentAdapter(emptyList())
        studentsRecyclerView.adapter = expandableStudentAdapter

        // 返回按鈕
        val backButton = Button(this).apply {
            text = "返回登入界面"
            setOnClickListener { finish() }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 16
            }
        }
        mainLayout.addView(backButton)

        setContentView(mainLayout)
    }

    /**
     * 使用新的 API 服務器刷新學生資料
     */
    private fun refreshStudentDataWithAPI() {
        statusText.text = "正在連接 API 服務器..."
        refreshButton.isEnabled = false
        refreshButton.text = "🔄 連接中..."

        lifecycleScope.launch {
            try {
                // 首先測試 API 連接
                val connectionResult = cloudApiService.testConnection()

                if (connectionResult.success) {
                    statusText.text = "API 連接成功，正在獲取學生資料..."

                    // 從 API 服務器獲取學生資料
                    val students = cloudApiService.fetchStudentsFromCloud()

                    if (students.isNotEmpty()) {
                        statusText.text = "✅ 成功獲取 ${students.size} 筆學生資料 (API 服務器)"

                        // 更新學生列表
                        studentsAdapter.updateStudents(students)

                        Toast.makeText(this@ParentMainActivity,
                            "API 服務器刷新成功！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "⚠️ 未獲取到學生資料，可能是數據庫為空"
                        Toast.makeText(this@ParentMainActivity,
                            "未獲取到學生資料", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ API 連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "API 連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ API 刷新失敗: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "API 刷新失敗: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "🔄 刷新學生資料"
            }
        }
    }

    /**
     * 獲取真實的學生資料
     */
    private fun fetchRealStudentData() {
        statusText.text = "正在連接您的API服務器獲取真實學生資料..."
        refreshButton.isEnabled = false
        refreshButton.text = "🎉 連接中..."

        lifecycleScope.launch {
            try {
                // 首先測試API服務器連接
                val connectionResult = cloudApiService.testConnection()

                if (connectionResult.success) {
                    statusText.text = "API服務器連接成功，正在獲取您的真實學生資料..."

                    // 從API服務器獲取真實學生資料
                    val students = cloudApiService.fetchStudentsFromCloud()

                    if (students.isNotEmpty()) {
                        statusText.text = "✅ 成功從您的MongoDB獲取 ${students.size} 筆真實學生資料！"

                        // 更新學生列表
                        studentsAdapter.updateStudents(students)

                        Toast.makeText(this@ParentMainActivity,
                            "🎉 成功獲取您的真實學生出席資料！", Toast.LENGTH_LONG).show()

                    } else {
                        statusText.text = "⚠️ 未獲取到學生資料，可能是數據庫為空"
                        Toast.makeText(this@ParentMainActivity,
                            "未獲取到學生資料，請檢查數據庫", Toast.LENGTH_LONG).show()
                    }

                } else {
                    statusText.text = "❌ API服務器連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "API服務器連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ 獲取學生資料異常: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "獲取資料異常: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "🎉 獲取我的真實學生資料"
            }
        }
    }

    /**
     * 運行連接診斷
     */
    private fun runConnectionDiagnostic() {
        statusText.text = "正在運行MongoDB Atlas連接診斷..."
        refreshButton.isEnabled = false
        refreshButton.text = "🔍 診斷中..."

        lifecycleScope.launch {
            try {
                // 運行全面診斷
                val diagnosticResult = diagnosticAPIManager.runFullDiagnostic()

                if (diagnosticResult.success) {
                    // 顯示診斷報告
                    statusText.text = "✅ 診斷完成，請查看詳細報告"

                    // 更新學生列表（顯示診斷數據）
                    studentsAdapter.updateStudents(diagnosticResult.students)

                    // 顯示詳細診斷報告
                    showDiagnosticReport(diagnosticResult.message)

                } else {
                    statusText.text = "❌ 診斷失敗: ${diagnosticResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "診斷失敗: ${diagnosticResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ 診斷過程異常: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "診斷過程異常: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "🔍 診斷Atlas連接問題"
            }
        }
    }

    /**
     * 顯示診斷報告
     */
    private fun showDiagnosticReport(report: String) {
        val dialog = android.app.AlertDialog.Builder(this)
            .setTitle("🔍 MongoDB Atlas 連接診斷報告")
            .setMessage(report)
            .setPositiveButton("確定") { dialog, _ -> dialog.dismiss() }
            .setNeutralButton("複製報告") { _, _ ->
                val clipboard = getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                val clip = android.content.ClipData.newPlainText("診斷報告", report)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "診斷報告已複製到剪貼板", Toast.LENGTH_SHORT).show()
            }
            .create()

        dialog.show()
    }

    /**
     * 使用Client API從您的MongoDB Atlas獲取學生資料
     */
    private fun fetchStudentsWithClientAPI() {
        statusText.text = "正在使用您的Client ID連接MongoDB Atlas..."
        refreshButton.isEnabled = false
        refreshButton.text = "🌐 連接中..."

        lifecycleScope.launch {
            try {
                // 測試多種API端點
                val connectionResult = atlasClientAPIManager.testMultipleEndpoints()

                if (connectionResult.success) {
                    statusText.text = "API端點連接成功，正在獲取學生資料..."

                    // 從Atlas獲取學生資料
                    val studentsResult = atlasClientAPIManager.fetchStudentsFromAtlas()

                    if (studentsResult.success) {
                        statusText.text = "✅ 成功連接Atlas並獲取 ${studentsResult.students.size} 筆學生資料"

                        // 更新學生列表
                        studentsAdapter.updateStudents(studentsResult.students)

                        Toast.makeText(this@ParentMainActivity,
                            "成功使用Client ID連接MongoDB Atlas！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "❌ 獲取學生資料失敗: ${studentsResult.message}"
                        Toast.makeText(this@ParentMainActivity,
                            "獲取資料失敗: ${studentsResult.message}", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ API端點連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "API端點連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ Client API操作失敗: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "Client API操作失敗: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "🌐 使用Client ID連接Atlas"
            }
        }
    }

    /**
     * 使用Atlas Admin API從您的MongoDB獲取學生資料
     */
    private fun fetchStudentsFromAtlasAdmin() {
        statusText.text = "正在使用您的Project ID連接MongoDB Atlas..."
        refreshButton.isEnabled = false
        refreshButton.text = "📊 連接中..."

        lifecycleScope.launch {
            try {
                // 首先測試Atlas Admin API連接
                val connectionResult = atlasAdminAPIManager.testAtlasAdminConnection()

                if (connectionResult.success) {
                    statusText.text = "Atlas Admin API連接成功，正在查找App Services..."

                    // 查找或創建App Services應用
                    val appServicesResult = atlasAdminAPIManager.findOrCreateAppServices()

                    if (appServicesResult.success) {
                        statusText.text = "✅ 成功連接您的MongoDB Atlas（Project ID: 687da4aa...）"

                        // 更新學生列表
                        studentsAdapter.updateStudents(appServicesResult.students)

                        Toast.makeText(this@ParentMainActivity,
                            "成功使用您的Project ID連接MongoDB Atlas！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "❌ 查找App Services失敗: ${appServicesResult.message}"
                        Toast.makeText(this@ParentMainActivity,
                            "查找App Services失敗: ${appServicesResult.message}", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ Atlas Admin API連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "Atlas Admin API連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ Atlas Admin API操作失敗: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "Atlas Admin API操作失敗: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "📊 從我的Atlas獲取學生資料"
            }
        }
    }

    /**
     * 使用Atlas Data API從您的MongoDB獲取學生資料
     */
    private fun fetchStudentsFromAtlas() {
        statusText.text = "正在連接您的MongoDB Atlas..."
        refreshButton.isEnabled = false
        refreshButton.text = "🌐 連接中..."

        lifecycleScope.launch {
            try {
                // 首先測試Atlas Data API連接
                val connectionResult = atlasDataAPIManager.testAtlasConnection()

                if (connectionResult.success) {
                    statusText.text = "Atlas連接成功，正在獲取您的真實學生資料..."

                    // 從Atlas獲取學生資料
                    val studentsResult = atlasDataAPIManager.fetchStudentsFromAtlas()

                    if (studentsResult.success) {
                        statusText.text = "✅ 成功獲取 ${studentsResult.students.size} 筆學生資料（來自您的MongoDB Atlas）"

                        // 更新學生列表
                        studentsAdapter.updateStudents(studentsResult.students)

                        Toast.makeText(this@ParentMainActivity,
                            "成功從您的MongoDB Atlas獲取真實學生資料！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "❌ 獲取學生資料失敗: ${studentsResult.message}"
                        Toast.makeText(this@ParentMainActivity,
                            "獲取資料失敗: ${studentsResult.message}", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ Atlas連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "Atlas連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ Atlas操作失敗: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "Atlas操作失敗: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "🌐 連接我的MongoDB Atlas"
            }
        }
    }

    /**
     * 從您的MongoDB數據庫獲取學生資料
     */
    private fun refreshStudentDataFromMyDatabase() {
        statusText.text = "正在連接您的MongoDB Atlas數據庫..."
        refreshButton.isEnabled = false
        refreshButton.text = "📊 連接中..."

        lifecycleScope.launch {
            try {
                // 首先測試您的MongoDB連接
                val connectionResult = realMongoDBManager.testMongoConnection()

                if (connectionResult.success) {
                    statusText.text = "數據庫連接成功，正在獲取您的學生資料..."

                    // 從您的MongoDB獲取學生資料
                    val studentsResult = realMongoDBManager.fetchStudentsFromMongoDB()

                    if (studentsResult.success) {
                        statusText.text = "✅ 成功獲取 ${studentsResult.students.size} 筆學生資料（來自您的數據庫）"

                        // 更新學生列表
                        studentsAdapter.updateStudents(studentsResult.students)

                        Toast.makeText(this@ParentMainActivity,
                            "成功從您的MongoDB獲取學生資料！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "❌ 獲取學生資料失敗: ${studentsResult.message}"
                        Toast.makeText(this@ParentMainActivity,
                            "獲取資料失敗: ${studentsResult.message}", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ 數據庫連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "數據庫連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ 數據庫操作失敗: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "數據庫操作失敗: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "📊 獲取我的數據庫資料"
            }
        }
    }

    /**
     * 使用Realm Web SDK刷新學生資料
     */
    private fun refreshStudentDataWithRealm() {
        statusText.text = "正在連接MongoDB Realm Web SDK..."
        refreshButton.isEnabled = false
        refreshButton.text = "🌐 連接中..."

        lifecycleScope.launch {
            try {
                // 首先測試Realm連接
                val connectionResult = realmWebSDKManager.testRealmConnection()

                if (connectionResult.success) {
                    statusText.text = "Realm連接成功，正在獲取學生資料..."

                    // 使用Realm Web SDK獲取學生資料
                    val studentsResult = realmWebSDKManager.fetchStudentsFromRealm()

                    if (studentsResult.success) {
                        statusText.text = "✅ 成功獲取 ${studentsResult.students.size} 筆學生資料 (Realm Web SDK)"

                        // 更新學生列表
                        studentsAdapter.updateStudents(studentsResult.students)

                        Toast.makeText(this@ParentMainActivity,
                            "Realm Web SDK刷新成功！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "❌ Realm獲取學生資料失敗: ${studentsResult.message}"
                        Toast.makeText(this@ParentMainActivity,
                            "Realm獲取資料失敗: ${studentsResult.message}", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ Realm連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "Realm連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ Realm刷新失敗: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "Realm刷新失敗: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "🌐 Realm Web SDK刷新"
            }
        }
    }

    /**
     * 顯示 API 配置信息
     */
    private fun showAPIConfig() {
        val configInfo = apiConfig.getConfigInfo()
        val message = """
            🔧 當前 API 配置:
            
            📍 基礎 URL: ${configInfo["baseUrl"]}
            🔑 公開密鑰: ${configInfo["publicApiKey"]}
            🔐 私有密鑰: ${configInfo["privateApiKey"]}
            📊 數據庫: ${configInfo["databaseName"]}
            
            ✅ 配置有效: ${if (apiConfig.isValidConfig()) "是" else "否"}
        """.trimIndent()

        AlertDialog.Builder(this)
            .setTitle("API 配置信息")
            .setMessage(message)
            .setPositiveButton("確定") { _, _ -> }
            .show()
    }

    /**
     * 原始的刷新學生資料方法（備用）
     */
    private fun refreshStudentData() {
        statusText.text = "正在連接MongoDB雲端數據庫..."
        refreshButton.isEnabled = false
        refreshButton.text = "🔄 連接中..."

        lifecycleScope.launch {
            try {
                // 首先測試連接
                val connectionResult = cloudMongoDBManager.testConnection()

                if (connectionResult.success) {
                    statusText.text = "連接成功，正在獲取學生資料..."

                    // 獲取學生資料
                    val studentsResult = cloudMongoDBManager.fetchStudentsUsingAtlasAPI()

                    if (studentsResult.success) {
                        statusText.text = "✅ 成功獲取 ${studentsResult.students.size} 筆學生資料"

                        // 更新學生列表
                        studentsAdapter.updateStudents(studentsResult.students)

                        Toast.makeText(this@ParentMainActivity,
                            "成功刷新學生資料！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "❌ 獲取學生資料失敗: ${studentsResult.message}"
                        Toast.makeText(this@ParentMainActivity,
                            "獲取資料失敗: ${studentsResult.message}", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ 連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ 刷新失敗: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "刷新失敗: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "🔄 刷新學生資料"
            }
        }
    }

    /**
     * 獲取當前用戶電話號碼
     */
    private fun getCurrentUserPhone(): String {
        // 從SharedPreferences獲取當前登入用戶的電話號碼
        val sharedPrefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
        return sharedPrefs.getString("current_user_phone", "未知用戶") ?: "未知用戶"
    }

    /**
     * 獲取當前用戶學生姓名
     */
    private fun getCurrentUserStudentName(): String {
        // 從SharedPreferences獲取當前登入用戶的學生姓名
        val sharedPrefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
        return sharedPrefs.getString("current_user_student_name", "") ?: ""
    }

    /**
     * 顯示出席記錄表格
     */
    private fun showAttendanceTable() {
        val intent = Intent(this, AttendanceTableActivity::class.java)
        intent.putExtra("userType", "parent")
        startActivity(intent)
    }

    /**
     * 更新用戶信息顯示
     */
    private fun updateUserInfoDisplay(students: List<Student>) {
        val currentPhone = getCurrentUserPhone()
        val studentNames = students.map { it.name }.distinct()
        val studentNamesText = if (studentNames.isNotEmpty()) {
            studentNames.joinToString(", ")
        } else {
            "無學生資料"
        }
        
        userInfoTextView.text = "👤 當前用戶: $currentPhone | 學生: $studentNamesText"
    }

    /**
     * 獲取用戶的學生資料（根據電話號碼匹配）
     */
    private fun fetchUserStudentData() {
        val currentPhone = getCurrentUserPhone()
        
        statusText.text = "正在獲取您的學生資料..."
        refreshButton.isEnabled = false
        refreshButton.text = "🔄 獲取中..."

        lifecycleScope.launch {
            try {
                // 首先測試API連接
                val connectionResult = cloudApiService.testConnection()

                if (connectionResult.success) {
                    statusText.text = "API連接成功，正在獲取您的學生資料..."

                    // 直接根據電話號碼從API服務器獲取學生資料
                    val userStudents = cloudApiService.fetchUserStudentsFromCloud(currentPhone)

                        if (userStudents.isNotEmpty()) {
                            statusText.text = "✅ 成功獲取您的 ${userStudents.size} 筆學生資料"
                            
                        // 更新學生列表 - 顯示學生姓名+上課日期+待約數量
                        displayStudentListWithDetails(userStudents)
                        
                        // 更新用戶信息顯示
                        updateUserInfoDisplay(userStudents)
                            
                            Toast.makeText(this@ParentMainActivity,
                                "成功獲取您的學生資料！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "⚠️ 未找到與您電話號碼匹配的學生資料"
                        
                        // 更新用戶信息顯示（無學生資料）
                        updateUserInfoDisplay(emptyList())
                        
                        // 清空學生列表
                        expandableStudentAdapter.updateStudents(emptyList())
                        
                        Toast.makeText(this@ParentMainActivity,
                            "未找到與您電話號碼匹配的學生資料", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ API連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@ParentMainActivity,
                        "API連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ 獲取學生資料失敗: ${e.message}"
                Toast.makeText(this@ParentMainActivity,
                    "獲取學生資料失敗: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                refreshButton.isEnabled = true
                refreshButton.text = "🔄 獲取我的學生資料"
            }
        }
    }

    /**
     * 在學生列表中顯示學生姓名+上課日期+待約數量
     */
    private fun displayStudentListWithDetails(students: List<Student>) {
        // 直接使用原始學生數據，讓適配器處理分組和展開邏輯
        expandableStudentAdapter.updateStudents(students)
    }

    /**
     * 顯示學生總覽
     */
    private fun showStudentOverview() {
        val intent = Intent(this, StudentOverviewActivity::class.java)
        intent.putExtra("userType", "parent")
        startActivity(intent)
    }

}