/**
 * 移除 Student_account 集合中 phone 字段的唯一性约束
 * 允许 phone 字段重复
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function removePhoneUniqueIndex() {
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
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}, unique: ${idx.unique || false}, sparse: ${idx.sparse || false}`);
        });
        
        // 查找所有與 phone 相關的索引
        const phoneIndexes = indexes.filter(idx => 
            idx.key && (idx.key.phone === 1 || idx.key.studentPhone === 1)
        );
        
        if (phoneIndexes.length === 0) {
            console.log('\n✅ 未找到 phone 相關索引');
        } else {
            console.log('\n🔍 找到以下 phone 相關索引:');
            phoneIndexes.forEach(idx => {
                console.log(`  - ${idx.name}: unique=${idx.unique || false}, sparse=${idx.sparse || false}`);
            });
            
            // 刪除所有 phone 相關的唯一索引
            for (const idx of phoneIndexes) {
                if (idx.unique === true) {
                    console.log(`\n⚠️  正在刪除唯一索引: ${idx.name}...`);
                    try {
                        await collection.dropIndex(idx.name);
                        console.log(`   ✅ 已刪除唯一索引: ${idx.name}`);
                    } catch (error) {
                        console.error(`   ❌ 刪除索引失敗: ${error.message}`);
                    }
                }
            }
        }
        
        // 檢查是否已存在非唯一索引
        const nonUniquePhoneIndex = indexes.find(idx => 
            idx.key && idx.key.phone === 1 && idx.unique !== true
        );
        
        if (!nonUniquePhoneIndex) {
            console.log('\n📝 創建非唯一 phone 索引...');
            try {
                await collection.createIndex(
                    { phone: 1 },
                    { name: 'idx_phone', unique: false, sparse: true }
                );
                console.log('   ✅ phone 非唯一索引已創建（稀疏索引，允許null和重複值）');
            } catch (error) {
                if (error.code === 85 || error.message.includes('already exists')) {
                    console.log('   ℹ️  phone 索引已存在');
                } else {
                    console.error('   ❌ 創建 phone 索引失敗:', error.message);
                    throw error;
                }
            }
        } else {
            console.log('\n✅ phone 非唯一索引已存在，無需創建');
        }
        
        // 最終索引列表
        console.log('\n📋 最終索引列表:');
        const finalIndexes = await collection.indexes();
        finalIndexes.forEach(idx => {
            const isPhone = idx.key && (idx.key.phone === 1 || idx.key.studentPhone === 1);
            const marker = isPhone ? '📱' : '  ';
            console.log(`${marker} - ${idx.name}: ${JSON.stringify(idx.key)}, unique: ${idx.unique || false}, sparse: ${idx.sparse || false}`);
        });
        
        // 驗證：檢查是否有重複的 phone 值
        console.log('\n🔍 驗證：檢查數據中是否有重複的 phone 值...');
        const duplicatePhones = await collection.aggregate([
            { $match: { phone: { $ne: null, $exists: true } } },
            { $group: { _id: '$phone', count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();
        
        if (duplicatePhones.length > 0) {
            console.log(`   ✅ 發現 ${duplicatePhones.length} 個重複的 phone 值（這是正常的，因為現在允許重複）:`);
            duplicatePhones.forEach(item => {
                console.log(`      - phone: ${item._id}, 出現次數: ${item.count}`);
            });
        } else {
            console.log('   ℹ️  當前數據中沒有重複的 phone 值');
        }
        
        console.log('\n✅ 索引修復完成！phone 字段現在可以重複了。');
        
    } catch (error) {
        console.error('❌ 修復過程出錯:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\n🔒 MongoDB 連接已關閉');
    }
}

// 執行修復
removePhoneUniqueIndex().catch(console.error);

