package com.swimming.attendance.ui.login

import android.os.Bundle
import android.text.TextUtils
import android.util.Patterns
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.swimming.attendance.R
import com.swimming.attendance.data.UserAccount
import com.swimming.attendance.network.CloudAPIService
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

/**
 * 創建賬號Activity
 * 用戶可以輸入學生姓名、電話號碼、密碼來創建新賬號
 */
class CreateAccountActivity : AppCompatActivity() {
    private lateinit var cloudApiService: CloudAPIService
    private var userType: String = "parent" // 默認為家長類型

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_account)

        // 獲取傳入的用戶類型
        userType = intent.getStringExtra("userType") ?: "parent"

        // 初始化API服務
        cloudApiService = CloudAPIService(this)

        setupViews()
        setupListeners()
    }

    private fun setupViews() {
        // 根據用戶類型設置不同的界面
        if (userType == "coach") {
            // 教練版本：修改標籤和提示文字
            findViewById<android.widget.TextView>(R.id.nameLabel).text = "👤 教練名"
            findViewById<android.widget.EditText>(R.id.studentNameEditText).hint = "請輸入教練名"
            
        // 設置密碼輸入提示
        findViewById<android.widget.EditText>(R.id.passwordEditText).hint = "密碼（不少於6位數）"
        } else {
            // 家長版本：保持原有界面
            findViewById<android.widget.TextView>(R.id.nameLabel).text = "👤 學生姓名"
            findViewById<android.widget.EditText>(R.id.studentNameEditText).hint = "請輸入學生姓名"
            findViewById<android.widget.EditText>(R.id.passwordEditText).hint = "密碼（不少於6位數）"
        }
    }

    private fun setupListeners() {
        // 創建按鈕
        findViewById<android.widget.Button>(R.id.createButton).setOnClickListener {
            handleCreateAccount()
        }

        // 取消按鈕
        findViewById<android.widget.Button>(R.id.cancelButton).setOnClickListener {
            finish()
        }
    }

    private fun handleCreateAccount() {
        val studentName = findViewById<android.widget.EditText>(R.id.studentNameEditText).text.toString().trim()
        val phone = findViewById<android.widget.EditText>(R.id.phoneEditText).text.toString().trim()
        val password = findViewById<android.widget.EditText>(R.id.passwordEditText).text.toString().trim()

        // 驗證輸入
        if (!validateInput(studentName, phone, password)) {
            return
        }

        // 顯示載入狀態
        showLoading(true)

        lifecycleScope.launch {
            try {
                // 創建用戶賬號對象
                val userAccount = UserAccount(
                    phone = phone,
                    password = password,
                    userType = userType, // 使用傳入的用戶類型
                    studentName = studentName, // 添加學生姓名或教練名
                    createdAt = System.currentTimeMillis()
                )

                // 創建學生資料對象
                val studentData = mapOf(
                    "name" to studentName,
                    "phone" to phone,
                    "age" to "",
                    "location" to "",
                    "courseType" to "",
                    "time" to "",
                    "date" to "",
                    "pending" to "",
                    "pendingMonth" to "",
                    "attendance" to "",
                    "note" to "",
                    "option3" to "0"
                )

                // 首先創建用戶賬號
                val accountResult = createUserAccount(userAccount)
                
                if (accountResult.success) {
                    // 然後創建學生資料
                    val studentResult = createStudentData(studentData)
                    
                    if (studentResult.success) {
                        withContext(Dispatchers.Main) {
                            showLoading(false)
                            Toast.makeText(this@CreateAccountActivity, 
                                "賬號創建成功！", Toast.LENGTH_LONG).show()
                            finish() // 返回登入界面
                        }
                    } else {
                        withContext(Dispatchers.Main) {
                            showLoading(false)
                            Toast.makeText(this@CreateAccountActivity, 
                                "學生資料創建失敗: ${studentResult.message}", Toast.LENGTH_LONG).show()
                        }
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        showLoading(false)
                        Toast.makeText(this@CreateAccountActivity, 
                            "賬號創建失敗: ${accountResult.message}", Toast.LENGTH_LONG).show()
                    }
                }

            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showLoading(false)
                    Toast.makeText(this@CreateAccountActivity, 
                        "創建失敗: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private suspend fun createUserAccount(userAccount: UserAccount): AccountResult {
        return withContext(Dispatchers.IO) {
            try {
                // 使用API服務器創建用戶賬號
                val response = cloudApiService.createUserAccount(userAccount)
                
                if (response.success) {
                    AccountResult(true, "用戶賬號創建成功")
                } else {
                    AccountResult(false, response.message ?: "用戶賬號創建失敗")
                }
            } catch (e: Exception) {
                AccountResult(false, "用戶賬號創建異常: ${e.message}")
            }
        }
    }

    private suspend fun createStudentData(studentData: Map<String, String>): AccountResult {
        return withContext(Dispatchers.IO) {
            try {
                // 使用API服務器創建學生資料
                val response = cloudApiService.createStudentData(studentData)
                
                if (response.success) {
                    AccountResult(true, "學生資料創建成功")
                } else {
                    AccountResult(false, response.message ?: "學生資料創建失敗")
                }
            } catch (e: Exception) {
                AccountResult(false, "學生資料創建異常: ${e.message}")
            }
        }
    }

    private fun validateInput(studentName: String, phone: String, password: String): Boolean {
        if (userType == "coach") {
            // 教練版本驗證
            if (TextUtils.isEmpty(studentName)) {
                showError("請輸入教練名")
                return false
            }

            if (studentName.length < 2) {
                showError("教練名至少需要2個字符")
                return false
            }

            // 驗證電話號碼
            if (TextUtils.isEmpty(phone)) {
                showError("請輸入電話號碼")
                return false
            }

            if (!Patterns.PHONE.matcher(phone).matches()) {
                showError("請輸入有效的電話號碼")
                return false
            }
        } else {
            // 家長版本驗證
        if (TextUtils.isEmpty(studentName)) {
            showError("請輸入學生姓名")
            return false
        }

        if (studentName.length < 2) {
            showError("學生姓名至少需要2個字符")
            return false
        }

        // 驗證電話號碼
        if (TextUtils.isEmpty(phone)) {
            showError("請輸入電話號碼")
            return false
        }

        if (!Patterns.PHONE.matcher(phone).matches()) {
            showError("請輸入有效的電話號碼")
            return false
            }
        }

        // 驗證密碼
        if (TextUtils.isEmpty(password)) {
            showError("請輸入密碼")
            return false
        }

        if (password.length < 6) {
            showError("密碼至少需要6位數")
            return false
        }

        return true
    }

    private fun showError(message: String) {
        findViewById<android.widget.TextView>(R.id.errorTextView).text = message
        findViewById<android.widget.TextView>(R.id.errorTextView).visibility = View.VISIBLE
    }

    private fun showLoading(show: Boolean) {
        findViewById<android.widget.Button>(R.id.createButton).isEnabled = !show
        findViewById<android.widget.Button>(R.id.cancelButton).isEnabled = !show
        
        if (show) {
            findViewById<android.widget.Button>(R.id.createButton).text = "創建中..."
        } else {
            findViewById<android.widget.Button>(R.id.createButton).text = "創建"
        }
        
        findViewById<android.widget.TextView>(R.id.errorTextView).visibility = View.GONE
    }

    /**
     * 賬號創建結果
     */
    data class AccountResult(
        val success: Boolean,
        val message: String
    )
} 