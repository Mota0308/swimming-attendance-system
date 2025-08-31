const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkWorkHoursData() {
    try {
        console.log('🔍 檢查Coach_work_hours集合中的數據...');
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        // 檢查Coach_work_hours集合
        const workHoursCollection = db.collection('Coach_work_hours');
        const workHoursCount = await workHoursCollection.countDocuments();
        console.log(`📊 Coach_work_hours集合總文檔數: ${workHoursCount}`);
        
        if (workHoursCount > 0) {
            const workHoursData = await workHoursCollection.find({}).limit(10).toArray();
            console.log('📋 Coach_work_hours集合中的數據樣本:', workHoursData);
        } else {
            console.log('❌ Coach_work_hours集合中沒有數據');
        }
        
        // 檢查Coach_roster集合（對比）
        const rosterCollection = db.collection('Coach_roster');
        const rosterCount = await rosterCollection.countDocuments();
        console.log(`📊 Coach_roster集合總文檔數: ${rosterCount}`);
        
        if (rosterCount > 0) {
            const rosterData = await rosterCollection.find({}).limit(5).toArray();
            console.log('📋 Coach_roster集合中的數據樣本:', rosterData);
        }
        
        // 檢查Coach_account集合
        const accountCollection = db.collection('Coach_account');
        const accountCount = await accountCollection.countDocuments();
        console.log(`📊 Coach_account集合總文檔數: ${accountCount}`);
        
        if (accountCount > 0) {
            const accountData = await accountCollection.find({}).limit(5).toArray();
            console.log('📋 Coach_account集合中的數據樣本:', accountData);
        }
        
        await client.close();
        
        console.log('\n💡 分析結果:');
        if (workHoursCount === 0) {
            console.log('❌ 問題：Coach_work_hours集合中沒有數據');
            console.log('💡 解決方案：需要將Coach_roster中的數據轉換為工時數據，或者創建工時記錄');
        } else {
            console.log('✅ Coach_work_hours集合中有數據');
        }
        
    } catch (error) {
        console.error('❌ 檢查失敗:', error);
    }
}

checkWorkHoursData(); 