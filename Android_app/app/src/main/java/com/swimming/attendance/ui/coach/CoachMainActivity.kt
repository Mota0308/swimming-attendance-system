package com.swimming.attendance.ui.coach

import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.R
import com.swimming.attendance.data.Student
import com.swimming.attendance.network.CloudAPIService
import com.swimming.attendance.network.APIConfig
import com.swimming.attendance.ui.login.LoginActivity
import com.swimming.attendance.ui.CoachStudentsAdapter
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Calendar

class CoachMainActivity : AppCompatActivity() {
    private lateinit var cloudApiService: CloudAPIService
    private lateinit var apiConfig: APIConfig
    
    // UI組件
    private lateinit var userInfoText: TextView
    private lateinit var studentNameSearch: EditText
    private lateinit var courseTypeSpinner: Spinner
    private lateinit var dateSearch: EditText
    private lateinit var searchButton: Button
    private lateinit var resetButton: Button
    private lateinit var refreshButton: Button
    private lateinit var studentsRecyclerView: RecyclerView
    private lateinit var loadingProgressBar: ProgressBar
    
    // 月份選擇與工時顯示
    private lateinit var monthSelect: Spinner
    private lateinit var monthLoadButton: Button
    private lateinit var monthSummaryText: TextView
    private lateinit var calendarGrid: GridLayout
    
    private lateinit var coachStudentsAdapter: CoachStudentsAdapter
    
    private var allStudents = mutableListOf<Student>()
    private var filteredStudents = mutableListOf<Student>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_coach_main)
        
        try {
            // 初始化雲端API服務
            cloudApiService = CloudAPIService(this)
            apiConfig = APIConfig.getInstance(this)
            
            // 初始化UI組件
            initializeViews()
            
            // 設置用戶信息
            setupUserInfo()
            
            // 設置搜索功能
            setupSearchFunctionality()
            
            // 設置RecyclerView
            setupRecyclerView()
            
            // 設置月份選擇與載入
            setupMonthLoader()
            
            // 加載學生數據
            loadStudentsData()
            
            Toast.makeText(this, "歡迎使用教練版本！", Toast.LENGTH_LONG).show()
            
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(this, "教練主界面初始化失敗: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }
    
    private fun initializeViews() {
        userInfoText = findViewById(R.id.userInfoText)
        studentNameSearch = findViewById(R.id.studentNameSearch)
        courseTypeSpinner = findViewById(R.id.courseTypeSpinner)
        dateSearch = findViewById(R.id.dateSearch)
        searchButton = findViewById(R.id.searchButton)
        resetButton = findViewById(R.id.resetButton)
        refreshButton = findViewById(R.id.refreshButton)
        studentsRecyclerView = findViewById(R.id.studentsRecyclerView)
        loadingProgressBar = findViewById(R.id.loadingProgressBar)
        
        monthSelect = findViewById(R.id.coachMonthSelect)
        monthLoadButton = findViewById(R.id.loadCoachHoursButton)
        monthSummaryText = findViewById(R.id.coachHoursSummaryText)
        calendarGrid = findViewById(R.id.coachHoursCalendarGrid)
    }
    
    private fun setupUserInfo() {
        val prefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val currentPhone = prefs.getString("current_user_phone", "") ?: ""
        val currentCoachName = "教練"
        userInfoText.text = "👤 當前用戶: $currentCoachName | 電話: $currentPhone"
    }
    
    private fun setupSearchFunctionality() {
        val courseTypes = arrayOf("全部課程類型", "初級班", "中級班", "高級班", "成人班", "兒童班")
        val courseTypeAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, courseTypes)
        courseTypeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        courseTypeSpinner.adapter = courseTypeAdapter
        
        searchButton.setOnClickListener { performSearch() }
        resetButton.setOnClickListener { resetSearch() }
        refreshButton.setOnClickListener { loadStudentsData() }
    }

    private fun setupMonthLoader() {
        val cal = Calendar.getInstance()
        val options = mutableListOf<String>()
        repeat(12) {
            val y = cal.get(Calendar.YEAR)
            val m = cal.get(Calendar.MONTH) + 1
            options.add(String.format("%04d-%02d", y, m))
            cal.add(Calendar.MONTH, -1)
        }
        monthSelect.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, options).apply {
            setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
        monthLoadButton.setOnClickListener { loadMonthlyHours() }
        // 預設載入當月
        monthSelect.setSelection(0)
        loadMonthlyHours()
    }

    private fun loadMonthlyHours() {
        val selected = monthSelect.selectedItem?.toString() ?: return
        val parts = selected.split("-")
        val year = parts[0].toInt()
        val month = parts[1].toInt()
        val prefs = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val phone = prefs.getString("current_user_phone", "") ?: ""
        if (phone.isEmpty()) {
            Toast.makeText(this, "找不到當前用戶電話", Toast.LENGTH_SHORT).show()
            return
        }
        lifecycleScope.launch {
            try {
                showLoading(true)
                val resp = cloudApiService.fetchCoachMonthlyWorkHours(phone, year, month)
                showLoading(false)
                if (resp.success) {
                    val obj = JSONObject(resp.data?.toString() ?: "{}")
                    val arr = obj.optJSONArray("records")
                    var total = 0.0
                    val hoursMap = mutableMapOf<Int, Double>() // day -> hours
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val item = arr.getJSONObject(i)
                            total += item.optDouble("hours", 0.0)
                            val dateStr = item.optString("date") // YYYY-MM-DD
                            val day = try { dateStr.split("-")[2].toInt() } catch (_: Exception) { -1 }
                            if (day in 1..31) {
                                hoursMap[day] = item.optDouble("hours", 0.0)
                            }
                        }
                    }
                    monthSummaryText.text = "本月總時數: ${String.format("%.1f", total)}"
                    renderCalendar(year, month, hoursMap)
                    Toast.makeText(this@CoachMainActivity, "已載入 ${arr?.length() ?: 0} 天工時", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@CoachMainActivity, "載入工時失敗: ${resp.message}", Toast.LENGTH_SHORT).show()
                    renderCalendar(year, month, emptyMap())
                }
            } catch (e: Exception) {
                showLoading(false)
                Toast.makeText(this@CoachMainActivity, "載入工時異常: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun renderCalendar(year: Int, month: Int, hoursByDay: Map<Int, Double>) {
        calendarGrid.removeAllViews()
        calendarGrid.columnCount = 7
        // 可選：添加星期標頭
        val weekdays = arrayOf("日", "一", "二", "三", "四", "五", "六")
        for (w in 0 until 7) {
            val tv = TextView(this).apply {
                text = weekdays[w]
                setPadding(8, 8, 8, 8)
                gravity = Gravity.CENTER
                setTextColor(0xFF666666.toInt())
            }
            calendarGrid.addView(tv)
        }
        val cal = Calendar.getInstance()
        cal.set(year, month - 1, 1)
        val startDow = cal.get(Calendar.DAY_OF_WEEK) // 1:Sunday
        val offset = startDow - Calendar.SUNDAY // 0..6
        val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        // 空白填充
        repeat(offset) {
            val empty = TextView(this)
            calendarGrid.addView(empty)
        }
        // 當天
        val todayCal = Calendar.getInstance()
        val isSameMonth = (todayCal.get(Calendar.YEAR) == year && (todayCal.get(Calendar.MONTH) + 1) == month)
        val todayDay = if (isSameMonth) todayCal.get(Calendar.DAY_OF_MONTH) else -1
        // 生成每日格
        for (day in 1..daysInMonth) {
            val container = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(8, 8, 8, 8)
                setBackgroundColor(0xFFFFFFFF.toInt())
            }
            val dayText = TextView(this).apply {
                text = day.toString()
                setTextColor(0xFF333333.toInt())
                textSize = 14f
            }
            val hours = hoursByDay[day] ?: 0.0
            val hoursText = TextView(this).apply {
                text = if (hours > 0) String.format("%.1f 小時", hours) else ""
                setTextColor(0xFF2196F3.toInt())
                textSize = 12f
            }
            // 今日高亮
            if (day == todayDay) {
                container.setBackgroundColor(0xFFFFF3CD.toInt()) // 淡黃
            }
            container.addView(dayText)
            container.addView(hoursText)
            container.setOnClickListener {
                val msg = if (hours > 0) "${year}-${String.format("%02d", month)}-${String.format("%02d", day)}：${String.format("%.1f", hours)} 小時" else "${year}-${String.format("%02d", month)}-${String.format("%02d", day)}：無記錄"
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
            }
            calendarGrid.addView(container)
        }
    }
    
    private fun setupRecyclerView() {
        coachStudentsAdapter = CoachStudentsAdapter(filteredStudents) { student, option1, option2 ->
            updateStudentOptions(student, option1, option2)
        }
        
        studentsRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@CoachMainActivity)
            adapter = coachStudentsAdapter
        }
    }
    
    private fun loadStudentsData() {
        lifecycleScope.launch {
            try {
                showLoading(true)
                val students = cloudApiService.fetchStudentsFromCloud()
                allStudents.clear()
                allStudents.addAll(students)
                val sortedStudents = sortStudentsByLocationDateTime(allStudents)
                filteredStudents.clear()
                filteredStudents.addAll(sortedStudents)
                runOnUiThread {
                    coachStudentsAdapter.notifyDataSetChanged()
                    showLoading(false)
                    Toast.makeText(this@CoachMainActivity, "成功加載 ${filteredStudents.size} 名學生", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    showLoading(false)
                    Toast.makeText(this@CoachMainActivity, "加載學生數據失敗: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    private fun sortStudentsByLocationDateTime(students: List<Student>): List<Student> {
        return students.sortedWith(compareBy<Student> { it.location ?: "" }
            .thenBy { it.date ?: "" }
            .thenBy { it.time ?: "" })
    }
    
    private fun performSearch() {
        val nameQuery = studentNameSearch.text.toString().trim()
        val courseType = courseTypeSpinner.selectedItem.toString()
        val dateQuery = dateSearch.text.toString().trim()
        
        filteredStudents.clear()
        allStudents.forEach { student ->
            var matches = true
            if (nameQuery.isNotEmpty()) {
                matches = matches && (student.name?.contains(nameQuery, ignoreCase = true) == true)
            }
            if (courseType != "全部課程類型") {
                matches = matches && (student.type == courseType)
            }
            if (dateQuery.isNotEmpty()) {
                matches = matches && (student.date?.contains(dateQuery) == true)
            }
            if (matches) filteredStudents.add(student)
        }
        coachStudentsAdapter.notifyDataSetChanged()
        Toast.makeText(this, "找到 ${filteredStudents.size} 名學生", Toast.LENGTH_SHORT).show()
    }
    
    private fun resetSearch() {
        studentNameSearch.text.clear()
        courseTypeSpinner.setSelection(0)
        dateSearch.text.clear()
        filteredStudents.clear()
        filteredStudents.addAll(sortStudentsByLocationDateTime(allStudents))
        coachStudentsAdapter.notifyDataSetChanged()
        Toast.makeText(this, "搜索條件已重置", Toast.LENGTH_SHORT).show()
    }
    
    private fun updateStudentOptions(student: Student, option1: String, option2: String) {
        lifecycleScope.launch {
            try {
                val updatedStudent = student.copy(option1 = option1, option2 = option2)
                val index = allStudents.indexOfFirst { it.name == student.name && it.date == student.date }
                if (index != -1) allStudents[index] = updatedStudent
                val filteredIndex = filteredStudents.indexOfFirst { it.name == student.name && it.date == student.date }
                if (filteredIndex != -1) filteredStudents[filteredIndex] = updatedStudent
                val updateData = mapOf(
                    "name" to (student.name ?: ""),
                    "date" to (student.date ?: ""),
                    "option1" to option1,
                    "option2" to option2
                )
                val response = cloudApiService.updateStudentData(updateData)
                runOnUiThread {
                    if (response.success) {
                        Toast.makeText(this@CoachMainActivity, "學生數據更新成功", Toast.LENGTH_SHORT).show()
                        coachStudentsAdapter.notifyDataSetChanged()
                    } else {
                        Toast.makeText(this@CoachMainActivity, "更新失敗: ${response.message}", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this@CoachMainActivity, "更新失敗: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        }
    }
    
    private fun showLoading(show: Boolean) {
        loadingProgressBar.visibility = if (show) View.VISIBLE else View.GONE
    }
    
    override fun onBackPressed() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
        startActivity(intent)
        finish()
    }
} 