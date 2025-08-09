const { MongoClient } = require('mongodb');

// Railway 環境變量
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

console.log('🔍 檢查 Railway 數據庫配置...');
console.log('MONGODB_URI:', MONGO_URI);
console.log('DB_NAME:', DB_NAME);

async function testRailwayDB() {
    const client = new MongoClient(MONGO_URI);
    try {
        console.log('🔗 連接到 Railway 數據庫...');
        await client.connect();
        console.log('✅ 數據庫連接成功');
        
        const db = client.db(DB_NAME);
        console.log('📊 使用數據庫:', DB_NAME);
        
        // 檢查 Administrator 集合
        const adminCollection = db.collection('Administrator');
        const adminCount = await adminCollection.countDocuments();
        console.log('👤 Administrator 集合中的文檔數量:', adminCount);
        
        // 檢查現有的管理員
        const admins = await adminCollection.find({}).toArray();
        console.log('📋 現有管理員:', admins.map(a => ({ phone: a.phone, userType: a.userType })));
        
        // 創建管理員賬號
        const adminData = {
            phone: 'aaa',
            password: '123456',
            userType: 'admin',
            createdAt: new Date()
        };
        
        const existingAdmin = await adminCollection.findOne({ phone: 'aaa' });
        if (existingAdmin) {
            console.log('⚠️ 管理員 aaa 已存在');
        } else {
            await adminCollection.insertOne(adminData);
            console.log('✅ 已創建管理員賬號: aaa');
        }
        
        // 測試登入
        const testLogin = await adminCollection.findOne({ 
            phone: 'aaa', 
            password: '123456' 
        });
        
        if (testLogin) {
            console.log('✅ 登入測試成功');
        } else {
            console.log('❌ 登入測試失敗');
        }
        
    } catch (error) {
        console.error('❌ 數據庫連接錯誤:', error);
    } finally {
        await client.close();
    }
}

testRailwayDB(); 