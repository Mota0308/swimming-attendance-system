const { MongoClient } = require('mongodb');

// MongoDB 連接配置
const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';
const ACCOUNTS_COLLECTION = 'Student_account';
const COACH_COLLECTION = 'Coach_account';

async function checkUsers() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        
        // 檢查家長用戶
        console.log('\n📋 檢查家長用戶 (Student_account 集合):');
        const parentCollection = db.collection(ACCOUNTS_COLLECTION);
        const parentUsers = await parentCollection.find({}).toArray();
        
        if (parentUsers.length > 0) {
            parentUsers.forEach((user, index) => {
                console.log(`${index + 1}. 電話: ${user.phone}, 姓名: ${user.studentName}, 類型: ${user.userType}, 創建時間: ${new Date(user.createdAt).toLocaleString()}`);
            });
        } else {
            console.log('❌ 沒有找到家長用戶');
        }
        
        // 檢查教練用戶
        console.log('\n👨‍🏫 檢查教練用戶 (Coach_account 集合):');
        const coachCollection = db.collection(COACH_COLLECTION);
        const coachUsers = await coachCollection.find({}).toArray();
        
        if (coachUsers.length > 0) {
            coachUsers.forEach((user, index) => {
                console.log(`${index + 1}. 電話: ${user.phone}, 姓名: ${user.studentName}, 類型: ${user.userType}, 創建時間: ${new Date(user.createdAt).toLocaleString()}`);
            });
        } else {
            console.log('❌ 沒有找到教練用戶');
        }
        
        // 檢查學生資料
        console.log('\n📚 檢查學生資料 (students 集合):');
        const studentsCollection = db.collection('students');
        const students = await studentsCollection.find({}).toArray();
        
        if (students.length > 0) {
            students.forEach((student, index) => {
                console.log(`${index + 1}. 姓名: ${student.name}, 電話: ${student.phone}, 年齡: ${student.age}, 地點: ${student.location}`);
            });
        } else {
            console.log('❌ 沒有找到學生資料');
        }
        
    } catch (error) {
        console.error('❌ 檢查用戶時發生錯誤:', error);
    } finally {
        await client.close();
        console.log('\n🔌 已斷開 MongoDB 連接');
    }
}

// 運行檢查
checkUsers(); 