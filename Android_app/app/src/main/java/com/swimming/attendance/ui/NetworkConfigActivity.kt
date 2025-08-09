package com.swimming.attendance.ui

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.swimming.attendance.R
import com.swimming.attendance.network.APIConfig
import com.swimming.attendance.network.CloudAPIService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * 網絡配置Activity
 * 允許用戶手動配置API服務器地址
 */
class NetworkConfigActivity : AppCompatActivity() {
    private lateinit var apiConfig: APIConfig

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_network_config)

        apiConfig = APIConfig.getInstance(this)
        setupViews()
        setupListeners()
    }

    private fun setupViews() {
        // 顯示當前配置
        updateConfigDisplay()
    }

    private fun setupListeners() {
        // 生產環境服務器按鈕
        findViewById<View>(R.id.btnProductionServer).setOnClickListener {
            setApiUrl("http://203.145.95.240:3001", "生產環境服務器")
        }

        // 本地模擬器按鈕
        findViewById<View>(R.id.btnLocalEmulator).setOnClickListener {
            setApiUrl("http://10.0.2.2:3001", "本地模擬器")
        }

        // 本地Wi-Fi按鈕
        findViewById<View>(R.id.btnLocalWifi).setOnClickListener {
            setApiUrl("http://192.168.1.24:3001", "本地Wi-Fi網絡")
        }

        // 測試連接按鈕
        findViewById<View>(R.id.btnTestConnection).setOnClickListener {
            testConnection()
        }

        // 重置按鈕
        findViewById<View>(R.id.btnReset).setOnClickListener {
            resetToDefault()
        }

        // 返回按鈕
        findViewById<View>(R.id.btnBack).setOnClickListener {
            finish()
        }
    }

    private fun setApiUrl(url: String, description: String) {
        apiConfig.setBaseUrl(url)
        updateConfigDisplay()
        Toast.makeText(this, "已設置為: $description", Toast.LENGTH_SHORT).show()
    }

    private fun resetToDefault() {
        apiConfig.resetToDefaults()
        updateConfigDisplay()
        Toast.makeText(this, "已重置為默認配置", Toast.LENGTH_SHORT).show()
    }

    private fun updateConfigDisplay() {
        val configInfo = apiConfig.getConfigInfo()
        findViewById<android.widget.TextView>(R.id.tvCurrentConfig).text = """
            當前配置:
            基礎URL: ${configInfo["baseUrl"]}
            公開密鑰: ${configInfo["publicApiKey"]}
            私有密鑰: ${configInfo["privateApiKey"]}
            數據庫: ${configInfo["databaseName"]}
        """.trimIndent()
    }

    private fun testConnection() {
        findViewById<View>(R.id.btnTestConnection).isEnabled = false
        findViewById<android.widget.TextView>(R.id.tvTestResult).text = "正在測試連接..."

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val cloudApiService = CloudAPIService(this@NetworkConfigActivity)
                val result = withContext(Dispatchers.IO) {
                    cloudApiService.testConnection()
                }

                if (result.success) {
                    findViewById<android.widget.TextView>(R.id.tvTestResult).text = "✅ 連接成功: ${result.message}"
                } else {
                    findViewById<android.widget.TextView>(R.id.tvTestResult).text = "❌ 連接失敗: ${result.message}"
                }
            } catch (e: Exception) {
                findViewById<android.widget.TextView>(R.id.tvTestResult).text = "❌ 測試異常: ${e.message}"
            } finally {
                findViewById<View>(R.id.btnTestConnection).isEnabled = true
            }
        }
    }
} 