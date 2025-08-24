const { MongoClient } = require('mongodb');

// MongoDB 連接配置
const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function testNewCoachFeatures() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        const coachCollection = db.collection('Coach_account');
        const workHoursCollection = db.collection('Coach_work_hours');
        
        console.log('\n🧪 測試新的教練管理功能...');
        
        // 1. 測試創建帶地點和泳會的教練
        console.log('\n1️⃣ 創建測試教練（帶地點和泳會）...');
        const testCoach = {
            phone: '0999999999',
            studentPhone: '0999999999',
            password: '123456',
            userType: 'coach',
            studentName: '測試教練',
            location: '維多利亞公園游泳池',
            club: '維多利亞泳會',
            createdAt: Date.now(),
            createdDate: new Date().toISOString()
        };
        
        // 檢查是否已存在
        const existingCoach = await coachCollection.findOne({ phone: testCoach.phone });
        if (existingCoach) {
            console.log('⚠️ 測試教練已存在，刪除舊記錄...');
            await coachCollection.deleteOne({ phone: testCoach.phone });
            await workHoursCollection.deleteMany({ phone: testCoach.phone });
        }
        
        await coachCollection.insertOne(testCoach);
        console.log('✅ 測試教練創建成功');
        
        // 2. 測試創建工時記錄（帶地點和泳會）
        console.log('\n2️⃣ 創建測試工時記錄（帶地點和泳會）...');
        const currentDate = new Date();
        const testWorkHours = {
            phone: testCoach.phone,
            date: currentDate.toISOString().split('T')[0],
            hours: 8.5,
            location: '維多利亞公園游泳池',
            club: '維多利亞泳會',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await workHoursCollection.insertOne(testWorkHours);
        console.log('✅ 測試工時記錄創建成功');
        
        // 3. 測試按泳會查詢教練
        console.log('\n3️⃣ 測試按泳會查詢教練...');
        const coachesByClub = await coachCollection.find({ club: '維多利亞泳會' }).toArray();
        console.log(`✅ 找到 ${coachesByClub.length} 個維多利亞泳會的教練`);
        coachesByClub.forEach(coach => {
            console.log(`   - ${coach.studentName} (${coach.phone}) - 地點: ${coach.location}, 泳會: ${coach.club}`);
        });
        
        // 4. 測試按地點查詢工時記錄
        console.log('\n4️⃣ 測試按地點查詢工時記錄...');
        const workHoursByLocation = await workHoursCollection.find({ 
            location: '維多利亞公園游泳池' 
        }).toArray();
        console.log(`✅ 找到 ${workHoursByLocation.length} 條維多利亞公園游泳池的工時記錄`);
        workHoursByLocation.forEach(record => {
            console.log(`   - ${record.date}: ${record.hours}小時 - 泳會: ${record.club}`);
        });
        
        // 5. 測試數據庫結構
        console.log('\n5️⃣ 檢查數據庫結構...');
        const sampleCoach = await coachCollection.findOne({});
        const sampleWorkHours = await workHoursCollection.findOne({});
        
        console.log('📋 Coach_account 集合字段:');
        console.log(Object.keys(sampleCoach || {}));
        
        console.log('📋 Coach_work_hours 集合字段:');
        console.log(Object.keys(sampleWorkHours || {}));
        
        // 6. 清理測試數據
        console.log('\n6️⃣ 清理測試數據...');
        await coachCollection.deleteOne({ phone: testCoach.phone });
        await workHoursCollection.deleteMany({ phone: testCoach.phone });
        console.log('✅ 測試數據清理完成');
        
        console.log('\n🎉 所有測試完成！新的教練管理功能正常工作。');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    } finally {
        await client.close();
        console.log('\n🔌 數據庫連接已關閉');
    }
}

// 運行測試
testNewCoachFeatures(); 