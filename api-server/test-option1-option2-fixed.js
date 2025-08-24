const axios = require('axios');

// 測試配置 - 使用正確的Railway域名
const API_BASE_URL = 'https://swiming-production.up.railway.app';
const API_PUBLIC_KEY = 'ttdrcccy';
const API_PRIVATE_KEY = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

// 測試數據
const testStudent = {
    name: '測試學生',
    '上課日期': '2025-08-11',
    location: '維多利亞公園游泳池🏊',
    phone: '12345678', // 使用正確的電話號碼字段名
    option1: '出席1',
    option2: '補堂1'
};

console.log('🧪 開始測試 option1 和 option2 功能...\n');
console.log(`🌐 API 服務器: ${API_BASE_URL}\n`);

async function testOption1Option2() {
    try {
        console.log('📋 1. 測試健康檢查...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`, {
            headers: {
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            },
            timeout: 15000
        });
        
        if (healthResponse.status === 200) {
            console.log('✅ 健康檢查通過');
            console.log('📄 響應:', healthResponse.data);
        } else {
            console.log('❌ 健康檢查失敗:', healthResponse.status);
            return;
        }

        console.log('\n📋 2. 測試創建學生記錄...');
        const createResponse = await axios.post(`${API_BASE_URL}/students`, testStudent, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            },
            timeout: 15000
        });

        if (createResponse.status === 200 || createResponse.status === 201) {
            console.log('✅ 學生記錄創建成功');
            console.log('📄 響應:', createResponse.data);
        } else {
            console.log('❌ 學生記錄創建失敗:', createResponse.status);
            console.log('📄 錯誤:', createResponse.data);
        }

        console.log('\n📋 3. 測試更新 option1...');
        const updateOption1Response = await axios.put(`${API_BASE_URL}/students/update`, {
            name: testStudent.name,
            '上課日期': testStudent['上課日期'],
            location: testStudent.location,
            option1: '出席2' // 更新 option1
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            },
            timeout: 15000
        });

        if (updateOption1Response.status === 200) {
            console.log('✅ option1 更新成功');
            console.log('📄 響應:', updateOption1Response.data);
        } else {
            console.log('❌ option1 更新失敗:', updateOption1Response.status);
            console.log('📄 錯誤:', updateOption1Response.data);
        }

        console.log('\n📋 4. 測試更新 option2...');
        const updateOption2Response = await axios.put(`${API_BASE_URL}/students/update`, {
            name: testStudent.name,
            '上課日期': testStudent['上課日期'],
            location: testStudent.location,
            option2: '調堂1' // 更新 option2
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            },
            timeout: 15000
        });

        if (updateOption2Response.status === 200) {
            console.log('✅ option2 更新成功');
            console.log('📄 響應:', updateOption2Response.data);
        } else {
            console.log('❌ option2 更新失敗:', updateOption2Response.status);
            console.log('📄 錯誤:', updateOption2Response.data);
        }

        console.log('\n📋 5. 測試同時更新 option1 和 option2...');
        const updateBothResponse = await axios.put(`${API_BASE_URL}/students/update`, {
            name: testStudent.name,
            '上課日期': testStudent['上課日期'],
            location: testStudent.location,
            option1: '缺席',
            option2: '補堂2'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            },
            timeout: 15000
        });

        if (updateBothResponse.status === 200) {
            console.log('✅ option1 和 option2 同時更新成功');
            console.log('📄 響應:', updateBothResponse.data);
        } else {
            console.log('❌ option1 和 option2 同時更新失敗:', updateBothResponse.status);
            console.log('📄 錯誤:', updateBothResponse.data);
        }

        console.log('\n📋 6. 測試查詢學生記錄...');
        const queryResponse = await axios.get(`${API_BASE_URL}/students`, {
            headers: {
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            },
            timeout: 15000
        });

        if (queryResponse.status === 200) {
            console.log('✅ 學生記錄查詢成功');
            const students = queryResponse.data;
            const testStudentRecord = students.find(s => 
                s.name === testStudent.name && 
                (s['上課日期'] === testStudent['上課日期'] || s.date === testStudent['上課日期'])
            );
            
            if (testStudentRecord) {
                console.log('✅ 找到測試學生記錄');
                console.log('📄 學生信息:', {
                    name: testStudentRecord.name,
                    date: testStudentRecord.date || testStudentRecord['上課日期'],
                    option1: testStudentRecord.option1,
                    option2: testStudentRecord.option2
                });
            } else {
                console.log('❌ 未找到測試學生記錄');
            }
        } else {
            console.log('❌ 學生記錄查詢失敗:', queryResponse.status);
        }

        console.log('\n📋 7. 測試錯誤處理...');
        try {
            await axios.put(`${API_BASE_URL}/students/update`, {
                name: '不存在的學生',
                '上課日期': '2025-08-11',
                option1: '出席1'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Public-Key': API_PUBLIC_KEY,
                    'X-API-Private-Key': API_PRIVATE_KEY
                },
                timeout: 15000
            });
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('✅ 錯誤處理正常 - 正確返回404錯誤');
                console.log('📄 錯誤信息:', error.response.data);
            } else {
                console.log('❌ 錯誤處理異常:', error.message);
            }
        }

        console.log('\n🎉 option1 和 option2 功能測試完成！');

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('🔍 服務器連接被拒絕，請檢查：');
            console.log('   1. Railway服務器是否已啟動');
            console.log('   2. API端點是否正確');
            console.log('   3. 網絡連接是否正常');
        } else if (error.code === 'ENOTFOUND') {
            console.log('🔍 無法找到服務器，請檢查：');
            console.log('   1. API_BASE_URL 是否正確');
            console.log('   2. Railway服務器是否已部署');
        } else if (error.response) {
            console.log('🔍 HTTP錯誤:', error.response.status);
            console.log('📄 錯誤詳情:', error.response.data);
        }
    }
}

// 執行測試
testOption1Option2(); 