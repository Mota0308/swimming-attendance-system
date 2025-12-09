/**
 * 清除 Coach_roster 集合中的 slot=3 舊資料，並將 time/location 陣列裁剪為前兩個時段
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function removeSlotThreeRecords() {
    let client;
    try {
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_roster');

        console.log('🔄 開始處理 Coach_roster slot=3 舊資料');

        // 1) 刪除 slot 不在 1/2 之內的紀錄
        const deleteResult = await collection.deleteMany({
            slot: { $nin: [1, 2] }
        });
        console.log(`🗑️ 已刪除 slot 非 1/2 的紀錄: ${deleteResult.deletedCount} 筆`);

        // 2) 修剪 time/location 陣列為前兩個值
        const cursor = collection.find({
            $or: [
                { 'time.2': { $exists: true } },
                { 'location.2': { $exists: true } }
            ]
        });

        let updatedCount = 0;
        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            const updates = {};

            if (Array.isArray(doc.time) && doc.time.length > 2) {
                updates.time = doc.time.slice(0, 2);
            }
            if (Array.isArray(doc.location) && doc.location.length > 2) {
                updates.location = doc.location.slice(0, 2);
            }

            if (Object.keys(updates).length > 0) {
                await collection.updateOne({ _id: doc._id }, { $set: updates });
                updatedCount++;
            }
        }

        console.log(`✂️ 已裁剪 time/location 陣列: ${updatedCount} 筆`);
        console.log('✅ slot=3 清理完成');
    } catch (error) {
        console.error('❌ 清理 slot=3 資料失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB 連線已關閉');
        }
    }
}

if (require.main === module) {
    removeSlotThreeRecords()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { removeSlotThreeRecords };

