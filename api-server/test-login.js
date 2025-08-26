const axios = require('axios');

// API 配置
const BASE_URL = 'http://203.145.95.240:3001';
const PUBLIC_KEY = 'ttdrcccy';
const PRIVATE_KEY = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

// 測試用戶
const testUsers = [
    { phone: '53004900', password: '123456', userType: 'parent', description: '家長用戶1' },
    { phone: '12345678', password: '111111', userType: 'parent', description: '家長用戶2' },
    { phone: '1236874', password: '123456', userType: 'coach', description: '教練用戶' },
    { phone: 'test', password: '123456', userType: 'parent', description: '測試用戶' }
];

async function testLogin() {
    console.log('🧪 開始測試登入端點...\n');
    console.log(`🌐 目標URL: ${BASE_URL}`);
    console.log(`🔑 API密鑰: ${PUBLIC_KEY}`);
    
    for (const user of testUsers) {
        try {
            console.log(`\n📱 測試 ${user.description}:`);
            console.log(`   電話: ${user.phone}, 密碼: ${user.password}, 類型: ${user.userType}`);
            
            const requestData = {
                phone: user.phone,
                password: user.password,
                userType: user.userType
            };
            
            console.log(`📤 發送請求數據:`, JSON.stringify(requestData, null, 2));
            
            const response = await axios.post(`${BASE_URL}/auth/login`, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Public-Key': PUBLIC_KEY,
                    'X-API-Private-Key': PRIVATE_KEY
                },
                timeout: 10000
            });
            
            console.log(`📊 響應狀態: ${response.status}`);
            console.log(`📋 響應數據:`, JSON.stringify(response.data, null, 2));
            
            if (response.data.success) {
                console.log(`✅ 登入成功: ${response.data.message}`);
                console.log(`   用戶信息: ${JSON.stringify(response.data.user)}`);
            } else {
                console.log(`❌ 登入失敗: ${response.data.message}`);
            }
            
        } catch (error) {
            console.log(`❌ 測試失敗: ${user.description}`);
            if (error.response) {
                console.log(`   狀態碼: ${error.response.status}`);
                console.log(`   錯誤信息: ${error.response.data?.message || error.response.statusText}`);
                console.log(`   完整響應:`, JSON.stringify(error.response.data, null, 2));
            } else if (error.request) {
                console.log(`   網絡錯誤: ${error.message}`);
                console.log(`   請求詳情:`, error.request);
            } else {
                console.log(`   其他錯誤: ${error.message}`);
            }
        }
        
        console.log(''); // 空行分隔
    }
    
    console.log('🏁 測試完成');
}

// 運行測試
testLogin().catch(error => {
    console.error('❌ 測試腳本執行失敗:', error);
}); 