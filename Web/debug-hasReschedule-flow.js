// 调试 hasReschedule 字段的数据流
console.log('🔍 开始调试 hasReschedule 字段的数据流...');

// 检查数据库连接器
function checkDatabaseConnector() {
    console.log('📊 检查数据库连接器状态:');
    if (typeof databaseConnector !== 'undefined') {
        console.log('✅ databaseConnector 已加载');
        console.log('🔗 连接状态:', databaseConnector.connectionStatus);
        console.log('🌐 API配置:', databaseConnector.apiConfig);
    } else {
        console.log('❌ databaseConnector 未加载');
    }
}

// 检查学生数据
async function checkStudentData() {
    console.log('📋 检查学生数据...');
    
    if (typeof databaseConnector === 'undefined') {
        console.log('❌ databaseConnector 未加载，无法检查数据');
        return;
    }
    
    try {
        // 获取学生原始数据
        const students = await databaseConnector.fetchStudentsRaw();
        console.log('📊 从数据库获取的学生数据总数:', students.length);
        
        // 查找"富豐瞳"的数据
        const fuFengTong = students.filter(s => s.name === '富豐瞳');
        console.log('🔍 找到"富豐瞳"的记录数:', fuFengTong.length);
        
        if (fuFengTong.length > 0) {
            fuFengTong.forEach((student, index) => {
                console.log(`📝 "富豐瞳" 记录 ${index + 1}:`, {
                    name: student.name,
                    date: student.date || student.上課,
                    hasReschedule: student.hasReschedule,
                    hasBalloonMark: student.hasBalloonMark,
                    hasStarMark: student.hasStarMark,
                    phone: student.phone || student.Phone_number,
                    location: student.location,
                    time: student.time
                });
            });
        }
        
        // 检查所有包含 hasReschedule 的记录
        const hasRescheduleStudents = students.filter(s => s.hasReschedule === true);
        console.log('🔁 包含 hasReschedule: true 的学生总数:', hasRescheduleStudents.length);
        
        if (hasRescheduleStudents.length > 0) {
            console.log('📋 hasReschedule: true 的学生列表:');
            hasRescheduleStudents.forEach((student, index) => {
                console.log(`  ${index + 1}. ${student.name} - ${student.date || student.上課} - 电话: ${student.phone || student.Phone_number}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 检查学生数据失败:', error);
    }
}

// 检查课程编排系统
function checkSchedulerSystem() {
    console.log('📅 检查课程编排系统...');
    
    if (typeof window.initSchedulerLight === 'function') {
        console.log('✅ scheduler-light.js 已加载');
    } else {
        console.log('❌ scheduler-light.js 未加载');
    }
    
    // 检查是否有课程编排容器
    const schedulerContainer = document.getElementById('schedulerContainer');
    if (schedulerContainer) {
        console.log('✅ 找到课程编排容器');
        console.log('📊 容器内容:', schedulerContainer.innerHTML);
    } else {
        console.log('❌ 未找到课程编排容器');
    }
}

// 检查本地存储
function checkLocalStorage() {
    console.log('💾 检查本地存储...');
    
    const scheduleData = localStorage.getItem('scheduleData');
    if (scheduleData) {
        try {
            const parsed = JSON.parse(scheduleData);
            console.log('📊 本地存储的课程编排数据:', parsed);
            
            // 检查学生数据
            if (parsed.timeSlots) {
                parsed.timeSlots.forEach((slot, slotIndex) => {
                    if (slot.students && slot.students.length > 0) {
                        console.log(`📅 时段 ${slotIndex + 1} (${slot.time}) 的学生:`);
                        slot.students.forEach((student, studentIndex) => {
                            console.log(`  ${studentIndex + 1}. ${student.name} - hasReschedule: ${student.hasReschedule}`);
                        });
                    }
                });
            }
        } catch (error) {
            console.error('❌ 解析本地存储数据失败:', error);
        }
    } else {
        console.log('❌ 本地存储中没有课程编排数据');
    }
}

// 主函数
async function debugHasRescheduleFlow() {
    console.log('🚀 开始调试 hasReschedule 字段的数据流...');
    
    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runDebug);
    } else {
        runDebug();
    }
}

async function runDebug() {
    console.log('📱 页面已加载，开始调试...');
    
    // 等待数据库连接器加载
    let attempts = 0;
    const maxAttempts = 10;
    
    const waitForDatabaseConnector = async () => {
        if (typeof databaseConnector !== 'undefined') {
            console.log('✅ 数据库连接器已就绪');
            await checkStudentData();
            checkSchedulerSystem();
            checkLocalStorage();
        } else if (attempts < maxAttempts) {
            attempts++;
            console.log(`⏳ 等待数据库连接器加载... (${attempts}/${maxAttempts})`);
            setTimeout(waitForDatabaseConnector, 1000);
        } else {
            console.log('❌ 数据库连接器加载超时');
            checkSchedulerSystem();
            checkLocalStorage();
        }
    };
    
    await waitForDatabaseConnector();
}

// 立即运行调试
debugHasRescheduleFlow();

// 暴露到全局，方便在控制台调用
window.debugHasRescheduleFlow = debugHasRescheduleFlow;
window.checkStudentData = checkStudentData;
window.checkSchedulerSystem = checkSchedulerSystem;
window.checkLocalStorage = checkLocalStorage; 