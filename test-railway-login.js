const axios = require('axios');

const baseUrl = 'https://swiming-production.up.railway.app';
const publicKey = 'ttdrcccy';
const privateKey = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

const headers = {
    'X-API-Public-Key': publicKey,
    'X-API-Private-Key': privateKey,
    'Content-Type': 'application/json'
};

async function testRailwayLogin() {
    console.log('🧪 測試 Railway API 登錄功能...\n');
    
    try {
        // 測試 1: 健康檢查
        console.log('1️⃣ 測試健康檢查...');
        const healthResponse = await axios.get(`${baseUrl}/health`, { headers });
        console.log('✅ 健康檢查成功:', healthResponse.data);
        
        // 測試 2: 家長登錄
        console.log('\n2️⃣ 測試家長登錄...');
        const parentLoginData = {
            phone: '12345678',
            password: '123456',
            userType: 'parent'
        };
        
        const parentLoginResponse = await axios.post(`${baseUrl}/auth/login`, parentLoginData, { headers });
        console.log('✅ 家長登錄成功:', parentLoginResponse.data);
        
        // 測試 3: 教練登錄
        console.log('\n3️⃣ 測試教練登錄...');
        const coachLoginData = {
            phone: '87654321',
            password: '123456',
            userType: 'coach'
        };
        
        const coachLoginResponse = await axios.post(`${baseUrl}/auth/login`, coachLoginData, { headers });
        console.log('✅ 教練登錄成功:', coachLoginResponse.data);
        
        console.log('\n🎉 所有登錄測試通過！Railway API 正常工作！');
        console.log(`📍 API 地址: ${baseUrl}`);
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.response?.data || error.message);
        console.log('\n🔍 錯誤詳情:');
        console.log('狀態碼:', error.response?.status);
        console.log('響應頭:', error.response?.headers);
        console.log('請求數據:', error.config?.data);
    }
}

testRailwayLogin(); 