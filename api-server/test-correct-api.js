const https = require('https');

async function testCorrectApi() {
    try {
        console.log('🔍 測試正確的API服務器...');
        
        const phone = '66666666';
        const name = 'AAAb';
        const year = 2025;
        const month = 8;
        
        const url = `https://swimming-attendance-system-production.up.railway.app/coach-roster?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}&year=${year}&month=${month}`;
        
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
                    console.log('📋 API響應:');
                    console.log(JSON.stringify(result, null, 2));
                    
                    if (result.success && result.records) {
                        console.log(`✅ 成功獲取 ${result.records.length} 條更表記錄`);
                        result.records.forEach((record, index) => {
                            console.log(`  ${index + 1}. date: ${record.date}, time: ${record.time}, location: ${record.location}`);
                        });
                    } else {
                        console.log('❌ API返回失敗或沒有記錄');
                    }
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

testCorrectApi(); 