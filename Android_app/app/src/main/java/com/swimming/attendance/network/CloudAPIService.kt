package com.swimming.attendance.network

import android.content.Context
import android.util.Log
import com.swimming.attendance.data.Student
import com.swimming.attendance.data.UserAccount
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/**
 * 雲端數據庫 API 服務
 * 使用提供的 API 密鑰訪問雲端數據庫
 */
class CloudAPIService(
    private val context: Context,
    private val customBaseUrl: String? = null
) {
    companion object {
        private const val TAG = "CloudAPIService"
        
        // 數據庫配置
        private const val STUDENTS_COLLECTION = "students"
        private const val ACCOUNTS_COLLECTION = "Student_account"
        
        // 請求頭配置
        private const val CONTENT_TYPE = "application/json"
        private const val USER_AGENT = "SwimmingApp/1.0"
    }
    
    private val apiConfig = APIConfig.getInstance(context)
    
    /**
     * 獲取基礎URL
     */
    private fun getBaseUrl(): String {
        return customBaseUrl ?: apiConfig.getSmartBaseUrl()
    }
    

    
    /**
     * 測試 API 連接
     */
    suspend fun testConnection(): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🧪 開始測試雲端 API 連接...")
                
                val url = URL("${getBaseUrl()}/health")
                val connection = createConnection(url, "GET")
                
                val responseCode = connection.responseCode
                val response = readResponse(connection)
                connection.disconnect()
                
                if (responseCode == 200) {
                    Log.d(TAG, "✅ API 連接測試成功")
                    APIResponse(true, "API 連接正常", response)
                } else {
                    Log.w(TAG, "⚠️ API 連接異常: $responseCode")
                    APIResponse(false, "API 響應異常: $responseCode", null, responseCode)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ API 連接測試失敗", e)
                APIResponse(false, "API 連接失敗: ${e.message}")
            }
        }
    }
    
    /**
     * 從雲端獲取所有學生資料
     */
    suspend fun fetchStudentsFromCloud(): List<Student> {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "📥 開始從雲端獲取學生資料...")
                
                val url = URL("${getBaseUrl()}/students")
                val connection = createConnection(url, "GET")
                
                val responseCode = connection.responseCode
                val response = readResponse(connection)
                connection.disconnect()
                
                if (responseCode == 200) {
                    val students = parseStudentsFromJSON(response)
                    Log.d(TAG, "✅ 成功獲取 ${students.size} 條學生資料")
                    students
                } else {
                    Log.e(TAG, "❌ 獲取學生資料失敗: $responseCode")
                    emptyList()
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 獲取學生資料異常", e)
                emptyList()
            }
        }
    }
    
    /**
     * 根據用戶電話號碼獲取匹配的學生資料
     */
    suspend fun fetchUserStudentsFromCloud(userPhone: String): List<Student> {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "📥 開始獲取用戶學生資料: $userPhone")
                
                val url = URL("${getBaseUrl()}/students/user/$userPhone")
                val connection = createConnection(url, "GET")
                
                val responseCode = connection.responseCode
                val response = readResponse(connection)
                connection.disconnect()
                
                if (responseCode == 200) {
                    val jsonObject = JSONObject(response)
                    if (jsonObject.optBoolean("success", false)) {
                        val studentsArray = jsonObject.optJSONArray("students")
                        val students = parseStudentsFromJSON(studentsArray.toString())
                        Log.d(TAG, "✅ 成功獲取用戶 ${userPhone} 的 ${students.size} 條學生資料")
                        students
                    } else {
                        Log.e(TAG, "❌ 獲取用戶學生資料失敗: ${jsonObject.optString("message")}")
                        emptyList()
                    }
                } else {
                    Log.e(TAG, "❌ 獲取用戶學生資料失敗: $responseCode")
                    emptyList()
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 獲取用戶學生資料異常", e)
                emptyList()
            }
        }
    }
    
    /**
     * 將學生資料上傳到雲端
     */
    suspend fun uploadStudentsToCloud(students: List<Student>): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "📤 開始上傳學生資料到雲端...")
                
                val url = URL("${getBaseUrl()}/students/batch")
                val connection = createConnection(url, "POST")
                
                val jsonData = createStudentsJSON(students)
                val postData = jsonData.toString()
                
                connection.doOutput = true
                connection.outputStream.use { os ->
                    val input = postData.toByteArray(StandardCharsets.UTF_8)
                    os.write(input, 0, input.size)
                }
                
                val responseCode = connection.responseCode
                val response = readResponse(connection)
                connection.disconnect()
                
                if (responseCode == 200 || responseCode == 201) {
                    Log.d(TAG, "✅ 成功上傳 ${students.size} 條學生資料")
                    APIResponse(true, "學生資料上傳成功", response)
                } else {
                    Log.e(TAG, "❌ 上傳學生資料失敗: $responseCode")
                    APIResponse(false, "上傳失敗: $responseCode", null, responseCode)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 上傳學生資料異常", e)
                APIResponse(false, "上傳異常: ${e.message}")
            }
        }
    }
    
    /**
     * 驗證用戶賬號
     */
    suspend fun authenticateUser(phone: String, password: String, userType: String = "parent"): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🔐 開始驗證用戶賬號...")
                
                // 首先嘗試真實登入端點
                val url = URL("${getBaseUrl()}/auth/login")
                val connection = createConnection(url, "POST")
                
                val jsonData = JSONObject().apply {
                    put("phone", phone)
                    put("password", password)
                    put("userType", userType)
                }
                
                connection.doOutput = true
                connection.outputStream.use { os ->
                    val input = jsonData.toString().toByteArray(StandardCharsets.UTF_8)
                    os.write(input, 0, input.size)
                }
                
                val responseCode = connection.responseCode
                val response = readResponse(connection)
                connection.disconnect()
                
                if (responseCode == 200) {
                    Log.d(TAG, "✅ 用戶驗證成功")
                    APIResponse(true, "登入成功", response)
                } else {
                    Log.w(TAG, "⚠️ 用戶驗證失敗: $responseCode")
                    APIResponse(false, "登入失敗", null, responseCode)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 用戶驗證異常", e)
                APIResponse(false, "驗證異常: ${e.message}")
            }
        }
    }
    
    /**
     * 創建用戶賬號
     */
    suspend fun createUserAccount(userAccount: UserAccount): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "👤 開始創建用戶賬號: ${userAccount.phone}")
                
                // 根據用戶類型選擇不同的端點
                val endpoint = if (userAccount.userType == "coach") {
                    "/auth/register-coach"
                } else {
                    "/auth/register"
                }
                
                Log.d(TAG, "🔗 嘗試連接到: ${getBaseUrl()}$endpoint")
                
                val url = URL("${getBaseUrl()}$endpoint")
                val connection = createConnection(url, "POST")
                
                val jsonData = JSONObject().apply {
                    put("phone", userAccount.phone)
                    put("password", userAccount.password)
                    put("userType", userAccount.userType)
                    put("studentName", userAccount.studentName)
                    put("createdAt", userAccount.createdAt)
                }
                
                Log.d(TAG, "📤 發送數據: $jsonData")
                
                connection.doOutput = true
                connection.outputStream.use { os ->
                    val input = jsonData.toString().toByteArray(StandardCharsets.UTF_8)
                    os.write(input, 0, input.size)
                }
                
                val responseCode = connection.responseCode
                val response = readResponse(connection)
                connection.disconnect()
                
                Log.d(TAG, "📊 響應碼: $responseCode")
                Log.d(TAG, "📄 響應內容: $response")
                
                if (responseCode == 200 || responseCode == 201) {
                    Log.d(TAG, "✅ 用戶賬號創建成功")
                    APIResponse(true, "用戶賬號創建成功", response)
                } else {
                    Log.e(TAG, "❌ 用戶賬號創建失敗: $responseCode")
                    Log.e(TAG, "📄 錯誤響應: $response")
                    APIResponse(false, "用戶賬號創建失敗: $responseCode", null, responseCode)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 用戶賬號創建異常", e)
                Log.e(TAG, "🔍 異常詳情: ${e.javaClass.simpleName} - ${e.message}")
                e.printStackTrace()
                APIResponse(false, "用戶賬號創建異常: ${e.message}")
            }
        }
    }
    
    /**
     * 創建學生資料
     */
    suspend fun createStudentData(studentData: Map<String, String>): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "📚 開始創建學生資料: ${studentData["name"]}")
                
                val url = URL("${getBaseUrl()}/students")
                val connection = createConnection(url, "POST")
                
                val jsonData = JSONObject().apply {
                    studentData.forEach { (key, value) ->
                        put(key, value)
                    }
                }
                
                connection.doOutput = true
                connection.outputStream.use { os ->
                    val input = jsonData.toString().toByteArray(StandardCharsets.UTF_8)
                    os.write(input, 0, input.size)
                }
                
                val responseCode = connection.responseCode
                val response = readResponse(connection)
                connection.disconnect()
                
                if (responseCode == 200 || responseCode == 201) {
                    Log.d(TAG, "✅ 學生資料創建成功")
                    APIResponse(true, "學生資料創建成功", response)
                } else {
                    Log.e(TAG, "❌ 學生資料創建失敗: $responseCode")
                    APIResponse(false, "學生資料創建失敗: $responseCode", null, responseCode)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 學生資料創建異常", e)
                APIResponse(false, "學生資料創建異常: ${e.message}")
            }
        }
    }
    
    /**
     * 更新學生資料
     */
    suspend fun updateStudentData(studentData: Map<String, String>): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                val studentName = studentData["name"] ?: ""
                val studentDate = studentData["date"] ?: ""
                Log.d(TAG, "📝 開始更新學生資料: $studentName, 日期: $studentDate")
                
                val url = URL("${getBaseUrl()}/students/update")
                val connection = createConnection(url, "PUT")
                
                val jsonData = JSONObject().apply {
                    studentData.forEach { (key, value) ->
                        put(key, value)
                    }
                }
                
                connection.doOutput = true
                connection.outputStream.use { os ->
                    val input = jsonData.toString().toByteArray(StandardCharsets.UTF_8)
                    os.write(input, 0, input.size)
                }
                
                val responseCode = connection.responseCode
                val response = readResponse(connection)
                connection.disconnect()
                
                if (responseCode == 200 || responseCode == 201) {
                    Log.d(TAG, "✅ 學生資料更新成功")
                    APIResponse(true, "學生資料更新成功", response)
                } else {
                    Log.e(TAG, "❌ 學生資料更新失敗: $responseCode")
                    APIResponse(false, "學生資料更新失敗: $responseCode", null, responseCode)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 學生資料更新異常", e)
                APIResponse(false, "學生資料更新異常: ${e.message}")
            }
        }
    }
    
    /**
     * 獲取教練列表
     */
    suspend fun fetchCoaches(): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("${getBaseUrl()}/coaches")
                val connection = createConnection(url, "GET")
                val code = connection.responseCode
                val body = readResponse(connection)
                connection.disconnect()
                if (code == 200) APIResponse(true, "OK", body) else APIResponse(false, "${code}", null, code)
            } catch (e: Exception) {
                APIResponse(false, e.message ?: "error")
            }
        }
    }

    /**
     * 批量上傳教練工時
     */
    suspend fun uploadCoachWorkHours(date: String, totals: Map<String, Double>): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("${getBaseUrl()}/coach-work-hours/batch")
                val connection = createConnection(url, "POST")
                val payload = JSONObject().apply {
                    put("date", date)
                    val arr = JSONArray()
                    totals.forEach { (phone, hours) ->
                        arr.put(JSONObject().apply {
                            put("phone", phone)
                            put("hours", hours)
                        })
                    }
                    put("entries", arr)
                }
                connection.doOutput = true
                connection.outputStream.use { os ->
                    val input = payload.toString().toByteArray(StandardCharsets.UTF_8)
                    os.write(input, 0, input.size)
                }
                val code = connection.responseCode
                val body = readResponse(connection)
                connection.disconnect()
                if (code == 200) APIResponse(true, "OK", body) else APIResponse(false, "${code}", null, code)
            } catch (e: Exception) {
                APIResponse(false, e.message ?: "error")
            }
        }
    }
    
    /**
     * 獲取某教練在指定年月的工時記錄
     */
    suspend fun fetchCoachMonthlyWorkHours(phone: String, year: Int, month: Int): APIResponse {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("${getBaseUrl()}/coach-work-hours?phone=${URLEncoder.encode(phone, "UTF-8")}&year=$year&month=$month")
                val connection = createConnection(url, "GET")
                val code = connection.responseCode
                val body = readResponse(connection)
                connection.disconnect()
                if (code == 200) APIResponse(true, "OK", body) else APIResponse(false, "${code}", null, code)
            } catch (e: Exception) {
                APIResponse(false, e.message ?: "error")
            }
        }
    }
    
    /**
     * 創建 HTTP 連接
     */
    private fun createConnection(url: URL, method: String): HttpURLConnection {
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 15000
        connection.readTimeout = 15000
        connection.setRequestProperty("Content-Type", CONTENT_TYPE)
        connection.setRequestProperty("User-Agent", USER_AGENT)
        connection.setRequestProperty("X-API-Public-Key", apiConfig.getPublicApiKey())
        connection.setRequestProperty("X-API-Private-Key", apiConfig.getPrivateApiKey())
        connection.setRequestProperty("Accept", "application/json")
        return connection
    }
    
    /**
     * 讀取響應內容
     */
    private fun readResponse(connection: HttpURLConnection): String {
        return try {
            val inputStream = if (connection.responseCode >= 400) {
                connection.errorStream
            } else {
                connection.inputStream
            }
            
            inputStream?.bufferedReader(StandardCharsets.UTF_8)?.use { reader ->
                reader.readText()
            } ?: ""
        } catch (e: Exception) {
            Log.e(TAG, "❌ 讀取響應失敗", e)
            ""
        }
    }
    
    /**
     * 從 JSON 解析學生資料
     */
    private fun parseStudentsFromJSON(jsonString: String): List<Student> {
        return try {
            val students = mutableListOf<Student>()
            val jsonArray = JSONArray(jsonString)
            
            for (i in 0 until jsonArray.length()) {
                val jsonObject = jsonArray.getJSONObject(i)
                val student = Student(
                    name = jsonObject.optString("name", ""),
                    phone = jsonObject.optString("Phone_number", ""),
                    age = jsonObject.optString("age", ""),
                    location = jsonObject.optString("location", ""),
                    courseType = jsonObject.optString("courseType", ""),
                    type = jsonObject.optString("type", ""),
                    time = jsonObject.optString("time", ""),
                    date = jsonObject.optString("date", ""),
                    pending = jsonObject.optString("pending", "否"),
                    pendingMonth = jsonObject.optString("pendingMonth", ""),
                    attendance = jsonObject.optString("attendance", ""),
                    note = jsonObject.optString("note", ""),
                    option1 = jsonObject.optString("option1", ""),
                    option2 = jsonObject.optString("option2", ""),
                    option3 = jsonObject.optString("option3", ""),
                    totalPoints = jsonObject.optString("totalPoints", "0")
                )
                students.add(student)
            }
            students
        } catch (e: Exception) {
            Log.e(TAG, "❌ 解析學生 JSON 失敗", e)
            emptyList()
        }
    }
    
    /**
     * 創建學生資料 JSON
     */
    private fun createStudentsJSON(students: List<Student>): JSONArray {
        val jsonArray = JSONArray()
        students.forEach { student ->
            val jsonObject = JSONObject().apply {
                put("name", student.name)
                put("phone", student.phone)
                put("age", student.age)
                put("location", student.location)
                put("courseType", student.courseType)
                put("time", student.time)
                put("date", student.date)
                put("pending", student.pending)
                put("pendingMonth", student.pendingMonth)
                put("attendance", student.attendance)
                put("note", student.note)
                put("option3", student.option3)
            }
            jsonArray.put(jsonObject)
        }
        return jsonArray
    }
} 