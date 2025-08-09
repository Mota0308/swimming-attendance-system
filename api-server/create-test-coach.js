const { MongoClient } = require('mongodb');

// MongoDB 連接配置
const MONGO_URI = 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';
const COACH_ACCOUNT_COLLECTION = 'Coach_account';
const COACH_WORK_HOURS_COLLECTION = 'Coach_work_hours';

async function createTestCoachData() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ 連接到 MongoDB');
        
        const db = client.db(DB_NAME);
        
        // 創建測試教練賬號
        console.log('\n👨‍🏫 創建測試教練賬號...');
        const coachCollection = db.collection(COACH_ACCOUNT_COLLECTION);
        
        const testCoaches = [
            {
                phone: '0912345678',
                studentPhone: '0912345678',
                password: '123456',
                userType: 'coach',
                studentName: '張教練',
                createdAt: Date.now(),
                createdDate: new Date().toISOString()
            },
            {
                phone: '0987654321',
                studentPhone: '0987654321',
                password: '123456',
                userType: 'coach',
                studentName: '李教練',
                createdAt: Date.now(),
                createdDate: new Date().toISOString()
            }
        ];
        
        for (const coach of testCoaches) {
            // 檢查是否已存在
            const existingCoach = await coachCollection.findOne({ phone: coach.phone });
            
            if (!existingCoach) {
                await coachCollection.insertOne(coach);
                console.log(`✅ 創建教練: ${coach.studentName} (${coach.phone})`);
            } else {
                console.log(`⚠️ 教練已存在: ${coach.studentName} (${coach.phone})`);
            }
        }
        
        // 創建測試工時記錄
        console.log('\n📊 創建測試工時記錄...');
        const workHoursCollection = db.collection(COACH_WORK_HOURS_COLLECTION);
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // 為張教練創建本月的一些工時記錄
        const testWorkHours = [];
        
        for (let day = 1; day <= 31; day++) {
            const date = new Date(currentYear, currentMonth - 1, day);
            
            // 跳過未來的日期
            if (date > currentDate) continue;
            
            // 隨機生成工時（週末較少，工作日較多）
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const baseHours = isWeekend ? 2 : 6;
            const randomHours = Math.floor(Math.random() * 4) + baseHours;
            
            testWorkHours.push({
                coachPhone: '0912345678',
                date: date.toISOString().split('T')[0],
                hours: randomHours,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        
        // 清除現有記錄並插入新記錄
        await workHoursCollection.deleteMany({ coachPhone: '0912345678' });
        await workHoursCollection.insertMany(testWorkHours);
        
        console.log(`✅ 創建了 ${testWorkHours.length} 筆工時記錄`);
        
        // 顯示統計信息
        const totalHours = testWorkHours.reduce((sum, record) => sum + record.hours, 0);
        const workDays = testWorkHours.filter(record => record.hours > 0).length;
        const avgHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : 0;
        
        console.log('\n📈 統計信息:');
        console.log(`總鐘數: ${totalHours}`);
        console.log(`工作天數: ${workDays}`);
        console.log(`平均時數: ${avgHours}`);
        
        console.log('\n✅ 測試數據創建完成！');
        console.log('教練登入信息:');
        console.log('電話: 0912345678');
        console.log('密碼: 123456');
        console.log('教練名: 張教練');
        
    } catch (error) {
        console.error('❌ 創建測試數據失敗:', error);
    } finally {
        await client.close();
        console.log('\n🔌 已斷開 MongoDB 連接');
    }
}

// 執行創建測試數據
createTestCoachData(); 