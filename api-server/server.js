const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// 中間件
app.use(cors());
app.use(express.json());

// MongoDB 連接配置 - 支持環境變量
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';
const STUDENTS_COLLECTION = 'students';
const ACCOUNTS_COLLECTION = 'Student_account';

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
            features: ['admin-login', 'coach-management', 'work-hours']
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
        const students = await collection.find({ phone: userPhone }).toArray();
        
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
        if (userType === 'coach') {
            collection = db.collection('Coach_account');
        } else if (userType === 'admin') {
            collection = db.collection('Administrator');
        } else {
            collection = db.collection(ACCOUNTS_COLLECTION);
        }
        
        // 查找用戶（使用電話號碼作為賬號）
        const user = await collection.findOne({
            phone: phone,
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
        const { phone, password, userType, studentName, createdAt } = req.body;
        console.log(`📝 教練註冊請求 - 電話: ${phone}, 教練名: ${studentName}`);
        
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
            createdAt: createdAt || Date.now(),
            createdDate: new Date().toISOString()
        };
        
        const result = await collection.insertOne(newUser);
        
        await client.close();
        
        console.log(`✅ 教練註冊成功 - ${phone}, 教練名: ${studentName}`);
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

// 新增：獲取教練列表
app.get('/coaches', validateApiKeys, async (req, res) => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_account');

        const coaches = await collection.find({}, { projection: { phone: 1, studentName: 1, _id: 0 } }).toArray();
        await client.close();
        res.json({ success: true, coaches });
    } catch (error) {
        console.error('❌ 獲取教練列表錯誤:', error);
        res.status(500).json({ success: false, message: '獲取教練列表失敗', error: error.message });
    }
});

// 新增：批量上傳教練工時
app.post('/coach-work-hours/batch', validateApiKeys, async (req, res) => {
    try {
        const { date, entries } = req.body;
        if (!date || !Array.isArray(entries)) {
            return res.status(400).json({ success: false, message: '參數錯誤，需提供 date 與 entries 數組' });
        }

        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');

        const ops = entries.map(e => ({
            updateOne: {
                filter: { phone: e.phone, date },
                update: { $set: { phone: e.phone, date, hours: Number(e.hours) || 0, updatedAt: new Date() } },
                upsert: true
            }
        }));

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
        if (!phone || !year || !month) {
            return res.status(400).json({ success: false, message: '缺少必要參數 phone/year/month' });
        }
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('Coach_work_hours');

        const list = await collection.find({
            phone,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 }).toArray();
        await client.close();
        res.json({ success: true, records: list });
    } catch (error) {
        console.error('❌ 獲取教練工時錯誤:', error);
        res.status(500).json({ success: false, message: '獲取工時失敗', error: error.message });
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
        
        // 如果日期為空，嘗試使用其他可能的日期字段
        let searchDate = date;
        if (!searchDate) {
            // 嘗試從其他字段獲取日期
            searchDate = req.body['上課日期'] || req.body['courseDate'] || req.body['classDate'] || '';
        }
        
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(STUDENTS_COLLECTION);
        
        // 先查詢現有記錄，確認字段名稱
        let query = { name: name };
        if (searchDate) {
            query.date = searchDate;
        }
        
        console.log(`🔍 查詢條件:`, query);
        const existingRecord = await collection.findOne(query);
        console.log(`🔍 現有記錄:`, existingRecord);
        
        if (!existingRecord) {
            await client.close();
            return res.status(404).json({
                success: false,
                message: `學生資料不存在 - 姓名: ${name}${searchDate ? `, 日期: ${searchDate}` : ''}`
            });
        }
        
        // 構建更新數據，使用實際存在的字段名稱
        const updateData = {}
        if (option1 != null) {
            // 檢查數據庫中是否有option1字段，如果沒有則使用其他可能的字段名
            if (existingRecord.hasOwnProperty('option1')) {
                updateData.option1 = option1
            } else if (existingRecord.hasOwnProperty('attendance')) {
                updateData.attendance = option1
            } else {
                updateData.option1 = option1 // 如果都沒有，創建新字段
            }
        }
        
        if (option2 != null) {
            if (existingRecord.hasOwnProperty('option2')) {
                updateData.option2 = option2
            } else if (existingRecord.hasOwnProperty('makeup')) {
                updateData.makeup = option2
            } else {
                updateData.option2 = option2 // 如果都沒有，創建新字段
            }
        }
        
        if (option3 != null) updateData.option3 = option3
        if (age != null) updateData.age = age
        if (type != null) updateData.type = type
        if (time != null) updateData.time = time
        if (location != null) updateData.location = location
        
        console.log(`📝 準備更新的數據:`, updateData);
        
        const result = await collection.updateOne(
            query,
            { $set: updateData }
        );
        
        await client.close();
        
        if (result.matchedCount > 0) {
            console.log(`✅ 學生資料更新成功 - 姓名: ${name}, 日期: ${date}`);
            console.log(`✅ 更新了 ${result.modifiedCount} 個字段`);
            res.json({
                success: true,
                message: '學生資料更新成功',
                modifiedCount: result.modifiedCount
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
    console.log(`🔗 MongoDB 連接: ${MONGO_URI}`);
    console.log(`📊 數據庫: ${DB_NAME}`);
    console.log(`📋 學生集合: ${STUDENTS_COLLECTION}`);
    console.log(`👤 賬號集合: ${ACCOUNTS_COLLECTION}`);
    console.log(`🔑 API 密鑰已配置`);
    console.log(`⏰ 啟動時間: ${new Date().toLocaleString()}`);
    console.log('');
    console.log('📱 手機 APP 配置:');
    console.log(`   基礎 URL: ${SERVER_URL}`);
    console.log(`   公開密鑰: ${process.env.API_PUBLIC_KEY || 'ttdrcccy'}`);
    console.log(`   私有密鑰: ${process.env.API_PRIVATE_KEY || '2b207365-cbf0-4e42-a3bf-f932c84557c4'}`);
    console.log('');
    console.log('🧪 測試命令:');
    console.log(`   curl -H "X-API-Public-Key: ${process.env.API_PUBLIC_KEY || 'ttdrcccy'}" -H "X-API-Private-Key: ${process.env.API_PRIVATE_KEY || '2b207365-cbf0-4e42-a3bf-f932c84557c4'}" ${SERVER_URL}/health`);
});

module.exports = app; 