const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function testCoachRoster() {
    try {
        console.log('🔍 測試教練更表API...');
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const col = db.collection('Coach_roster');
        
        // 檢查集合中的數據
        const allDocs = await col.find({}).toArray();
        console.log(`📊 更表集合中共有 ${allDocs.length} 條記錄`);
        
        if (allDocs.length > 0) {
            console.log('📋 所有記錄:');
            allDocs.forEach((doc, index) => {
                console.log(`  ${index + 1}. phone: ${doc.phone}, name: ${doc.name}, date: ${doc.date}, time: ${doc.time}, location: ${doc.location}`);
            });
            
            // 獲取所有唯一的電話號碼和教練姓名
            const uniquePhones = [...new Set(allDocs.map(doc => doc.phone))];
            const uniqueNames = [...new Set(allDocs.map(doc => doc.name))];
            
            console.log(`\n📱 唯一電話號碼: ${uniquePhones.join(', ')}`);
            console.log(`👤 唯一教練姓名: ${uniqueNames.join(', ')}`);
            
            // 測試每個電話號碼和教練姓名的組合
            for (const phone of uniquePhones) {
                for (const name of uniqueNames) {
                    console.log(`\n🔍 測試組合: phone=${phone}, name=${name}`);
                    
                    const year = 2025;
                    const month = 8;
                    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
                    
                    const query = { 
                        phone: phone, 
                        name: name, 
                        date: { $gte: startDate, $lte: endDate } 
                    };
                    
                    const docs = await col.find(query).sort({ date: 1 }).toArray();
                    console.log(`✅ 查詢到 ${docs.length} 條記錄`);
                    
                    if (docs.length > 0) {
                        console.log('📋 查詢結果:');
                        docs.forEach((doc, index) => {
                            console.log(`  ${index + 1}. date: ${doc.date}, time: ${doc.time}, location: ${doc.location}`);
                        });
                    }
                }
            }
        }
        
        await client.close();
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

testCoachRoster(); 