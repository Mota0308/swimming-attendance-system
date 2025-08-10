const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function addAdminToCoachAccount() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const coachAccountCol = db.collection('Coach_account');

    // 管理員賬號信息
    const adminAccounts = [
      {
        phone: 'admin001',
        password: 'admin123',
        userType: 'admin',
        name: '系統管理員',
        createdAt: new Date()
      },
      {
        phone: 'admin002', 
        password: 'password123',
        userType: 'admin',
        name: '副管理員',
        createdAt: new Date()
      },
      {
        phone: '88888888',
        password: '88888888',
        userType: 'admin',
        name: '超級管理員',
        createdAt: new Date()
      },
      {
        phone: 'aaa',
        password: '123456',
        userType: 'admin',
        name: '管理員',
        createdAt: new Date()
      }
    ];

    console.log('🔄 開始將管理員賬號添加到 Coach_account 資料庫...\n');

    for (const account of adminAccounts) {
      const existing = await coachAccountCol.findOne({ phone: account.phone });
      if (existing) {
        console.log(`⚠️ 賬號已存在: ${account.phone} (${account.name})`);
        // 更新現有記錄的 userType
        await coachAccountCol.updateOne(
          { phone: account.phone },
          { $set: { userType: 'admin', name: account.name } }
        );
        console.log(`   ✅ 已更新 userType 為 admin`);
      } else {
        await coachAccountCol.insertOne(account);
        console.log(`✅ 已新增管理員: ${account.phone} (${account.name})`);
      }
    }

    // 顯示 Coach_account 中的所有管理員
    console.log('\n📋 Coach_account 資料庫中的管理員賬號:');
    const adminUsers = await coachAccountCol.find({ userType: 'admin' }).toArray();
    adminUsers.forEach(admin => {
      console.log(`   📱 ${admin.phone} | 🔑 ${admin.password} | 👤 ${admin.name || '未命名'} | 🏷️ ${admin.userType}`);
    });

    // 顯示統計信息
    const totalAdmins = await coachAccountCol.countDocuments({ userType: 'admin' });
    const totalCoaches = await coachAccountCol.countDocuments({ userType: 'coach' });
    console.log(`\n📊 統計信息:`);
    console.log(`   👑 管理員數量: ${totalAdmins}`);
    console.log(`   🏊‍♂️ 教練數量: ${totalCoaches}`);
    console.log(`   📝 總記錄數: ${totalAdmins + totalCoaches}`);

  } catch (e) {
    console.error('❌ 操作失敗:', e);
  } finally {
    await client.close();
  }
}

addAdminToCoachAccount(); 