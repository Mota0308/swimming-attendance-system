package com.swimming.attendance.ui.parent

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.LayoutInflater
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

class StudentOverviewActivity : AppCompatActivity() {
    private lateinit var cloudApiService: CloudAPIService
    private lateinit var studentsRecyclerView: RecyclerView
    private lateinit var studentsAdapter: StudentOverviewAdapter
    private lateinit var progressBar: ProgressBar
    private lateinit var noDataTextView: TextView
    private lateinit var statusTextView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        cloudApiService = CloudAPIService(this)
        createOverviewLayout()
        loadStudentOverview()
    }

    private fun createOverviewLayout() {
        // 創建主布局
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
        }

        // 標題
        val titleText = TextView(this).apply {
            text = "📊 學生總覽"
            textSize = 20f
            setPadding(0, 0, 0, 16)
            gravity = android.view.Gravity.CENTER
            setTextColor(0xFF2196F3.toInt())
        }
        mainLayout.addView(titleText)

        // 狀態顯示
        statusTextView = TextView(this).apply {
            text = "載入學生資料中..."
            textSize = 14f
            setPadding(8, 8, 8, 8)
            setBackgroundColor(0xFFF5F5F5.toInt())
        }
        mainLayout.addView(statusTextView)

        // 表格標題
        val tableHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(8, 12, 8, 12)
            setBackgroundColor(0xFFE3F2FD.toInt())
        }

        // 表格標題列
        val headers = listOf("學生姓名", "年齡", "已購買堂數", "待約堂數", "已約堂數", "已出席堂數", "剩餘堂數")
        headers.forEach { header ->
            val headerText = TextView(this).apply {
                text = header
                textSize = 12f
                setTextColor(0xFF1976D2.toInt())
                setPadding(4, 0, 4, 0)
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            tableHeader.addView(headerText)
        }
        mainLayout.addView(tableHeader)

        // 學生列表
        studentsRecyclerView = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@StudentOverviewActivity)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
        }
        mainLayout.addView(studentsRecyclerView)

        // 載入指示器
        progressBar = ProgressBar(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.CENTER
            }
        }
        mainLayout.addView(progressBar)

        // 無資料提示
        noDataTextView = TextView(this).apply {
            text = "暫無學生資料"
            textSize = 16f
            setTextColor(0xFF666666.toInt())
            gravity = android.view.Gravity.CENTER
            visibility = View.GONE
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        mainLayout.addView(noDataTextView)

        setContentView(mainLayout)
    }

    private fun loadStudentOverview() {
        progressBar.visibility = View.VISIBLE
        statusTextView.text = "載入學生資料中..."

        lifecycleScope.launch {
            try {
                val currentPhone = getCurrentUserPhone()
                val students = cloudApiService.fetchUserStudentsFromCloud(currentPhone)
                
                if (students.isNotEmpty()) {
                    // 對相同姓名的學生進行去重，只保留一行
                    val uniqueStudents = students.groupBy { it.name }
                        .map { (name, studentList) ->
                            // 取第一個學生作為代表，但合併所有相關數據
                            val firstStudent = studentList.first()
                            val totalPending = studentList.sumOf { (it.pending ?: "0").toIntOrNull() ?: 0 }
                            
                            StudentOverview(
                                name = name ?: "未知學生",
                                age = firstStudent.age ?: "",
                                purchasedClasses = calculatePurchasedClasses(firstStudent),
                                pendingClasses = totalPending.toString(),
                                scheduledClasses = calculateScheduledClasses(firstStudent),
                                attendedClasses = calculateAttendedClasses(firstStudent),
                                remainingClasses = calculateRemainingClasses(firstStudent)
                            )
                        }
                    
                    displayStudentOverview(uniqueStudents)
                } else {
                    showNoData()
                }
            } catch (e: Exception) {
                statusTextView.text = "載入失敗: ${e.message}"
                showNoData()
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    private fun displayStudentOverview(students: List<StudentOverview>) {
        studentsAdapter = StudentOverviewAdapter(students)
        studentsRecyclerView.adapter = studentsAdapter
        statusTextView.text = "共找到 ${students.size} 名學生"
        noDataTextView.visibility = View.GONE
    }

    private fun showNoData() {
        studentsRecyclerView.visibility = View.GONE
        noDataTextView.visibility = View.VISIBLE
    }

    private fun getCurrentUserPhone(): String {
        return getSharedPreferences("login_prefs", MODE_PRIVATE)
            .getString("current_user_phone", "") ?: ""
    }

    // 計算各種堂數的輔助方法
    private fun calculatePurchasedClasses(student: Student): String {
        // 這裡可以根據實際業務邏輯計算已購買堂數
        // 暫時返回一個示例值
        return "10"
    }

    private fun calculatePendingClasses(student: Student): String {
        // 計算待約堂數
        return "2"
    }

    private fun calculateScheduledClasses(student: Student): String {
        // 計算已約堂數
        return "8"
    }

    private fun calculateAttendedClasses(student: Student): String {
        // 計算已出席堂數
        return "6"
    }

    private fun calculateRemainingClasses(student: Student): String {
        // 計算剩餘堂數
        return "4"
    }
}

// 學生總覽數據類
data class StudentOverview(
    val name: String,
    val age: String,
    val purchasedClasses: String,
    val pendingClasses: String,
    val scheduledClasses: String,
    val attendedClasses: String,
    val remainingClasses: String
)

// 學生總覽適配器
class StudentOverviewAdapter(private val students: List<StudentOverview>) : 
    RecyclerView.Adapter<StudentOverviewAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val nameText: TextView = view.findViewById(R.id.studentNameText)
        val ageText: TextView = view.findViewById(R.id.studentAgeText)
        val purchasedText: TextView = view.findViewById(R.id.purchasedClassesText)
        val pendingText: TextView = view.findViewById(R.id.pendingClassesText)
        val scheduledText: TextView = view.findViewById(R.id.scheduledClassesText)
        val attendedText: TextView = view.findViewById(R.id.attendedClassesText)
        val remainingText: TextView = view.findViewById(R.id.remainingClassesText)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_student_overview, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val student = students[position]
        holder.nameText.text = student.name
        holder.ageText.text = student.age
        holder.purchasedText.text = student.purchasedClasses
        holder.pendingText.text = student.pendingClasses
        holder.scheduledText.text = student.scheduledClasses
        holder.attendedText.text = student.attendedClasses
        holder.remainingText.text = student.remainingClasses
    }

    override fun getItemCount() = students.size
} 