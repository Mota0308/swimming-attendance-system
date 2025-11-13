/**
 * 驗證索引配置腳本
 * 確保 studentId 作為唯一索引，studentPhone 不是唯一索引
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function verifyIndexes() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        console.log('🔗 正在連接 MongoDB...');
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        console.log(`✅ 已連接到數據庫: ${DEFAULT_DB_NAME}\n`);
        
        // 檢查 Student_account 集合索引
        console.log('📊 Student_account 集合索引：');
        const studentAccountIndexes = await db.collection('Student_account').indexes();
        studentAccountIndexes.forEach(idx => {
            const isUnique = idx.unique ? '✅ 唯一' : '❌ 非唯一';
            const isSparse = idx.sparse ? '（稀疏）' : '';
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} - ${isUnique}${isSparse}`);
            
            // 驗證 studentId 是唯一索引
            if (idx.key.studentId === 1) {
                if (idx.unique) {
                    console.log(`    ✅ studentId 是唯一索引（正確）`);
                } else {
                    console.log(`    ❌ studentId 不是唯一索引（錯誤！需要修復）`);
                }
            }
            
            // 驗證沒有 studentPhone 唯一索引
            if (idx.key.studentPhone === 1 && idx.unique) {
                console.log(`    ❌ 發現 studentPhone 唯一索引（錯誤！需要刪除）`);
            }
        });
        
        // 檢查 students_timeslot 集合索引
        console.log('\n📊 students_timeslot 集合索引：');
        const timeslotIndexes = await db.collection('students_timeslot').indexes();
        timeslotIndexes.forEach(idx => {
            const isUnique = idx.unique ? '✅ 唯一' : '❌ 非唯一';
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} - ${isUnique}`);
            
            // 驗證 studentId 不是唯一索引（因為一個學生可以有多條記錄）
            if (idx.key.studentId === 1 && Object.keys(idx.key).length === 1) {
                if (!idx.unique) {
                    console.log(`    ✅ studentId 索引不是唯一索引（正確，一個學生可有多條記錄）`);
                } else {
                    console.log(`    ❌ studentId 索引是唯一索引（錯誤！一個學生應該可以有多條記錄）`);
                }
            }
            
            // 驗證沒有 studentPhone 唯一索引
            if (idx.key.studentPhone === 1 && idx.unique) {
                console.log(`    ❌ 發現 studentPhone 唯一索引（錯誤！需要刪除）`);
            }
        });
        
        console.log('\n✅ 索引驗證完成！');
        
    } catch (error) {
        console.error('❌ 驗證過程出錯:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\n🔒 MongoDB 連接已關閉');
    }
}

// 執行驗證
verifyIndexes().catch(console.error);








