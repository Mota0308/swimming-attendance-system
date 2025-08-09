const https = require('https');

const RAILWAY_URL = 'https://swiming-production.up.railway.app';

console.log('🧪 測試 Railway 登入端點...');
console.log(`🌐 URL: ${RAILWAY_URL}`);

// 測試登入端點
function testLoginEndpoint() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            phone: 'test',
            password: '123456',
            userType: 'parent'
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        };

        const req = https.request(`${RAILWAY_URL}/auth/login`, options, (res) => {
            console.log(`🔐 登入端點狀態: ${res.statusCode}`);
            console.log(`📋 響應頭:`, res.headers);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📄 登入響應: ${data}`);
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', (err) => {
            console.log(`❌ 登入請求錯誤: ${err.message}`);
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

// 測試測試登入端點
function testTestLoginEndpoint() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            phone: 'test',
            password: '123456',
            userType: 'parent'
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        };

        const req = https.request(`${RAILWAY_URL}/auth/test-login`, options, (res) => {
            console.log(`🧪 測試登入端點狀態: ${res.statusCode}`);
            console.log(`📋 響應頭:`, res.headers);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📄 測試登入響應: ${data}`);
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', (err) => {
            console.log(`❌ 測試登入請求錯誤: ${err.message}`);
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

async function runTests() {
    try {
        console.log('\n📋 1. 測試正式登入端點...');
        await testLoginEndpoint();
        
        console.log('\n📋 2. 測試測試登入端點...');
        await testTestLoginEndpoint();
        
    } catch (error) {
        console.log(`❌ 測試失敗: ${error.message}`);
    }
}

runTests(); 