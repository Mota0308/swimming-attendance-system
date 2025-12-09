/**
 * 遷移腳本：將現有數據庫中的 employeeId 從字母+7位數字格式改為字母+4位數字格式
 * 
 * 遷移邏輯：
 * 1. 對於每個員工類型（M, S, A, C），按數字部分排序
 * 2. 重新分配連續的4位數字編號（從0001開始）
 * 3. 更新 Admin_account 集合中的 employeeId
 * 4. 更新 Staff_work_hours 集合中所有相關記錄的 employeeId
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// 員工類型前綴映射
const TYPE_PREFIX = {
    'supervisor': 'S',
    'manager': 'M',
    'admin': 'A',
    'coach': 'C'
};

async function migrateEmployeeIds() {
    let client;
    try {
        console.log('🔄 開始遷移 employeeId 格式（7位數字 → 4位數字）...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const adminCollection = db.collection('Admin_account');
        const workHoursCollection = db.collection('Staff_work_hours');
        
        // 獲取所有員工，按類型分組
        const allEmployees = await adminCollection.find({
            employeeId: { $exists: true, $ne: null, $ne: '' }
        }).toArray();
        
        console.log(`📊 找到 ${allEmployees.length} 個員工記錄`);
        
        // 按類型分組
        const employeesByType = {};
        allEmployees.forEach(emp => {
            const type = emp.type || 'coach';
            if (!employeesByType[type]) {
                employeesByType[type] = [];
            }
            employeesByType[type].push(emp);
        });
        
        // 創建 employeeId 映射表（舊ID → 新ID）
        const employeeIdMapping = new Map();
        let totalUpdated = 0;
        let totalErrors = 0;
        
        // 對每種類型進行遷移
        for (const [type, employees] of Object.entries(employeesByType)) {
            const prefix = TYPE_PREFIX[type] || 'C';
            console.log(`\n📋 處理 ${type} 類型員工（前綴: ${prefix}），共 ${employees.length} 個`);
            
            // 提取數字部分並排序
            const employeesWithNumbers = employees.map(emp => {
                const employeeId = emp.employeeId || '';
                const numberPart = employeeId.substring(1); // 去掉首字母
                const number = parseInt(numberPart) || 0;
                return { ...emp, number, oldEmployeeId: employeeId };
            }).sort((a, b) => a.number - b.number); // 按數字排序
            
            // 重新分配4位數字編號
            let newNumber = 1;
            for (const emp of employeesWithNumbers) {
                const newEmployeeId = `${prefix}${String(newNumber).padStart(4, '0')}`;
                employeeIdMapping.set(emp.oldEmployeeId, newEmployeeId);
                console.log(`  ${emp.oldEmployeeId} → ${newEmployeeId} (${emp.name || '未知'})`);
                newNumber++;
            }
        }
        
        console.log(`\n🔄 開始更新 Admin_account 集合...`);
        
        // 更新 Admin_account 集合
        for (const [oldId, newId] of employeeIdMapping.entries()) {
            try {
                const result = await adminCollection.updateOne(
                    { employeeId: oldId },
                    { $set: { employeeId: newId, updatedAt: new Date() } }
                );
                if (result.modifiedCount > 0) {
                    totalUpdated++;
                }
            } catch (error) {
                console.error(`❌ 更新失敗: ${oldId} → ${newId}`, error.message);
                totalErrors++;
            }
        }
        
        console.log(`\n🔄 開始更新 Staff_work_hours 集合...`);
        
        // 更新 Staff_work_hours 集合
        let workHoursUpdated = 0;
        for (const [oldId, newId] of employeeIdMapping.entries()) {
            try {
                const result = await workHoursCollection.updateMany(
                    { employeeId: oldId },
                    { $set: { employeeId: newId } }
                );
                if (result.modifiedCount > 0) {
                    workHoursUpdated += result.modifiedCount;
                }
            } catch (error) {
                console.error(`❌ 更新工時記錄失敗: ${oldId} → ${newId}`, error.message);
            }
        }
        
        console.log('\n📊 遷移結果統計：');
        console.log(`✅ Admin_account 更新：${totalUpdated} 個員工`);
        console.log(`✅ Staff_work_hours 更新：${workHoursUpdated} 條記錄`);
        console.log(`❌ 錯誤：${totalErrors} 個`);
        
        // 驗證遷移結果
        console.log('\n🔍 驗證遷移結果...');
        const invalidIds = await adminCollection.find({
            employeeId: { 
                $exists: true, 
                $ne: null, 
                $ne: '',
                $not: /^[MSAC]\d{4}$/
            }
        }).toArray();
        
        if (invalidIds.length > 0) {
            console.warn(`⚠️ 發現 ${invalidIds.length} 個不符合新格式的 employeeId:`);
            invalidIds.forEach(emp => {
                console.warn(`  - ${emp.employeeId} (${emp.name || '未知'}, ${emp.type || '未知'})`);
            });
        } else {
            console.log('✅ 所有 employeeId 都符合新格式（字母+4位數字）');
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
    migrateEmployeeIds()
        .then(() => {
            console.log('\n✅ 遷移完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 遷移失敗:', error);
            process.exit(1);
        });
}

module.exports = { migrateEmployeeIds };



