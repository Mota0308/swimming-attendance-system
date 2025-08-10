const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkCoachAccount() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const coachAccountCol = db.collection('Coach_account');

    console.log('🔍 檢查 Coach_account 資料庫中的所有記錄...\n');

    // 獲取所有記錄
    const allRecords = await coachAccountCol.find({}).toArray();
    
    console.log('📋 Coach_account 資料庫中的所有記錄:');
    console.log('=' .repeat(80));
    
    allRecords.forEach((record, index) => {
      console.log(`${index + 1}. 📱 ${record.phone} | 🔑 ${record.password} | 👤 ${record.name || '未命名'} | 🏷️ ${record.userType || '未設置'}`);
    });

    // 按類型分組統計
    const admins = allRecords.filter(r => r.userType === 'admin');
    const coaches = allRecords.filter(r => r.userType === 'coach');
    const others = allRecords.filter(r => !r.userType || r.userType !== 'admin' && r.userType !== 'coach');

    console.log('\n📊 分類統計:');
    console.log(`   👑 管理員 (admin): ${admins.length} 個`);
    admins.forEach(admin => {
      console.log(`      - ${admin.phone} (${admin.name || '未命名'})`);
    });

    console.log(`\n   🏊‍♂️ 教練 (coach): ${coaches.length} 個`);
    coaches.forEach(coach => {
      console.log(`      - ${coach.phone} (${coach.name || '未命名'})`);
    });

    if (others.length > 0) {
      console.log(`\n   ❓ 其他類型: ${others.length} 個`);
      others.forEach(other => {
        console.log(`      - ${other.phone} (userType: ${other.userType || '未設置'})`);
      });
    }

    console.log(`\n📝 總記錄數: ${allRecords.length}`);

  } catch (e) {
    console.error('❌ 檢查失敗:', e);
  } finally {
    await client.close();
  }
}

checkCoachAccount(); 