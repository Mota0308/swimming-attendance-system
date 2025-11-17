/**
 * 日期格式統一遷移腳本
 * 將以下字段統一為 YYYY-MM-DD 字符串格式：
 * 1. Student_account 集合中的 birthday 字段
 * 2. trail_bill 集合中的 trialDate 字段
 * 3. Coach_roster 集合中的 date 字段
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

/**
 * 將日期值轉換為 YYYY-MM-DD 格式字符串
 */
function formatDateToYYYYMMDD(dateValue) {
    if (!dateValue) return null;
    
    // 如果已經是 YYYY-MM-DD 格式的字符串，直接返回
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }
    
    // 如果是 Date 對象，轉換為 YYYY-MM-DD
    let date;
    if (dateValue instanceof Date) {
        date = dateValue;
    } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
    } else {
        return null;
    }
    
    // 檢查日期是否有效
    if (isNaN(date.getTime())) {
        return null;
    }
    
    // 格式化為 YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * 遷移 Student_account 集合的 birthday 字段
 */
async function migrateStudentAccountBirthday(collection) {
    console.log('\n📋 開始遷移 Student_account 集合的 birthday 字段...');
    
    // 查找所有有 birthday 字段且不是 YYYY-MM-DD 格式的記錄
    const records = await collection.find({
        birthday: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`📊 找到 ${records.length} 條包含 birthday 字段的記錄`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const record of records) {
        try {
            const originalBirthday = record.birthday;
            
            // 如果已經是 YYYY-MM-DD 格式，跳過
            if (typeof originalBirthday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(originalBirthday)) {
                skippedCount++;
                continue;
            }
            
            // 格式化日期
            const formattedBirthday = formatDateToYYYYMMDD(originalBirthday);
            
            if (!formattedBirthday) {
                console.warn(`⚠️ 無法格式化 birthday (記錄 _id: ${record._id}):`, originalBirthday);
                errorCount++;
                continue;
            }
            
            // 更新記錄
            await collection.updateOne(
                { _id: record._id },
                { $set: { birthday: formattedBirthday } }
            );
            
            updatedCount++;
            
            if (updatedCount <= 10) {
                console.log(`✅ 更新記錄 _id=${record._id}: ${originalBirthday} -> ${formattedBirthday}`);
            }
        } catch (error) {
            errorCount++;
            console.error(`❌ 更新記錄失敗 _id=${record._id}:`, error.message);
        }
    }
    
    console.log(`\n✅ Student_account.birthday 遷移完成:`);
    console.log(`   - 總記錄數: ${records.length}`);
    console.log(`   - 已更新: ${updatedCount}`);
    console.log(`   - 已跳過（已是正確格式）: ${skippedCount}`);
    console.log(`   - 失敗: ${errorCount}`);
    
    return { updated: updatedCount, skipped: skippedCount, errors: errorCount };
}

/**
 * 遷移 trail_bill 集合的 trialDate 字段
 */
async function migrateTrialBillTrialDate(collection) {
    console.log('\n📋 開始遷移 trail_bill 集合的 trialDate 字段...');
    
    // 查找所有有 trialDate 字段且不是 YYYY-MM-DD 格式的記錄
    const records = await collection.find({
        trialDate: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`📊 找到 ${records.length} 條包含 trialDate 字段的記錄`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const record of records) {
        try {
            const originalTrialDate = record.trialDate;
            
            // 如果已經是 YYYY-MM-DD 格式，跳過
            if (typeof originalTrialDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(originalTrialDate)) {
                skippedCount++;
                continue;
            }
            
            // 格式化日期
            const formattedTrialDate = formatDateToYYYYMMDD(originalTrialDate);
            
            if (!formattedTrialDate) {
                console.warn(`⚠️ 無法格式化 trialDate (記錄 _id: ${record._id}):`, originalTrialDate);
                errorCount++;
                continue;
            }
            
            // 更新記錄
            await collection.updateOne(
                { _id: record._id },
                { $set: { trialDate: formattedTrialDate } }
            );
            
            updatedCount++;
            
            if (updatedCount <= 10) {
                console.log(`✅ 更新記錄 _id=${record._id}: ${originalTrialDate} -> ${formattedTrialDate}`);
            }
        } catch (error) {
            errorCount++;
            console.error(`❌ 更新記錄失敗 _id=${record._id}:`, error.message);
        }
    }
    
    console.log(`\n✅ trail_bill.trialDate 遷移完成:`);
    console.log(`   - 總記錄數: ${records.length}`);
    console.log(`   - 已更新: ${updatedCount}`);
    console.log(`   - 已跳過（已是正確格式）: ${skippedCount}`);
    console.log(`   - 失敗: ${errorCount}`);
    
    return { updated: updatedCount, skipped: skippedCount, errors: errorCount };
}

/**
 * 遷移 Coach_roster 集合的 date 字段
 */
async function migrateCoachRosterDate(collection) {
    console.log('\n📋 開始遷移 Coach_roster 集合的 date 字段...');
    
    // 查找所有有 date 字段且不是 YYYY-MM-DD 格式的記錄
    const records = await collection.find({
        date: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`📊 找到 ${records.length} 條包含 date 字段的記錄`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const record of records) {
        try {
            const originalDate = record.date;
            
            // 如果已經是 YYYY-MM-DD 格式，跳過
            if (typeof originalDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(originalDate)) {
                skippedCount++;
                continue;
            }
            
            // 格式化日期
            const formattedDate = formatDateToYYYYMMDD(originalDate);
            
            if (!formattedDate) {
                console.warn(`⚠️ 無法格式化 date (記錄 _id: ${record._id}):`, originalDate);
                errorCount++;
                continue;
            }
            
            // 更新記錄
            await collection.updateOne(
                { _id: record._id },
                { $set: { date: formattedDate } }
            );
            
            updatedCount++;
            
            if (updatedCount <= 10) {
                console.log(`✅ 更新記錄 _id=${record._id}: ${originalDate} -> ${formattedDate}`);
            }
        } catch (error) {
            errorCount++;
            console.error(`❌ 更新記錄失敗 _id=${record._id}:`, error.message);
        }
    }
    
    console.log(`\n✅ Coach_roster.date 遷移完成:`);
    console.log(`   - 總記錄數: ${records.length}`);
    console.log(`   - 已更新: ${updatedCount}`);
    console.log(`   - 已跳過（已是正確格式）: ${skippedCount}`);
    console.log(`   - 失敗: ${errorCount}`);
    
    return { updated: updatedCount, skipped: skippedCount, errors: errorCount };
}

/**
 * 主遷移函數
 */
async function migrateDateFormats() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        console.log('🔗 正在連接 MongoDB...');
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        console.log(`✅ 已連接到數據庫: ${DEFAULT_DB_NAME}\n`);
        
        // 遷移 Student_account 集合
        const studentAccountCollection = db.collection('Student_account');
        const studentResult = await migrateStudentAccountBirthday(studentAccountCollection);
        
        // 遷移 trail_bill 集合
        const trailBillCollection = db.collection('trail_bill');
        const trialResult = await migrateTrialBillTrialDate(trailBillCollection);
        
        // 遷移 Coach_roster 集合
        const coachRosterCollection = db.collection('Coach_roster');
        const rosterResult = await migrateCoachRosterDate(coachRosterCollection);
        
        // 總結
        console.log('\n' + '='.repeat(60));
        console.log('📊 遷移總結');
        console.log('='.repeat(60));
        console.log('Student_account.birthday:');
        console.log(`   - 已更新: ${studentResult.updated}`);
        console.log(`   - 已跳過: ${studentResult.skipped}`);
        console.log(`   - 失敗: ${studentResult.errors}`);
        console.log('\ntrail_bill.trialDate:');
        console.log(`   - 已更新: ${trialResult.updated}`);
        console.log(`   - 已跳過: ${trialResult.skipped}`);
        console.log(`   - 失敗: ${trialResult.errors}`);
        console.log('\nCoach_roster.date:');
        console.log(`   - 已更新: ${rosterResult.updated}`);
        console.log(`   - 已跳過: ${rosterResult.skipped}`);
        console.log(`   - 失敗: ${rosterResult.errors}`);
        console.log('\n✅ 所有日期格式遷移完成！');
        
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
    migrateDateFormats().catch(console.error);
}

module.exports = { migrateDateFormats, formatDateToYYYYMMDD };




























