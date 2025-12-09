/**
 * 恢复 Coach_roster 集合的数据
 * 用法: 
 *   1. 从 JSON 文件恢复: node restore-coach-roster.js --file backup.json
 *   2. 从另一个集合恢复: node restore-coach-roster.js --source CollectionName
 *   3. 恢复特定 phone 的数据: node restore-coach-roster.js --phone 52236619
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// 解析命令行参数
const args = process.argv.slice(2);
const fileArg = args.find(arg => arg.startsWith('--file='));
const sourceArg = args.find(arg => arg.startsWith('--source='));
const phoneArg = args.find(arg => arg.startsWith('--phone='));
const dryRunArg = args.includes('--dry-run');

const backupFile = fileArg ? fileArg.split('=')[1] : null;
const sourceCollection = sourceArg ? sourceArg.split('=')[1] : null;
const targetPhone = phoneArg ? phoneArg.split('=')[1] : null;
const isDryRun = dryRunArg;

async function restoreFromFile(client, db, filePath) {
    console.log(`\n📂 从文件恢复: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const backupData = JSON.parse(fileContent);
    
    if (!Array.isArray(backupData)) {
        throw new Error('备份文件格式错误：应该是 JSON 数组');
    }
    
    console.log(`📊 找到 ${backupData.length} 条记录`);
    
    const collection = db.collection('Coach_roster');
    
    if (isDryRun) {
        console.log('🔍 模拟运行模式 - 不会实际写入数据');
        console.log('前 5 条记录示例:');
        backupData.slice(0, 5).forEach((record, index) => {
            console.log(`  ${index + 1}. phone: ${record.phone}, date: ${record.date}, location: ${record.location || 'N/A'}`);
        });
        return;
    }
    
    // 批量插入
    const result = await collection.insertMany(backupData, { ordered: false });
    console.log(`✅ 成功恢复 ${result.insertedCount} 条记录`);
    
    return result.insertedCount;
}

async function restoreFromCollection(client, db, sourceCollectionName) {
    console.log(`\n📋 从集合恢复: ${sourceCollectionName}`);
    
    const sourceCollection = db.collection(sourceCollectionName);
    const targetCollection = db.collection('Coach_roster');
    
    const sourceData = await sourceCollection.find({}).toArray();
    console.log(`📊 找到 ${sourceData.length} 条记录`);
    
    if (sourceData.length === 0) {
        console.log('⚠️  源集合为空，无法恢复');
        return 0;
    }
    
    if (isDryRun) {
        console.log('🔍 模拟运行模式 - 不会实际写入数据');
        console.log('前 5 条记录示例:');
        sourceData.slice(0, 5).forEach((record, index) => {
            console.log(`  ${index + 1}. phone: ${record.phone}, date: ${record.date}, location: ${record.location || 'N/A'}`);
        });
        return;
    }
    
    // 批量插入
    const result = await targetCollection.insertMany(sourceData, { ordered: false });
    console.log(`✅ 成功恢复 ${result.insertedCount} 条记录`);
    
    return result.insertedCount;
}

async function restoreByPhone(client, db, phone) {
    console.log(`\n📱 恢复特定 phone 的数据: ${phone}`);
    
    // 检查是否有备份集合
    const backupCollection = db.collection('Coach_roster_backup');
    const targetCollection = db.collection('Coach_roster');
    
    // 先尝试从备份集合恢复
    const backupData = await backupCollection.find({ phone: phone }).toArray();
    
    if (backupData.length > 0) {
        console.log(`📊 从备份集合找到 ${backupData.length} 条记录`);
        
        if (isDryRun) {
            console.log('🔍 模拟运行模式 - 不会实际写入数据');
            backupData.slice(0, 5).forEach((record, index) => {
                console.log(`  ${index + 1}. phone: ${record.phone}, date: ${record.date}, location: ${record.location || 'N/A'}`);
            });
            return;
        }
        
        const result = await targetCollection.insertMany(backupData, { ordered: false });
        console.log(`✅ 成功恢复 ${result.insertedCount} 条记录`);
        return result.insertedCount;
    }
    
    // 如果没有备份集合，检查是否有其他数据源
    console.log('⚠️  未找到备份数据');
    console.log('💡 提示: 可以创建备份集合或使用 --file 参数指定备份文件');
    
    return 0;
}

async function createBackup(client, db) {
    console.log('\n💾 创建当前数据的备份...');
    
    const collection = db.collection('Coach_roster');
    const backupCollection = db.collection('Coach_roster_backup');
    
    const allData = await collection.find({}).toArray();
    console.log(`📊 找到 ${allData.length} 条记录`);
    
    if (allData.length === 0) {
        console.log('⚠️  当前集合为空，无法创建备份');
        return;
    }
    
    // 清除旧的备份
    await backupCollection.deleteMany({});
    console.log('🗑️  已清除旧备份');
    
    // 创建新备份
    if (allData.length > 0) {
        await backupCollection.insertMany(allData);
        console.log(`✅ 已创建备份: ${allData.length} 条记录`);
    }
    
    // 同时保存为 JSON 文件
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `coach-roster-backup-${timestamp}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(allData, null, 2), 'utf8');
    console.log(`💾 已保存备份文件: ${backupFilePath}`);
}

async function restoreCoachRoster() {
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
            console.log('✅ MongoDB 连接成功');
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
        
        // 如果指定了 --backup，先创建备份
        if (args.includes('--backup')) {
            await createBackup(client, db);
            return;
        }
        
        let restoredCount = 0;
        
        if (backupFile) {
            // 从文件恢复
            restoredCount = await restoreFromFile(client, db, backupFile);
        } else if (sourceCollection) {
            // 从另一个集合恢复
            restoredCount = await restoreFromCollection(client, db, sourceCollection);
        } else if (targetPhone) {
            // 恢复特定 phone 的数据
            restoredCount = await restoreByPhone(client, db, targetPhone);
        } else {
            console.log('❌ 请指定恢复方式:');
            console.log('  1. 从文件恢复: node restore-coach-roster.js --file=backup.json');
            console.log('  2. 从集合恢复: node restore-coach-roster.js --source=Coach_roster_backup');
            console.log('  3. 恢复特定 phone: node restore-coach-roster.js --phone=52236619');
            console.log('  4. 创建备份: node restore-coach-roster.js --backup');
            console.log('  5. 模拟运行（不实际写入）: 添加 --dry-run 参数');
            return;
        }
        
        if (!isDryRun && restoredCount > 0) {
            console.log(`\n✅ 恢复完成！共恢复 ${restoredCount} 条记录`);
        } else if (isDryRun) {
            console.log('\n🔍 模拟运行完成（未实际写入数据）');
        }
        
    } catch (error) {
        console.error('❌ 恢复失败:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB 连接已关闭');
        }
    }
}

// 执行恢复
restoreCoachRoster();

