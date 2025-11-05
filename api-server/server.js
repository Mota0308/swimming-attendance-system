const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
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

// ✅ 配置 multer 用於文件上傳（內存存儲）
const upload = multer({
    storage: multer.memoryStorage(), // 使用內存存儲，不保存到磁盤
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制文件大小為 10MB
    },
    fileFilter: (req, file, cb) => {
        // 只接受圖片文件
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只支持圖片文件格式：jpeg, jpg, png, gif, webp'));
        }
    }
});

// ✅ 注意：express.json() 必須在 multer 之後，但對於非 multipart 請求才使用
// 對於 multipart/form-data 請求，multer 會處理，不需要 json 解析
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

// 獲取管理員數據（支持分頁）
app.get('/admins', validateApiKeys, async (req, res) => {
    let client;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        console.log('👨‍💼 獲取管理員數據請求', { page, limit });
        
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
                admins: [],
                pagination: {
                    page: 1,
                    limit,
                    total: 0,
                    totalPages: 0,
                    hasMore: false
                }
            });
            return;
        }
        
        // 查詢條件
        const query = { 
            $or: [
                { type: { $in: ['admin', 'supervisor', 'coach'] } },
                { userType: { $in: ['admin', 'supervisor', 'coach'] } }
            ]
        };
        
        // 並行獲取數據和總數
        const [admins, total] = await Promise.all([
            adminsCollection.find(query).skip(skip).limit(limit).toArray(),
            adminsCollection.countDocuments(query)
        ]);
        
        console.log(`📊 查詢到 ${admins.length} 個員工（第${page}頁，共${total}個）`);
        
        res.json({
            success: true,
            admins: admins,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        });
        
        console.log(`✅ 返回管理員數據: ${admins.length}個員工`);
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
            pagination: {
                page: 1,
                limit: 50,
                total: 0,
                totalPages: 0,
                hasMore: false
            },
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

// 獲取地點泳會組合
app.get('/location-clubs', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('📍 獲取地點泳會組合請求');
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const locationClubCollection = db.collection('Location_club');
        
        const locationClubs = await locationClubCollection.find({}).toArray();
        
        // ✅ 處理數據結構：數據庫使用 club（單數），前端需要 clubs（複數數組）
        const formattedLocationClubs = locationClubs.map(item => {
            const location = item.location || '';
            
            // 數據庫中是 club（單數），需要轉換為 clubs（複數數組）
            let clubs = [];
            
            if (item.club) {
                // 如果數據庫有 club 字段，轉換為數組
                clubs = typeof item.club === 'string' ? [item.club] : item.club;
            } else if (item.clubs) {
                // 如果數據庫已有 clubs 字段，使用它
                clubs = item.clubs;
            }
            
            // 確保 clubs 是數組
            if (!Array.isArray(clubs)) {
                clubs = clubs ? [clubs] : [];
            }
            
            return {
                location: location,
                clubs: clubs
            };
        });
        
        console.log(`✅ 返回地點泳會組合: ${formattedLocationClubs.length}個組合`);
        
        // 打印每個地點的詳細信息
        formattedLocationClubs.forEach((lc, index) => {
            console.log(`  ${index + 1}. ${lc.location}: ${lc.clubs.length}個泳會 ${lc.clubs.join(', ')}`);
        });
        
        res.json({
            success: true,
            locationClubs: formattedLocationClubs
        });
    } catch (error) {
        console.error('❌ 獲取地點泳會組合失敗:', error);
        res.json({
            success: true,
            locationClubs: []
        });
    } finally {
        if (client) await client.close();
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
            '堅尼地城游泳池'
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
        // 🔥 修復：支持 "YYYY-MM" 和數字月份兩種格式
        if (month) {
            let targetMonth, targetYear;
            
            // 檢查是否為 "YYYY-MM" 格式
            if (typeof month === 'string' && month.includes('-')) {
                const parts = month.split('-');
                targetYear = parseInt(parts[0]);
                targetMonth = parseInt(parts[1]);
                console.log('📅 解析月份格式 "YYYY-MM":', { month, targetYear, targetMonth });
            } else {
                // 數字月份格式
                targetMonth = parseInt(month);
                targetYear = new Date().getFullYear();
                console.log('📅 解析月份格式 (數字):', { month, targetYear, targetMonth });
            }
            
            // 創建月份範圍的日期查詢
            const startDate = new Date(targetYear, targetMonth - 1, 1);
            const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
            
            query.date = {
                $gte: startDate,
                $lte: endDate
            };
            
            console.log('📅 月份篩選:', { startDate, endDate, targetYear, targetMonth });
        }
        
        // 如果指定了教練電話，添加教練篩選
        if (phone) {
            query.phone = phone;
            console.log('👤 教練篩選:', phone);
        }
        
        console.log('🔍 查詢條件:', query);
        
        const roster = await coachRosterCollection.find(query).toArray();
        
        // 轉換數據格式以匹配前端期望的格式
        const formattedRoster = roster.map(item => {
            const unavailable = item.unavailable !== undefined ? item.unavailable : false;
            // ✅ 為了向後兼容，同時返回 unavailable 和 isClicked（isClicked = unavailable）
            return {
            date: item.date,
            time: item.time || item.timeRange || '',
            location: item.location || item.place || '',
            phone: item.phone || item.coachPhone || '',
            name: item.name || item.studentName || item.coachName || '',
                slot: item.slot || 1, // ✅ 返回 slot 信息（1=上午, 2=中午, 3=下午），如果沒有則默認為 1
                unavailable: unavailable, // 不上班標記
                isClicked: unavailable, // ✅ 向後兼容：isClicked = unavailable（前端可能使用 isClicked）
            supervisorApproved: item.supervisorApproved !== undefined ? item.supervisorApproved : false, // 審核狀態
            submittedBy: item.submittedBy !== undefined ? item.submittedBy : 'unknown', // 提交者
                isSubmitted: item.isSubmitted !== undefined ? item.isSubmitted : false, // 提交狀態
                isConfirmed: item.isConfirmed !== undefined ? item.isConfirmed : false, // 確認狀態
            // 保留原始數據以供調試
            _original: item
            };
        });
        
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

// ✅ 數據遷移：為舊的更表記錄添加 slot 字段
app.post('/coach-roster/backfill-slots', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('🔄 開始為舊數據添加 slot 字段...');
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const rosterCollection = db.collection('Coach_roster');
        
        // ✅ 查找所有沒有 slot 字段或 slot 無效的記錄
        const recordsWithoutSlot = await rosterCollection.find({
            $or: [
                { slot: { $exists: false } },
                { slot: null },
                { slot: { $lt: 1 } },
                { slot: { $gt: 3 } }
            ]
        }).toArray();
        
        // ✅ 另外查找所有 slot=1 但有時間信息的記錄（可能是默認值，需要根據時間重新計算）
        const recordsWithSlot1ButHasTime = await rosterCollection.find({
            slot: 1,
            $and: [
                { $or: [
                    { time: { $exists: true, $ne: null, $ne: '' } },
                    { timeRange: { $exists: true, $ne: null, $ne: '' } }
                ]}
            ]
        }).toArray();
        
        // 合併兩組記錄
        const allRecordsToUpdate = [...recordsWithoutSlot, ...recordsWithSlot1ButHasTime];
        
        console.log(`📊 找到 ${allRecordsToUpdate.length} 條需要更新的記錄 (${recordsWithoutSlot.length} 條無slot, ${recordsWithSlot1ButHasTime.length} 條slot=1但有時間)`);
        
        if (allRecordsToUpdate.length === 0) {
            return res.json({
                success: true,
                message: '沒有需要更新的記錄',
                updated: 0
            });
        }
        
        /**
         * 從時間字符串推導時段編號
         * ✅ 改進：正確解析時間範圍，檢查開始和結束時間
         */
        function determineSlotFromTime(timeStr) {
            if (!timeStr || typeof timeStr !== 'string') {
                return 1; // 默認為上午
            }
            
            const timeLower = timeStr.toLowerCase().trim();
            
            // 檢查是否包含時段關鍵字
            if (timeLower.includes('上午') || timeLower.includes('morning') || timeLower.includes('am')) {
                return 1;
            }
            if (timeLower.includes('中午') || timeLower.includes('noon') || timeLower.includes('lunch')) {
                return 2;
            }
            if (timeLower.includes('下午') || timeLower.includes('afternoon') || timeLower.includes('pm')) {
                return 3;
            }
            
            // ✅ 嘗試解析完整時間範圍，格式可能是 "08:00-12:00" 或 "12:00-14:00" 或 "01:00-14:00"
            // 匹配格式：HH:MM-HH:MM 或 HH:MM - HH:MM
            const timeRangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
            
            if (timeRangeMatch) {
                const startHour = parseInt(timeRangeMatch[1]);
                const startMin = parseInt(timeRangeMatch[2]);
                const endHour = parseInt(timeRangeMatch[3]);
                const endMin = parseInt(timeRangeMatch[4]);
                
                // ✅ 優先檢查結束時間（結束時間更能反映時段）
                // 時段定義：
                // - 上午：8:00-11:59 (結束時間 < 12:00)
                // - 中午：12:00-13:59 (結束時間 12:00-13:59)
                // - 下午：14:00-17:59 (結束時間 >= 14:00)
                if (endHour >= 14) {
                    // 結束時間 >= 14:00，判斷為下午
                    console.log(`🔍 解析時間範圍: "${timeStr}" -> 結束=${endHour}:${String(endMin).padStart(2,'0')} (下午時段)`);
                    return 3; // 下午：14:00-18:00
                } else if (endHour >= 12 && endHour < 14) {
                    // 結束時間在 12:00-13:59，判斷為中午
                    console.log(`🔍 解析時間範圍: "${timeStr}" -> 結束=${endHour}:${String(endMin).padStart(2,'0')} (中午時段)`);
                    return 2; // 中午：12:00-14:00
                } else if (endHour >= 8 && endHour < 12) {
                    // 結束時間在 8:00-11:59，判斷為上午
                    console.log(`🔍 解析時間範圍: "${timeStr}" -> 結束=${endHour}:${String(endMin).padStart(2,'0')} (上午時段)`);
                    return 1; // 上午：8:00-12:00
                }
                
                // ✅ 如果結束時間無法確定，使用中間點判斷
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;
                const midMinutes = (startMinutes + endMinutes) / 2;
                const midHour = Math.floor(midMinutes / 60);
                
                console.log(`🔍 解析時間範圍: "${timeStr}" -> 開始=${startHour}:${String(startMin).padStart(2,'0')}, 結束=${endHour}:${String(endMin).padStart(2,'0')}, 中間=${midHour}:${String(Math.round(midMinutes % 60)).padStart(2,'0')}`);
                
                // ✅ 根據中間時間點判斷時段
                if (midHour >= 8 && midHour < 12) {
                    return 1; // 上午：8:00-12:00
                } else if (midHour >= 12 && midHour < 14) {
                    return 2; // 中午：12:00-14:00
                } else if (midHour >= 14 && midHour < 18) {
                    return 3; // 下午：14:00-18:00
                } else if (midHour >= 18 || midHour < 6) {
                    // 晚上或深夜，可能應該是下午時段
                    return 3;
                }
            } else {
                // ✅ 如果沒有完整時間範圍，嘗試匹配單個時間點
                const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
                if (timeMatch) {
                    const hour = parseInt(timeMatch[1]);
                    if (hour >= 8 && hour < 12) {
                        return 1; // 上午：8:00-12:00
                    } else if (hour >= 12 && hour < 14) {
                        return 2; // 中午：12:00-14:00
                    } else if (hour >= 14 && hour < 18) {
                        return 3; // 下午：14:00-18:00
                    }
                }
            }
            
            // 無法確定時，默認為上午
            console.log(`⚠️ 無法確定時段，使用默認值 slot=1 (time: "${timeStr}")`);
            return 1;
        }
        
        // ✅ 批量更新記錄
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const record of allRecordsToUpdate) {
            try {
                const timeStr = record.time || record.timeRange || '';
                const calculatedSlot = determineSlotFromTime(timeStr);
                const currentSlot = record.slot || 1;
                
                // ✅ 如果計算出的slot與當前slot相同，跳過更新（避免不必要的數據庫操作）
                if (calculatedSlot === currentSlot && currentSlot >= 1 && currentSlot <= 3) {
                    console.log(`⏭️ 記錄 ${record._id} 的slot已經是 ${currentSlot}，跳過更新 (time: "${timeStr}")`);
                    continue;
                }
                
                console.log(`🔄 更新記錄 ${record._id}: slot ${currentSlot} -> ${calculatedSlot} (time: "${timeStr}")`);
                
                const result = await rosterCollection.updateOne(
                    { _id: record._id },
                    { 
                        $set: { 
                            slot: calculatedSlot,
                            updatedAt: new Date()
                        } 
                    }
                );
                
                if (result.modifiedCount > 0) {
                    updatedCount++;
                    if (updatedCount <= 10) {
                        console.log(`✅ 更新記錄 _id=${record._id}: time="${timeStr}" -> slot=${calculatedSlot}`);
                    }
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ 更新記錄失敗 _id=${record._id}:`, error);
            }
        }
        
        console.log(`✅ 數據遷移完成：成功更新 ${updatedCount} 條記錄，失敗 ${errorCount} 條記錄`);
        
        res.json({
            success: true,
            message: `數據遷移完成`,
            total: recordsWithoutSlot.length,
            updated: updatedCount,
            errors: errorCount
        });
        
    } catch (error) {
        console.error('❌ 數據遷移失敗:', error);
        res.status(500).json({
            success: false,
            message: '數據遷移失敗',
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

// ✅ 創建試堂記錄並生成 trail_ID（支持批量創建，共享 TrailID）
app.post('/trial-bill/create', validateApiKeys, async (req, res) => {
    let client;
    try {
        // 支持單個學員或多個學員批量創建
        const { students, name, gender, email, phone, age, location, trialTime, trialDate, level, howKnow, platform, notes } = req.body;
        
        // 如果提供了 students 數組，使用批量模式；否則使用單個學員模式（向後兼容）
        let studentList = [];
        if (Array.isArray(students) && students.length > 0) {
            // 批量模式：從 students 數組提取學員資料
            studentList = students;
        } else if (name || gender || phone || email || age || location || trialTime || trialDate || level || howKnow || platform || notes) {
            // 單個學員模式（向後兼容）- ✅ 只要有任一字段填寫就接受
            studentList = [{ name, gender, email, phone, age, location, trialTime, trialDate, level, howKnow, platform, notes }];
        } else {
            return res.status(400).json({
                success: false,
                message: '請至少提供部分學員資料'
            });
        }
        
        // ✅ 所有字段改為非必填，不再驗證必填字段
        
        console.log(`🆕 批量創建試堂記錄: ${studentList.length} 個學員`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const trialBillCollection = db.collection('trail_bill');
        
        // ✅ 生成順序的 trail_ID（格式：T + 6位數字，例如 T000001, T000002...）
        // 所有學員共享同一個 TrailID
        const maxRecordResult = await trialBillCollection.aggregate([
            {
                $match: {
                    trailId: { $regex: /^T\d+$/ }
                }
            },
            {
                $project: {
                    trailId: 1,
                    number: {
                        $toInt: {
                            $substr: ["$trailId", 1, -1]
                        }
                    }
                }
            },
            {
                $sort: { number: -1 }
            },
            {
                $limit: 1
            }
        ]).toArray();
        
        let nextNumber = 1;
        if (maxRecordResult && maxRecordResult.length > 0 && maxRecordResult[0].number) {
            nextNumber = maxRecordResult[0].number + 1;
        }
        
        // 生成新 trail_ID（6位數字，前導零）
        let trailId = `T${String(nextNumber).padStart(6, '0')}`;
        
        // ✅ 驗證生成的 trail_ID 是否已存在（防止並發情況下重複）
        const existingCheck = await trialBillCollection.findOne({ trailId: trailId });
        if (existingCheck) {
            const newMaxResult = await trialBillCollection.aggregate([
                { $match: { trailId: { $regex: /^T\d+$/ } } },
                { $project: { number: { $toInt: { $substr: ["$trailId", 1, -1] } } } },
                { $sort: { number: -1 } },
                { $limit: 1 }
            ]).toArray();
            
            nextNumber = (newMaxResult && newMaxResult.length > 0 && newMaxResult[0].number) 
                ? newMaxResult[0].number + 1 
                : nextNumber + 1;
            trailId = `T${String(nextNumber).padStart(6, '0')}`;
        }
        
        console.log(`📝 生成順序 trail_ID: ${trailId}（${studentList.length} 個學員共享）`);
        
        // 為每個學員創建試堂記錄（共享同一個 TrailID）
        const trialRecords = studentList.map(student => ({
            trailId: trailId,
            name: student.name || '',
            gender: student.gender || '',
            email: student.email || '',
            phone: student.phone || '',
            age: student.age ? parseInt(student.age) : null,
            age_detail: student.age_detail || '',
            location: student.location || '',
            trialTime: student.trialTime || '',
            trialDate: student.trialDate ? new Date(student.trialDate) : new Date(),
            level: student.level || '',
            howKnow: student.howKnow || '',
            platform: student.platform || '',
            notes: student.notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        
        const result = await trialBillCollection.insertMany(trialRecords);
        
        console.log(`✅ 批量試堂記錄創建成功: trailId=${trailId}, 共 ${result.insertedCount} 條記錄`);
        
        res.json({
            success: true,
            message: `成功創建 ${result.insertedCount} 條試堂記錄`,
            trailId: trailId,
            recordIds: Object.values(result.insertedIds),
            count: result.insertedCount
        });
        
    } catch (error) {
        console.error('❌ 創建試堂記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '創建試堂記錄失敗',
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
        console.log('📋 請求體原始數據:', {
            hasEntries: !!req.body.entries,
            entriesCount: req.body.entries?.length,
            phone: req.body.phone,
            name: req.body.name,
            isSubmitted: req.body.isSubmitted,
            isSubmittedType: typeof req.body.isSubmitted,
            isConfirmed: req.body.isConfirmed,
            submittedBy: req.body.submittedBy
        });
        
        const { entries, phone, name, supervisorApproved, submittedBy, isSubmitted, isConfirmed } = req.body;
        
        // 輸入驗證
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({
                success: false,
                message: '更表數據不能為空'
            });
        }
        
        if (!phone || !name) {
            return res.status(400).json({
                success: false,
                message: '教練電話和姓名不能為空'
            });
        }
        
        
        // 驗證姓名長度
        if (name.length < 2 || name.length > 50) {
            return res.status(400).json({
                success: false,
                message: '姓名長度應在2-50字符之間'
            });
        }
        
        // 驗證條目數據
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            
            // ✅ 優先使用 unavailable 字段，如果沒有則使用 isClicked（向後兼容）
            const isUnavailable = entry.unavailable !== undefined ? entry.unavailable : (entry.isClicked === true);
            
            if (!entry.date) {
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄缺少必要字段：date`
                });
            }
            
            // 驗證日期格式
            if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
                return res.status(400).json({
                    success: false,
                    message: `第${i+1}條記錄日期格式不正確`
                });
            }
            
            // 如果標記為「不上班」，跳過 time 和 location 檢查
            if (!isUnavailable && (!entry.time || !entry.location)) {
                console.warn(`⚠️ 第${i+1}條記錄缺少 time 或 location 字段`);
            }
        }
        
        console.log(`📋 保存更表 - 教練: ${name}, 電話: ${phone.substring(0, 3)}***, 條目數: ${entries.length}, 審核狀態: ${supervisorApproved}, 提交者: ${submittedBy}, isSubmitted: ${isSubmitted}, isConfirmed: ${isConfirmed}`);
        
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
        
        // 先刪除該教練在指定月份的所有現有更表
        const month = entries[0]?.date ? new Date(entries[0].date).getMonth() + 1 : new Date().getMonth() + 1;
        const year = entries[0]?.date ? new Date(entries[0].date).getFullYear() : new Date().getFullYear();
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        
        await rosterCollection.deleteMany({
            phone: phone,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });
        
        console.log(`🗑️ 刪除現有更表 - 月份: ${month}, 教練: ${phone}`);
        
        // 插入新的更表數據
        // ✅ 修復：優先從 req.body 讀取 isSubmitted 和 isConfirmed（提交/保存時的全局狀態）
        // 如果 entry 中有，則使用 entry 的值（允許逐條覆蓋，但通常不需要）
        const globalIsSubmitted = isSubmitted !== undefined ? isSubmitted : false;
        const globalIsConfirmed = isConfirmed !== undefined ? isConfirmed : false;
        
        console.log('📋 保存更表 - 狀態值:', { 
            globalIsSubmitted, 
            globalIsConfirmed, 
            submittedBy, 
            supervisorApproved,
            entriesCount: entries.length,
            firstEntryHasIsSubmitted: entries[0]?.isSubmitted !== undefined,
            firstEntryIsSubmitted: entries[0]?.isSubmitted
        });
        
        const rosterData = entries.map(entry => {
            // 決定該條目的 isSubmitted 值
            const entryIsSubmitted = entry.isSubmitted !== undefined ? entry.isSubmitted : globalIsSubmitted;
            const entryIsConfirmed = entry.isConfirmed !== undefined ? entry.isConfirmed : globalIsConfirmed;
            
            // ✅ 優先使用 unavailable 字段，如果沒有則使用 isClicked（向後兼容）
            const entryUnavailable = entry.unavailable !== undefined ? entry.unavailable : (entry.isClicked === true);
            
            return {
            phone: phone,
            name: correctName, // 使用從 Admin_account 獲取的正確 name
            date: new Date(entry.date),
            time: entry.time || '',
            location: entry.location || '',
                slot: entry.slot || 1, // ✅ 保存 slot 信息（1=上午, 2=中午, 3=下午），如果沒有則默認為 1
                unavailable: entryUnavailable, // ✅ 使用 unavailable 字段（優先），否則使用 isClicked
            supervisorApproved: supervisorApproved !== undefined ? supervisorApproved : false, // 審核狀態
            submittedBy: submittedBy !== undefined ? submittedBy : 'unknown', // 提交者
                isSubmitted: entryIsSubmitted, // ✅ 使用決定的值
                isConfirmed: entryIsConfirmed, // ✅ 使用決定的值
            createdAt: new Date(),
            updatedAt: new Date()
            };
        });
        
        // 驗證前幾條記錄的狀態
        console.log('📋 驗證保存數據（前3條）:', rosterData.slice(0, 3).map(r => ({
            date: r.date,
            unavailable: r.unavailable,
            isSubmitted: r.isSubmitted,
            isConfirmed: r.isConfirmed,
            submittedBy: r.submittedBy
        })));
        
        const result = await rosterCollection.insertMany(rosterData);
        
        // ✅ 驗證實際插入的數據
        const insertedRecords = await rosterCollection.find({
            phone: phone,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).limit(3).toArray();
        
        console.log('✅ 實際插入的記錄（驗證）:', insertedRecords.map(r => ({
            date: r.date,
            unavailable: r.unavailable,
            isSubmitted: r.isSubmitted,
            isConfirmed: r.isConfirmed,
            submittedBy: r.submittedBy
        })));
        
        res.json({
            success: true,
            message: '更表保存成功',
            count: result.insertedCount,
            name: correctName, // 使用從 Admin_account 獲取的正確 name
            phone: phone,
            supervisorApproved: supervisorApproved !== undefined ? supervisorApproved : false,
            submittedBy: submittedBy !== undefined ? submittedBy : 'unknown',
            isSubmitted: globalIsSubmitted, // ✅ 返回實際保存的狀態
            isConfirmed: globalIsConfirmed
        });
        
    } catch (error) {
        console.error('❌ 批量保存教練更表失敗:', error);
        res.status(500).json({
            success: false,
            message: '保存更表失敗',
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

// 工時管理 - 獲取工時記錄
app.get('/staff-work-hours/:phone/:year/:month', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone, year, month } = req.params;
        const { location, club, editorType } = req.query;
        
        console.log(`⏰ 獲取工時記錄 - 電話: ${phone.substring(0, 3)}***, 年月: ${year}-${month}, editorType: ${editorType || '全部'}`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Staff_work_hours');
        
        const query = { 
            phone: phone,
            year: parseInt(year),
            month: parseInt(month)
        };
        
        if (location) query.location = location;
        if (club) query.club = club;
        
        // ✅ 如果指定了 editorType，只返回該類型的記錄（用於顯示）
        // 如果不指定，返回所有記錄（用於其他用途，如比較）
        if (editorType) {
            query.editorType = editorType;
            console.log(`🔍 過濾條件: 只返回 editorType=${editorType} 的記錄`);
        }
        
        const workHours = await collection.find(query).toArray();
        
        console.log(`✅ 找到 ${workHours.length} 個工時記錄`);
        
        // ✅ 嚴格驗證：如果指定了 editorType，確保返回的所有記錄都是該類型
        if (editorType && workHours.length > 0) {
            const wrongTypeRecords = workHours.filter(r => r.editorType !== editorType);
            if (wrongTypeRecords.length > 0) {
                console.error(`❌ 錯誤：查詢條件指定 editorType=${editorType}，但返回了 ${wrongTypeRecords.length} 條其他類型的記錄！`);
                console.error(`❌ 錯誤記錄:`, wrongTypeRecords.map(r => ({
                    _id: r._id,
                    workDate: r.workDate,
                    location: r.location,
                    club: r.club,
                    editorType: r.editorType
                })));
                
                // ✅ 過濾掉錯誤類型的記錄，只返回正確類型的記錄
                const correctRecords = workHours.filter(r => r.editorType === editorType);
                console.log(`✅ 已過濾，只返回 ${correctRecords.length} 條 ${editorType} 類型的記錄`);
                
                return res.json({
                    success: true,
                    workHours: correctRecords
                });
            } else {
                console.log(`✅ 所有 ${workHours.length} 條記錄都是 ${editorType} 類型`);
            }
        }
        
        res.json({
            success: true,
            workHours: workHours
        });
    } catch (error) {
        console.error('❌ 獲取工時記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取工時記錄失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// 工時管理 - 批量保存工時記錄
app.post('/staff-work-hours/batch', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { records, submittedBy, submittedByName, submittedByType } = req.body;
        
        console.log(`💾 批量保存工時記錄 - 記錄數: ${records.length}, 提交者: ${submittedByName}, 類型: ${submittedByType}`);
        
        // ✅ 驗證 submittedByType 是否存在
        if (!submittedByType) {
            console.error('❌ submittedByType 為空，無法區分教練和管理員/主管的記錄');
            return res.status(400).json({
                success: false,
                message: '提交者類型不能為空'
            });
        }
        
        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: '工時記錄數據不能為空'
            });
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Staff_work_hours');
        
        // 查找並添加 employeeId（如果缺失）
        if (submittedBy && submittedByType) {
            const adminCollection = db.collection('Admin_account');
            const admin = await adminCollection.findOne({ phone: submittedBy, type: submittedByType });
            
            if (admin && admin.employeeId) {
                records.forEach(record => {
                    if (!record.employeeId) {
                        record.employeeId = admin.employeeId;
                    }
                });
            }
        }
        
        // 批量插入或更新
        const results = [];
        for (const record of records) {
            // ✅ 添加編輯者信息：用於區分是教練自己編輯的記錄還是管理員/主管編輯的記錄
            const recordWithEditor = {
                ...record,
                editorPhone: submittedBy,
                editorName: submittedByName,
                editorType: submittedByType,
                updatedAt: new Date()
            };
            
            // ✅ 規範化 workDate 格式（統一為字符串格式，避免 Date 對象和字符串不匹配的問題）
            let normalizedWorkDate = record.workDate;
            if (record.workDate instanceof Date) {
                normalizedWorkDate = record.workDate.toISOString().split('T')[0];
            } else if (typeof record.workDate === 'string') {
                // 確保格式為 YYYY-MM-DD
                normalizedWorkDate = record.workDate;
            } else {
                console.warn(`⚠️ workDate 格式異常: ${record.workDate}, 類型: ${typeof record.workDate}`);
                normalizedWorkDate = String(record.workDate);
            }
            
            // ✅ 確保 recordWithEditor 中的 workDate 也是字符串格式
            recordWithEditor.workDate = normalizedWorkDate;
            
            // ✅ 先查找現有記錄（處理 workDate 可能是字符串或 Date 對象的情況）
            const baseQuery = {
                phone: record.phone,
                year: record.year,
                month: record.month,
                location: record.location,
                club: record.club || '',
                editorType: submittedByType
            };
            
            // ✅ 查找記錄時，必須同時匹配 editorType（防止更新錯誤類型的記錄）
            // 嘗試多種方式查找記錄，但都必須包含 editorType
            let existingRecord = await collection.findOne({
                ...baseQuery,
                editorType: submittedByType,  // ✅ 必須匹配當前保存的 editorType
                $or: [
                    { workDate: normalizedWorkDate },
                    { workDate: new Date(normalizedWorkDate) }
                ]
            });
            
            // 如果使用 $or 沒找到，嘗試直接用字符串查找
            if (!existingRecord) {
                existingRecord = await collection.findOne({
                    ...baseQuery,
                    editorType: submittedByType,  // ✅ 必須匹配當前保存的 editorType
                    workDate: normalizedWorkDate
                });
            }
            
            // 如果還是沒找到，嘗試用 Date 對象查找
            if (!existingRecord) {
                try {
                    const workDateObj = new Date(normalizedWorkDate);
                    existingRecord = await collection.findOne({
                        ...baseQuery,
                        editorType: submittedByType,  // ✅ 必須匹配當前保存的 editorType
                        workDate: workDateObj
                    });
                } catch (e) {
                    console.warn(`⚠️ 無法將 workDate 轉換為 Date 對象: ${normalizedWorkDate}`);
                }
            }
            
            // ✅ 驗證找到的記錄（如果有的話）確實是當前 editorType
            if (existingRecord && existingRecord.editorType !== submittedByType) {
                console.error(`❌ 查詢邏輯錯誤：找到的記錄 editorType=${existingRecord.editorType}，但查詢條件要求 editorType=${submittedByType}`);
                existingRecord = null;  // 忽略錯誤的記錄
            }
            
            console.log(`🔍 查找記錄: phone=${record.phone}, workDate=${normalizedWorkDate}, location=${record.location}, club=${record.club}, editorType=${submittedByType}`);
            console.log(`🔍 找到記錄: ${existingRecord ? '是' : '否'}`);
            
            // 檢查是否存在舊記錄（沒有 editorType 的記錄）
            const oldRecordQuery = {
                phone: record.phone,
                year: record.year,
                month: record.month,
                location: record.location,
                club: record.club || '',
                editorType: { $exists: false },
                $or: [
                    { workDate: normalizedWorkDate },
                    { workDate: new Date(normalizedWorkDate) }
                ]
            };
            
            const oldRecord = await collection.findOne(oldRecordQuery);
            if (oldRecord) {
                console.log(`⚠️ 發現舊記錄（無 editorType），將刪除並創建新記錄`);
                await collection.deleteOne(oldRecordQuery);
            }
            
            // ✅ 根據是否找到現有記錄，決定更新或插入
            let result;
            
            if (existingRecord) {
                // ✅ 驗證找到的記錄的 editorType 是否與當前保存的 editorType 一致
                if (existingRecord.editorType !== submittedByType) {
                    console.error(`❌ 嚴重錯誤：找到的記錄 editorType=${existingRecord.editorType}，但當前保存的 editorType=${submittedByType}，這不應該發生！`);
                    console.error(`❌ 記錄詳情:`, {
                        _id: existingRecord._id,
                        phone: existingRecord.phone,
                        workDate: existingRecord.workDate,
                        location: existingRecord.location,
                        club: existingRecord.club,
                        existingEditorType: existingRecord.editorType,
                        newEditorType: submittedByType
                    });
                    // 不要更新錯誤類型的記錄，改為插入新記錄
                    console.log(`⚠️ 改為插入新記錄，而不是更新錯誤類型的記錄`);
                    existingRecord = null;  // 將 existingRecord 設為 null，走插入邏輯
                } else {
                    // 找到現有記錄，使用其 _id 進行更新（這樣更可靠）
                    console.log(`🔄 更新現有記錄 _id=${existingRecord._id}, editorType=${existingRecord.editorType}`);
                    result = await collection.updateOne(
                        { _id: existingRecord._id },
                        { 
                            $set: {
                                ...recordWithEditor,
                                updatedAt: new Date()
                            }
                        }
                    );
                }
            }
            
            // ✅ 如果沒有找到現有記錄（或找到的記錄 editorType 不一致），執行插入
            if (!existingRecord) {
                // 沒找到現有記錄，嘗試插入（使用多種查詢方式確保不重複插入）
                console.log(`➕ 插入新記錄`);
                
                // 嘗試使用字符串格式的 workDate 插入
                try {
                    result = await collection.updateOne(
                        {
                            phone: record.phone,
                            year: record.year,
                            month: record.month,
                            location: record.location,
                            club: record.club || '',
                            workDate: normalizedWorkDate,
                            editorType: submittedByType
                        },
                        { 
                            $set: recordWithEditor,
                            $setOnInsert: { createdAt: new Date() }
                        },
                        { upsert: true }
                    );
                } catch (upsertError) {
                    console.warn(`⚠️ 使用字符串格式 upsert 失敗，嘗試其他方式:`, upsertError);
                    // 如果失敗，直接插入
                    try {
                        await collection.insertOne({
                            ...recordWithEditor,
                            createdAt: new Date()
                        });
                        result = { 
                            modifiedCount: 0, 
                            upsertedCount: 1, 
                            matchedCount: 0 
                        };
                    } catch (insertError) {
                        console.error(`❌ 插入記錄失敗:`, insertError);
                        result = { 
                            modifiedCount: 0, 
                            upsertedCount: 0, 
                            matchedCount: 0 
                        };
                    }
                }
            }
            
            console.log(`💾 保存結果: modifiedCount=${result.modifiedCount}, upsertedCount=${result.upsertedCount}, matchedCount=${result.matchedCount}`);
            
            if (result.modifiedCount === 0 && result.upsertedCount === 0) {
                console.error(`❌ 保存失敗：未匹配到記錄且未插入新記錄，記錄: ${record.phone} ${normalizedWorkDate} ${record.location}-${record.club || ''}`);
            }
            console.log(`💾 保存記錄: ${record.phone} ${normalizedWorkDate} ${record.location}-${record.club || ''} [${submittedByType}]`);
            
            results.push(result);
        }
        
        console.log(`✅ 工時記錄保存成功`);
        res.json({
            success: true,
            message: '工時記錄保存成功',
            count: records.length,
            submittedBy: submittedByName
        });
    } catch (error) {
        console.error('❌ 批量保存工時記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '保存工時記錄失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// 工時管理 - 比較工時記錄（教練版本 vs 管理員/主管版本）
app.get('/work-hours/compare/:phone/:year/:month', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone, year, month } = req.params;
        
        console.log(`🔍 比較工時記錄 - 電話: ${phone.substring(0, 3)}***, 年月: ${year}-${month}`);
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Staff_work_hours');
        
        // ✅ 使用 MongoDB 聚合管道優化分組和比對邏輯
        // 直接在數據庫層面進行分組，減少內存使用和提高性能
        const pipeline = [
            {
                $match: {
                    phone: phone,
                    year: parseInt(year),
                    month: parseInt(month)
                }
            },
            {
                $group: {
                    _id: {
                        location: "$location",
                        club: { $ifNull: ["$club", ""] },
                        workDate: {
                            $cond: {
                                if: { $eq: [{ $type: "$workDate" }, "date"] },
                                then: { $dateToString: { format: "%Y-%m-%d", date: "$workDate" } },
                                else: "$workDate"
                            }
                        }
                    },
                    records: { $push: "$$ROOT" }
                }
            }
        ];
        
        const groupedResults = await collection.aggregate(pipeline).toArray();
        
        console.log(`📊 聚合結果: 找到 ${groupedResults.length} 個唯一組合`);
        
        // ✅ 轉換聚合結果為 recordsByKey 格式（保持原有邏輯兼容）
        const recordsByKey = {};
        groupedResults.forEach(group => {
            const key = `${group._id.location}-${group._id.club}-${group._id.workDate}`;
            recordsByKey[key] = group.records;
            // ✅ 減少日誌輸出（只在開發時輸出）
            if (process.env.NODE_ENV !== 'production') {
                console.log(`📦 分組: ${key} [${group.records.map(r => r.editorType).join(', ')}]`);
            }
        });
        
        // 比較結果
        const comparisonResults = [];
        
        Object.entries(recordsByKey).forEach(([key, records]) => {
            // ✅ 減少日誌輸出（只在開發時或記錄數量少時輸出）
            if (process.env.NODE_ENV !== 'production' || records.length <= 3) {
                console.log(`🔍 處理分組 ${key}: ${records.length} 條記錄`, records.map(r => r.editorType));
            }
            
            // 如果有2條記錄，比較它們
            if (records.length === 2) {
                const coachRecord = records.find(r => r.editorType === 'coach');
                const supervisorRecord = records.find(r => r.editorType === 'supervisor');
                const adminRecord = records.find(r => r.editorType === 'admin');
                
                // ✅ 減少日誌輸出
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`🔍 找到記錄 - 教練: ${coachRecord ? '✓' : '✗'}, 主管: ${supervisorRecord ? '✓' : '✗'}, 管理員: ${adminRecord ? '✓' : '✗'}`);
                }
                
                // ✅ 對比規則：
                // 1. 教練記錄（coach）：與管理員或主管編輯該教練的記錄進行比對
                //    - coach vs supervisor（主管編輯教練記錄）
                //    - coach vs admin（管理員編輯該教練記錄）
                // 2. 管理員記錄（admin）：只與主管選擇該管理員的記錄進行比對
                //    - admin vs supervisor（主管編輯該管理員記錄）
                let record1, record2, record1Label, record2Label;
                
                if (coachRecord) {
                    // ✅ 教練記錄：與管理員或主管編輯該教練的記錄進行比對
                    record1 = coachRecord;
                    record1Label = 'coach';
                    
                    // 優先選擇 supervisor（主管編輯教練記錄），如果沒有則選擇 admin（管理員編輯教練記錄）
                    if (supervisorRecord) {
                        record2 = supervisorRecord;
                        record2Label = 'supervisor';
                    } else if (adminRecord) {
                        record2 = adminRecord;
                        record2Label = 'admin';
                    } else {
                        record2 = null;
                    }
                } else if (adminRecord && supervisorRecord) {
                    // ✅ 管理員記錄：只與主管選擇該管理員的記錄進行比對
                    // 管理員自己的工時記錄表只與主管選擇該管理員的工時記錄表進行比對
                    record1 = adminRecord;
                    record1Label = 'admin';
                    record2 = supervisorRecord;
                    record2Label = 'supervisor';
                    console.log(`✅ 管理員記錄：對比 admin vs supervisor（主管編輯該管理員記錄）`);
                } else {
                    record1 = null;
                    record2 = null;
                }
                
                if (record1 && record2) {
                    // ✅ 比較每個字段（無論值是否為0，都進行比較）
                    const differences = {
                        totalHours: record1.totalHours !== record2.totalHours,
                        timeSlot1: record1.timeSlot1 !== record2.timeSlot1,
                        timeSlot2: record1.timeSlot2 !== record2.timeSlot2,
                        timeSlot3: record1.timeSlot3 !== record2.timeSlot3,
                        timeSlot4: record1.timeSlot4 !== record2.timeSlot4,
                        miscellaneousFee: (record1.miscellaneousFee || 0) !== (record2.miscellaneousFee || 0),
                        feeContent: (record1.feeContent || '') !== (record2.feeContent || '')
                    };
                    
                    const hasDifferences = Object.values(differences).some(v => v === true);
                    
                    // ✅ 即使兩個版本都是0，也進行對比並返回結果（以便前端顯示顏色）
                    const formattedWorkDate = records[0].workDate instanceof Date
                        ? records[0].workDate.toISOString().split('T')[0]
                        : records[0].workDate;
                    
                    // ✅ 根據記錄類型設置標籤
                    const value1Label = record1Label === 'coach' ? 'coachValue' : 'adminValue';
                    const value2Label = record2Label === 'admin' ? 'adminValue' : (record2Label === 'supervisor' ? 'supervisorValue' : 'otherValue');
                    
                    comparisonResults.push({
                        key: key, // 格式：location-club-workDate
                        location: records[0].location,
                        club: records[0].club || '',
                        workDate: formattedWorkDate,
                        hasDifferences: hasDifferences,
                        differences: differences,
                        [value1Label]: {
                            totalHours: record1.totalHours,
                            timeSlot1: record1.timeSlot1,
                            timeSlot2: record1.timeSlot2,
                            timeSlot3: record1.timeSlot3,
                            timeSlot4: record1.timeSlot4,
                            miscellaneousFee: record1.miscellaneousFee,
                            feeContent: record1.feeContent
                        },
                        [value2Label]: {
                            totalHours: record2.totalHours,
                            timeSlot1: record2.timeSlot1,
                            timeSlot2: record2.timeSlot2,
                            timeSlot3: record2.timeSlot3,
                            timeSlot4: record2.timeSlot4,
                            miscellaneousFee: record2.miscellaneousFee,
                            feeContent: record2.feeContent
                        },
                        // ✅ 記錄比較的是哪兩個版本（用於調試）
                        comparingVersions: `${record1Label} vs ${record2Label}`
                    });
                    
                    // ✅ 減少日誌輸出（只在有差異時輸出，或開發模式）
                    if (hasDifferences || process.env.NODE_ENV !== 'production') {
                        console.log(`✅ 已對比 ${record1Label} 和 ${record2Label} 版本，差異: ${hasDifferences ? '是' : '否'}`);
                    }
                } else {
                    console.warn(`⚠️ 無法對比：記錄1=${record1 ? record1Label : 'null'}, 記錄2=${record2 ? record2Label : 'null'}`);
                }
            }
            // 如果只有1條記錄，標記為正常（不需要比較）
            else if (records.length === 1) {
                const formattedWorkDate = records[0].workDate instanceof Date
                    ? records[0].workDate.toISOString().split('T')[0]
                    : records[0].workDate;
                
                comparisonResults.push({
                    key: key, // 格式：location-club-workDate
                    location: records[0].location,
                    club: records[0].club || '',
                    workDate: formattedWorkDate,
                    hasDifferences: false,
                    onlyOneVersion: true,
                    editorType: records[0].editorType
                });
                console.log(`ℹ️ 只有一個版本 [${records[0].editorType}]，標記為 onlyOneVersion`);
            }
            // ✅ 如果有多於2條記錄（可能同時有 coach、admin、supervisor），也需要處理
            else if (records.length > 2) {
                const coachRecord = records.find(r => r.editorType === 'coach');
                const supervisorRecord = records.find(r => r.editorType === 'supervisor');
                const adminRecord = records.find(r => r.editorType === 'admin');
                
                console.log(`⚠️ 發現多於2條記錄 (${records.length}條)，嘗試對比...`);
                console.log(`   - Coach: ${coachRecord ? '✓' : '✗'}, Supervisor: ${supervisorRecord ? '✓' : '✗'}, Admin: ${adminRecord ? '✓' : '✗'}`);
                
                // ✅ 對比規則（多於2條記錄的情況）：
                // 1. 教練記錄（coach）：與管理員或主管編輯該教練的記錄進行比對
                //    - coach vs supervisor（主管編輯教練記錄）
                //    - coach vs admin（管理員編輯該教練記錄）
                // 2. 管理員記錄（admin）：只與主管選擇該管理員的記錄進行比對
                //    - admin vs supervisor（主管編輯該管理員記錄）
                let record1, record2, record1Label, record2Label;
                
                if (coachRecord) {
                    // ✅ 教練記錄：與管理員或主管編輯該教練的記錄進行比對
                    record1 = coachRecord;
                    record1Label = 'coach';
                    // 優先選擇 supervisor（主管編輯教練記錄），如果沒有則選擇 admin（管理員編輯教練記錄）
                    if (supervisorRecord) {
                        record2 = supervisorRecord;
                        record2Label = 'supervisor';
                    } else if (adminRecord) {
                        record2 = adminRecord;
                        record2Label = 'admin';
                    }
                } else if (adminRecord && supervisorRecord) {
                    // ✅ 管理員記錄：只與主管選擇該管理員的記錄進行比對
                    // 管理員自己的工時記錄表只與主管選擇該管理員的工時記錄表進行比對
                    record1 = adminRecord;
                    record1Label = 'admin';
                    record2 = supervisorRecord;
                    record2Label = 'supervisor';
                    console.log(`✅ 管理員記錄：對比 admin vs supervisor（主管編輯該管理員記錄，從 ${records.length} 條記錄中選擇）`);
                }
                
                if (record1 && record2) {
                    // ✅ 比較每個字段（無論值是否為0，都進行比較）
                    const differences = {
                        totalHours: record1.totalHours !== record2.totalHours,
                        timeSlot1: record1.timeSlot1 !== record2.timeSlot1,
                        timeSlot2: record1.timeSlot2 !== record2.timeSlot2,
                        timeSlot3: record1.timeSlot3 !== record2.timeSlot3,
                        timeSlot4: record1.timeSlot4 !== record2.timeSlot4,
                        miscellaneousFee: (record1.miscellaneousFee || 0) !== (record2.miscellaneousFee || 0),
                        feeContent: (record1.feeContent || '') !== (record2.feeContent || '')
                    };
                    
                    const hasDifferences = Object.values(differences).some(v => v === true);
                    
                    // ✅ 即使兩個版本都是0，也進行對比並返回結果（以便前端顯示顏色）
                    const formattedWorkDate = records[0].workDate instanceof Date
                        ? records[0].workDate.toISOString().split('T')[0]
                        : records[0].workDate;
                    
                    const value1Label = record1Label === 'coach' ? 'coachValue' : 'adminValue';
                    const value2Label = record2Label === 'admin' ? 'adminValue' : (record2Label === 'supervisor' ? 'supervisorValue' : 'otherValue');
                    
                    comparisonResults.push({
                        key: key,
                        location: records[0].location,
                        club: records[0].club || '',
                        workDate: formattedWorkDate,
                        hasDifferences: hasDifferences,
                        differences: differences,
                        [value1Label]: {
                            totalHours: record1.totalHours,
                            timeSlot1: record1.timeSlot1,
                            timeSlot2: record1.timeSlot2,
                            timeSlot3: record1.timeSlot3,
                            timeSlot4: record1.timeSlot4,
                            miscellaneousFee: record1.miscellaneousFee,
                            feeContent: record1.feeContent
                        },
                        [value2Label]: {
                            totalHours: record2.totalHours,
                            timeSlot1: record2.timeSlot1,
                            timeSlot2: record2.timeSlot2,
                            timeSlot3: record2.timeSlot3,
                            timeSlot4: record2.timeSlot4,
                            miscellaneousFee: record2.miscellaneousFee,
                            feeContent: record2.feeContent
                        },
                        comparingVersions: `${record1Label} vs ${record2Label}`
                    });
                    
                    console.log(`✅ 已對比 ${record1Label} 和 ${record2Label} 版本（從 ${records.length} 條記錄中選擇）`);
                }
            }
        });
        
        const differencesCount = comparisonResults.filter(r => r.hasDifferences).length;
        const oneVersionCount = comparisonResults.filter(r => r.onlyOneVersion).length;
        const matchCount = comparisonResults.length - differencesCount - oneVersionCount;
        
        console.log(`✅ 比較完成: 共 ${comparisonResults.length} 個比較項，差異 ${differencesCount} 處，一致 ${matchCount} 處，單版本 ${oneVersionCount} 處`);
        
        res.json({
            success: true,
            comparisonResults: comparisonResults,
            // ✅ 添加統計信息（可選，前端可用於顯示）
            stats: {
                total: comparisonResults.length,
                differences: differencesCount,
                matches: matchCount,
                oneVersion: oneVersionCount
            }
        });
    } catch (error) {
        console.error('❌ 比較工時記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '比較工時記錄失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// 創建新員工
app.post('/create-employee', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { name, engName, phone, email, password, type, workingType, instructorLevel } = req.body;
        
        console.log(`👤 創建新員工 - 姓名: ${name}, 類型: ${type}, 導師級別: ${instructorLevel ? JSON.stringify(instructorLevel) : '無'}`);
        
        if (!name || !engName || !phone || !type) {
            return res.status(400).json({
                success: false,
                message: '缺少必要的員工信息'
            });
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        // 檢查是否已存在
        const existing = await collection.findOne({ phone: phone });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: '該電話號碼已存在'
            });
        }
        
        // ✅ 生成 employeeId（按數字正確排序，確保唯一性）
        let employeeId;
        const typePrefix = type === 'supervisor' ? 'S' : type === 'coach' ? 'C' : type === 'admin' ? 'A' : 'E';
        
        // ✅ 使用聚合管道按數字部分正確排序，而不是字符串排序
        const latest = await collection.aggregate([
            {
                $match: {
                    employeeId: { $regex: new RegExp(`^${typePrefix}\\d+$`) }
                }
            },
            {
                $project: {
                    employeeId: 1,
                    number: {
                        $toInt: {
                            $substr: ['$employeeId', 1, -1]
                        }
                    }
                }
            },
            {
                $sort: { number: -1 }
            },
            {
                $limit: 1
            }
        ]).toArray();
        
        let newNumber = 1;
        if (latest.length > 0 && latest[0].number) {
            newNumber = latest[0].number + 1;
        }
        
        employeeId = `${typePrefix}${String(newNumber).padStart(4, '0')}`;
        
        // ✅ 驗證生成的 employeeId 是否已存在（防止並發情況下重複）
        const existingCheck = await collection.findOne({ employeeId: employeeId });
        if (existingCheck) {
            // 如果已存在，重新查詢並生成下一個
            console.warn(`⚠️ 生成的 employeeId ${employeeId} 已存在，重新生成...`);
            const reCheck = await collection.aggregate([
                {
                    $match: {
                        employeeId: { $regex: new RegExp(`^${typePrefix}\\d+$`) }
                    }
                },
                {
                    $project: {
                        employeeId: 1,
                        number: {
                            $toInt: {
                                $substr: ['$employeeId', 1, -1]
                            }
                        }
                    }
                },
                {
                    $sort: { number: -1 }
                },
                {
                    $limit: 1
                }
            ]).toArray();
            
            newNumber = (reCheck.length > 0 && reCheck[0].number) ? reCheck[0].number + 1 : newNumber + 1;
            employeeId = `${typePrefix}${String(newNumber).padStart(4, '0')}`;
        }
        
        console.log(`📝 生成 employeeId: ${employeeId} (類型: ${type}, 前綴: ${typePrefix})`);
        
        // 創建員工
        const newEmployee = {
            name: name,
            engName: engName,
            phone: phone,
            email: email || '',
            password: password || phone.substring(phone.length - 4), // 默認密碼為電話後4位
            type: type,
            workingType: workingType || 'full_time',
            employeeId: employeeId,
            instructorLevel: instructorLevel || [], // ✅ 保存導師級別（數組格式，支持多選）
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await collection.insertOne(newEmployee);
        
        console.log(`✅ 員工創建成功 - ID: ${employeeId}`);
        res.json({
            success: true,
            message: '員工創建成功',
            employee: newEmployee
        });
    } catch (error) {
        console.error('❌ 創建員工失敗:', error);
        res.status(500).json({
            success: false,
            message: '創建員工失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// 獲取課程類型
// 獲取課程類型（從 Class_type 集合提取 class_type 字段）
app.get('/class-types', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('📚 獲取課程類型');
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        // ✅ 使用 Class_type 集合（用戶指定）
        const collection = db.collection('Class_type');
        
        const classTypes = await collection.find({}).toArray();
        
        res.json({
            success: true,
            classTypes: classTypes
        });
    } catch (error) {
        console.error('❌ 獲取課程類型失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取課程類型失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// 獲取課堂形式（從 Class_format 集合提取 class_format 字段，根據 classType 過濾）
app.get('/class-formats', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { classType } = req.query;
        console.log('📋 獲取課堂形式', classType ? `- 課程類型: ${classType}` : '');
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        // ✅ 使用 Class_format 集合（用戶指定）
        const collection = db.collection('Class_format');
        
        // ✅ 根據 classType 過濾（如果提供了 classType）
        // 注意：數據庫字段是 class_type，查詢參數是 classType
        const query = classType ? { class_type: classType } : {};
        const classFormats = await collection.find(query).toArray();
        
        res.json({
            success: true,
            classFormats: classFormats
        });
    } catch (error) {
        console.error('❌ 獲取課堂形式失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取課堂形式失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// ✅ 獲取導師級別（從 Instructor_type 集合提取 instructor_level 字段，無前置條件）
app.get('/instructor-levels', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('👥 獲取導師級別（無前置條件）');
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        
        // ✅ 使用 Instructor_type 集合（用戶指定）
        const collection = db.collection('Instructor_type');
        
        // ✅ 獲取所有記錄，不進行過濾
        const instructorLevels = await collection.find({}).toArray();
        
        // ✅ 提取 instructor_level 字段並去重
        const levels = [...new Set(instructorLevels.map(item => item.instructor_level).filter(l => l))];
        
        console.log(`✅ 獲取到 ${levels.length} 個不重複的導師級別`);
        
        res.json({
            success: true,
            instructorLevels: levels.map(level => ({ instructor_level: level }))
        });
    } catch (error) {
        console.error('❌ 獲取導師級別失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取導師級別失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// 獲取價格
app.get('/pricing', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { classType, classFormat, instructorLevel } = req.query;
        console.log('💰 獲取價格', { classType, classFormat, instructorLevel });
        
        if (!classType || !classFormat || !instructorLevel) {
            return res.status(400).json({
                success: false,
                message: '缺少必要的查詢參數'
            });
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Pricing');
        
        // ✅ 數據庫中使用的是 class_type, class_format, instructor_level
        const pricing = await collection.findOne({
            class_type: classType,
            class_format: classFormat,
            instructor_level: instructorLevel
        });
        
        if (pricing) {
            res.json({
                success: true,
                price: pricing.price
            });
        } else {
            res.status(404).json({
                success: false,
                message: '未找到匹配的價格'
            });
        }
    } catch (error) {
        console.error('❌ 獲取價格失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取價格失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// 取得所有 Student_account 資料（不返回密碼，支持分頁和電話查詢）
app.get('/students', validateApiKeys, async (req, res) => {
  let client;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const phone = req.query.phone; // ✅ 支持根據電話查詢
    
    client = new MongoClient(MONGO_BASE_URI);
    await client.connect();
    const db = client.db(DEFAULT_DB_NAME);
    const collection = db.collection('Student_account');
    
    // ✅ 構建查詢條件
    const query = {};
    if (phone) {
      query.phone = phone; // 精確匹配電話號碼
    }
    
    // 並行獲取數據和總數
    const [students, total] = await Promise.all([
      collection.find(query, { projection: { password: 0 } }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query)
    ]);
    
    res.json({ 
      success: true, 
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  } finally { if (client) await client.close(); }
});

// ✅ 取得所有 trial_bill 資料（支持分頁）- 必須在參數路由之前
app.get('/trial-bill/all', validateApiKeys, async (req, res) => {
  let client;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    client = new MongoClient(MONGO_BASE_URI);
    await client.connect();
    const db = client.db(DEFAULT_DB_NAME);
    const collection = db.collection('trail_bill');
    
    // 並行獲取數據和總數
    const [trials, total] = await Promise.all([
      collection.find({}).skip(skip).limit(limit).toArray(),
      collection.countDocuments({})
    ]);
    
    res.json({ 
      success: true, 
      trials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  } finally { if (client) await client.close(); }
});

// 根據 TrailID 查詢試堂資料（必須在 /all 之後，否則會匹配到 /all）
app.get('/trial-bill/:trailId', validateApiKeys, async (req, res) => {
  let client;
  try {
    const { trailId } = req.params;
    
    if (!trailId) {
      return res.status(400).json({
        success: false,
        message: '缺少 TrailID 參數'
      });
    }
    
    client = new MongoClient(MONGO_BASE_URI);
    await client.connect();
    const db = client.db(DEFAULT_DB_NAME);
    const collection = db.collection('trail_bill');
    
    // 查詢該 TrailID 的所有記錄（因為可能有多個學員共享同一個 TrailID）
    const trials = await collection.find({ trailId: trailId }).toArray();
    
    if (trials.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到該 TrailID 的試堂記錄'
      });
    }
    
    res.json({ 
      success: true, 
      trials: trials,
      count: trials.length
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  } finally { if (client) await client.close(); }
});

// ✅ 更新學生資料（PUT）
app.put('/students/:id', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        console.log('💾 更新學生資料請求', { id: id.substring(0, 3) + '***', updateData });
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_account');
        
        // 使用 _id 或 phone 查找
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: new ObjectId(id) } : { phone: id };
        
        const result = await collection.updateOne(
            query,
            { $set: { ...updateData, updatedAt: new Date() } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該學生記錄'
            });
        }
        
        res.json({
            success: true,
            message: '更新成功',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 更新學生資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// ✅ 刪除學生資料（DELETE）
app.delete('/students/:id', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { id } = req.params;
        
        console.log('🗑️ 刪除學生資料請求', { id: id.substring(0, 3) + '***' });
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_account');
        
        // 使用 _id 或 phone 查找
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: new ObjectId(id) } : { phone: id };
        
        const result = await collection.deleteOne(query);
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該學生記錄'
            });
        }
        
        res.json({
            success: true,
            message: '刪除成功',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ 刪除學生資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '刪除失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// ✅ 更新試堂資料（PUT）
app.put('/trial-bill/:id', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { id } = req.params;
        let updateData = req.body;
        
        console.log('💾 更新試堂資料請求', { id: id.substring(0, 6) + '***', updateData });
        
        // ✅ 驗證 _id 格式
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: '無效的記錄ID格式'
            });
        }
        
        // ✅ 過濾掉不應該更新的字段（如 _id, createdAt）
        const { _id, createdAt, ...cleanUpdateData } = updateData;
        
        // ✅ 處理日期字段：如果是字符串格式的日期，轉換為Date對象
        if (cleanUpdateData.trialDate && typeof cleanUpdateData.trialDate === 'string') {
            cleanUpdateData.trialDate = new Date(cleanUpdateData.trialDate);
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('trail_bill');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...cleanUpdateData, updatedAt: new Date() } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該試堂記錄'
            });
        }
        
        res.json({
            success: true,
            message: '更新成功',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 更新試堂資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// ✅ 刪除試堂資料（DELETE）
app.delete('/trial-bill/:id', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { id } = req.params;
        
        console.log('🗑️ 刪除試堂資料請求', { id: id.substring(0, 6) + '***' });
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('trail_bill');
        
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該試堂記錄'
            });
        }
        
        res.json({
            success: true,
            message: '刪除成功',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ 刪除試堂資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '刪除失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// ✅ 刪除用戶/員工（DELETE）
app.delete('/admins/:phone', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone } = req.params;
        
        console.log('🗑️ 刪除用戶請求', { phone: phone.substring(0, 3) + '***' });
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        const result = await collection.deleteOne({ phone: phone });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該用戶記錄'
            });
        }
        
        res.json({
            success: true,
            message: '刪除成功',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ 刪除用戶失敗:', error);
        res.status(500).json({
            success: false,
            message: '刪除失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// ✅ 更新用戶/員工資料（PUT）
app.put('/admins/:phone', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { phone } = req.params;
        const updateData = req.body;
        
        console.log('💾 更新用戶資料請求', { phone: phone.substring(0, 3) + '***', updateData });
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        const result = await collection.updateOne(
            { phone: phone },
            { $set: { ...updateData, updatedAt: new Date() } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該用戶記錄'
            });
        }
        
        res.json({
            success: true,
            message: '更新成功',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 更新用戶資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    } finally {
        if (client) await client.close();
    }
});

// 404 處理（必須在所有路由之後）
app.use('*', (req, res) => {
    console.log(`⚠️ 404 - 端點不存在: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        message: '端點不存在'
    });
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

// 處理未捕獲的錯誤，避免進程崩潰
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕獲的異常:', error);
    // 記錄錯誤但不立即退出，讓服務器有機會恢復
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未處理的 Promise 拒絕:', reason);
    // 記錄錯誤但不立即退出
});

// ✅ 上傳收據圖片端點
// 注意：這個端點必須在 express.json() 之前定義，或者使用 multer 中間件
app.post('/upload-receipt', validateApiKeys, upload.single('receipt'), async (req, res) => {
    try {
        console.log('📤 收到上傳收據圖片請求');
        console.log('📋 Content-Type:', req.headers['content-type']);
        console.log('📋 請求體類型:', typeof req.body);
        console.log('📋 req.file:', req.file ? '存在' : '不存在');
        
        // 檢查是否上傳了文件
        if (!req.file) {
            console.error('❌ 未找到上傳的文件');
            return res.status(400).json({
                success: false,
                message: '請選擇要上傳的圖片文件'
            });
        }
        
        const file = req.file;
        console.log('📋 文件信息:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });
        
        // 將文件轉換為 base64 字符串
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        
        console.log('✅ 收據圖片上傳成功，文件大小:', file.size, 'bytes');
        
        // 返回圖片 URL（base64 格式）
        return res.json({
            success: true,
            imageUrl: base64Image,
            url: base64Image, // 兼容兩種字段名
            message: '圖片上傳成功'
        });
        
    } catch (error) {
        console.error('❌ 上傳收據圖片失敗:', error);
        console.error('❌ 錯誤詳情:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // 處理 multer 錯誤
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: '圖片文件太大，請選擇小於 10MB 的圖片'
                });
            }
            return res.status(400).json({
                success: false,
                message: '文件上傳失敗: ' + error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: '服務器內部錯誤',
            error: error.message
        });
    }
});

// ✅ 創建學生賬單端點（包含收據圖片）
app.post('/create-student-bill', validateApiKeys, async (req, res) => {
    let client;
    try {
        console.log('💾 收到創建學生賬單請求');
        
        const {
            registrationType,
            students,
            location,
            courseType,
            classFormat,
            instructorType,
            instructorName,
            pricePerLesson,
            studentSource,
            referrerName,
            groupDiscount,
            referralDiscount,
            referralNames,
            totalLessons,
            finalPrice,
            message,
            receiptImageUrl,
            timeSlotData
        } = req.body;
        
        // 驗證必填字段
        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: '缺少學生資料'
            });
        }
        
        if (!location || !courseType || !classFormat || !instructorType) {
            return res.status(400).json({
                success: false,
                message: '缺少必要的課程信息'
            });
        }
        
        if (!timeSlotData || !Array.isArray(timeSlotData) || timeSlotData.length === 0) {
            return res.status(400).json({
                success: false,
                message: '缺少時段數據'
            });
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        
        const studentAccountCollection = db.collection('Student_account');
        const studentsTimeslotCollection = db.collection('students_timeslot');
        
        // 處理每個學生
        const studentIds = [];
        for (const student of students) {
            const { name, phone, email, birthday, age, password } = student;
            
            if (!name || !phone) {
                console.warn(`⚠️ 跳過缺少姓名或電話的學生: ${JSON.stringify(student)}`);
                continue;
            }
            
            // 檢查學生是否已存在
            let existingStudent = await studentAccountCollection.findOne({ phone: phone });
            
            if (existingStudent) {
                // 更新現有學生資料
                const updateData = {
                    name: name,
                    updatedAt: new Date()
                };
                if (email) updateData.email = email;
                if (birthday) updateData.birthday = new Date(birthday);
                if (age) updateData.age = parseInt(age);
                
                await studentAccountCollection.updateOne(
                    { phone: phone },
                    { $set: updateData }
                );
                console.log(`✅ 更新現有學生: ${name} (${phone})`);
            } else {
                // 創建新學生
                const newStudent = {
                    name: name,
                    phone: phone,
                    email: email || '',
                    birthday: birthday ? new Date(birthday) : null,
                    age: age ? parseInt(age) : null,
                    password: password || phone.slice(-4), // 使用電話後4位作為默認密碼
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                const result = await studentAccountCollection.insertOne(newStudent);
                console.log(`✅ 創建新學生: ${name} (${phone})`);
                existingStudent = { ...newStudent, _id: result.insertedId };
            }
            
            studentIds.push(existingStudent._id.toString());
        }
        
        // 保存時段數據到 students_timeslot 集合
        const timeslotRecords = [];
        for (const slot of timeSlotData) {
            const {
                classTime,
                weekday,
                lessonsPerDay,
                selectedDates,
                pendingLessons,
                studentIds: slotStudentIds,
                pricePerLesson: slotPricePerLesson,
                receiptImageUrl: slotReceiptImageUrl
            } = slot;
            
            // 為每個學生創建時段記錄
            const studentPhones = slotStudentIds || students.map(s => s.phone);
            
            for (const studentPhone of studentPhones) {
                // 找到對應的學生ID
                const student = await studentAccountCollection.findOne({ phone: studentPhone });
                if (!student) {
                    console.warn(`⚠️ 未找到學生: ${studentPhone}`);
                    continue;
                }
                
                // 為每個選中的日期創建記錄
                for (const dateString of selectedDates || []) {
                    const [year, month, day] = dateString.split('-').map(Number);
                    const classDate = new Date(year, month, day);
                    
                    const timeslotRecord = {
                        studentId: student._id.toString(),
                        studentPhone: studentPhone,
                        location: location,
                        courseType: courseType,
                        classFormat: classFormat,
                        instructorType: instructorType,
                        instructorName: instructorName || '',
                        classTime: classTime || '',
                        weekday: weekday || '',
                        classDate: classDate,
                        lessonsPerDay: lessonsPerDay || 1,
                        pricePerLesson: slotPricePerLesson || pricePerLesson || 225,
                        receiptImageUrl: slotReceiptImageUrl || receiptImageUrl || null,
                        registrationType: registrationType || '學員續報',
                        studentSource: studentSource || '',
                        referrerName: referrerName || '',
                        groupDiscount: groupDiscount || 1,
                        referralDiscount: referralDiscount || 0,
                        referralNames: referralNames || [],
                        totalLessons: totalLessons || 0,
                        finalPrice: finalPrice || 0,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    
                    timeslotRecords.push(timeslotRecord);
                }
                
                // 處理待約堂數（pendingLessons）
                if (pendingLessons && Object.keys(pendingLessons).length > 0) {
                    for (const [monthKey, count] of Object.entries(pendingLessons)) {
                        if (count > 0) {
                            const [year, month] = monthKey.split('-').map(Number);
                            
                            const pendingRecord = {
                                studentId: student._id.toString(),
                                studentPhone: studentPhone,
                                location: location,
                                courseType: courseType,
                                classFormat: classFormat,
                                instructorType: instructorType,
                                instructorName: instructorName || '',
                                classTime: classTime || '',
                                weekday: weekday || '',
                                pendingYear: year,
                                pendingMonth: month,
                                pendingLessons: count,
                                lessonsPerDay: lessonsPerDay || 1,
                                pricePerLesson: slotPricePerLesson || pricePerLesson || 225,
                                receiptImageUrl: slotReceiptImageUrl || receiptImageUrl || null,
                                registrationType: registrationType || '學員續報',
                                studentSource: studentSource || '',
                                referrerName: referrerName || '',
                                groupDiscount: groupDiscount || 1,
                                referralDiscount: referralDiscount || 0,
                                referralNames: referralNames || [],
                                totalLessons: totalLessons || 0,
                                finalPrice: finalPrice || 0,
                                isPending: true,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            };
                            
                            timeslotRecords.push(pendingRecord);
                        }
                    }
                }
            }
        }
        
        // 批量插入時段記錄
        if (timeslotRecords.length > 0) {
            await studentsTimeslotCollection.insertMany(timeslotRecords);
            console.log(`✅ 成功創建 ${timeslotRecords.length} 條時段記錄`);
        }
        
        res.json({
            success: true,
            message: '學生賬單創建成功',
            studentCount: students.length,
            timeslotCount: timeslotRecords.length,
            studentIds: studentIds
        });
        
    } catch (error) {
        console.error('❌ 創建學生賬單失敗:', error);
        res.status(500).json({
            success: false,
            message: '創建學生賬單失敗',
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

// ✅ 保存用戶工時管理隱藏列表頭狀態
app.post('/user-preferences/work-hours-collapse', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { accountPhone, employeePhone, collapseStates } = req.body;
        
        if (!accountPhone || !employeePhone) {
            return res.status(400).json({
                success: false,
                message: '賬號電話和員工電話不能為空'
            });
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('UserPreferences');
        
        // 使用賬號+員工的組合作為唯一鍵
        const preferenceKey = `workHoursCollapseStates-${accountPhone}-${employeePhone}`;
        
        // 更新或插入偏好設置
        await collection.updateOne(
            {
                key: preferenceKey,
                accountPhone: accountPhone,
                employeePhone: employeePhone
            },
            {
                $set: {
                    key: preferenceKey,
                    accountPhone: accountPhone,
                    employeePhone: employeePhone,
                    collapseStates: collapseStates || {},
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
        
        console.log(`✅ 保存用戶偏好設置: ${preferenceKey}`);
        
        res.json({
            success: true,
            message: '偏好設置保存成功'
        });
        
    } catch (error) {
        console.error('❌ 保存用戶偏好設置失敗:', error);
        res.status(500).json({
            success: false,
            message: '保存偏好設置失敗',
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

// ✅ 獲取用戶工時管理隱藏列表頭狀態
app.get('/user-preferences/work-hours-collapse', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { accountPhone, employeePhone } = req.query;
        
        if (!accountPhone || !employeePhone) {
            return res.status(400).json({
                success: false,
                message: '賬號電話和員工電話不能為空'
            });
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('UserPreferences');
        
        // 使用賬號+員工的組合作為唯一鍵
        const preferenceKey = `workHoursCollapseStates-${accountPhone}-${employeePhone}`;
        
        const preference = await collection.findOne({
            key: preferenceKey,
            accountPhone: accountPhone,
            employeePhone: employeePhone
        });
        
        const collapseStates = preference ? (preference.collapseStates || {}) : {};
        
        console.log(`📥 獲取用戶偏好設置: ${preferenceKey}, 狀態數=${Object.keys(collapseStates).length}`);
        
        res.json({
            success: true,
            collapseStates: collapseStates
        });
        
    } catch (error) {
        console.error('❌ 獲取用戶偏好設置失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取偏好設置失敗',
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

// ✅ 清除用戶工時管理隱藏列表頭狀態
app.delete('/user-preferences/work-hours-collapse', validateApiKeys, async (req, res) => {
    let client;
    try {
        const { accountPhone, employeePhone } = req.query;
        
        if (!accountPhone || !employeePhone) {
            return res.status(400).json({
                success: false,
                message: '賬號電話和員工電話不能為空'
            });
        }
        
        client = new MongoClient(MONGO_BASE_URI);
        await client.connect();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('UserPreferences');
        
        // 使用賬號+員工的組合作為唯一鍵
        const preferenceKey = `workHoursCollapseStates-${accountPhone}-${employeePhone}`;
        
        const result = await collection.deleteOne({
            key: preferenceKey,
            accountPhone: accountPhone,
            employeePhone: employeePhone
        });
        
        console.log(`🗑️ 清除用戶偏好設置: ${preferenceKey}, 刪除數量=${result.deletedCount}`);
        
        res.json({
            success: true,
            message: '偏好設置清除成功',
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('❌ 清除用戶偏好設置失敗:', error);
        res.status(500).json({
            success: false,
            message: '清除偏好設置失敗',
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

// 🔥 修復：確保所有路由註冊完成後再啟動服務器
// 啟動服務器 - 使用 0.0.0.0 監聽所有網絡接口（Railway 需要）
// 注意：這個調用必須在所有路由定義之後
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API 服務器啟動成功 - 端口: ${PORT}`);
    console.log(`📊 健康檢查: http://0.0.0.0:${PORT}/health`);
    console.log(`🔐 登入端點: POST http://0.0.0.0:${PORT}/auth/login`);
    console.log(`📤 上傳收據端點: POST http://0.0.0.0:${PORT}/upload-receipt`);
    console.log(`💾 創建學生賬單端點: POST http://0.0.0.0:${PORT}/create-student-bill`);
    console.log(`✅ 所有路由已註冊完成`);
}).on('error', (error) => {
    console.error('❌ 服務器啟動失敗:', error);
    process.exit(1);
});

module.exports = app;