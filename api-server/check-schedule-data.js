import fetch from 'node-fetch';

const API_BASE = 'https://swiming-production.up.railway.app';
const API_PUBLIC_KEY = 'ttdrcccy';
const API_PRIVATE_KEY = '2b207365-cbf0-4e42-a3bf-f932c84557c4';

async function checkScheduleData() {
    console.log('🔍 檢查已保存的課程編排數據...\n');

    try {
        // 查詢所有課程編排數據
        const response = await fetch(`${API_BASE}/api/schedule/data?limit=10`, {
            method: 'GET',
            headers: {
                'X-API-Public-Key': API_PUBLIC_KEY,
                'X-API-Private-Key': API_PRIVATE_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`查詢失敗: HTTP ${response.status}`);
        }

        const result = await response.json();
        
        console.log(`📊 數據庫統計:`);
        console.log(`   - 總記錄數: ${result.count}`);
        console.log(`   - 數據庫: test`);
        console.log(`   - 集合: schedule_data`);
        console.log(`   - MongoDB URI: cluster0.0dhi0qc.mongodb.net\n`);

        if (result.data && result.data.length > 0) {
            console.log('📋 最新記錄詳情:');
            result.data.forEach((record, index) => {
                console.log(`\n${index + 1}. 記錄 ID: ${record._id}`);
                console.log(`   教練電話: ${record.coachPhone}`);
                console.log(`   時段數量: ${record.timeSlots.length}`);
                console.log(`   創建時間: ${record.createdAt}`);
                console.log(`   來源: ${record.source}`);
                console.log(`   端點: ${record.endpoint}`);
                
                if (record.timeSlots && record.timeSlots.length > 0) {
                    console.log(`   時段詳情:`);
                    record.timeSlots.forEach((slot, slotIndex) => {
                        console.log(`     ${slotIndex + 1}. ${slot.time} - ${slot.type}`);
                        if (slot.students && slot.students.length > 0) {
                            slot.students.forEach((student, studentIndex) => {
                                console.log(`       學生 ${studentIndex + 1}: ${student.name} (${student.phone})`);
                                console.log(`         option1: ${student.option1 || '未設置'}`);
                                console.log(`         option2: ${student.option2 || '未設置'}`);
                            });
                        }
                    });
                }
            });
        } else {
            console.log('❌ 沒有找到任何課程編排數據');
        }

    } catch (error) {
        console.error('❌ 檢查失敗:', error.message);
        
        if (error.message.includes('404')) {
            console.log('💡 提示: 請等待Railway部署完成後再檢查');
        }
    }
}

// 運行檢查
checkScheduleData(); 