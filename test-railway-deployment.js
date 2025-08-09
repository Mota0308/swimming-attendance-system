const axios = require('axios');

const baseUrl = 'https://swiming-production.up.railway.app';
const publicKey = 'ttdrcccy';
const privateKey = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

const headers = {
    'X-API-Public-Key': publicKey,
    'X-API-Private-Key': privateKey,
    'Content-Type': 'application/json'
};

async function testRailwayAPI() {
    console.log('🚀 測試 Railway API 部署...\n');
    
    try {
        // 測試 1: 健康檢查
        console.log('1️⃣ 測試健康檢查...');
        const healthResponse = await axios.get(`${baseUrl}/health`, { headers });
        console.log('✅ 健康檢查成功:', healthResponse.data);
        
        // 測試 2: 獲取學生列表
        console.log('\n2️⃣ 測試獲取學生列表...');
        const studentsResponse = await axios.get(`${baseUrl}/students`, { headers });
        console.log('✅ 學生列表成功:', studentsResponse.data.length, '個學生');
        
        // 測試 3: 測試登錄
        console.log('\n3️⃣ 測試登錄功能...');
        const loginData = {
            phone: '12345678',
            password: '123456',
            userType: 'parent'
        };
        
        const loginResponse = await axios.post(`${baseUrl}/auth/login`, loginData, { headers });
        console.log('✅ 登錄測試成功:', loginResponse.data);
        
        console.log('\n🎉 所有測試通過！Railway API 部署成功！');
        console.log(`📍 API 地址: ${baseUrl}`);
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.response?.data || error.message);
        console.log('\n🔍 請檢查：');
        console.log('1. Railway 服務是否正在運行');
        console.log('2. 環境變量是否正確設置');
        console.log('3. 端口配置是否正確');
    }
}

testRailwayAPI(); 