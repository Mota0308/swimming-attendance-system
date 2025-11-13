/**
 * 修復 studentPhone 索引問題
 * 刪除或修改 studentPhone_1 唯一索引，因為它不允許多個 null 值
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function fixStudentPhoneIndex() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        console.log('🔗 正在連接 MongoDB...');
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_account');
        console.log(`✅ 已連接到數據庫: ${DEFAULT_DB_NAME}`);
        
        console.log('\n📊 檢查現有索引...\n');
        
        // 獲取所有索引
        const indexes = await collection.indexes();
        console.log('當前索引列表:');
        indexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        
        // 查找 studentPhone_1 索引
        const studentPhoneIndex = indexes.find(idx => idx.name === 'studentPhone_1');
        
        if (studentPhoneIndex) {
            console.log('\n⚠️  找到 studentPhone_1 索引，正在刪除...');
            
            try {
                await collection.dropIndex('studentPhone_1');
                console.log('✅ studentPhone_1 索引已刪除');
            } catch (error) {
                console.error('❌ 刪除索引失敗:', error.message);
            }
        } else {
            console.log('\n✅ 未找到 studentPhone_1 索引，無需修復');
        }
        
        // 檢查並修復 phone 索引
        const phoneIndex = indexes.find(idx => idx.name === 'idx_phone' || (idx.key && idx.key.phone === 1));
        
        console.log('\n📝 檢查 phone 索引...');
        
        // 如果 phone 索引存在但不是稀疏索引，需要重新創建
        if (phoneIndex) {
            const isSparse = phoneIndex.sparse === true;
            console.log(`   當前索引: ${phoneIndex.name}, sparse: ${isSparse}`);
            
            if (!isSparse) {
                console.log('   ⚠️  phone 索引不是稀疏索引，需要重新創建...');
                try {
                    await collection.dropIndex(phoneIndex.name);
                    console.log(`   ✅ 已刪除舊索引: ${phoneIndex.name}`);
                } catch (error) {
                    console.warn(`   ⚠️  刪除舊索引失敗: ${error.message}`);
                }
            } else {
                console.log('   ✅ phone 索引已是稀疏索引');
            }
        }
        
        // 創建或重新創建 phone 索引（稀疏索引，允許 null）
        try {
            await collection.createIndex(
                { phone: 1 },
                { name: 'idx_phone', unique: true, sparse: true }
            );
            console.log('   ✅ phone 唯一索引已創建/更新（稀疏索引，允許null）');
        } catch (error) {
            if (error.code === 85 || error.message.includes('already exists')) {
                console.log('   ℹ️  phone 索引已存在且正確配置');
            } else {
                console.error('   ❌ 創建 phone 索引失敗:', error.message);
            }
        }
        
        // 檢查數據中是否有 phone 為 null 的記錄
        const nullPhoneCount = await collection.countDocuments({ phone: null });
        if (nullPhoneCount > 0) {
            console.log(`\n⚠️  發現 ${nullPhoneCount} 條 phone 為 null 的記錄`);
            console.log('   建議：為這些記錄添加有效的 phone 值');
        }
        
        // 最終索引列表
        console.log('\n📋 最終索引列表:');
        const finalIndexes = await collection.indexes();
        finalIndexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        
        console.log('\n✅ 索引修復完成！');
        
    } catch (error) {
        console.error('❌ 修復過程出錯:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\n🔒 MongoDB 連接已關閉');
    }
}

// 執行修復
fixStudentPhoneIndex().catch(console.error);


























