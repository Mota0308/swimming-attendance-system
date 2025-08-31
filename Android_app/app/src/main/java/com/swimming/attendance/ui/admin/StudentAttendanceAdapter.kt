package com.swimming.attendance.ui.admin

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.R
import com.swimming.attendance.data.Student

class StudentAttendanceAdapter(
    private var students: List<Student>,
    private val onOptionChanged: (Student, String, String) -> Unit
) : RecyclerView.Adapter<StudentAttendanceAdapter.StudentViewHolder>() {

    class StudentViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val nameText: TextView = itemView.findViewById(R.id.studentNameText)
        val attendanceSpinner: Spinner = itemView.findViewById(R.id.attendanceSpinner)
        val makeupSpinner: Spinner = itemView.findViewById(R.id.makeupSpinner)
        val pointsEdit: EditText = itemView.findViewById(R.id.pointsEdit)
        val timeText: TextView = itemView.findViewById(R.id.timeText)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StudentViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_student_attendance, parent, false)
        return StudentViewHolder(view)
    }

    override fun onBindViewHolder(holder: StudentViewHolder, position: Int) {
        val student = students[position]
        
        // 設置基本信息
        holder.nameText.text = student.name ?: ""
        holder.timeText.text = student.time ?: ""
        holder.pointsEdit.setText(student.option3 ?: "")
        
        // 設置出席狀況下拉選單
        val attendanceOptions = arrayOf("--", "1", "1.5", "2", "2.5", "3", "缺席")
        val attendanceAdapter = ArrayAdapter(holder.itemView.context, android.R.layout.simple_spinner_item, attendanceOptions)
        attendanceAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        holder.attendanceSpinner.adapter = attendanceAdapter
        
        // 設置當前選中的出席狀況
        val attendancePosition = attendanceOptions.indexOf(student.option1 ?: "--")
        if (attendancePosition != -1) {
            holder.attendanceSpinner.setSelection(attendancePosition)
        } else {
            holder.attendanceSpinner.setSelection(0) // 默認選擇"--"
        }
        
        // 設置補/調堂下拉選單
        val makeupOptions = arrayOf("--", "🌟0.5", "🌟1", "🌟1.5", "🔁0.5", "🔁1", "🔁1.5")
        val makeupAdapter = ArrayAdapter(holder.itemView.context, android.R.layout.simple_spinner_item, makeupOptions)
        makeupAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        holder.makeupSpinner.adapter = makeupAdapter
        
        // 設置當前選中的補/調堂
        val makeupPosition = makeupOptions.indexOf(student.option2 ?: "--")
        if (makeupPosition != -1) {
            holder.makeupSpinner.setSelection(makeupPosition)
        } else {
            holder.makeupSpinner.setSelection(0) // 默認選擇"--"
        }
        
        // 記錄綁定日誌
        android.util.Log.d("StudentAttendanceAdapter", "📱 綁定學生數據: ${student.name}, option1=${student.option1}, option2=${student.option2}")
        
        // 設置出席狀況變更監聽器
        holder.attendanceSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selectedOption = attendanceOptions[position]
                android.util.Log.d("StudentAttendanceAdapter", "出席狀況選擇: $selectedOption, 當前值: ${student.option1}")
                if (selectedOption != "--" && selectedOption != student.option1) {
                    android.util.Log.d("StudentAttendanceAdapter", "觸發出席狀況變更: $selectedOption")
                    try {
                        onOptionChanged(student, selectedOption, "option1")
                        android.util.Log.d("StudentAttendanceAdapter", "✅ 出席狀況變更回調已觸發")
                    } catch (e: Exception) {
                        android.util.Log.e("StudentAttendanceAdapter", "❌ 出席狀況變更回調失敗", e)
                    }
                }
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        
        // 設置補/調堂變更監聽器
        holder.makeupSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selectedOption = makeupOptions[position]
                android.util.Log.d("StudentAttendanceAdapter", "補/調堂選擇: $selectedOption, 當前值: ${student.option2}")
                if (selectedOption != "--" && selectedOption != student.option2) {
                    android.util.Log.d("StudentAttendanceAdapter", "觸發補/調堂變更: $selectedOption")
                    try {
                        onOptionChanged(student, selectedOption, "option2")
                        android.util.Log.d("StudentAttendanceAdapter", "✅ 補/調堂變更回調已觸發")
                    } catch (e: Exception) {
                        android.util.Log.e("StudentAttendanceAdapter", "❌ 補/調堂變更回調失敗", e)
                    }
                }
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    override fun getItemCount(): Int = students.size

    // 更新特定學生的數據而不重新加載整個列表
    fun updateStudent(student: Student) {
        val index = students.indexOfFirst { 
            it.name == student.name && it.date == student.date && it.location == student.location 
        }
        if (index != -1) {
            // 更新本地數據
            students = students.toMutableList().apply {
                this[index] = student
            }
            // 通知特定項目已更改，但不重新綁定ViewHolder
            notifyItemChanged(index)
            
            // 強制更新UI顯示
            android.util.Log.d("StudentAttendanceAdapter", "🔄 更新學生數據: ${student.name}, option1=${student.option1}, option2=${student.option2}")
        } else {
            android.util.Log.e("StudentAttendanceAdapter", "❌ 未找到學生索引: ${student.name}")
        }
    }

    fun updateStudents(newStudents: List<Student>) {
        students = newStudents
        notifyDataSetChanged()
    }
} 