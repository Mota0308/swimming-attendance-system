const https = require('https');

async function testWebApp() {
    const baseUrl = 'https://swimming-system-web-production.up.railway.app';
    
    console.log('🔍 测试网页应用状态...');
    console.log(`📡 基础URL: ${baseUrl}`);
    console.log('');
    
    // 测试主页面
    console.log('1️⃣ 测试主页面...');
    await testEndpoint(`${baseUrl}/`, '主页面');
    
    // 测试健康检查
    console.log('\n2️⃣ 测试健康检查...');
    await testEndpoint(`${baseUrl}/health`, '健康检查');
    
    // 测试端口信息
    console.log('\n3️⃣ 测试端口信息...');
    await testEndpoint(`${baseUrl}/port-info`, '端口信息');
    
    // 测试API服务器（对比）
    console.log('\n4️⃣ 测试API服务器（对比）...');
    await testEndpoint('https://swiming-production.up.railway.app/api/health', 'API服务器');
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
                console.log(`   📋 响应头: ${JSON.stringify(res.headers, null, 2)}`);
                
                if (res.statusCode === 200) {
                    console.log(`   ✅ ${description} 正常`);
                    try {
                        const jsonData = JSON.parse(data);
                        console.log(`   📄 响应内容: ${JSON.stringify(jsonData, null, 2)}`);
                    } catch (e) {
                        console.log(`   📄 响应内容: ${data.substring(0, 200)}...`);
                    }
                } else {
                    console.log(`   ❌ ${description} 异常`);
                    console.log(`   📄 错误内容: ${data}`);
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

// 运行测试
testWebApp().then(() => {
    console.log('\n🎯 测试完成！');
    console.log('\n📋 如果网页应用返回502错误，可能的原因：');
    console.log('1. 应用还在启动中（等待1-2分钟）');
    console.log('2. 端口配置问题');
    console.log('3. 代码错误导致启动失败');
    console.log('4. Railway环境变量配置问题');
}); 