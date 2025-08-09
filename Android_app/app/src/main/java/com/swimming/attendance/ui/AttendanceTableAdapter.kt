package com.swimming.attendance.ui

import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.data.Student

/**
 * 學生出席記錄表格適配器
 * 顯示詳細的學生資料和出席統計
 */
class AttendanceTableAdapter(private var students: List<Student>) : RecyclerView.Adapter<AttendanceTableAdapter.StudentViewHolder>() {

    class StudentViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val nameText: TextView = itemView.findViewById(android.R.id.text1)
        val ageText: TextView = itemView.findViewById(android.R.id.text2)
        val phoneText: TextView = itemView.findViewById(1001)
        val pointsText: TextView = itemView.findViewById(1002)
        val classesText: TextView = itemView.findViewById(1003)
        val pendingText: TextView = itemView.findViewById(1004)
        val appointedText: TextView = itemView.findViewById(1005)
        val attendedText: TextView = itemView.findViewById(1006)
        val remainingClassesText: TextView = itemView.findViewById(1007)
        val remainingPointsText: TextView = itemView.findViewById(1008)
    }

    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): StudentViewHolder {
        val view = LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(8, 8, 8, 8)
            setBackgroundColor(0xFFFFFFFF.toInt())

            // 學生姓名
            val nameText = TextView(parent.context).apply {
                id = android.R.id.text1
                textSize = 14f
                setTextColor(0xFF333333.toInt())
                setPadding(4, 2, 4, 2)
            }
            addView(nameText)

            // 學生年齡
            val ageText = TextView(parent.context).apply {
                id = android.R.id.text2
                textSize = 12f
                setTextColor(0xFF666666.toInt())
                setPadding(4, 2, 4, 2)
            }
            addView(ageText)

            // 電話號碼
            val phoneText = TextView(parent.context).apply {
                id = 1001
                textSize = 12f
                setTextColor(0xFF666666.toInt())
                setPadding(4, 2, 4, 2)
            }
            addView(phoneText)

            // 已購買點數
            val pointsText = TextView(parent.context).apply {
                id = 1002
                textSize = 12f
                setTextColor(0xFFE74C3C.toInt()) // 紅色
                setPadding(4, 2, 4, 2)
            }
            addView(pointsText)

            // 已購買堂數
            val classesText = TextView(parent.context).apply {
                id = 1003
                textSize = 12f
                setTextColor(0xFFE74C3C.toInt()) // 紅色
                setPadding(4, 2, 4, 2)
            }
            addView(classesText)

            // 待約堂數
            val pendingText = TextView(parent.context).apply {
                id = 1004
                textSize = 12f
                setTextColor(0xFF666666.toInt())
                setPadding(4, 2, 4, 2)
            }
            addView(pendingText)

            // 已約堂數
            val appointedText = TextView(parent.context).apply {
                id = 1005
                textSize = 12f
                setTextColor(0xFF666666.toInt())
                setPadding(4, 2, 4, 2)
            }
            addView(appointedText)

            // 已出席堂數
            val attendedText = TextView(parent.context).apply {
                id = 1006
                textSize = 12f
                setTextColor(0xFF666666.toInt())
                setPadding(4, 2, 4, 2)
            }
            addView(attendedText)

            // 剩餘堂數
            val remainingClassesText = TextView(parent.context).apply {
                id = 1007
                textSize = 12f
                setTextColor(0xFFE74C3C.toInt()) // 紅色
                setPadding(4, 2, 4, 2)
            }
            addView(remainingClassesText)

            // 剩餘點數
            val remainingPointsText = TextView(parent.context).apply {
                id = 1008
                textSize = 12f
                setTextColor(0xFFE74C3C.toInt()) // 紅色
                setPadding(4, 2, 4, 2)
            }
            addView(remainingPointsText)

            // 添加分隔線
            val divider = View(parent.context).apply {
                setBackgroundColor(0xFFE0E0E0.toInt())
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    1
                ).apply {
                    topMargin = 4
                }
            }
            addView(divider)
        }

        return StudentViewHolder(view)
    }

    override fun onBindViewHolder(holder: StudentViewHolder, position: Int) {
        val student = students[position]

        // 計算統計數據（這裡使用模擬數據，實際應該從數據庫獲取）
        val purchasedPoints = student.option3?.toIntOrNull() ?: 0
        val purchasedClasses = 1
        val pendingClasses = 0
        val appointedClasses = 0
        val attendedClasses = 0
        val remainingClasses = purchasedClasses - attendedClasses
        val remainingPoints = purchasedPoints - attendedClasses

        holder.nameText.text = "學生姓名: ${student.name}"
        holder.ageText.text = "學生年齡: ${student.age}"
        holder.phoneText.text = "電話號碼: ${student.phone}"
        holder.pointsText.text = "已購買點數: $purchasedPoints"
        holder.classesText.text = "已購買堂數: $purchasedClasses"
        holder.pendingText.text = "待約堂數: $pendingClasses"
        holder.appointedText.text = "已約堂數: $appointedClasses"
        holder.attendedText.text = "已出席堂數: $attendedClasses"
        holder.remainingClassesText.text = "剩餘堂數: $remainingClasses"
        holder.remainingPointsText.text = "剩餘點數: $remainingPoints"

        // 設置背景顏色
        holder.itemView.setBackgroundColor(0xFFF8F9FA.toInt())
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
 