const http = require('http');

console.log('🧪 快速測試API服務器...\n');

// 測試配置
const testConfig = {
    hostname: 'localhost',
    port: 3001,
    path: '/auth/test-login',
    method: 'POST',
    headers: {
        'X-API-Public-Key': 'ttdrcccy',
        'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
        'Content-Type': 'application/json'
    }
};

// 測試數據
const testData = {
    phone: 'test',
    password: '123456',
    userType: 'parent'
};

console.log('📤 發送測試數據:', JSON.stringify(testData, null, 2));

const req = http.request(testConfig, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\n📊 響應狀態碼:', res.statusCode);
        console.log('📄 響應內容:');
        try {
            const jsonResponse = JSON.parse(data);
            console.log(JSON.stringify(jsonResponse, null, 2));
            
            if (jsonResponse.success) {
                console.log('\n✅ 測試登入成功！');
            } else {
                console.log('\n❌ 測試登入失敗！');
            }
        } catch (e) {
            console.log('原始響應:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ 請求錯誤:', error.message);
});

req.write(JSON.stringify(testData));
req.end(); 