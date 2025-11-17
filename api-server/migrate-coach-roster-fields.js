/**
 * 數據庫遷移腳本：確保 Coach_roster 集合記錄包含必要字段
 * 
 * 添加的字段：
 * - slot: 時段（1=上午，2=中午，3=下午），如果不存在則默認為1
 * - unavailable: 請假標記，如果不存在則默認為false
 * - isSubmitted: 提交狀態，如果不存在則默認為false
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB 連接字符串（從環境變量或默認值獲取）
const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function migrateCoachRosterFields() {
    let client;
    
    try {
        console.log('🔄 開始遷移 Coach_roster 字段...');
        
        // 連接 MongoDB
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        console.log('✅ 已連接到 MongoDB');
        
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_roster');
        
        // 獲取所有記錄
        const records = await collection.find({}).toArray();
        console.log(`📊 找到 ${records.length} 條記錄需要處理`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        // 批量更新
        const bulkOps = [];
        
        for (const record of records) {
            const updateFields = {};
            let needsUpdate = false;
            
            // ✅ 檢查並添加 slot 字段
            if (record.slot === undefined || record.slot === null) {
                // 嘗試從時間推斷時段，或默認為1（上午）
                let slot = 1;
                if (record.time || record.timeRange) {
                    const timeStr = (record.time || record.timeRange).toString();
                    // 簡單推斷：如果時間包含特定關鍵字
                    if (timeStr.includes('中午') || timeStr.includes('noon') || timeStr.includes('12')) {
                        slot = 2;
                    } else if (timeStr.includes('下午') || timeStr.includes('afternoon') || timeStr.includes('PM')) {
                        slot = 3;
                    }
                }
                updateFields.slot = slot;
                needsUpdate = true;
            }
            
            // ✅ 檢查並添加 unavailable 字段
            if (record.unavailable === undefined || record.unavailable === null) {
                // 如果 location 為空或包含請假關鍵字，則設為 true
                const location = (record.location || record.place || '').toString().trim();
                const unavailableKeywords = ['DO', 'OFF', 'PH', 'AL', 'BO', '休息', '放假', '病假', '事假', '請假', '曠工'];
                const isUnavailable = !location || unavailableKeywords.some(keyword => 
                    location.toUpperCase().includes(keyword.toUpperCase())
                );
                updateFields.unavailable = isUnavailable;
                needsUpdate = true;
            }
            
            // ✅ 檢查並添加 isSubmitted 字段
            if (record.isSubmitted === undefined || record.isSubmitted === null) {
                updateFields.isSubmitted = false; // 默認為未提交
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: record._id },
                        update: {
                            $set: updateFields
                        }
                    }
                });
            } else {
                skippedCount++;
            }
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
        console.log(`   - 跳過記錄數：${skippedCount}（已存在所有必要字段）`);
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
    migrateCoachRosterFields()
        .then(() => {
            console.log('✅ 遷移完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 遷移失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateCoachRosterFields };

