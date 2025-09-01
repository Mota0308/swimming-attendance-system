const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkCoachAccounts() {
    try {
        console.log('🔍 檢查Coach_account集合中教練帳號的結構...');
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        const accountCollection = db.collection('Coach_account');
        const accounts = await accountCollection.find({}).toArray();
        
        console.log(`📊 總共找到 ${accounts.length} 個帳號`);
        
        // 分類帳號
        const supervisors = [];
        const coaches = [];
        const others = [];
        
        accounts.forEach(account => {
            const accountInfo = {
                _id: account._id,
                phone: account.phone || account.studentPhone || '',
                name: account.name || '',
                studentName: account.studentName || '',
                type: account.type || '',
                userType: account.userType || '',
                role: account.role || ''
            };
            
            if (account.type === 'supervisor' || account.userType === 'supervisor') {
                supervisors.push(accountInfo);
            } else if (account.type === 'staff' || account.type === 'coach' || account.userType === 'coach') {
                coaches.push(accountInfo);
            } else {
                others.push(accountInfo);
            }
        });
        
        console.log('\n👑 主管帳號:');
        supervisors.forEach(account => {
            console.log(`  - ${account.name} (${account.phone}) - type: ${account.type}, userType: ${account.userType}`);
            console.log(`    字段: name="${account.name}", studentName="${account.studentName}"`);
        });
        
        console.log('\n👤 教練帳號:');
        coaches.forEach(account => {
            console.log(`  - ${account.name || account.studentName} (${account.phone}) - type: ${account.type}, userType: ${account.userType}`);
            console.log(`    字段: name="${account.name}", studentName="${account.studentName}"`);
        });
        
        console.log('\n❓ 其他帳號:');
        others.forEach(account => {
            console.log(`  - ${account.name || account.studentName} (${account.phone}) - type: ${account.type}, userType: ${account.userType}`);
            console.log(`    字段: name="${account.name}", studentName="${account.studentName}"`);
        });
        
        // 分析字段使用情況
        console.log('\n📊 字段使用分析:');
        const nameFieldCount = accounts.filter(a => a.name && a.name.trim()).length;
        const studentNameFieldCount = accounts.filter(a => a.studentName && a.studentName.trim()).length;
        const bothFieldsCount = accounts.filter(a => (a.name && a.name.trim()) && (a.studentName && a.studentName.trim())).length;
        
        console.log(`  - 使用name字段: ${nameFieldCount} 個帳號`);
        console.log(`  - 使用studentName字段: ${studentNameFieldCount} 個帳號`);
        console.log(`  - 同時使用兩個字段: ${bothFieldsCount} 個帳號`);
        
        await client.close();
        
        console.log('\n💡 建議:');
        console.log('  1. 主管帳號使用name字段');
        console.log('  2. 教練帳號使用studentName字段');
        console.log('  3. 後端API需要同時檢查兩個字段');
        
    } catch (error) {
        console.error('❌ 檢查失敗:', error);
    }
}

checkCoachAccounts(); 