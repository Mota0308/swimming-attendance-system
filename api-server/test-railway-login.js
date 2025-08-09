const { MongoClient } = require('mongodb');

// Railway 環境變量
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function testRailwayLogin() {
    const client = new MongoClient(MONGO_URI);
    try {
        console.log('🔗 連接到 Railway 數據庫...');
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection('Administrator');
        
        // 模擬 Railway 的登入邏輯
        const phone = 'aaa';
        const password = '123456';
        const userType = 'admin';
        
        console.log(`🔐 測試登入 - 電話: ${phone}, 用戶類型: ${userType}`);
        
        // 查找用戶（使用電話號碼作為賬號）
        const user = await collection.findOne({
            phone: phone,
            password: password
        });
        
        if (user) {
            console.log(`✅ 用戶登入成功 - ${phone}, 類型: ${user.userType || userType}`);
            console.log('用戶信息:', {
                id: user._id,
                phone: user.phone,
                userType: user.userType || userType || 'parent',
                studentName: user.studentName || ''
            });
        } else {
            console.log(`❌ 用戶登入失敗 - ${phone}`);
            console.log('可能的原因:');
            console.log('1. 用戶不存在');
            console.log('2. 密碼錯誤');
            console.log('3. 用戶類型不匹配');
            
            // 檢查用戶是否存在
            const existingUser = await collection.findOne({ phone: phone });
            if (existingUser) {
                console.log('用戶存在，但密碼可能不匹配');
                console.log('存儲的密碼:', existingUser.password);
                console.log('輸入的密碼:', password);
            } else {
                console.log('用戶不存在');
            }
        }
        
    } catch (error) {
        console.error('❌ 登入測試錯誤:', error);
    } finally {
        await client.close();
    }
}

testRailwayLogin(); 