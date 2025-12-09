/**
 * 删除指定 phone 的所有相关数据
 * 用法: node delete-phone-data.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

const TARGET_PHONE = '52236619';

async function deletePhoneData() {
    let client;
    const maxRetries = 5;
    const retryDelay = 3000; // 3秒
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔗 连接到 MongoDB... (尝试 ${attempt}/${maxRetries})`);
            client = new MongoClient(MONGO_BASE_URI, {
                serverSelectionTimeoutMS: 10000, // 10秒超时
                connectTimeoutMS: 10000,
                socketTimeoutMS: 30000
            });
            await client.connect();
            console.log('✅ MongoDB 连接成功');
            break; // 连接成功，跳出重试循环
        } catch (error) {
            console.error(`❌ 连接失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
            if (attempt < maxRetries) {
                console.log(`⏳ ${retryDelay/1000}秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                throw new Error(`连接失败，已重试 ${maxRetries} 次: ${error.message}`);
            }
        }
    }
    
    try {
        
        const db = client.db(DEFAULT_DB_NAME);
        const results = {};
        
        // 1. 删除 Admin_account
        console.log('\n📋 1. 删除 Admin_account...');
        const adminCollection = db.collection('Admin_account');
        const adminResult = await adminCollection.deleteMany({ phone: TARGET_PHONE });
        results.Admin_account = adminResult.deletedCount;
        console.log(`   ✅ 删除了 ${adminResult.deletedCount} 条 Admin_account 记录`);
        
        // 2. 删除 Coach_roster
        console.log('\n📋 2. 删除 Coach_roster...');
        const rosterCollection = db.collection('Coach_roster');
        const rosterResult = await rosterCollection.deleteMany({ phone: TARGET_PHONE });
        results.Coach_roster = rosterResult.deletedCount;
        console.log(`   ✅ 删除了 ${rosterResult.deletedCount} 条 Coach_roster 记录`);
        
        // 3. 删除 Staff_work_hours (使用 phone 或 employeeId)
        console.log('\n📋 3. 删除 Staff_work_hours...');
        const workHoursCollection = db.collection('Staff_work_hours');
        // 先查找是否有 employeeId 匹配的记录
        const workHoursRecords = await workHoursCollection.find({
            $or: [
                { phone: TARGET_PHONE },
                { employeeId: TARGET_PHONE }
            ]
        }).toArray();
        const employeeIds = new Set();
        workHoursRecords.forEach(record => {
            if (record.employeeId) employeeIds.add(record.employeeId);
        });
        
        const workHoursResult = await workHoursCollection.deleteMany({
            $or: [
                { phone: TARGET_PHONE },
                { employeeId: TARGET_PHONE },
                ...Array.from(employeeIds).map(id => ({ employeeId: id }))
            ]
        });
        results.Staff_work_hours = workHoursResult.deletedCount;
        console.log(`   ✅ 删除了 ${workHoursResult.deletedCount} 条 Staff_work_hours 记录`);
        
        // 4. 删除 Attendance (使用 phone 或 employeeId)
        console.log('\n📋 4. 删除 Attendance...');
        const attendanceCollection = db.collection('Attendance');
        const attendanceResult = await attendanceCollection.deleteMany({
            $or: [
                { phone: TARGET_PHONE },
                { employeeId: TARGET_PHONE },
                ...Array.from(employeeIds).map(id => ({ employeeId: id }))
            ]
        });
        results.Attendance = attendanceResult.deletedCount;
        console.log(`   ✅ 删除了 ${attendanceResult.deletedCount} 条 Attendance 记录`);
        
        // 5. 删除 User_preferences (使用 accountPhone 或 employeeId)
        console.log('\n📋 5. 删除 User_preferences...');
        const preferencesCollection = db.collection('User_preferences');
        const preferencesResult = await preferencesCollection.deleteMany({
            $or: [
                { accountPhone: TARGET_PHONE },
                { employeeId: TARGET_PHONE },
                ...Array.from(employeeIds).map(id => ({ employeeId: id }))
            ]
        });
        results.User_preferences = preferencesResult.deletedCount;
        console.log(`   ✅ 删除了 ${preferencesResult.deletedCount} 条 User_preferences 记录`);
        
        // 6. 删除 Student_account (如果 phone 匹配)
        console.log('\n📋 6. 删除 Student_account...');
        const studentCollection = db.collection('Student_account');
        const studentResult = await studentCollection.deleteMany({ phone: TARGET_PHONE });
        results.Student_account = studentResult.deletedCount;
        console.log(`   ✅ 删除了 ${studentResult.deletedCount} 条 Student_account 记录`);
        
        // 7. 删除 trail_bill (如果 phone 匹配)
        console.log('\n📋 7. 删除 trail_bill...');
        const trialBillCollection = db.collection('trail_bill');
        const trialBillResult = await trialBillCollection.deleteMany({ phone: TARGET_PHONE });
        results.trail_bill = trialBillResult.deletedCount;
        console.log(`   ✅ 删除了 ${trialBillResult.deletedCount} 条 trail_bill 记录`);
        
        // 总结
        console.log('\n' + '='.repeat(50));
        console.log('📊 删除结果总结:');
        console.log('='.repeat(50));
        let total = 0;
        Object.entries(results).forEach(([collection, count]) => {
            console.log(`   ${collection}: ${count} 条`);
            total += count;
        });
        console.log('='.repeat(50));
        console.log(`   总计: ${total} 条记录`);
        console.log('='.repeat(50));
        
        if (total === 0) {
            console.log('⚠️  没有找到任何匹配的记录');
        } else {
            console.log('✅ 删除完成！');
        }
        
    } catch (error) {
        console.error('❌ 删除失败:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB 连接已关闭');
        }
    }
}

// 执行删除
deletePhoneData();

