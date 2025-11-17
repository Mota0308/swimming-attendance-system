/**
 * 移除 Student_bill 集合的 studentId 唯一索引
 * 
 * 原因：一個學生可以開多個不同的賬單，所以 studentId 不應該是唯一索引
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function removeStudentBillUniqueIndex() {
    let client;
    try {
        console.log('🔄 開始移除 Student_bill 集合的 studentId 唯一索引...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_bill');
        
        // 獲取當前索引列表
        const indexes = await collection.indexes();
        console.log('\n📋 當前索引列表:');
        indexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(唯一)' : ''}`);
        });
        
        // 查找 studentId 唯一索引
        const studentIdUniqueIndex = indexes.find(idx => 
            idx.name === 'idx_studentId_unique' || 
            (idx.key.studentId === 1 && idx.unique === true)
        );
        
        if (studentIdUniqueIndex) {
            console.log(`\n🗑️  找到唯一索引: ${studentIdUniqueIndex.name}`);
            console.log(`   索引鍵: ${JSON.stringify(studentIdUniqueIndex.key)}`);
            
            // 刪除唯一索引
            await collection.dropIndex(studentIdUniqueIndex.name);
            console.log(`✅ 已刪除唯一索引: ${studentIdUniqueIndex.name}`);
            
            // 創建非唯一索引（用於查詢性能）
            try {
                await collection.createIndex(
                    { studentId: 1 },
                    { name: 'idx_studentId', unique: false }
                );
                console.log('✅ 已創建非唯一索引: idx_studentId（用於查詢性能）');
            } catch (error) {
                if (error.code === 85) {
                    console.log('ℹ️  非唯一索引已存在，跳過');
                } else {
                    console.error('⚠️  創建非唯一索引失敗:', error.message);
                }
            }
        } else {
            console.log('\nℹ️  未找到 studentId 唯一索引，可能已經被刪除');
        }
        
        // 顯示最終索引列表
        const finalIndexes = await collection.indexes();
        console.log('\n📋 最終索引列表:');
        finalIndexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(唯一)' : ''}`);
        });
        
        console.log('\n✅ 索引更新完成！');
        
    } catch (error) {
        console.error('❌ 移除索引失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ MongoDB 連接已關閉');
        }
    }
}

// 運行函數
if (require.main === module) {
    removeStudentBillUniqueIndex()
        .then(() => {
            console.log('\n✅ 完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 失敗:', error);
            process.exit(1);
        });
}

module.exports = { removeStudentBillUniqueIndex };



