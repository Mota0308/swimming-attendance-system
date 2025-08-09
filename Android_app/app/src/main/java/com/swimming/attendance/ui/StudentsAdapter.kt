package com.swimming.attendance.ui

import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.data.Student

/**
 * 學生列表適配器
 * 可在多個Activity中重複使用
 */
class StudentsAdapter(private var students: List<Student>) : RecyclerView.Adapter<StudentsAdapter.StudentViewHolder>() {

    class StudentViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val nameText: TextView = itemView.findViewById(android.R.id.text1)
        val detailsText: TextView = itemView.findViewById(android.R.id.text2)
    }

    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): StudentViewHolder {
        val view = LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 12, 16, 12)
            setBackgroundColor(0xFFFFFFFF.toInt())

            // 學生姓名
            val nameText = TextView(parent.context).apply {
                id = android.R.id.text1
                textSize = 16f
                setTextColor(0xFF333333.toInt())
                setPadding(0, 0, 0, 4)
            }
            addView(nameText)

            // 詳細信息
            val detailsText = TextView(parent.context).apply {
                id = android.R.id.text2
                textSize = 14f
                setTextColor(0xFF666666.toInt())
            }
            addView(detailsText)

            // 添加分隔線
            val divider = View(parent.context).apply {
                setBackgroundColor(0xFFE0E0E0.toInt())
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    2
                ).apply {
                    topMargin = 8
                }
            }
            addView(divider)
        }

        return StudentViewHolder(view)
    }

    override fun onBindViewHolder(holder: StudentViewHolder, position: Int) {
        val student = students[position]

        holder.nameText.text = "👤 ${student.name}"

        val attendanceStatus = if (student.attendance == "出席") "✅ 出席" else "❌ 缺席"
        holder.detailsText.text = """
            📱 電話: ${student.phone}
            👶 年齡: ${student.age}
            📍 地點: ${student.location}
            🏫 班級: ${student.courseType}
            ⏰ 時間: ${student.time}
            📅 日期: ${student.date}
            📋 狀態: $attendanceStatus
        """.trimIndent()

        // 根據出席狀態設置背景顏色
        val backgroundColor = if (student.attendance == "出席") 0xFFF8F9FA.toInt() else 0xFFFFF3E0.toInt()
        holder.itemView.setBackgroundColor(backgroundColor)
    }

    override fun getItemCount(): Int = students.size

    /**
     * 更新學生列表
     */
    fun updateStudents(newStudents: List<Student>) {
        students = newStudents
        notifyDataSetChanged()
    }
} 