const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function createWebAdmin() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    // 检查使用哪个集合（Administrator 或 Coach_account）
    const adminCol = db.collection('Administrator');
    const coachCol = db.collection('Coach_account');
    
    // 网页版管理员测试账号信息
    const webAdminAccounts = [
      {
        phone: 'admin999',
        password: 'admin999',
        userType: 'admin',
        name: '网页版管理员',
        email: 'admin@swimming.com',
        role: 'web_admin',
        permissions: ['manage_users', 'manage_locations', 'manage_clubs', 'view_reports'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        phone: 'webadmin',
        password: 'webadmin123',
        userType: 'admin',
        name: '网页版测试管理员',
        email: 'test@swimming.com',
        role: 'web_admin',
        permissions: ['manage_users', 'manage_locations', 'manage_clubs', 'view_reports'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        phone: '99999999',
        password: '99999999',
        userType: 'admin',
        name: '网页版超级管理员',
        email: 'super@swimming.com',
        role: 'web_admin',
        permissions: ['manage_users', 'manage_locations', 'manage_clubs', 'view_reports', 'system_admin'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    console.log('🚀 开始创建网页版管理员测试账号...\n');

    // 尝试在 Administrator 集合中创建
    console.log('📋 尝试在 Administrator 集合中创建账号...');
    for (const account of webAdminAccounts) {
      const existing = await adminCol.findOne({ phone: account.phone });
      if (existing) {
        console.log(`⚠️  管理员已存在: ${account.phone} (${account.name})`);
        // 更新现有账号为网页版管理员
        await adminCol.updateOne(
          { phone: account.phone },
          { 
            $set: { 
              userType: 'admin',
              role: 'web_admin',
              permissions: account.permissions,
              updatedAt: new Date()
            } 
          }
        );
        console.log(`✅  已更新为网页版管理员: ${account.phone}`);
      } else {
        await adminCol.insertOne(account);
        console.log(`✅  已新增网页版管理员: ${account.phone} (${account.name})`);
      }
    }

    // 尝试在 Coach_account 集合中创建（作为备用）
    console.log('\n📋 尝试在 Coach_account 集合中创建账号...');
    for (const account of webAdminAccounts) {
      const existing = await coachCol.findOne({ phone: account.phone });
      if (existing) {
        console.log(`⚠️  教练账号已存在: ${account.phone} (${account.name})`);
        // 更新现有账号为管理员
        await coachCol.updateOne(
          { phone: account.phone },
          { 
            $set: { 
              userType: 'admin',
              role: 'web_admin',
              permissions: account.permissions,
              updatedAt: new Date()
            } 
          }
        );
        console.log(`✅  已更新为网页版管理员: ${account.phone}`);
      } else {
        await coachCol.insertOne(account);
        console.log(`✅  已新增网页版管理员: ${account.phone} (${account.name})`);
      }
    }

    // 显示所有网页版管理员
    console.log('\n📋 Administrator 集合中的网页版管理员:');
    const adminAdmins = await adminCol.find({ userType: 'admin', role: 'web_admin' }).toArray();
    adminAdmins.forEach(admin => {
      console.log(`   📱 ${admin.phone} | 🔑 ${admin.password} | 👤 ${admin.name} | 🏷️ ${admin.role}`);
    });

    console.log('\n📋 Coach_account 集合中的网页版管理员:');
    const coachAdmins = await coachCol.find({ userType: 'admin', role: 'web_admin' }).toArray();
    coachAdmins.forEach(admin => {
      console.log(`   📱 ${admin.phone} | 🔑 ${admin.password} | 👤 ${admin.name} | 🏷️ ${admin.role}`);
    });

    console.log('\n🎉 网页版管理员测试账号创建完成！');
    console.log('\n📝 测试账号信息:');
    console.log('   账号1: admin999 / admin999 (网页版管理员)');
    console.log('   账号2: webadmin / webadmin123 (网页版测试管理员)');
    console.log('   账号3: 99999999 / 99999999 (网页版超级管理员)');
    console.log('\n💡 使用这些账号可以在网页版中测试管理员功能');

  } catch (e) {
    console.error('❌ 创建网页版管理员失败:', e);
  } finally {
    await client.close();
  }
}

createWebAdmin(); 