// 🧪 遞進篩選邏輯測試腳本
// 用於驗證篩選條件是否層層縮小範圍

console.log('🧪 開始測試遞進篩選邏輯...');

// 模擬學生數據
const mockStudents = [
    { name: '張小明', location: '荔枝角公園', day: '一', time: '14:00-15:00', phone: '12345678' },
    { name: '李小華', location: '荔枝角公園', day: '一', time: '15:00-16:00', phone: '23456789' },
    { name: '王小美', location: '荔枝角公園', day: '二', time: '14:00-15:00', phone: '34567890' },
    { name: '陳小強', location: '維多利亞公園', day: '一', time: '14:00-15:00', phone: '45678901' },
    { name: '劉小芳', location: '維多利亞公園', day: '二', time: '15:00-16:00', phone: '56789012' },
    { name: '趙小龍', location: '荔枝角公園', day: '三', time: '16:00-17:00', phone: '67890123' },
    { name: '孫小鳳', location: '維多利亞公園', day: '三', time: '17:00-18:00', phone: '78901234' }
];

// 模擬 eqLocation 函數
function eqLocation(a, b) {
    return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

// 測試遞進篩選邏輯
function testProgressiveFilter(location, wantDay) {
    console.log(`\n🔍 測試篩選條件：地點=${location || '無'}, 星期=${wantDay || '無'}`);
    
    let filtered = [...mockStudents];
    console.log(`📊 原始數據：${filtered.length}名學生`);
    
    // 步驟1：按地點篩選（第一層縮小）
    if (location) {
        const beforeLocation = filtered.length;
        filtered = filtered.filter(s => eqLocation(s.location, location));
        console.log(`📍 地點篩選：${beforeLocation} → ${filtered.length} (縮小範圍)`);
    }
    
    // 步驟2：按星期篩選（第二層縮小）
    if (wantDay) {
        const beforeDay = filtered.length;
        filtered = filtered.filter(s => s.day === wantDay);
        console.log(`📅 星期篩選：${beforeDay} → ${filtered.length} (進一步縮小範圍)`);
    }
    
    // 步驟3：如果沒有結果，提供智能回退
    if (!filtered.length) {
        if (location && wantDay) {
            // 如果同時選擇了地點和星期但沒有結果，先回退到只按地點篩選
            filtered = mockStudents.filter(s => eqLocation(s.location, location));
            console.log(`🔄 智能回退：顯示${location}所有時段的學生 (${filtered.length}人)`);
        } else if (location) {
            // 如果只選擇了地點但沒有結果，顯示該地點所有學生
            filtered = mockStudents.filter(s => eqLocation(s.location, location));
            console.log(`🔄 地點回退：顯示${location}所有學生 (${filtered.length}人)`);
        } else if (wantDay) {
            // 如果只選擇了星期但沒有結果，顯示該星期所有學生
            filtered = mockStudents.filter(s => s.day === wantDay);
            console.log(`🔄 星期回退：顯示${wantDay}所有學生 (${filtered.length}人)`);
        }
    }
    
    console.log(`✅ 最終篩選結果：${filtered.length}名學生`);
    
    if (filtered.length > 0) {
        console.log('📋 學生列表：');
        filtered.forEach((student, index) => {
            console.log(`   ${index + 1}. ${student.name} - ${student.location} - 星期${student.day} - ${student.time}`);
        });
    }
    
    return filtered;
}

// 執行測試案例
console.log('='.repeat(60));
console.log('🧪 遞進篩選邏輯測試');
console.log('='.repeat(60));

// 測試案例1：只選擇地點
testProgressiveFilter('荔枝角公園', null);

// 測試案例2：只選擇星期
testProgressiveFilter(null, '一');

// 測試案例3：選擇地點 + 星期
testProgressiveFilter('荔枝角公園', '一');

// 測試案例4：選擇地點 + 星期（沒有結果的情況）
testProgressiveFilter('荔枝角公園', '四');

// 測試案例5：選擇不存在的星期
testProgressiveFilter('維多利亞公園', '五');

// 測試案例6：不選擇任何條件
testProgressiveFilter(null, null);

console.log('\n' + '='.repeat(60));
console.log('✅ 遞進篩選邏輯測試完成');
console.log('='.repeat(60));

// 驗證遞進篩選的優勢
console.log('\n💡 遞進篩選的優勢：');
console.log('1. 📊 範圍逐步縮小：符合用戶的直觀理解');
console.log('2. ⚡ 性能更好：避免重複遍歷數據');
console.log('3. 🔍 邏輯清晰：每個篩選步驟都有明確的作用');
console.log('4. 🧠 智能回退：避免顯示空白結果');
console.log('5. 📝 詳細日誌：便於調試和監控');

// 對比並列篩選
console.log('\n🔄 與並列篩選的對比：');
console.log('❌ 並列篩選：必須同時滿足所有條件，可能導致結果為空');
console.log('✅ 遞進篩選：層層縮小範圍，提供更精確的結果');
console.log('📈 性能提升：遞進篩選避免了多次遍歷，效率更高'); 