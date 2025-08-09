package com.swimming.attendance.ui

import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.swimming.attendance.R
import com.swimming.attendance.data.Student
import com.swimming.attendance.network.APIConfig
import com.swimming.attendance.network.CloudAPIService
import kotlinx.coroutines.launch

/**
 * 雲端數據管理 Activity
 * 演示如何使用 CloudAPIService 訪問雲端數據庫
 */
class CloudDataActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "CloudDataActivity"
    }
    
    private lateinit var cloudApiService: CloudAPIService
    private lateinit var apiConfig: APIConfig
    
    // UI 組件
    private lateinit var tvStatus: TextView
    private lateinit var tvConfig: TextView
    private lateinit var btnTestConnection: Button
    private lateinit var btnFetchStudents: Button
    private lateinit var btnUploadStudents: Button
    private lateinit var btnShowConfig: Button
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_cloud_data)
        
        // 初始化 API 服務
        cloudApiService = CloudAPIService(this)
        apiConfig = APIConfig.getInstance(this)
        
        // 初始化 UI
        initViews()
        setupClickListeners()
        
        // 顯示當前配置
        showCurrentConfig()
    }
    
    private fun initViews() {
        tvStatus = findViewById(R.id.tvStatus)
        tvConfig = findViewById(R.id.tvConfig)
        btnTestConnection = findViewById(R.id.btnTestConnection)
        btnFetchStudents = findViewById(R.id.btnFetchStudents)
        btnUploadStudents = findViewById(R.id.btnUploadStudents)
        btnShowConfig = findViewById(R.id.btnShowConfig)
    }
    
    private fun setupClickListeners() {
        btnTestConnection.setOnClickListener {
            testApiConnection()
        }
        
        btnFetchStudents.setOnClickListener {
            fetchStudentsFromCloud()
        }
        
        btnUploadStudents.setOnClickListener {
            uploadStudentsToCloud()
        }
        
        btnShowConfig.setOnClickListener {
            showCurrentConfig()
        }
    }
    
    /**
     * 測試 API 連接
     */
    private fun testApiConnection() {
        updateStatus("🧪 正在測試 API 連接...")
        
        lifecycleScope.launch {
            try {
                val result = cloudApiService.testConnection()
                if (result.success) {
                    updateStatus("✅ API 連接成功: ${result.message}")
                    showToast("API 連接測試通過")
                } else {
                    updateStatus("❌ API 連接失敗: ${result.message}")
                    showToast("API 連接測試失敗")
                }
            } catch (e: Exception) {
                val errorMsg = "❌ API 連接異常: ${e.message}"
                updateStatus(errorMsg)
                Log.e(TAG, errorMsg, e)
                showToast("連接異常: ${e.message}")
            }
        }
    }
    
    /**
     * 從雲端獲取學生資料
     */
    private fun fetchStudentsFromCloud() {
        updateStatus("📥 正在從雲端獲取學生資料...")
        
        lifecycleScope.launch {
            try {
                val students = cloudApiService.fetchStudentsFromCloud()
                if (students.isNotEmpty()) {
                    updateStatus("✅ 成功獲取 ${students.size} 條學生資料")
                    showToast("獲取到 ${students.size} 條學生資料")
                    
                    // 顯示前幾個學生信息
                    val sampleStudents = students.take(3)
                    val studentInfo = sampleStudents.joinToString("\n") { 
                        "• ${it.name} (${it.phone})" 
                    }
                    updateStatus("📋 學生資料示例:\n$studentInfo")
                } else {
                    updateStatus("⚠️ 未獲取到學生資料")
                    showToast("未獲取到學生資料")
                }
            } catch (e: Exception) {
                val errorMsg = "❌ 獲取學生資料失敗: ${e.message}"
                updateStatus(errorMsg)
                Log.e(TAG, errorMsg, e)
                showToast("獲取失敗: ${e.message}")
            }
        }
    }
    
    /**
     * 上傳學生資料到雲端
     */
    private fun uploadStudentsToCloud() {
        updateStatus("📤 正在準備上傳學生資料...")
        
        // 創建示例學生資料
        val sampleStudents = listOf(
            Student(
                name = "張小明",
                phone = "0912345678",
                age = "8",
                location = "維多利亞公園",
                courseType = "初級班",
                time = "14:00",
                date = "2024-01-15",
                pending = "否",
                pendingMonth = "",
                attendance = "出席",
                note = "測試資料",
                option3 = ""
            ),
            Student(
                name = "李小華",
                phone = "0923456789",
                age = "10",
                location = "維多利亞公園",
                courseType = "中級班",
                time = "15:30",
                date = "2024-01-15",
                pending = "否",
                pendingMonth = "",
                attendance = "出席",
                note = "測試資料",
                option3 = ""
            )
        )
        
        lifecycleScope.launch {
            try {
                val result = cloudApiService.uploadStudentsToCloud(sampleStudents)
                if (result.success) {
                    updateStatus("✅ 成功上傳 ${sampleStudents.size} 條學生資料")
                    showToast("上傳成功")
                } else {
                    updateStatus("❌ 上傳失敗: ${result.message}")
                    showToast("上傳失敗: ${result.message}")
                }
            } catch (e: Exception) {
                val errorMsg = "❌ 上傳異常: ${e.message}"
                updateStatus(errorMsg)
                Log.e(TAG, errorMsg, e)
                showToast("上傳異常: ${e.message}")
            }
        }
    }
    
    /**
     * 顯示當前配置
     */
    private fun showCurrentConfig() {
        val configInfo = apiConfig.getConfigInfo()
        val configText = """
            🔧 當前 API 配置:
            • 公開密鑰: ${configInfo["publicApiKey"]}
            • 私有密鑰: ${configInfo["privateApiKey"]}
            • 基礎 URL: ${configInfo["baseUrl"]}
            • 數據庫: ${configInfo["databaseName"]}
            • 配置有效: ${if (apiConfig.isValidConfig()) "✅" else "❌"}
        """.trimIndent()
        
        tvConfig.text = configText
        Log.d(TAG, "當前配置: $configInfo")
    }
    
    /**
     * 更新狀態顯示
     */
    private fun updateStatus(message: String) {
        runOnUiThread {
            tvStatus.text = message
            Log.d(TAG, "狀態更新: $message")
        }
    }
    
    /**
     * 顯示 Toast 消息
     */
    private fun showToast(message: String) {
        runOnUiThread {
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }
    }
} 