/**
 * 遷移腳本：為 students_timeslot 集合添加 isAttended 和 isLeave 字段
 * 
 * 此腳本會：
 * 1. 為所有現有記錄添加 isAttended: false 和 isLeave: false 字段
 * 2. 只更新缺少這些字段的記錄（避免重複更新）
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb://localhost:27017';
const DEFAULT_DB_NAME = process.env.MONGO_DB_NAME || 'test';

async function migrateAttendanceFields() {
    let client;
    try {
        console.log('🔄 開始遷移出席狀態字段...');
        console.log(`📡 連接 MongoDB: ${MONGO_BASE_URI}`);
        console.log(`📚 數據庫名稱: ${DEFAULT_DB_NAME}`);

        // 連接 MongoDB
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        console.log('✅ MongoDB 連接成功');

        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');

        // 查找所有缺少 isAttended 或 isLeave 字段的記錄
        const query = {
            $or: [
                { isAttended: { $exists: false } },
                { isLeave: { $exists: false } }
            ]
        };

        const recordsToUpdate = await collection.find(query).toArray();
        console.log(`📊 找到 ${recordsToUpdate.length} 條需要更新的記錄`);

        if (recordsToUpdate.length === 0) {
            console.log('✅ 所有記錄都已包含 isAttended 和 isLeave 字段，無需更新');
            return;
        }

        // 批量更新
        let updatedCount = 0;
        let errorCount = 0;

        for (const record of recordsToUpdate) {
            try {
                const updateData = {
                    updatedAt: new Date()
                };

                // 只添加缺少的字段
                if (!record.hasOwnProperty('isAttended')) {
                    updateData.isAttended = false;
                }
                if (!record.hasOwnProperty('isLeave')) {
                    updateData.isLeave = false;
                }

                const result = await collection.updateOne(
                    { _id: record._id },
                    { $set: updateData }
                );

                if (result.modifiedCount > 0) {
                    updatedCount++;
                    if (updatedCount <= 10) {
                        const isAttendedValue = updateData.hasOwnProperty('isAttended') ? updateData.isAttended : record.isAttended;
                        const isLeaveValue = updateData.hasOwnProperty('isLeave') ? updateData.isLeave : record.isLeave;
                        console.log(`✅ 更新記錄 _id=${record._id}: 添加 isAttended=${isAttendedValue}, isLeave=${isLeaveValue}`);
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

        // 驗證結果
        const remainingRecords = await collection.find(query).count();
        if (remainingRecords === 0) {
            console.log('✅ 驗證通過：所有記錄都已包含 isAttended 和 isLeave 字段');
        } else {
            console.warn(`⚠️  仍有 ${remainingRecords} 條記錄缺少字段，請檢查`);
        }

    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB 連接已關閉');
        }
    }
}

// 執行遷移
if (require.main === module) {
    migrateAttendanceFields()
        .then(() => {
            console.log('✅ 遷移腳本執行完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 遷移腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateAttendanceFields };




























