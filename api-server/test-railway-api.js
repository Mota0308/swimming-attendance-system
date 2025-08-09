const axios = require('axios');

const RAILWAY_URL = 'https://a-production-05f2.up.railway.app';

console.log('🧪 測試 Railway API 端點...\n');
console.log(`🌐 API 服務器: ${RAILWAY_URL}\n`);

async function testAPI() {
    try {
        // 測試健康檢查端點
        console.log('📋 1. 測試健康檢查端點...');
        const healthResponse = await axios.get(`${RAILWAY_URL}/health`, {
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            },
            timeout: 10000
        });
        
        console.log(`✅ 健康檢查成功！狀態碼: ${healthResponse.status}`);
        console.log(`📄 響應: ${JSON.stringify(healthResponse.data, null, 2)}`);
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ API 響應錯誤: ${error.response.status}`);
            console.log(`📄 錯誤內容: ${JSON.stringify(error.response.data, null, 2)}`);
            
            if (error.response.status === 401) {
                console.log('🔑 可能是 API 密鑰問題，請檢查環境變量');
            } else if (error.response.status === 404) {
                console.log('🔍 端點不存在，請檢查服務器是否正確啟動');
            }
        } else if (error.request) {
            console.log('❌ 無法連接到 API 服務器');
            console.log('💡 請檢查：');
            console.log('   - 服務器是否正在運行');
            console.log('   - 環境變量是否已配置');
            console.log('   - 部署是否成功');
        } else {
            console.log(`❌ 請求錯誤: ${error.message}`);
        }
    }
    
    console.log('\n📋 下一步：');
    console.log('1. 如果測試失敗，請在 Railway 控制台檢查：');
    console.log('   - 部署狀態是否為 "Deployed"');
    console.log('   - 環境變量是否已配置');
    console.log('   - 查看部署日誌');
    console.log('2. 如果測試成功，我們將更新 Android 應用');
}

testAPI(); 