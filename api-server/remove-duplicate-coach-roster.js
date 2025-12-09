/**
 * 清理腳本：刪除同一個員工的相同 date 的多餘資料格
 * 
 * 功能：
 * 1. 查找 Coach_roster 集合中，同一個員工（phone）在同一個日期（date）有多條記錄的情況
 * 2. 對於每個重複組，保留一條記錄（優先保留最新的，或根據 updatedAt 排序）
 * 3. 刪除其他重複記錄
 * 
 * 用法: node remove-duplicate-coach-roster.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

/**
 * 將日期值轉換為標準化的字符串格式（用於分組）
 */
function normalizeDate(dateValue) {
    if (!dateValue) return null;

    // 如果已經是 YYYY-MM-DD 格式的字符串，直接返回
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }

    // 如果是 Date 對象或其他格式，轉換為 YYYY-MM-DD
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

async function removeDuplicateCoachRoster() {
    let client;
    try {
        console.log('🔄 開始清理 Coach_roster 集合中的重複記錄...\n');

        client = await MongoClient.connect(MONGO_BASE_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 30000,
            retryWrites: true,
            retryReads: true
        });
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_roster');

        // 1. 獲取所有記錄
        console.log('📋 查詢所有 Coach_roster 記錄...');
        const allRecords = await collection.find({}).toArray();
        console.log(`✅ 找到 ${allRecords.length} 條記錄\n`);

        if (allRecords.length === 0) {
            console.log('⚠️ 沒有找到任何記錄，清理結束');
            return;
        }

        // 2. 按 phone + date 分組，找出重複記錄
        console.log('🔍 分析重複記錄...');
        const groupedRecords = new Map(); // key: "phone|date", value: [records]

        allRecords.forEach(record => {
            const phone = record.phone || '';
            const normalizedDate = normalizeDate(record.date);
            
            if (!phone || !normalizedDate) {
                console.warn(`⚠️ 跳過無效記錄 (缺少 phone 或 date):`, {
                    _id: record._id,
                    phone: phone,
                    date: record.date
                });
                return;
            }

            const key = `${phone}|${normalizedDate}`;
            
            if (!groupedRecords.has(key)) {
                groupedRecords.set(key, []);
            }
            groupedRecords.get(key).push(record);
        });

        console.log(`📊 共找到 ${groupedRecords.size} 個唯一的 phone+date 組合\n`);

        // 3. 找出有重複的組
        const duplicateGroups = [];
        groupedRecords.forEach((records, key) => {
            if (records.length > 1) {
                duplicateGroups.push({
                    key: key,
                    phone: records[0].phone,
                    date: normalizeDate(records[0].date),
                    count: records.length,
                    records: records
                });
            }
        });

        console.log(`🔍 找到 ${duplicateGroups.length} 組重複記錄\n`);

        if (duplicateGroups.length === 0) {
            console.log('✅ 沒有發現重複記錄，清理結束');
            return;
        }

        // 4. 顯示重複記錄統計
        console.log('📊 重複記錄統計:');
        duplicateGroups.forEach((group, index) => {
            console.log(`  ${index + 1}. 員工 ${group.phone}, 日期 ${group.date}: ${group.count} 條記錄`);
        });
        console.log('');

        // 5. 對於每個重複組，保留一條記錄，刪除其他記錄
        let totalDeleted = 0;
        let totalKept = 0;
        const deletionDetails = [];

        for (let i = 0; i < duplicateGroups.length; i++) {
            const group = duplicateGroups[i];
            const records = group.records;

            // ✅ 排序規則：優先保留最新的記錄（根據 updatedAt 或 _id）
            records.sort((a, b) => {
                // ✅ 輔助函數：將日期值轉換為 Date 對象
                const toDate = (dateValue) => {
                    if (!dateValue) return new Date(0);
                    if (dateValue instanceof Date) return dateValue;
                    if (typeof dateValue === 'string') {
                        const parsed = new Date(dateValue);
                        return isNaN(parsed.getTime()) ? new Date(0) : parsed;
                    }
                    return new Date(0);
                };
                
                // 優先比較 updatedAt
                const aUpdated = toDate(a.updatedAt || a.createdAt);
                const bUpdated = toDate(b.updatedAt || b.createdAt);
                
                const aTime = aUpdated.getTime();
                const bTime = bUpdated.getTime();
                
                if (aTime !== bTime) {
                    return bTime - aTime; // 降序，最新的在前
                }
                // 如果 updatedAt 相同，比較 _id（ObjectId 包含時間戳）
                return b._id.toString().localeCompare(a._id.toString());
            });

            // ✅ 保留第一條（最新的），刪除其他
            const recordToKeep = records[0];
            const recordsToDelete = records.slice(1);

            console.log(`\n📝 處理重複組 ${i + 1}/${duplicateGroups.length}:`);
            console.log(`   員工: ${group.phone}, 日期: ${group.date}`);
            console.log(`   保留記錄 _id: ${recordToKeep._id}`);
            console.log(`   將刪除 ${recordsToDelete.length} 條記錄`);

            // 刪除重複記錄
            const idsToDelete = recordsToDelete.map(r => r._id);
            const deleteResult = await collection.deleteMany({
                _id: { $in: idsToDelete }
            });

            totalDeleted += deleteResult.deletedCount;
            totalKept += 1;

            deletionDetails.push({
                phone: group.phone,
                date: group.date,
                kept: recordToKeep._id.toString(),
                deleted: idsToDelete.map(id => id.toString()),
                deletedCount: deleteResult.deletedCount
            });

            if ((i + 1) % 10 === 0) {
                console.log(`\n📊 進度: ${i + 1}/${duplicateGroups.length} 組已處理...`);
            }
        }

        // 6. 顯示清理結果
        console.log('\n=== 清理結果統計 ===');
        console.log(`總重複組數: ${duplicateGroups.length}`);
        console.log(`保留記錄數: ${totalKept}`);
        console.log(`刪除記錄數: ${totalDeleted}`);
        console.log(`剩餘記錄數: ${allRecords.length - totalDeleted}`);

        // 7. 顯示詳細信息（前 10 組）
        console.log('\n=== 清理詳情（前 10 組）===');
        deletionDetails.slice(0, 10).forEach((detail, index) => {
            console.log(`\n${index + 1}. 員工 ${detail.phone}, 日期 ${detail.date}:`);
            console.log(`   保留: ${detail.kept}`);
            console.log(`   刪除: ${detail.deletedCount} 條記錄`);
            if (detail.deleted.length <= 3) {
                console.log(`   刪除的 _id: ${detail.deleted.join(', ')}`);
            } else {
                console.log(`   刪除的 _id: ${detail.deleted.slice(0, 3).join(', ')} ... (共 ${detail.deleted.length} 條)`);
            }
        });

        if (deletionDetails.length > 10) {
            console.log(`\n... 還有 ${deletionDetails.length - 10} 組未顯示`);
        }

        // 8. 驗證清理結果
        console.log('\n=== 驗證清理結果 ===');
        const remainingRecords = await collection.find({}).toArray();
        const remainingGrouped = new Map();
        
        remainingRecords.forEach(record => {
            const phone = record.phone || '';
            const normalizedDate = normalizeDate(record.date);
            if (phone && normalizedDate) {
                const key = `${phone}|${normalizedDate}`;
                if (!remainingGrouped.has(key)) {
                    remainingGrouped.set(key, 0);
                }
                remainingGrouped.set(key, remainingGrouped.get(key) + 1);
            }
        });

        const stillDuplicates = Array.from(remainingGrouped.entries())
            .filter(([key, count]) => count > 1);

        if (stillDuplicates.length > 0) {
            console.warn(`⚠️ 仍有 ${stillDuplicates.length} 組重複記錄未被清理:`);
            stillDuplicates.slice(0, 5).forEach(([key, count]) => {
                console.warn(`   ${key}: ${count} 條記錄`);
            });
        } else {
            console.log('✅ 驗證通過：沒有發現剩餘的重複記錄');
        }

        console.log('\n✅ 清理完成！');

    } catch (error) {
        console.error('❌ 清理失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ MongoDB 連接已關閉');
        }
    }
}

// 運行清理函數
if (require.main === module) {
    removeDuplicateCoachRoster()
        .then(() => {
            console.log('\n🎉 腳本執行完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ 腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = { removeDuplicateCoachRoster, normalizeDate };

