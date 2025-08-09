const { MongoClient } = require('mongodb');

// MongoDB 連接配置
const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';
const ACCOUNTS_COLLECTION = 'Student_account';
const COACH_COLLECTION = 'Coach_account';

async function checkUserDetails() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        
        // 檢查家長用戶詳細信息
        console.log('\n📋 檢查家長用戶詳細信息:');
        const parentCollection = db.collection(ACCOUNTS_COLLECTION);
        const parentUsers = await parentCollection.find({}).toArray();
        
        parentUsers.forEach((user, index) => {
            console.log(`\n用戶 ${index + 1}:`);
            console.log(JSON.stringify(user, null, 2));
        });
        
        // 檢查教練用戶詳細信息
        console.log('\n👨‍🏫 檢查教練用戶詳細信息:');
        const coachCollection = db.collection(COACH_COLLECTION);
        const coachUsers = await coachCollection.find({}).toArray();
        
        coachUsers.forEach((user, index) => {
            console.log(`\n用戶 ${index + 1}:`);
            console.log(JSON.stringify(user, null, 2));
        });
        
    } catch (error) {
        console.error('❌ 檢查用戶詳細信息時發生錯誤:', error);
    } finally {
        await client.close();
        console.log('\n🔌 已斷開 MongoDB 連接');
    }
}

// 運行檢查
checkUserDetails(); 