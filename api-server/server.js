const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;
console.log(`🔧 服務器端口配置: ${PORT} (環境變量: ${process.env.PORT || '未設置'})`);

// 中間件
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// 禁用 ETag，並設置全域不快取，避免 304 導致舊資料
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// MongoDB 連接配置 - 支持環境變量
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';
const STUDENTS_COLLECTION = 'students';
const ACCOUNTS_COLLECTION = process.env.ACCOUNTS_COLLECTION || 'Coach_account';

// 服務器配置 - 支持環境變量
const SERVER_IP = process.env.SERVER_IP || '0.0.0.0';
const SERVER_URL = process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
    : process.env.SERVER_URL || `http://${SERVER_IP}:${PORT}`;

// API 密鑰驗證中間件
const validateApiKeys = (req, res, next) => {
    const publicKey = req.headers['x-api-public-key'];
    const privateKey = req.headers['x-api-private-key'];
    
    const expectedPublicKey = process.env.API_PUBLIC_KEY || 'ttdrcccy';
    const expectedPrivateKey = process.env.API_PRIVATE_KEY || '2b207365-cbf0-4e42-a3bf-f932c84557c4';
    
    if (publicKey !== expectedPublicKey || privateKey !== expectedPrivateKey) {
        console.log(`❌ API 密鑰驗證失敗 - IP: ${req.ip}`);
        return res.status(401).json({
            success: false,
            message: 'API 密鑰驗證失敗'
        });
    }
    
    console.log(`✅ API 密鑰驗證成功 - IP: ${req.ip}`);
    next();
};

// 請求日誌中間件
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// 健康檢查端點
app.get('/health', validateApiKeys, async (req, res) => {
    try {
        console.log('🧪 健康檢查請求');
        res.json({
            success: true,
            message: 'API 服務器運行正常',
            timestamp: new Date().toISOString(),
            server: SERVER_URL,
            database: 'MongoDB Atlas',
            version: '1.0.1', // 更新版本號
            clientIP: req.ip,
            deployment: 'Railway Production',
            features: ['admin-login', 'coach-management', 'work-hours', 'web-application']
        });
    } catch (error) {
        console.error('❌ 健康檢查錯誤:', error);
        res.status(500).json({
            success: false,
            message: '服務器錯誤',
            error: error.message
        });
    }
});

// 网页应用专用API端点
app.get('/api/health', async (req, res) => {
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

// 网页应用地点数据端点
app.get('/api/locations', async (req, res) => {
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

// 网页应用泳会数据端点
app.get('/api/clubs', async (req, res) => {
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

// 网页应用学生数据端点
app.get('/api/students', async (req, res) => {
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

// 网页应用出席记录端点
app.get('/api/attendance', async (req, res) => {
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

// 网页应用工时数据端点
app.get('/api/work-hours', async (req, res) => {
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

// 网页应用更表数据端点
app.get('/api/roster', async (req, res) => {
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
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🌐 网页应用登录请求');
        
        const { phone, password, userType } = req.body;
        console.log(`登录参数: 电话=${phone}, 用户类型=${userType}`);
        
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: '电话和密码不能为空'
            });
        }

        // 连接到MongoDB验证用户
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_account');
        
        // 查找用户
        const user = await collection.findOne({ 
            phone: phone,
            password: password
        });
        
        await client.close();
        
        if (user) {
            // 验证用户类型
            const expectedUserType = user.userType || user.type || 'coach';
            const requestedUserType = userType || 'coach';
            
            console.log(`用户验证成功: ${phone}, 数据库类型: ${expectedUserType}, 请求类型: ${requestedUserType}`);
            
            // 支持主管、教练、管理员登录
            if (['supervisor', 'coach', 'admin'].includes(expectedUserType)) {
                res.json({
                    success: true,
                    message: '登录成功',
                    user: {
                        phone: user.phone,
                        userType: expectedUserType,
                        name: user.name || '',
                        email: user.email || '',
                        role: user.role || expectedUserType,
                        type: user.type || expectedUserType,
                        loginTime: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(403).json({
                    success: false,
                    message: '用户类型不支持'
                });
            }
        } else {
            res.status(401).json({
                success: false,
                message: '用户名或密码错误'
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

// 獲取所有學生資料
app.get('/students', validateApiKeys, async (req, res) => {
    try {
        console.log('📥 獲取學生資料請求');
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        const students = await collection.find({}).toArray();
        
        await client.close();
        
        console.log(`✅ 成功獲取 ${students.length} 條學生資料`);
        res.json(students);
    } catch (error) {
        console.error('❌ 獲取學生資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取學生資料失敗',
            error: error.message
        });
    }
});

// 根據用戶電話號碼獲取匹配的學生資料
app.get('/students/user/:phone', validateApiKeys, async (req, res) => {
    try {
        const userPhone = req.params.phone;
        console.log(`📥 獲取用戶學生資料請求 - 電話: ${userPhone}`);
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        // 查找與用戶電話號碼匹配的學生資料
        const students = await collection.find({ Phone_number: userPhone }).toArray();
        
        await client.close();
        
        console.log(`✅ 成功獲取用戶 ${userPhone} 的 ${students.length} 條學生資料`);
        res.json({
            success: true,
            message: `成功獲取 ${students.length} 條學生資料`,
            students: students
        });
    } catch (error) {
        console.error('❌ 獲取用戶學生資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取用戶學生資料失敗',
            error: error.message
        });
    }
});

// 批量上傳學生資料
app.post('/students/batch', validateApiKeys, async (req, res) => {
    try {
        const students = req.body;
        console.log(`📤 批量上傳請求 - ${students.length} 條學生資料`);
        
        if (!Array.isArray(students)) {
            return res.status(400).json({
                success: false,
                message: '請求體必須是學生資料數組'
            });
        }
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        // 批量插入學生資料
        const result = await collection.insertMany(students);
        
        await client.close();
        
        console.log(`✅ 成功上傳 ${result.insertedCount} 條學生資料`);
        res.json({
            success: true,
            message: `成功上傳 ${result.insertedCount} 條學生資料`,
            insertedCount: result.insertedCount,
            insertedIds: result.insertedIds
        });
    } catch (error) {
        console.error('❌ 上傳學生資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '上傳學生資料失敗',
            error: error.message
        });
    }
});

// 簡化測試登入端點（不依賴數據庫）
app.post('/auth/test-login', validateApiKeys, async (req, res) => {
    try {
        const { phone, password, userType } = req.body;
        console.log(`🧪 測試登入請求 - 電話: ${phone}, 用戶類型: ${userType}`);
        
        // 測試用戶列表
        const testUsers = [
            { phone: 'test', password: '123456' },
            { phone: '0912345678', password: '123456' },
            { phone: 'admin', password: 'admin123' },
            { phone: 'demo', password: 'demo123' }
        ];
        
        // 檢查是否為測試用戶
        const isValidUser = testUsers.some(user => 
            user.phone === phone && user.password === password
        );
        
        if (isValidUser) {
            console.log(`✅ 測試用戶登入成功 - ${phone}`);
            res.json({
                success: true,
                message: '登入成功（測試模式）',
                user: {
                    id: 'test-user-id',
                    phone: phone,
                    userType: userType || 'parent',
                    studentName: '測試用戶'
                }
            });
        } else {
            console.log(`❌ 測試用戶登入失敗 - ${phone}`);
            res.status(401).json({
                success: false,
                message: '電話號碼或密碼錯誤'
            });
        }
    } catch (error) {
        console.error('❌ 測試登入錯誤:', error);
        res.status(500).json({
            success: false,
            message: '登入失敗',
            error: error.message
        });
    }
});

// 用戶登入驗證
app.post('/auth/login', validateApiKeys, async (req, res) => {
    try {
        const { phone, password, userType } = req.body;
        console.log(`🔐 用戶登入請求 - 電話: ${phone}, 用戶類型: ${userType}`);
        
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: '電話號碼和密碼不能為空'
            });
        }
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        
        // 根據用戶類型選擇不同的集合
        let collection;
        let phoneField;
        if (userType === 'coach' || userType === 'supervisor') {
            collection = db.collection('Coach_account');
            phoneField = 'phone';
        } else if (userType === 'admin') {
            collection = db.collection('Administrator');
            phoneField = 'phone';
        } else {
            collection = db.collection(ACCOUNTS_COLLECTION);
            phoneField = 'studentPhone'; // Student_account 集合使用 studentPhone 字段
        }
        
        // 查找用戶（使用電話號碼作為賬號）
        const user = await collection.findOne({
            [phoneField]: phone,
            password: password
        });
        
        await client.close();
        
        if (user) {
            console.log(`✅ 用戶登入成功 - ${phone}, 類型: ${user.userType || userType}`);
            res.json({
                success: true,
                message: '登入成功',
                user: {
                    id: user._id,
                    phone: user.phone,
                    userType: user.userType || userType || 'parent',
                    studentName: user.studentName || ''
                }
            });
        } else {
            console.log(`❌ 用戶登入失敗 - ${phone}`);
            res.status(401).json({
                success: false,
                message: '電話號碼或密碼錯誤'
            });
        }
    } catch (error) {
        console.error('❌ 用戶登入錯誤:', error);
        res.status(500).json({
            success: false,
            message: '登入失敗',
            error: error.message
        });
    }
});

// 教練註冊
app.post('/auth/register-coach', validateApiKeys, async (req, res) => {
    try {
        const { phone, password, userType, studentName, location, club, createdAt } = req.body;
        console.log(`📝 教練註冊請求 - 電話: ${phone}, 教練名: ${studentName}, 地點: ${location}, 泳會: ${club}`);
        
        if (!phone || !password || !studentName) {
            return res.status(400).json({
                success: false,
                message: '電話號碼、密碼和教練名不能為空'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密碼至少需要6位數'
            });
        }
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_account'); // 使用Coach_account集合
        
        // 檢查電話號碼是否已存在
        const existingUser = await collection.findOne({ phone: phone });
        
        if (existingUser) {
            await client.close();
            console.log(`❌ 教練電話號碼已存在 - ${phone}`);
            return res.status(409).json({
                success: false,
                message: '該電話號碼已被註冊'
            });
        }
        
        // 創建新教練用戶
        const newUser = {
            phone: phone,
            studentPhone: phone, // 添加studentPhone字段以匹配數據庫索引
            password: password,
            userType: userType || 'coach',
            studentName: studentName, // 這裡實際是教練名
            location: location || '',
            club: club || '',
            createdAt: createdAt || Date.now(),
            createdDate: new Date().toISOString()
        };
        
        const result = await collection.insertOne(newUser);
        
        await client.close();
        
        console.log(`✅ 教練註冊成功 - ${phone}, 教練名: ${studentName}, 地點: ${location}, 泳會: ${club}`);
        res.status(201).json({
            success: true,
            message: '教練註冊成功',
            userId: result.insertedId
        });
        
    } catch (error) {
        console.error('❌ 教練註冊錯誤:', error);
        res.status(500).json({
            success: false,
            message: '註冊失敗',
            error: error.message
        });
    }
});

// 新增：獲取教練列表或單個教練信息
app.get('/coaches', validateApiKeys, async (req, res) => {
    try {
        const phone = req.query.phone;
        const club = req.query.club;
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_account');

        console.log(`🔍 請求查詢參數:`, req.query);
        console.log(`🔍 phone參數值: ${phone}, club參數值: ${club}`);
        
        if (phone) {
            // 查詢單個教練
            console.log(`🔍 查詢教練電話: ${phone}`);
            const coach = await collection.findOne(
                { phone: phone }, 
                { projection: { phone: 1, studentName: 1, location: 1, club: 1, _id: 0 } }
            );
            console.log(`📋 查詢結果:`, coach);
            await client.close();
            
            if (coach) {
                res.json({ success: true, coach });
            } else {
                res.status(404).json({ success: false, message: '教練不存在' });
            }
        } else {
            // 構建查詢條件
            const query = {};
            if (club) {
                query.club = club;
            }
            
            // 獲取教練列表
            const coaches = await collection.find(query, { 
                projection: { phone: 1, studentName: 1, location: 1, club: 1, _id: 0 } 
            }).toArray();
            await client.close();
            res.json({ success: true, coaches });
        }
    } catch (error) {
        console.error('❌ 獲取教練信息錯誤:', error);
        res.status(500).json({ success: false, message: '獲取教練信息失敗', error: error.message });
    }
});

// 新增：批量上傳教練工時
app.post('/coach-work-hours/batch', validateApiKeys, async (req, res) => {
    try {
        const { date, entries, location, club } = req.body;
        if (!date || !Array.isArray(entries)) {
            return res.status(400).json({ success: false, message: '參數錯誤，需提供 date 與 entries 數組' });
        }

        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');

        const ops = entries.map(e => {
            const entryLocation = e.location || location || '';
            const entryClub = e.club || club || '';
            const timeSlots = Array.isArray(e.timeSlots) ? e.timeSlots : [];
            return ({
                updateOne: {
                    filter: { phone: e.phone, date, location: entryLocation, club: entryClub },
                    update: {
                        $set: {
                            phone: e.phone,
                            studentName: e.name || e.studentName || '',
                            date,
                            hours: Number(e.hours) || 0,
                            location: entryLocation,
                            club: entryClub,
                            timeSlots: timeSlots,
                            updatedAt: new Date()
                        }
                    },
                    upsert: true
                }
            });
        });

        if (ops.length > 0) await collection.bulkWrite(ops);
        await client.close();
        res.json({ success: true, message: '工時已保存', count: ops.length });
    } catch (error) {
        console.error('❌ 批量上傳教練工時錯誤:', error);
        res.status(500).json({ success: false, message: '上傳工時失敗', error: error.message });
    }
});

// 新增：按月份獲取教練工時
app.get('/coach-work-hours', validateApiKeys, async (req, res) => {
    try {
        const phone = req.query.phone;
        const year = parseInt(req.query.year, 10);
        const month = parseInt(req.query.month, 10);
        const location = req.query.location;
        const club = req.query.club;
        
        // 主管模式：允许不提供phone参数，获取所有教练数据
        const userType = req.query.userType;
        const isSupervisor = userType === 'supervisor';
        
        if (!phone && !isSupervisor) {
            return res.status(400).json({ success: false, message: '缺少必要參數 phone' });
        }
        
        console.log(`📊 獲取教練工時 - 電話: ${phone || '所有教練'}, 年份: ${year}, 月份: ${month}, 地點: ${location}, 泳會: ${club}, 用戶類型: ${userType}`);

        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');

        // 構建查詢條件
        const query = {};
        
        // 主管模式：不限制特定教练
        if (phone && phone.trim()) {
            query.phone = phone;
        }
        
        // 新的邏輯：靈活篩選
        if (year && month) {
            // 如果提供了年份和月份，添加日期範圍
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
            query.date = { $gte: startDate, $lte: endDate };
        }
        
        // 添加地點/泳會過濾（寬鬆匹配）
        if (location && location.trim() && location !== '全部地點') {
            try {
                const pattern = location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                query.location = { $regex: pattern, $options: 'i' };
            } catch (_) {
                query.location = location;
            }
        }
        if (club && club.trim() && club !== '全部泳會') {
            try {
                const patternClub = club.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                query.club = { $regex: patternClub, $options: 'i' };
            } catch (_) {
                query.club = club;
            }
        }

        // 如果是主管且未指定phone：先在 Coach_account 找 staff，再以 phone IN 查 Coach_work_hours
        if (isSupervisor && !phone) {
            try {
                const accounts = db.collection(ACCOUNTS_COLLECTION || 'Coach_account');
                const staffDocs = await accounts.find({ $or: [ { type: 'staff' }, { userType: 'coach' } ] }, { projection: { phone: 1, studentPhone: 1 } }).toArray();
                const staffPhones = Array.from(new Set((staffDocs || []).map(u => (u.phone || u.studentPhone || '').toString()).filter(Boolean)));
                if (staffPhones.length > 0) {
                    query.phone = { $in: staffPhones };
                } else {
                    await client.close();
                    return res.json({ success: true, records: [] });
                }
            } catch (e) {
                console.warn('⚠️ 獲取staff帳號失敗，放行所有教練', e.message);
            }
        }
        
        console.log(`📊 查詢條件:`, query);

        const list = await collection.find(query).sort({ date: 1 }).toArray();
        await client.close();
        
        console.log(`📊 找到 ${list.length} 條工時記錄`);
        res.json({ success: true, records: list });
    } catch (error) {
        console.error('❌ 獲取教練工時錯誤:', error);
        res.status(500).json({ success: false, message: '獲取工時失敗', error: error.message });
    }
});

// 獲取教練工時統計信息
app.get('/coach-work-hours-stats', validateApiKeys, async (req, res) => {
    try {
        const phone = req.query.phone;
        const year = parseInt(req.query.year, 10);
        const month = parseInt(req.query.month, 10);
        const location = req.query.location;
        const club = req.query.club;
        
        // 主管模式：允许不提供phone参数，获取所有教练数据
        const userType = req.query.userType;
        const isSupervisor = userType === 'supervisor';
        
        if (!phone && !isSupervisor) {
            return res.status(400).json({ success: false, message: '缺少必要參數 phone' });
        }
        
        console.log(`📊 獲取教練工時統計 - 電話: ${phone || '所有教練'}, 年份: ${year}, 月份: ${month}, 地點: ${location}, 泳會: ${club}, 用戶類型: ${userType}`);
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');

        // 構建查詢條件
        const query = {};
        
        // 主管模式：不限制特定教练
        if (phone && phone.trim()) {
            query.phone = phone;
        }
        
        // 新的邏輯：靈活篩選
        if (year && month) {
            // 如果提供了年份和月份，添加日期範圍
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
            query.date = { $gte: startDate, $lte: endDate };
        }
        
        // 添加地點過濾
        if (location && location.trim() && location !== '全部地點') {
            query.location = location;
        }
        
        // 添加泳會過濾
        if (club && club.trim() && club !== '全部泳會') {
            query.club = club;
        }
        
        // 若為主管且未指定 phone，僅統計 staff 類型教練
        if (isSupervisor && !phone) {
            try {
                const accounts = db.collection(ACCOUNTS_COLLECTION || 'Coach_account');
                const staffDocs = await accounts.find({ $or: [ { type: 'staff' }, { userType: 'coach' } ] }, { projection: { phone: 1, studentPhone: 1 } }).toArray();
                const staffPhones = Array.from(new Set((staffDocs || []).map(u => (u.phone || u.studentPhone || '').toString()).filter(Boolean)));
                if (staffPhones.length > 0) {
                    query.phone = { $in: staffPhones };
                } else {
                    await client.close();
                    return res.json({ success: true, stats: { total_days: 0, total_hours: 0, average_hours: 0, total_records: 0 } });
                }
            } catch (e) {
                console.warn('⚠️ 統計獲取staff帳號失敗，放行所有教練', e.message);
            }
        }
        
        console.log(`📊 統計查詢條件:`, query);

        const list = await collection.find(query).toArray();
        await client.close();
        
        // 計算統計數據
        let totalDays = 0;
        let totalHours = 0;
        let averageHours = 0;
        
        list.forEach(record => {
            const hours = Number(record.hours || 0);
            if (hours > 0) {
                totalDays++;
                totalHours += hours;
            }
        });
        
        if (totalDays > 0) {
            averageHours = Math.round((totalHours / totalDays) * 10) / 10;
        }
        
        const stats = {
            total_days: totalDays,
            total_hours: totalHours,
            average_hours: averageHours,
            total_records: list.length
        };
        
        console.log(`📊 工時統計結果:`, stats);
        res.json({ success: true, stats: stats });
    } catch (error) {
        console.error('❌ 獲取教練工時統計錯誤:', error);
        res.status(500).json({ success: false, message: '獲取工時統計失敗', error: error.message });
    }
});

// 獲取教練全部工時數據（所有月份、地點、泳會）
app.get('/coach-work-hours-all', validateApiKeys, async (req, res) => {
    try {
        const phone = req.query.phone;
        
        if (!phone) {
            return res.status(400).json({ success: false, message: '缺少必要參數 phone' });
        }
        
        console.log(`📊 獲取教練全部工時數據 - 電話: ${phone}`);
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');

        // 查詢該教練的所有工時記錄
        const query = { phone };
        
        console.log(`📊 查詢條件:`, query);

        const list = await collection.find(query).sort({ date: 1 }).toArray();
        await client.close();
        
        console.log(`📊 找到 ${list.length} 條全部工時記錄`);
        res.json({ success: true, records: list });
    } catch (error) {
        console.error('❌ 獲取教練全部工時數據錯誤:', error);
        res.status(500).json({ success: false, message: '獲取全部工時數據失敗', error: error.message });
    }
});

// 取得教練某月份的更表資料（Coach_roster）
app.get('/coach-roster', validateApiKeys, async (req, res) => {
  try {
    const phone = (req.query.phone || '').toString();
    const name = (req.query.name || '').toString();
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    const userType = req.query.userType || 'coach';
    const isSupervisor = userType === 'supervisor';
    
    // 主管模式：允许不提供phone参数，获取所有教练数据
    if (!phone && !isSupervisor) {
      return res.status(400).json({ success: false, message: '缺少必要參數 phone, year, month（name 選填）' });
    }
    
    if (!year || !month) {
      return res.status(400).json({ success: false, message: '缺少必要參數 year, month' });
    }
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('Coach_roster');
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const filter = { date: { $gte: startDate, $lte: endDate } };
    
    // 主管模式：不限制特定教练，但只顯示 staff
    if (isSupervisor && !phone) {
      try {
        const accounts = db.collection(ACCOUNTS_COLLECTION || 'Coach_account');
        const staffDocs = await accounts.find({ $or: [ { type: 'staff' }, { userType: 'coach' } ] }, { projection: { phone: 1, studentPhone: 1 } }).toArray();
        const staffPhones = Array.from(new Set((staffDocs || []).map(u => (u.phone || u.studentPhone || '').toString()).filter(Boolean)));
        if (staffPhones.length > 0) {
          filter.phone = { $in: staffPhones };
        } else {
          await client.close();
          return res.json({ success: true, records: [] });
        }
      } catch (e) {
        console.warn('⚠️ 獲取staff帳號失敗，放行所有教練', e.message);
      }
    } else if (phone) {
      filter.phone = phone;
    }
    if (name && name.trim()) filter.name = name;
    const docs = await col.find(filter).sort({ date: 1 }).toArray();
    await client.close();
    const records = (docs || []).map(d => ({ date: d.date, time: d.time || '', location: d.location || '', phone: d.phone || '', name: d.name || '' }));
    return res.json({ success: true, records });
  } catch (e) {
    console.error('❌ 讀取更表錯誤:', e);
    return res.status(500).json({ success: false, message: '讀取更表失敗', error: e.message });
  }
});

// 批量保存教練更表（Coach_roster）
app.post('/coach-roster/batch', validateApiKeys, async (req, res) => {
  try {
    const { phone, name, entries } = req.body;
    if (!phone || !name || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, message: '參數錯誤，需提供 phone、name、entries[]' });
    }
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('Coach_roster');
    const ops = entries.map(e => ({
      updateOne: {
        filter: { phone, name, date: e.date },
        update: { $set: { phone, name, date: e.date, time: e.time || '', location: e.location || '', updatedAt: new Date() } },
        upsert: true
      }
    }));
    if (ops.length > 0) await col.bulkWrite(ops);
    await client.close();
    return res.json({ success: true, count: ops.length });
  } catch (e) {
    console.error('❌ 保存更表錯誤:', e);
    return res.status(500).json({ success: false, message: '保存更表失敗', error: e.message });
  }
});

// 用戶註冊
app.post('/auth/register', validateApiKeys, async (req, res) => {
    try {
        const { phone, password, userType, studentName, createdAt } = req.body;
        console.log(`📝 用戶註冊請求 - 電話: ${phone}, 學生姓名: ${studentName}`);
        
        if (!phone || !password || !studentName) {
            return res.status(400).json({
                success: false,
                message: '電話號碼、密碼和學生姓名不能為空'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密碼至少需要6位數'
            });
        }
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(ACCOUNTS_COLLECTION);
        
        // 檢查電話號碼是否已存在
        const existingUser = await collection.findOne({ phone: phone });
        
        if (existingUser) {
            await client.close();
            console.log(`❌ 電話號碼已存在 - ${phone}`);
            return res.status(409).json({
                success: false,
                message: '該電話號碼已被註冊'
            });
        }
        
        // 創建新用戶
        const newUser = {
            phone: phone,
            studentPhone: phone, // 添加studentPhone字段以匹配數據庫索引
            password: password,
            userType: userType || 'parent',
            studentName: studentName,
            createdAt: createdAt || Date.now(),
            createdDate: new Date().toISOString()
        };
        
        const result = await collection.insertOne(newUser);
        
        await client.close();
        
        console.log(`✅ 用戶註冊成功 - ${phone}, 學生姓名: ${studentName}`);
        res.status(201).json({
            success: true,
            message: '用戶註冊成功',
            userId: result.insertedId
        });
        
    } catch (error) {
        console.error('❌ 用戶註冊錯誤:', error);
        res.status(500).json({
            success: false,
            message: '註冊失敗',
            error: error.message
        });
    }
});

// 創建單個學生資料
app.post('/students', validateApiKeys, async (req, res) => {
    try {
        const studentData = req.body;
        console.log(`📚 創建學生資料請求 - 姓名: ${studentData.name}`);
        
        if (!studentData.name || !studentData.phone) {
            return res.status(400).json({
                success: false,
                message: '學生姓名和電話號碼不能為空'
            });
        }
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        // 檢查電話號碼是否已存在
        const existingStudent = await collection.findOne({ phone: studentData.phone });
        
        if (existingStudent) {
            await client.close();
            console.log(`❌ 學生電話號碼已存在 - ${studentData.phone}`);
            return res.status(409).json({
                success: false,
                message: '該電話號碼的學生資料已存在'
            });
        }
        
        // 添加創建時間
        const newStudent = {
            ...studentData,
            createdAt: Date.now(),
            createdDate: new Date().toISOString()
        };
        
        const result = await collection.insertOne(newStudent);
        
        await client.close();
        
        console.log(`✅ 學生資料創建成功 - ${studentData.name}`);
        res.status(201).json({
            success: true,
            message: '學生資料創建成功',
            studentId: result.insertedId
        });
        
    } catch (error) {
        console.error('❌ 創建學生資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '創建學生資料失敗',
            error: error.message
        });
    }
});

// 獲取單個學生資料
app.get('/students/:id', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📥 獲取單個學生資料 - ID: ${id}`);
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        const student = await collection.findOne({ _id: id });
        
        await client.close();
        
        if (student) {
            console.log(`✅ 成功獲取學生資料 - ID: ${id}`);
            res.json(student);
        } else {
            console.log(`❌ 學生資料不存在 - ID: ${id}`);
            res.status(404).json({
                success: false,
                message: '學生資料不存在'
            });
        }
    } catch (error) {
        console.error('❌ 獲取學生資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取學生資料失敗',
            error: error.message
        });
    }
});

// 更新學生資料（根據姓名和日期）- 必須放在 /students/:id 之前
app.put('/students/update', validateApiKeys, async (req, res) => {
    try {
        const { name, date, option1, option2, option3, age, type, time, location } = req.body;
        console.log(`📝 更新學生資料 - 姓名: ${name}, 日期: ${date}`);
        console.log(`📝 更新內容:`, { option1, option2, option3, age, type, time, location });
        console.log(`📝 完整請求體:`, req.body);
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: '學生姓名不能為空'
            });
        }
        
        // 優先使用"上課日期"字段，這是資料庫中的實際字段名
        let searchDate = req.body['上課日期'] || date;
        if (!searchDate) {
            // 如果都沒有，嘗試其他可能的日期字段
            searchDate = req.body['courseDate'] || req.body['classDate'] || '';
        }
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        // 先查詢現有記錄，確認字段名稱
        let query = { name: name };
        if (searchDate) {
            // 優先使用"上課日期"字段，這是資料庫中的實際字段名
            query = {
                name: name,
                $or: [
                    { "上課日期": searchDate },
                    { date: searchDate },
                    { courseDate: searchDate },
                    { classDate: searchDate }
                ]
            };
        }
        
        console.log(`🔍 查詢條件:`, query);
        
        // 如果沒有找到記錄，嘗試更寬鬆的查詢
        let existingRecord = await collection.findOne(query);
        
        if (!existingRecord) {
            console.log(`🔍 使用寬鬆查詢條件重試...`);
            // 嘗試只按姓名查詢，忽略日期
            const nameOnlyQuery = { name: name };
            existingRecord = await collection.findOne(nameOnlyQuery);
            
            if (existingRecord) {
                console.log(`🔍 找到學生記錄（僅按姓名）:`, {
                    name: existingRecord.name,
                    date: existingRecord.date,
                    '上課日期': existingRecord['上課日期'],
                    courseDate: existingRecord.courseDate,
                    classDate: existingRecord.classDate,
                    location: existingRecord.location
                });
                
                // 如果找到記錄但日期不匹配，返回詳細信息
                if (searchDate) {
                    await client.close();
                    return res.status(404).json({
                        success: false,
                        message: `學生姓名存在但日期不匹配 - 姓名: ${name}, 請求日期: ${searchDate}, 資料庫日期: ${existingRecord.date || existingRecord['上課日期'] || existingRecord.courseDate || existingRecord.classDate || '未知'}`
                    });
                }
            }
        }
        
        console.log(`🔍 現有記錄:`, existingRecord);
        
        if (!existingRecord) {
            await client.close();
            return res.status(404).json({
                success: false,
                message: `學生資料不存在 - 姓名: ${name}${searchDate ? `, 日期: ${searchDate}` : ''}`
            });
        }
        
        // 構建更新數據，優先使用標準字段名，如果不存在則創建
        const updateData = {}
        
        // 處理option1 (出席狀況)
        if (option1 != null) {
            // 檢查資料庫中是否有相關字段
            if (existingRecord.hasOwnProperty('option1')) {
                updateData.option1 = option1
                console.log(`✅ 更新option1字段: ${option1}`)
            } else if (existingRecord.hasOwnProperty('attendance')) {
                updateData.attendance = option1
                console.log(`✅ 更新attendance字段: ${option1}`)
            } else {
                // 如果都沒有，創建標準的option1字段
                updateData.option1 = option1
                console.log(`🆕 創建option1字段: ${option1}`)
            }
        }
        
        // 處理option2 (補/調堂)
        if (option2 != null) {
            if (existingRecord.hasOwnProperty('option2')) {
                updateData.option2 = option2
                console.log(`✅ 更新option2字段: ${option2}`)
            } else if (existingRecord.hasOwnProperty('makeup')) {
                updateData.makeup = option2
                console.log(`✅ 更新makeup字段: ${option2}`)
            } else {
                // 如果都沒有，創建標準的option2字段
                updateData.option2 = option2
                console.log(`🆕 創建option2字段: ${option2}`)
            }
        }
        
        // 處理其他字段
        if (option3 != null) {
            updateData.option3 = option3
            console.log(`✅ 更新option3字段: ${option3}`)
        }
        if (age != null) updateData.age = age
        if (type != null) updateData.type = type
        if (time != null) updateData.time = time
        if (location != null) updateData.location = location
        
        console.log(`📝 準備更新的數據:`, updateData);
        
        // 執行更新操作
        const result = await collection.updateOne(
            query,
            { $set: updateData }
        );
        
        await client.close();
        
        if (result.matchedCount > 0) {
            console.log(`✅ 學生資料更新成功 - 姓名: ${name}, 日期: ${date}`);
            console.log(`✅ 更新了 ${result.modifiedCount} 個字段`);
            console.log(`✅ 更新的字段:`, Object.keys(updateData));
            
            res.json({
                success: true,
                message: '學生資料更新成功',
                modifiedCount: result.modifiedCount,
                updatedFields: Object.keys(updateData)
            });
        } else {
            console.log(`❌ 學生資料不存在 - 姓名: ${name}, 日期: ${date}`);
            res.status(404).json({
                success: false,
                message: '學生資料不存在'
            });
        }
    } catch (error) {
        console.error('❌ 更新學生資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新學生資料失敗',
            error: error.message
        });
    }
});

// 更新學生資料（根據ID）
app.put('/students/:id', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log(`📝 更新學生資料 - ID: ${id}`);
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        const result = await collection.updateOne(
            { _id: id },
            { $set: updateData }
        );
        
        await client.close();
        
        if (result.matchedCount > 0) {
            console.log(`✅ 學生資料更新成功 - ID: ${id}`);
            res.json({
                success: true,
                message: '學生資料更新成功',
                modifiedCount: result.modifiedCount
            });
        } else {
            console.log(`❌ 學生資料不存在 - ID: ${id}`);
            res.status(404).json({
                success: false,
                message: '學生資料不存在'
            });
        }
    } catch (error) {
        console.error('❌ 更新學生資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新學生資料失敗',
            error: error.message
        });
    }
});

// 刪除學生資料
app.delete('/students/:id', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ 刪除學生資料 - ID: ${id}`);
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        const result = await collection.deleteOne({ _id: id });
        
        await client.close();
        
        if (result.deletedCount > 0) {
            console.log(`✅ 學生資料刪除成功 - ID: ${id}`);
            res.json({
                success: true,
                message: '學生資料刪除成功',
                deletedCount: result.deletedCount
            });
        } else {
            console.log(`❌ 學生資料不存在 - ID: ${id}`);
            res.status(404).json({
                success: false,
                message: '學生資料不存在'
            });
        }
    } catch (error) {
        console.error('❌ 刪除學生資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '刪除學生資料失敗',
            error: error.message
        });
    }
});

// 新增：獲取所有 Location_club 的地點清單
app.get('/locations', validateApiKeys, async (req, res) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const col = db.collection('Location_club');
        const list = await col.distinct('location');
        await client.close();
        res.json({ success: true, locations: list });
    } catch (error) {
        console.error('❌ 獲取地點清單錯誤:', error);
        res.status(500).json({ success: false, message: '獲取地點失敗', error: error.message });
    }
});

// 新增：根據地點獲取對應的泳會清單
app.get('/clubs', validateApiKeys, async (req, res) => {
    try {
        const { location } = req.query;
        console.log(`🏊‍♂️ 獲取泳會清單 - 地點: ${location}`);
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const col = db.collection('Location_club');
        
        let clubs;
        if (location && location !== '全部地點') {
            // 根據地點獲取對應的泳會
            clubs = await col.distinct('club', { location: location });
        } else {
            // 如果沒有指定地點或選擇全部地點，獲取所有泳會
            clubs = await col.distinct('club');
        }
        
        await client.close();
        
        console.log(`✅ 成功獲取 ${clubs.length} 個泳會`);
        res.json({ success: true, clubs: clubs });
    } catch (error) {
        console.error('❌ 獲取泳會清單錯誤:', error);
        res.status(500).json({ success: false, message: '獲取泳會失敗', error: error.message });
    }
});

// 更新單一學生的課程時間/類型（依電話+姓名定位）
app.post('/students/update-lesson', validateApiKeys, async (req, res) => {
  try {
    const safe = v => (typeof v === 'string' ? v.trim() : (v || '')).toString();
    const phone = safe(req.body.phone);
    const name = safe(req.body.name);
    const date = safe(req.body.date); // 選填：供前端記錄用，不一定寫入
    const location = safe(req.body.location);
    const time = safe(req.body.time);
    const type = safe(req.body.type);

    if (!phone || !name) {
      return res.status(400).json({ success: false, message: '缺少必要參數 phone 或 name' });
    }
    if (!time && !type && !location) {
      return res.status(400).json({ success: false, message: '至少提供一個要更新的欄位（time/type/location）' });
    }

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('students');

    // 基本過濾：以電話+姓名定位；若提供地點則一併匹配（避免同名同電話不同地點的情況）
    const filter = { Phone_number: phone, name: name };
    if (location) filter.location = location;

    const $set = { updatedAt: new Date() };
    if (time) $set.time = time;
    if (type) $set.type = type;
    if (location) $set.location = location;
    if (date) $set.lastScheduleDate = date; // 僅記錄參考

    const result = await col.updateOne(filter, { $set });
    await client.close();

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: '找不到對應學生（phone+name 不匹配）' });
    }

    return res.json({ success: true, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (e) {
    console.error('❌ 更新學生課程失敗:', e);
    return res.status(500).json({ success: false, message: '更新失敗', error: e.message });
    }
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
    console.error('❌ 服務器錯誤:', error);
    res.status(500).json({
        success: false,
        message: '服務器內部錯誤',
        error: error.message
    });
});

// 啟動服務器
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 API 服務器已啟動');
    console.log(`📍 本地地址: http://localhost:${PORT}`);
    console.log(`🌐 服務器地址: ${SERVER_URL}`);
    console.log(`🔧 服務器配置完成`);
});