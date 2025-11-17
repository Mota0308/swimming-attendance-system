/**
 * 數據遷移腳本：更新 Staff_work_hours 集合中的 editorType 字段
 * 
 * 問題：部分記錄的 editorType 為 null，導致比較功能無法正常工作
 * 解決方案：根據 submittedByType 或 type 字段來設置 editorType
 * 
 * 規則：
 * - 如果 editorType 已經有值（非 null 且非空字符串），則跳過
 * - 如果 editorType 為 null 或空字符串，則根據以下優先級設置：
 *   1. 優先使用 submittedByType
 *   2. 如果 submittedByType 不存在或為空，則使用 type
 *   3. 如果兩者都不存在，則設置為 'unknown'（需要手動處理）
 */

const { MongoClient } = require('mongodb');

// ✅ 從環境變量或默認值獲取 MongoDB 連接字符串（與 server.js 保持一致）
const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

let client;

/**
 * 連接到 MongoDB
 */
async function connectToMongoDB() {
    try {
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        console.log('✅ 已連接到 MongoDB');
        console.log(`📊 使用數據庫: ${DEFAULT_DB_NAME}`);
        return client;
    } catch (error) {
        console.error('❌ 連接 MongoDB 失敗:', error);
        throw error;
    }
}

/**
 * 更新 editorType 字段
 */
async function migrateEditorType() {
    try {
        await connectToMongoDB();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Staff_work_hours');
        
        console.log('📊 開始遷移 editorType 字段...');
        
        // ✅ 先查看一些示例記錄，了解數據結構
        const sampleRecords = await collection.find({}).limit(5).toArray();
        console.log('\n📋 示例記錄（前5條）:');
        sampleRecords.forEach((record, index) => {
            console.log(`   ${index + 1}. _id: ${record._id}`);
            console.log(`      editorType: ${record.editorType} (type: ${typeof record.editorType})`);
            console.log(`      submittedByType: ${record.submittedByType || 'N/A'}`);
            console.log(`      type: ${record.type || 'N/A'}`);
            console.log(`      phone: ${record.phone}`);
            console.log(`      workDate: ${record.workDate}`);
            console.log('');
        });
        
        // ✅ 查找所有需要更新的記錄（editorType 為 null、空字符串或不存在）
        const recordsToUpdate = await collection.find({
            $or: [
                { editorType: null },
                { editorType: '' },
                { editorType: { $exists: false } }
            ]
        }).toArray();
        
        console.log(`📋 找到 ${recordsToUpdate.length} 條需要更新的記錄`);
        
        // ✅ 如果沒有找到，嘗試查找所有記錄，看看 editorType 的分布
        if (recordsToUpdate.length === 0) {
            const totalCount = await collection.countDocuments({});
            const withEditorType = await collection.countDocuments({ editorType: { $ne: null, $ne: '' } });
            const withoutEditorType = await collection.countDocuments({ 
                $or: [
                    { editorType: null },
                    { editorType: '' },
                    { editorType: { $exists: false } }
                ]
            });
            
            console.log(`\n📊 數據統計:`);
            console.log(`   總記錄數: ${totalCount}`);
            console.log(`   有 editorType: ${withEditorType}`);
            console.log(`   無 editorType: ${withoutEditorType}`);
            
            // ✅ 查找所有記錄，檢查是否有 editorType 為 null 但需要更新的
            const allRecords = await collection.find({}).limit(10).toArray();
            const recordsNeedingUpdate = allRecords.filter(r => {
                const hasEditorType = r.editorType && r.editorType !== '';
                const hasSubmittedByType = r.submittedByType && r.submittedByType !== '';
                const hasType = r.type && r.type !== '';
                // 如果沒有 editorType 但有 submittedByType 或 type，則需要更新
                return !hasEditorType && (hasSubmittedByType || hasType);
            });
            
            if (recordsNeedingUpdate.length > 0) {
                console.log(`\n⚠️ 發現 ${recordsNeedingUpdate.length} 條記錄可能需要更新（在前10條中）`);
                console.log('   這些記錄有 submittedByType 或 type，但 editorType 為空');
            }
        }
        
        if (recordsToUpdate.length === 0) {
            console.log('✅ 沒有需要更新的記錄');
            return;
        }
        
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // ✅ 統計信息
        const stats = {
            fromSubmittedByType: 0,
            fromType: 0,
            setToUnknown: 0
        };
        
        for (const record of recordsToUpdate) {
            try {
                let newEditorType = null;
                let source = '';
                
                // ✅ 優先使用 submittedByType
                if (record.submittedByType && record.submittedByType.trim() !== '') {
                    newEditorType = record.submittedByType.trim();
                    source = 'submittedByType';
                    stats.fromSubmittedByType++;
                }
                // ✅ 如果 submittedByType 不存在，則使用 type
                else if (record.type && record.type.trim() !== '') {
                    newEditorType = record.type.trim();
                    source = 'type';
                    stats.fromType++;
                }
                // ✅ 如果兩者都不存在，設置為 'unknown'（需要手動處理）
                else {
                    newEditorType = 'unknown';
                    source = 'none';
                    stats.setToUnknown++;
                    console.warn(`⚠️ 記錄 ${record._id} 沒有 submittedByType 或 type 字段，設置為 'unknown'`);
                }
                
                // ✅ 更新記錄
                const result = await collection.updateOne(
                    { _id: record._id },
                    { 
                        $set: { 
                            editorType: newEditorType,
                            migratedAt: new Date()
                        } 
                    }
                );
                
                if (result.modifiedCount > 0) {
                    updatedCount++;
                    if (updatedCount % 100 === 0) {
                        console.log(`📝 已更新 ${updatedCount} 條記錄...`);
                    }
                } else {
                    skippedCount++;
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ 更新記錄 ${record._id} 失敗:`, error.message);
            }
        }
        
        console.log('\n📊 遷移完成統計:');
        console.log(`   ✅ 成功更新: ${updatedCount} 條`);
        console.log(`   ⏭️  跳過: ${skippedCount} 條`);
        console.log(`   ❌ 錯誤: ${errorCount} 條`);
        console.log(`\n📊 數據來源統計:`);
        console.log(`   - 從 submittedByType 設置: ${stats.fromSubmittedByType} 條`);
        console.log(`   - 從 type 設置: ${stats.fromType} 條`);
        console.log(`   - 設置為 'unknown': ${stats.setToUnknown} 條`);
        
        // ✅ 驗證：檢查是否還有 editorType 為 null 的記錄
        const remainingNullRecords = await collection.countDocuments({
            $or: [
                { editorType: null },
                { editorType: '' },
                { editorType: { $exists: false } }
            ]
        });
        
        if (remainingNullRecords > 0) {
            console.warn(`\n⚠️ 仍有 ${remainingNullRecords} 條記錄的 editorType 為 null，可能需要手動處理`);
        } else {
            console.log('\n✅ 所有記錄的 editorType 都已更新');
        }
        
        // ✅ 顯示一些示例記錄（更新後的前5條）
        const updatedSampleRecords = await collection.find({
            editorType: { $ne: null, $ne: '' }
        }).limit(5).toArray();
        
        if (updatedSampleRecords.length > 0) {
            console.log('\n📋 示例記錄（更新後）:');
            updatedSampleRecords.forEach((record, index) => {
                console.log(`   ${index + 1}. _id: ${record._id}`);
                console.log(`      editorType: ${record.editorType}`);
                console.log(`      submittedByType: ${record.submittedByType || 'N/A'}`);
                console.log(`      type: ${record.type || 'N/A'}`);
                console.log(`      phone: ${record.phone}`);
                console.log(`      workDate: ${record.workDate}`);
                console.log('');
            });
        }
        
    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('✅ 已關閉 MongoDB 連接');
        }
    }
}

// ✅ 執行遷移
if (require.main === module) {
    migrateEditorType()
        .then(() => {
            console.log('\n✅ 遷移完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 遷移失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateEditorType };

