const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function convertRosterToWorkHours() {
    try {
        console.log('🔄 開始將Coach_roster數據轉換為Coach_work_hours數據...');
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        const rosterCollection = db.collection('Coach_roster');
        const workHoursCollection = db.collection('Coach_work_hours');
        
        // 獲取所有更表數據
        const rosterData = await rosterCollection.find({}).toArray();
        console.log(`📊 找到 ${rosterData.length} 條更表數據`);
        
        let convertedCount = 0;
        let skippedCount = 0;
        
        for (const roster of rosterData) {
            const { phone, name, date, location, time } = roster;
            
            // 檢查是否已經存在相同的工時記錄
            const existingWorkHours = await workHoursCollection.findOne({
                phone: phone,
                date: date,
                location: location
            });
            
            if (existingWorkHours) {
                console.log(`⏭️ 跳過已存在的記錄: ${name} (${phone}) - ${date} - ${location}`);
                skippedCount++;
                continue;
            }
            
            // 計算工時（基於時間範圍，如果有的話）
            let hours = 0;
            if (time && time.trim()) {
                // 簡單的時間計算：假設每個時段2小時
                const timeSlots = time.split(',').length;
                hours = timeSlots * 2;
            } else {
                // 如果沒有時間信息，默認1小時
                hours = 1;
            }
            
            // 創建工時記錄
            const workHoursRecord = {
                phone: phone,
                studentName: name,
                name: name,
                date: date,
                hours: hours,
                location: location || '',
                club: '', // 從更表數據中可能沒有club信息
                timeSlots: time ? [time] : [],
                createdAt: new Date(),
                updatedAt: new Date(),
                source: 'converted_from_roster'
            };
            
            // 插入工時記錄
            await workHoursCollection.insertOne(workHoursRecord);
            console.log(`✅ 轉換記錄: ${name} (${phone}) - ${date} - ${location} - ${hours}小時`);
            convertedCount++;
        }
        
        await client.close();
        
        console.log('\n📊 轉換完成統計:');
        console.log(`✅ 成功轉換: ${convertedCount} 條記錄`);
        console.log(`⏭️ 跳過已存在: ${skippedCount} 條記錄`);
        console.log(`📋 總處理: ${rosterData.length} 條記錄`);
        
        if (convertedCount > 0) {
            console.log('\n🎉 轉換成功！現在教練工時頁面應該能顯示gao和張教練的數據了。');
        } else {
            console.log('\n⚠️ 沒有新的記錄需要轉換。');
        }
        
    } catch (error) {
        console.error('❌ 轉換失敗:', error);
    }
}

convertRosterToWorkHours(); 