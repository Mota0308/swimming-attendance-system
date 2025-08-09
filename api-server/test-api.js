const http = require('http');

// API 配置
const API_CONFIG = {
    baseUrl: 'http://localhost:3001',
    publicKey: 'ttdrcccy',
    privateKey: '2b207365-cbf0-4e42-a3bf-f932c84557c4'
};

// 測試數據
const TEST_STUDENT = {
    name: "測試學生",
    age: 10,
    level: "初級",
    phone: "0912345678",
    parentName: "測試家長",
    parentPhone: "0987654321",
    joinDate: new Date().toISOString(),
    status: "active"
};

const TEST_USER = {
    username: "testuser",
    password: "testpass"
};

// 通用請求函數
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsedData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// 測試函數
async function runTests() {
    console.log('🧪 開始 API 測試...\n');
    
    try {
        // 1. 測試健康檢查
        console.log('1️⃣ 測試健康檢查...');
        const healthResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET',
            headers: {
                'X-API-Public-Key': API_CONFIG.publicKey,
                'X-API-Private-Key': API_CONFIG.privateKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (healthResponse.statusCode === 200) {
            console.log('✅ 健康檢查通過');
            console.log(`   響應: ${JSON.stringify(healthResponse.data, null, 2)}`);
        } else {
            console.log('❌ 健康檢查失敗');
            console.log(`   狀態碼: ${healthResponse.statusCode}`);
        }
        console.log('');
        
        // 2. 測試獲取學生資料
        console.log('2️⃣ 測試獲取學生資料...');
        const studentsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/students',
            method: 'GET',
            headers: {
                'X-API-Public-Key': API_CONFIG.publicKey,
                'X-API-Private-Key': API_CONFIG.privateKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (studentsResponse.statusCode === 200) {
            console.log('✅ 獲取學生資料成功');
            console.log(`   學生數量: ${Array.isArray(studentsResponse.data) ? studentsResponse.data.length : '未知'}`);
        } else {
            console.log('❌ 獲取學生資料失敗');
            console.log(`   狀態碼: ${studentsResponse.statusCode}`);
        }
        console.log('');
        
        // 3. 測試批量上傳學生資料
        console.log('3️⃣ 測試批量上傳學生資料...');
        const uploadResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/students/batch',
            method: 'POST',
            headers: {
                'X-API-Public-Key': API_CONFIG.publicKey,
                'X-API-Private-Key': API_CONFIG.privateKey,
                'Content-Type': 'application/json'
            }
        }, [TEST_STUDENT]);
        
        if (uploadResponse.statusCode === 200) {
            console.log('✅ 批量上傳成功');
            console.log(`   上傳結果: ${JSON.stringify(uploadResponse.data, null, 2)}`);
        } else {
            console.log('❌ 批量上傳失敗');
            console.log(`   狀態碼: ${uploadResponse.statusCode}`);
            console.log(`   錯誤: ${JSON.stringify(uploadResponse.data, null, 2)}`);
        }
        console.log('');
        
        // 4. 測試用戶登入
        console.log('4️⃣ 測試用戶登入...');
        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'X-API-Public-Key': API_CONFIG.publicKey,
                'X-API-Private-Key': API_CONFIG.privateKey,
                'Content-Type': 'application/json'
            }
        }, TEST_USER);
        
        if (loginResponse.statusCode === 200) {
            console.log('✅ 用戶登入成功');
            console.log(`   登入結果: ${JSON.stringify(loginResponse.data, null, 2)}`);
        } else {
            console.log('❌ 用戶登入失敗');
            console.log(`   狀態碼: ${loginResponse.statusCode}`);
            console.log(`   錯誤: ${JSON.stringify(loginResponse.data, null, 2)}`);
        }
        console.log('');
        
        // 5. 測試無效API密鑰
        console.log('5️⃣ 測試無效API密鑰...');
        const invalidKeyResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET',
            headers: {
                'X-API-Public-Key': 'invalid_key',
                'X-API-Private-Key': 'invalid_key',
                'Content-Type': 'application/json'
            }
        });
        
        if (invalidKeyResponse.statusCode === 401) {
            console.log('✅ 無效API密鑰正確被拒絕');
        } else {
            console.log('❌ 無效API密鑰未被正確處理');
            console.log(`   狀態碼: ${invalidKeyResponse.statusCode}`);
        }
        console.log('');
        
        console.log('🎉 API 測試完成！');
        
    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.message);
    }
}

// 檢查服務器是否運行
async function checkServerStatus() {
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET',
            headers: {
                'X-API-Public-Key': API_CONFIG.publicKey,
                'X-API-Private-Key': API_CONFIG.privateKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 200) {
            console.log('✅ API 服務器正在運行');
            return true;
        } else {
            console.log('❌ API 服務器未正常響應');
            return false;
        }
    } catch (error) {
        console.log('❌ 無法連接到 API 服務器');
        console.log('   請確保服務器已啟動: npm start');
        return false;
    }
}

// 主函數
async function main() {
    console.log('🚀 API 測試工具');
    console.log('================\n');
    
    const serverRunning = await checkServerStatus();
    
    if (serverRunning) {
        await runTests();
    } else {
        console.log('\n💡 請先啟動 API 服務器:');
        console.log('   cd api-server');
        console.log('   npm start');
    }
}

// 運行測試
main().catch(console.error); 