// 网页应用专用API端点
// 这个文件包含为网页应用设计的API端点

const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();

// 网页应用健康检查端点
router.get('/health', async (req, res) => {
    try {
        console.log('🌐 网页应用健康检查请求');
        res.json({
            success: true,
            message: '网页应用API服务正常',
            timestamp: new Date().toISOString(),
            service: 'Web Application API',
            version: '1.0.0',
            features: [
                'locations',
                'clubs', 
                'students',
                'attendance',
                'work-hours',
                'roster'
            ]
        });
    } catch (error) {
        console.error('❌ 网页应用健康检查错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 获取地点数据 - 网页应用专用
router.get('/locations', async (req, res) => {
    try {
        console.log('🌐 网页应用请求地点数据');
        
        // 这里可以连接到MongoDB获取实际数据
        // 暂时返回模拟数据
        const locations = [
            '維多利亞公園游泳池',
            '荔枝角公園游泳池', 
            '觀塘游泳池',
            '深水埗公園游泳池',
            '黃大仙游泳池'
        ];
        
        res.json({
            success: true,
            locations: locations,
            count: locations.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 获取地点数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取地点数据失败',
            error: error.message
        });
    }
});

// 获取泳会数据 - 网页应用专用
router.get('/clubs', async (req, res) => {
    try {
        console.log('🌐 网页应用请求泳会数据');
        
        // 这里可以连接到MongoDB获取实际数据
        // 暂时返回模拟数据
        const clubs = [
            '維多利亞泳會',
            '荔枝角泳會',
            '觀塘泳會',
            '深水埗泳會',
            '黃大仙泳會'
        ];
        
        res.json({
            success: true,
            clubs: clubs,
            count: clubs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 获取泳会数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取泳会数据失败',
            error: error.message
        });
    }
});

// 获取学生数据 - 网页应用专用
router.get('/students', async (req, res) => {
    try {
        console.log('🌐 网页应用请求学生数据');
        
        const { location, club } = req.query;
        console.log(`查询参数: 地点=${location}, 泳会=${club}`);
        
        // 这里可以连接到MongoDB获取实际数据
        // 暂时返回模拟数据
        const students = [
            { id: 1, name: '張小明', location: '維多利亞公園游泳池', club: '維多利亞泳會' },
            { id: 2, name: '李小華', location: '荔枝角公園游泳池', club: '荔枝角泳會' },
            { id: 3, name: '王小美', location: '觀塘游泳池', club: '觀塘泳會' }
        ];
        
        // 根据查询参数过滤数据
        let filteredStudents = students;
        if (location) {
            filteredStudents = filteredStudents.filter(s => s.location === location);
        }
        if (club) {
            filteredStudents = filteredStudents.filter(s => s.club === club);
        }
        
        res.json({
            success: true,
            students: filteredStudents,
            count: filteredStudents.length,
            filters: { location, club },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 获取学生数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取学生数据失败',
            error: error.message
        });
    }
});

// 获取出席记录 - 网页应用专用
router.get('/attendance', async (req, res) => {
    try {
        console.log('🌐 网页应用请求出席记录');
        
        const { month, location, club } = req.query;
        console.log(`查询参数: 月份=${month}, 地点=${location}, 泳会=${club}`);
        
        // 这里可以连接到MongoDB获取实际数据
        // 暂时返回模拟数据
        const attendance = [
            { 
                id: 1, 
                studentName: '張小明', 
                status: '出席', 
                date: '2025-08-21',
                location: '維多利亞公園游泳池',
                club: '維多利亞泳會'
            },
            { 
                id: 2, 
                studentName: '李小華', 
                status: '缺席', 
                date: '2025-08-21',
                location: '荔枝角公園游泳池',
                club: '荔枝角泳會'
            },
            { 
                id: 3, 
                studentName: '王小美', 
                status: '出席', 
                date: '2025-08-21',
                location: '觀塘游泳池',
                club: '觀塘泳會'
            }
        ];
        
        // 根据查询参数过滤数据
        let filteredAttendance = attendance;
        if (month) {
            // 这里可以添加月份过滤逻辑
        }
        if (location) {
            filteredAttendance = filteredAttendance.filter(a => a.location === location);
        }
        if (club) {
            filteredAttendance = filteredAttendance.filter(a => a.club === club);
        }
        
        res.json({
            success: true,
            attendance: filteredAttendance,
            count: filteredAttendance.length,
            filters: { month, location, club },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 获取出席记录错误:', error);
        res.status(500).json({
            success: false,
            message: '获取出席记录失败',
            error: error.message
        });
    }
});

// 获取工时数据 - 网页应用专用
router.get('/work-hours', async (req, res) => {
    try {
        console.log('🌐 网页应用请求工时数据');
        
        const { month } = req.query;
        console.log(`查询参数: 月份=${month}`);
        
        // 这里可以连接到MongoDB获取实际数据
        // 暂时返回模拟数据
        const workHours = {
            totalDays: 22,
            totalHours: 176,
            averageHours: 8,
            dailyRecords: [
                { date: '2025-08-01', hours: 8, location: '維多利亞公園游泳池' },
                { date: '2025-08-02', hours: 8, location: '荔枝角公園游泳池' },
                { date: '2025-08-03', hours: 6, location: '觀塘游泳池' }
            ]
        };
        
        res.json({
            success: true,
            workHours: workHours,
            month: month,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 获取工时数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取工时数据失败',
            error: error.message
        });
    }
});

// 获取更表数据 - 网页应用专用
router.get('/roster', async (req, res) => {
    try {
        console.log('🌐 网页应用请求更表数据');
        
        const { month } = req.query;
        console.log(`查询参数: 月份=${month}`);
        
        // 这里可以连接到MongoDB获取实际数据
        // 暂时返回模拟数据
        const roster = {
            month: month,
            totalShifts: 22,
            shifts: [
                { date: '2025-08-01', time: '09:00-17:00', location: '維多利亞公園游泳池' },
                { date: '2025-08-02', time: '09:00-17:00', location: '荔枝角公園游泳池' },
                { date: '2025-08-03', time: '09:00-15:00', location: '觀塘游泳池' }
            ]
        };
        
        res.json({
            success: true,
            roster: roster,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 获取更表数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取更表数据失败',
            error: error.message
        });
    }
});

// 网页应用登录端点
router.post('/auth/login', async (req, res) => {
    try {
        console.log('🌐 网页应用登录请求');
        
        const { phone, password, userType } = req.body;
        console.log(`登录参数: 电话=${phone}, 用户类型=${userType}`);
        
        // 这里可以连接到MongoDB验证用户
        // 暂时返回模拟登录结果
        if (phone && password) {
            res.json({
                success: true,
                message: '登录成功',
                user: {
                    phone: phone,
                    userType: userType,
                    loginTime: new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                message: '电话和密码不能为空'
            });
        }
    } catch (error) {
        console.error('❌ 网页应用登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败',
            error: error.message
        });
    }
});

// 网页应用统计信息端点
router.get('/stats', async (req, res) => {
    try {
        console.log('🌐 网页应用请求统计信息');
        
        // 返回系统统计信息
        const stats = {
            totalStudents: 150,
            totalCoaches: 12,
            totalLocations: 5,
            totalClubs: 5,
            activeSessions: 25,
            lastUpdate: new Date().toISOString()
        };
        
        res.json({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 获取统计信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取统计信息失败',
            error: error.message
        });
    }
});

module.exports = router; 