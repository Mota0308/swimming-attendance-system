const https = require('https');

const RAILWAY_URL = 'https://swiming-production.up.railway.app';

console.log('🧪 測試正確的 Railway API...');
console.log(`🌐 URL: ${RAILWAY_URL}`);

// 測試基本連接
function testConnection() {
    return new Promise((resolve, reject) => {
        const req = https.get(RAILWAY_URL, (res) => {
            console.log(`📡 連接狀態: ${res.statusCode}`);
            console.log(`📋 響應頭:`, res.headers);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📄 響應內容: ${data.substring(0, 200)}...`);
                resolve({ statusCode: res.statusCode, data });
            });
        });
        
        req.on('error', (err) => {
            console.log(`❌ 連接錯誤: ${err.message}`);
            reject(err);
        });
        
        req.setTimeout(10000, () => {
            console.log('⏰ 請求超時');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// 測試健康檢查端點
function testHealthCheck() {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        };
        
        const req = https.get(`${RAILWAY_URL}/health`, options, (res) => {
            console.log(`🏥 健康檢查狀態: ${res.statusCode}`);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📄 健康檢查響應: ${data}`);
                resolve({ statusCode: res.statusCode, data });
            });
        });
        
        req.on('error', (err) => {
            console.log(`❌ 健康檢查錯誤: ${err.message}`);
            reject(err);
        });
    });
}

async function runTests() {
    try {
        console.log('\n📋 1. 測試基本連接...');
        await testConnection();
        
        console.log('\n📋 2. 測試健康檢查端點...');
        await testHealthCheck();
        
    } catch (error) {
        console.log(`❌ 測試失敗: ${error.message}`);
    }
}

runTests(); 