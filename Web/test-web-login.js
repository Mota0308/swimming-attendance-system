const axios = require('axios');

// Web 應用配置
const WEB_BASE_URL = 'https://swimming-system-web-production.up.railway.app';
const API_BASE_URL = 'https://swimming-attendance-system-production.up.railway.app';

// 測試用戶
const testUsers = [
    { phone: '53004900', password: '123456', userType: 'parent', description: '家長用戶1' },
    { phone: '12345678', password: '111111', userType: 'parent', description: '家長用戶2' },
    { phone: '1236874', password: '123456', userType: 'coach', description: '教練用戶' },
    { phone: 'test', password: '123456', userType: 'parent', description: '測試用戶' }
];

async function testWebLogin() {
    console.log('🧪 開始測試 Web 應用登入...\n');
    console.log(`🌐 Web 應用 URL: ${WEB_BASE_URL}`);
    console.log(`🔗 API 服務器 URL: ${API_BASE_URL}`);
    
    // 首先測試 API 服務器直接連接
    console.log('\n📡 測試 API 服務器直接連接...');
    try {
        const apiResponse = await axios.get(`${API_BASE_URL}/health`, {
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            },
            timeout: 10000
        });
        console.log(`✅ API 服務器正常: ${apiResponse.data.message}`);
    } catch (error) {
        console.log(`❌ API 服務器連接失敗: ${error.message}`);
        return;
    }
    
    // 測試 Web 應用代理
    console.log('\n🌐 測試 Web 應用代理...');
    try {
        const webResponse = await axios.get(`${WEB_BASE_URL}/api/health`, {
            timeout: 10000
        });
        console.log(`✅ Web 應用代理正常: ${webResponse.data.message}`);
    } catch (error) {
        console.log(`❌ Web 應用代理失敗: ${error.message}`);
        if (error.response) {
            console.log(`   狀態碼: ${error.response.status}`);
            console.log(`   錯誤信息: ${error.response.data?.message || error.response.statusText}`);
        }
    }
    
    // 測試登入端點
    console.log('\n🔐 測試登入端點...');
    for (const user of testUsers) {
        try {
            console.log(`\n📱 測試 ${user.description}:`);
            console.log(`   電話: ${user.phone}, 密碼: ${user.password}, 類型: ${user.userType}`);
            
            const requestData = {
                phone: user.phone,
                password: user.password,
                userType: user.userType
            };
            
            // 測試 Web 應用代理登入
            const webLoginResponse = await axios.post(`${WEB_BASE_URL}/api/auth/login`, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log(`📊 Web 代理響應狀態: ${webLoginResponse.status}`);
            console.log(`📋 Web 代理響應數據:`, JSON.stringify(webLoginResponse.data, null, 2));
            
            if (webLoginResponse.data.success) {
                console.log(`✅ Web 代理登入成功: ${webLoginResponse.data.message}`);
            } else {
                console.log(`❌ Web 代理登入失敗: ${webLoginResponse.data.message}`);
            }
            
        } catch (error) {
            console.log(`❌ Web 代理登入測試失敗: ${user.description}`);
            if (error.response) {
                console.log(`   狀態碼: ${error.response.status}`);
                console.log(`   錯誤信息: ${error.response.data?.message || error.response.statusText}`);
                console.log(`   完整響應:`, JSON.stringify(error.response.data, null, 2));
            } else if (error.request) {
                console.log(`   網絡錯誤: ${error.message}`);
            } else {
                console.log(`   其他錯誤: ${error.message}`);
            }
        }
    }
    
    console.log('\n🏁 測試完成');
}

// 運行測試
testWebLogin().catch(error => {
    console.error('❌ 測試腳本執行失敗:', error);
}); 