const https = require('https');

// Railway API 配置
const API_BASE_URL = 'https://swiming-production.up.railway.app';
const PUBLIC_KEY = 'ttdrcccy';
const PRIVATE_KEY = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

function makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'swiming-production.up.railway.app',
            port: 443,
            path: path,
            method: method,
            headers: {
                'X-API-Public-Key': PUBLIC_KEY,
                'X-API-Private-Key': PRIVATE_KEY,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function testClubsAPI() {
    console.log('🧪 測試 /clubs API 端點...\n');

    try {
        // 測試1: 獲取所有泳會
        console.log('📋 測試1: 獲取所有泳會');
        const allClubsResponse = await makeRequest('/clubs');
        console.log(`狀態碼: ${allClubsResponse.statusCode}`);
        console.log('響應數據:', JSON.stringify(allClubsResponse.data, null, 2));
        console.log('');

        // 測試2: 根據特定地點獲取泳會
        console.log('📋 測試2: 根據地點獲取泳會');
        const locationClubsResponse = await makeRequest('/clubs?location=九龍公園');
        console.log(`狀態碼: ${locationClubsResponse.statusCode}`);
        console.log('響應數據:', JSON.stringify(locationClubsResponse.data, null, 2));
        console.log('');

        // 測試3: 測試地點API
        console.log('📋 測試3: 獲取所有地點');
        const locationsResponse = await makeRequest('/locations');
        console.log(`狀態碼: ${locationsResponse.statusCode}`);
        console.log('響應數據:', JSON.stringify(locationsResponse.data, null, 2));

    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

testClubsAPI(); 