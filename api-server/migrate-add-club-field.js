/**
 * 遷移腳本：為 Admin_account 集合中沒有 club 字段的記錄添加該字段
 * 
 * 遷移內容：
 * 1. 為所有沒有 club 字段的記錄添加 club: []（空數組）
 * 2. 如果 club 字段存在但為 null 或 undefined，也設置為空數組
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function migrateAddClubField() {
    let client;
    try {
        console.log('🔄 開始遷移 Admin_account 添加 club 字段...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        // 查找需要遷移的記錄（沒有 club 字段，或 club 為 null/undefined）
        const recordsToMigrate = await collection.find({
            $or: [
                { club: { $exists: false } },
                { club: null },
                { club: undefined }
            ]
        }).toArray();
        
        console.log(`\n📊 找到需要遷移的記錄：${recordsToMigrate.length} 條`);
        
        if (recordsToMigrate.length === 0) {
            console.log('✅ 所有記錄都已包含 club 字段，無需遷移');
            return;
        }
        
        let updatedCount = 0;
        let errors = [];
        
        // 遷移記錄
        console.log('\n🔄 開始添加 club 字段...');
        for (const record of recordsToMigrate) {
            try {
                const result = await collection.updateOne(
                    { _id: record._id },
                    {
                        $set: {
                            club: [],
                            updatedAt: new Date()
                        }
                    }
                );
                
                if (result.modifiedCount > 0) {
                    updatedCount++;
                    console.log(`  ✅ ${record.name || '未知'} (${record.phone || '未知'}): 已添加 club: []`);
                }
            } catch (error) {
                console.error(`❌ 遷移失敗: ${record._id}`, error.message);
                errors.push({ record: record._id, error: error.message });
            }
        }
        
        console.log(`\n✅ 遷移完成：`);
        console.log(`  - 成功更新：${updatedCount} 條記錄`);
        console.log(`  - 失敗：${errors.length} 條記錄`);
        
        if (errors.length > 0) {
            console.log('\n❌ 失敗的記錄：');
            errors.forEach(err => {
                console.log(`  - ${err.record}: ${err.error}`);
            });
        }
        
        // 驗證遷移結果
        console.log('\n🔍 驗證遷移結果...');
        const remainingRecords = await collection.find({
            $or: [
                { club: { $exists: false } },
                { club: null },
                { club: undefined }
            ]
        }).toArray();
        
        if (remainingRecords.length === 0) {
            console.log('✅ 驗證通過：所有記錄都已包含 club 字段');
        } else {
            console.warn(`⚠️  仍有 ${remainingRecords.length} 條記錄缺少 club 字段`);
        }
        
    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ 已斷開 MongoDB 連接');
        }
    }
}

// 運行遷移
if (require.main === module) {
    migrateAddClubField()
        .then(() => {
            console.log('\n✅ 遷移腳本執行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 遷移腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateAddClubField };

