/**
 * 遷移腳本：將 Staff_work_hours 集合中的 feeContent 數據遷移到 receipt 集合
 * 
 * 此腳本會：
 * 1. 從 Staff_work_hours 集合中讀取所有有 feeContent 的記錄
 * 2. 解析 feeContent（JSON 字符串）為數組
 * 3. 將每個內容項轉換為 receipt 記錄
 * 4. 保存到 receipt 集合（使用 upsert 避免重複）
 * 
 * 使用方法：
 * node api-server/security/migrations/migrate-fee-content-to-receipt.js
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

/**
 * 提取收據 URL（兼容多個字段名）
 */
function extractReceiptUrl(item) {
    if (!item || typeof item !== 'object') return '';
    return item.receiptImageUrl || item.receiptUrl || item.receipt || item.receiptLink || '';
}

/**
 * 檢查內容項是否有有效數據
 */
function hasValidContent(item) {
    if (!item || typeof item !== 'object') return false;
    const type = String(item?.type || '').trim();
    const amount = String(item?.amount || '').trim();
    const note = String(item?.note || '').trim();
    const receiptUrl = extractReceiptUrl(item);
    return Boolean(type || amount || note || receiptUrl);
}

async function migrateFeeContentToReceipt() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        await client.connect();
        console.log('✅ 已連接到 MongoDB');
        
        const db = client.db(DEFAULT_DB_NAME);
        const workHoursCollection = db.collection('Staff_work_hours');
        const receiptCollection = db.collection('receipt');
        const adminCollection = db.collection('Admin_account');
        
        // 查找所有有 feeContent 的記錄
        console.log('\n📋 開始查找有 feeContent 的記錄...');
        const query = {
            feeContent: { $exists: true, $ne: null, $ne: '' }
        };
        
        const workHoursRecords = await workHoursCollection.find(query).toArray();
        console.log(`找到 ${workHoursRecords.length} 條有 feeContent 的記錄`);
        
        if (workHoursRecords.length === 0) {
            console.log('⚠️  沒有找到需要遷移的記錄');
            return;
        }
        
        // 構建員工信息緩存（用於獲取 employeeId）
        console.log('\n📋 構建員工信息緩存...');
        const employeeInfoCache = new Map();
        const uniquePhones = new Set();
        
        workHoursRecords.forEach(record => {
            if (record.phone) uniquePhones.add(record.phone);
        });
        
        if (uniquePhones.size > 0) {
            const employeeQueries = Array.from(uniquePhones).map(phone => 
                adminCollection.findOne({ phone: phone })
            );
            const employeeResults = await Promise.all(employeeQueries);
            
            employeeResults.forEach(emp => {
                if (emp) {
                    if (emp.phone) employeeInfoCache.set(emp.phone, emp);
                    if (emp.employeeId) employeeInfoCache.set(emp.phone, { ...employeeInfoCache.get(emp.phone), employeeId: emp.employeeId });
                }
            });
        }
        
        console.log(`緩存了 ${employeeInfoCache.size} 個員工信息`);
        
        // 處理每條記錄
        console.log('\n🔄 開始處理記錄...');
        let totalReceipts = 0;
        let totalProcessed = 0;
        let totalSkipped = 0;
        let totalErrors = 0;
        
        const receiptOperations = [];
        
        for (const record of workHoursRecords) {
            try {
                const feeContent = record.feeContent;
                if (!feeContent || feeContent.trim() === '') {
                    totalSkipped++;
                    continue;
                }
                
                // 解析 feeContent（JSON 字符串）
                let contentArray = [];
                try {
                    const parsed = JSON.parse(feeContent);
                    if (Array.isArray(parsed)) {
                        contentArray = parsed;
                    } else {
                        console.warn(`⚠️  記錄 ${record._id} 的 feeContent 不是數組格式，跳過`);
                        totalSkipped++;
                        continue;
                    }
                } catch (parseError) {
                    console.warn(`⚠️  記錄 ${record._id} 的 feeContent 解析失敗:`, parseError.message);
                    totalSkipped++;
                    continue;
                }
                
                // 過濾出有效的內容項
                const validItems = contentArray.filter(hasValidContent);
                if (validItems.length === 0) {
                    totalSkipped++;
                    continue;
                }
                
                // 獲取員工信息
                const phone = record.phone;
                const employeeInfo = employeeInfoCache.get(phone);
                const employeeId = employeeInfo?.employeeId || phone;
                
                // 處理每個內容項
                for (const item of validItems) {
                    const type = String(item?.type || '').trim();
                    const amount = String(item?.amount || '').trim();
                    const note = String(item?.note || '').trim();
                    const club = String(item?.club || '').trim();
                    const receiptImageUrl = extractReceiptUrl(item);
                    
                    // 構建唯一鍵（用於 upsert）
                    const receiptKey = {
                        employeeId: employeeId,
                        phone: phone,
                        workDate: record.workDate,
                        year: record.year,
                        month: record.month,
                        type: type,
                        amount: amount,
                        note: note,
                        club: club,
                        receiptImageUrl: receiptImageUrl,
                        editorType: record.editorType || 'coach'
                    };
                    
                    // 構建要保存的 receipt 記錄
                    const receiptToSave = {
                        ...receiptKey,
                        submittedBy: record.submittedBy || phone,
                        submittedByName: record.submittedByName || record.name || '',
                        submittedByType: record.submittedByType || record.editorType || 'coach',
                        updatedAt: new Date()
                    };
                    
                    // 添加到批量操作
                    receiptOperations.push({
                        updateOne: {
                            filter: receiptKey,
                            update: {
                                $set: receiptToSave,
                                $setOnInsert: { createdAt: new Date() }
                            },
                            upsert: true
                        }
                    });
                    
                    totalReceipts++;
                }
                
                totalProcessed++;
                
                // 每處理 100 條記錄顯示進度
                if (totalProcessed % 100 === 0) {
                    console.log(`  已處理 ${totalProcessed}/${workHoursRecords.length} 條記錄，生成 ${totalReceipts} 個 receipt 記錄...`);
                }
                
            } catch (error) {
                console.error(`❌ 處理記錄 ${record._id} 時出錯:`, error.message);
                totalErrors++;
            }
        }
        
        console.log(`\n📊 處理統計:`);
        console.log(`   總記錄數: ${workHoursRecords.length}`);
        console.log(`   成功處理: ${totalProcessed}`);
        console.log(`   跳過記錄: ${totalSkipped}`);
        console.log(`   錯誤記錄: ${totalErrors}`);
        console.log(`   生成的 receipt 記錄數: ${totalReceipts}`);
        
        // 執行批量寫入
        if (receiptOperations.length > 0) {
            console.log(`\n💾 開始批量保存到 receipt 集合...`);
            const batchSize = 1000;
            let savedCount = 0;
            let insertedCount = 0;
            let modifiedCount = 0;
            
            for (let i = 0; i < receiptOperations.length; i += batchSize) {
                const batch = receiptOperations.slice(i, i + batchSize);
                const result = await receiptCollection.bulkWrite(batch, { ordered: false });
                
                savedCount += batch.length;
                insertedCount += result.upsertedCount;
                modifiedCount += result.modifiedCount;
                
                console.log(`  已保存 ${savedCount}/${receiptOperations.length} 個 receipt 記錄...`);
            }
            
            console.log(`\n✅ 批量保存完成！`);
            console.log(`   總操作數: ${receiptOperations.length}`);
            console.log(`   新插入: ${insertedCount}`);
            console.log(`   已更新: ${modifiedCount}`);
        } else {
            console.log('\n⚠️  沒有 receipt 記錄需要保存');
        }
        
        // 驗證遷移結果
        console.log('\n🔍 驗證遷移結果...');
        const receiptCount = await receiptCollection.countDocuments({});
        console.log(`receipt 集合中現有記錄數: ${receiptCount}`);
        
        // 檢查是否有新記錄
        const recentReceipts = await receiptCollection.find({
            createdAt: { $gte: new Date(Date.now() - 60000) } // 最近1分鐘創建的
        }).limit(5).toArray();
        
        if (recentReceipts.length > 0) {
            console.log('\n📝 新創建的 receipt 記錄示例（前5條）:');
            recentReceipts.forEach((receipt, index) => {
                console.log(`  ${index + 1}. employeeId: ${receipt.employeeId}`);
                console.log(`     workDate: ${receipt.workDate}`);
                console.log(`     type: ${receipt.type}`);
                console.log(`     amount: ${receipt.amount}`);
                console.log(`     club: ${receipt.club || '(空)'}`);
            });
        }
        
        console.log('\n✅ 遷移腳本執行完成！');
        
    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('✅ 已斷開 MongoDB 連接');
    }
}

// 運行腳本
if (require.main === module) {
    console.log('⚠️  警告: 此腳本將從 Staff_work_hours 遷移 feeContent 數據到 receipt 集合！');
    console.log('⚠️  請確保已備份數據庫！');
    console.log('⚠️  此操作不會刪除 Staff_work_hours 中的 feeContent 數據');
    console.log('⚠️  10秒後開始執行...\n');
    
    setTimeout(() => {
        migrateFeeContentToReceipt().catch(console.error);
    }, 10000);
}

module.exports = { migrateFeeContentToReceipt };

