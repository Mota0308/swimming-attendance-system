const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function fixCoachName() {
    try {
        console.log('🔧 修復教練姓名...');
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        // 更新教練賬號中的姓名
        const coachAccounts = db.collection('Coach_account');
        const result = await coachAccounts.updateOne(
            { phone: '66666666' },
            { $set: { name: 'AAAb' } }
        );
        
        if (result.modifiedCount > 0) {
            console.log('✅ 成功更新教練姓名');
        } else {
            console.log('❌ 沒有找到需要更新的記錄');
        }
        
        // 驗證更新結果
        const updatedCoach = await coachAccounts.findOne({ phone: '66666666' });
        if (updatedCoach) {
            console.log(`📋 更新後的教練信息:`);
            console.log(`  電話: ${updatedCoach.phone}`);
            console.log(`  姓名: ${updatedCoach.name}`);
            console.log(`  密碼: ${updatedCoach.password}`);
        }
        
        await client.close();
        
    } catch (error) {
        console.error('❌ 修復失敗:', error);
    }
}

fixCoachName(); 