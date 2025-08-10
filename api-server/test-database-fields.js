const { MongoClient } = require('mongodb');

// 使用環境變量或默認值
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function testDatabaseFields() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 成功連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        const studentsCollection = db.collection('students');
        
        // 獲取前5條學生記錄來檢查字段
        const sampleStudents = await studentsCollection.find({}).limit(5).toArray();
        
        console.log(`📊 找到 ${sampleStudents.length} 條學生記錄`);
        
        if (sampleStudents.length > 0) {
            console.log('\n🔍 第一條記錄的字段結構:');
            const firstStudent = sampleStudents[0];
            Object.keys(firstStudent).forEach(key => {
                console.log(`  ${key}: ${firstStudent[key]} (類型: ${typeof firstStudent[key]})`);
            });
            
            console.log('\n📋 所有記錄的字段檢查:');
            sampleStudents.forEach((student, index) => {
                console.log(`\n記錄 ${index + 1}:`);
                console.log(`  姓名字段: ${student.name || student.Name || student.studentName || '未找到'}`);
                console.log(`  電話字段: ${student.phone || student.Phone_number || student.studentPhone || '未找到'}`);
                console.log(`  日期字段: ${student.date || student.Date || student.classDate || '未找到'}`);
                console.log(`  待約字段: ${student.pending || student.Pending || student.pendingCount || '未找到'}`);
            });
        } else {
            console.log('❌ 沒有找到學生記錄');
        }
        
    } catch (error) {
        console.error('❌ 檢查資料庫字段失敗:', error);
    } finally {
        await client.close();
    }
}

// 執行測試
testDatabaseFields(); 