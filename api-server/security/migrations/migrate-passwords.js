/**
 * 密码哈希迁移脚本
 * 将数据库中的明文密码迁移为 bcrypt 哈希密码
 * 
 * 使用方法：
 * node security/migrations/migrate-passwords.js
 * 
 * 注意：运行前请先备份数据库！
 */

const { MongoClient } = require('mongodb');
const { hashPassword } = require('../utils/password-utils');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI;
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

if (!MONGO_BASE_URI) {
    console.error('❌ 错误: MONGO_BASE_URI 环境变量未设置');
    process.exit(1);
}

async function migratePasswords() {
    const client = new MongoClient(MONGO_BASE_URI);
    
    try {
        await client.connect();
        console.log('✅ 已连接到 MongoDB');
        
        const db = client.db(DEFAULT_DB_NAME);
        
        // 迁移 Admin_account
        console.log('\n📋 开始迁移 Admin_account 集合...');
        const adminCollection = db.collection('Admin_account');
        
        // 查找需要迁移的用户（密码不是 bcrypt 格式）
        const adminUsers = await adminCollection.find({ 
            password: { 
                $exists: true,
                $not: { $regex: /^\$2[aby]/ } // 不是 bcrypt 哈希（$2a$, $2b$, $2y$）
            } 
        }).toArray();
        
        console.log(`找到 ${adminUsers.length} 个需要迁移的 Admin 账户`);
        
        let migratedCount = 0;
        for (const user of adminUsers) {
            if (user.password && typeof user.password === 'string' && !user.password.startsWith('$2')) {
                try {
                    const hashed = await hashPassword(user.password);
                    await adminCollection.updateOne(
                        { _id: user._id },
                        { $set: { password: hashed } }
                    );
                    console.log(`✅ 已迁移用户: ${user.phone || user._id}`);
                    migratedCount++;
                } catch (error) {
                    console.error(`❌ 迁移用户失败: ${user.phone || user._id}`, error.message);
                }
            }
        }
        
        console.log(`✅ Admin_account 迁移完成: ${migratedCount}/${adminUsers.length}`);
        
        // 迁移 Coach_account
        console.log('\n📋 开始迁移 Coach_account 集合...');
        const coachCollection = db.collection('Coach_account');
        
        const coachUsers = await coachCollection.find({ 
            password: { 
                $exists: true,
                $not: { $regex: /^\$2[aby]/ }
            } 
        }).toArray();
        
        console.log(`找到 ${coachUsers.length} 个需要迁移的 Coach 账户`);
        
        migratedCount = 0;
        for (const user of coachUsers) {
            if (user.password && typeof user.password === 'string' && !user.password.startsWith('$2')) {
                try {
                    const hashed = await hashPassword(user.password);
                    await coachCollection.updateOne(
                        { _id: user._id },
                        { $set: { password: hashed } }
                    );
                    console.log(`✅ 已迁移用户: ${user.phone || user.studentPhone || user._id}`);
                    migratedCount++;
                } catch (error) {
                    console.error(`❌ 迁移用户失败: ${user.phone || user.studentPhone || user._id}`, error.message);
                }
            }
        }
        
        console.log(`✅ Coach_account 迁移完成: ${migratedCount}/${coachUsers.length}`);
        
        console.log('\n✅ 密码迁移完成！');
        
    } catch (error) {
        console.error('❌ 迁移失败:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('✅ 已断开 MongoDB 连接');
    }
}

// 运行迁移
if (require.main === module) {
    console.log('⚠️  警告: 此脚本将修改数据库中的密码！');
    console.log('⚠️  请确保已备份数据库！');
    console.log('⚠️  5秒后开始迁移...\n');
    
    setTimeout(() => {
        migratePasswords().catch(console.error);
    }, 5000);
}

module.exports = { migratePasswords };

