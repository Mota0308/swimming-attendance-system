package com.swimming.attendance.network

import com.swimming.attendance.data.Student

/**
 * 雲端數據庫結果數據類
 */
data class CloudDBResult(
    val success: Boolean,
    val message: String,
    val students: List<Student> = emptyList(),
    val errorCode: Int? = null
)

/**
 * API 響應數據類
 */
data class APIResponse(
    val success: Boolean,
    val message: String,
    val data: Any? = null,
    val errorCode: Int? = null
)

/**
 * 測試結果數據類
 */
data class TestResult(
    val success: Boolean,
    val message: String,
    val responseCode: Int? = null,
    val responseData: String? = null
) 