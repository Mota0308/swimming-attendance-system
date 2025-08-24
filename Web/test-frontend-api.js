// 测试前端API调用
async function testFrontendAPI() {
    console.log('🧪 测试前端API调用...\n');
    
    const baseURL = ''; // 模拟前端的baseURL设置
    const headers = {
        'X-API-Public-Key': 'ttdrcccy',
        'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    const endpoints = [
        '/api/health',
        '/api/locations',
        '/api/clubs'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`📡 测试: ${baseURL}${endpoint}`);
            
            const response = await fetch(`${baseURL}${endpoint}`, {
                method: 'GET',
                headers: headers
            });
            
            console.log(`   📊 状态: ${response.status} ${response.statusText}`);
            console.log(`   📋 内容类型: ${response.headers.get('content-type')}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`   ✅ 成功: ${data.success ? '是' : '否'}`);
                if (data.message) {
                    console.log(`   📝 消息: ${data.message}`);
                }
            } else {
                const errorText = await response.text();
                console.log(`   ❌ 错误: ${errorText.substring(0, 100)}...`);
            }
            
        } catch (error) {
            console.log(`   💥 异常: ${error.message}`);
        }
        
        console.log('');
    }
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
    const fetch = require('node-fetch');
    global.fetch = fetch;
    testFrontendAPI().catch(console.error);
} else {
    // 在浏览器中运行
    window.testFrontendAPI = testFrontendAPI;
} 