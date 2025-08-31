// 調試教練工時數據獲取
console.log('🔍 開始調試教練工時數據獲取...');

async function debugWorkHoursData() {
    try {
        console.log('🔄 步驟1: 檢查用戶類型和登錄狀態');
        const userType = localStorage.getItem('current_user_type') || 'coach';
        const userPhone = localStorage.getItem('current_user_phone') || '';
        console.log('用戶類型:', userType);
        console.log('用戶電話:', userPhone);
        
        console.log('🔄 步驟2: 檢查databaseConnector狀態');
        if (window.databaseConnector) {
            console.log('✅ databaseConnector存在');
            console.log('連接狀態:', window.databaseConnector.connectionStatus);
        } else {
            console.log('❌ databaseConnector不存在');
            return;
        }
        
        console.log('🔄 步驟3: 獲取8月份教練工時數據');
        const month = 8; // 當前選中的月份
        const year = new Date().getFullYear();
        
        let workHoursList = [];
        if (userType === 'supervisor') {
            console.log('👑 主管模式：獲取所有教練工時數據');
            workHoursList = await window.databaseConnector.fetchCoachWorkHours('', year, month, '', '');
        } else {
            console.log('👤 教練模式：獲取個人工時數據');
            workHoursList = await window.databaseConnector.fetchCoachWorkHours(userPhone, year, month, '', '');
        }
        
        console.log('📋 原始工時數據:', workHoursList);
        console.log('📊 數據類型:', typeof workHoursList);
        console.log('📊 是否為數組:', Array.isArray(workHoursList));
        console.log('📊 數據長度:', workHoursList ? workHoursList.length : 0);
        
        if (!Array.isArray(workHoursList)) {
            console.log('⚠️ 數據不是數組，嘗試提取records字段');
            if (workHoursList && workHoursList.records && Array.isArray(workHoursList.records)) {
                workHoursList = workHoursList.records;
                console.log('✅ 成功提取records字段，長度:', workHoursList.length);
            } else {
                console.log('❌ 無法提取有效的工時數據');
                return;
            }
        }
        
        console.log('🔄 步驟4: 分析工時數據結構');
        const coachMap = new Map();
        const locationMap = new Map();
        const dateMap = new Map();
        const hoursMap = new Map();
        
        workHoursList.forEach((item, index) => {
            console.log(`📋 條目 ${index}:`, item);
            
            const dateStr = item?.date || item?.workDate || item?.day || item?.work_date;
            const hours = item?.hours || item?.totalHours || item?.hour || item?.work_hours || 0;
            const location = item?.location || item?.place || '';
            const club = item?.club || item?.work_club || '';
            const coachPhone = item?.phone || item?.coachPhone || '';
            const coachName = item?.name || item?.studentName || item?.coachName || `教練_${coachPhone || '未知'}`;
            
            // 統計教練
            if (coachName) {
                coachMap.set(coachName, (coachMap.get(coachName) || 0) + 1);
            }
            
            // 統計地點
            if (location) {
                locationMap.set(location, (locationMap.get(location) || 0) + 1);
            }
            
            // 統計日期
            if (dateStr) {
                const d = new Date(dateStr);
                if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth() + 1) === month) {
                    const day = d.getDate();
                    dateMap.set(day, (dateMap.get(day) || 0) + 1);
                }
            }
            
            // 統計工時
            const hoursNum = Number(hours) || 0;
            if (hoursNum > 0) {
                hoursMap.set(coachName, (hoursMap.get(coachName) || 0) + hoursNum);
            }
        });
        
        console.log('👥 教練統計:', Object.fromEntries(coachMap));
        console.log('📍 地點統計:', Object.fromEntries(locationMap));
        console.log('📅 日期統計:', Object.fromEntries(dateMap));
        console.log('⏰ 工時統計:', Object.fromEntries(hoursMap));
        
        console.log('🔄 步驟5: 檢查當前地點數據');
        if (typeof locations !== 'undefined' && Array.isArray(locations)) {
            console.log('✅ 地點數據已加載:', locations);
        } else {
            console.log('❌ 地點數據未加載');
            console.log('嘗試重新加載地點數據...');
            try {
                const newLocations = await window.databaseConnector.fetchLocations();
                console.log('🔄 重新加載的地點數據:', newLocations);
            } catch (error) {
                console.error('❌ 重新加載地點數據失敗:', error);
            }
        }
        
        console.log('🔄 步驟6: 檢查教練帳號數據');
        try {
            const coaches = await window.databaseConnector.fetchCoaches();
            console.log('👥 教練帳號數據:', coaches);
            console.log('📊 教練帳號數量:', coaches ? coaches.length : 0);
        } catch (error) {
            console.error('❌ 獲取教練帳號數據失敗:', error);
        }
        
    } catch (error) {
        console.error('❌ 調試失敗:', error);
    }
}

// 等待頁面加載完成後執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', debugWorkHoursData);
} else {
    debugWorkHoursData();
}

// 導出函數供手動調用
window.debugWorkHoursData = debugWorkHoursData; 