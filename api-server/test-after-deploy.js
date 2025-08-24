const https = require('https');

const RAILWAY_URL = 'https://swiming-production.up.railway.app';
const API_HEADERS = {
    'x-api-public-key': 'ttdrcccy',
    'x-api-private-key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
};

async function testEndpoint(url, description) {
    return new Promise((resolve) => {
        console.log(`\n🔍 測試: ${description}`);
        console.log(`📡 URL: ${url}`);
        
        const request = https.get(url, { headers: API_HEADERS }, (response) => {
            console.log(`📊 狀態碼: ${response.statusCode}`);
            
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ 響應成功:');
                    console.log(JSON.stringify(result, null, 2));
                    resolve({ success: true, data: result });
                } catch (error) {
                    console.log('❌ 響應解析失敗:');
                    console.log('原始響應:', data);
                    resolve({ success: false, error: data });
                }
            });
        });
        
        request.on('error', (error) => {
            console.error('❌ 請求失敗:', error.message);
            resolve({ success: false, error: error.message });
        });
        
        request.setTimeout(10000, () => {
            console.error('❌ 請求超時');
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function runAllTests() {
    console.log('🚀 Railway API 重新部署後測試');
    console.log('=' .repeat(50));
    
    // 測試1: 健康檢查
    const healthResult = await testEndpoint(
        `${RAILWAY_URL}/health`,
        '健康檢查端點'
    );
    
    // 測試2: 更表端點
    const rosterResult = await testEndpoint(
        `${RAILWAY_URL}/coach-roster?phone=66666666&name=AAAb&year=2025&month=8`,
        '教練更表端點'
    );
    
    // 測試3: 教練工時端點
    const workHoursResult = await testEndpoint(
        `${RAILWAY_URL}/coach-work-hours?phone=66666666&year=2025&month=8`,
        '教練工時端點'
    );
    
    // 測試4: 教練登錄端點
    const loginData = JSON.stringify({
        phone: '66666666',
        password: '123456',
        userType: 'coach'
    });
    
    const loginResult = await new Promise((resolve) => {
        console.log('\n🔍 測試: 教練登錄端點');
        console.log(`📡 URL: ${RAILWAY_URL}/auth/login`);
        
        const postData = Buffer.from(loginData, 'utf8');
        const options = {
            method: 'POST',
            headers: {
                ...API_HEADERS,
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };
        
        const request = https.request(`${RAILWAY_URL}/auth/login`, options, (response) => {
            console.log(`📊 狀態碼: ${response.statusCode}`);
            
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ 登錄響應成功:');
                    console.log(JSON.stringify(result, null, 2));
                    resolve({ success: true, data: result });
                } catch (error) {
                    console.log('❌ 登錄響應解析失敗:');
                    console.log('原始響應:', data);
                    resolve({ success: false, error: data });
                }
            });
        });
        
        request.on('error', (error) => {
            console.error('❌ 登錄請求失敗:', error.message);
            resolve({ success: false, error: error.message });
        });
        
        request.write(postData);
        request.end();
    });
    
    // 總結
    console.log('\n' + '=' .repeat(50));
    console.log('📊 測試結果總結:');
    console.log(`✅ 健康檢查: ${healthResult.success ? '通過' : '失敗'}`);
    console.log(`✅ 更表端點: ${rosterResult.success ? '通過' : '失敗'}`);
    console.log(`✅ 工時端點: ${workHoursResult.success ? '通過' : '失敗'}`);
    console.log(`✅ 登錄端點: ${loginResult.success ? '通過' : '失敗'}`);
    
    if (rosterResult.success && rosterResult.data.records) {
        console.log(`\n📋 更表數據: ${rosterResult.data.records.length} 條記錄`);
        rosterResult.data.records.forEach((record, index) => {
            console.log(`  ${index + 1}. ${record.date}: ${record.time} @ ${record.location}`);
        });
    }
    
    console.log('\n🎉 測試完成！');
    console.log('如果所有測試都通過，手機應用應該能正常顯示更表內容。');
}

runAllTests(); 