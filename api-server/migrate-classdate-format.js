/**
 * 遷移 classDate 格式腳本
 * 將現有數據的 classDate 從 Date 對象遷移為 YYYY-MM-DD 字符串格式
 * 為待約記錄添加 classDate: null
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function migrateClassDateFormat() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        console.log('🔗 正在連接 MongoDB...');
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        console.log(`✅ 已連接到數據庫: ${DEFAULT_DB_NAME}\n`);
        
        console.log('📊 開始遷移 classDate 格式...\n');
        
        // 1. 查找所有 classDate 為 Date 對象的記錄
        const dateTypeRecords = await collection.find({
            classDate: { $type: 'date' }
        }).toArray();
        
        console.log(`📋 找到 ${dateTypeRecords.length} 條 classDate 為 Date 對象的記錄`);
        
        let dateUpdated = 0;
        for (const record of dateTypeRecords) {
            try {
                const date = record.classDate;
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                
                await collection.updateOne(
                    { _id: record._id },
                    { $set: { classDate: dateString } }
                );
                
                dateUpdated++;
                if (dateUpdated % 100 === 0) {
                    console.log(`   ✅ 已更新 ${dateUpdated} 條記錄...`);
                }
            } catch (error) {
                console.error(`   ❌ 更新記錄失敗 (_id: ${record._id}):`, error.message);
            }
        }
        
        console.log(`\n✅ 已將 ${dateUpdated} 條 Date 對象轉換為 YYYY-MM-DD 字符串格式\n`);
        
        // 2. 查找待約記錄（isPending: true 且沒有 classDate 或 classDate 不是 null 也不是字符串）
        const pendingRecords = await collection.find({
            $and: [
                { isPending: true },
                {
                    $or: [
                        { classDate: { $exists: false } },
                        { classDate: { $ne: null } },
                        { classDate: { $type: 'date' } }
                    ]
                }
            ]
        }).toArray();
        
        console.log(`📋 找到 ${pendingRecords.length} 條待約記錄需要更新 classDate`);
        
        let pendingUpdated = 0;
        for (const record of pendingRecords) {
            try {
                await collection.updateOne(
                    { _id: record._id },
                    { $set: { classDate: null } }
                );
                
                pendingUpdated++;
                if (pendingUpdated % 100 === 0) {
                    console.log(`   ✅ 已更新 ${pendingUpdated} 條待約記錄...`);
                }
            } catch (error) {
                console.error(`   ❌ 更新待約記錄失敗 (_id: ${record._id}):`, error.message);
            }
        }
        
        console.log(`\n✅ 已更新 ${pendingUpdated} 條待約記錄的 classDate 為 null\n`);
        
        // 3. 查找有 pendingYear/pendingMonth 但 classDate 不是 null 的記錄（可能是舊格式）
        const oldPendingRecords = await collection.find({
            $and: [
                { pendingYear: { $exists: true } },
                { pendingMonth: { $exists: true } },
                {
                    $or: [
                        { classDate: { $exists: false } },
                        { classDate: { $ne: null } }
                    ]
                },
                { isPending: { $ne: true } }  // 排除已經標記為 isPending 的記錄
            ]
        }).toArray();
        
        console.log(`📋 找到 ${oldPendingRecords.length} 條舊格式待約記錄需要更新`);
        
        let oldPendingUpdated = 0;
        for (const record of oldPendingRecords) {
            try {
                // 如果沒有 isPending 標記，也添加
                const updateData = { classDate: null };
                if (!record.isPending) {
                    updateData.isPending = true;
                }
                
                await collection.updateOne(
                    { _id: record._id },
                    { $set: updateData }
                );
                
                oldPendingUpdated++;
                if (oldPendingUpdated % 100 === 0) {
                    console.log(`   ✅ 已更新 ${oldPendingUpdated} 條舊格式記錄...`);
                }
            } catch (error) {
                console.error(`   ❌ 更新舊格式記錄失敗 (_id: ${record._id}):`, error.message);
            }
        }
        
        console.log(`\n✅ 已更新 ${oldPendingUpdated} 條舊格式待約記錄\n`);
        
        // 4. 驗證遷移結果
        console.log('🔍 驗證遷移結果...\n');
        
        const totalRecords = await collection.countDocuments({});
        const stringDateRecords = await collection.countDocuments({
            classDate: { $type: 'string' }
        });
        const nullDateRecords = await collection.countDocuments({
            classDate: null
        });
        const dateTypeRecordsRemaining = await collection.countDocuments({
            classDate: { $type: 'date' }
        });
        const missingClassDate = await collection.countDocuments({
            classDate: { $exists: false }
        });
        
        console.log('📊 遷移結果統計：');
        console.log(`   📋 總記錄數: ${totalRecords}`);
        console.log(`   ✅ classDate 為字符串 (YYYY-MM-DD): ${stringDateRecords}`);
        console.log(`   ✅ classDate 為 null (待約記錄): ${nullDateRecords}`);
        console.log(`   ⚠️  classDate 仍為 Date 對象: ${dateTypeRecordsRemaining}`);
        console.log(`   ⚠️  缺少 classDate 字段: ${missingClassDate}`);
        
        if (dateTypeRecordsRemaining === 0 && missingClassDate === 0) {
            console.log('\n✅ 遷移完成！所有記錄的 classDate 格式已正確');
        } else {
            console.log(`\n⚠️  仍有 ${dateTypeRecordsRemaining + missingClassDate} 條記錄需要處理`);
            console.log('   建議：檢查這些記錄並手動處理');
        }
        
        // 5. 顯示一些示例記錄
        console.log('\n📝 示例記錄：');
        
        const sampleString = await collection.findOne({ classDate: { $type: 'string' } });
        if (sampleString) {
            console.log('   具體日期記錄示例:');
            console.log(`     classDate: ${sampleString.classDate} (類型: ${typeof sampleString.classDate})`);
        }
        
        const sampleNull = await collection.findOne({ classDate: null });
        if (sampleNull) {
            console.log('   待約記錄示例:');
            console.log(`     classDate: ${sampleNull.classDate}`);
            console.log(`     isPending: ${sampleNull.isPending}`);
            console.log(`     pendingYear: ${sampleNull.pendingYear}, pendingMonth: ${sampleNull.pendingMonth}`);
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
migrateClassDateFormat().catch(console.error);

