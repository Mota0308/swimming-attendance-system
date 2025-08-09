package com.swimming.attendance.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.R
import com.swimming.attendance.data.Student

class CoachStudentsAdapter(
    private val students: List<Student>,
    private val onOptionChanged: (Student, String, String) -> Unit
) : RecyclerView.Adapter<CoachStudentsAdapter.StudentViewHolder>() {

    class StudentViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val locationText: TextView = itemView.findViewById(R.id.locationText)
        val dateText: TextView = itemView.findViewById(R.id.dateText)
        val timeText: TextView = itemView.findViewById(R.id.timeText)
        val nameText: TextView = itemView.findViewById(R.id.nameText)
        val ageText: TextView = itemView.findViewById(R.id.ageText)
        val typeText: TextView = itemView.findViewById(R.id.typeText)
        val option1Spinner: Spinner = itemView.findViewById(R.id.option1Spinner)
        val option2Spinner: Spinner = itemView.findViewById(R.id.option2Spinner)
        val totalPointsText: TextView = itemView.findViewById(R.id.totalPointsText)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StudentViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_coach_student, parent, false)
        return StudentViewHolder(view)
    }

    override fun onBindViewHolder(holder: StudentViewHolder, position: Int) {
        val student = students[position]
        
        // 設置基本信息
        holder.locationText.text = "📍 ${student.location ?: "未知地點"}"
        holder.dateText.text = "📅 ${student.date ?: ""}"
        holder.timeText.text = "⏰ ${student.time ?: ""}"
        holder.nameText.text = "👤 ${student.name ?: ""}"
        holder.ageText.text = "🎂 ${student.age ?: ""}"
        holder.typeText.text = "🏊 ${student.type ?: ""}"
        holder.totalPointsText.text = "💎 ${student.totalPoints ?: "0"} 點"
        
        // 設置option1下拉選單（出席狀況）
        val option1Items = arrayOf("--", "出席1", "出席1.5", "出席2", "出席2.5", "出席3", "缺席")
        val option1Adapter = ArrayAdapter(holder.itemView.context, android.R.layout.simple_spinner_item, option1Items)
        option1Adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        holder.option1Spinner.adapter = option1Adapter
        
        // 設置當前選中的option1值
        val option1Position = option1Items.indexOf(student.option1 ?: "--")
        if (option1Position != -1) {
            holder.option1Spinner.setSelection(option1Position)
        }
        
        // 設置option2下拉選單（補/調堂）
        val option2Items = arrayOf("--", "🌟補0.5堂", "🌟補1堂", "🌟補1.5堂", "🔁補1堂", "🔁補1.5堂")
        val option2Adapter = ArrayAdapter(holder.itemView.context, android.R.layout.simple_spinner_item, option2Items)
        option2Adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        holder.option2Spinner.adapter = option2Adapter
        
        // 設置當前選中的option2值
        val option2Position = option2Items.indexOf(student.option2 ?: "--")
        if (option2Position != -1) {
            holder.option2Spinner.setSelection(option2Position)
        }
        
        // 設置option1變更監聽器
        holder.option1Spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selectedOption1 = option1Items[position]
                val currentOption2 = holder.option2Spinner.selectedItem.toString()
                
                // 如果選擇的不是"--"，則觸發更新
                if (selectedOption1 != "--" && selectedOption1 != student.option1) {
                    onOptionChanged(student, selectedOption1, currentOption2)
                }
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        
        // 設置option2變更監聽器
        holder.option2Spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selectedOption2 = option2Items[position]
                val currentOption1 = holder.option1Spinner.selectedItem.toString()
                
                // 如果選擇的不是"--"，則觸發更新
                if (selectedOption2 != "--" && selectedOption2 != student.option2) {
                    onOptionChanged(student, currentOption1, selectedOption2)
                }
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    override fun getItemCount(): Int = students.size
} 
 