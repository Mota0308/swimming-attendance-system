const axios = require('axios');

// API 配置
const BASE_URL = 'https://swimming-attendance-system-production.up.railway.app';
const PUBLIC_KEY = 'ttdrcccy';
const PRIVATE_KEY = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

// 主管賬號列表
const supervisorAccounts = [
    { phone: 'supervisor001', password: 'supervisor123', userType: 'supervisor', description: '主管001' },
    { phone: 'supervisor002', password: 'supervisor456', userType: 'supervisor', description: '主管002' },
    { phone: '88888888', password: '88888888', userType: 'supervisor', description: '超级主管' }
];

// 管理員賬號列表
const adminAccounts = [
    { phone: 'aaa', password: '123456', userType: 'admin', description: '管理員aaa' },
    { phone: 'admin001', password: 'admin123', userType: 'admin', description: '系統管理員' },
    { phone: 'admin002', password: 'password123', userType: 'admin', description: '副管理員' },
    { phone: '88888888', password: '88888888', userType: 'admin', description: '超級管理員' }
];

async function testSupervisorLogin() {
    console.log('🧪 開始測試主管和管理員賬號登入...\n');
    console.log(`🌐 目標URL: ${BASE_URL}`);
    
    // 測試主管賬號
    console.log('\n👨‍💼 測試主管賬號登入:');
    for (const account of supervisorAccounts) {
        try {
            console.log(`\n📱 測試 ${account.description}:`);
            console.log(`   電話: ${account.phone}, 密碼: ${account.password}, 類型: ${account.userType}`);
            
            const requestData = {
                phone: account.phone,
                password: account.password,
                userType: account.userType
            };
            
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
                console.log(`✅ 主管登入成功: ${response.data.message}`);
                console.log(`   用戶信息: ${JSON.stringify(response.data.user)}`);
            } else {
                console.log(`❌ 主管登入失敗: ${response.data.message}`);
            }
            
        } catch (error) {
            console.log(`❌ 主管登入測試失敗: ${account.description}`);
            if (error.response) {
                console.log(`   狀態碼: ${error.response.status}`);
                console.log(`   錯誤信息: ${error.response.data?.message || error.response.statusText}`);
            } else if (error.request) {
                console.log(`   網絡錯誤: ${error.message}`);
            } else {
                console.log(`   其他錯誤: ${error.message}`);
            }
        }
    }
    
    // 測試管理員賬號
    console.log('\n👨‍💻 測試管理員賬號登入:');
    for (const account of adminAccounts) {
        try {
            console.log(`\n📱 測試 ${account.description}:`);
            console.log(`   電話: ${account.phone}, 密碼: ${account.password}, 類型: ${account.userType}`);
            
            const requestData = {
                phone: account.phone,
                password: account.password,
                userType: account.userType
            };
            
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
                console.log(`✅ 管理員登入成功: ${response.data.message}`);
                console.log(`   用戶信息: ${JSON.stringify(response.data.user)}`);
            } else {
                console.log(`❌ 管理員登入失敗: ${response.data.message}`);
            }
            
        } catch (error) {
            console.log(`❌ 管理員登入測試失敗: ${account.description}`);
            if (error.response) {
                console.log(`   狀態碼: ${error.response.status}`);
                console.log(`   錯誤信息: ${error.response.data?.message || error.response.statusText}`);
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
testSupervisorLogin().catch(error => {
    console.error('❌ 測試腳本執行失敗:', error);
}); 