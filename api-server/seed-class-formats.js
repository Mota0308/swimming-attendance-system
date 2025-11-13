/**
 * 課堂形式數據種子文件
 * 用於向 MongoDB 的 ClassFormats 集合插入課堂形式數據
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// 課堂形式數據
const classFormatsData = [
    // 全年親子嬰兒班
    { class_type: '全年親子嬰兒班', name: '私人班1:1', short: '1:1', active: true },
    { class_type: '全年親子嬰兒班', name: '私人班1:2', short: '1:2', active: true },
    { class_type: '全年親子嬰兒班', name: '嬰幼兒小組班1:3-5', short: '小組', active: true },
    { class_type: '全年親子嬰兒班', name: '恆常泳班1:4-7', short: '恆', active: true },
    
    // 全年私人班
    { class_type: '全年私人班', name: '私人班1:1', short: '1:1', active: true },
    { class_type: '全年私人班', name: '私人班1:2', short: '1:2', active: true },
    { class_type: '全年私人班', name: '幼兒私人班1:1', short: '幼1:1', active: true },
    { class_type: '全年私人班', name: '幼兒私人班1:2', short: '幼1:2', active: true },
    
    // 指定導師課程（全年）
    { class_type: '指定導師課程（全年）', name: '指定導師小組班1:2-4', short: '小組', active: true },
    { class_type: '指定導師課程（全年）', name: '指定導師中班1:4-6', short: '中', active: true },
    { class_type: '指定導師課程（全年）', name: '指定導師高班1:5-8', short: '高', active: true },
    { class_type: '指定導師課程（全年）', name: '指定導師泳隊1:6-12', short: '隊', active: true },
    
    // 全年團體泳班
    { class_type: '全年團體泳班', name: '全年團體泳班 初班 1:3-5', short: '初', active: true },
    { class_type: '全年團體泳班', name: '全年團體泳班 中班 1:4-6', short: '中', active: true },
    { class_type: '全年團體泳班', name: '全年團體泳班 高班 1:6-12', short: '高', active: true }
];

async function seedClassFormats() {
    let client;
    try {
        console.log('🔄 開始插入課堂形式數據...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('ClassFormats');
        
        // 檢查是否已有數據
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️ 已存在 ${existingCount} 個課堂形式`);
            console.log('🔄 刪除舊數據...');
            await collection.deleteMany({});
        }
        
        // 插入新數據
        const result = await collection.insertMany(classFormatsData);
        console.log(`✅ 成功插入 ${result.insertedCount} 個課堂形式`);
        
        // 按課程類型統計
        const stats = {};
        classFormatsData.forEach(item => {
            if (!stats[item.class_type]) {
                stats[item.class_type] = 0;
            }
            stats[item.class_type]++;
        });
        
        console.log('\n📊 按課程類型統計:');
        Object.keys(stats).forEach(type => {
            console.log(`  ${type}: ${stats[type]} 個課堂形式`);
        });
        
    } catch (error) {
        console.error('❌ 插入課堂形式數據失敗:', error);
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
    seedClassFormats()
        .then(() => {
            console.log('✅ 課堂形式數據插入完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 課堂形式數據插入失敗:', error);
            process.exit(1);
        });
}

module.exports = { seedClassFormats };


