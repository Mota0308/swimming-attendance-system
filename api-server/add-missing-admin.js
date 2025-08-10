const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function addMissingAdmin() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const coachAccountCol = db.collection('Coach_account');

    // 添加缺失的管理員賬號
    const missingAdmin = {
      phone: 'aaa',
      password: '123456',
      userType: 'admin',
      name: '管理員',
      createdAt: new Date()
    };

    const existing = await coachAccountCol.findOne({ phone: 'aaa' });
    if (existing) {
      console.log('⚠️ 賬號 aaa 已存在，更新 userType 為 admin');
      await coachAccountCol.updateOne(
        { phone: 'aaa' },
        { $set: { userType: 'admin', name: '管理員' } }
      );
    } else {
      console.log('✅ 添加缺失的管理員賬號 aaa');
      await coachAccountCol.insertOne(missingAdmin);
    }

    // 顯示最終結果
    console.log('\n📋 Coach_account 資料庫中的管理員賬號:');
    const adminUsers = await coachAccountCol.find({ userType: 'admin' }).toArray();
    adminUsers.forEach(admin => {
      console.log(`   📱 ${admin.phone} | 🔑 ${admin.password} | 👤 ${admin.name || '未命名'} | 🏷️ ${admin.userType}`);
    });

    console.log(`\n📊 最終統計:`);
    console.log(`   👑 管理員數量: ${adminUsers.length}`);
    console.log(`   📝 總記錄數: ${await coachAccountCol.countDocuments({})}`);

  } catch (e) {
    console.error('❌ 操作失敗:', e);
  } finally {
    await client.close();
  }
}

addMissingAdmin(); 