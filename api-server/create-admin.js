const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function createAdmin(phone, password) {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('Administrator');

    const existing = await col.findOne({ phone });
    if (existing) {
      console.log(`⚠️ 管理者已存在: ${phone}`);
      return;
    }

    const doc = {
      phone,
      password,
      userType: 'admin',
      createdAt: new Date(),
    };
    await col.insertOne(doc);
    console.log(`✅ 已新增管理者: ${phone}`);
  } catch (e) {
    console.error('❌ 新增管理者失敗:', e);
  } finally {
    await client.close();
  }
}

// 執行：node create-admin.js aaa 123456
const [,, phoneArg, passwordArg] = process.argv;
if (!phoneArg || !passwordArg) {
  console.log('用法: node create-admin.js <phone> <password>');
  process.exit(1);
}
createAdmin(phoneArg, passwordArg); 