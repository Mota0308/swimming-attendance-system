package com.swimming.attendance.ui.login

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.swimming.attendance.R
import com.swimming.attendance.data.AppDatabase
import com.swimming.attendance.data.UserAccount
import com.swimming.attendance.databinding.ActivityLoginBinding
import com.swimming.attendance.network.CloudAPIService
import com.swimming.attendance.ui.admin.AdminMainActivity
import com.swimming.attendance.ui.coach.CoachMainActivity
import com.swimming.attendance.ui.parent.ParentMainActivity
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private lateinit var userAccountDao: com.swimming.attendance.data.UserAccountDao

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        try {
            userAccountDao = AppDatabase.getDatabase(this).userAccountDao()
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(this, "初始化失敗，請重試", Toast.LENGTH_LONG).show()
        }

        setupViews()
        setupListeners()
    }

    private fun setupViews() {
        // 設置登入身份下拉選單
        val roles = listOf("學生", "教練", "管理員")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, roles)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.loginRoleSpinner.adapter = adapter
        // 默認選擇 學生
        binding.loginRoleSpinner.setSelection(0)
    }

    private fun setupListeners() {
        binding.loginButton.setOnClickListener {
            handleLogin()
        }
    }

    private fun handleLogin() {
        val phone = binding.phoneEditText.text.toString().trim()
        val password = binding.passwordEditText.text.toString().trim()
        val roleDisplay = binding.loginRoleSpinner.selectedItem?.toString() ?: "學生"
        val userType = when (roleDisplay) {
            "學生" -> "parent"
            "教練" -> "coach"
            "管理員" -> "admin"
            else -> "parent"
        }

        if (phone.isEmpty() || password.isEmpty()) {
            showError("請輸入電話號碼和密碼")
            return
        }

        showLoading(true)
        lifecycleScope.launch {
            try {
                val cloudApiService = CloudAPIService(this@LoginActivity)
                val loginResult = cloudApiService.authenticateUser(phone, password, userType)
                if (loginResult.success) {
                    // 保存當前用戶信息
                    getSharedPreferences("login_prefs", MODE_PRIVATE).edit().apply {
                        putString("current_user_phone", phone)
                        putString("current_user_type", userType)
                    }.apply()

                                showLoading(false)
                                Toast.makeText(this@LoginActivity, "登入成功", Toast.LENGTH_SHORT).show()
                                navigateToMainActivity(userType)
                } else {
                        showLoading(false)
                    showError(loginResult.message ?: "登入失敗")
                }
            } catch (e: Exception) {
                    showLoading(false)
                    showError("登入失敗：${e.message}")
                }
            }
        }

    private fun showLoading(loading: Boolean) {
        binding.errorTextView.visibility = View.GONE
        // 可擴展 Loading UI
    }

    private fun showError(message: String) {
        binding.errorTextView.text = message
        binding.errorTextView.visibility = View.VISIBLE
    }

    private fun navigateToMainActivity(userType: String) {
            val intent = when (userType) {
            "parent" -> Intent(this, ParentMainActivity::class.java)
            "coach" -> Intent(this, CoachMainActivity::class.java)
            "admin" -> Intent(this, AdminMainActivity::class.java)
            else -> Intent(this, ParentMainActivity::class.java)
            }
            intent.putExtra("userType", userType)
            startActivity(intent)
            finish()
    }
} 