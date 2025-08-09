package com.swimming.attendance.data

// 簡化版本的Student數據類，暫時不使用Room
data class Student(
    val id: Long = 0,
    val name: String? = null,
    val phone: String? = null,
    val age: String? = null,
    val location: String? = null,
    val courseType: String? = null,
    val type: String? = null,
    val time: String? = null,
    val date: String? = null,
    val pending: String? = null,
    val pendingMonth: String? = null,
    val attendance: String? = null,
    val note: String? = null,
    val option1: String? = null,
    val option2: String? = null,
    val option3: String? = null,
    val totalPoints: String? = null
)