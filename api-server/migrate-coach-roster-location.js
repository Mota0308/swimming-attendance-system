/**
 * 遷移腳本：更新 Coach_roster 集合中的 location 字段
 * 
 * 遷移內容：
 * 1. 從 Location_club 集合獲取最新的 location 名稱
 * 2. 更新 Coach_roster 中的舊 location 名稱為新名稱
 * 
 * 注意：
 * - location 字段可能是字符串或數組
 * - 需要處理所有時段（slot）的 location 值
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function migrateCoachRosterLocation() {
    let client;
    try {
        console.log('🔄 開始遷移 Coach_roster 的 location 字段...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const locationClubCollection = db.collection('Location_club');
        const coachRosterCollection = db.collection('Coach_roster');
        
        // 1. 從 Location_club 獲取所有唯一的 location 名稱（新名稱）
        console.log('\n📋 從 Location_club 獲取最新的 location 名稱...');
        const locationClubData = await locationClubCollection.find({}).toArray();
        const newLocations = new Set();
        
        locationClubData.forEach(item => {
            const location = item.location || item.name || item.place;
            if (location && location.trim() !== '') {
                newLocations.add(location.trim());
            }
        });
        
        const newLocationsArray = Array.from(newLocations).sort();
        console.log(`✅ 找到 ${newLocationsArray.length} 個唯一的 location 名稱：`);
        newLocationsArray.forEach(loc => console.log(`  - ${loc}`));
        
        // 2. 從 Coach_roster 獲取所有舊的 location 值
        console.log('\n📋 從 Coach_roster 獲取所有 location 值...');
        const rosterRecords = await coachRosterCollection.find({
            $or: [
                { location: { $exists: true, $ne: null, $ne: '' } },
                { 'location.0': { $exists: true, $ne: null, $ne: '' } },
                { 'location.1': { $exists: true, $ne: null, $ne: '' } },
                { 'location.2': { $exists: true, $ne: null, $ne: '' } }
            ]
        }).toArray();
        
        console.log(`✅ 找到 ${rosterRecords.length} 條包含 location 的記錄`);
        
        // 3. 收集所有舊的 location 值
        const oldLocations = new Set();
        rosterRecords.forEach(record => {
            if (Array.isArray(record.location)) {
                record.location.forEach(loc => {
                    if (loc && loc.trim() !== '') {
                        oldLocations.add(loc.trim());
                    }
                });
            } else if (typeof record.location === 'string' && record.location.trim() !== '') {
                oldLocations.add(record.location.trim());
            }
        });
        
        const oldLocationsArray = Array.from(oldLocations).sort();
        console.log(`\n📋 找到 ${oldLocationsArray.length} 個不同的舊 location 值：`);
        oldLocationsArray.forEach(loc => console.log(`  - ${loc}`));
        
        // 4. 建立映射關係（模糊匹配 + 特殊處理）
        console.log('\n🔄 建立 location 映射關係...');
        const locationMap = new Map(); // {oldLocation: newLocation}
        
        // ✅ 特殊處理：珀麗灣泳池和灝景灣泳池的常見變體
        const specialMappings = {
            '珀麗灣': '珀麗灣泳池',
            '珀麗灣游泳池': '珀麗灣泳池',
            '珀麗灣泳池': '珀麗灣泳池',
            '灝景灣': '灝景灣泳池',
            '灝景灣游泳池': '灝景灣泳池',
            '灝景灣泳池': '灝景灣泳池'
        };
        
        oldLocationsArray.forEach(oldLoc => {
            // 完全匹配
            if (newLocations.has(oldLoc)) {
                locationMap.set(oldLoc, oldLoc);
                console.log(`  ✅ 完全匹配: "${oldLoc}" → "${oldLoc}"`);
                return;
            }
            
            // ✅ 特殊映射處理（優先級最高）
            let specialMatched = false;
            for (const [oldPattern, newLocation] of Object.entries(specialMappings)) {
                if (oldLoc.includes(oldPattern) || oldPattern.includes(oldLoc)) {
                    // 檢查新地點是否存在
                    if (newLocations.has(newLocation)) {
                        locationMap.set(oldLoc, newLocation);
                        console.log(`  🎯 特殊映射: "${oldLoc}" → "${newLocation}"`);
                        specialMatched = true;
                        break;
                    }
                }
            }
            
            if (specialMatched) {
                return;
            }
            
            // 模糊匹配（包含關係）
            let matched = false;
            let bestMatch = null;
            let bestMatchScore = 0;
            
            for (const newLoc of newLocationsArray) {
                // 計算匹配分數
                let score = 0;
                
                // 如果舊名稱包含新名稱，或新名稱包含舊名稱
                if (oldLoc.includes(newLoc)) {
                    score = newLoc.length; // 匹配的長度越長，分數越高
                } else if (newLoc.includes(oldLoc)) {
                    score = oldLoc.length;
                }
                
                // 如果包含相同的關鍵字（如"泳池"、"公園"等），增加分數
                const commonKeywords = ['泳池', '游泳池', '公園', '灣', '鋪'];
                commonKeywords.forEach(keyword => {
                    if (oldLoc.includes(keyword) && newLoc.includes(keyword)) {
                        score += keyword.length;
                    }
                });
                
                if (score > 0 && score > bestMatchScore) {
                    bestMatch = newLoc;
                    bestMatchScore = score;
                }
            }
            
            if (bestMatch) {
                locationMap.set(oldLoc, bestMatch);
                console.log(`  🔄 模糊匹配: "${oldLoc}" → "${bestMatch}" (分數: ${bestMatchScore})`);
                matched = true;
            }
            
            // 如果沒有匹配，保持原值（可能已經是最新的）
            if (!matched) {
                console.log(`  ⚠️  未找到匹配: "${oldLoc}" (保持原值)`);
                locationMap.set(oldLoc, oldLoc);
            }
        });
        
        // 5. 更新 Coach_roster 中的 location 字段
        console.log('\n🔄 開始更新 Coach_roster 記錄...');
        let updatedCount = 0;
        let skippedCount = 0;
        let errors = [];
        
        for (const record of rosterRecords) {
            try {
                let needsUpdate = false;
                let newLocationValue;
                
                if (Array.isArray(record.location)) {
                    // location 是數組
                    newLocationValue = record.location.map(loc => {
                        if (!loc || loc.trim() === '') {
                            return loc;
                        }
                        const trimmedLoc = loc.trim();
                        const newLoc = locationMap.get(trimmedLoc);
                        if (newLoc && newLoc !== trimmedLoc) {
                            needsUpdate = true;
                            return newLoc;
                        }
                        return loc;
                    });
                } else if (typeof record.location === 'string' && record.location.trim() !== '') {
                    // location 是字符串
                    const trimmedLoc = record.location.trim();
                    const newLoc = locationMap.get(trimmedLoc);
                    if (newLoc && newLoc !== trimmedLoc) {
                        needsUpdate = true;
                        newLocationValue = newLoc;
                    } else {
                        newLocationValue = record.location;
                    }
                } else {
                    // location 為空或無效，跳過
                    skippedCount++;
                    continue;
                }
                
                if (needsUpdate) {
                    const result = await coachRosterCollection.updateOne(
                        { _id: record._id },
                        {
                            $set: {
                                location: newLocationValue,
                                updatedAt: new Date()
                            }
                        }
                    );
                    
                    if (result.modifiedCount > 0) {
                        updatedCount++;
                        const dateStr = record.date ? new Date(record.date).toISOString().split('T')[0] : '未知日期';
                        console.log(`  ✅ 更新記錄 ${record._id} (${dateStr}): ${JSON.stringify(record.location)} → ${JSON.stringify(newLocationValue)}`);
                    }
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ 更新失敗: ${record._id}`, error.message);
                errors.push({ record: record._id, error: error.message });
            }
        }
        
        // 統計結果
        console.log('\n📊 遷移結果統計：');
        console.log(`✅ 已更新: ${updatedCount} 條記錄`);
        console.log(`⏭️  跳過: ${skippedCount} 條記錄（無需更新）`);
        console.log(`❌ 錯誤: ${errors.length} 個`);
        
        if (errors.length > 0) {
            console.log('\n❌ 錯誤詳情：');
            errors.forEach(({ record, error }) => {
                console.log(`  - ${record}: ${error}`);
            });
        }
        
        // 驗證遷移結果
        console.log('\n🔍 驗證遷移結果...');
        const allRosterLocations = new Set();
        const verifyRecords = await coachRosterCollection.find({
            $or: [
                { location: { $exists: true, $ne: null, $ne: '' } },
                { 'location.0': { $exists: true, $ne: null, $ne: '' } },
                { 'location.1': { $exists: true, $ne: null, $ne: '' } },
                { 'location.2': { $exists: true, $ne: null, $ne: '' } }
            ]
        }).toArray();
        
        verifyRecords.forEach(record => {
            if (Array.isArray(record.location)) {
                record.location.forEach(loc => {
                    if (loc && loc.trim() !== '') {
                        allRosterLocations.add(loc.trim());
                    }
                });
            } else if (typeof record.location === 'string' && record.location.trim() !== '') {
                allRosterLocations.add(record.location.trim());
            }
        });
        
        console.log(`\n📊 遷移後的 location 值：`);
        Array.from(allRosterLocations).sort().forEach(loc => {
            console.log(`  - ${loc}`);
        });
        
        // 檢查是否還有舊的 location 值
        const oldLocationsAfterMigration = Array.from(allRosterLocations).filter(loc => {
            return oldLocationsArray.includes(loc) && !newLocationsArray.includes(loc);
        });
        
        if (oldLocationsAfterMigration.length > 0) {
            console.log(`\n⚠️  仍有以下舊 location 值未更新：`);
            oldLocationsAfterMigration.forEach(loc => console.log(`  - ${loc}`));
        } else {
            console.log('\n✅ 所有 location 值已更新為最新名稱');
        }
        
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
    migrateCoachRosterLocation()
        .then(() => {
            console.log('\n✅ Coach_roster location 遷移完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Coach_roster location 遷移失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateCoachRosterLocation };

