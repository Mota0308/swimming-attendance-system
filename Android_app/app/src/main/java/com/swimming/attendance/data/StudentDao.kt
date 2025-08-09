package com.swimming.attendance.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf

// 簡化版本的StudentDao，暫時不使用Room
class StudentDao {
    fun getAllStudents(): Flow<List<Student>> {
        return flowOf(emptyList())
    }

    fun getStudentsByFilter(date: String, location: String, courseType: String, time: String): Flow<List<Student>> {
        return flowOf(emptyList())
    }

    fun getAllDates(): Flow<List<String>> {
        return flowOf(emptyList())
    }

    fun getAllLocations(): Flow<List<String>> {
        return flowOf(emptyList())
    }

    fun getAllCourseTypes(): Flow<List<String>> {
        return flowOf(emptyList())
    }

    fun getAllTimes(): Flow<List<String>> {
        return flowOf(emptyList())
    }

    suspend fun insertStudent(student: Student) {
        // 暫時不實現
    }

    suspend fun insertStudents(students: List<Student>) {
        // 暫時不實現
    }

    suspend fun updateStudent(student: Student) {
        // 暫時不實現
    }

    suspend fun deleteStudent(student: Student) {
        // 暫時不實現
    }

    suspend fun deleteAllStudents() {
        // 暫時不實現
    }
} 