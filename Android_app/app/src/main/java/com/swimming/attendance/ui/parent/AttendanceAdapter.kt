package com.swimming.attendance.ui.parent

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.swimming.attendance.data.Student
import com.swimming.attendance.databinding.ItemAttendanceBinding

class AttendanceAdapter : ListAdapter<Student, AttendanceAdapter.ViewHolder>(StudentDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAttendanceBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class ViewHolder(private val binding: ItemAttendanceBinding) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(student: Student) {
            binding.apply {
                studentNameTextView.text = student.name
                studentPhoneTextView.text = student.phone
                studentAgeTextView.text = student.age
                locationTextView.text = student.location
                courseTypeTextView.text = student.courseType
                timeTextView.text = student.time
                dateTextView.text = student.date
                attendanceTextView.text = student.attendance
                noteTextView.text = student.note
                option3TextView.text = student.option3
            }
        }
    }

    private class StudentDiffCallback : DiffUtil.ItemCallback<Student>() {
        override fun areItemsTheSame(oldItem: Student, newItem: Student): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Student, newItem: Student): Boolean {
            return oldItem == newItem
        }
    }
} 