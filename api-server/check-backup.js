/**
 * 检查 Coach_roster 的备份数据
 * 用法: node check-backup.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

async function checkBackup() {
    let client;
    const maxRetries = 5;
    const retryDelay = 3000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔗 连接到 MongoDB... (尝试 ${attempt}/${maxRetries})`);
            client = new MongoClient(MONGO_BASE_URI, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 30000
            });
            await client.connect();
            console.log('✅ MongoDB 连接成功\n');
            break;
        } catch (error) {
            console.error(`❌ 连接失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
            if (attempt < maxRetries) {
                console.log(`⏳ ${retryDelay/1000}秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                throw new Error(`连接失败，已重试 ${maxRetries} 次: ${error.message}`);
            }
        }
    }
    
    try {
        const db = client.db(DEFAULT_DB_NAME);
        
        console.log('='.repeat(60));
        console.log('📊 检查 Coach_roster 备份数据');
        console.log('='.repeat(60));
        
        // 1. 检查当前 Coach_roster 集合
        console.log('\n1️⃣ 检查当前 Coach_roster 集合...');
        const coachRosterCollection = db.collection('Coach_roster');
        const currentCount = await coachRosterCollection.countDocuments({});
        console.log(`   📋 当前记录数: ${currentCount}`);
        
        if (currentCount > 0) {
            const sampleRecords = await coachRosterCollection.find({}).limit(3).toArray();
            console.log('   📝 示例记录:');
            sampleRecords.forEach((record, index) => {
                console.log(`      ${index + 1}. phone: ${record.phone || 'N/A'}, date: ${record.date || 'N/A'}, location: ${Array.isArray(record.location) ? record.location.join(', ') : (record.location || 'N/A')}`);
            });
        }
        
        // 2. 检查备份集合
        console.log('\n2️⃣ 检查备份集合...');
        const backupCollection = db.collection('Coach_roster_backup');
        const backupCount = await backupCollection.countDocuments({});
        console.log(`   📋 备份记录数: ${backupCount}`);
        
        if (backupCount > 0) {
            const sampleBackup = await backupCollection.find({}).limit(3).toArray();
            console.log('   📝 示例备份记录:');
            sampleBackup.forEach((record, index) => {
                console.log(`      ${index + 1}. phone: ${record.phone || 'N/A'}, date: ${record.date || 'N/A'}, location: ${Array.isArray(record.location) ? record.location.join(', ') : (record.location || 'N/A')}`);
            });
            
            // 按 phone 分组统计
            const phoneGroups = await backupCollection.aggregate([
                {
                    $group: {
                        _id: '$phone',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).toArray();
            
            if (phoneGroups.length > 0) {
                console.log('   📱 备份数据按 phone 分组（前10个）:');
                phoneGroups.forEach((group, index) => {
                    console.log(`      ${index + 1}. phone: ${group._id || 'N/A'}, 记录数: ${group.count}`);
                });
            }
        } else {
            console.log('   ⚠️  未找到备份集合');
        }
        
        // 3. 检查所有集合，看是否有其他可能的备份
        console.log('\n3️⃣ 检查其他可能的备份集合...');
        const allCollections = await db.listCollections().toArray();
        const possibleBackups = allCollections
            .map(c => c.name)
            .filter(name => 
                name.toLowerCase().includes('roster') && 
                name !== 'Coach_roster' && 
                name !== 'Coach_roster_backup'
            );
        
        if (possibleBackups.length > 0) {
            console.log(`   📋 找到 ${possibleBackups.length} 个可能的备份集合:`);
            for (const collectionName of possibleBackups) {
                const collection = db.collection(collectionName);
                const count = await collection.countDocuments({});
                console.log(`      - ${collectionName}: ${count} 条记录`);
            }
        } else {
            console.log('   ⚠️  未找到其他可能的备份集合');
        }
        
        // 4. 检查本地备份文件
        console.log('\n4️⃣ 检查本地备份文件...');
        const backupDir = path.join(__dirname, 'backups');
        
        if (fs.existsSync(backupDir)) {
            const files = fs.readdirSync(backupDir)
                .filter(file => file.endsWith('.json') && file.includes('coach-roster'));
            
            if (files.length > 0) {
                console.log(`   📋 找到 ${files.length} 个备份文件:`);
                files.sort().reverse().slice(0, 10).forEach((file, index) => {
                    const filePath = path.join(backupDir, file);
                    const stats = fs.statSync(filePath);
                    const fileSize = (stats.size / 1024).toFixed(2);
                    console.log(`      ${index + 1}. ${file} (${fileSize} KB, ${stats.mtime.toLocaleString()})`);
                });
            } else {
                console.log('   ⚠️  未找到备份文件');
            }
        } else {
            console.log('   ⚠️  备份目录不存在');
        }
        
        // 5. 检查是否有特定 phone 的数据（如果之前删除了）
        console.log('\n5️⃣ 检查特定 phone 的数据...');
        const targetPhones = ['52236619']; // 可以添加其他需要检查的 phone
        
        for (const phone of targetPhones) {
            const currentData = await coachRosterCollection.countDocuments({ phone: phone });
            const backupData = backupCount > 0 ? await backupCollection.countDocuments({ phone: phone }) : 0;
            
            console.log(`   📱 phone: ${phone}`);
            console.log(`      - 当前集合: ${currentData} 条记录`);
            console.log(`      - 备份集合: ${backupData} 条记录`);
            
            if (currentData === 0 && backupData > 0) {
                console.log(`      ✅ 可以在备份集合中找到数据，可以恢复`);
            } else if (currentData === 0 && backupData === 0) {
                console.log(`      ❌ 当前和备份中都没有数据，无法恢复`);
            }
        }
        
        // 总结
        console.log('\n' + '='.repeat(60));
        console.log('📊 检查总结');
        console.log('='.repeat(60));
        console.log(`当前 Coach_roster 记录数: ${currentCount}`);
        console.log(`备份集合记录数: ${backupCount}`);
        console.log(`本地备份文件数: ${fs.existsSync(backupDir) ? fs.readdirSync(backupDir).filter(f => f.includes('coach-roster')).length : 0}`);
        
        if (backupCount > 0) {
            console.log('\n✅ 找到备份数据！可以使用以下命令恢复:');
            console.log('   node restore-coach-roster.js --source=Coach_roster_backup');
        } else if (fs.existsSync(backupDir) && fs.readdirSync(backupDir).filter(f => f.includes('coach-roster')).length > 0) {
            const latestFile = fs.readdirSync(backupDir)
                .filter(f => f.includes('coach-roster'))
                .sort()
                .reverse()[0];
            console.log('\n✅ 找到本地备份文件！可以使用以下命令恢复:');
            console.log(`   node restore-coach-roster.js --file=backups/${latestFile}`);
        } else {
            console.log('\n⚠️  未找到备份数据！');
            console.log('💡 建议: 运行以下命令创建当前数据的备份:');
            console.log('   node restore-coach-roster.js --backup');
        }
        
    } catch (error) {
        console.error('❌ 检查失败:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB 连接已关闭');
        }
    }
}

// 执行检查
checkBackup();

