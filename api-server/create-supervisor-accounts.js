const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function createSupervisorAccounts() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('Coach_account');
    
    // 主管测试账号信息
    const supervisorAccounts = [
      {
        phone: 'supervisor001',
        password: 'supervisor123',
        userType: 'supervisor',
        type: 'supervisor',
        name: '主管001',
        email: 'supervisor001@swimming.com',
        role: 'supervisor',
        permissions: ['view_all_coaches', 'manage_work_hours', 'manage_schedules', 'view_reports'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        phone: 'supervisor002',
        password: 'supervisor456',
        userType: 'supervisor',
        type: 'supervisor',
        name: '主管002',
        email: 'supervisor002@swimming.com',
        role: 'supervisor',
        permissions: ['view_all_coaches', 'manage_work_hours', 'manage_schedules', 'view_reports'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        phone: '88888888',
        password: '88888888',
        userType: 'supervisor',
        type: 'supervisor',
        name: '超级主管',
        email: 'super@swimming.com',
        role: 'supervisor',
        permissions: ['view_all_coaches', 'manage_work_hours', 'manage_schedules', 'view_reports', 'system_admin'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    console.log('🚀 开始创建主管测试账号...\n');

    for (const account of supervisorAccounts) {
      const existing = await col.findOne({ phone: account.phone });
      if (existing) {
        console.log(`⚠️  主管账号已存在: ${account.phone} (${account.name})`);
        // 更新现有账号为主管
        await col.updateOne(
          { phone: account.phone },
          { 
            $set: { 
              userType: 'supervisor',
              type: 'supervisor',
              role: 'supervisor',
              permissions: account.permissions,
              updatedAt: new Date()
            } 
          }
        );
        console.log(`✅  已更新为主管账号: ${account.phone}`);
      } else {
        await col.insertOne(account);
        console.log(`✅  已新增主管账号: ${account.phone} (${account.name})`);
      }
    }

    // 显示所有主管账号
    console.log('\n📋 当前所有主管账号:');
    const allSupervisors = await col.find({ userType: 'supervisor', type: 'supervisor' }).toArray();
    allSupervisors.forEach(supervisor => {
      console.log(`   📱 ${supervisor.phone} | 🔑 ${supervisor.password} | 👤 ${supervisor.name} | 🏷️ ${supervisor.type}`);
    });

    // 显示所有账号类型统计
    console.log('\n📊 账号类型统计:');
    const coachCount = await col.countDocuments({ type: 'staff' });
    const supervisorCount = await col.countDocuments({ type: 'supervisor' });
    const adminCount = await col.countDocuments({ type: 'admin' });
    
    console.log(`   教練 (staff): ${coachCount} 個`);
    console.log(`   主管 (supervisor): ${supervisorCount} 個`);
    console.log(`   管理員 (admin): ${adminCount} 個`);

    console.log('\n🎉 主管测试账号创建完成！');
    console.log('\n📝 测试账号信息:');
    console.log('   账号1: supervisor001 / supervisor123 (主管001)');
    console.log('   账号2: supervisor002 / supervisor456 (主管002)');
    console.log('   账号3: 88888888 / 88888888 (超级主管)');
    console.log('\n💡 使用这些账号可以在网页版中测试主管功能');

  } catch (e) {
    console.error('❌ 创建主管账号失败:', e);
  } finally {
    await client.close();
  }
}

createSupervisorAccounts(); 