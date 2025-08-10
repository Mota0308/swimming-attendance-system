const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function createNewAdmin() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('Administrator');

    // 新的管理員賬號信息
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
      }
    ];

    for (const account of adminAccounts) {
      const existing = await col.findOne({ phone: account.phone });
      if (existing) {
        console.log(`⚠️ 管理者已存在: ${account.phone} (${account.name})`);
      } else {
        await col.insertOne(account);
        console.log(`✅ 已新增管理者: ${account.phone} (${account.name})`);
      }
    }

    // 顯示所有管理員
    console.log('\n📋 當前所有管理員賬號:');
    const allAdmins = await col.find({}).toArray();
    allAdmins.forEach(admin => {
      console.log(`   📱 ${admin.phone} | 🔑 ${admin.password} | 👤 ${admin.name || '未命名'}`);
    });

  } catch (e) {
    console.error('❌ 新增管理者失敗:', e);
  } finally {
    await client.close();
  }
}

createNewAdmin(); 