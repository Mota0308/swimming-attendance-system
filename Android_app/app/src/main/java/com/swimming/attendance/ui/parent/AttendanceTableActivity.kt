package com.swimming.attendance.ui.parent

import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.R
import com.swimming.attendance.data.Student
import com.swimming.attendance.network.CloudAPIService
import com.swimming.attendance.ui.StudentsAdapter
import kotlinx.coroutines.launch

/**
 * 出席記錄表格Activity
 * 顯示完整的學生出席記錄表格
 */
class AttendanceTableActivity : AppCompatActivity() {
    private lateinit var cloudApiService: CloudAPIService
    private lateinit var statusText: TextView
    private lateinit var searchEditText: EditText
    private lateinit var searchButton: Button
    private lateinit var filterSpinner: Spinner
    private lateinit var refreshButton: Button
    private lateinit var backButton: Button
    private lateinit var tableContainer: LinearLayout

    companion object {
        private const val TAG = "AttendanceTableActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_attendance_table)

        // 初始化
        cloudApiService = CloudAPIService(this)
        initViews()
        setupClickListeners()
        loadAttendanceData()
    }

    private fun initViews() {
        statusText = findViewById(R.id.statusText)
        searchEditText = findViewById(R.id.searchEditText)
        searchButton = findViewById(R.id.searchButton)
        filterSpinner = findViewById(R.id.filterSpinner)
        refreshButton = findViewById(R.id.refreshButton)
        backButton = findViewById(R.id.backButton)
        tableContainer = findViewById(R.id.tableContainer)

        // 設置RecyclerView
        // studentsRecyclerView.layoutManager = LinearLayoutManager(this)
        // studentsAdapter = StudentsAdapter(emptyList())
        // studentsRecyclerView.adapter = studentsAdapter

        // 設置過濾器選項
        val filterOptions = arrayOf("全部", "出席", "缺席", "請假")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, filterOptions)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        filterSpinner.adapter = adapter
    }

    private fun setupClickListeners() {
        searchButton.setOnClickListener {
            performSearch()
        }

        filterSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                applyFilter()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        refreshButton.setOnClickListener {
            loadAttendanceData()
        }

        backButton.setOnClickListener {
            finish()
        }
    }

    private fun loadAttendanceData() {
        statusText.text = "正在載入出席記錄..."
        refreshButton.isEnabled = false

        lifecycleScope.launch {
            try {
                // 測試API連接
                val connectionResult = cloudApiService.testConnection()

                if (connectionResult.success) {
                    statusText.text = "API連接成功，正在獲取出席記錄..."

                    // 獲取學生資料
                    val students = cloudApiService.fetchStudentsFromCloud()

                    if (students.isNotEmpty()) {
                        statusText.text = "✅ 成功載入 ${students.size} 筆出席記錄"
                        createDetailedTable(students)
                        Toast.makeText(this@AttendanceTableActivity,
                            "出席記錄載入成功！", Toast.LENGTH_SHORT).show()
                    } else {
                        statusText.text = "⚠️ 未找到出席記錄"
                        createDetailedTable(emptyList())
                        Toast.makeText(this@AttendanceTableActivity,
                            "未找到出席記錄", Toast.LENGTH_LONG).show()
                    }
                } else {
                    statusText.text = "❌ API連接失敗: ${connectionResult.message}"
                    Toast.makeText(this@AttendanceTableActivity,
                        "API連接失敗: ${connectionResult.message}", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ 載入失敗: ${e.message}"
                Toast.makeText(this@AttendanceTableActivity,
                    "載入失敗: ${e.message}", Toast.LENGTH_LONG).show()
                Log.e(TAG, "載入出席記錄失敗", e)
            } finally {
                refreshButton.isEnabled = true
            }
        }
    }

    private fun createDetailedTable(students: List<Student>) {
        tableContainer.removeAllViews()

        // 創建表格標題
        val titleLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(16, 16, 16, 8)
            gravity = android.view.Gravity.CENTER_VERTICAL
        }

        val titleText = TextView(this).apply {
            text = "出席記錄"
            textSize = 18f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(0xFF333333.toInt())
        }
        titleLayout.addView(titleText)

        tableContainer.addView(titleLayout)

        // 按地點分組學生
        val studentsByLocation = students.groupBy { it.location?.ifEmpty { "未知地點" } ?: "未知地點" }

        studentsByLocation.forEach { (location, locationStudents) ->
            // 創建地點標題
            val locationTitle = TextView(this).apply {
                text = if (location == "未知地點") "未知地點" else "$location 🏊‍♂️"
                textSize = 16f
                setTypeface(null, android.graphics.Typeface.BOLD)
                setTextColor(0xFF2196F3.toInt())
                setPadding(16, 16, 16, 8)
            }
            tableContainer.addView(locationTitle)

            // 創建表格標題行
            val headerRow = createTableRow(
                listOf(
                    "學生姓名", "學生年齡", "電話號碼", 
                    "已購買點數", "已購買堂數", "待約堂數", 
                    "已約堂數", "已出席堂數", "剩餘堂數", "剩餘點數"
                ),
                isHeader = true
            )
            tableContainer.addView(headerRow)

            // 創建學生數據行
            locationStudents.forEach { student ->
                val rowData = listOf(
                    student.name ?: "",
                    student.age ?: "",
                    student.phone ?: "",
                    calculatePurchasedPoints(student),
                    calculatePurchasedClasses(student),
                    calculatePendingClasses(student),
                    calculateAppointedClasses(student),
                    calculateAttendedClasses(student),
                    calculateRemainingClasses(student),
                    calculateRemainingPoints(student)
                )
                val dataRow = createTableRow(rowData, isHeader = false)
                tableContainer.addView(dataRow)
            }

            // 添加分隔線
            val divider = View(this).apply {
                setBackgroundColor(0xFFE0E0E0.toInt())
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    2
                ).apply {
                    topMargin = 16
                    bottomMargin = 16
                }
            }
            tableContainer.addView(divider)
        }
    }

    private fun createTableRow(data: List<String>, isHeader: Boolean): LinearLayout {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(8, 8, 8, 8)
            setBackgroundColor(if (isHeader) 0xFFF5F5F5.toInt() else 0xFFFFFFFF.toInt())
        }

        data.forEach { text ->
            val cell = TextView(this).apply {
                this.text = text
                textSize = 12f
                setPadding(4, 4, 4, 4)
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                gravity = android.view.Gravity.CENTER
                
                if (isHeader) {
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(0xFF333333.toInt())
                } else {
                    setTextColor(0xFF666666.toInt())
                }
                
                // 為重要列設置紅色
                if (text.contains("已購買點數") || text.contains("已購買堂數") || 
                    text.contains("剩餘堂數") || text.contains("剩餘點數")) {
                    setTextColor(0xFFFF0000.toInt())
                }
            }
            row.addView(cell)
        }

        return row
    }

    // 計算各種數值的輔助方法
    private fun calculatePurchasedPoints(student: Student): String {
        return try {
            student.option3?.toIntOrNull()?.toString() ?: "0"
        } catch (e: Exception) {
            "0"
        }
    }

    private fun calculatePurchasedClasses(student: Student): String {
        return try {
            val points = student.option3?.toIntOrNull() ?: 0
            (points / 3).toString() // 假設3點等於1堂課
        } catch (e: Exception) {
            "1"
        }
    }

    private fun calculatePendingClasses(student: Student): String {
        return try {
            student.pending?.toIntOrNull()?.toString() ?: "0"
        } catch (e: Exception) {
            "0"
        }
    }

    private fun calculateAppointedClasses(student: Student): String {
        return try {
            val purchased = calculatePurchasedClasses(student).toIntOrNull() ?: 0
            val pending = calculatePendingClasses(student).toIntOrNull() ?: 0
            (purchased - pending).toString()
        } catch (e: Exception) {
            "0"
        }
    }

    private fun calculateAttendedClasses(student: Student): String {
        return if (student.attendance?.contains("出席") == true) "1" else "0"
    }

    private fun calculateRemainingClasses(student: Student): String {
        return try {
            val appointed = calculateAppointedClasses(student).toIntOrNull() ?: 0
            val attended = calculateAttendedClasses(student).toIntOrNull() ?: 0
            (appointed - attended).toString()
        } catch (e: Exception) {
            "0"
        }
    }

    private fun calculateRemainingPoints(student: Student): String {
        return try {
            val purchased = calculatePurchasedPoints(student).toIntOrNull() ?: 0
            val attended = calculateAttendedClasses(student).toIntOrNull() ?: 0
            (purchased - (attended * 3)).toString() // 假設1堂課消耗3點
        } catch (e: Exception) {
            "0"
        }
    }

    private fun performSearch() {
        val searchQuery = searchEditText.text.toString().trim()
        if (searchQuery.isEmpty()) {
            loadAttendanceData()
            return
        }

        statusText.text = "正在搜尋: $searchQuery"
        
        lifecycleScope.launch {
            try {
                val students = cloudApiService.fetchStudentsFromCloud()
                val filteredStudents = students.filter { student ->
                    (student.name?.contains(searchQuery, ignoreCase = true) == true) ||
                    (student.phone?.contains(searchQuery, ignoreCase = true) == true) ||
                    (student.courseType?.contains(searchQuery, ignoreCase = true) == true) ||
                    (student.location?.contains(searchQuery, ignoreCase = true) == true)
                }

                if (filteredStudents.isNotEmpty()) {
                    statusText.text = "🔍 找到 ${filteredStudents.size} 筆符合的記錄"
                    createDetailedTable(filteredStudents)
                } else {
                    statusText.text = "🔍 未找到符合的記錄"
                    createDetailedTable(emptyList())
                    Toast.makeText(this@AttendanceTableActivity,
                        "未找到符合的記錄", Toast.LENGTH_SHORT).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ 搜尋失敗: ${e.message}"
                Toast.makeText(this@AttendanceTableActivity,
                    "搜尋失敗: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun applyFilter() {
        val selectedFilter = filterSpinner.selectedItem.toString()
        if (selectedFilter == "全部") {
            loadAttendanceData()
            return
        }

        statusText.text = "正在篩選: $selectedFilter"

        lifecycleScope.launch {
            try {
                val students = cloudApiService.fetchStudentsFromCloud()
                val filteredStudents = when (selectedFilter) {
                    "出席" -> students.filter { it.attendance?.contains("出席", ignoreCase = true) == true }
                    "缺席" -> students.filter { it.attendance?.contains("缺席", ignoreCase = true) == true }
                    "請假" -> students.filter { it.attendance?.contains("請假", ignoreCase = true) == true || it.pending?.isNotEmpty() == true }
                    else -> students
                }

                if (filteredStudents.isNotEmpty()) {
                    statusText.text = "✅ 篩選結果: ${filteredStudents.size} 筆記錄"
                    createDetailedTable(filteredStudents)
                } else {
                    statusText.text = "⚠️ 篩選結果: 無符合記錄"
                    createDetailedTable(emptyList())
                    Toast.makeText(this@AttendanceTableActivity,
                        "篩選結果: 無符合記錄", Toast.LENGTH_SHORT).show()
                }

            } catch (e: Exception) {
                statusText.text = "❌ 篩選失敗: ${e.message}"
                Toast.makeText(this@AttendanceTableActivity,
                    "篩選失敗: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
} 