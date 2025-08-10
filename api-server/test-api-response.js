const axios = require('axios');

// 使用環境變量或默認值
const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
    : 'http://localhost:3001';

const API_PUBLIC_KEY = process.env.API_PUBLIC_KEY || 'your_public_key';
const API_PRIVATE_KEY = process.env.API_PRIVATE_KEY || 'your_private_key';

async function testAPIResponse() {
    try {
        console.log('🔍 測試 API 響應...');
        console.log(`📡 API 地址: ${BASE_URL}`);
        
        // 測試獲取學生資料
        const response = await axios.get(`${BASE_URL}/students/user/12345678`, {
            headers: {
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ API 響應成功');
        console.log('📊 響應數據:');
        
        if (response.data.success && response.data.students) {
            const students = response.data.students;
            console.log(`找到 ${students.length} 條學生記錄`);
            
            students.forEach((student, index) => {
                console.log(`\n記錄 ${index + 1}:`);
                console.log(`  姓名: ${student.name}`);
                console.log(`  電話: ${student.Phone_number}`);
                console.log(`  上課日期: ${student['上課日期']}`);
                console.log(`  待約: ${student['待約']}`);
                console.log(`  待約月份: ${student['待約月份']}`);
                console.log(`  年齡: ${student.age}`);
                console.log(`  類型: ${student.type}`);
                console.log(`  時間: ${student.time}`);
            });
        } else {
            console.log('❌ API 響應格式不正確');
            console.log(response.data);
        }
        
    } catch (error) {
        console.error('❌ API 測試失敗:', error.message);
        if (error.response) {
            console.error('響應狀態:', error.response.status);
            console.error('響應數據:', error.response.data);
        }
    }
}

// 執行測試
testAPIResponse(); 