/**
 * 變更追蹤字段遷移腳本
 * 為 students_timeslot 集合添加變更追蹤字段：
 * - isChangeDate: 初始值 false
 * - isChangeTime: 初始值 false
 * - isChangeLocation: 初始值 false
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

/**
 * 遷移變更追蹤字段
 */
async function migrateChangeTrackingFields() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        console.log('🔗 正在連接 MongoDB...');
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        console.log(`✅ 已連接到數據庫: ${DEFAULT_DB_NAME}\n`);
        
        console.log('📊 開始遷移變更追蹤字段...\n');
        
        // 查找所有缺少變更追蹤字段的記錄
        const recordsToUpdate = await collection.find({
            $or: [
                { isChangeDate: { $exists: false } },
                { isChangeTime: { $exists: false } },
                { isChangeLocation: { $exists: false } }
            ]
        }).toArray();
        
        console.log(`📊 找到 ${recordsToUpdate.length} 條需要更新的記錄`);
        
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const record of recordsToUpdate) {
            try {
                const updateData = {
                    updatedAt: new Date()
                };
                
                // 只添加缺少的字段
                if (!record.hasOwnProperty('isChangeDate')) {
                    updateData.isChangeDate = false;
                }
                if (!record.hasOwnProperty('isChangeTime')) {
                    updateData.isChangeTime = false;
                }
                if (!record.hasOwnProperty('isChangeLocation')) {
                    updateData.isChangeLocation = false;
                }
                
                const result = await collection.updateOne(
                    { _id: record._id },
                    { $set: updateData }
                );
                
                if (result.modifiedCount > 0) {
                    updatedCount++;
                    if (updatedCount <= 10) {
                        const isChangeDateValue = updateData.hasOwnProperty('isChangeDate') ? updateData.isChangeDate : record.isChangeDate;
                        const isChangeTimeValue = updateData.hasOwnProperty('isChangeTime') ? updateData.isChangeTime : record.isChangeTime;
                        const isChangeLocationValue = updateData.hasOwnProperty('isChangeLocation') ? updateData.isChangeLocation : record.isChangeLocation;
                        console.log(`✅ 更新記錄 _id=${record._id}: 添加 isChangeDate=${isChangeDateValue}, isChangeTime=${isChangeTimeValue}, isChangeLocation=${isChangeLocationValue}`);
                    }
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ 更新記錄失敗 _id=${record._id}:`, error.message);
            }
        }
        
        console.log(`\n✅ 遷移完成！`);
        console.log(`   - 總記錄數: ${recordsToUpdate.length}`);
        console.log(`   - 成功更新: ${updatedCount}`);
        console.log(`   - 失敗: ${errorCount}`);
        
        // 驗證所有記錄是否都包含這些字段
        const remainingRecords = await collection.countDocuments({
            $or: [
                { isChangeDate: { $exists: false } },
                { isChangeTime: { $exists: false } },
                { isChangeLocation: { $exists: false } }
            ]
        });
        
        if (remainingRecords === 0) {
            console.log('✅ 驗證通過：所有記錄都已包含變更追蹤字段');
        } else {
            console.warn(`⚠️ 驗證失敗：仍有 ${remainingRecords} 條記錄缺少變更追蹤字段`);
        }
        
        // 統計現有記錄的變更標記狀態
        const stats = await collection.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    withChangeDate: {
                        $sum: { $cond: [{ $eq: ['$isChangeDate', true] }, 1, 0] }
                    },
                    withChangeTime: {
                        $sum: { $cond: [{ $eq: ['$isChangeTime', true] }, 1, 0] }
                    },
                    withChangeLocation: {
                        $sum: { $cond: [{ $eq: ['$isChangeLocation', true] }, 1, 0] }
                    }
                }
            }
        ]).toArray();
        
        if (stats.length > 0) {
            console.log('\n📊 變更標記統計:');
            console.log(`   - 總記錄數: ${stats[0].total}`);
            console.log(`   - isChangeDate = true: ${stats[0].withChangeDate}`);
            console.log(`   - isChangeTime = true: ${stats[0].withChangeTime}`);
            console.log(`   - isChangeLocation = true: ${stats[0].withChangeLocation}`);
        }
        
    } catch (error) {
        console.error('❌ 遷移腳本執行失敗:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB 連接已關閉');
        }
    }
}

// 執行遷移
if (require.main === module) {
    migrateChangeTrackingFields().catch(console.error);
}

module.exports = { migrateChangeTrackingFields };

























