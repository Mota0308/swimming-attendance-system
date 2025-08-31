const https = require('https');

async function testHealth() {
    try {
        console.log('🔍 測試API服務器健康狀態...');
        
        const url = 'https://swimming-system-api-production.up.railway.app/health/secure';
        
        console.log(`📡 請求URL: ${url}`);
        
        const options = {
            headers: {
                'x-api-public-key': 'ttdrcccy',
                'x-api-private-key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        };
        
        const request = https.get(url, options, (response) => {
            console.log(`📊 響應狀態碼: ${response.statusCode}`);
            
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📋 健康檢查響應:');
                    console.log(JSON.stringify(result, null, 2));
                } catch (error) {
                    console.error('❌ 解析響應失敗:', error);
                    console.log('原始響應:', data);
                }
            });
        });
        
        request.on('error', (error) => {
            console.error('❌ 請求失敗:', error);
        });
        
        request.setTimeout(10000, () => {
            console.error('❌ 請求超時');
            request.destroy();
        });
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

testHealth(); 