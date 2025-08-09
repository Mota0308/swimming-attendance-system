const axios = require('axios');

// 配置
const config = {
    // 替換為您的實際部署URL
    baseUrl: process.env.API_URL || 'https://a-production-05f2.up.railway.app',
    publicKey: 'ttdrcccy',
    privateKey: '2b207365-cbf0-4e42-a3bf-f932c84557c4',
    timeout: 10000
};

// 測試用戶
const testUsers = [
    { phone: '53004900', password: '123456', userType: 'parent', description: '家長用戶1' },
    { phone: '12345678', password: '111111', userType: 'parent', description: '家長用戶2' },
    { phone: '1236874', password: '123456', userType: 'coach', description: '教練用戶' }
];

async function testDeployment() {
    console.log('🧪 開始測試部署...\n');
    console.log(`🌐 API 服務器: ${config.baseUrl}\n`);

    // 1. 測試健康檢查
    console.log('📋 1. 測試健康檢查...');
    try {
        const healthResponse = await axios.get(`${config.baseUrl}/health`, {
            headers: {
                'X-API-Public-Key': config.publicKey,
                'X-API-Private-Key': config.privateKey
            },
            timeout: config.timeout
        });

        if (healthResponse.data.success) {
            console.log('✅ 健康檢查成功');
            console.log(`   服務器: ${healthResponse.data.server}`);
            console.log(`   數據庫: ${healthResponse.data.database}`);
            console.log(`   版本: ${healthResponse.data.version}`);
        } else {
            console.log('❌ 健康檢查失敗');
        }
    } catch (error) {
        console.log('❌ 健康檢查錯誤:', error.message);
        return;
    }

    console.log('');

    // 2. 測試登入功能
    console.log('🔐 2. 測試登入功能...');
    for (const user of testUsers) {
        try {
            console.log(`   測試 ${user.description}: ${user.phone}`);
            
            const loginResponse = await axios.post(`${config.baseUrl}/auth/login`, {
                phone: user.phone,
                password: user.password,
                userType: user.userType
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Public-Key': config.publicKey,
                    'X-API-Private-Key': config.privateKey
                },
                timeout: config.timeout
            });

            if (loginResponse.data.success) {
                console.log(`   ✅ 登入成功: ${loginResponse.data.message}`);
                console.log(`      用戶: ${loginResponse.data.user.phone} (${loginResponse.data.user.userType})`);
            } else {
                console.log(`   ❌ 登入失敗: ${loginResponse.data.message}`);
            }
        } catch (error) {
            if (error.response) {
                console.log(`   ❌ 登入失敗 (${error.response.status}): ${error.response.data.message}`);
            } else {
                console.log(`   ❌ 網絡錯誤: ${error.message}`);
            }
        }
        console.log('');
    }

    // 3. 測試學生資料獲取
    console.log('📚 3. 測試學生資料獲取...');
    try {
        const studentsResponse = await axios.get(`${config.baseUrl}/students`, {
            headers: {
                'X-API-Public-Key': config.publicKey,
                'X-API-Private-Key': config.privateKey
            },
            timeout: config.timeout
        });

        if (Array.isArray(studentsResponse.data)) {
            console.log(`✅ 成功獲取 ${studentsResponse.data.length} 條學生資料`);
            if (studentsResponse.data.length > 0) {
                console.log(`   示例: ${studentsResponse.data[0].name} (${studentsResponse.data[0].phone})`);
            }
        } else {
            console.log('❌ 學生資料格式錯誤');
        }
    } catch (error) {
        if (error.response) {
            console.log(`❌ 獲取學生資料失敗 (${error.response.status}): ${error.response.data.message}`);
        } else {
            console.log(`❌ 網絡錯誤: ${error.message}`);
        }
    }

    console.log('\n🎉 部署測試完成！');
    console.log('\n📱 如果所有測試都通過，您的API服務器已經可以供所有用戶使用了！');
    console.log('\n🔧 記得更新Android應用的API配置：');
    console.log(`   DEFAULT_BASE_URL = "${config.baseUrl}"`);
}

// 運行測試
if (require.main === module) {
    testDeployment().catch(console.error);
}

module.exports = { testDeployment, config }; 