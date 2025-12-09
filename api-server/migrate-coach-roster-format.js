/**
 * Coach_roster 數據格式統一遷移腳本
 * 
 * 遷移內容：
 * 1. 統一 date 字段為 "YYYY-MM-DD" 字符串格式
 * 2. 工作類型：確保 location 是數組格式，移除 time 字段
 * 3. 假期類型：移除 location 和 time 字段
 * 
 * 格式要求：
 * - 工作類型（leaveType 為 null）：
 *   - date: "YYYY-MM-DD" 字符串
 *   - location: ["", "地點1", "地點2"] 數組格式（3個元素）
 *   - 不保存 time 字段
 * 
 * - 假期類型（leaveType 不為 null）：
 *   - date: "YYYY-MM-DD" 字符串
 *   - 不保存 location 和 time 字段
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
        // 嘗試解析字符串日期
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

async function migrateCoachRosterFormat() {
    let client;
    try {
        console.log('🔄 開始遷移 Coach_roster 數據格式...\n');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_roster');
        
        // 1. 獲取所有記錄
        console.log('📋 查詢所有 Coach_roster 記錄...');
        const allRecords = await collection.find({}).toArray();
        console.log(`✅ 找到 ${allRecords.length} 條記錄\n`);
        
        if (allRecords.length === 0) {
            console.log('⚠️ 沒有找到任何記錄，遷移結束');
            return;
        }
        
        // 2. 統計信息
        let dateUpdatedCount = 0;
        let locationUpdatedCount = 0;
        let timeRemovedCount = 0;
        let leaveLocationRemovedCount = 0;
        let leaveTimeRemovedCount = 0;
        let skippedCount = 0;
        let errors = [];
        
        // 3. 處理每條記錄
        console.log('🔄 開始處理記錄...\n');
        
        for (let i = 0; i < allRecords.length; i++) {
            const record = allRecords[i];
            const recordId = record._id;
            
            try {
                const updateFields = {};
                let needsUpdate = false;
                
                // ✅ 1. 統一 date 字段為 "YYYY-MM-DD" 字符串格式
                const currentDate = record.date;
                const formattedDate = formatDateToYYYYMMDD(currentDate);
                
                if (formattedDate) {
                    // 如果當前是 Date 對象，或格式不匹配，需要更新
                    if (currentDate instanceof Date || (typeof currentDate === 'string' && currentDate !== formattedDate)) {
                        updateFields.date = formattedDate;
                        needsUpdate = true;
                        dateUpdatedCount++;
                    } else if (typeof currentDate !== 'string') {
                        // 如果不是字符串格式，也需要更新
                        updateFields.date = formattedDate;
                        needsUpdate = true;
                        dateUpdatedCount++;
                    }
                }
                
                // ✅ 2. 判斷是工作類型還是假期類型
                const isLeave = record.leaveType !== null && record.leaveType !== undefined;
                
                if (isLeave) {
                    // ✅ 假期類型：移除 location 和 time 字段
                    if (record.location !== undefined) {
                        updateFields.$unset = updateFields.$unset || {};
                        updateFields.$unset.location = '';
                        needsUpdate = true;
                        leaveLocationRemovedCount++;
                    }
                    
                    if (record.time !== undefined) {
                        updateFields.$unset = updateFields.$unset || {};
                        updateFields.$unset.time = '';
                        needsUpdate = true;
                        leaveTimeRemovedCount++;
                    }
                } else {
                    // ✅ 工作類型：確保 location 是數組格式，移除 time 字段
                    
                    // 處理 location
                    const currentLocation = record.location;
                    let locationArray = ['', '', ''];
                    
                    if (Array.isArray(currentLocation)) {
                        // 已經是數組，確保長度為 3
                        locationArray = [...currentLocation];
                        while (locationArray.length < 3) {
                            locationArray.push('');
                        }
                        if (locationArray.length > 3) {
                            locationArray.splice(3);
                        }
                        
                        // 清理 null/undefined 值
                        locationArray = locationArray.map(loc => {
                            if (loc === null || loc === undefined) {
                                return '';
                            }
                            return loc;
                        });
                        
                        // 檢查是否需要更新
                        if (JSON.stringify(locationArray) !== JSON.stringify(currentLocation)) {
                            updateFields.location = locationArray;
                            needsUpdate = true;
                            locationUpdatedCount++;
                        }
                    } else if (typeof currentLocation === 'string' && currentLocation.trim() !== '') {
                        // 字符串格式，轉換為數組（根據 slot 設置）
                        const slot = record.slot || 1;
                        const slotIndex = slot - 1;
                        locationArray[slotIndex] = currentLocation;
                        updateFields.location = locationArray;
                        needsUpdate = true;
                        locationUpdatedCount++;
                    } else if (currentLocation !== undefined) {
                        // 空字符串或其他格式，轉換為數組
                        updateFields.location = locationArray;
                        needsUpdate = true;
                        locationUpdatedCount++;
                    } else {
                        // 沒有 location 字段，設置為空數組
                        updateFields.location = locationArray;
                        needsUpdate = true;
                        locationUpdatedCount++;
                    }
                    
                    // 移除 time 字段
                    if (record.time !== undefined) {
                        updateFields.$unset = updateFields.$unset || {};
                        updateFields.$unset.time = '';
                        needsUpdate = true;
                        timeRemovedCount++;
                    }
                }
                
                // 4. 執行更新
                if (needsUpdate) {
                    const updateOperation = {};
                    
                    // 處理 $unset 操作
                    if (updateFields.$unset) {
                        updateOperation.$unset = updateFields.$unset;
                        delete updateFields.$unset;
                    }
                    
                    // 處理 $set 操作
                    const setFields = { ...updateFields };
                    delete setFields.$unset;
                    if (Object.keys(setFields).length > 0) {
                        updateOperation.$set = setFields;
                    }
                    
                    await collection.updateOne(
                        { _id: recordId },
                        updateOperation
                    );
                    
                    if ((i + 1) % 100 === 0) {
                        console.log(`📊 已處理 ${i + 1}/${allRecords.length} 條記錄...`);
                    }
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ 處理記錄失敗 (ID: ${recordId}):`, error.message);
                errors.push({
                    recordId: recordId,
                    error: error.message
                });
            }
        }
        
        // 5. 輸出統計信息
        console.log('\n✅ 遷移完成！\n');
        console.log('📊 統計信息：');
        console.log(`  - 總記錄數: ${allRecords.length}`);
        console.log(`  - date 字段更新: ${dateUpdatedCount} 條`);
        console.log(`  - location 字段更新: ${locationUpdatedCount} 條`);
        console.log(`  - time 字段移除（工作類型）: ${timeRemovedCount} 條`);
        console.log(`  - location 字段移除（假期類型）: ${leaveLocationRemovedCount} 條`);
        console.log(`  - time 字段移除（假期類型）: ${leaveTimeRemovedCount} 條`);
        console.log(`  - 跳過（無需更新）: ${skippedCount} 條`);
        console.log(`  - 錯誤: ${errors.length} 條`);
        
        if (errors.length > 0) {
            console.log('\n❌ 錯誤詳情：');
            errors.forEach((err, index) => {
                console.log(`  ${index + 1}. Record ID: ${err.recordId}, Error: ${err.error}`);
            });
        }
        
        // 6. 驗證遷移結果
        console.log('\n🔍 驗證遷移結果...');
        const sampleRecords = await collection.find({}).limit(10).toArray();
        console.log(`\n📋 樣本記錄（前10條）：`);
        
        sampleRecords.forEach((record, index) => {
            const isLeave = record.leaveType !== null && record.leaveType !== undefined;
            console.log(`\n  ${index + 1}. Record ID: ${record._id}`);
            console.log(`     - date: ${record.date} (類型: ${typeof record.date})`);
            console.log(`     - leaveType: ${record.leaveType}`);
            console.log(`     - isLeave: ${isLeave}`);
            
            if (isLeave) {
                console.log(`     - location: ${record.location === undefined ? '已移除 ✅' : '仍存在 ❌'}`);
                console.log(`     - time: ${record.time === undefined ? '已移除 ✅' : '仍存在 ❌'}`);
            } else {
                console.log(`     - location: ${Array.isArray(record.location) ? `數組格式 ✅ [${record.location.join(', ')}]` : `非數組格式 ❌ ${typeof record.location}`}`);
                console.log(`     - time: ${record.time === undefined ? '已移除 ✅' : '仍存在 ❌'}`);
            }
        });
        
        console.log('\n✅ 驗證完成！');
        
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
    migrateCoachRosterFormat()
        .then(() => {
            console.log('\n🎉 遷移腳本執行完成！');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ 遷移腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateCoachRosterFormat };

