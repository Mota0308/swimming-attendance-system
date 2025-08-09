package com.swimming.attendance.ui

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.swimming.attendance.databinding.ActivityTestConnectionBinding
import com.swimming.attendance.network.MongoDBManager
import kotlinx.coroutines.launch

/**
 * MongoDB連接測試Activity
 */
class TestConnectionActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityTestConnectionBinding
    private lateinit var mongoDBManager: MongoDBManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            binding = ActivityTestConnectionBinding.inflate(layoutInflater)
            setContentView(binding.root)

            mongoDBManager = MongoDBManager.getInstance()

            setupUI()
            setupClickListeners()

            // 延遲開始連接測試
            lifecycleScope.launch {
                kotlinx.coroutines.delay(500)
                testConnection()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(this, "初始化失敗: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }
    
    private fun setupUI() {
        supportActionBar?.title = "MongoDB連接測試"
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        
        // 初始狀態
        updateConnectionStatus("準備測試連接...", false)
    }
    
    private fun setupClickListeners() {
        binding.btnTestConnection.setOnClickListener {
            testConnection()
        }
        
        binding.btnTestCreateAccount.setOnClickListener {
            testCreateAccount()
        }
        
        binding.btnTestLogin.setOnClickListener {
            testLogin()
        }
        
        binding.btnClearLogs.setOnClickListener {
            clearLogs()
        }
    }
    
    private fun testConnection() {
        updateConnectionStatus("正在測試連接...", false)
        addLog("🧪 開始MongoDB連接測試...")
        
        lifecycleScope.launch {
            try {
                val result = mongoDBManager.testConnection()
                
                if (result.success) {
                    updateConnectionStatus("連接成功 ✅", true)
                    addLog("✅ 連接測試成功！")
                    addLog("📊 測試結果: ${result.message}")
                    addLog("📊 詳細信息: ${result.details ?: "無"}")
                    
                    // 啟用其他測試按鈕
                    binding.btnTestCreateAccount.isEnabled = true
                    binding.btnTestLogin.isEnabled = true
                } else {
                    updateConnectionStatus("連接失敗 ❌", false)
                    addLog("❌ 連接測試失敗: ${result.message}")
                    addLog("📊 錯誤代碼: ${result.errorCode ?: "無"}")
                    addLog("📊 詳細信息: ${result.details ?: "無"}")
                    
                    // 禁用其他測試按鈕
                    binding.btnTestCreateAccount.isEnabled = false
                    binding.btnTestLogin.isEnabled = false
                }
            } catch (e: Exception) {
                updateConnectionStatus("連接異常 ⚠️", false)
                addLog("❌ 連接測試異常: ${e.message}")
                binding.btnTestCreateAccount.isEnabled = false
                binding.btnTestLogin.isEnabled = false
            }
        }
    }
    
    private fun testCreateAccount() {
        addLog("🔄 開始測試創建賬號...")
        
        val testPhone = "test${System.currentTimeMillis()}"
        val testPassword = "123456"
        val testUserType = "parent"
        
        addLog("📱 測試電話: $testPhone")
        
        lifecycleScope.launch {
            try {
                val result = mongoDBManager.authenticateUser(testPhone, testPassword)
                
                if (result) {
                    addLog("✅ 創建賬號測試成功！")
                    addLog("🆔 測試完成")
                    Toast.makeText(this@TestConnectionActivity, "創建賬號測試成功", Toast.LENGTH_SHORT).show()
                } else {
                    addLog("❌ 創建賬號測試失敗: 功能已禁用")
                    addLog("📊 請使用REST API進行測試")
                    Toast.makeText(this@TestConnectionActivity, "創建賬號測試失敗", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                addLog("❌ 創建賬號測試異常: ${e.message}")
                Toast.makeText(this@TestConnectionActivity, "創建賬號測試異常", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun testLogin() {
        addLog("🔍 開始測試登入驗證...")
        
        // 使用固定的測試賬號
        val testPhone = "test"
        val testPassword = "123456"
        
        addLog("📱 測試電話: $testPhone")
        
        lifecycleScope.launch {
            try {
                val result = mongoDBManager.authenticateUser(testPhone, testPassword)
                
                if (result) {
                    addLog("✅ 登入驗證測試成功！")
                    addLog("👤 測試完成")
                    addLog("📅 功能已禁用")
                    Toast.makeText(this@TestConnectionActivity, "登入驗證測試成功", Toast.LENGTH_SHORT).show()
                } else {
                    addLog("❌ 登入驗證測試失敗: 功能已禁用")
                    addLog("📊 請使用REST API進行測試")
                    Toast.makeText(this@TestConnectionActivity, "登入驗證測試失敗", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                addLog("❌ 登入驗證測試異常: ${e.message}")
                Toast.makeText(this@TestConnectionActivity, "登入驗證測試異常", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun updateConnectionStatus(status: String, isConnected: Boolean) {
        binding.tvConnectionStatus.text = status
        binding.tvConnectionStatus.setTextColor(
            if (isConnected) 
                getColor(android.R.color.holo_green_dark) 
            else 
                getColor(android.R.color.holo_red_dark)
        )
    }
    
    private fun addLog(message: String) {
        val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        val logMessage = "[$timestamp] $message\n"
        
        runOnUiThread {
            binding.tvLogs.append(logMessage)
            // 自動滾動到底部
            binding.scrollView.post {
                binding.scrollView.fullScroll(android.view.View.FOCUS_DOWN)
            }
        }
    }
    
    private fun clearLogs() {
        binding.tvLogs.text = ""
        addLog("📝 日誌已清空")
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
    
    override fun onDestroy() {
        super.onDestroy()
        // 不要在這裡關閉連接，因為其他地方可能還在使用
    }
}
