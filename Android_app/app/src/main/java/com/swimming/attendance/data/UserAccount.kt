package com.swimming.attendance.data

// 簡化版本的UserAccount數據類，暫時不使用Room
data class UserAccount(
    val phone: String,
    val password: String,
    val userType: String, // "parent" or "coach"
    val studentName: String = "", // 學生姓名
    val createdAt: Long = System.currentTimeMillis()
) 