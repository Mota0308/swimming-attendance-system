const axios = require('axios');

const API_BASE_URL = 'https://swimming-attendance-system-production.up.railway.app';
const PUBLIC_KEY = 'ttdrcccy';
const PRIVATE_KEY = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

async function testCoachInfoAPI() {
    console.log('🧪 測試教練信息API...\n');
    
    try {
        // 測試1: 獲取所有教練列表
        console.log('📋 測試1: 獲取所有教練列表');
        const coachesResponse = await axios.get(`${API_BASE_URL}/coaches`, {
            headers: {
                'X-API-Public-Key': PUBLIC_KEY,
                'X-API-Private-Key': PRIVATE_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (coachesResponse.data.success) {
            console.log('✅ 成功獲取教練列表');
            console.log('教練數量:', coachesResponse.data.coaches.length);
            
            if (coachesResponse.data.coaches.length > 0) {
                const firstCoach = coachesResponse.data.coaches[0];
                console.log('第一個教練信息:', firstCoach);
                
                // 測試2: 獲取單個教練信息
                console.log('\n📋 測試2: 獲取單個教練信息');
                console.log('查詢電話:', firstCoach.phone);
                const singleCoachResponse = await axios.get(`${API_BASE_URL}/coaches?phone=${firstCoach.phone}`, {
                    headers: {
                        'X-API-Public-Key': PUBLIC_KEY,
                        'X-API-Private-Key': PRIVATE_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (singleCoachResponse.data.success) {
                    console.log('✅ 成功獲取單個教練信息');
                    console.log('完整響應:', JSON.stringify(singleCoachResponse.data, null, 2));
                    console.log('教練信息:', singleCoachResponse.data.coach);
                    if (singleCoachResponse.data.coach) {
                        console.log('教練姓名:', singleCoachResponse.data.coach.studentName);
                    } else {
                        console.log('❌ 教練信息為空');
                    }
                } else {
                    console.log('❌ 獲取單個教練信息失敗:', singleCoachResponse.data.message);
                }
            } else {
                console.log('⚠️ 沒有教練數據，無法測試單個教練查詢');
            }
        } else {
            console.log('❌ 獲取教練列表失敗:', coachesResponse.data.message);
        }
        
    } catch (error) {
        console.error('❌ API測試失敗:', error.message);
        if (error.response) {
            console.error('狀態碼:', error.response.status);
            console.error('錯誤信息:', error.response.data);
        }
    }
}

// 運行測試
testCoachInfoAPI(); 