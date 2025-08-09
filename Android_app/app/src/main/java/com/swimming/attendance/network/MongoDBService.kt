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
 * MongoDB服務 - 已禁用，使用REST API替代
 * 此類已不再使用，因為我們改用REST API連接MongoDB
 */
class MongoDBService {
    companion object {
        private const val TAG = "MongoDBService"
        
        // MongoDB連接配置 - 已禁用
        // private const val MONGO_URI = "mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        // private const val DB_NAME = "test"
        // private const val ACCOUNTS_COLLECTION = "Student_account"
        // private const val STUDENTS_COLLECTION = "students"
        
        // 單例實例
        @Volatile
        private var INSTANCE: MongoDBService? = null
        
        fun getInstance(): MongoDBService {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: MongoDBService().also { INSTANCE = it }
            }
        }
    }
    
    // private var mongoClient: MongoClient? = null
    // private var database: MongoDatabase? = null
    
    /**
     * 初始化連接 - 已禁用，使用REST API
     */
    private suspend fun initializeConnection(): Boolean {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "⚠️ MongoDB直接連接已禁用，請使用REST API")
            false
        }
    }
    
    /**
     * 測試連接 - 已禁用，使用REST API
     */
    suspend fun testConnection(): Boolean {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "⚠️ 請使用CloudAPIService.testConnection()")
            false
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
    
    /**
     * 創建學生賬號 - 已禁用，使用REST API
     */
    suspend fun createStudentAccount(phone: String, password: String, userType: String): Boolean {
        Log.d(TAG, "⚠️ 請使用CloudAPIService進行賬號創建")
        return false
    }
    
    /**
     * 驗證登入 - 已禁用，使用REST API
     */
    suspend fun validateLogin(phone: String, password: String): Boolean {
        Log.d(TAG, "⚠️ 請使用CloudAPIService.authenticateUser()")
        return false
    }
    
    /**
     * 關閉連接 - 已禁用
     */
    fun closeConnection() {
        Log.d(TAG, "⚠️ MongoDB直接連接已禁用")
    }
}