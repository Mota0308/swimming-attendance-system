/**
 * 時間段（time_slot）和總時間段（total_time_slot）遷移腳本
 * 
 * 功能：
 * 1. 為 Class_format 集合的每個記錄添加 time_slot 字段（單位：分鐘）
 * 2. 為 students_timeslot 集合的每個記錄添加 total_time_slot 字段（堂數）
 * 
 * time_slot 規則：
 * - 全年親子嬰兒班：30分鐘
 * - 全年私人班：40分鐘（但幼兒私人班1:1和幼兒私人班1:2為30分鐘）
 * - 指定導師課程（全年）：
 *   - 指定導師小組班1:2-4：40分鐘
 *   - 指定導師中班1:4-6：40分鐘
 *   - 指定導師高班1:5-8：60分鐘
 *   - 指定導師泳隊1:6-12：60分鐘
 * - 全年團體泳班：60分鐘
 * 
 * total_time_slot 計算邏輯：
 * - 基礎時長（time_slot）對應 1 堂
 * - 實際時長 = 基礎時長 × 1.5 → total_time_slot = 1.5
 * - 實際時長 = 基礎時長 × 2 → total_time_slot = 2
 * - 例如：40分鐘基礎 → 60分鐘 = 1.5堂，80分鐘 = 2堂
 * - 例如：60分鐘基礎 → 90分鐘 = 1.5堂，120分鐘 = 2堂
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// time_slot 配置映射
// 注意：這裡的 key 是 class_format 字段的值（或 name 字段的值）
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
        '幼兒私人班1:1': 30,  // ✅ 特殊：30分鐘
        '幼兒私人班1:2': 30  // ✅ 特殊：30分鐘
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
 * 從 classTime 字符串中提取實際時長（分鐘）
 * 支持格式：
 * - "09:00-09:40" → 40分鐘
 * - "0900-0940" → 40分鐘
 * - "09:10-09:50" → 40分鐘
 */
function extractDurationFromClassTime(classTime) {
    if (!classTime || typeof classTime !== 'string') {
        return null;
    }
    
    // 移除空格
    classTime = classTime.trim();
    
    // 支持多種分隔符
    const separators = ['-', '~', '至', '到'];
    let startTime = '';
    let endTime = '';
    
    for (const sep of separators) {
        if (classTime.includes(sep)) {
            const parts = classTime.split(sep);
            if (parts.length >= 2) {
                startTime = parts[0].trim();
                endTime = parts[parts.length - 1].trim();
                break;
            }
        }
    }
    
    if (!startTime || !endTime) {
        return null;
    }
    
    // 解析時間（支持 "09:00" 和 "0900" 格式）
    function parseTime(timeStr) {
        // 移除冒號
        const cleanTime = timeStr.replace(/:/g, '');
        if (cleanTime.length !== 4) {
            return null;
        }
        
        const hours = parseInt(cleanTime.substring(0, 2));
        const minutes = parseInt(cleanTime.substring(2, 4));
        
        if (isNaN(hours) || isNaN(minutes)) {
            return null;
        }
        
        return hours * 60 + minutes; // 轉換為總分鐘數
    }
    
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    if (startMinutes === null || endMinutes === null) {
        return null;
    }
    
    // 計算時長（考慮跨日情況）
    let duration = endMinutes - startMinutes;
    if (duration < 0) {
        duration += 24 * 60; // 跨日情況
    }
    
    return duration;
}

/**
 * 根據基礎時長和實際時長計算 total_time_slot（堂數）
 */
function calculateTotalTimeSlot(baseTimeSlot, actualDuration) {
    if (!baseTimeSlot || !actualDuration) {
        return 1; // 默認 1 堂
    }
    
    // 計算倍數
    const ratio = actualDuration / baseTimeSlot;
    
    // 四捨五入到最接近的 0.5
    const roundedRatio = Math.round(ratio * 2) / 2;
    
    // 確保至少為 0.5 堂
    return Math.max(0.5, roundedRatio);
}

/**
 * 獲取 classFormat 對應的 time_slot
 */
function getTimeSlotForClassFormat(classType, classFormat) {
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
    
    // 如果沒有精確匹配，嘗試部分匹配（用於處理可能的格式差異）
    for (const [format, timeSlot] of Object.entries(classTypeConfig)) {
        if (classFormat.includes(format) || format.includes(classFormat)) {
            return timeSlot;
        }
    }
    
    return null;
}

/**
 * 更新 Class_format 集合，添加 time_slot 字段
 */
async function updateClassFormatTimeSlots() {
    let client;
    try {
        console.log('🔄 開始更新 Class_format 集合的 time_slot 字段...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Class_format');
        
        // 獲取所有記錄
        const allFormats = await collection.find({}).toArray();
        console.log(`📊 找到 ${allFormats.length} 條 Class_format 記錄`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const format of allFormats) {
            const classType = format.class_type;
            // ✅ 優先使用 class_format，如果沒有則使用 name
            const classFormat = format.class_format || format.name;
            
            if (!classType || !classFormat) {
                console.warn(`⚠️ 跳過記錄（缺少 class_type 或 class_format/name）:`, {
                    _id: format._id,
                    class_type: classType,
                    class_format: format.class_format,
                    name: format.name
                });
                skippedCount++;
                continue;
            }
            
            // 獲取 time_slot
            const timeSlot = getTimeSlotForClassFormat(classType, classFormat);
            
            if (timeSlot === null) {
                console.warn(`⚠️ 未找到 ${classType} - ${classFormat} 的 time_slot 配置`);
                skippedCount++;
                continue;
            }
            
            // 檢查是否已經有 time_slot 且值相同
            if (format.time_slot === timeSlot) {
                console.log(`ℹ️ 跳過（已存在且值相同）: ${classType} - ${classFormat} → ${timeSlot}分鐘`);
                continue;
            }
            
            // 更新記錄
            await collection.updateOne(
                { _id: format._id },
                { 
                    $set: { 
                        time_slot: timeSlot,
                        updatedAt: new Date()
                    } 
                }
            );
            
            updatedCount++;
            console.log(`✅ 更新: ${classType} - ${classFormat} → ${timeSlot}分鐘`);
        }
        
        console.log(`\n📊 更新完成:`);
        console.log(`  - 成功更新: ${updatedCount} 條`);
        console.log(`  - 跳過: ${skippedCount} 條`);
        
    } catch (error) {
        console.error('❌ 更新 Class_format 失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * 更新 students_timeslot 集合，添加 total_time_slot 字段
 */
async function updateStudentsTimeslotTotalTimeSlots() {
    let client;
    try {
        console.log('\n🔄 開始更新 students_timeslot 集合的 total_time_slot 字段...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const timeslotCollection = db.collection('students_timeslot');
        const classFormatCollection = db.collection('Class_format');
        
        // 獲取所有 Class_format 記錄，建立映射
        const classFormats = await classFormatCollection.find({}).toArray();
        const timeSlotMap = new Map();
        
        classFormats.forEach(cf => {
            const classType = cf.class_type;
            // ✅ 優先使用 class_format，如果沒有則使用 name
            const classFormat = cf.class_format || cf.name;
            const timeSlot = cf.time_slot;
            
            if (classType && classFormat && timeSlot) {
                const key = `${classType}|||${classFormat}`;
                timeSlotMap.set(key, timeSlot);
                // ✅ 同時存儲反向映射（使用 name 作為 key），以防 students_timeslot 中使用不同的字段名
                if (cf.name && cf.name !== classFormat) {
                    const nameKey = `${classType}|||${cf.name}`;
                    timeSlotMap.set(nameKey, timeSlot);
                }
            }
        });
        
        console.log(`📊 建立 time_slot 映射表: ${timeSlotMap.size} 個配置`);
        
        // 獲取所有 students_timeslot 記錄
        const allTimeslots = await timeslotCollection.find({}).toArray();
        console.log(`📊 找到 ${allTimeslots.length} 條 students_timeslot 記錄`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (const timeslot of allTimeslots) {
            try {
                // ✅ 支持多種字段名
                const classType = timeslot.courseType || timeslot.classType || timeslot.class_type;
                const classFormat = timeslot.classFormat || timeslot.class_format;
                const classTime = timeslot.classTime;
                
                if (!classType || !classFormat) {
                    console.warn(`⚠️ 跳過記錄（缺少 courseType/classType 或 classFormat）:`, {
                        _id: timeslot._id,
                        courseType: timeslot.courseType,
                        classType: timeslot.classType,
                        class_type: timeslot.class_type,
                        classFormat: timeslot.classFormat,
                        class_format: timeslot.class_format
                    });
                    skippedCount++;
                    continue;
                }
                
                // 獲取基礎 time_slot（嘗試多種 key 格式）
                let mapKey = `${classType}|||${classFormat}`;
                let baseTimeSlot = timeSlotMap.get(mapKey);
                
                // 如果找不到，嘗試其他可能的格式
                if (!baseTimeSlot) {
                    // 嘗試使用 name 字段
                    const nameKey = `${classType}|||${classFormat}`;
                    baseTimeSlot = timeSlotMap.get(nameKey);
                }
                
                if (!baseTimeSlot) {
                    console.warn(`⚠️ 未找到 ${classType} - ${classFormat} 的 time_slot 配置`);
                    skippedCount++;
                    continue;
                }
                
                // 從 classTime 提取實際時長
                const actualDuration = extractDurationFromClassTime(classTime);
                
                // 計算 total_time_slot
                let totalTimeSlot = 1; // 默認 1 堂
                
                if (actualDuration) {
                    totalTimeSlot = calculateTotalTimeSlot(baseTimeSlot, actualDuration);
                }
                
                // 更新記錄
                await timeslotCollection.updateOne(
                    { _id: timeslot._id },
                    { 
                        $set: { 
                            total_time_slot: totalTimeSlot,
                            time_slot: baseTimeSlot, // 同時保存基礎時長，方便後續使用
                            updatedAt: new Date()
                        } 
                    }
                );
                
                updatedCount++;
                
                if (updatedCount % 100 === 0) {
                    console.log(`📊 已處理 ${updatedCount} 條記錄...`);
                }
                
            } catch (error) {
                console.error(`❌ 處理記錄失敗:`, {
                    _id: timeslot._id,
                    error: error.message
                });
                errorCount++;
            }
        }
        
        console.log(`\n📊 更新完成:`);
        console.log(`  - 成功更新: ${updatedCount} 條`);
        console.log(`  - 跳過: ${skippedCount} 條`);
        console.log(`  - 錯誤: ${errorCount} 條`);
        
    } catch (error) {
        console.error('❌ 更新 students_timeslot 失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * 主函數
 */
async function migrateTimeSlots() {
    try {
        console.log('🚀 開始時間段遷移...\n');
        
        // 步驟1：更新 Class_format 集合
        await updateClassFormatTimeSlots();
        
        // 步驟2：更新 students_timeslot 集合
        await updateStudentsTimeslotTotalTimeSlots();
        
        console.log('\n✅ 遷移完成！');
        
    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        throw error;
    }
}

// 運行遷移
if (require.main === module) {
    migrateTimeSlots()
        .then(() => {
            console.log('✅ 時間段遷移完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 時間段遷移失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateTimeSlots, getTimeSlotForClassFormat, calculateTotalTimeSlot, extractDurationFromClassTime };

