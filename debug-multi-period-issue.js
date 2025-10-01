console.log('🔍 调试多时段显示问题');
console.log('=====================================');

// 模拟数据处理过程
function simulateDataProcessing() {
    console.log('\n📋 模拟数据处理过程:');
    
    // 模拟教练数据
    const coachDailyData = new Map();
    const coachName = '張教練';
    const day = 1;
    
    // 模拟三个时段的数据
    const timeSlots = [
        { time: '上午 9:00-12:00', location: '堅城', period: 'morning' },
        { time: '下午 1:00-5:00', location: '中山', period: 'afternoon' },
        { time: '晚上 6:00-8:00', location: '維園', period: 'evening' }
    ];
    
    console.log('🔄 处理教练数据...');
    
    // 初始化教练数据
    if (!coachDailyData.has(coachName)) {
        coachDailyData.set(coachName, {
            name: coachName,
            dailyLocations: new Map(),
            dailySchedule: new Map()
        });
        console.log(`✅ 初始化教练: ${coachName}`);
    }
    
    const coachData = coachDailyData.get(coachName);
    
    // 处理每个时段
    timeSlots.forEach((slot, index) => {
        console.log(`\n📍 处理时段 ${index + 1}: ${slot.time} - ${slot.location}`);
        
        // 旧方法 - 会被覆盖
        console.log('❌ 旧方法 (会被覆盖):');
        console.log(`   设置前 dailyLocations.get(${day}):`, coachData.dailyLocations.get(day));
        // coachData.dailyLocations.set(day, slot.location); // 这会覆盖
        console.log(`   如果使用 set(${day}, "${slot.location}") 会覆盖之前的值`);
        
        // 新方法 - 数组累加
        console.log('✅ 新方法 (数组累加):');
        if (!coachData.dailyLocations.has(day)) {
            coachData.dailyLocations.set(day, []);
            console.log(`   初始化 dailyLocations[${day}] = []`);
        }
        const dayLocations = coachData.dailyLocations.get(day);
        if (!dayLocations.includes(slot.location)) {
            dayLocations.push(slot.location);
            console.log(`   添加地点: ${slot.location}`);
        }
        console.log(`   当前 dailyLocations[${day}]:`, dayLocations);
        
        // 详细时段安排
        if (!coachData.dailySchedule.has(day)) {
            coachData.dailySchedule.set(day, {
                morning: { location: '', time: '' },
                afternoon: { location: '', time: '' },
                evening: { location: '', time: '' }
            });
        }
        const daySchedule = coachData.dailySchedule.get(day);
        daySchedule[slot.period] = {
            location: slot.location,
            time: slot.time
        };
        console.log(`   设置 ${slot.period}: ${slot.location}`);
    });
    
    console.log('\n📊 最终结果:');
    console.log('dailyLocations:', coachData.dailyLocations.get(day));
    console.log('dailySchedule:', coachData.dailySchedule.get(day));
    
    return coachDailyData;
}

// 模拟显示逻辑
function simulateDisplayLogic(coachDailyData) {
    console.log('\n🖥️ 模拟显示逻辑:');
    
    const locationCoachSchedule = new Map();
    const allLocations = new Set();
    
    coachDailyData.forEach((coach, coachKey) => {
        const coachName = coach.name || coachKey || '教練';
        console.log(`\n👤 处理教练: ${coachName}`);
        
        // 优先使用详细时段安排数据
        if (coach.dailySchedule) {
            console.log('✅ 使用 dailySchedule 数据');
            coach.dailySchedule.forEach((daySchedule, day) => {
                console.log(`   处理第 ${day} 天:`, daySchedule);
                ['morning', 'afternoon', 'evening'].forEach(period => {
                    const periodData = daySchedule[period];
                    if (periodData && periodData.location) {
                        const location = periodData.location;
                        allLocations.add(location);
                        
                        console.log(`     ${period}: ${location}`);
                        
                        // 初始化地点数据结构
                        if (!locationCoachSchedule.has(location)) {
                            locationCoachSchedule.set(location, new Map());
                        }
                        const locationSchedule = locationCoachSchedule.get(location);
                        
                        if (!locationSchedule.has(day)) {
                            locationSchedule.set(day, {
                                morning: [],
                                afternoon: [],
                                evening: []
                            });
                        }
                        
                        const dayScheduleForLocation = locationSchedule.get(day);
                        if (!dayScheduleForLocation[period].includes(coachName)) {
                            dayScheduleForLocation[period].push(coachName);
                        }
                    }
                });
            });
        }
    });
    
    console.log('\n📋 显示结果:');
    console.log('所有地点:', Array.from(allLocations));
    console.log('地点教练安排:');
    locationCoachSchedule.forEach((schedule, location) => {
        console.log(`  ${location}:`);
        schedule.forEach((daySchedule, day) => {
            console.log(`    第${day}天:`, daySchedule);
        });
    });
}

// 检查可能的问题
function checkPossibleIssues() {
    console.log('\n🔍 检查可能的问题:');
    
    console.log('1. 浏览器缓存问题:');
    console.log('   - 检查 script.js 版本号是否更新');
    console.log('   - 强制刷新浏览器 (Ctrl+F5)');
    
    console.log('\n2. 数据保存问题:');
    console.log('   - 检查保存时是否正确发送三个时段数据');
    console.log('   - 检查后端API是否正确处理多时段数据');
    
    console.log('\n3. 数据读取问题:');
    console.log('   - 检查从数据库读取的数据格式');
    console.log('   - 检查时段解析逻辑是否正确');
    
    console.log('\n4. 显示逻辑问题:');
    console.log('   - 检查 dailySchedule 是否有数据');
    console.log('   - 检查 locationCoachSchedule 构建是否正确');
}

// 运行调试
console.log('🚀 开始调试...');
const mockData = simulateDataProcessing();
simulateDisplayLogic(mockData);
checkPossibleIssues();

console.log('\n✅ 调试完成');
console.log('请检查以上输出，确认数据处理逻辑是否正确'); 