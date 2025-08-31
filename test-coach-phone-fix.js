// 測試教練phone字段修復
const API_BASE_URL = 'https://swiming-production.up.railway.app';

async function testCoachPhoneFix() {
    console.log('🧪 開始測試教練phone字段修復...');
    
    try {
        // 1. 測試獲取教練列表
        console.log('\n1️⃣ 測試獲取教練列表...');
        const coachesResponse = await fetch(`${API_BASE_URL}/api/coaches`, {
            method: 'GET',
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                'Content-Type': 'application/json'
            }
        });
        
        if (!coachesResponse.ok) {
            throw new Error(`獲取教練列表失敗: ${coachesResponse.status}`);
        }
        
        const coachesData = await coachesResponse.json();
        console.log('✅ 教練列表獲取成功');
        console.log('📋 教練數據:', coachesData.coaches);
        
        // 2. 查找測試A教練
        console.log('\n2️⃣ 查找測試A教練...');
        const testACoach = coachesData.coaches.find(c => 
            c.name === '測試A' || c.studentName === '測試A'
        );
        
        if (testACoach) {
            console.log('✅ 找到測試A教練:', testACoach);
            console.log(`📱 測試A的phone: ${testACoach.phone}`);
            console.log(`📝 測試A的name: ${testACoach.name}`);
        } else {
            console.log('⚠️ 未找到測試A教練');
        }
        
        // 3. 測試獲取特定教練的更表數據
        if (testACoach) {
            console.log('\n3️⃣ 測試獲取測試A的更表數據...');
            const rosterResponse = await fetch(`${API_BASE_URL}/api/coach-roster?phone=${testACoach.phone}&year=2025&month=8`, {
                method: 'GET',
                headers: {
                    'X-API-Public-Key': 'ttdrcccy',
                    'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                    'Content-Type': 'application/json'
                }
            });
            
            if (rosterResponse.ok) {
                const rosterData = await rosterResponse.json();
                console.log('✅ 更表數據獲取成功');
                console.log('📋 更表記錄:', rosterData.records);
            } else {
                console.log('⚠️ 更表數據獲取失敗:', rosterResponse.status);
            }
        }
        
        // 4. 檢查數據庫中的實際記錄
        console.log('\n4️⃣ 檢查數據庫中的Coach_roster記錄...');
        const rosterAllResponse = await fetch(`${API_BASE_URL}/api/coach-roster?year=2025&month=8&userType=supervisor`, {
            method: 'GET',
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                'Content-Type': 'application/json'
            }
        });
        
        if (rosterAllResponse.ok) {
            const rosterAllData = await rosterAllResponse.json();
            console.log('✅ 全部更表數據獲取成功');
            console.log('📋 全部更表記錄:', rosterAllData.records);
            
            // 分析phone字段
            const phoneAnalysis = {};
            rosterAllData.records.forEach(record => {
                const name = record.name;
                const phone = record.phone;
                if (!phoneAnalysis[name]) {
                    phoneAnalysis[name] = [];
                }
                if (!phoneAnalysis[name].includes(phone)) {
                    phoneAnalysis[name].push(phone);
                }
            });
            
            console.log('📊 Phone字段分析:', phoneAnalysis);
        }
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 運行測試
testCoachPhoneFix(); 
 
const API_BASE_URL = 'https://swiming-production.up.railway.app';

async function testCoachPhoneFix() {
    console.log('🧪 開始測試教練phone字段修復...');
    
    try {
        // 1. 測試獲取教練列表
        console.log('\n1️⃣ 測試獲取教練列表...');
        const coachesResponse = await fetch(`${API_BASE_URL}/api/coaches`, {
            method: 'GET',
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                'Content-Type': 'application/json'
            }
        });
        
        if (!coachesResponse.ok) {
            throw new Error(`獲取教練列表失敗: ${coachesResponse.status}`);
        }
        
        const coachesData = await coachesResponse.json();
        console.log('✅ 教練列表獲取成功');
        console.log('📋 教練數據:', coachesData.coaches);
        
        // 2. 查找測試A教練
        console.log('\n2️⃣ 查找測試A教練...');
        const testACoach = coachesData.coaches.find(c => 
            c.name === '測試A' || c.studentName === '測試A'
        );
        
        if (testACoach) {
            console.log('✅ 找到測試A教練:', testACoach);
            console.log(`📱 測試A的phone: ${testACoach.phone}`);
            console.log(`📝 測試A的name: ${testACoach.name}`);
        } else {
            console.log('⚠️ 未找到測試A教練');
        }
        
        // 3. 測試獲取特定教練的更表數據
        if (testACoach) {
            console.log('\n3️⃣ 測試獲取測試A的更表數據...');
            const rosterResponse = await fetch(`${API_BASE_URL}/api/coach-roster?phone=${testACoach.phone}&year=2025&month=8`, {
                method: 'GET',
                headers: {
                    'X-API-Public-Key': 'ttdrcccy',
                    'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                    'Content-Type': 'application/json'
                }
            });
            
            if (rosterResponse.ok) {
                const rosterData = await rosterResponse.json();
                console.log('✅ 更表數據獲取成功');
                console.log('📋 更表記錄:', rosterData.records);
            } else {
                console.log('⚠️ 更表數據獲取失敗:', rosterResponse.status);
            }
        }
        
        // 4. 檢查數據庫中的實際記錄
        console.log('\n4️⃣ 檢查數據庫中的Coach_roster記錄...');
        const rosterAllResponse = await fetch(`${API_BASE_URL}/api/coach-roster?year=2025&month=8&userType=supervisor`, {
            method: 'GET',
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                'Content-Type': 'application/json'
            }
        });
        
        if (rosterAllResponse.ok) {
            const rosterAllData = await rosterAllResponse.json();
            console.log('✅ 全部更表數據獲取成功');
            console.log('📋 全部更表記錄:', rosterAllData.records);
            
            // 分析phone字段
            const phoneAnalysis = {};
            rosterAllData.records.forEach(record => {
                const name = record.name;
                const phone = record.phone;
                if (!phoneAnalysis[name]) {
                    phoneAnalysis[name] = [];
                }
                if (!phoneAnalysis[name].includes(phone)) {
                    phoneAnalysis[name].push(phone);
                }
            });
            
            console.log('📊 Phone字段分析:', phoneAnalysis);
        }
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 運行測試
testCoachPhoneFix(); 