const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkGaoZhangWorkHours() {
    try {
        console.log('🔍 檢查gao和張教練的工時數據...');
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        const workHoursCollection = db.collection('Coach_work_hours');
        
        // 檢查gao教練的工時數據
        const gaoWorkHours = await workHoursCollection.find({ phone: '09877890' }).toArray();
        console.log(`📊 gao教練 (09877890) 工時記錄數: ${gaoWorkHours.length}`);
        if (gaoWorkHours.length > 0) {
            console.log('📋 gao教練工時記錄:');
            gaoWorkHours.forEach(record => {
                console.log(`  - ${record.date}: ${record.location} (${record.hours}小時)`);
            });
        }
        
        // 檢查張教練的工時數據
        const zhangWorkHours = await workHoursCollection.find({ phone: '12344321' }).toArray();
        console.log(`📊 張教練 (12344321) 工時記錄數: ${zhangWorkHours.length}`);
        if (zhangWorkHours.length > 0) {
            console.log('📋 張教練工時記錄:');
            zhangWorkHours.forEach(record => {
                console.log(`  - ${record.date}: ${record.location} (${record.hours}小時)`);
            });
        }
        
        // 檢查B教練的工時數據
        const bWorkHours = await workHoursCollection.find({ phone: '53004900' }).toArray();
        console.log(`📊 B教練 (53004900) 工時記錄數: ${bWorkHours.length}`);
        if (bWorkHours.length > 0) {
            console.log('📋 B教練工時記錄:');
            bWorkHours.forEach(record => {
                console.log(`  - ${record.date}: ${record.location} (${record.hours}小時)`);
            });
        }
        
        await client.close();
        
        console.log('\n💡 總結:');
        const totalRecords = gaoWorkHours.length + zhangWorkHours.length + bWorkHours.length;
        console.log(`✅ 總共找到 ${totalRecords} 條教練工時記錄`);
        console.log(`🎉 現在教練工時頁面應該能顯示gao、張和B教練的數據了！`);
        
    } catch (error) {
        console.error('❌ 檢查失敗:', error);
    }
}

checkGaoZhangWorkHours(); 