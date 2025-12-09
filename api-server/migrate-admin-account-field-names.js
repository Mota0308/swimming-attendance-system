/**
 * 遷移腳本：統一 Admin_account 集合中的字段名稱
 * 
 * 遷移內容：
 * 1. englishName → engName
 * 2. employmentType → workingType
 * 
 * 根據圖片示例，正確格式為：
 * - engName: "Cherol"
 * - workingType: "part_time"
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function migrateFieldNames() {
    let client;
    try {
        console.log('🔄 開始遷移 Admin_account 字段名稱...');
        console.log('  - englishName → engName');
        console.log('  - employmentType → workingType');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        // 查找需要遷移的記錄
        const recordsWithEnglishName = await collection.find({
            englishName: { $exists: true, $ne: null, $ne: '' }
        }).toArray();
        
        const recordsWithEmploymentType = await collection.find({
            employmentType: { $exists: true, $ne: null, $ne: '' }
        }).toArray();
        
        console.log(`\n📊 找到需要遷移的記錄：`);
        console.log(`  - 包含 englishName 的記錄：${recordsWithEnglishName.length} 條`);
        console.log(`  - 包含 employmentType 的記錄：${recordsWithEmploymentType.length} 條`);
        
        let englishNameUpdated = 0;
        let employmentTypeUpdated = 0;
        let errors = [];
        
        // 遷移 englishName → engName
        console.log('\n🔄 開始遷移 englishName → engName...');
        for (const record of recordsWithEnglishName) {
            try {
                // 檢查是否已經有 engName 字段
                if (record.engName && record.engName !== record.englishName) {
                    console.warn(`⚠️  記錄 ${record._id} 同時存在 engName 和 englishName，且值不同：`);
                    console.warn(`    engName: "${record.engName}"`);
                    console.warn(`    englishName: "${record.englishName}"`);
                    console.warn(`    將使用 englishName 的值覆蓋 engName`);
                }
                
                const result = await collection.updateOne(
                    { _id: record._id },
                    {
                        $set: {
                            engName: record.englishName,
                            updatedAt: new Date()
                        },
                        $unset: {
                            englishName: ""
                        }
                    }
                );
                
                if (result.modifiedCount > 0) {
                    englishNameUpdated++;
                    console.log(`  ✅ ${record.name || '未知'} (${record.phone || '未知'}): "${record.englishName}" → engName`);
                }
            } catch (error) {
                console.error(`❌ 遷移失敗: ${record._id}`, error.message);
                errors.push({ record: record._id, field: 'englishName', error: error.message });
            }
        }
        
        // 遷移 employmentType → workingType
        console.log('\n🔄 開始遷移 employmentType → workingType...');
        for (const record of recordsWithEmploymentType) {
            try {
                // 檢查是否已經有 workingType 字段
                if (record.workingType && record.workingType !== record.employmentType) {
                    console.warn(`⚠️  記錄 ${record._id} 同時存在 workingType 和 employmentType，且值不同：`);
                    console.warn(`    workingType: "${record.workingType}"`);
                    console.warn(`    employmentType: "${record.employmentType}"`);
                    console.warn(`    將使用 employmentType 的值覆蓋 workingType`);
                }
                
                // 處理值格式轉換（如果需要）
                let workingTypeValue = record.employmentType;
                
                // 如果值是中文，轉換為英文格式
                if (workingTypeValue === '全職' || workingTypeValue === '全职') {
                    workingTypeValue = 'full_time';
                } else if (workingTypeValue === '兼職' || workingTypeValue === '兼职') {
                    workingTypeValue = 'part_time';
                }
                // 如果已經是正確格式（full_time 或 part_time），保持不變
                
                const result = await collection.updateOne(
                    { _id: record._id },
                    {
                        $set: {
                            workingType: workingTypeValue,
                            updatedAt: new Date()
                        },
                        $unset: {
                            employmentType: ""
                        }
                    }
                );
                
                if (result.modifiedCount > 0) {
                    employmentTypeUpdated++;
                    console.log(`  ✅ ${record.name || '未知'} (${record.phone || '未知'}): "${record.employmentType}" → workingType ("${workingTypeValue}")`);
                }
            } catch (error) {
                console.error(`❌ 遷移失敗: ${record._id}`, error.message);
                errors.push({ record: record._id, field: 'employmentType', error: error.message });
            }
        }
        
        // 統計結果
        console.log('\n📊 遷移結果統計：');
        console.log(`✅ englishName → engName: ${englishNameUpdated} 條記錄`);
        console.log(`✅ employmentType → workingType: ${employmentTypeUpdated} 條記錄`);
        console.log(`❌ 錯誤: ${errors.length} 個`);
        
        if (errors.length > 0) {
            console.log('\n❌ 錯誤詳情：');
            errors.forEach(({ record, field, error }) => {
                console.log(`  - ${record}: ${field} - ${error}`);
            });
        }
        
        // 驗證遷移結果
        console.log('\n🔍 驗證遷移結果...');
        const remainingEnglishName = await collection.countDocuments({
            englishName: { $exists: true }
        });
        const remainingEmploymentType = await collection.countDocuments({
            employmentType: { $exists: true }
        });
        
        if (remainingEnglishName > 0) {
            console.warn(`⚠️  仍有 ${remainingEnglishName} 條記錄包含 englishName 字段`);
        } else {
            console.log('✅ 所有 englishName 字段已成功遷移');
        }
        
        if (remainingEmploymentType > 0) {
            console.warn(`⚠️  仍有 ${remainingEmploymentType} 條記錄包含 employmentType 字段`);
        } else {
            console.log('✅ 所有 employmentType 字段已成功遷移');
        }
        
        // 檢查新字段是否存在
        const recordsWithEngName = await collection.countDocuments({
            engName: { $exists: true, $ne: null, $ne: '' }
        });
        const recordsWithWorkingType = await collection.countDocuments({
            workingType: { $exists: true, $ne: null, $ne: '' }
        });
        
        console.log(`\n📊 新字段統計：`);
        console.log(`  - engName: ${recordsWithEngName} 條記錄`);
        console.log(`  - workingType: ${recordsWithWorkingType} 條記錄`);
        
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
    migrateFieldNames()
        .then(() => {
            console.log('\n✅ 字段名稱遷移完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 字段名稱遷移失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateFieldNames };



