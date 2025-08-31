// 測試 hasReschedule 字段的數據流
console.log('🧪 開始測試 hasReschedule 字段的數據流...');

// 測試函數：檢查學生數據中的 hasReschedule 字段
async function testHasRescheduleData() {
    try {
        console.log('🔄 測試 1: 直接調用 /api/students API');
        const response = await fetch('/api/students', {
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const students = await response.json();
            console.log('📋 API 返回的原始學生數據:', students);
            
            // 檢查是否有 hasReschedule 字段
            const hasRescheduleStudents = students.filter(s => s.hasReschedule === true);
            console.log('🔁 包含 hasReschedule: true 的學生:', hasRescheduleStudents);
            
            // 檢查所有學生的字段
            students.forEach((student, index) => {
                console.log(`學生 ${index + 1}:`, {
                    name: student.name,
                    hasReschedule: student.hasReschedule,
                    hasBalloonMark: student.hasBalloonMark,
                    hasStarMark: student.hasStarMark,
                    date: student.date || student['上課日期'],
                    allFields: Object.keys(student)
                });
            });
        } else {
            console.error('❌ API 調用失敗:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
    
    try {
        console.log('🔄 測試 2: 檢查 databaseConnector');
        if (window.databaseConnector) {
            console.log('✅ databaseConnector 存在');
            console.log('📋 databaseConnector 方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.databaseConnector)));
            
            if (typeof window.databaseConnector.fetchStudents === 'function') {
                console.log('🔄 調用 databaseConnector.fetchStudents()');
                const students = await window.databaseConnector.fetchStudents();
                console.log('📋 databaseConnector 返回的學生數據:', students);
                
                // 檢查是否有 hasReschedule 字段
                const hasRescheduleStudents = students.filter(s => s.hasReschedule === true);
                console.log('🔁 databaseConnector 中 hasReschedule: true 的學生:', hasRescheduleStudents);
            } else {
                console.log('❌ databaseConnector.fetchStudents 不是函數');
            }
        } else {
            console.log('❌ databaseConnector 不存在');
        }
    } catch (error) {
        console.error('❌ databaseConnector 測試失敗:', error);
    }
    
    try {
        console.log('🔄 測試 3: 檢查 localStorage 中的 scheduleData');
        const scheduleData = localStorage.getItem('scheduleData');
        if (scheduleData) {
            const parsed = JSON.parse(scheduleData);
            console.log('📋 localStorage 中的 scheduleData:', parsed);
            
            if (parsed.timeSlots) {
                parsed.timeSlots.forEach((slot, slotIndex) => {
                    console.log(`時段 ${slotIndex + 1}:`, {
                        time: slot.time,
                        date: slot.date,
                        students: slot.students?.map(s => ({
                            name: s.name,
                            hasReschedule: s.hasReschedule,
                            hasBalloonMark: s.hasBalloonMark,
                            hasStarMark: s.hasStarMark
                        }))
                    });
                });
            }
        } else {
            console.log('❌ localStorage 中沒有 scheduleData');
        }
    } catch (error) {
        console.error('❌ localStorage 測試失敗:', error);
    }
}

// 等待頁面加載完成後執行測試
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testHasRescheduleData);
} else {
    testHasRescheduleData();
}

// 導出測試函數供手動調用
window.testHasRescheduleData = testHasRescheduleData; 