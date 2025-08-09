package com.swimming.attendance.ui.coach

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.swimming.attendance.data.AppDatabase
import com.swimming.attendance.network.MongoDBService
import com.swimming.attendance.ui.parent.AttendanceAdapter
import com.swimming.attendance.databinding.FragmentAttendanceBinding
import kotlinx.coroutines.launch

class AttendanceFragment : Fragment() {
    private var _binding: FragmentAttendanceBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var mongoDBService: MongoDBService
    private lateinit var studentDao: com.swimming.attendance.data.StudentDao
    private lateinit var attendanceAdapter: AttendanceAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAttendanceBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        mongoDBService = MongoDBService()
        studentDao = AppDatabase.getDatabase(requireContext()).studentDao()
        
        setupRecyclerView()
        loadDataFromCloud()
    }

    private fun setupRecyclerView() {
        attendanceAdapter = AttendanceAdapter()
        binding.attendanceRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = attendanceAdapter
        }
    }

    private fun loadDataFromCloud() {
        lifecycleScope.launch {
            try {
                val students = mongoDBService.getStudents()
                // studentDao.insertStudents(students) // 暫時註釋掉
                
                // 顯示所有學生資料
                // studentDao.getAllStudents().collect { students ->
                //     attendanceAdapter.submitList(students)
                // }
            } catch (e: Exception) {
                // 處理錯誤
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 