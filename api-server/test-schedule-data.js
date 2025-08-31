const fetch = require('node-fetch');

const API_BASE = 'https://swiming-production.up.railway.app';
const API_PUBLIC_KEY = 'ttdrcccy';
const API_PRIVATE_KEY = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

async function testScheduleData() {
    console.log('🧪 測試課程編排數據保存和查詢功能...\n');

    try {
        // 1. 測試保存課程編排數據
        console.log('📝 1. 測試保存課程編排數據...');
        const testData = {
            coachPhone: '88888888',
            timeSlots: [
                {
                    time: '15:10-15:50',
                    type: '指定導師小組班',
                    supervisor: '主管導師(恩)',
                    students: [
                        {
                            name: '富豐瞳',
                            phone: '12345678',
                            option1: '出席1.5',
                            option2: '🌟補0.5堂'
                        }
                    ]
                }
            ],
            timestamp: new Date().toISOString()
        };

        const saveResponse = await fetch(`${API_BASE}/schedule/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            },
            body: JSON.stringify(testData)
        });

        if (!saveResponse.ok) {
            throw new Error(`保存失敗: HTTP ${saveResponse.status}`);
        }

        const saveResult = await saveResponse.json();
        console.log('✅ 保存成功:', saveResult);

        // 2. 測試查詢課程編排數據
        console.log('\n📋 2. 測試查詢課程編排數據...');
        const queryResponse = await fetch(`${API_BASE}/api/schedule/data?coachPhone=88888888&limit=5`, {
            method: 'GET',
            headers: {
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            }
        });

        if (!queryResponse.ok) {
            throw new Error(`查詢失敗: HTTP ${queryResponse.status}`);
        }

        const queryResult = await queryResponse.json();
        console.log('✅ 查詢成功:');
        console.log(`   找到 ${queryResult.count} 條記錄`);
        
        if (queryResult.data && queryResult.data.length > 0) {
            console.log('   最新記錄:');
            const latest = queryResult.data[0];
            console.log(`   - 教練電話: ${latest.coachPhone}`);
            console.log(`   - 時段數量: ${latest.timeSlots.length}`);
            console.log(`   - 創建時間: ${latest.createdAt}`);
            console.log(`   - 數據ID: ${latest._id}`);
        }

        console.log('\n🎉 所有測試通過！數據已成功保存到MongoDB數據庫。');

    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
        
        if (error.message.includes('404')) {
            console.log('💡 提示: 請等待Railway部署完成後再測試');
        }
    }
}

// 運行測試
testScheduleData(); 