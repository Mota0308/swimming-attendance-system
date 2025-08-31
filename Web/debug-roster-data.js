// 調試更表數據獲取
console.log('🔍 開始調試更表數據獲取...');

async function debugRosterData() {
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
        
        console.log('🔄 步驟3: 獲取8月份更表數據');
        const month = 8; // 當前選中的月份
        const year = new Date().getFullYear();
        
        let rosterList = [];
        if (userType === 'supervisor') {
            console.log('👑 主管模式：獲取所有教練更表數據');
            rosterList = await window.databaseConnector.fetchRoster(month, '');
        } else {
            console.log('👤 教練模式：獲取個人更表數據');
            rosterList = await window.databaseConnector.fetchRoster(month, userPhone);
        }
        
        console.log('📋 原始更表數據:', rosterList);
        console.log('📊 數據類型:', typeof rosterList);
        console.log('📊 是否為數組:', Array.isArray(rosterList));
        console.log('📊 數據長度:', rosterList ? rosterList.length : 0);
        
        if (!Array.isArray(rosterList)) {
            console.log('⚠️ 數據不是數組，嘗試提取roster字段');
            if (rosterList && rosterList.roster && Array.isArray(rosterList.roster)) {
                rosterList = rosterList.roster;
                console.log('✅ 成功提取roster字段，長度:', rosterList.length);
            } else {
                console.log('❌ 無法提取有效的roster數據');
                return;
            }
        }
        
        console.log('🔄 步驟4: 分析更表數據結構');
        const coachMap = new Map();
        const locationMap = new Map();
        const dateMap = new Map();
        
        rosterList.forEach((item, index) => {
            console.log(`📋 條目 ${index}:`, item);
            
            const dateStr = item?.date || item?.rosterDate || item?.day;
            const time = item?.time || item?.timeRange || '';
            const location = item?.location || item?.place || '';
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
        });
        
        console.log('👥 教練統計:', Object.fromEntries(coachMap));
        console.log('📍 地點統計:', Object.fromEntries(locationMap));
        console.log('📅 日期統計:', Object.fromEntries(dateMap));
        
        console.log('🔄 步驟5: 檢查地點識別邏輯');
        const testLocations = ['九龍公園', '維園', '維多利亞公園', '荔枝角公園', '觀塘', '美孚', '堅尼地城'];
        testLocations.forEach(loc => {
            const result = extractLocationFromRoster(loc, '');
            console.log(`📍 測試地點 "${loc}":`, result);
        });
        
        console.log('🔄 步驟6: 檢查當前地點數據');
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
        
    } catch (error) {
        console.error('❌ 調試失敗:', error);
    }
}

// 等待頁面加載完成後執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', debugRosterData);
} else {
    debugRosterData();
}

// 導出函數供手動調用
window.debugRosterData = debugRosterData; 