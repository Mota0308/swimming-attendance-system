const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function testCoachLogin() {
    try {
        console.log('🔍 測試教練登錄信息...');
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        // 檢查教練賬號集合
        const coachAccounts = db.collection('Coach_account');
        const coachDocs = await coachAccounts.find({}).toArray();
        console.log(`📊 教練賬號集合中共有 ${coachDocs.length} 條記錄`);
        
        if (coachDocs.length > 0) {
            console.log('📋 所有教練賬號:');
            coachDocs.forEach((doc, index) => {
                console.log(`  ${index + 1}. phone: ${doc.phone}, name: ${doc.name}, password: ${doc.password}`);
            });
        }
        
        // 檢查特定電話號碼
        const targetPhone = '66666666';
        const coachDoc = await coachAccounts.findOne({ phone: targetPhone });
        
        if (coachDoc) {
            console.log(`\n✅ 找到電話號碼 ${targetPhone} 的教練:`);
            console.log(`  姓名: ${coachDoc.name}`);
            console.log(`  密碼: ${coachDoc.password}`);
        } else {
            console.log(`\n❌ 沒有找到電話號碼 ${targetPhone} 的教練`);
        }
        
        // 檢查更表集合中是否有對應的數據
        const rosterCollection = db.collection('Coach_roster');
        const rosterDocs = await rosterCollection.find({ phone: targetPhone }).toArray();
        console.log(`\n📊 更表集合中電話號碼 ${targetPhone} 的記錄: ${rosterDocs.length} 條`);
        
        if (rosterDocs.length > 0) {
            console.log('📋 更表記錄:');
            rosterDocs.forEach((doc, index) => {
                console.log(`  ${index + 1}. name: ${doc.name}, date: ${doc.date}, time: ${doc.time}, location: ${doc.location}`);
            });
        }
        
        await client.close();
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

testCoachLogin(); 