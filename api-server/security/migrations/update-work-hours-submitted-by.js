/**
 * 更新工時記錄腳本
 * 將 Staff_work_hours 集合中 submittedByName 為 "林浩文" 的記錄
 * 的 editorType 和 submittedByType 全部修改為 "admin"
 * 
 * 使用方法：
 * node security/migrations/update-work-hours-submitted-by.js
 * 
 * 注意：運行前請先備份數據庫！
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI;
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

if (!MONGO_BASE_URI) {
    console.error('❌ 錯誤: MONGO_BASE_URI 環境變量未設置');
    process.exit(1);
}

async function updateWorkHoursSubmittedBy() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        await client.connect();
        console.log('✅ 已連接到 MongoDB');
        
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Staff_work_hours');
        
        // 查找所有 submittedByName 為 "林浩文" 的記錄
        console.log('\n📋 開始查找 submittedByName 為 "林浩文" 的記錄...');
        const query = { submittedByName: '林浩文' };
        
        const records = await collection.find(query).toArray();
        console.log(`找到 ${records.length} 條記錄需要更新`);
        
        if (records.length === 0) {
            console.log('⚠️  沒有找到需要更新的記錄');
            return;
        }
        
        // 顯示將要更新的記錄信息（前5條作為示例）
        console.log('\n📝 將要更新的記錄示例（前5條）:');
        records.slice(0, 5).forEach((record, index) => {
            console.log(`  ${index + 1}. ID: ${record._id}`);
            console.log(`     員工: ${record.name || record.phone || 'N/A'}`);
            console.log(`     年月: ${record.year}/${record.month}`);
            console.log(`     當前 editorType: ${record.editorType || 'N/A'}`);
            console.log(`     當前 submittedByType: ${record.submittedByType || 'N/A'}`);
            console.log(`     提交者: ${record.submittedByName || 'N/A'}`);
        });
        
        if (records.length > 5) {
            console.log(`  ... 還有 ${records.length - 5} 條記錄`);
        }
        
        // 執行批量更新
        console.log('\n🔄 開始更新記錄...');
        const updateResult = await collection.updateMany(
            query,
            {
                $set: {
                    editorType: 'admin',
                    submittedByType: 'admin'
                }
            }
        );
        
        console.log(`\n✅ 更新完成！`);
        console.log(`   匹配的記錄數: ${updateResult.matchedCount}`);
        console.log(`   已修改的記錄數: ${updateResult.modifiedCount}`);
        
        // 驗證更新結果
        console.log('\n🔍 驗證更新結果...');
        const updatedRecords = await collection.find(query).toArray();
        const allUpdated = updatedRecords.every(record => 
            record.editorType === 'admin' && record.submittedByType === 'admin'
        );
        
        if (allUpdated) {
            console.log('✅ 所有記錄已成功更新為 admin');
        } else {
            console.warn('⚠️  部分記錄可能未正確更新，請檢查');
        }
        
        // 顯示更新後的記錄信息（前3條作為示例）
        console.log('\n📝 更新後的記錄示例（前3條）:');
        updatedRecords.slice(0, 3).forEach((record, index) => {
            console.log(`  ${index + 1}. ID: ${record._id}`);
            console.log(`     員工: ${record.name || record.phone || 'N/A'}`);
            console.log(`     年月: ${record.year}/${record.month}`);
            console.log(`     更新後 editorType: ${record.editorType}`);
            console.log(`     更新後 submittedByType: ${record.submittedByType}`);
        });
        
        console.log('\n✅ 腳本執行完成！');
        
    } catch (error) {
        console.error('❌ 更新失敗:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('✅ 已斷開 MongoDB 連接');
    }
}

// 運行腳本
if (require.main === module) {
    console.log('⚠️  警告: 此腳本將修改數據庫中的工時記錄！');
    console.log('⚠️  請確保已備份數據庫！');
    console.log('⚠️  將更新所有 submittedByName 為 "林浩文" 的記錄');
    console.log('⚠️  將把 editorType 和 submittedByType 設置為 "admin"');
    console.log('⚠️  5秒後開始執行...\n');
    
    setTimeout(() => {
        updateWorkHoursSubmittedBy().catch(console.error);
    }, 5000);
}

module.exports = { updateWorkHoursSubmittedBy };

