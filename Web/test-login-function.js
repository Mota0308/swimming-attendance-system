const https = require('https');

async function testLoginFunction() {
    console.log('🔍 测试登入功能...');
    console.log('');
    
    // 测试1: 检查主页面是否正常
    console.log('1️⃣ 测试主页面加载...');
    await testEndpoint('https://swimming-system-web-production.up.railway.app/', '主页面');
    
    // 测试2: 检查健康检查
    console.log('\n2️⃣ 测试健康检查...');
    await testEndpoint('https://swimming-system-web-production.up.railway.app/health', '健康检查');
    
    // 测试3: 检查API服务器连接
    console.log('\n3️⃣ 测试API服务器连接...');
    await testEndpoint('https://swiming-production.up.railway.app/api/health', 'API服务器');
    
    // 测试4: 模拟登入请求
    console.log('\n4️⃣ 测试登入API...');
    await testLoginAPI();
}

async function testEndpoint(url, description) {
    return new Promise((resolve) => {
        const options = {
            method: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   📊 状态码: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    console.log(`   ✅ ${description} 正常`);
                    if (description === '主页面') {
                        // 检查页面内容
                        if (data.includes('登入') || data.includes('login')) {
                            console.log(`   📄 页面包含登入相关元素`);
                        } else {
                            console.log(`   ⚠️  页面可能缺少登入元素`);
                        }
                    }
                } else {
                    console.log(`   ❌ ${description} 异常`);
                    console.log(`   📄 错误内容: ${data.substring(0, 200)}...`);
                }
                resolve();
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ ${description} 连接失败`);
            console.log(`   📄 错误信息: ${error.message}`);
            resolve();
        });
        
        req.on('timeout', () => {
            console.log(`   ⏰ ${description} 请求超时`);
            req.destroy();
            resolve();
        });
        
        req.end();
    });
}

async function testLoginAPI() {
    return new Promise((resolve) => {
        const loginData = JSON.stringify({
            phone: '66666666',
            password: 'test123',
            userType: 'coach'
        });
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        };
        
        const req = https.request('https://swiming-production.up.railway.app/api/auth/login', options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   📊 登入API状态码: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    console.log(`   ✅ 登入API 正常`);
                    try {
                        const jsonData = JSON.parse(data);
                        console.log(`   📄 响应: ${JSON.stringify(jsonData, null, 2)}`);
                    } catch (e) {
                        console.log(`   📄 响应内容: ${data.substring(0, 200)}...`);
                    }
                } else {
                    console.log(`   ❌ 登入API 异常`);
                    console.log(`   📄 错误内容: ${data.substring(0, 200)}...`);
                }
                resolve();
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ 登入API 连接失败`);
            console.log(`   📄 错误信息: ${error.message}`);
            resolve();
        });
        
        req.write(loginData);
        req.end();
    });
}

// 运行测试
testLoginFunction().then(() => {
    console.log('\n🎯 登入功能测试完成！');
    console.log('\n📋 如果登入后无法跳转，可能的原因：');
    console.log('1. JavaScript错误 - 检查浏览器控制台');
    console.log('2. API调用失败 - 登入请求未成功');
    console.log('3. 页面跳转逻辑问题 - 代码错误');
    console.log('4. 浏览器兼容性问题');
    console.log('\n🔍 建议在浏览器中按F12查看控制台错误信息');
}); 