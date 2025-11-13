/**
 * 學生ID遷移腳本
 * 為現有學生數據生成8位數字studentId
 * 
 * 使用方法：
 * node migrate-student-ids.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function migrateStudentIds() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        console.log('🔗 正在連接 MongoDB...');
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_account');
        console.log(`✅ 已連接到數據庫: ${DEFAULT_DB_NAME}`);
        
        console.log('\n📊 開始遷移學生ID...\n');
        
        // 1. 查找所有沒有studentId的學生
        const studentsWithoutId = await collection.find({
            $or: [
                { studentId: { $exists: false } },
                { studentId: null },
                { studentId: '' }
            ]
        }).toArray();
        
        console.log(`📋 找到 ${studentsWithoutId.length} 個沒有studentId的學生`);
        
        if (studentsWithoutId.length === 0) {
            console.log('✅ 所有學生都已有studentId，無需遷移');
            return;
        }
        
        // 2. 查找現有最大的studentId
        const maxStudentResult = await collection.aggregate([
            {
                $match: {
                    studentId: { $regex: /^\d{8}$/ } // 匹配8位數字
                }
            },
            {
                $project: {
                    studentId: 1,
                    number: {
                        $toInt: "$studentId"
                    }
                }
            },
            {
                $sort: { number: -1 }
            },
            {
                $limit: 1
            }
        ]).toArray();
        
        let nextNumber = 1;
        if (maxStudentResult && maxStudentResult.length > 0 && maxStudentResult[0].number) {
            nextNumber = maxStudentResult[0].number + 1;
            console.log(`📝 當前最大studentId: ${String(maxStudentResult[0].number).padStart(8, '0')}`);
        }
        
        console.log(`📝 將從 ${String(nextNumber).padStart(8, '0')} 開始生成新ID\n`);
        
        // 3. 為每個學生生成studentId
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < studentsWithoutId.length; i++) {
            const student = studentsWithoutId[i];
            const studentId = String(nextNumber).padStart(8, '0');
            
            try {
                // 檢查ID是否已存在（防止重複）
                const existingCheck = await collection.findOne({ studentId: studentId });
                if (existingCheck) {
                    console.warn(`⚠️  studentId ${studentId} 已存在，跳過並使用下一個`);
                    nextNumber++;
                    i--; // 重試當前學生
                    continue;
                }
                
                // 更新學生，添加studentId
                const result = await collection.updateOne(
                    { _id: student._id },
                    { $set: { studentId: studentId } }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`✅ [${i + 1}/${studentsWithoutId.length}] ${student.name || '無名'} (${student.phone || '無電話'}) -> studentId: ${studentId}`);
                    successCount++;
                    nextNumber++;
                } else {
                    console.warn(`⚠️  更新失敗: ${student.name || '無名'} (${student.phone || '無電話'})`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`❌ 處理學生失敗: ${student.name || '無名'} (${student.phone || '無電話'})`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n📊 遷移結果：');
        console.log(`   ✅ 成功: ${successCount} 個學生`);
        console.log(`   ❌ 失敗: ${errorCount} 個學生`);
        console.log(`   📝 最後生成的studentId: ${String(nextNumber - 1).padStart(8, '0')}`);
        
        // 4. 驗證遷移結果
        console.log('\n🔍 驗證遷移結果...');
        const remainingWithoutId = await collection.countDocuments({
            $or: [
                { studentId: { $exists: false } },
                { studentId: null },
                { studentId: '' }
            ]
        });
        
        const totalStudents = await collection.countDocuments({});
        const studentsWithId = await collection.countDocuments({
            studentId: { $regex: /^\d{8}$/ }
        });
        
        console.log(`   📊 總學生數: ${totalStudents}`);
        console.log(`   ✅ 有studentId的學生: ${studentsWithId}`);
        console.log(`   ⚠️  仍沒有studentId的學生: ${remainingWithoutId}`);
        
        if (remainingWithoutId === 0) {
            console.log('\n✅ 遷移完成！所有學生都已分配studentId');
        } else {
            console.log(`\n⚠️  仍有 ${remainingWithoutId} 個學生沒有studentId，可能需要手動處理`);
        }
        
    } catch (error) {
        console.error('❌ 遷移過程出錯:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\n🔒 MongoDB 連接已關閉');
    }
}

// 執行遷移
migrateStudentIds().catch(console.error);

























