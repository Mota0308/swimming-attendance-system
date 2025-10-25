const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB 配置
// MongoDB 配置 - 支持動態數據庫選擇
const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';
// API 密鑰配置
const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY || 'ttdrcccy';
const PRIVATE_API_KEY = process.env.PRIVATE_API_KEY || '2b207365-cbf0-4e42-a3bf-f932c84557c4';

// 中間件
app.use(cors());
app.use(express.json());

// API 密鑰驗證中間件
const validateApiKeys = (req, res, next) => {
    const publicKey = req.headers['x-api-public-key'];
    const privateKey = req.headers['x-api-private-key'];
    
    if (publicKey === PUBLIC_API_KEY && privateKey === PRIVATE_API_KEY) {
        console.log(`✅ API 密鑰驗證成功 - IP: ${req.ip}`);
        next();
    } else {
        console.log(`❌ API 密鑰驗證失敗 - IP: ${req.ip}`);
        res.status(401).json({ success: false, message: 'API 密鑰驗證失敗' });
    }
};

// 健康檢查端點
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API 服務器運行正常',
        timestamp: new Date().toISOString()
    });
});

// 用戶登入驗證 - 支持 Admin_account 集合
app.post('/auth/login', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone, password, userType, type } = req.body;
        const loginType = userType || type; // 支持兩種參數名
        
        console.log(`🔐 用戶登入請求 - 電話: ${phone.substring(0, 3)}***`);
        
        // 基本輸入驗證
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: '電話號碼和密碼不能為空'
            });
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        console.log(`🔗 連接 MongoDB: ${MONGO_BASE_URI.substring(0, 20)}***, 數據庫: ${DEFAULT_DB_NAME}`);
        await client.connect();
        
        const db = client.db(DEFAULT_DB_NAME);
        // ... 其餘代碼保持不變
        let user = null;
        let collection = null;
        
        // 優先查詢 Admin_account 集合（用於教練、主管、管理員）
        if (loginType === 'coach' || loginType === 'supervisor' || loginType === 'admin') {
            console.log(`🔍 查詢 Admin_account 集合 - 類型: ${loginType}`);
            collection = db.collection('Admin_account');
            
            // 查找用戶，驗證 type 和 password
            user = await collection.findOne({
                phone: phone,
                password: password,
                type: loginType  // 確保 type 完全匹配
            });
            
            if (user) {
                console.log(`✅ Admin_account 中找到用戶: ${phone}, type: ${user.type}`);
            } else {
                console.log(`⚠️ Admin_account 中未找到匹配用戶: ${phone}, type: ${loginType}`);
                
                // 如果 Admin_account 中沒找到，嘗試 Coach_account（向後兼容）
                if (loginType === 'coach' || loginType === 'supervisor') {
                    console.log(`🔍 嘗試 Coach_account 集合`);
                    collection = db.collection('Coach_account');
                    user = await collection.findOne({
                        phone: phone,
                        password: password
                    });
                    
                    if (user) {
                        console.log(`✅ Coach_account 中找到用戶: ${phone}`);
                    }
                }
            }
        } else {
            // 其他類型用戶使用原有邏輯
            collection = db.collection('Coach_account');
            user = await collection.findOne({
                studentPhone: phone,
                password: password
            });
        }
        
        if (user) {
            console.log(`✅ 用戶登入成功 - ${phone.substring(0, 3)}***, 類型: ${user.type || user.userType || loginType}`);
            res.json({
                success: true,
                message: '登入成功',
                user: {
                    id: user._id,
                    phone: user.phone || user.studentPhone,
                    name: user.name || user.studentName,
                    type: user.type || user.userType || loginType,
                    userType: user.type || user.userType || loginType
                }
            });
        } else {
            console.log(`❌ 用戶登入失敗 - ${phone.substring(0, 3)}***, type: ${loginType}`);
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
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取教練信息
app.get('/api/coach/:phone', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone } = req.params;
        console.log(`🔍 獲取教練信息 - 電話: ${phone}`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_account');
        
        const coach = await collection.findOne({ phone: phone });
        
        if (coach) {
            console.log(`✅ 找到教練: ${coach.name}`);
            res.json({
                success: true,
                coach: {
                    id: coach._id,
                    name: coach.name,
                    phone: coach.phone,
                    type: coach.type || 'coach'
                }
            });
        } else {
            console.log(`❌ 未找到教練: ${phone}`);
            res.status(404).json({
                success: false,
                message: '教練不存在'
            });
        }
    } catch (error) {
        console.error('❌ 獲取教練信息錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取教練信息失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取教練排班
app.get('/api/coach/:phone/schedule', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone } = req.params;
        const { date } = req.query;
        console.log(`🔍 獲取教練排班 - 電話: ${phone}, 日期: ${date}`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_schedule');
        
        const query = { coachPhone: phone };
        if (date) {
            query.date = date;
        }
        
        const schedules = await collection.find(query).toArray();
        
        console.log(`✅ 找到 ${schedules.length} 個排班記錄`);
        res.json({
            success: true,
            schedules: schedules
        });
    } catch (error) {
        console.error('❌ 獲取教練排班錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取教練排班失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取教練工時
app.get('/api/coach/:phone/work-hours', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone } = req.params;
        const { startDate, endDate } = req.query;
        console.log(`🔍 獲取教練工時 - 電話: ${phone}, 開始日期: ${startDate}, 結束日期: ${endDate}`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_work_hours');
        
        const query = { coachPhone: phone };
        if (startDate && endDate) {
            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        }
        
        const workHours = await collection.find(query).toArray();
        
        console.log(`✅ 找到 ${workHours.length} 個工時記錄`);
        res.json({
            success: true,
            workHours: workHours
        });
    } catch (error) {
        console.error('❌ 獲取教練工時錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取教練工時失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 更新教練工時
app.post('/api/coach/:phone/work-hours', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone } = req.params;
        const { date, startTime, endTime, totalHours, notes } = req.body;
        console.log(`🔍 更新教練工時 - 電話: ${phone}, 日期: ${date}`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_work_hours');
        
        const workHourRecord = {
            coachPhone: phone,
            date: date,
            startTime: startTime,
            endTime: endTime,
            totalHours: totalHours,
            notes: notes || '',
            updatedAt: new Date()
        };
        
        const result = await collection.updateOne(
            { coachPhone: phone, date: date },
            { $set: workHourRecord },
            { upsert: true }
        );
        
        console.log(`✅ 工時記錄更新成功 - ${result.upsertedCount} 新增, ${result.modifiedCount} 修改`);
        res.json({
            success: true,
            message: '工時記錄更新成功',
            result: result
        });
    } catch (error) {
        console.error('❌ 更新教練工時錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新教練工時失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取教練數據
app.get('/coaches', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('👨‍🏫 獲取教練數據請求');
        
        // 從 MongoDB 獲取教練數據
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const coachesCollection = db.collection('Admin_account');
        
        const coaches = await coachesCollection.find({ 
            $or: [
                { type: 'coach' },
                { userType: 'coach' }
            ]
        }).toArray();
        
        res.json({
            success: true,
            coaches: coaches
        });
        
        console.log(`✅ 返回教練數據: ${coaches.length}個教練`);
    } catch (error) {
        console.error('❌ 獲取教練數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取教練數據失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 數據庫健康檢查端點
app.get('/db-health', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('🔍 數據庫健康檢查請求');
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        
        const db = client.db(DEFAULT_DB_NAME);
        
        // 檢查數據庫連接
        await db.admin().ping();
        
        // 列出所有集合
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // 檢查 Admin_account 集合
        let adminAccountExists = false;
        let adminCount = 0;
        let coachCount = 0;
        let supervisorCount = 0;
        if (collectionNames.includes('Admin_account')) {
            adminAccountExists = true;
            const adminCollection = db.collection('Admin_account');
            adminCount = await adminCollection.countDocuments();
            
            // 檢查不同類型的用戶數量
            coachCount = await adminCollection.countDocuments({ 
                $or: [
                    { type: 'coach' },
                    { userType: 'coach' }
                ]
            });
            
            supervisorCount = await adminCollection.countDocuments({ 
                $or: [
                    { type: 'supervisor' },
                    { userType: 'supervisor' }
                ]
            });
            
            adminCount = await adminCollection.countDocuments({ 
                $or: [
                    { type: 'admin' },
                    { userType: 'admin' }
                ]
            });
        }
        
        res.json({
            success: true,
            message: '數據庫連接正常',
            database: DEFAULT_DB_NAME,
            collections: collectionNames,
            adminAccountExists: adminAccountExists,
            totalRecords: adminCount,
            coachCount: coachCount,
            supervisorCount: supervisorCount,
            adminCount: adminCount,
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ 數據庫健康檢查完成');
        
    } catch (error) {
        console.error('❌ 數據庫健康檢查失敗:', error);
        res.status(500).json({
            success: false,
            message: '數據庫連接失敗',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉連接失敗:', closeError);
            }
        }
    }
});

// 獲取管理員數據
app.get('/admins', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('👨‍💼 獲取管理員數據請求');
        
        // 從 MongoDB 獲取管理員數據
        client = new MongoClient(MONGO_BASE_URI);
        console.log('🔗 正在連接 MongoDB...');
        
        // 設置連接超時
        await client.connect();
        console.log('✅ MongoDB 連接成功');
        
        const db = client.db(DEFAULT_DB_NAME);
        const adminsCollection = db.collection('Admin_account');
        
        console.log('🔍 正在查詢管理員數據...');
        
        // 先檢查集合是否存在
        const collections = await db.listCollections({ name: 'Admin_account' }).toArray();
        if (collections.length === 0) {
            console.log('⚠️ Admin_account 集合不存在');
            res.json({
                success: true,
                admins: []
            });
            return;
        }
        
        const admins = await adminsCollection.find({ 
            $or: [
                { type: 'admin' },
                { userType: 'admin' }
            ]
        }).toArray();
        console.log(`📊 查詢到 ${admins.length} 個管理員`);
        
        res.json({
            success: true,
            admins: admins
        });
        
        console.log(`✅ 返回管理員數據: ${admins.length}個管理員`);
    } catch (error) {
        console.error('❌ 獲取管理員數據失敗:', error);
        console.error('❌ 錯誤詳情:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // 返回空數組而不是錯誤，避免前端崩潰
        res.json({
            success: true,
            admins: [],
            warning: '無法獲取管理員數據，返回空列表'
        });
    } finally {
        if (client) {
            try {
                await client.close();
                console.log('🔒 MongoDB 連接已關閉');
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取地點數據
app.get('/locations', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('📍 獲取地點數據請求');
        
        // 從 MongoDB 獲取地點數據
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        
        // 從 Location_club 集合獲取地點數據
        const locationClubCollection = db.collection('Location_club');
        
        const locationData = await locationClubCollection.find({}).toArray();
        
        // 提取地點列表
        const locations = locationData.map(item => item.location || item.name || item.place).filter(Boolean);
        
        // 去重並排序
        const uniqueLocations = [...new Set(locations)].sort();
        
        res.json({
            success: true,
            locations: uniqueLocations
        });
        
        console.log(`✅ 返回地點數據: ${uniqueLocations.length}個地點`);
    } catch (error) {
        console.error('❌ 獲取地點數據失敗:', error);
        
        // 如果數據庫查詢失敗，返回默認地點
        const defaultLocations = [
            '九龍公園游泳池',
            '維多利亞公園游泳池', 
            '荔枝角公園游泳池',
            '觀塘游泳池',
            '美孚游泳池',
            '堅尼地城游泳池',
            'Office'
        ];
        
        res.json({
            success: true,
            locations: defaultLocations
        });
        
        console.log(`⚠️ 使用默認地點數據: ${defaultLocations.length}個地點`);
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取更表數據
app.get('/roster', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('📅 獲取更表數據請求');
        
        const { month, phone } = req.query;
        console.log('🔍 查詢參數:', { month, phone });
        
        // 從 MongoDB 獲取更表數據
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        
        // 從 Coach_roster 集合獲取更表數據
        const coachRosterCollection = db.collection('Coach_roster');
        
        // 構建查詢條件
        const query = {};
        
        // 如果指定了月份，添加月份篩選
        if (month) {
            let targetMonth;
            let year = new Date().getFullYear();
            
            // 處理不同的月份格式
            if (month.includes('-')) {
                // 格式: "2025-10"
                const [yearStr, monthStr] = month.split('-');
                year = parseInt(yearStr);
                targetMonth = parseInt(monthStr);
            } else {
                // 格式: "10"
                targetMonth = parseInt(month);
            }
            
            // 創建月份範圍的日期查詢
            const startDate = new Date(year, targetMonth - 1, 1);
            const endDate = new Date(year, targetMonth, 0, 23, 59, 59);
            
            query.date = {
                $gte: startDate,
                $lte: endDate
            };
            
            console.log('📅 月份篩選:', { 
                inputMonth: month, 
                parsedYear: year, 
                parsedMonth: targetMonth, 
                startDate, 
                endDate 
            });
        }
        
        // 如果指定了教練電話，添加教練篩選
        if (phone) {
            query.phone = phone;
            console.log('👤 教練篩選:', phone);
        }
        
        console.log('🔍 查詢條件:', query);
        
        const roster = await coachRosterCollection.find(query).toArray();
        console.log('🔍 原始查詢結果:', roster.length, '條記錄');
        if (roster.length > 0) {
            console.log('🔍 第一條記錄:', {
                date: roster[0].date,
                phone: roster[0].phone,
                isSubmitted: roster[0].isSubmitted,
                isConfirmed: roster[0].isConfirmed,
                supervisorApproved: roster[0].supervisorApproved
            });
        }
        
        // 轉換數據格式以匹配前端期望的格式
        const formattedRoster = roster.map(item => ({
            date: item.date,
            time: item.time || item.timeRange || '',
            location: item.location || item.place || '',
            phone: item.phone || item.coachPhone || '',
            name: item.name || item.studentName || item.coachName || '',
            supervisorApproved: item.supervisorApproved !== undefined ? item.supervisorApproved : false, // 審核狀態
            submittedBy: item.submittedBy !== undefined ? item.submittedBy : 'unknown', // 提交者
            isSubmitted: item.isSubmitted !== undefined ? item.isSubmitted : false, // 提交狀態
            isConfirmed: item.isConfirmed !== undefined ? item.isConfirmed : false, // 確認狀態
            isClicked: item.isClicked !== undefined ? item.isClicked : false, // 點擊狀態
            // 保留原始數據以供調試
            _original: item
        }));
        
        res.json({
            success: true,
            roster: formattedRoster
        });
        
        console.log(`✅ 返回更表數據: ${formattedRoster.length}條記錄`);
    } catch (error) {
        console.error('❌ 獲取更表數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取更表數據失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 批量保存教練更表
app.post('/coach-roster/batch', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('💾 批量保存教練更表請求');
        console.log('📋 請求體:', JSON.stringify(req.body, null, 2));
        
        const { entries, phone, name, supervisorApproved, submittedBy, isSubmitted, isConfirmed } = req.body;
        
        // 輸入驗證
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            console.error('❌ 驗證失敗: entries 為空或不是數組', { entries });
            return res.status(400).json({
                success: false,
                message: '更表數據不能為空',
                details: { entries: entries }
            });
        }
        
        if (!phone || !name) {
            console.error('❌ 驗證失敗: phone 或 name 為空', { phone, name });
            return res.status(400).json({
                success: false,
                message: '教練電話和姓名不能為空',
                details: { phone: phone, name: name }
            });
        }
        
        // 驗證電話號碼格式
        if (!/^\d{8,15}$/.test(phone)) {
            console.error('❌ 驗證失敗: 電話號碼格式不正確', { phone });
            return res.status(400).json({
                success: false,
                message: '電話號碼格式不正確，應為8-15位數字',
                details: { phone: phone }
            });
        }
        
        
        // 驗證姓名長度
        if (name.length < 2 || name.length > 50) {
            console.error('❌ 驗證失敗: 姓名長度不正確', { name, length: name.length });
            return res.status(400).json({
                success: false,
                message: '姓名長度應在2-50字符之間',
                details: { name: name, length: name.length }
            });
        }
        
        // 驗證條目數據
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            console.log(`🔍 驗證第${i+1}條記錄:`, entry);
            
            // 只驗證日期是必需的，時間和地點可以為空（教練簡化模式）
            if (!entry.date) {
                console.error(`❌ 驗證失敗: 第${i+1}條記錄缺少日期字段`, entry);
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄缺少日期字段`,
                    details: { entry: entry, index: i }
                });
            }
            
            // 驗證日期格式
            if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
                console.error(`❌ 驗證失敗: 第${i+1}條記錄日期格式不正確`, { date: entry.date });
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄日期格式不正確`,
                    details: { date: entry.date, index: i }
                });
            }
            
            // 驗證日期是否有效
            const dateObj = new Date(entry.date);
            if (isNaN(dateObj.getTime())) {
                console.error(`❌ 驗證失敗: 第${i+1}條記錄日期無效`, { date: entry.date });
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄日期無效`,
                    details: { date: entry.date, index: i }
                });
            }
            
            // 驗證日期是否在合理範圍內（不能是未來日期超過1年）
            const today = new Date();
            const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
            if (dateObj > oneYearFromNow) {
                console.error(`❌ 驗證失敗: 第${i+1}條記錄日期過於未來`, { date: entry.date });
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄日期不能超過一年`,
                    details: { date: entry.date, index: i }
                });
            }
            
            // 驗證日期是否過於久遠（不能是10年前）
            const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
            if (dateObj < tenYearsAgo) {
                console.error(`❌ 驗證失敗: 第${i+1}條記錄日期過於久遠`, { date: entry.date });
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄日期不能超過10年前`,
                    details: { date: entry.date, index: i }
                });
            }
            
            // 驗證時間格式（如果提供）
            if (entry.time && entry.time.trim() !== '') {
                const timePattern = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
                if (!timePattern.test(entry.time.trim())) {
                    console.error(`❌ 驗證失敗: 第${i+1}條記錄時間格式不正確`, { time: entry.time });
                    return res.status(400).json({
                        success: false,
                        message: `第${i+1}條記錄時間格式不正確，應為 "HH:MM-HH:MM"`,
                        details: { time: entry.time, index: i }
                    });
                }
                
                // 驗證時間邏輯（開始時間不能晚於結束時間）
                const timeMatch = entry.time.trim().match(timePattern);
                if (timeMatch) {
                    const startHour = parseInt(timeMatch[1]);
                    const startMin = parseInt(timeMatch[2]);
                    const endHour = parseInt(timeMatch[3]);
                    const endMin = parseInt(timeMatch[4]);
                    
                    const startTime = startHour * 60 + startMin;
                    const endTime = endHour * 60 + endMin;
                    
                    if (startTime >= endTime) {
                        console.error(`❌ 驗證失敗: 第${i+1}條記錄開始時間不能晚於或等於結束時間`, { time: entry.time });
                        return res.status(400).json({
                            success: false,
                            message: `第${i+1}條記錄開始時間不能晚於或等於結束時間`,
                            details: { time: entry.time, index: i }
                        });
                    }
                }
            }
            
            // 驗證地點（如果提供）
            if (entry.location && entry.location.trim() !== '') {
                // 檢查地點長度
                if (entry.location.length > 100) {
                    console.error(`❌ 驗證失敗: 第${i+1}條記錄地點過長`, { location: entry.location });
                    return res.status(400).json({
                        success: false,
                        message: `第${i+1}條記錄地點不能超過100字符`,
                        details: { location: entry.location, index: i }
                    });
                }
                
                // 檢查地點是否包含危險字符
                const dangerousChars = /[<>'"&]/;
                if (dangerousChars.test(entry.location)) {
                    console.error(`❌ 驗證失敗: 第${i+1}條記錄地點包含危險字符`, { location: entry.location });
                    return res.status(400).json({
                        success: false,
                        message: `第${i+1}條記錄地點包含不允許的字符`,
                        details: { location: entry.location, index: i }
                    });
                }
            }
        }
        
        console.log(`📋 保存更表 - 教練: ${name}, 電話: ${phone.substring(0, 3)}***, 條目數: ${entries.length}, 審核狀態: ${supervisorApproved}, 提交者: ${submittedBy}`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const rosterCollection = db.collection('Coach_roster');
        const adminCollection = db.collection('Admin_account');
        
        // 從 Admin_account 集合中查找正確的 name
        let correctName = name; // 默認使用傳入的 name
        try {
            const adminAccount = await adminCollection.findOne({ phone: phone });
            if (adminAccount && adminAccount.name) {
                correctName = adminAccount.name;
                console.log(`✅ 從 Admin_account 獲取正確的 name: ${correctName}`);
            } else {
                // 如果數據庫中沒有 name，使用與前端一致的格式：usertype_phone
                const userType = adminAccount?.type || 'coach';
                correctName = `${userType}_${phone}`;
                console.log(`⚠️ 在 Admin_account 中未找到電話 ${phone}，使用格式化的 name: ${correctName}`);
            }
        } catch (error) {
            console.error('❌ 查詢 Admin_account 失敗:', error);
            // 使用與前端一致的格式：usertype_phone
            correctName = `coach_${phone}`;
            console.log(`⚠️ 使用默認格式化的 name: ${correctName}`);
        }
        
        // 計算月份和年份 - 使用所有條目的日期範圍
        let minDate = null;
        let maxDate = null;
        
        for (const entry of entries) {
            const entryDate = new Date(entry.date);
            if (!minDate || entryDate < minDate) {
                minDate = entryDate;
            }
            if (!maxDate || entryDate > maxDate) {
                maxDate = entryDate;
            }
        }
        
        // 如果所有條目都在同一個月，使用該月份
        // 如果跨月，使用第一個條目的月份（保持原有邏輯）
        const targetDate = minDate;
        const month = targetDate.getMonth() + 1;
        const year = targetDate.getFullYear();
        
        console.log(`📅 日期範圍分析:`, {
            minDate: minDate.toISOString().split('T')[0],
            maxDate: maxDate.toISOString().split('T')[0],
            targetMonth: month,
            targetYear: year,
            isCrossMonth: minDate.getMonth() !== maxDate.getMonth()
        });
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        
        // 🔥 修復：先檢查重複提交，再進行數據庫操作
        // 檢查是否嘗試重複提交已提交的更表
        if (isSubmitted === true && (submittedBy === 'coach' || submittedBy === 'admin')) {
            // 檢查是否已經有已提交的記錄
            const existingSubmittedData = await rosterCollection.find({
                phone: phone,
                date: { $gte: startDate, $lte: endDate },
                isSubmitted: true,
                submittedBy: submittedBy // 檢查相同提交者的記錄
            }).toArray();
            
            if (existingSubmittedData.length > 0) {
                console.log(`🚫 阻止重複提交 - 月份: ${month}, 用戶: ${phone}, 提交者: ${submittedBy}, 已提交記錄數: ${existingSubmittedData.length}`);
                return res.status(400).json({
                    success: false,
                    message: '不得重新提交更表',
                    details: '該月份更表已經提交給主管審核，無法重複提交'
                });
            }
        }
        
        // 先刪除該教練在指定月份的所有現有更表
        await rosterCollection.deleteMany({
            phone: phone,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });
        
        console.log(`🗑️ 刪除現有更表 - 月份: ${month}, 教練: ${phone}`);
        
        // 🔥 修復：正確設置 isConfirmed 狀態
        // 如果主管審核通過，則設置 isConfirmed 為 true
        const finalIsConfirmed = (supervisorApproved === true && submittedBy === 'supervisor') ? true : 
                                 (isConfirmed !== undefined ? isConfirmed : false);
        
        console.log(`🔍 確認狀態設置:`, {
            supervisorApproved,
            submittedBy,
            isConfirmed,
            finalIsConfirmed
        });
        
        // 插入新的更表數據
        const rosterData = entries.map(entry => ({
            phone: phone,
            name: correctName, // 使用從 Admin_account 獲取的正確 name
            date: new Date(entry.date),
            time: entry.time || '',
            location: entry.location || '',
            supervisorApproved: supervisorApproved !== undefined ? supervisorApproved : false, // 審核狀態
            submittedBy: submittedBy !== undefined ? submittedBy : 'unknown', // 提交者
            isSubmitted: isSubmitted !== undefined ? isSubmitted : false, // 是否已提交
            isConfirmed: finalIsConfirmed, // 🔥 修復：使用正確的確認狀態
            isClicked: entry.isClicked !== undefined ? entry.isClicked : false, // 是否被點擊選擇
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        
        const result = await rosterCollection.insertMany(rosterData);
        
        console.log(`✅ 成功插入 ${result.insertedCount} 條更表記錄到 Coach_roster 集合`);
        
        // 🔥 修復：驗證插入結果
        if (result.insertedCount !== entries.length) {
            console.error(`❌ 插入數量不匹配: 期望 ${entries.length}, 實際 ${result.insertedCount}`);
            return res.status(500).json({
                success: false,
                message: '更表數據插入不完整',
                details: `期望插入 ${entries.length} 條記錄，實際插入 ${result.insertedCount} 條`
            });
        }
        
        // 驗證插入的數據
        const insertedData = await rosterCollection.find({
            phone: phone,
            date: { $gte: startDate, $lte: endDate }
        }).toArray();
        
        console.log(`🔍 驗證插入結果: 找到 ${insertedData.length} 條記錄`);
        
        // 🔥 修復：驗證查詢結果
        if (insertedData.length !== entries.length) {
            console.error(`❌ 驗證失敗: 查詢到的記錄數 ${insertedData.length} 與插入數 ${result.insertedCount} 不匹配`);
            return res.status(500).json({
                success: false,
                message: '更表數據驗證失敗',
                details: `插入 ${result.insertedCount} 條記錄，但查詢到 ${insertedData.length} 條記錄`
            });
        }
        console.log('📋 插入的數據:', insertedData.map(item => ({
            date: item.date,
            time: item.time,
            location: item.location,
            isSubmitted: item.isSubmitted,
            isConfirmed: item.isConfirmed,
            isClicked: item.isClicked
        })));
        
        res.json({
            success: true,
            message: '更表保存成功',
            count: result.insertedCount,
            name: correctName, // 使用從 Admin_account 獲取的正確 name
            phone: phone,
            supervisorApproved: supervisorApproved !== undefined ? supervisorApproved : false,
            submittedBy: submittedBy !== undefined ? submittedBy : 'unknown',
            isSubmitted: isSubmitted !== undefined ? isSubmitted : false,
            isConfirmed: isConfirmed !== undefined ? isConfirmed : false,
            insertedData: insertedData.length // 添加插入數據數量用於驗證
        });
        
    } catch (error) {
        console.error('❌ 批量保存教練更表失敗:', error);
        
        // 🔥 修復：提供更詳細的錯誤信息
        let errorMessage = '保存更表失敗';
        let errorDetails = error.message;
        
        if (error.name === 'MongoNetworkError') {
            errorMessage = '數據庫連接失敗';
            errorDetails = '無法連接到數據庫服務器';
        } else if (error.name === 'MongoTimeoutError') {
            errorMessage = '數據庫操作超時';
            errorDetails = '數據庫操作時間過長，請稍後重試';
        } else if (error.name === 'MongoServerError') {
            errorMessage = '數據庫服務器錯誤';
            errorDetails = `數據庫錯誤: ${error.message}`;
        } else if (error.name === 'ValidationError') {
            errorMessage = '數據驗證失敗';
            errorDetails = error.message;
        } else if (error.code === 11000) {
            errorMessage = '數據重複錯誤';
            errorDetails = '嘗試插入重複的數據';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: errorDetails,
            errorType: error.name || 'UnknownError',
            timestamp: new Date().toISOString()
        });
    } finally {
        if (client) {
            try {
        await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取工時記錄
app.get('/staff-work-hours/:phone/:year/:month', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone, year, month } = req.params;
        const { location, club } = req.query;
        
        console.log(`📊 獲取工時記錄請求 - 電話: ${phone.substring(0, 3)}***, 年月: ${year}-${month}`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const workHoursCollection = db.collection('Staff_work_hours');
        
        const query = { 
            phone: phone, 
            year: parseInt(year), 
            month: parseInt(month) 
        };
        
        if (location) query.location = location;
        if (club) query.club = club;
        
        console.log(`🔍 查詢條件:`, query);
        
        const workHours = await workHoursCollection.find(query).toArray();
        
        res.json({
            success: true,
            workHours: workHours
        });
        
        console.log(`✅ 返回工時記錄: ${workHours.length}條`);
    } catch (error) {
        console.error('❌ 獲取工時記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取工時記錄失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 批量保存工時記錄
app.post('/staff-work-hours/batch', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { records, submittedBy, submittedByName, submittedByType } = req.body;
        
        console.log(`💾 批量保存工時記錄請求 - 提交者: ${submittedBy.substring(0, 3)}***, 記錄數: ${records.length}`);
        
        // 基本驗證
        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: '工時記錄不能為空'
            });
        }
        
        if (!submittedBy || !submittedByName || !submittedByType) {
            return res.status(400).json({
                success: false,
                message: '提交者信息不完整'
            });
        }
        
        // 驗證記錄格式
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            
            if (!record.phone || !record.workDate || !record.location || !record.club) {
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄缺少必要字段`,
                    details: { index: i, record: record }
                });
            }
            
            // 驗證工時數值
            const timeSlots = ['timeSlot1', 'timeSlot2', 'timeSlot3', 'timeSlot4'];
            for (const slot of timeSlots) {
                if (record[slot] !== undefined && (isNaN(record[slot]) || record[slot] < 0 || record[slot] > 24)) {
                    return res.status(400).json({
                        success: false,
                        message: `第${i+1}條記錄的${slot}工時值無效`,
                        details: { index: i, slot: slot, value: record[slot] }
                    });
                }
            }
            
            // 驗證雜費
            if (record.miscellaneousFee !== undefined && (isNaN(record.miscellaneousFee) || record.miscellaneousFee < 0)) {
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄的雜費金額無效`,
                    details: { index: i, fee: record.miscellaneousFee }
                });
            }
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const workHoursCollection = db.collection('Staff_work_hours');
        
        // 批量插入/更新
        const bulkOps = records.map(record => {
            // 計算總工時
            const totalHours = (record.timeSlot1 || 0) + (record.timeSlot2 || 0) + 
                              (record.timeSlot3 || 0) + (record.timeSlot4 || 0);
            
            return {
                updateOne: {
                    filter: { 
                        phone: record.phone, 
                        workDate: record.workDate,
                        location: record.location,
                        club: record.club
                    },
                    update: {
                        $set: {
                            ...record,
                            totalHours: totalHours,
                            submittedBy: submittedBy,
                            submittedByName: submittedByName,
                            submittedByType: submittedByType,
                            submittedAt: new Date(),
                            lastModifiedAt: new Date(),
                            isActive: true
                        }
                    },
                    upsert: true
                }
            };
        });
        
        const result = await workHoursCollection.bulkWrite(bulkOps);
        
        res.json({
            success: true,
            message: `成功保存 ${result.upsertedCount + result.modifiedCount} 條工時記錄`,
            result: {
                inserted: result.upsertedCount,
                modified: result.modifiedCount,
                matched: result.matchedCount
            }
        });
        
        console.log(`✅ 工時記錄保存完成 - 插入: ${result.upsertedCount}, 修改: ${result.modifiedCount}`);
    } catch (error) {
        console.error('❌ 保存工時記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '保存工時記錄失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取地點泳會組合
app.get('/location-clubs', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('🏊 獲取地點泳會組合請求');
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const locationClubCollection = db.collection('Location_club');
        
        const locationClubs = await locationClubCollection.find({}).toArray();
        
        // 如果沒有數據，返回默認的地點泳會組合
        if (locationClubs.length === 0) {
            const defaultLocationClubs = [
                {
                    location: '九龍公園',
                    clubs: ['泳心', 'BT', '九公']
                },
                {
                    location: '美孚',
                    clubs: ['泳心', '美孚泳會']
                },
                {
                    location: '荔枝角公園',
                    clubs: ['荔枝角泳會', '泳心']
                },
                {
                    location: 'Office',
                    clubs: ['Office']
                }
            ];
            
            res.json({
                success: true,
                locationClubs: defaultLocationClubs
            });
            
            console.log(`⚠️ 使用默認地點泳會組合: ${defaultLocationClubs.length}個`);
            return;
        }
        
        // 將平鋪的數據轉換為分組格式
        const groupedLocationClubs = {};
        locationClubs.forEach(item => {
            const location = item.location;
            const club = item.club;
            
            if (!groupedLocationClubs[location]) {
                groupedLocationClubs[location] = {
                    location: location,
                    clubs: []
                };
            }
            
            if (club && !groupedLocationClubs[location].clubs.includes(club)) {
                groupedLocationClubs[location].clubs.push(club);
            }
        });
        
        // 轉換為數組格式
        const result = Object.values(groupedLocationClubs);
        
        res.json({
            success: true,
            locationClubs: result
        });
        
        console.log(`✅ 返回地點泳會組合: ${result.length}個地點，共${locationClubs.length}條記錄`);
    } catch (error) {
        console.error('❌ 獲取地點泳會組合失敗:', error);
        
        // 如果數據庫查詢失敗，返回默認的地點泳會組合
        const defaultLocationClubs = [
            {
                location: '九龍公園',
                clubs: ['泳心', 'BT', '九公']
            },
            {
                location: '美孚',
                clubs: ['泳心', '美孚泳會']
            },
            {
                location: '荔枝角公園',
                clubs: ['荔枝角泳會', '泳心']
            },
            {
                location: 'Office',
                clubs: ['Office']
            }
        ];
        
        res.json({
            success: true,
            locationClubs: defaultLocationClubs
        });
        
        console.log(`⚠️ 使用默認地點泳會組合: ${defaultLocationClubs.length}個`);
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 404 處理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '端點不存在'
    });
});


// 獲取俱樂部數據
app.get('/clubs', validateApiKeys, async (req, res) => {
    try {
        console.log('🏊 獲取俱樂部數據請求');
        
        // 從環境變量或默認值獲取俱樂部數據
        const clubs = process.env.CLUBS ? 
            JSON.parse(process.env.CLUBS) : 
            [
                '維多利亞公園游泳會',
                '荔枝角公園游泳會',
                '觀塘游泳會',
                '美孚游泳會'
            ];
        
        res.json({
            success: true,
            clubs: clubs
        });
        
        console.log(`✅ 返回俱樂部數據: ${clubs.length}個俱樂部`);
    } catch (error) {
        console.error('❌ 獲取俱樂部數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取俱樂部數據失敗',
            error: error.message
        });
    }
});

// 獲取學生數據
app.get('/students', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('👥 獲取學生數據請求');
        
        // 從 MongoDB 獲取學生數據
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const studentsCollection = db.collection('students');
        
        const students = await studentsCollection.find({}).toArray();
        
        res.json({
            success: true,
            students: students
        });
        
        console.log(`✅ 返回學生數據: ${students.length}個學生`);
    } catch (error) {
        console.error('❌ 獲取學生數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取學生數據失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
    }
});

// 獲取出席數據
app.get('/attendance', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('📊 獲取出席數據請求');
        
        // 從 MongoDB 獲取出席數據
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const attendanceCollection = db.collection('attendance');
        
        const attendance = await attendanceCollection.find({}).toArray();
        
        res.json({
            success: true,
            attendance: attendance
        });
        
        console.log(`✅ 返回出席數據: ${attendance.length}條記錄`);
    } catch (error) {
        console.error('❌ 獲取出席數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取出席數據失敗',
            error: error.message
        });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('❌ 關閉 MongoDB 連接失敗:', closeError);
            }
        }
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
app.listen(PORT, () => {
    console.log(`🚀 API 服務器啟動成功 - 端口: ${PORT}`);
    console.log(`📊 健康檢查: http://localhost:${PORT}/health`);
    console.log(`🔐 登入端點: POST http://localhost:${PORT}/auth/login`);
});

module.exports = app;