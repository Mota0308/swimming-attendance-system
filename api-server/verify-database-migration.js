/**
 * 數據庫遷移驗證腳本
 * 驗證 isEdited 字段和 Coach_roster 字段是否已正確遷移
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function verifyDatabaseMigration() {
    let client;
    
    try {
        console.log('🔍 開始驗證數據庫遷移結果...');
        
        // 連接 MongoDB
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        console.log('✅ 已連接到 MongoDB');
        
        const db = client.db(DEFAULT_DB_NAME);
        
        // ==================== 驗證 students_timeslot 集合 ====================
        console.log('\n📊 驗證 students_timeslot 集合...');
        const timeslotCollection = db.collection('students_timeslot');
        
        const totalTimeslots = await timeslotCollection.countDocuments({});
        const withIsEdited = await timeslotCollection.countDocuments({ isEdited: { $exists: true } });
        const isEditedTrue = await timeslotCollection.countDocuments({ isEdited: true });
        const isEditedFalse = await timeslotCollection.countDocuments({ isEdited: false });
        
        console.log(`   - 總記錄數：${totalTimeslots}`);
        console.log(`   - 有 isEdited 字段：${withIsEdited}`);
        console.log(`   - isEdited = true：${isEditedTrue}`);
        console.log(`   - isEdited = false：${isEditedFalse}`);
        
        // 驗證 isEdited 計算邏輯
        const sampleRecords = await timeslotCollection.find({}).limit(5).toArray();
        console.log('\n   📋 樣本記錄驗證：');
        for (const record of sampleRecords) {
            const isChangeDate = record.isChangeDate || false;
            const isChangeTime = record.isChangeTime || false;
            const isChangeLocation = record.isChangeLocation || false;
            const expectedIsEdited = isChangeDate || isChangeTime || isChangeLocation;
            const actualIsEdited = record.isEdited || false;
            
            if (expectedIsEdited === actualIsEdited) {
                console.log(`   ✅ 記錄 ${record._id}: isEdited=${actualIsEdited} (正確)`);
            } else {
                console.log(`   ❌ 記錄 ${record._id}: isEdited=${actualIsEdited} (應為 ${expectedIsEdited})`);
            }
        }
        
        // ==================== 驗證 Coach_roster 集合 ====================
        console.log('\n📊 驗證 Coach_roster 集合...');
        const rosterCollection = db.collection('Coach_roster');
        
        const totalRosters = await rosterCollection.countDocuments({});
        const withSlot = await rosterCollection.countDocuments({ slot: { $exists: true } });
        const withUnavailable = await rosterCollection.countDocuments({ unavailable: { $exists: true } });
        const withIsSubmitted = await rosterCollection.countDocuments({ isSubmitted: { $exists: true } });
        
        console.log(`   - 總記錄數：${totalRosters}`);
        console.log(`   - 有 slot 字段：${withSlot}`);
        console.log(`   - 有 unavailable 字段：${withUnavailable}`);
        console.log(`   - 有 isSubmitted 字段：${withIsSubmitted}`);
        
        // 驗證字段值
        const sampleRosters = await rosterCollection.find({}).limit(5).toArray();
        console.log('\n   📋 樣本記錄驗證：');
        for (const record of sampleRosters) {
            console.log(`   📝 記錄 ${record._id}:`);
            console.log(`      - slot: ${record.slot !== undefined ? record.slot : '缺失'}`);
            console.log(`      - unavailable: ${record.unavailable !== undefined ? record.unavailable : '缺失'}`);
            console.log(`      - isSubmitted: ${record.isSubmitted !== undefined ? record.isSubmitted : '缺失'}`);
        }
        
        // ==================== 總結 ====================
        console.log('\n📊 驗證總結：');
        const timeslotValid = withIsEdited === totalTimeslots;
        const rosterValid = withSlot === totalRosters && withUnavailable === totalRosters && withIsSubmitted === totalRosters;
        
        if (timeslotValid) {
            console.log('   ✅ students_timeslot 集合：所有記錄都有 isEdited 字段');
        } else {
            console.log(`   ⚠️ students_timeslot 集合：${totalTimeslots - withIsEdited} 條記錄缺少 isEdited 字段`);
        }
        
        if (rosterValid) {
            console.log('   ✅ Coach_roster 集合：所有記錄都有必要字段');
        } else {
            console.log(`   ⚠️ Coach_roster 集合：部分記錄缺少必要字段`);
            console.log(`      - 缺少 slot: ${totalRosters - withSlot} 條`);
            console.log(`      - 缺少 unavailable: ${totalRosters - withUnavailable} 條`);
            console.log(`      - 缺少 isSubmitted: ${totalRosters - withIsSubmitted} 條`);
        }
        
        if (timeslotValid && rosterValid) {
            console.log('\n✅ 所有驗證通過！數據庫遷移成功。');
        } else {
            console.log('\n⚠️ 部分驗證未通過，請檢查數據庫。');
        }
        
    } catch (error) {
        console.error('❌ 驗證失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ 已關閉 MongoDB 連接');
        }
    }
}

// 如果直接運行此腳本
if (require.main === module) {
    verifyDatabaseMigration()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 驗證失敗:', error);
            process.exit(1);
        });
}

module.exports = { verifyDatabaseMigration };

