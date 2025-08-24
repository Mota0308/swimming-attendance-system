const { MongoClient } = require('mongodb');

// MongoDB 連接配置
const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function checkAndUpdateDatabaseStructure() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        const coachCollection = db.collection('Coach_account');
        const workHoursCollection = db.collection('Coach_work_hours');
        
        console.log('\n🔍 檢查數據庫結構...');
        
        // 檢查 Coach_account 集合
        console.log('\n📋 Coach_account 集合結構:');
        const sampleCoach = await coachCollection.findOne({});
        if (sampleCoach) {
            console.log('現有字段:', Object.keys(sampleCoach));
            
            // 檢查是否需要添加新字段
            if (!sampleCoach.hasOwnProperty('location') || !sampleCoach.hasOwnProperty('club')) {
                console.log('⚠️ 需要更新 Coach_account 集合結構...');
                
                // 為所有現有記錄添加新字段
                const updateResult = await coachCollection.updateMany(
                    { $or: [{ location: { $exists: false } }, { club: { $exists: false } }] },
                    { $set: { location: '', club: '' } }
                );
                console.log(`✅ 更新了 ${updateResult.modifiedCount} 條教練記錄`);
            } else {
                console.log('✅ Coach_account 集合結構已是最新');
            }
        } else {
            console.log('⚠️ Coach_account 集合為空');
        }
        
        // 檢查 Coach_work_hours 集合
        console.log('\n📋 Coach_work_hours 集合結構:');
        const sampleWorkHours = await workHoursCollection.findOne({});
        if (sampleWorkHours) {
            console.log('現有字段:', Object.keys(sampleWorkHours));
            
            // 檢查是否需要添加新字段
            if (!sampleWorkHours.hasOwnProperty('location') || !sampleWorkHours.hasOwnProperty('club')) {
                console.log('⚠️ 需要更新 Coach_work_hours 集合結構...');
                
                // 為所有現有記錄添加新字段
                const updateResult = await workHoursCollection.updateMany(
                    { $or: [{ location: { $exists: false } }, { club: { $exists: false } }] },
                    { $set: { location: '', club: '' } }
                );
                console.log(`✅ 更新了 ${updateResult.modifiedCount} 條工時記錄`);
            } else {
                console.log('✅ Coach_work_hours 集合結構已是最新');
            }
        } else {
            console.log('⚠️ Coach_work_hours 集合為空');
        }
        
        // 顯示更新後的結構
        console.log('\n📊 更新後的數據庫結構:');
        const updatedCoach = await coachCollection.findOne({});
        const updatedWorkHours = await workHoursCollection.findOne({});
        
        if (updatedCoach) {
            console.log('Coach_account 字段:', Object.keys(updatedCoach));
        }
        if (updatedWorkHours) {
            console.log('Coach_work_hours 字段:', Object.keys(updatedWorkHours));
        }
        
        console.log('\n🎉 數據庫結構檢查和更新完成！');
        
    } catch (error) {
        console.error('❌ 檢查失敗:', error);
    } finally {
        await client.close();
        console.log('\n🔌 數據庫連接已關閉');
    }
}

// 運行檢查
checkAndUpdateDatabaseStructure(); 