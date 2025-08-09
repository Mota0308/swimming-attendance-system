package com.swimming.attendance.network

import android.util.Log
// import com.mongodb.client.MongoClient
// import com.mongodb.client.MongoClients
// import com.mongodb.client.MongoDatabase
// import com.mongodb.client.MongoCollection
// import com.mongodb.client.model.Filters
// import org.bson.Document
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * MongoDB管理器 - 已禁用，使用REST API替代
 * 此類已不再使用，因為我們改用REST API連接MongoDB
 */
class MongoDBManager {
    companion object {
        private const val TAG = "MongoDBManager"
        
        // MongoDB連接配置 - 已禁用
        // private const val MONGO_URI = "mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        // private const val DB_NAME = "test"
        // private const val ACCOUNTS_COLLECTION = "Student_account"
        // private const val STUDENTS_COLLECTION = "students"
        
        // 單例實例
        @Volatile
        private var INSTANCE: MongoDBManager? = null
        
        fun getInstance(): MongoDBManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: MongoDBManager().also { INSTANCE = it }
            }
        }
    }
    
    // private var mongoClient: MongoClient? = null
    // private var database: MongoDatabase? = null
    
    /**
     * 測試連接 - 已禁用，使用REST API
     */
    suspend fun testConnection(): ConnectionTestResult {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "⚠️ MongoDB直接連接已禁用，請使用REST API")
            ConnectionTestResult(
                success = false,
                message = "MongoDB直接連接已禁用，請使用CloudAPIService進行API測試",
                details = "此功能已移除，改用REST API連接MongoDB"
            )
        }
    }
    
    /**
     * 獲取學生資料 - 已禁用，使用REST API
     */
    suspend fun getStudents(): List<Any> {
        Log.d(TAG, "⚠️ 請使用CloudAPIService.fetchStudentsFromCloud()")
        return emptyList()
    }
    
    /**
     * 驗證用戶 - 已禁用，使用REST API
     */
    suspend fun authenticateUser(username: String, password: String): Boolean {
        Log.d(TAG, "⚠️ 請使用CloudAPIService.authenticateUser()")
        return false
    }
}

/**
 * 連接測試結果
 */
data class ConnectionTestResult(
    val success: Boolean,
    val message: String,
    val details: String? = null,
    val errorCode: Int? = null
)
