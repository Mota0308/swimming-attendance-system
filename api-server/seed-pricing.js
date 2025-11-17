/**
 * 價格矩陣數據種子文件
 * 用於向 MongoDB 的 Pricing 集合插入價格數據
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// 價格矩陣數據
const pricingData = [
    // 全年私人班 - 私人班1:1
    { class_type: '全年私人班', class_format: '私人班1:1', instructor_level: '資深導師', price: 580 },
    { class_type: '全年私人班', class_format: '私人班1:1', instructor_level: '主管導師', price: 480 },
    { class_type: '全年私人班', class_format: '私人班1:1', instructor_level: '女導師', price: 480 },
    { class_type: '全年私人班', class_format: '私人班1:1', instructor_level: '高級導師', price: 380 },
    { class_type: '全年私人班', class_format: '私人班1:1', instructor_level: '初級導師', price: 330 },
    
    // 全年私人班 - 私人班1:2
    { class_type: '全年私人班', class_format: '私人班1:2', instructor_level: '資深導師', price: 375 },
    { class_type: '全年私人班', class_format: '私人班1:2', instructor_level: '主管導師', price: 315 },
    { class_type: '全年私人班', class_format: '私人班1:2', instructor_level: '女導師', price: 315 },
    { class_type: '全年私人班', class_format: '私人班1:2', instructor_level: '高級導師', price: 265 },
    { class_type: '全年私人班', class_format: '私人班1:2', instructor_level: '初級導師', price: 225 },
    
    // 全年私人班 - 幼兒私人班1:1
    { class_type: '全年私人班', class_format: '幼兒私人班1:1', instructor_level: '資深導師', price: 580 },
    { class_type: '全年私人班', class_format: '幼兒私人班1:1', instructor_level: '主管導師', price: 480 },
    { class_type: '全年私人班', class_format: '幼兒私人班1:1', instructor_level: '女導師', price: 480 },
    
    // 全年私人班 - 幼兒私人班1:2
    { class_type: '全年私人班', class_format: '幼兒私人班1:2', instructor_level: '資深導師', price: 375 },
    { class_type: '全年私人班', class_format: '幼兒私人班1:2', instructor_level: '主管導師', price: 315 },
    { class_type: '全年私人班', class_format: '幼兒私人班1:2', instructor_level: '女導師', price: 315 },
    
    // 全年親子嬰兒班 - 私人班1:1
    { class_type: '全年親子嬰兒班', class_format: '私人班1:1', instructor_level: '資深導師', price: 600 },
    { class_type: '全年親子嬰兒班', class_format: '私人班1:1', instructor_level: '高級導師', price: 500 },
    
    // 全年親子嬰兒班 - 私人班1:2
    { class_type: '全年親子嬰兒班', class_format: '私人班1:2', instructor_level: '資深導師', price: 390 },
    { class_type: '全年親子嬰兒班', class_format: '私人班1:2', instructor_level: '高級導師', price: 320 },
    
    // 全年親子嬰兒班 - 嬰幼兒小組班1:3-5
    { class_type: '全年親子嬰兒班', class_format: '嬰幼兒小組班1:3-5', instructor_level: '資深導師', price: 250 },
    { class_type: '全年親子嬰兒班', class_format: '嬰幼兒小組班1:3-5', instructor_level: '高級導師', price: 220 },
    
    // 全年親子嬰兒班 - 恆常泳班1:4-7
    { class_type: '全年親子嬰兒班', class_format: '恆常泳班1:4-7', instructor_level: '固定泳班導師', price: 200 },
    
    // 指定導師課程（全年） - 各課堂形式（統一定價，根據圖片1價格表）
    // ✅ 修改：所有班級（小組班/中班/高班/泳隊）統一價格
    // 小組班
    { class_type: '指定導師課程（全年）', class_format: '指定導師小組班1:2-4', instructor_level: '資深導師', price: 250 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師小組班1:2-4', instructor_level: '主管導師', price: 225 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師小組班1:2-4', instructor_level: '女導師', price: 225 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師小組班1:2-4', instructor_level: '高級導師', price: 195 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師小組班1:2-4', instructor_level: '初級導師', price: 175 },
    
    // 中班
    { class_type: '指定導師課程（全年）', class_format: '指定導師中班1:4-6', instructor_level: '資深導師', price: 250 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師中班1:4-6', instructor_level: '主管導師', price: 225 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師中班1:4-6', instructor_level: '女導師', price: 225 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師中班1:4-6', instructor_level: '高級導師', price: 195 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師中班1:4-6', instructor_level: '初級導師', price: 175 },
    
    // 高班
    { class_type: '指定導師課程（全年）', class_format: '指定導師高班1:5-8', instructor_level: '資深導師', price: 250 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師高班1:5-8', instructor_level: '主管導師', price: 225 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師高班1:5-8', instructor_level: '女導師', price: 225 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師高班1:5-8', instructor_level: '高級導師', price: 195 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師高班1:5-8', instructor_level: '初級導師', price: 175 },
    
    // 泳隊
    { class_type: '指定導師課程（全年）', class_format: '指定導師泳隊1:6-12', instructor_level: '資深導師', price: 250 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師泳隊1:6-12', instructor_level: '主管導師', price: 225 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師泳隊1:6-12', instructor_level: '女導師', price: 225 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師泳隊1:6-12', instructor_level: '高級導師', price: 195 },
    { class_type: '指定導師課程（全年）', class_format: '指定導師泳隊1:6-12', instructor_level: '初級導師', price: 175 },
    
    // 全年團體泳班
    { class_type: '全年團體泳班', class_format: '全年團體泳班 初班 1:3-5', instructor_level: '團體泳班導師', price: 180 },
    { class_type: '全年團體泳班', class_format: '全年團體泳班 中班 1:4-6', instructor_level: '團體泳班導師', price: 160 },
    { class_type: '全年團體泳班', class_format: '全年團體泳班 高班 1:6-12', instructor_level: '團體泳班導師', price: 140 }
];

async function seedPricing() {
    let client;
    try {
        console.log('🔄 開始插入價格數據...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Pricing');
        
        // 檢查是否已有數據
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️ 已存在 ${existingCount} 個價格數據`);
            console.log('🔄 刪除舊數據...');
            await collection.deleteMany({});
        }
        
        // 插入新數據
        const result = await collection.insertMany(pricingData);
        console.log(`✅ 成功插入 ${result.insertedCount} 個價格配置`);
        
        // 按課程類型統計
        const stats = {};
        pricingData.forEach(item => {
            if (!stats[item.class_type]) {
                stats[item.class_type] = 0;
            }
            stats[item.class_type]++;
        });
        
        console.log('\n📊 按課程類型統計:');
        Object.keys(stats).forEach(type => {
            console.log(`  ${type}: ${stats[type]} 個價格配置`);
        });
        
    } catch (error) {
        console.error('❌ 插入價格數據失敗:', error);
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
    seedPricing()
        .then(() => {
            console.log('✅ 價格數據插入完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 價格數據插入失敗:', error);
            process.exit(1);
        });
}

module.exports = { seedPricing };


