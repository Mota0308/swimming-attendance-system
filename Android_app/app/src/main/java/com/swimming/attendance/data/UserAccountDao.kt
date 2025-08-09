package com.swimming.attendance.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf

// 簡化版本的UserAccountDao，暫時不使用複雜的存儲
class UserAccountDao {
    suspend fun getUserByPhone(phone: String): UserAccount? {
        return null
    }

    suspend fun login(phone: String, password: String): UserAccount? {
        // 簡單的測試賬號驗證
        return if ((phone == "0912345678" || phone == "test") && password == "123456") {
            UserAccount(
                phone = phone,
                password = password,
                userType = "parent",
                studentName = "測試學生",
                createdAt = System.currentTimeMillis()
            )
        } else {
            null
        }
    }

    suspend fun insertUser(user: UserAccount) {
        // 暫時不實現實際存儲，只是模擬成功
    }

    suspend fun updateUser(user: UserAccount) {
        // 暫時不實現
    }

    suspend fun deleteUser(user: UserAccount) {
        // 暫時不實現
    }

    suspend fun isPhoneExists(phone: String): Boolean {
        return phone == "0912345678" || phone == "test"
    }

    suspend fun getAllUsers(): List<UserAccount> {
        // 返回一些測試賬號
        return listOf(
            UserAccount("0912345678", "123456", "parent", "測試學生1", System.currentTimeMillis()),
            UserAccount("test", "123456", "parent", "測試學生2", System.currentTimeMillis())
        )
    }
}