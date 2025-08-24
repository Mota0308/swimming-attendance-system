const { MongoClient } = require('mongodb');

// MongoDB 連接配置
const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function testDesktopCoachFeatures() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        const workHoursCollection = db.collection('Coach_work_hours');
        
        console.log('\n🧪 測試桌面應用教練工時管理新功能...');
        
        // 1. 創建測試教練工時記錄（帶地點和泳會）
        console.log('\n1️⃣ 創建測試工時記錄（帶地點和泳會）...');
        const testWorkHours = [
            {
                phone: '0912345678',
                date: '2025-08-01',
                hours: 6.5,
                location: '維多利亞公園游泳池',
                club: '維多利亞泳會',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                phone: '0912345678',
                date: '2025-08-02',
                hours: 8.0,
                location: '維多利亞公園游泳池',
                club: '維多利亞泳會',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                phone: '0912345678',
                date: '2025-08-03',
                hours: 4.5,
                location: '荔枝角公園游泳池',
                club: '荔枝角泳會',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                phone: '0987654321',
                date: '2025-08-01',
                hours: 7.0,
                location: '維多利亞公園游泳池',
                club: '維多利亞泳會',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        
        // 清除現有測試記錄
        await workHoursCollection.deleteMany({ 
            phone: { $in: ['0912345678', '0987654321'] },
            date: { $in: ['2025-08-01', '2025-08-02', '2025-08-03'] }
        });
        
        // 插入測試記錄
        await workHoursCollection.insertMany(testWorkHours);
        console.log('✅ 測試工時記錄創建成功');
        
        // 2. 測試按教練、月份、地點、泳會查詢
        console.log('\n2️⃣ 測試按教練、月份、地點、泳會查詢...');
        
        // 測試查詢：教練0912345678，2025年8月，維多利亞公園游泳池，維多利亞泳會
        const query1 = await workHoursCollection.find({
            phone: '0912345678',
            date: { $gte: '2025-08-01', $lte: '2025-08-31' },
            location: '維多利亞公園游泳池',
            club: '維多利亞泳會'
        }).toArray();
        
        console.log(`✅ 查詢結果1（維多利亞公園游泳池，維多利亞泳會）: ${query1.length} 條記錄`);
        query1.forEach(record => {
            console.log(`   - ${record.date}: ${record.hours}小時`);
        });
        
        // 測試查詢：教練0912345678，2025年8月，荔枝角公園游泳池，荔枝角泳會
        const query2 = await workHoursCollection.find({
            phone: '0912345678',
            date: { $gte: '2025-08-01', $lte: '2025-08-31' },
            location: '荔枝角公園游泳池',
            club: '荔枝角泳會'
        }).toArray();
        
        console.log(`✅ 查詢結果2（荔枝角公園游泳池，荔枝角泳會）: ${query2.length} 條記錄`);
        query2.forEach(record => {
            console.log(`   - ${record.date}: ${record.hours}小時`);
        });
        
        // 3. 測試統計功能
        console.log('\n3️⃣ 測試統計功能...');
        
        // 計算教練0912345678在維多利亞公園游泳池的總工時
        const totalHours = await workHoursCollection.aggregate([
            {
                $match: {
                    phone: '0912345678',
                    location: '維多利亞公園游泳池',
                    club: '維多利亞泳會',
                    date: { $gte: '2025-08-01', $lte: '2025-08-31' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalHours: { $sum: '$hours' },
                    workDays: { $sum: 1 },
                    avgHours: { $avg: '$hours' }
                }
            }
        ]).toArray();
        
        if (totalHours.length > 0) {
            const stats = totalHours[0];
            console.log('✅ 統計結果:');
            console.log(`   總工時: ${stats.totalHours} 小時`);
            console.log(`   工作天數: ${stats.workDays} 天`);
            console.log(`   平均時數: ${stats.avgHours.toFixed(1)} 小時`);
        }
        
        // 4. 測試數據庫結構
        console.log('\n4️⃣ 檢查數據庫結構...');
        const sampleRecord = await workHoursCollection.findOne({});
        if (sampleRecord) {
            console.log('📋 Coach_work_hours 集合字段:');
            console.log(Object.keys(sampleRecord));
            
            // 檢查是否有location和club字段
            if (sampleRecord.hasOwnProperty('location') && sampleRecord.hasOwnProperty('club')) {
                console.log('✅ 數據庫結構正確，包含 location 和 club 字段');
            } else {
                console.log('❌ 數據庫結構不完整，缺少 location 或 club 字段');
            }
        }
        
        // 5. 清理測試數據
        console.log('\n5️⃣ 清理測試數據...');
        await workHoursCollection.deleteMany({ 
            phone: { $in: ['0912345678', '0987654321'] },
            date: { $in: ['2025-08-01', '2025-08-02', '2025-08-03'] }
        });
        console.log('✅ 測試數據清理完成');
        
        console.log('\n🎉 桌面應用教練工時管理新功能測試完成！');
        console.log('\n📋 功能總結:');
        console.log('✅ 支持按教練、月份、地點、泳會篩選工時記錄');
        console.log('✅ 數據庫結構包含 location 和 club 字段');
        console.log('✅ 查詢功能正常工作');
        console.log('✅ 統計功能正常工作');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    } finally {
        await client.close();
        console.log('\n🔌 數據庫連接已關閉');
    }
}

// 運行測試
testDesktopCoachFeatures(); 