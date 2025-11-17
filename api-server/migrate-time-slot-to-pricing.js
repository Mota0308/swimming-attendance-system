/**
 * 將 Class_format 集合中的 time_slot 轉移到 Pricing 集合
 * 
 * 功能：
 * 1. 從 Class_format 集合讀取 time_slot 字段
 * 2. 根據 class_type 和 class_format 匹配，更新 Pricing 集合中對應記錄的 time_slot 字段
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// time_slot 配置映射（作為備用，如果 Class_format 中沒有 time_slot）
const timeSlotConfig = {
    // 全年親子嬰兒班
    '全年親子嬰兒班': {
        '私人班1:1': 30,
        '私人班1:2': 30,
        '嬰幼兒小組班1:3-5': 30,
        '恆常泳班1:4-7': 30
    },
    // 全年私人班
    '全年私人班': {
        '私人班1:1': 40,
        '私人班1:2': 40,
        '幼兒私人班1:1': 30,
        '幼兒私人班1:2': 30
    },
    // 指定導師課程（全年）
    '指定導師課程（全年）': {
        '指定導師小組班1:2-4': 40,
        '指定導師中班1:4-6': 40,
        '指定導師高班1:5-8': 60,
        '指定導師泳隊1:6-12': 60
    },
    // 全年團體泳班
    '全年團體泳班': {
        '全年團體泳班 初班 1:3-5': 60,
        '全年團體泳班 中班 1:4-6': 60,
        '全年團體泳班 高班 1:6-12': 60
    }
};

/**
 * 從配置中獲取 time_slot（備用方案）
 */
function getTimeSlotFromConfig(classType, classFormat) {
    if (!classType || !classFormat) {
        return null;
    }
    
    const classTypeConfig = timeSlotConfig[classType];
    if (!classTypeConfig) {
        return null;
    }
    
    // 優先精確匹配
    if (classTypeConfig[classFormat]) {
        return classTypeConfig[classFormat];
    }
    
    // 嘗試部分匹配
    for (const [format, timeSlot] of Object.entries(classTypeConfig)) {
        if (classFormat.includes(format) || format.includes(classFormat)) {
            return timeSlot;
        }
    }
    
    return null;
}

async function migrateTimeSlotToPricing() {
    let client;
    try {
        console.log('🔄 開始將 Class_format 的 time_slot 轉移到 Pricing 集合...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const classFormatCollection = db.collection('Class_format');
        const pricingCollection = db.collection('Pricing');
        
        // 1. 從 Class_format 集合讀取所有記錄
        const classFormats = await classFormatCollection.find({}).toArray();
        console.log(`📊 找到 ${classFormats.length} 條 Class_format 記錄`);
        
        // 2. 構建 time_slot 映射表（class_type + class_format -> time_slot）
        const timeSlotMap = new Map();
        let hasTimeSlotCount = 0;
        let noTimeSlotCount = 0;
        
        for (const format of classFormats) {
            const classType = format.class_type;
            const classFormat = format.class_format || format.name;
            
            if (!classType || !classFormat) {
                console.warn(`⚠️ 跳過記錄（缺少 class_type 或 class_format/name）:`, {
                    _id: format._id,
                    class_type: classType,
                    class_format: format.class_format,
                    name: format.name
                });
                continue;
            }
            
            const key = `${classType}_${classFormat}`;
            let timeSlot = format.time_slot;
            
            // 如果 Class_format 中沒有 time_slot，嘗試從配置中獲取
            if (!timeSlot) {
                timeSlot = getTimeSlotFromConfig(classType, classFormat);
                if (timeSlot) {
                    console.log(`📝 從配置獲取 time_slot: ${classType} - ${classFormat} = ${timeSlot}分鐘`);
                }
            }
            
            if (timeSlot) {
                timeSlotMap.set(key, timeSlot);
                hasTimeSlotCount++;
            } else {
                noTimeSlotCount++;
                console.warn(`⚠️ 未找到 time_slot: ${classType} - ${classFormat}`);
            }
        }
        
        console.log(`\n📊 time_slot 映射統計:`);
        console.log(`  ✅ 有 time_slot: ${hasTimeSlotCount} 條`);
        console.log(`  ⚠️ 無 time_slot: ${noTimeSlotCount} 條`);
        
        // 3. 更新 Pricing 集合
        const pricingRecords = await pricingCollection.find({}).toArray();
        console.log(`\n📊 找到 ${pricingRecords.length} 條 Pricing 記錄`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        let notFoundCount = 0;
        
        for (const pricing of pricingRecords) {
            const classType = pricing.class_type;
            const classFormat = pricing.class_format;
            
            if (!classType || !classFormat) {
                console.warn(`⚠️ 跳過記錄（缺少 class_type 或 class_format）:`, {
                    _id: pricing._id,
                    class_type: classType,
                    class_format: classFormat
                });
                skippedCount++;
                continue;
            }
            
            const key = `${classType}_${classFormat}`;
            const timeSlot = timeSlotMap.get(key);
            
            if (!timeSlot) {
                // 嘗試從配置中獲取（作為最後備用）
                const configTimeSlot = getTimeSlotFromConfig(classType, classFormat);
                if (configTimeSlot) {
                    await pricingCollection.updateMany(
                        { class_type: classType, class_format: classFormat },
                        { $set: { time_slot: configTimeSlot } }
                    );
                    updatedCount++;
                    console.log(`✅ 從配置更新: ${classType} - ${classFormat} = ${configTimeSlot}分鐘`);
                } else {
                    notFoundCount++;
                    console.warn(`⚠️ 未找到 time_slot 映射: ${classType} - ${classFormat}`);
                }
            } else {
                // 檢查是否已經有 time_slot 且值相同
                if (pricing.time_slot === timeSlot) {
                    console.log(`ℹ️ 跳過（已存在且值相同）: ${classType} - ${classFormat} → ${timeSlot}分鐘`);
                    skippedCount++;
                } else {
                    // 更新所有匹配的記錄（因為同一 classType + classFormat 可能有多個 instructor_level）
                    const result = await pricingCollection.updateMany(
                        { class_type: classType, class_format: classFormat },
                        { $set: { time_slot: timeSlot } }
                    );
                    updatedCount += result.modifiedCount;
                    console.log(`✅ 更新 ${result.modifiedCount} 條記錄: ${classType} - ${classFormat} = ${timeSlot}分鐘`);
                }
            }
        }
        
        console.log(`\n📊 遷移統計:`);
        console.log(`  ✅ 已更新: ${updatedCount} 條記錄`);
        console.log(`  ℹ️ 已跳過: ${skippedCount} 條記錄（已存在且值相同）`);
        console.log(`  ⚠️ 未找到: ${notFoundCount} 條記錄`);
        
        // 4. 驗證結果
        const pricingWithTimeSlot = await pricingCollection.countDocuments({ time_slot: { $exists: true, $ne: null } });
        const pricingWithoutTimeSlot = await pricingCollection.countDocuments({ 
            $or: [
                { time_slot: { $exists: false } },
                { time_slot: null }
            ]
        });
        
        console.log(`\n📊 驗證結果:`);
        console.log(`  ✅ 有 time_slot: ${pricingWithTimeSlot} 條`);
        console.log(`  ⚠️ 無 time_slot: ${pricingWithoutTimeSlot} 條`);
        
    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ MongoDB 連接已關閉');
        }
    }
}

// 運行遷移函數
if (require.main === module) {
    migrateTimeSlotToPricing()
        .then(() => {
            console.log('\n✅ time_slot 遷移完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ time_slot 遷移失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateTimeSlotToPricing };



