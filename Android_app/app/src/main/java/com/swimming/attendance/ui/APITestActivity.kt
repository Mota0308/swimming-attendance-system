package com.swimming.attendance.ui

import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.swimming.attendance.R
import com.swimming.attendance.network.APIConfig
import com.swimming.attendance.network.CloudAPIService
import kotlinx.coroutines.launch

class APITestActivity : AppCompatActivity() {
    private lateinit var cloudApiService: CloudAPIService
    private lateinit var apiConfig: APIConfig
    private lateinit var resultTextView: TextView
    private lateinit var testConnectionButton: Button
    private lateinit var testStudentsButton: Button
    private lateinit var testLoginButton: Button
    private lateinit var configInfoButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_api_test)

        // 初始化
        cloudApiService = CloudAPIService(this)
        apiConfig = APIConfig.getInstance(this)

        // 初始化UI
        resultTextView = findViewById(R.id.resultTextView)
        testConnectionButton = findViewById(R.id.testConnectionButton)
        testStudentsButton = findViewById(R.id.testStudentsButton)
        testLoginButton = findViewById(R.id.testLoginButton)
        configInfoButton = findViewById(R.id.configInfoButton)

        // 設置按鈕點擊事件
        testConnectionButton.setOnClickListener {
            testConnection()
        }

        testStudentsButton.setOnClickListener {
            testStudents()
        }

        testLoginButton.setOnClickListener {
            testLogin()
        }

        configInfoButton.setOnClickListener {
            showConfigInfo()
        }

        // 顯示初始信息
        showConfigInfo()
    }

    private fun testConnection() {
        resultTextView.text = "🧪 測試API連接中..."
        
        lifecycleScope.launch {
            try {
                val result = cloudApiService.testConnection()
                val message = if (result.success) {
                    "✅ API連接成功\n${result.message}"
                } else {
                    "❌ API連接失敗\n${result.message}"
                }
                resultTextView.text = message
                Log.d("APITest", "連接測試結果: $result")
            } catch (e: Exception) {
                val errorMessage = "❌ 連接測試異常\n${e.message}"
                resultTextView.text = errorMessage
                Log.e("APITest", "連接測試異常", e)
            }
        }
    }

    private fun testStudents() {
        resultTextView.text = "📥 獲取學生資料中..."
        
        lifecycleScope.launch {
            try {
                val students = cloudApiService.fetchStudentsFromCloud()
                val message = if (students.isNotEmpty()) {
                    "✅ 成功獲取學生資料\n學生數量: ${students.size}\n\n前3名學生:\n" +
                    students.take(3).joinToString("\n") { 
                        "• ${it.name} (${it.phone})" 
                    }
                } else {
                    "⚠️ 未獲取到學生資料"
                }
                resultTextView.text = message
                Log.d("APITest", "獲取到 ${students.size} 條學生資料")
            } catch (e: Exception) {
                val errorMessage = "❌ 獲取學生資料異常\n${e.message}"
                resultTextView.text = errorMessage
                Log.e("APITest", "獲取學生資料異常", e)
            }
        }
    }

    private fun testLogin() {
        resultTextView.text = "🔐 測試用戶登入中..."
        
        lifecycleScope.launch {
            try {
                val result = cloudApiService.authenticateUser("testuser", "testpass")
                val message = if (result.success) {
                    "✅ 登入測試成功\n${result.message}"
                } else {
                    "⚠️ 登入測試失敗\n${result.message}\n(這是預期結果，因為測試用戶不存在)"
                }
                resultTextView.text = message
                Log.d("APITest", "登入測試結果: $result")
            } catch (e: Exception) {
                val errorMessage = "❌ 登入測試異常\n${e.message}"
                resultTextView.text = errorMessage
                Log.e("APITest", "登入測試異常", e)
            }
        }
    }

    private fun showConfigInfo() {
        val configInfo = apiConfig.getConfigInfo()
        val message = """
            📋 API 配置信息
            
            基礎URL: ${configInfo["baseUrl"]}
            公開密鑰: ${configInfo["publicApiKey"]}
            私有密鑰: ${configInfo["privateApiKey"]}
            數據庫: ${configInfo["databaseName"]}
            
            配置狀態: ${if (apiConfig.isValidConfig()) "✅ 有效" else "❌ 無效"}
            
            點擊下方按鈕進行測試
        """.trimIndent()
        
        resultTextView.text = message
    }
} 