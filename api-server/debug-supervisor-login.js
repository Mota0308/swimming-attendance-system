const { MongoClient } = require('mongodb');

// MongoDB 連接配置
const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function debugSupervisorLogin() {
    console.log('🔍 調試主管賬號登入問題...\n');
    
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 已連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        const coachCollection = db.collection('Coach_account');
        
        // 測試主管賬號
        const supervisorAccounts = [
            { phone: 'supervisor001', password: 'supervisor123' },
            { phone: 'supervisor002', password: 'supervisor456' },
            { phone: '88888888', password: '88888888' }
        ];
        
        for (const account of supervisorAccounts) {
            console.log(`\n🔍 調試賬號: ${account.phone}`);
            
            // 1. 檢查是否存在該電話號碼
            const userByPhone = await coachCollection.findOne({ phone: account.phone });
            console.log(`   1. 按電話號碼查找: ${userByPhone ? '找到' : '未找到'}`);
            if (userByPhone) {
                console.log(`      用戶數據:`, JSON.stringify(userByPhone, null, 2));
            }
            
            // 2. 檢查密碼是否匹配
            if (userByPhone) {
                const passwordMatch = userByPhone.password === account.password;
                console.log(`   2. 密碼匹配: ${passwordMatch ? '是' : '否'}`);
                console.log(`      數據庫密碼: ${userByPhone.password}`);
                console.log(`      輸入密碼: ${account.password}`);
            }
            
            // 3. 檢查用戶類型
            if (userByPhone) {
                const userType = userByPhone.userType || userByPhone.type || userByPhone.role;
                console.log(`   3. 用戶類型: ${userType}`);
            }
            
            // 4. 模擬登入邏輯
            if (userByPhone) {
                const loginQuery = {
                    phone: account.phone,
                    password: account.password
                };
                console.log(`   4. 登入查詢條件:`, JSON.stringify(loginQuery, null, 2));
                
                const loginResult = await coachCollection.findOne(loginQuery);
                console.log(`      查詢結果: ${loginResult ? '成功' : '失敗'}`);
            }
        }
        
        // 檢查所有主管賬號的完整數據
        console.log('\n📋 所有主管賬號的完整數據:');
        const allSupervisors = await coachCollection.find({
            $or: [
                { userType: 'supervisor' },
                { type: 'supervisor' },
                { role: 'supervisor' }
            ]
        }).toArray();
        
        allSupervisors.forEach((supervisor, index) => {
            console.log(`\n   主管 ${index + 1}:`);
            console.log(`      _id: ${supervisor._id}`);
            console.log(`      phone: ${supervisor.phone}`);
            console.log(`      password: ${supervisor.password}`);
            console.log(`      name: ${supervisor.name}`);
            console.log(`      userType: ${supervisor.userType}`);
            console.log(`      type: ${supervisor.type}`);
            console.log(`      role: ${supervisor.role}`);
            console.log(`      email: ${supervisor.email}`);
        });
        
    } catch (error) {
        console.error('❌ 調試時發生錯誤:', error);
    } finally {
        await client.close();
        console.log('\n🔒 已關閉數據庫連接');
    }
}

// 運行調試
debugSupervisorLogin(); 