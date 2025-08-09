const https = require('https');

// Railway API 測試
const testRailwayAPI = () => {
    console.log('🧪 測試 Railway API 端點...');
    
    const options = {
        hostname: 'swiming-production.up.railway.app',
        port: 443,
        path: '/health',
        method: 'GET',
        headers: {
            'x-api-public-key': 'ttdrcccy',
            'x-api-private-key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
            'User-Agent': 'SwimmingApp/1.0'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`📊 狀態碼: ${res.statusCode}`);
        console.log(`📋 響應頭:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📄 響應內容:');
            console.log(data);
            
            try {
                const jsonResponse = JSON.parse(data);
                if (jsonResponse.success) {
                    console.log('✅ Railway API 正常運行');
                    console.log('版本:', jsonResponse.version);
                    console.log('部署:', jsonResponse.deployment);
                } else {
                    console.log('❌ Railway API 有問題');
                    console.log('錯誤:', jsonResponse.message);
                }
            } catch (e) {
                console.log('❌ 無法解析 JSON 響應');
            }
        });
    });

    req.on('error', (e) => {
        console.error('❌ 請求錯誤:', e.message);
    });

    req.end();
};

// 測試登入端點
const testLoginAPI = () => {
    console.log('\n🔐 測試登入 API 端點...');
    
    const postData = JSON.stringify({
        phone: 'aaa',
        password: '123456',
        userType: 'admin'
    });

    const options = {
        hostname: 'swiming-production.up.railway.app',
        port: 443,
        path: '/auth/login',
        method: 'POST',
        headers: {
            'x-api-public-key': 'ttdrcccy',
            'x-api-private-key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'SwimmingApp/1.0'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`📊 登入狀態碼: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📄 登入響應:');
            console.log(data);
            
            try {
                const jsonResponse = JSON.parse(data);
                if (jsonResponse.success) {
                    console.log('✅ 管理員登入成功');
                    console.log('用戶信息:', jsonResponse.user);
                } else {
                    console.log('❌ 登入失敗');
                    console.log('錯誤:', jsonResponse.message);
                }
            } catch (e) {
                console.log('❌ 無法解析登入響應');
            }
        });
    });

    req.on('error', (e) => {
        console.error('❌ 登入請求錯誤:', e.message);
    });

    req.write(postData);
    req.end();
};

// 執行測試
console.log('🚀 開始測試 Railway API...\n');
testRailwayAPI();

// 延遲 2 秒後測試登入
setTimeout(testLoginAPI, 2000); 