/**
 * 課程類型數據種子文件
 * 用於向 MongoDB 的 ClassTypes 集合插入課程類型數據
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// 課程類型數據
const classTypesData = [
    { name: '全年親子嬰兒班', description: '適合親子一起參與的嬰兒游泳課程', active: true },
    { name: '全年私人班', description: '一對一或小班制私人游泳課程', active: true },
    { name: '指定導師課程（全年）', description: '指定導師的全年游泳課程', active: true },
    { name: '全年團體泳班', description: '團體游泳班課程', active: true }
];

async function seedClassTypes() {
    let client;
    try {
        console.log('🔄 開始插入課程類型數據...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('ClassTypes');
        
        // 檢查是否已有數據
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️ 已存在 ${existingCount} 個課程類型`);
            console.log('🔄 刪除舊數據...');
            await collection.deleteMany({});
        }
        
        // 插入新數據
        const result = await collection.insertMany(classTypesData);
        console.log(`✅ 成功插入 ${result.insertedCount} 個課程類型`);
        
    } catch (error) {
        console.error('❌ 插入課程類型數據失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ MongoDB 連接已關閉');
        }
    }
}

// 運行種子函數
if (require.main === module) {
    seedClassTypes()
        .then(() => {
            console.log('✅ 課程類型數據插入完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 課程類型數據插入失敗:', error);
            process.exit(1);
        });
}

module.exports = { seedClassTypes };


