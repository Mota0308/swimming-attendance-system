// 测试网页应用API端点
const axios = require('axios');

const API_BASE_URL = 'https://swiming-production.up.railway.app';

// 测试配置
const testConfig = {
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
};

// 测试结果记录
const testResults = [];

// 测试函数
async function testEndpoint(name, method, endpoint, data = null) {
    try {
        console.log(`🧪 测试 ${name}...`);
        
        const startTime = Date.now();
        let response;
        
        if (method === 'GET') {
            response = await axios.get(`${API_BASE_URL}${endpoint}`, testConfig);
        } else if (method === 'POST') {
            response = await axios.post(`${API_BASE_URL}${endpoint}`, data, testConfig);
        }
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const result = {
            name: name,
            endpoint: endpoint,
            method: method,
            status: response.status,
            responseTime: `${responseTime}ms`,
            success: response.status >= 200 && response.status < 300,
            data: response.data
        };
        
        if (result.success) {
            console.log(`✅ ${name} 测试成功 - 状态: ${response.status}, 响应时间: ${responseTime}ms`);
        } else {
            console.log(`❌ ${name} 测试失败 - 状态: ${response.status}`);
        }
        
        testResults.push(result);
        return result;
        
    } catch (error) {
        const result = {
            name: name,
            endpoint: endpoint,
            method: method,
            status: error.response?.status || 'ERROR',
            responseTime: 'N/A',
            success: false,
            error: error.message
        };
        
        console.log(`❌ ${name} 测试失败 - 错误: ${error.message}`);
        testResults.push(result);
        return result;
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('🚀 开始测试网页应用API端点...\n');
    
    // 测试健康检查
    await testEndpoint('健康检查', 'GET', '/api/health');
    
    // 测试地点数据
    await testEndpoint('地点数据', 'GET', '/api/locations');
    
    // 测试泳会数据
    await testEndpoint('泳会数据', 'GET', '/api/clubs');
    
    // 测试学生数据
    await testEndpoint('学生数据', 'GET', '/api/students');
    await testEndpoint('学生数据(带过滤)', 'GET', '/api/students?location=維多利亞公園游泳池&club=維多利亞泳會');
    
    // 测试出席记录
    await testEndpoint('出席记录', 'GET', '/api/attendance');
    await testEndpoint('出席记录(带过滤)', 'GET', '/api/attendance?month=8&location=維多利亞公園游泳池&club=維多利亞泳會');
    
    // 测试工时数据
    await testEndpoint('工时数据', 'GET', '/api/work-hours');
    await testEndpoint('工时数据(带月份)', 'GET', '/api/work-hours?month=8');
    
    // 测试更表数据
    await testEndpoint('更表数据', 'GET', '/api/roster');
    await testEndpoint('更表数据(带月份)', 'GET', '/api/roster?month=8');
    
    // 测试登录
    await testEndpoint('登录测试', 'POST', '/api/auth/login', {
        phone: '12345678',
        password: 'test123',
        userType: 'coach'
    });
    
    console.log('\n📊 测试结果总结:');
    console.log('='.repeat(50));
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    
    console.log(`总测试数: ${totalCount}`);
    console.log(`成功: ${successCount}`);
    console.log(`失败: ${totalCount - successCount}`);
    console.log(`成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    console.log('\n详细结果:');
    testResults.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${result.name} - ${result.endpoint} - 状态: ${result.status}`);
        if (!result.success && result.error) {
            console.log(`   错误: ${result.error}`);
        }
    });
    
    // 生成测试报告
    const report = {
        timestamp: new Date().toISOString(),
        totalTests: totalCount,
        successfulTests: successCount,
        failedTests: totalCount - successCount,
        successRate: ((successCount / totalCount) * 100).toFixed(1) + '%',
        results: testResults
    };
    
    console.log('\n📄 测试报告已生成');
    console.log(JSON.stringify(report, null, 2));
}

// 如果直接运行此脚本
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ 测试运行失败:', error);
        process.exit(1);
    });
}

module.exports = {
    testEndpoint,
    runAllTests,
    testResults
}; 