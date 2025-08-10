package com.swimming.attendance.ui.parent

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.R
import com.swimming.attendance.data.Student

class ExpandableStudentAdapter(private var students: List<Student>) : 
    RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val expandedStudents = mutableSetOf<String>()
    
    companion object {
        private const val VIEW_TYPE_HEADER = 0
        private const val VIEW_TYPE_DATE = 1
    }

    class StudentHeaderViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val studentNameText: TextView = view.findViewById(R.id.studentNameText)
        val pendingCountText: TextView = view.findViewById(R.id.pendingCountText)
        val expandIcon: TextView = view.findViewById(R.id.expandIcon)
    }

    class DateViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val dateText: TextView = view.findViewById(R.id.dateText)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            VIEW_TYPE_HEADER -> {
                val view = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_student_header, parent, false)
                StudentHeaderViewHolder(view)
            }
            VIEW_TYPE_DATE -> {
                val view = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_student_date, parent, false)
                DateViewHolder(view)
            }
            else -> throw IllegalArgumentException("Invalid view type")
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (holder) {
            is StudentHeaderViewHolder -> {
                val studentName = getStudentNameAtPosition(position)
                val pendingCount = getPendingCountForStudent(studentName)
                val isExpanded = expandedStudents.contains(studentName)
                
                holder.studentNameText.text = "📚 $studentName"
                holder.pendingCountText.text = "⏳ 待約數量: $pendingCount"
                holder.expandIcon.text = if (isExpanded) "▼" else "▶"
                
                holder.itemView.setOnClickListener {
                    toggleExpansion(studentName)
                }
            }
            is DateViewHolder -> {
                val dateInfo = getDateAtPosition(position)
                holder.dateText.text = "📅 $dateInfo"
            }
        }
    }

    override fun getItemCount(): Int {
        var count = 0
        val groupedStudents = students.groupBy { it.name }
        
        groupedStudents.forEach { (studentName, studentList) ->
            count++ // 學生標題行
            if (expandedStudents.contains(studentName)) {
                count += studentList.size // 展開的日期行
            }
        }
        
        return count
    }

    override fun getItemViewType(position: Int): Int {
        val groupedStudents = students.groupBy { it.name }
        var currentPosition = 0
        
        for ((studentName, studentList) in groupedStudents) {
            if (position == currentPosition) {
                return VIEW_TYPE_HEADER
            }
            currentPosition++
            
            if (expandedStudents.contains(studentName)) {
                if (position < currentPosition + studentList.size) {
                    return VIEW_TYPE_DATE
                }
                currentPosition += studentList.size
            }
        }
        
        return VIEW_TYPE_HEADER
    }

    private fun getStudentNameAtPosition(position: Int): String {
        val groupedStudents = students.groupBy { it.name }
        var currentPosition = 0
        
        for ((studentName, studentList) in groupedStudents) {
            if (position == currentPosition) {
                return studentName ?: "未知學生"
            }
            currentPosition++
            
            if (expandedStudents.contains(studentName)) {
                currentPosition += studentList.size
            }
        }
        
        return "未知學生"
    }

    private fun getDateAtPosition(position: Int): String {
        val groupedStudents = students.groupBy { it.name }
        var currentPosition = 0
        
        for ((studentName, studentList) in groupedStudents) {
            currentPosition++ // 跳過標題行
            
            if (expandedStudents.contains(studentName)) {
                val dateIndex = position - currentPosition
                if (dateIndex >= 0 && dateIndex < studentList.size) {
                    return studentList[dateIndex].date ?: "無上課日期"
                }
                currentPosition += studentList.size
            }
        }
        
        return "無上課日期"
    }

    private fun getPendingCountForStudent(studentName: String): String {
        val studentList = students.filter { it.name == studentName }
        val totalPending = studentList.sumOf { student ->
            val pendingValue = student.pending ?: "0"
            // 處理可能的非數字值，如"否"等
            when (pendingValue) {
                "否", "無", "" -> 0
                else -> pendingValue.toIntOrNull() ?: 0
            }
        }
        return totalPending.toString()
    }

    private fun toggleExpansion(studentName: String) {
        if (expandedStudents.contains(studentName)) {
            expandedStudents.remove(studentName)
        } else {
            expandedStudents.add(studentName)
        }
        notifyDataSetChanged()
    }

    fun updateStudents(newStudents: List<Student>) {
        students = newStudents
        expandedStudents.clear()
        notifyDataSetChanged()
    }
} 