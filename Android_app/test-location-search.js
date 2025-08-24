// 測試手機APP地點搜索功能
const axios = require('axios');

// 測試配置
const API_BASE_URL = 'http://localhost:3001'; // 或者你的實際API地址

async function testLocationSearch() {
    console.log('🔍 開始測試地點搜索功能...\n');
    
    try {
        // 1. 獲取所有學生數據
        console.log('📊 步驟1: 獲取所有學生數據');
        const studentsResponse = await axios.get(`${API_BASE_URL}/api/students`);
        
        if (!studentsResponse.data.success) {
            throw new Error(`獲取學生數據失敗: ${studentsResponse.data.message}`);
        }
        
        const students = studentsResponse.data.data || [];
        console.log(`✅ 成功獲取 ${students.length} 名學生數據\n`);
        
        // 2. 分析地點數據
        console.log('📍 步驟2: 分析地點數據');
        const locationMap = new Map();
        
        students.forEach(student => {
            const location = student.location || '未知地點';
            if (!locationMap.has(location)) {
                locationMap.set(location, []);
            }
            locationMap.get(location).push(student.name);
        });
        
        console.log('📋 發現的地點:');
        locationMap.forEach((students, location) => {
            console.log(`  - ${location}: ${students.length} 名學生 (${students.join(', ')})`);
        });
        console.log();
        
        // 3. 測試地點標準化
        console.log('🔧 步驟3: 測試地點名稱標準化');
        const normalizeLocation = (location) => {
            return location
                .replace(/[🏊‍♂🏊♂]/g, '') // 移除游泳表情符號
                .replace(/\s+/g, ' ') // 將多個空格替換為單個空格
                .trim(); // 移除首尾空格
        };
        
        const normalizedLocations = new Map();
        locationMap.forEach((students, location) => {
            const normalized = normalizeLocation(location);
            if (!normalizedLocations.has(normalized)) {
                normalizedLocations.set(normalized, []);
            }
            normalizedLocations.get(normalized).push(...students);
        });
        
        console.log('📋 標準化後的地點:');
        normalizedLocations.forEach((students, location) => {
            console.log(`  - ${location}: ${students.length} 名學生`);
        });
        console.log();
        
        // 4. 測試地點搜索
        console.log('🔍 步驟4: 測試地點搜索功能');
        const testLocations = Array.from(normalizedLocations.keys());
        
        for (const testLocation of testLocations) {
            console.log(`🔍 搜索地點: "${testLocation}"`);
            
            const searchResponse = await axios.post(`${API_BASE_URL}/api/students/search`, {
                location: testLocation
            });
            
            if (searchResponse.data.success) {
                const searchResults = searchResponse.data.data || [];
                console.log(`  ✅ 找到 ${searchResults.length} 名學生`);
                
                // 驗證搜索結果
                const expectedCount = normalizedLocations.get(testLocation)?.length || 0;
                if (searchResults.length === expectedCount) {
                    console.log(`  ✅ 搜索結果數量正確`);
                } else {
                    console.log(`  ⚠️  搜索結果數量不匹配: 期望 ${expectedCount}, 實際 ${searchResults.length}`);
                }
            } else {
                console.log(`  ❌ 搜索失敗: ${searchResponse.data.message}`);
            }
            console.log();
        }
        
        // 5. 測試特殊字符處理
        console.log('🎯 步驟5: 測試特殊字符處理');
        const specialLocations = [
            '維多利亞公園游泳池🏊‍♂',
            '維多利亞公園游泳池🏊',
            '維多利亞公園游泳池♂',
            '維多利亞公園游泳池   ', // 多個空格
            '  維多利亞公園游泳池  ' // 首尾空格
        ];
        
        for (const specialLocation of specialLocations) {
            const normalized = normalizeLocation(specialLocation);
            console.log(`原始: "${specialLocation}" -> 標準化: "${normalized}"`);
        }
        console.log();
        
        console.log('✅ 地點搜索功能測試完成！');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
        if (error.response) {
            console.error('API響應:', error.response.data);
        }
    }
}

// 運行測試
if (require.main === module) {
    testLocationSearch();
}

module.exports = { testLocationSearch }; 