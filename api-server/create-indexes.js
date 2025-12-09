/**
 * 數據庫索引創建腳本
 * 用於優化查詢性能
 * 
 * 使用方法：
 * node create-indexes.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function createIndexes() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        console.log('🔗 正在連接 MongoDB...');
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        console.log(`✅ 已連接到數據庫: ${DEFAULT_DB_NAME}`);
        
        console.log('\n📊 開始創建索引...\n');
        
        // 1. Admin_account 集合索引
        console.log('1. 創建 Admin_account 索引...');
        try {
            await db.collection('Admin_account').createIndex(
                { phone: 1, password: 1, type: 1 },
                { name: 'idx_phone_password_type' }
            );
            console.log('   ✅ phone + password + type 索引已創建');
        } catch (error) {
            if (error.code === 85) {
                console.log('   ℹ️  索引已存在，跳過');
            } else {
                console.error('   ❌ 創建索引失敗:', error.message);
            }
        }
        
        // 2. Staff_work_hours 集合索引
        console.log('2. 創建 Staff_work_hours 索引...');
        const workHoursIndexes = [
            { employeeId: 1, year: 1, month: 1 },
            { employeeId: 1, location: 1, club: 1, workDate: 1 },
            { employeeId: 1, editorType: 1, year: 1, month: 1 }
        ];
        
        for (const index of workHoursIndexes) {
            try {
                await db.collection('Staff_work_hours').createIndex(
                    index,
                    { name: `idx_${Object.keys(index).join('_')}` }
                );
                console.log(`   ✅ ${Object.keys(index).join(' + ')} 索引已創建`);
            } catch (error) {
                if (error.code === 85) {
                    console.log(`   ℹ️  ${Object.keys(index).join(' + ')} 索引已存在，跳過`);
                } else {
                    console.error(`   ❌ 創建索引失敗:`, error.message);
                }
            }
        }
        
        // 3. Coach_roster 集合索引
        console.log('3. 創建 Coach_roster 索引...');
        try {
            await db.collection('Coach_roster').createIndex(
                { phone: 1, date: 1 },
                { name: 'idx_phone_date' }
            );
            console.log('   ✅ phone + date 索引已創建');
            
            await db.collection('Coach_roster').createIndex(
                { date: 1 },
                { name: 'idx_date' }
            );
            console.log('   ✅ date 索引已創建');
        } catch (error) {
            if (error.code === 85) {
                console.log('   ℹ️  索引已存在，跳過');
            } else {
                console.error('   ❌ 創建索引失敗:', error.message);
            }
        }
        
        // 4. Student_account 集合索引
        console.log('4. 創建 Student_account 索引...');
        try {
            // ✅ 刪除可能存在的舊 studentPhone_1 索引和唯一索引
            try {
                await db.collection('Student_account').dropIndex('studentPhone_1').catch(() => {});
            } catch (e) {
                // 索引不存在，忽略錯誤
            }
            try {
                await db.collection('Student_account').dropIndex('idx_phone').catch(() => {});
            } catch (e) {
                // 索引不存在，忽略錯誤
            }
            
            // ✅ 創建非唯一索引（允許phone重複）
            await db.collection('Student_account').createIndex(
                { phone: 1 },
                { name: 'idx_phone', unique: false, sparse: true }
            );
            console.log('   ✅ phone 非唯一索引已創建（稀疏索引，允許null和重複值）');
            
            await db.collection('Student_account').createIndex(
                { studentId: 1 },
                { name: 'idx_studentId', unique: true, sparse: true }
            );
            console.log('   ✅ studentId 唯一索引已創建（稀疏索引，允許null）');
            
            await db.collection('Student_account').createIndex(
                { name: 1 },
                { name: 'idx_name' }
            );
            console.log('   ✅ name 索引已創建');
        } catch (error) {
            if (error.code === 85) {
                console.log('   ℹ️  索引已存在，跳過');
            } else {
                console.error('   ❌ 創建索引失敗:', error.message);
            }
        }
        
        // 5. students_timeslot 集合索引
        console.log('5. 創建 students_timeslot 索引...');
        try {
            // ✅ 刪除可能存在的 studentPhone 唯一索引
            try {
                await db.collection('students_timeslot').dropIndex('studentPhone_1').catch(() => {});
            } catch (e) {
                // 索引不存在，忽略錯誤
            }
            
            // ✅ studentId 作為主要索引（非唯一，因為一個學生可以有多條記錄）
            await db.collection('students_timeslot').createIndex(
                { studentId: 1 },
                { name: 'idx_studentId' }
            );
            console.log('   ✅ studentId 索引已創建（非唯一，一個學生可有多條記錄）');
            
            // ✅ studentId + classDate 複合索引（用於快速查詢特定學生的特定日期記錄）
            await db.collection('students_timeslot').createIndex(
                { studentId: 1, classDate: 1 },
                { name: 'idx_studentId_classDate' }
            );
            console.log('   ✅ studentId + classDate 複合索引已創建');
            
            // ✅ studentPhone + classDate 複合索引（非唯一，用於通過電話查詢）
            await db.collection('students_timeslot').createIndex(
                { studentPhone: 1, classDate: 1 },
                { name: 'idx_studentPhone_classDate' }
            );
            console.log('   ✅ studentPhone + classDate 複合索引已創建（非唯一）');
            
            await db.collection('students_timeslot').createIndex(
                { classDate: 1, location: 1 },
                { name: 'idx_classDate_location' }
            );
            console.log('   ✅ classDate + location 索引已創建');
        } catch (error) {
            if (error.code === 85) {
                console.log('   ℹ️  索引已存在，跳過');
            } else {
                console.error('   ❌ 創建索引失敗:', error.message);
            }
        }
        
        // 6. Pricing 集合索引
        console.log('6. 創建 Pricing 索引...');
        try {
            await db.collection('Pricing').createIndex(
                { class_type: 1, class_format: 1, instructor_level: 1 },
                { unique: true, name: 'idx_pricing_unique' }
            );
            console.log('   ✅ class_type + class_format + instructor_level 唯一索引已創建');
        } catch (error) {
            if (error.code === 85) {
                console.log('   ℹ️  索引已存在，跳過');
            } else {
                console.error('   ❌ 創建索引失敗:', error.message);
            }
        }
        
        // 7. trial_bill 集合索引
        console.log('7. 創建 trial_bill 索引...');
        try {
            await db.collection('trial_bill').createIndex(
                { trailId: 1 },
                { unique: true, name: 'idx_trailId_unique' }
            );
            console.log('   ✅ trailId 唯一索引已創建');
        } catch (error) {
            if (error.code === 85) {
                console.log('   ℹ️  索引已存在，跳過');
            } else {
                console.error('   ❌ 創建索引失敗:', error.message);
            }
        }
        
        // 8. Student_bill 集合索引
        console.log('8. 創建 Student_bill 索引...');
        try {
            // ✅ 創建非唯一索引（一個學生可以有多個賬單）
            await db.collection('Student_bill').createIndex(
                { studentId: 1 },
                { unique: false, name: 'idx_studentId' }
            );
            console.log('   ✅ studentId 非唯一索引已創建（允許一個學生有多個賬單）');
        } catch (error) {
            if (error.code === 85) {
                console.log('   ℹ️  索引已存在，跳過');
            } else {
                console.error('   ❌ 創建索引失敗:', error.message);
            }
        }
        
        console.log('\n✅ 所有索引創建完成！\n');
        
        // 顯示索引列表
        console.log('📋 當前索引列表：\n');
        const collections = ['Admin_account', 'Staff_work_hours', 'Coach_roster', 'Student_account', 'students_timeslot', 'Pricing', 'trial_bill', 'Student_bill'];
        
        for (const collectionName of collections) {
            try {
                const indexes = await db.collection(collectionName).indexes();
                console.log(`${collectionName}:`);
                indexes.forEach(idx => {
                    const keys = Object.keys(idx.key).join(' + ');
                    console.log(`  - ${idx.name}: ${keys}`);
                });
                console.log('');
            } catch (error) {
                console.log(`${collectionName}: 無法獲取索引列表`);
            }
        }
        
    } catch (error) {
        console.error('❌ 創建索引過程出錯:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔒 MongoDB 連接已關閉');
    }
}

// 執行索引創建
createIndexes().catch(console.error);

