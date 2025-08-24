const fetch = require('node-fetch');

async function testBackendStatus() {
    console.log('🔍 测试后端服务状态...\n');
    
    const baseUrl = 'https://swimming-attendance-system-production.up.railway.app';
    const endpoints = [
        '/health',
        '/api/health', 
        '/locations',
        '/api/locations',
        '/clubs',
        '/api/clubs'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`📡 测试: ${baseUrl}${endpoint}`);
            
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Swimming-System-Test/1.0.0'
                }
            });
            
            console.log(`   📊 状态: ${response.status} ${response.statusText}`);
            console.log(`   📋 内容类型: ${response.headers.get('content-type')}`);
            
            const data = await response.text();
            const isHtml = data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html');
            
            if (isHtml) {
                console.log(`   ⚠️  返回HTML (错误页面)`);
                console.log(`   📄 内容预览: ${data.substring(0, 100)}...`);
            } else {
                console.log(`   ✅ 返回非HTML内容`);
                console.log(`   📄 内容预览: ${data.substring(0, 100)}...`);
            }
            
        } catch (error) {
            console.log(`   ❌ 请求失败: ${error.message}`);
        }
        
        console.log('');
    }
    
    // 测试带认证的请求
    console.log('🔐 测试带认证的请求...\n');
    
    try {
        const authResponse = await fetch(`${baseUrl}/api/health`, {
            method: 'GET',
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                'Accept': 'application/json'
            }
        });
        
        console.log(`📡 认证请求: ${baseUrl}/api/health`);
        console.log(`📊 状态: ${authResponse.status} ${authResponse.statusText}`);
        
        const authData = await authResponse.text();
        const isAuthHtml = authData.trim().startsWith('<!DOCTYPE') || authData.trim().startsWith('<html');
        
        if (isAuthHtml) {
            console.log(`   ⚠️  认证后仍返回HTML`);
            console.log(`   📄 内容预览: ${authData.substring(0, 100)}...`);
        } else {
            console.log(`   ✅ 认证成功，返回非HTML内容`);
            console.log(`   📄 内容预览: ${authData.substring(0, 100)}...`);
        }
        
    } catch (error) {
        console.log(`   ❌ 认证请求失败: ${error.message}`);
    }
}

testBackendStatus().catch(console.error); 