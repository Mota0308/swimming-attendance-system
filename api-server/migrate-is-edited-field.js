/**
 * 數據庫遷移腳本：為 students_timeslot 集合添加 isEdited 字段
 * 
 * isEdited 字段計算邏輯：
 * - 在 isChangeDate、isChangeTime、isChangeLocation 都為 false 情況下，isEdited 為 false
 * - 如果其中任何一個為 true，則 isEdited 為 true
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB 連接字符串（從環境變量或默認值獲取）
const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function migrateIsEditedField() {
    let client;
    
    try {
        console.log('🔄 開始遷移 isEdited 字段...');
        
        // 連接 MongoDB
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        console.log('✅ 已連接到 MongoDB');
        
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // 獲取所有記錄
        const records = await collection.find({}).toArray();
        console.log(`📊 找到 ${records.length} 條記錄需要處理`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        // 批量更新
        const bulkOps = [];
        
        for (const record of records) {
            // ✅ 計算 isEdited：在isChangeDate，isChangeTime，isChangeLocation都為false情況下，isEdited為false
            const isChangeDate = record.isChangeDate || false;
            const isChangeTime = record.isChangeTime || false;
            const isChangeLocation = record.isChangeLocation || false;
            const isEdited = isChangeDate || isChangeTime || isChangeLocation;
            
            // 檢查是否需要更新（如果字段已存在且值正確，則跳過）
            if (record.isEdited !== undefined && record.isEdited === isEdited) {
                skippedCount++;
                continue;
            }
            
            // 添加到批量操作
            bulkOps.push({
                updateOne: {
                    filter: { _id: record._id },
                    update: {
                        $set: {
                            isEdited: isEdited
                        }
                    }
                }
            });
        }
        
        // 執行批量更新
        if (bulkOps.length > 0) {
            console.log(`📝 準備更新 ${bulkOps.length} 條記錄...`);
            const result = await collection.bulkWrite(bulkOps, { ordered: false });
            updatedCount = result.modifiedCount;
            console.log(`✅ 成功更新 ${updatedCount} 條記錄`);
        }
        
        console.log(`📊 遷移完成：`);
        console.log(`   - 更新記錄數：${updatedCount}`);
        console.log(`   - 跳過記錄數：${skippedCount}（已存在且值正確）`);
        console.log(`   - 總記錄數：${records.length}`);
        
    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('✅ 已關閉 MongoDB 連接');
        }
    }
}

// 如果直接運行此腳本
if (require.main === module) {
    migrateIsEditedField()
        .then(() => {
            console.log('✅ 遷移完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 遷移失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateIsEditedField };

