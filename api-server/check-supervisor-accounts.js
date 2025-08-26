const { MongoClient } = require('mongodb');

// MongoDB 連接配置
const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function checkSupervisorAccounts() {
    console.log('🔍 檢查主管賬號...\n');
    
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 已連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        
        // 檢查 Coach_account 集合中的主管賬號
        console.log('\n📋 檢查 Coach_account 集合中的主管賬號:');
        const coachCollection = db.collection('Coach_account');
        const supervisors = await coachCollection.find({
            $or: [
                { userType: 'supervisor' },
                { type: 'supervisor' },
                { role: 'supervisor' }
            ]
        }).toArray();
        
        if (supervisors.length > 0) {
            console.log(`✅ 找到 ${supervisors.length} 個主管賬號:`);
            supervisors.forEach((supervisor, index) => {
                console.log(`\n   ${index + 1}. 主管賬號:`);
                console.log(`      電話: ${supervisor.phone || '未設置'}`);
                console.log(`      密碼: ${supervisor.password || '未設置'}`);
                console.log(`      姓名: ${supervisor.name || supervisor.studentName || '未設置'}`);
                console.log(`      用戶類型: ${supervisor.userType || supervisor.type || supervisor.role || '未設置'}`);
                console.log(`      郵箱: ${supervisor.email || '未設置'}`);
            });
        } else {
            console.log('❌ 在 Coach_account 集合中沒有找到主管賬號');
        }
        
        // 檢查 Administrator 集合
        console.log('\n📋 檢查 Administrator 集合:');
        const adminCollection = db.collection('Administrator');
        const admins = await adminCollection.find({}).toArray();
        
        if (admins.length > 0) {
            console.log(`✅ 找到 ${admins.length} 個管理員賬號:`);
            admins.forEach((admin, index) => {
                console.log(`\n   ${index + 1}. 管理員賬號:`);
                console.log(`      電話: ${admin.phone || '未設置'}`);
                console.log(`      密碼: ${admin.password || '未設置'}`);
                console.log(`      姓名: ${admin.name || admin.studentName || '未設置'}`);
                console.log(`      用戶類型: ${admin.userType || admin.type || admin.role || 'admin'}`);
                console.log(`      郵箱: ${admin.email || '未設置'}`);
            });
        } else {
            console.log('❌ 在 Administrator 集合中沒有找到管理員賬號');
        }
        
        // 檢查所有可能的用戶類型
        console.log('\n📊 統計所有用戶類型:');
        const allCoachAccounts = await coachCollection.find({}).toArray();
        const userTypes = {};
        
        allCoachAccounts.forEach(account => {
            const userType = account.userType || account.type || account.role || 'unknown';
            userTypes[userType] = (userTypes[userType] || 0) + 1;
        });
        
        Object.entries(userTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} 個賬號`);
        });
        
        // 顯示所有賬號的電話號碼（用於測試）
        console.log('\n📱 所有 Coach_account 的電話號碼:');
        allCoachAccounts.forEach((account, index) => {
            console.log(`   ${index + 1}. ${account.phone || '未設置'} (${account.userType || account.type || account.role || 'unknown'})`);
        });
        
    } catch (error) {
        console.error('❌ 檢查主管賬號時發生錯誤:', error);
    } finally {
        await client.close();
        console.log('\n🔒 已關閉數據庫連接');
    }
}

// 運行檢查
checkSupervisorAccounts(); 