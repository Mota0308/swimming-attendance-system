const axios = require('axios');

const RAILWAY_URL = 'https://a-production-05f2.up.railway.app';

console.log('🧪 快速測試 Railway 部署...\n');
console.log(`🌐 測試 URL: ${RAILWAY_URL}\n`);

async function quickTest() {
    try {
        console.log('📋 測試基本連接...');
        
        // 測試基本連接
        const response = await axios.get(RAILWAY_URL, {
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500; // 接受所有狀態碼
            }
        });
        
        console.log(`✅ 連接成功！狀態碼: ${response.status}`);
        console.log(`📄 響應內容: ${response.data}`);
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ 服務器響應錯誤: ${error.response.status}`);
            console.log(`📄 錯誤內容: ${error.response.data}`);
        } else if (error.request) {
            console.log('❌ 無法連接到服務器');
            console.log('💡 可能的原因：');
            console.log('   - 服務器還在啟動中');
            console.log('   - 環境變量未配置');
            console.log('   - 部署失敗');
        } else {
            console.log(`❌ 請求錯誤: ${error.message}`);
        }
    }
    
    console.log('\n📋 建議檢查：');
    console.log('1. 在 Railway 控制台檢查部署狀態');
    console.log('2. 確認環境變量已配置');
    console.log('3. 查看部署日誌');
    console.log('4. 等待幾分鐘讓服務完全啟動');
}

quickTest(); 