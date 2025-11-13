/**
 * 導師級別數據種子文件
 * 用於向 MongoDB 的 InstructorTypes 集合插入導師級別數據
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// 導師級別數據
const instructorTypesData = [
    // 全年私人班 - 各課堂形式
    { class_type: '全年私人班', class_format: '私人班1:1', levels: ['資深導師', '主管導師', '女導師', '高級導師', '初級導師'] },
    { class_type: '全年私人班', class_format: '私人班1:2', levels: ['資深導師', '主管導師', '女導師', '高級導師', '初級導師'] },
    { class_type: '全年私人班', class_format: '幼兒私人班1:1', levels: ['資深導師', '主管導師', '女導師'] },
    { class_type: '全年私人班', class_format: '幼兒私人班1:2', levels: ['資深導師', '主管導師', '女導師'] },
    
    // 全年親子嬰兒班 - 各課堂形式
    { class_type: '全年親子嬰兒班', class_format: '私人班1:1', levels: ['資深導師', '高級導師'] },
    { class_type: '全年親子嬰兒班', class_format: '私人班1:2', levels: ['資深導師', '高級導師'] },
    { class_type: '全年親子嬰兒班', class_format: '嬰幼兒小組班1:3-5', levels: ['資深導師', '高級導師'] },
    { class_type: '全年親子嬰兒班', class_format: '恆常泳班1:4-7', levels: ['固定泳班導師'] },
    
    // 指定導師課程（全年） - 各課堂形式
    { class_type: '指定導師課程（全年）', class_format: '指定導師小組班1:2-4', levels: ['資深導師', '主管導師', '女導師', '高級導師', '初級導師'] },
    { class_type: '指定導師課程（全年）', class_format: '指定導師中班1:4-6', levels: ['資深導師', '主管導師', '女導師', '高級導師', '初級導師'] },
    { class_type: '指定導師課程（全年）', class_format: '指定導師高班1:5-8', levels: ['資深導師', '主管導師', '女導師', '高級導師', '初級導師'] },
    { class_type: '指定導師課程（全年）', class_format: '指定導師泳隊1:6-12', levels: ['資深導師', '主管導師', '女導師', '高級導師', '初級導師'] },
    
    // 全年團體泳班 - 各課堂形式
    { class_type: '全年團體泳班', class_format: '全年團體泳班 初班 1:3-5', levels: ['團體泳班導師'] },
    { class_type: '全年團體泳班', class_format: '全年團體泳班 中班 1:4-6', levels: ['團體泳班導師'] },
    { class_type: '全年團體泳班', class_format: '全年團體泳班 高班 1:6-12', levels: ['團體泳班導師'] }
];

async function seedInstructorTypes() {
    let client;
    try {
        console.log('🔄 開始插入導師級別數據...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('InstructorTypes');
        
        // 檢查是否已有數據
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️ 已存在 ${existingCount} 個導師級別配置`);
            console.log('🔄 刪除舊數據...');
            await collection.deleteMany({});
        }
        
        // 展開數據為單獨文檔
        const expandedData = [];
        instructorTypesData.forEach(item => {
            item.levels.forEach(level => {
                expandedData.push({
                    class_type: item.class_type,
                    class_format: item.class_format,
                    level: level,
                    active: true
                });
            });
        });
        
        // 插入新數據
        const result = await collection.insertMany(expandedData);
        console.log(`✅ 成功插入 ${result.insertedCount} 個導師級別配置`);
        
        // 按課程類型統計
        const stats = {};
        expandedData.forEach(item => {
            if (!stats[item.class_type]) {
                stats[item.class_type] = {};
            }
            if (!stats[item.class_type][item.class_format]) {
                stats[item.class_type][item.class_format] = 0;
            }
            stats[item.class_type][item.class_format]++;
        });
        
        console.log('\n📊 按課程類型和課堂形式統計:');
        Object.keys(stats).forEach(type => {
            console.log(`  ${type}:`);
            Object.keys(stats[type]).forEach(format => {
                console.log(`    ${format}: ${stats[type][format]} 個導師級別`);
            });
        });
        
    } catch (error) {
        console.error('❌ 插入導師級別數據失敗:', error);
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
    seedInstructorTypes()
        .then(() => {
            console.log('✅ 導師級別數據插入完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 導師級別數據插入失敗:', error);
            process.exit(1);
        });
}

module.exports = { seedInstructorTypes };


