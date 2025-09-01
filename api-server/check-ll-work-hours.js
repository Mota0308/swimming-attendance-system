const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkLLWorkHours() {
    try {
        console.log('🔍 檢查ll教練的工時數據...');
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        const workHoursCollection = db.collection('Coach_work_hours');
        
        // 檢查ll教練的工時數據
        const llWorkHours = await workHoursCollection.find({ phone: '00000000' }).toArray();
        console.log(`📊 ll教練 (00000000) 工時記錄數: ${llWorkHours.length}`);
        if (llWorkHours.length > 0) {
            console.log('📋 ll教練工時記錄:');
            llWorkHours.forEach(record => {
                console.log(`  - ${record.date}: ${record.location || '無地點'} (${record.hours || 0}小時) - 泳會: ${record.club || '無泳會'}`);
            });
        } else {
            console.log('❌ ll教練沒有工時記錄');
        }
        
        // 檢查Coach_roster中ll的記錄
        const rosterCollection = db.collection('Coach_roster');
        const llRoster = await rosterCollection.find({ phone: '00000000' }).toArray();
        console.log(`📊 ll教練更表記錄數: ${llRoster.length}`);
        if (llRoster.length > 0) {
            console.log('📋 ll教練更表記錄:');
            llRoster.forEach(record => {
                console.log(`  - ${record.date}: ${record.location || '無地點'} - 時間: "${record.time || '空'}"`);
            });
        }
        
        // 檢查Coach_account中ll的記錄
        const accountCollection = db.collection('Coach_account');
        const llAccount = await accountCollection.find({ phone: '00000000' }).toArray();
        console.log(`📊 ll教練帳號記錄數: ${llAccount.length}`);
        if (llAccount.length > 0) {
            console.log('📋 ll教練帳號記錄:');
            llAccount.forEach(record => {
                console.log(`  - 姓名: ${record.name || record.studentName || '無姓名'} - 電話: ${record.phone || record.studentPhone || '無電話'} - 類型: ${record.type || '無類型'}`);
            });
        }
        
        await client.close();
        
    } catch (error) {
        console.error('❌ 檢查ll教練數據失敗:', error);
    }
}

checkLLWorkHours(); 