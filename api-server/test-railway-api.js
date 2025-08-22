const https = require('https');

async function testRailwayApi() {
    try {
        console.log('🔍 測試Railway API服務器...');
        
        // 測試健康檢查端點
        const healthUrl = 'https://swimming-attendance-system-production.up.railway.app/health';
        console.log(`📡 健康檢查URL: ${healthUrl}`);
        
        const healthOptions = {
            headers: {
                'x-api-public-key': 'ttdrcccy',
                'x-api-private-key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        };
        
        const healthRequest = https.get(healthUrl, healthOptions, (response) => {
            console.log(`📊 健康檢查響應狀態碼: ${response.statusCode}`);
            
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📋 健康檢查響應:');
                    console.log(JSON.stringify(result, null, 2));
                    
                    if (result.success) {
                        console.log('✅ 健康檢查成功，API服務器運行正常');
                        
                        // 如果健康檢查成功，測試更表端點
                        testCoachRoster();
                    } else {
                        console.log('❌ 健康檢查失敗');
                    }
                } catch (error) {
                    console.error('❌ 解析健康檢查響應失敗:', error);
                    console.log('原始響應:', data);
                }
            });
        });
        
        healthRequest.on('error', (error) => {
            console.error('❌ 健康檢查請求失敗:', error);
        });
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

async function testCoachRoster() {
    try {
        console.log('\n🔍 測試更表端點...');
        
        const phone = '66666666';
        const name = 'AAAb';
        const year = 2025;
        const month = 8;
        
        const url = `https://swimming-attendance-system-production.up.railway.app/coach-roster?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}&year=${year}&month=${month}`;
        
        console.log(`📡 更表請求URL: ${url}`);
        
        const options = {
            headers: {
                'x-api-public-key': 'ttdrcccy',
                'x-api-private-key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        };
        
        const request = https.get(url, options, (response) => {
            console.log(`📊 更表響應狀態碼: ${response.statusCode}`);
            
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📋 更表API響應:');
                    console.log(JSON.stringify(result, null, 2));
                    
                    if (result.success && result.records) {
                        console.log(`✅ 成功獲取 ${result.records.length} 條更表記錄`);
                        result.records.forEach((record, index) => {
                            console.log(`  ${index + 1}. date: ${record.date}, time: ${record.time}, location: ${record.location}`);
                        });
                    } else {
                        console.log('❌ 更表API返回失敗或沒有記錄');
                    }
                } catch (error) {
                    console.error('❌ 解析更表響應失敗:', error);
                    console.log('原始響應:', data);
                }
            });
        });
        
        request.on('error', (error) => {
            console.error('❌ 更表請求失敗:', error);
        });
        
        request.setTimeout(10000, () => {
            console.error('❌ 更表請求超時');
            request.destroy();
        });
        
    } catch (error) {
        console.error('❌ 更表測試失敗:', error);
    }
}

testRailwayApi(); 