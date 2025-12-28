/**
 * 重新排序 trail_bill 集合中的 trailId
 * 
 * 功能：
 * 1. 查詢所有 trail_bill 記錄
 * 2. 按照創建時間（createdAt）排序
 * 3. 重新分配 trailId 從 T000001 開始
 * 4. 更新 Counters 集合中的計數器
 * 
 * 使用方法：
 * node scripts/reorder-trail-ids.js
 */

const { MongoClient } = require('mongodb');

// ✅ 配置：請根據實際情況修改
// 優先使用 MONGO_BASE_URI（與 server.js 保持一致）
const MONGODB_URI = process.env.MONGO_BASE_URI || process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DEFAULT_DB_NAME || process.env.DB_NAME || 'test';

// ✅ 生成 trailId（格式：T + 6位數字）
function generateTrailId(sequence) {
    return `T${String(sequence).padStart(6, '0')}`;
}

async function reorderTrailIds() {
    let client;
    
    try {
        console.log('🔌 連接到 MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ MongoDB 連接成功');
        
        const db = client.db(DB_NAME);
        const trailBillCollection = db.collection('trail_bill');
        const countersCollection = db.collection('Counters');
        
        // ✅ 1. 查詢所有 trail_bill 記錄
        console.log('📋 查詢所有 trail_bill 記錄...');
        const allRecords = await trailBillCollection.find({}).toArray();
        console.log(`✅ 找到 ${allRecords.length} 條記錄`);
        
        if (allRecords.length === 0) {
            console.log('⚠️ 沒有找到任何記錄，無需重新排序');
            return;
        }
        
        // ✅ 2. 按照創建時間排序（如果沒有 createdAt，使用 _id）
        console.log('🔄 按創建時間排序...');
        allRecords.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a._id.getTimestamp().getTime();
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b._id.getTimestamp().getTime();
            return timeA - timeB;
        });
        console.log('✅ 排序完成');
        
        // ✅ 3. 檢查是否有重複的 trailId
        console.log('🔍 檢查重複的 trailId...');
        const existingTrailIds = new Set();
        const duplicateRecords = [];
        
        allRecords.forEach((record, index) => {
            const trailId = record.trailId || record.TrailID; // 兼容舊格式
            if (trailId) {
                if (existingTrailIds.has(trailId)) {
                    duplicateRecords.push({ index, trailId, _id: record._id });
                } else {
                    existingTrailIds.add(trailId);
                }
            }
        });
        
        if (duplicateRecords.length > 0) {
            console.log(`⚠️ 發現 ${duplicateRecords.length} 個重複的 trailId:`);
            duplicateRecords.forEach(dup => {
                console.log(`   - 記錄 ${dup.index + 1}: ${dup.trailId} (_id: ${dup._id})`);
            });
        } else {
            console.log('✅ 沒有發現重複的 trailId');
        }
        
        // ✅ 4. 重新分配 trailId
        console.log('🔄 開始重新分配 trailId...');
        const updates = [];
        let sequence = 1;
        
        for (const record of allRecords) {
            const newTrailId = generateTrailId(sequence);
            const oldTrailId = record.trailId || record.TrailID;
            
            // 如果新的 trailId 與舊的相同，跳過
            if (oldTrailId === newTrailId) {
                console.log(`   ⏭️  記錄 ${sequence}: ${oldTrailId} 無需更新`);
                sequence++;
                continue;
            }
            
            updates.push({
                filter: { _id: record._id },
                update: {
                    $set: {
                        trailId: newTrailId,
                        updatedAt: new Date()
                    },
                    $unset: {
                        TrailID: '' // 移除舊格式（如果存在）
                    }
                }
            });
            
            console.log(`   📝 記錄 ${sequence}: ${oldTrailId || '(無)'} → ${newTrailId}`);
            sequence++;
        }
        
        if (updates.length === 0) {
            console.log('✅ 所有 trailId 已經按順序排列，無需更新');
        } else {
            // ✅ 5. 執行批量更新
            console.log(`\n💾 開始批量更新 ${updates.length} 條記錄...`);
            const bulkOps = updates.map(({ filter, update }) => ({
                updateOne: { filter, update }
            }));
            
            const result = await trailBillCollection.bulkWrite(bulkOps, { ordered: false });
            console.log(`✅ 批量更新完成:`);
            console.log(`   - 已更新: ${result.modifiedCount} 條`);
            console.log(`   - 已匹配: ${result.matchedCount} 條`);
            
            if (result.writeErrors && result.writeErrors.length > 0) {
                console.error('❌ 更新過程中出現錯誤:');
                result.writeErrors.forEach(err => {
                    console.error(`   - ${err.errmsg}`);
                });
            }
        }
        
        // ✅ 6. 更新 Counters 集合中的計數器
        console.log('\n🔄 更新 Counters 集合中的計數器...');
        const newSequence = allRecords.length;
        await countersCollection.findOneAndUpdate(
            { _id: 'trail_bill_trailId_seq' },
            { $set: { seq: newSequence } },
            { upsert: true }
        );
        console.log(`✅ 計數器已更新為: ${newSequence}`);
        console.log(`   （下一個 trailId 將是: ${generateTrailId(newSequence + 1)}）`);
        
        console.log('\n✅ 重新排序完成！');
        console.log(`📊 統計:`);
        console.log(`   - 總記錄數: ${allRecords.length}`);
        console.log(`   - 已更新: ${updates.length}`);
        console.log(`   - 無需更新: ${allRecords.length - updates.length}`);
        
    } catch (error) {
        console.error('❌ 重新排序失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB 連接已關閉');
        }
    }
}

// ✅ 執行腳本
if (require.main === module) {
    reorderTrailIds()
        .then(() => {
            console.log('\n✅ 腳本執行成功');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = { reorderTrailIds, generateTrailId };

