package com.swimming.attendance.data

import android.content.Context

// 簡化版本的數據庫類，暫時不使用Room
class AppDatabase {
    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = AppDatabase()
                INSTANCE = instance
                instance
            }
        }
    }

    fun studentDao(): StudentDao {
        return StudentDao()
    }

    fun userAccountDao(): UserAccountDao {
        return UserAccountDao()
    }
}