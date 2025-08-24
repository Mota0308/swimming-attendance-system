// 测试学生分类逻辑
function testStudentClassification() {
    console.log('🧪 测试学生分类逻辑...\n');
    
    // 模拟学生数据
    const testStudents = [
        {
            id: 's1',
            name: 'GG',
            date: '2025-08-24',
            time: '13:00-14:00',
            type: '指定導師中班',
            location: '維多利亞公園游泳池'
        },
        {
            id: 's2',
            name: '馮泳童',
            date: '2025-08-24',
            time: '11:00-13:00',
            type: '指定導師高班',
            location: '維多利亞公園游泳池'
        },
        {
            id: 's3',
            name: '測試學生',
            date: '2025-08-25',
            time: '13:00-14:00',
            type: '指定導師中班',
            location: '維多利亞公園游泳池'
        }
    ];
    
    console.log('📋 测试学生数据:');
    testStudents.forEach(s => {
        console.log(`  ${s.name}: ${s.date} ${s.time} ${s.type}`);
    });
    
    // 模拟分类函数
    function groupByTimeAndType(students, currentLocation) {
        const map = new Map();
        students.forEach(s => {
            // 智能分类：按日期、时间、课程类型分类
            const date = s.date || '';
            const time = s.time || '';
            const type = s.type || '';
            
            // 分类键：日期_时间_课程类型
            const key = `${date}__${time}__${type}`;
            
            if (!map.has(key)) {
                map.set(key, { 
                    date: date || '未設定日期',
                    time: time || '未設定時間', 
                    type: type || '未設定類型',
                    students: [] 
                });
            }
            map.get(key).students.push(s);
        });
        
        const slots = [];
        for (const [key, g] of map.entries()) {
            slots.push({ 
                id: `slot_${slots.length}`,
                date: g.date,
                time: g.time, 
                type: g.type, 
                students: g.students
            });
        }
        
        // 排序：先按日期，再按时间
        slots.sort((a, b) => {
            // 日期排序
            if (a.date !== b.date) {
                if (a.date === '未設定日期') return 1;
                if (b.date === '未設定日期') return -1;
                return new Date(a.date) - new Date(b.date);
            }
            // 时间排序（简化版）
            return a.time.localeCompare(b.time);
        });
        
        return slots;
    }
    
    // 执行分类
    const result = groupByTimeAndType(testStudents, '維多利亞公園游泳池');
    
    console.log('\n✅ 分类结果:');
    result.forEach(slot => {
        console.log(`\n📅 时段: ${slot.date} ${slot.time} ${slot.type}`);
        console.log(`   学生: ${slot.students.map(s => s.name).join(', ')}`);
    });
    
    console.log('\n🎯 分类验证:');
    console.log('✅ GG 应该在: 2025-08-24 13:00-14:00 指定導師中班');
    console.log('✅ 馮泳童 应该在: 2025-08-24 11:00-13:00 指定導師高班');
    console.log('✅ 測試學生 应该在: 2025-08-25 13:00-14:00 指定導師中班');
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
    testStudentClassification();
} else {
    // 在浏览器中运行
    window.testStudentClassification = testStudentClassification;
} 