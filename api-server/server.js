const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 配置
const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// API 密鑰配置
const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY || 'ttdrcccy';
const PRIVATE_API_KEY = process.env.PRIVATE_API_KEY || '2b207365-cbf0-4e42-a3bf-f932c84557c4';

// 中間件
app.use(cors());
// ✅ 優化：啟用響應壓縮（gzip），減少傳輸數據量
app.use(compression({
    level: 6, // 壓縮級別（1-9，6是平衡點）
    threshold: 1024, // 只壓縮大於1KB的響應
    filter: (req, res) => {
        // 只壓縮JSON和文本響應
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB 連接池
let mongoClient = null;

async function getMongoClient() {
    if (!mongoClient) {
        mongoClient = new MongoClient(MONGO_BASE_URI, {
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000
        });
        await mongoClient.connect();
        console.log('✅ MongoDB 連接池已創建');
    }
    return mongoClient;
}

// API 密鑰驗證中間件
function validateApiKeys(req, res, next) {
    const publicKey = req.headers['x-api-public-key'] || req.headers['X-API-Public-Key'];
    const privateKey = req.headers['x-api-private-key'] || req.headers['X-API-Private-Key'];
    
    if (publicKey === PUBLIC_API_KEY && privateKey === PRIVATE_API_KEY) {
        next();
    } else {
        console.log('❌ API 密鑰驗證失敗 - IP:', req.ip);
        res.status(401).json({ success: false, message: 'API 密鑰驗證失敗' });
    }
}

// 日期格式化函數
function formatDateToYYYYMMDD(dateValue) {
    if (!dateValue) return null;
    if (typeof dateValue === 'string') {
        // 如果已經是 YYYY-MM-DD 格式，直接返回
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        // 嘗試解析其他格式
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return dateValue;
        return date.toISOString().split('T')[0];
    }
    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
    }
    return dateValue;
}

// ✅ 從 classTime 字符串中提取實際時長（分鐘）
function extractDurationFromClassTime(classTime) {
    if (!classTime || typeof classTime !== 'string') {
        return null;
    }
    
    // 移除空格
    classTime = classTime.trim();
    
    // 支持多種分隔符
    const separators = ['-', '~', '至', '到'];
    let startTime = '';
    let endTime = '';
    
    for (const sep of separators) {
        if (classTime.includes(sep)) {
            const parts = classTime.split(sep);
            if (parts.length >= 2) {
                startTime = parts[0].trim();
                endTime = parts[parts.length - 1].trim();
                break;
            }
        }
    }
    
    if (!startTime || !endTime) {
        return null;
    }
    
    // 解析時間（支持 "09:00" 和 "0900" 格式）
    function parseTime(timeStr) {
        // 移除冒號
        const cleanTime = timeStr.replace(/:/g, '');
        if (cleanTime.length !== 4) {
            return null;
        }
        
        const hours = parseInt(cleanTime.substring(0, 2));
        const minutes = parseInt(cleanTime.substring(2, 4));
        
        if (isNaN(hours) || isNaN(minutes)) {
            return null;
        }
        
        return hours * 60 + minutes; // 轉換為總分鐘數
    }
    
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    if (startMinutes === null || endMinutes === null) {
        return null;
    }
    
    // 計算時長（考慮跨日情況）
    let duration = endMinutes - startMinutes;
    if (duration < 0) {
        duration += 24 * 60; // 跨日情況
    }
    
    return duration;
}

// ✅ 根據基礎時長和實際時長計算 total_time_slot（堂數）
function calculateTotalTimeSlot(baseTimeSlot, actualDuration) {
    if (!baseTimeSlot || !actualDuration) {
        return 1; // 默認 1 堂
    }
    
    // 計算倍數
    const ratio = actualDuration / baseTimeSlot;
    
    // 四捨五入到最接近的 0.5
    const roundedRatio = Math.round(ratio * 2) / 2;
    
    // 確保至少為 0.5 堂
    return Math.max(0.5, roundedRatio);
}

// ✅ 獲取 classFormat 對應的 time_slot（從 Pricing 集合）
async function getTimeSlotForClassFormat(db, classType, classFormat) {
    if (!classType || !classFormat) {
        return null;
    }
    
    try {
        const pricingCollection = db.collection('Pricing');
        // ✅ 從 Pricing 集合查詢，同一 classType + classFormat 組合的 time_slot 應該相同
        const pricingRecord = await pricingCollection.findOne({
            class_type: classType,
            class_format: classFormat
        });
        
        if (pricingRecord && pricingRecord.time_slot) {
            return pricingRecord.time_slot;
        }
        
        return null;
    } catch (error) {
        console.error('❌ 獲取 time_slot 失敗:', error);
        return null;
    }
}

// 根路徑端點
app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: '游泳課程管理系統 API 服務器',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            login: '/auth/login'
        }
    });
});

// 健康檢查端點
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API 服務器運行正常',
        timestamp: new Date().toISOString()
    });
});

// 用戶登入驗證
app.post('/auth/login', validateApiKeys, async (req, res) => {
    try {
        const { phone, password, userType, type } = req.body;
        const loginType = userType || type;
        
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: '電話號碼和密碼不能為空'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        let user = null;
        
        if (loginType === 'coach' || loginType === 'supervisor' || loginType === 'admin' || loginType === 'manager') {
            const collection = db.collection('Admin_account');
            user = await collection.findOne({
                phone: phone,
                password: password,
                type: loginType
            });
            
            if (!user && (loginType === 'coach' || loginType === 'supervisor')) {
                const coachCollection = db.collection('Coach_account');
                user = await coachCollection.findOne({
                    phone: phone,
                    password: password
                });
            }
        } else {
            const collection = db.collection('Coach_account');
            user = await collection.findOne({
                studentPhone: phone,
                password: password
            });
        }
        
        if (user) {
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

// 獲取學生列表（支持分頁）
app.get('/students', validateApiKeys, async (req, res) => {
    try {
        const { page = 1, limit = 50, phone, studentId } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_account');
        
        const query = {};
        // ✅ 支持通過電話號碼查詢
        if (phone) {
            query.phone = phone;
        }
        // ✅ 支持通過學生ID查詢
        if (studentId) {
            query.studentId = studentId;
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await collection.countDocuments(query);
        const students = await collection.find(query, { projection: { password: 0 } })
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
        
        // 格式化日期字段
        students.forEach(student => {
            if (student.birthday) {
                student.birthday = formatDateToYYYYMMDD(student.birthday);
            }
        });
        
        const totalPages = Math.ceil(total / parseInt(limit));
        
        res.json({
            success: true,
            students: students,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: totalPages,
                hasMore: parseInt(page) < totalPages
            }
        });
    } catch (error) {
        console.error('❌ 獲取學生列表失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取學生列表失敗',
            error: error.message
        });
    }
});

// 獲取單個學生資料（GET）
app.get('/students/:id', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_account');
        
        let query;
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            query = { _id: new ObjectId(id) };
        } else if (id.match(/^\d{8}$/)) {
            query = { studentId: id };
        } else {
            query = { phone: id };
        }
        
        const student = await collection.findOne(query, { projection: { password: 0 } });
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: '未找到該學生記錄'
            });
        }
        
        if (student.birthday) {
            student.birthday = formatDateToYYYYMMDD(student.birthday);
        }
        
        res.json({
            success: true,
            student: student
        });
    } catch (error) {
        console.error('❌ 獲取學生資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取失敗',
            error: error.message
        });
    }
});

// 更新用戶信息（PUT）- 別名端點
app.put('/update-user/:phone', validateApiKeys, async (req, res) => {
    try {
        const { phone } = req.params;
        const updateData = req.body;
        
        const client = await getMongoClient();
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
        console.error('❌ 更新用戶信息失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    }
});

// ==================== 地點相關端點 ====================

// 獲取地點列表（從 Location_club 集合）
app.get('/locations', validateApiKeys, async (req, res) => {
    try {
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Location_club');
        
        const locationData = await collection.find({}).toArray();
        const locations = locationData.map(item => item.location || item.name || item.place).filter(Boolean);
        const uniqueLocations = [...new Set(locations)].sort();
        
        res.json({
            success: true,
            locations: uniqueLocations
        });
    } catch (error) {
        console.error('❌ 獲取地點列表失敗:', error);
        res.json({
            success: true,
            locations: ['九龍公園', '美孚', '荔枝角公園', 'Office']
        });
    }
});

// 獲取 Class_location 集合中的地點列表
app.get('/class-locations', validateApiKeys, async (req, res) => {
    try {
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Class_location');
        
        const locationData = await collection.find({}).toArray();
        const locations = locationData.map(item => 
            item.location || item.name || item.place || item.classLocation
        ).filter(Boolean);
        const uniqueLocations = [...new Set(locations)].sort();
        
        res.json({
            success: true,
            locations: uniqueLocations
        });
    } catch (error) {
        console.error('❌ 獲取 Class_location 地點列表失敗:', error);
        res.json({
            success: true,
            locations: ['九龍公園游泳池', '維多利亞公園游泳池', '荔枝角公園游泳池', '觀塘游泳池', '美孚游泳池', '堅尼地城游泳池']
        });
    }
});

// 獲取地點泳會組合
app.get('/location-clubs', validateApiKeys, async (req, res) => {
    try {
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Location_club');
        
        const locationClubs = await collection.find({}).toArray();
        const grouped = {};
        
        locationClubs.forEach(item => {
            const location = item.location || item.name || item.place;
            if (location) {
                if (!grouped[location]) {
                    grouped[location] = [];
                }
                if (item.club && !grouped[location].includes(item.club)) {
                    grouped[location].push(item.club);
                }
            }
        });
        
        const result = Object.keys(grouped).map(location => ({
            location,
            clubs: grouped[location]
        }));
        
        res.json({
            success: true,
            locationClubs: result
        });
    } catch (error) {
        console.error('❌ 獲取地點泳會組合失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取地點泳會組合失敗',
            error: error.message
        });
    }
});

// 獲取泳會列表
app.get('/clubs', validateApiKeys, async (req, res) => {
    try {
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Location_club');
        
        const locationClubs = await collection.find({}).toArray();
        const clubs = locationClubs.map(item => item.club).filter(Boolean);
        const uniqueClubs = [...new Set(clubs)].sort();
        
        res.json({
            success: true,
            clubs: uniqueClubs
        });
    } catch (error) {
        console.error('❌ 獲取泳會列表失敗:', error);
        res.json({
            success: true,
            clubs: ['維多利亞泳會', '荔枝角泳會', '觀塘泳會', '深水埗泳會', '黃大仙泳會']
        });
    }
});

// ==================== 教練相關端點 ====================

// 獲取教練列表
app.get('/coaches', validateApiKeys, async (req, res) => {
    try {
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        const coaches = await collection.find({ type: 'coach' }).toArray();
        
        res.json({
            success: true,
            coaches: coaches
        });
    } catch (error) {
        console.error('❌ 獲取教練列表失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取教練列表失敗',
            error: error.message
        });
    }
});

// ==================== 更表相關端點 ====================

// 獲取更表數據
app.get('/roster', validateApiKeys, async (req, res) => {
    try {
        const { month, phone } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Coach_roster');
        
        const query = {};
        if (month && month.trim() !== '') {
            const targetMonth = parseInt(month);
            const year = new Date().getFullYear();
            const startDate = new Date(year, targetMonth - 1, 1);
            const endDate = new Date(year, targetMonth, 0, 23, 59, 59);
            query.date = { $gte: startDate, $lte: endDate };
        }
        // ✅ 如果沒有指定月份，獲取全年數據
        if (phone) {
            query.phone = phone;
        }
        
        const roster = await collection.find(query).toArray();
        const formattedRoster = roster.map(item => ({
            date: item.date,
            time: item.time || item.timeRange || '',
            location: item.location || item.place || '',
            phone: item.phone || item.coachPhone || '',
            name: item.name || item.coachName || '',
            slot: item.slot || 1, // ✅ 添加時段字段
            unavailable: item.unavailable || false, // ✅ 添加請假字段
            isSubmitted: item.isSubmitted || false // ✅ 添加提交狀態字段
        }));
        
        res.json({
            success: true,
            roster: formattedRoster
        });
    } catch (error) {
        console.error('❌ 獲取更表數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取更表數據失敗',
            error: error.message
        });
    }
});

// ==================== 出席管理相關端點 ====================

// 獲取出席數據
app.get('/attendance', validateApiKeys, async (req, res) => {
    try {
        const { month, location, club } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Attendance');
        
        const query = {};
        if (month) {
            const targetMonth = parseInt(month);
            const year = new Date().getFullYear();
            const startDate = new Date(year, targetMonth - 1, 1);
            const endDate = new Date(year, targetMonth, 0, 23, 59, 59);
            query.date = { $gte: startDate, $lte: endDate };
        }
        if (location) query.location = location;
        if (club) query.club = club;
        
        const attendance = await collection.find(query).toArray();
        
        res.json({
            success: true,
            attendance: attendance
        });
    } catch (error) {
        console.error('❌ 獲取出席數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取出席數據失敗',
            error: error.message
        });
    }
});

// 獲取出席管理數據（按 classDate 和 location 分組）
app.get('/attendance/timeslots', validateApiKeys, async (req, res) => {
    try {
        const { classDate, location } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const timeslotCollection = db.collection('students_timeslot');
        const trialBillCollection = db.collection('trail_bill');
        const studentCollection = db.collection('Student_account');
        
        console.log('📊 出席管理查詢參數:', { classDate, location });
        
        // ==================== 1. 查詢 students_timeslot 集合 ====================
        const timeslotQuery = {
            classDate: { $nin: [null, ''] }, // 只查詢有日期的記錄（排除 null 和空字符串）
            isPending: { $ne: true }  // 排除待約記錄
        };
        
        if (classDate) {
            timeslotQuery.classDate = classDate;
        }
        if (location) {
            timeslotQuery.location = location;
        }
        
        console.log('📊 students_timeslot 查詢條件:', JSON.stringify(timeslotQuery, null, 2));
        
        // 查詢時段記錄
        const timeslots = await timeslotCollection.find(timeslotQuery).toArray();
        console.log(`📊 students_timeslot 查詢結果: ${timeslots.length} 條記錄`);
        
        // ==================== 2. 查詢 trail_bill 集合 ====================
        const trialQuery = {
            trialDate: { $nin: [null, ''] } // 只查詢有日期的記錄（排除 null 和空字符串）
        };
        
        if (classDate) {
            // 格式化日期以確保匹配
            const formattedDate = formatDateToYYYYMMDD(classDate);
            trialQuery.trialDate = formattedDate || classDate;
        }
        if (location) {
            trialQuery.location = location;
        }
        
        console.log('📊 trail_bill 查詢條件:', JSON.stringify(trialQuery, null, 2));
        
        // 查詢試堂記錄
        const trialBills = await trialBillCollection.find(trialQuery).toArray();
        console.log(`📊 trail_bill 查詢結果: ${trialBills.length} 條記錄`);
        
        // ==================== 3. 合併數據 ====================
        // 將 trail_bill 記錄轉換為與 students_timeslot 相同的格式
        const convertedTrials = trialBills.map(trial => {
            // 格式化日期
            const formattedDate = formatDateToYYYYMMDD(trial.trialDate) || trial.trialDate;
            
            // 處理時間格式（trail_bill 可能使用不同的時間格式）
            let classTime = trial.trialTime || trial.time || '';
            // 如果時間格式包含換行或分號，取第一個時間段
            if (classTime && (classTime.includes('\n') || classTime.includes(';') || classTime.includes('，'))) {
                classTime = classTime.split(/[\n;，,]/)[0].trim();
            }
            
            return {
                _id: trial._id,
                studentId: trial.studentId || '',
                studentPhone: trial.phone || trial.studentPhone || '',
                name: trial.name || '', // 保存原始姓名，用於查找學生信息
                classDate: formattedDate,
                classTime: classTime,
                location: trial.location || '',
                classFormat: trial.classFormat || '試堂',
                instructorType: trial.instructorType || '',
                instructorName: trial.instructorName || '',
                isAttended: trial.isAttended || false,
                isLeave: trial.isLeave || false,
                isTrialBill: true, // 標記為試堂記錄
                isPending: false,
                isChangeDate: false,
                isChangeTime: false,
                isChangeLocation: false
            };
        });
        
        // 合併兩個數據源
        const allRecords = [...timeslots, ...convertedTrials];
        console.log(`📊 合併後總記錄數: ${allRecords.length} 條（students_timeslot: ${timeslots.length}, trail_bill: ${trialBills.length}）`);
        
        if (allRecords.length === 0) {
            console.log('⚠️ 沒有找到符合條件的記錄');
            return res.json({
                success: true,
                data: [],
                totalRecords: 0
            });
        }
        
        // ==================== 4. 獲取學生信息 ====================
        // 獲取所有唯一的 studentId 和 phone
        const studentIds = [...new Set(allRecords.map(t => t.studentId).filter(Boolean))];
        const phones = [...new Set(allRecords.map(t => t.studentPhone).filter(Boolean))];
        
        // 批量查詢學生信息（通過 studentId 或 phone）
        const studentQueries = [];
        if (studentIds.length > 0) {
            studentQueries.push({ studentId: { $in: studentIds } });
        }
        if (phones.length > 0) {
            studentQueries.push({ phone: { $in: phones } });
        }
        
        let students = [];
        if (studentQueries.length > 0) {
            students = await studentCollection.find({
                $or: studentQueries
            }).toArray();
        }
        
        // 創建 studentId -> student 和 phone -> student 映射
        const studentMap = {};
        const phoneMap = {};
        students.forEach(s => {
            if (s.studentId) studentMap[s.studentId] = s;
            if (s.phone) phoneMap[s.phone] = s;
        });
        
        // ==================== 5. 批量獲取學生的可約補堂數 ====================
        // ✅ 為了優化性能，批量查詢所有學生的可約補堂數
        const studentBookableMakeupMap = {};
        const uniqueStudentIds = [...new Set(allRecords.map(r => r.studentId).filter(Boolean))];
        
        // ✅ 並行查詢每個學生的可約補堂數（簡化版本：只查詢當前記錄相關的數據）
        const bookableMakeupPromises = uniqueStudentIds.map(async (studentId) => {
            try {
                // ✅ 查詢該學生的待約記錄、請假記錄和上期剩餘記錄
                const pendingCount = await timeslotCollection.countDocuments({
                    studentId: studentId,
                    isPending: true
                });
                
                const leaveCount = await timeslotCollection.countDocuments({
                    studentId: studentId,
                    isLeave: true
                });
                
                // ✅ 簡化計算：可約補堂 = 待約 + 請假（上期剩餘需要更複雜的計算，暫時省略）
                const bookableMakeup = pendingCount + leaveCount;
                return { studentId, bookableMakeup };
            } catch (error) {
                console.error(`❌ 查詢學生 ${studentId} 的可約補堂數失敗:`, error);
                return { studentId, bookableMakeup: 0 };
            }
        });
        
        const bookableMakeupResults = await Promise.all(bookableMakeupPromises);
        bookableMakeupResults.forEach(({ studentId, bookableMakeup }) => {
            studentBookableMakeupMap[studentId] = bookableMakeup;
        });
        
        // ==================== 6. 按 classDate + location 分組 ====================
        const dateLocationGroups = {};
        
        allRecords.forEach(record => {
            const key = `${record.classDate || ''}_${record.location || ''}`;
            if (!dateLocationGroups[key]) {
                dateLocationGroups[key] = {
                    classDate: record.classDate,
                    location: record.location,
                    groups: {}
                };
            }
            
            // 按 classTime + classFormat + instructorType 分組
            const groupKey = `${record.classTime || ''}_${record.classFormat || ''}_${record.instructorType || ''}`;
            if (!dateLocationGroups[key].groups[groupKey]) {
                dateLocationGroups[key].groups[groupKey] = {
                    classTime: record.classTime || '',
                    classFormat: record.classFormat || '',
                    instructorType: record.instructorType || '',
                    instructorName: record.instructorName || '',
                    students: []
                };
            }
            
            // 添加學生信息
            const student = record.studentId ? studentMap[record.studentId] : 
                           record.studentPhone ? phoneMap[record.studentPhone] : null;
            
            // ✅ 計算 isEdited：在isChangeDate，isChangeTime，isChangeLocation都為false情況下，isEdited為false
            const isChangeDate = record.isChangeDate || false;
            const isChangeTime = record.isChangeTime || false;
            const isChangeLocation = record.isChangeLocation || false;
            const isEdited = isChangeDate || isChangeTime || isChangeLocation;
            
            // ✅ 獲取 totalTimeSlot 和 originalTimeSlot
            const totalTimeSlot = record.total_time_slot || record.totalTimeSlot || 0;
            const originalTimeSlot = record.originalTimeSlot || record.original_time_slot || 0;
            
            // ✅ 獲取可約補堂數（從預先計算的映射中獲取）
            const bookableMakeup = studentBookableMakeupMap[record.studentId] || 0;
            
            dateLocationGroups[key].groups[groupKey].students.push({
                recordId: record._id.toString(),
                studentId: record.studentId || '',
                studentName: student?.name || record.name || '未知學生',
                studentPhone: record.studentPhone || student?.phone || '',
                isAttended: record.isAttended,
                isLeave: record.isLeave || false,
                isTrialBill: record.isTrialBill || false,
                originalClassDate: record.classDate,
                originalClassTime: record.classTime,
                originalLocation: record.location,
                originalClassFormat: record.classFormat,
                originalInstructorType: record.instructorType,
                instructorType: record.instructorType || '',
                instructorName: record.instructorName || '',
                isChangeDate: isChangeDate,
                isChangeTime: isChangeTime,
                isChangeLocation: isChangeLocation,
                isEdited: isEdited,
                totalTimeSlot: totalTimeSlot,
                originalTimeSlot: originalTimeSlot,
                bookableMakeup: bookableMakeup
            });
        });
        
        // 轉換為數組格式並排序
        const result = Object.values(dateLocationGroups).map(dlg => {
            // 將 groups 對象轉換為數組
            const groups = Object.values(dlg.groups);
            
            // 按 classTime 排序（支持 "0900-1200" 和 "09:00-12:00" 格式）
            groups.sort((a, b) => {
                const timeA = (a.classTime || '').replace(/:/g, '').replace(/-.*/, '');
                const timeB = (b.classTime || '').replace(/:/g, '').replace(/-.*/, '');
                return timeA.localeCompare(timeB);
            });
            
            return {
                classDate: dlg.classDate,
                location: dlg.location,
                groups: groups
            };
        });
        
        // 按 classDate 排序
        result.sort((a, b) => {
            return (a.classDate || '').localeCompare(b.classDate || '');
        });
        
        const totalRecords = allRecords.length;
        
        console.log(`📊 最終返回: ${result.length} 個日期-地點組合，共 ${totalRecords} 條記錄`);
        
        res.json({
            success: true,
            data: result,
            totalRecords: totalRecords
        });
    } catch (error) {
        console.error('❌ 獲取出席管理數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取出席管理數據失敗',
            error: error.message
        });
    }
});

// 更新學生出席狀態
app.put('/attendance/timeslot/status', validateApiKeys, async (req, res) => {
    try {
        const { recordId, isAttended, isLeave } = req.body;
        
        if (!recordId) {
            return res.status(400).json({
                success: false,
                message: '缺少記錄ID'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        const updateData = {
            updatedAt: new Date()
        };
        
        // ✅ 藍色狀態：isAttended=null, isLeave=null
        if (isAttended !== undefined) {
            if (isAttended === null) {
                updateData.isAttended = null;
            } else {
                updateData.isAttended = isAttended === true;
            }
        }
        if (isLeave !== undefined) {
            if (isLeave === null) {
                updateData.isLeave = null;
            } else {
                updateData.isLeave = isLeave === true;
            }
        }
        
        const result = await collection.updateOne(
            { _id: new ObjectId(recordId) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        res.json({
            success: true,
            message: '更新成功',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 更新出席狀態失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    }
});

// 更新學生時段信息（拖拽移動）
app.put('/attendance/timeslot/move', validateApiKeys, async (req, res) => {
    try {
        const { recordId, classTime, classFormat, instructorType, classDate, location } = req.body;
        
        if (!recordId) {
            return res.status(400).json({
                success: false,
                message: '缺少記錄ID'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // ✅ 先獲取原始記錄，用於比較日期和地點是否改變
        const originalRecord = await collection.findOne({ _id: new ObjectId(recordId) });
        if (!originalRecord) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        const originalDate = originalRecord.classDate || '';
        const originalLocation = originalRecord.location || '';
        const originalTime = originalRecord.classTime || '';
        const originalCourseType = originalRecord.courseType || originalRecord.classType || '';
        const originalClassFormat = originalRecord.classFormat || originalRecord.class_format || '';
        
        // ✅ 判斷日期和地點是否改變
        // 注意：前端可能傳遞原始值（如果用戶沒有修改），所以需要比較實際值
        const dateChanged = classDate !== undefined && String(classDate).trim() !== String(originalDate).trim();
        const locationChanged = location !== undefined && String(location).trim() !== String(originalLocation).trim();
        const timeChanged = classTime !== undefined && String(classTime).trim() !== String(originalTime).trim();
        
        // ✅ 獲取 classFormat（如果修改了則使用新的，否則使用原始的）
        const currentClassFormat = classFormat !== undefined ? classFormat : originalClassFormat;
        const currentCourseType = originalCourseType; // courseType 通常不會在 move 接口中修改
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (classTime !== undefined) {
            updateData.classTime = classTime;
            
            // ✅ 新的邏輯：
            // 1. 如果同時修改了日期或地點，isChangeTime 為 false
            // 2. 如果只修改了時間，需要比較 time_slot：
            //    - 計算原始時間的 time_slot
            //    - 計算新時間的 time_slot
            //    - 如果新的 time_slot > 原始的 time_slot，則 isChangeTime = true
            //    - 否則 isChangeTime = false
            
            if (timeChanged && !dateChanged && !locationChanged) {
                // 只修改了時間，需要與第一次的 time_slot 比較
                try {
                    // 獲取基礎 time_slot（從 Pricing 集合）
                    const baseTimeSlot = await getTimeSlotForClassFormat(db, currentCourseType, currentClassFormat);
                    
                    if (baseTimeSlot) {
                        // ✅ 獲取第一次的 time_slot（如果記錄中沒有 originalTimeSlot，則使用當前時間計算並保存）
                        let firstTimeSlot = originalRecord.originalTimeSlot;
                        
                        if (!firstTimeSlot) {
                            // 如果沒有保存第一次的 time_slot，使用當前時間計算並保存
                            const firstDuration = extractDurationFromClassTime(originalTime);
                            firstTimeSlot = firstDuration ? calculateTotalTimeSlot(baseTimeSlot, firstDuration) : 1;
                            // 保存第一次的 time_slot 到數據庫
                            updateData.originalTimeSlot = firstTimeSlot;
                            console.log(`📝 首次保存第一次的 time_slot: ${firstTimeSlot}`);
                        }
                        
                        // ✅ 計算新時間的實際時長和 time_slot，並更新 total_time_slot
                        const newDuration = extractDurationFromClassTime(classTime);
                        const newTimeSlot = newDuration ? calculateTotalTimeSlot(baseTimeSlot, newDuration) : 1;
                        
                        // ✅ 更新 total_time_slot（後續修改的 time_slot）
                        updateData.total_time_slot = newTimeSlot;
                        // ✅ 保存基礎 time_slot（如果還沒有保存）
                        if (!originalRecord.time_slot) {
                            updateData.time_slot = baseTimeSlot;
                        }
                        
                        // ✅ 與第一次的 time_slot 對比，有變化則為 true，沒變化則為 false
                        if (newTimeSlot !== firstTimeSlot) {
                            updateData.isChangeTime = true;
                            console.log(`✅ 只修改了時間且新 time_slot (${newTimeSlot}) !== 第一次 time_slot (${firstTimeSlot})，設置 isChangeTime = true`);
                        } else {
                            updateData.isChangeTime = false;
                            console.log(`⚠️ 只修改了時間但新 time_slot (${newTimeSlot}) === 第一次 time_slot (${firstTimeSlot})，設置 isChangeTime = false`);
                        }
                    } else {
                        // 如果找不到基礎 time_slot，默認設置為 false
                        updateData.isChangeTime = false;
                        console.warn(`⚠️ 未找到 ${currentCourseType} - ${currentClassFormat} 的 time_slot 配置，設置 isChangeTime = false`);
                    }
                } catch (error) {
                    console.error('❌ 計算 time_slot 失敗:', error);
                    updateData.isChangeTime = false;
                }
            } else {
                // 同時修改了日期或地點，isChangeTime 為 false
                updateData.isChangeTime = false;
                if (timeChanged) {
                    console.log(`⚠️ 修改了時間但同時也修改了日期或地點，設置 isChangeTime = false (時間改變: ${timeChanged}, 日期改變: ${dateChanged}, 地點改變: ${locationChanged})`);
                }
            }
        }
        if (classFormat !== undefined) {
            updateData.classFormat = classFormat;
        }
        if (instructorType !== undefined) {
            updateData.instructorType = instructorType;
        }
        if (classDate !== undefined) {
            // ✅ 只有當日期實際改變時，才更新日期和設置 isChangeDate = true
            if (dateChanged) {
                updateData.classDate = classDate;
                updateData.isChangeDate = true;
            } else {
                // ✅ 如果日期沒有改變，確保 isChangeDate = false（清除之前的標記）
                updateData.isChangeDate = false;
            }
        }
        if (location !== undefined) {
            // ✅ 只有當地點實際改變時，才更新地點和設置 isChangeLocation = true
            if (locationChanged) {
                updateData.location = location;
                updateData.isChangeLocation = true;
            } else {
                // ✅ 如果地點沒有改變，確保 isChangeLocation = false（清除之前的標記）
                updateData.isChangeLocation = false;
            }
        }
        
        // ✅ 計算並更新 isEdited：在isChangeDate，isChangeTime，isChangeLocation都為false情況下，isEdited為false
        const finalIsChangeDate = updateData.isChangeDate !== undefined ? updateData.isChangeDate : (originalRecord.isChangeDate || false);
        const finalIsChangeTime = updateData.isChangeTime !== undefined ? updateData.isChangeTime : (originalRecord.isChangeTime || false);
        const finalIsChangeLocation = updateData.isChangeLocation !== undefined ? updateData.isChangeLocation : (originalRecord.isChangeLocation || false);
        updateData.isEdited = finalIsChangeDate || finalIsChangeTime || finalIsChangeLocation;
        
        const result = await collection.updateOne(
            { _id: new ObjectId(recordId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        res.json({
            success: true,
            message: '更新成功',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 更新學生時段失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    }
});

// 更新學生上課日期和地點
app.put('/attendance/timeslot/date-location', validateApiKeys, async (req, res) => {
    try {
        const { recordId, classDate, location } = req.body;
        
        if (!recordId) {
            return res.status(400).json({
                success: false,
                message: '缺少記錄ID'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // ✅ 先獲取原始記錄，用於比較日期和地點是否改變
        const originalRecord = await collection.findOne({ _id: new ObjectId(recordId) });
        if (!originalRecord) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        const originalDate = originalRecord.classDate || '';
        const originalLocation = originalRecord.location || '';
        
        // ✅ 判斷日期和地點是否實際改變
        const dateChanged = classDate !== undefined && String(classDate).trim() !== String(originalDate).trim();
        const locationChanged = location !== undefined && String(location).trim() !== String(originalLocation).trim();
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (classDate !== undefined) {
            // ✅ 只有當日期實際改變時，才更新日期和設置 isChangeDate = true
            if (dateChanged) {
                updateData.classDate = classDate;
                updateData.isChangeDate = true;
            } else {
                // ✅ 如果日期沒有改變，確保 isChangeDate = false（清除之前的標記）
                updateData.isChangeDate = false;
            }
        }
        if (location !== undefined) {
            // ✅ 只有當地點實際改變時，才更新地點和設置 isChangeLocation = true
            if (locationChanged) {
                updateData.location = location;
                updateData.isChangeLocation = true;
            } else {
                // ✅ 如果地點沒有改變，確保 isChangeLocation = false（清除之前的標記）
                updateData.isChangeLocation = false;
            }
        }
        
        // ✅ 計算並更新 isEdited：在isChangeDate，isChangeTime，isChangeLocation都為false情況下，isEdited為false
        const finalIsChangeDate = updateData.isChangeDate !== undefined ? updateData.isChangeDate : (originalRecord.isChangeDate || false);
        const finalIsChangeTime = originalRecord.isChangeTime || false; // 這個API不修改時間
        const finalIsChangeLocation = updateData.isChangeLocation !== undefined ? updateData.isChangeLocation : (originalRecord.isChangeLocation || false);
        updateData.isEdited = finalIsChangeDate || finalIsChangeTime || finalIsChangeLocation;
        
        const result = await collection.updateOne(
            { _id: new ObjectId(recordId) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        res.json({
            success: true,
            message: '更新成功',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 更新學生日期/地點失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    }
});

// 更新試堂記錄出席狀態
app.put('/attendance/trial-bill/status', validateApiKeys, async (req, res) => {
    try {
        const { recordId, isAttended, isLeave } = req.body;
        
        if (!recordId) {
            return res.status(400).json({
                success: false,
                message: '缺少記錄ID'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('trail_bill');
        
        const updateData = {
            updatedAt: new Date()
        };
        
        // ✅ 藍色狀態：isAttended=null, isLeave=null
        if (isAttended !== undefined) {
            if (isAttended === null) {
                updateData.isAttended = null;
            } else {
                updateData.isAttended = isAttended === true;
            }
        }
        if (isLeave !== undefined) {
            if (isLeave === null) {
                updateData.isLeave = null;
            } else {
                updateData.isLeave = isLeave === true;
            }
        }
        
        const result = await collection.updateOne(
            { _id: new ObjectId(recordId) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        res.json({
            success: true,
            message: '更新成功',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 更新試堂記錄出席狀態失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    }
});

// ✅ 刪除學生時段記錄
app.delete('/attendance/timeslot/delete', validateApiKeys, async (req, res) => {
    try {
        const { recordId } = req.body;
        
        if (!recordId) {
            return res.status(400).json({
                success: false,
                message: '缺少記錄ID'
            });
        }
        
        // ✅ 驗證 recordId 格式是否為有效的 ObjectId
        if (!ObjectId.isValid(recordId)) {
            return res.status(400).json({
                success: false,
                message: '無效的記錄ID格式'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        const result = await collection.deleteOne({ _id: new ObjectId(recordId) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        console.log(`✅ 已刪除學生時段記錄: ${recordId}`);
        res.json({
            success: true,
            message: '刪除成功',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ 刪除學生時段記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '刪除失敗',
            error: error.message
        });
    }
});

// ✅ 刪除試堂記錄
app.delete('/attendance/trial-bill/delete', validateApiKeys, async (req, res) => {
    try {
        const { recordId } = req.body;
        
        if (!recordId) {
            return res.status(400).json({
                success: false,
                message: '缺少記錄ID'
            });
        }
        
        // ✅ 驗證 recordId 格式是否為有效的 ObjectId
        if (!ObjectId.isValid(recordId)) {
            return res.status(400).json({
                success: false,
                message: '無效的記錄ID格式'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('trail_bill');
        
        const result = await collection.deleteOne({ _id: new ObjectId(recordId) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        console.log(`✅ 已刪除試堂記錄: ${recordId}`);
        res.json({
            success: true,
            message: '刪除成功',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ 刪除試堂記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '刪除失敗',
            error: error.message
        });
    }
});

// ✅ 獲取學生的課程類型列表（從students_timeslot中獲取）
app.get('/student/:studentId/course-types', validateApiKeys, async (req, res) => {
    try {
        const { studentId } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // 查詢該學生的所有記錄，獲取唯一的課程類型
        const records = await collection.find({ studentId: studentId }).toArray();
        const courseTypes = [...new Set(records.map(r => r.courseType).filter(Boolean))];
        
        res.json({
            success: true,
            courseTypes: courseTypes.sort()
        });
    } catch (error) {
        console.error('❌ 獲取學生課程類型失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取課程類型失敗',
            error: error.message
        });
    }
});

// ✅ 檢查學生是否有多餘的待約堂數可以創建
app.get('/student/:studentId/pending-slots-check', validateApiKeys, async (req, res) => {
    try {
        const { studentId } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // 查詢該學生所有 isPending === true 的記錄
        const pendingRecords = await collection.find({
            studentId: studentId,
            isPending: true
        }).toArray();
        
        const hasPendingSlots = pendingRecords.length > 0;
        
        res.json({
            success: true,
            hasPendingSlots: hasPendingSlots,
            pendingCount: pendingRecords.length
        });
    } catch (error) {
        console.error('❌ 檢查待約堂數失敗:', error);
        res.status(500).json({
            success: false,
            message: '檢查待約堂數失敗',
            error: error.message
        });
    }
});

// ✅ 創建待補課程（更新isPending為true的記錄）
app.post('/attendance/pending-class/create', validateApiKeys, async (req, res) => {
    try {
        const { studentId, classDate, courseType, classTime, location } = req.body;
        
        if (!studentId || !classDate || !courseType || !classTime || !location) {
            return res.status(400).json({
                success: false,
                message: '缺少必要參數：studentId, classDate, courseType, classTime, location'
            });
        }
        
        // 驗證時間格式 (hhmm-hhmm)
        if (!/^\d{4}-\d{4}$/.test(classTime)) {
            return res.status(400).json({
                success: false,
                message: '時間格式錯誤，應為 hhmm-hhmm (例如: 0900-1000)'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // 查找該學生的一個isPending為true的記錄
        const pendingRecord = await collection.findOne({
            studentId: studentId,
            isPending: true
        });
        
        if (!pendingRecord) {
            return res.status(404).json({
                success: false,
                message: '該學生沒有待約記錄（isPending為true的記錄）'
            });
        }
        
        // ✅ 解析時間格式 hhmm-hhmm (例如: 0900-1000)
        // 保存為原始格式 hhmm-hhmm，不轉換為 hh:mm-hh:mm
        // 因為數據庫中可能已經使用這種格式
        
        // 更新記錄
        const updateData = {
            classDate: classDate,
            courseType: courseType,
            classTime: classTime, // 保持原始格式 hhmm-hhmm
            location: location, // ✅ 添加地點
            isPending: false,
            updatedAt: new Date()
        };
        
        const result = await collection.updateOne(
            { _id: pendingRecord._id },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該記錄'
            });
        }
        
        console.log(`✅ 已更新待補課程: 學生ID=${studentId}, 日期=${classDate}, 課程類型=${courseType}, 時間=${classTime}, 地點=${location}`);
        
        res.json({
            success: true,
            message: '待補課程創建成功',
            recordId: pendingRecord._id.toString(),
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 創建待補課程失敗:', error);
        res.status(500).json({
            success: false,
            message: '創建失敗',
            error: error.message
        });
    }
});

// ==================== 工時管理相關端點 ====================

// 獲取工時記錄
app.get('/staff-work-hours/:phone/:year/:month', validateApiKeys, async (req, res) => {
    try {
        const { phone, year, month } = req.params;
        const { location, club, editorType } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Staff_work_hours');
        
        const query = {
            phone: phone,
            year: parseInt(year),
            month: parseInt(month)
        };
        if (location) query.location = location;
        if (club) query.club = club;
        if (editorType) query.editorType = editorType;
        
        const workHours = await collection.find(query).toArray();
        
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
    }
});

// 批量保存工時記錄
app.post('/staff-work-hours/batch', validateApiKeys, async (req, res) => {
    try {
        const { records, submittedBy, submittedByName, submittedByType } = req.body;
        
        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: '記錄不能為空'
            });
        }
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Staff_work_hours');
        
        const operations = records.map(record => ({
            updateOne: {
                filter: {
                    phone: record.phone,
                    workDate: record.workDate,
                    editorType: record.editorType
                },
                update: {
                    $set: {
                        ...record,
                        submittedBy,
                        submittedByName,
                        submittedByType,
                        updatedAt: new Date()
                    }
                },
                upsert: true
            }
        }));
        
        const result = await collection.bulkWrite(operations);
        
        res.json({
            success: true,
            message: '保存成功',
            insertedCount: result.upsertedCount,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ 保存工時記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '保存工時記錄失敗',
            error: error.message
        });
    }
});

// 比較工時記錄
app.get('/work-hours/compare/:phone/:year/:month', validateApiKeys, async (req, res) => {
    try {
        const { phone, year, month } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Staff_work_hours');
        const adminCollection = db.collection('Admin_account');
        
        // ✅ 首先確定員工類型（coach 或 admin）
        // 從 Admin_account 查詢員工信息（所有員工的基本資料都在 Admin_account 裡）
        let employee = await adminCollection.findOne({ phone });
        let employeeType = employee?.type;
        
        // ✅ 如果 Admin_account 中沒有找到，或者類型不確定，從 Staff_work_hours 記錄中推斷
        if (!employeeType) {
            const sampleRecord = await collection.findOne({ phone });
            if (sampleRecord) {
                employeeType = sampleRecord.type || 'coach';
                console.log(`⚠️ Admin_account 中未找到員工，從 Staff_work_hours 推斷類型: ${employeeType}`);
            } else {
                employeeType = 'coach';
            }
        }
        
        // ✅ 如果 Admin_account 中的類型與實際記錄不一致，使用實際記錄中的類型
        const sampleRecord = await collection.findOne({ phone });
        if (sampleRecord && sampleRecord.type && sampleRecord.type !== employeeType) {
            console.log(`⚠️ Admin_account 類型 (${employeeType}) 與實際記錄類型 (${sampleRecord.type}) 不一致，使用實際記錄類型`);
            employeeType = sampleRecord.type;
        }
        
        console.log(`📊 員工類型: ${employeeType}, phone: ${phone}`);
        
        let version1Records = [];
        let version2Records = [];
        
        if (employeeType === 'admin') {
            // ✅ 如果員工是文書職員（admin），則比較：
            // - version1: admin自己編輯的記錄（editorType: 'admin'）
            // - version2: 主管/管理員幫admin編輯的記錄（editorType: 'supervisor' 或 'manager'）
            version1Records = await collection.find({
                phone,
                year: parseInt(year),
                month: parseInt(month),
                $or: [
                    { editorType: 'admin' },
                    { 
                        $and: [
                            { editorType: { $in: [null, ''] } },
                            { $or: [
                                { submittedByType: 'admin' },
                                { type: 'admin' }
                            ]}
                        ]
                    }
                ]
            }).toArray();
            
            version2Records = await collection.find({
                phone,
                year: parseInt(year),
                month: parseInt(month),
                $or: [
                    { editorType: { $in: ['supervisor', 'manager'] } },
                    { 
                        $and: [
                            { editorType: { $in: [null, ''] } },
                            { $or: [
                                { submittedByType: { $in: ['supervisor', 'manager'] } },
                                { type: { $in: ['supervisor', 'manager'] } }
                            ]}
                        ]
                    }
                ]
            }).toArray();
            
            console.log(`📊 比較查詢結果（文書職員）: 自己編輯=${version1Records.length}條, 主管/管理員編輯=${version2Records.length}條`);
        } else if (employeeType === 'manager') {
            // ✅ 如果員工是管理員（manager），則比較：
            // - version1: manager自己編輯的記錄（editorType: 'manager'）
            // - version2: 主管幫manager編輯的記錄（editorType: 'supervisor'）
            version1Records = await collection.find({
                phone,
                year: parseInt(year),
                month: parseInt(month),
                $or: [
                    { editorType: 'manager' },
                    { 
                        $and: [
                            { editorType: { $in: [null, ''] } },
                            { $or: [
                                { submittedByType: 'manager' },
                                { type: 'manager' }
                            ]}
                        ]
                    }
                ]
            }).toArray();
            
            version2Records = await collection.find({
                phone,
                year: parseInt(year),
                month: parseInt(month),
                $or: [
                    { editorType: 'supervisor' },
                    { 
                        $and: [
                            { editorType: { $in: [null, ''] } },
                            { $or: [
                                { submittedByType: 'supervisor' },
                                { type: 'supervisor' }
                            ]}
                        ]
                    }
                ]
            }).toArray();
            
            console.log(`📊 比較查詢結果（管理員）: 自己編輯=${version1Records.length}條, 主管編輯=${version2Records.length}條`);
        } else {
            // ✅ 如果員工是coach，則比較：
            // - version1: coach自己編輯的記錄（editorType: 'coach'）
            // - version2: 主管/文書職員/管理員幫coach編輯的記錄（editorType: 'admin'、'supervisor' 或 'manager'）
            version1Records = await collection.find({
                phone,
                year: parseInt(year),
                month: parseInt(month),
                $or: [
                    { editorType: 'coach' },
                    { 
                        $and: [
                            { editorType: { $in: [null, ''] } },
                            { $or: [
                                { submittedByType: 'coach' },
                                { type: 'coach' }
                            ]}
                        ]
                    }
                ]
            }).toArray();
            
            version2Records = await collection.find({
                phone,
                year: parseInt(year),
                month: parseInt(month),
                $or: [
                    { editorType: { $in: ['admin', 'supervisor', 'manager'] } },
                    { 
                        $and: [
                            { editorType: { $in: [null, ''] } },
                            { $or: [
                                { submittedByType: { $in: ['admin', 'supervisor', 'manager'] } },
                                { type: { $in: ['admin', 'supervisor', 'manager'] } }
                            ]}
                        ]
                    }
                ]
            }).toArray();
            
            console.log(`📊 比較查詢結果（coach）: coach記錄=${version1Records.length}條, admin/supervisor記錄=${version2Records.length}條`);
        }
        
        // ✅ 生成比較結果數組
        // 格式：每個元素包含 key, location, club, workDate, hasDifferences, onlyOneVersion 等字段
        const comparisonMap = new Map();
        
        // ✅ 處理version1記錄（coach自己編輯的記錄，或admin自己編輯的記錄）
        version1Records.forEach(record => {
            const club = record.club || '';
            const key = `${record.location}-${club}-${record.workDate}`;
            if (!comparisonMap.has(key)) {
                comparisonMap.set(key, {
                    key: key,
                    location: record.location,
                    club: club,
                    workDate: record.workDate,
                    version1Record: record,  // ✅ 改為通用名稱
                    version2Record: null,    // ✅ 改為通用名稱
                    hasDifferences: false,
                    onlyOneVersion: true
                });
            } else {
                const comparison = comparisonMap.get(key);
                
                // ✅ 如果已經有version1Record，需要合併或選擇最新的
                if (comparison.version1Record) {
                    // 如果已經有version1Record，比較updatedAt，保留最新的
                    const existingUpdatedAt = comparison.version1Record.updatedAt || new Date(0);
                    const newUpdatedAt = record.updatedAt || new Date(0);
                    if (newUpdatedAt > existingUpdatedAt) {
                        comparison.version1Record = record;
                    }
                } else {
                    comparison.version1Record = record;
                }
                
                // ✅ 只有當version1Record和version2Record都存在時，才設置onlyOneVersion為false並比較
                // ⚠️ 關鍵：必須兩個版本都存在，才能進行對比
                if (comparison.version1Record && comparison.version2Record) {
                    comparison.onlyOneVersion = false;
                    
                    // ✅ 比較兩個版本的差異
                    const version1Total = (comparison.version1Record.totalHours || 0);
                    const version2Total = (comparison.version2Record.totalHours || 0);
                    const version1Misc = (comparison.version1Record.miscellaneousFee || 0);
                    const version2Misc = (comparison.version2Record.miscellaneousFee || 0);
                    
                    if (version1Total !== version2Total || version1Misc !== version2Misc) {
                        comparison.hasDifferences = true;
                        comparison.differences = {
                            totalHours: version1Total !== version2Total,
                            miscellaneousFee: version1Misc !== version2Misc
                        };
                    }
                } else {
                    // ⚠️ 如果只有version1版本，沒有version2版本，則保持onlyOneVersion=true
                    comparison.onlyOneVersion = true;
                    comparison.hasDifferences = false;
                }
            }
        });
        
        // ✅ 處理version2記錄（主管/管理員幫員工編輯的記錄）
        version2Records.forEach(record => {
            const club = record.club || '';
            const key = `${record.location}-${club}-${record.workDate}`;
            if (!comparisonMap.has(key)) {
                comparisonMap.set(key, {
                    key: key,
                    location: record.location,
                    club: club,
                    workDate: record.workDate,
                    version1Record: null,   // ✅ 改為通用名稱
                    version2Record: record,  // ✅ 改為通用名稱
                    hasDifferences: false,
                    onlyOneVersion: true
                });
            } else {
                const comparison = comparisonMap.get(key);
                
                // ✅ 如果已經有version2Record，需要合併或選擇最新的
                if (comparison.version2Record) {
                    // 如果已經有version2Record，比較updatedAt，保留最新的
                    const existingUpdatedAt = comparison.version2Record.updatedAt || new Date(0);
                    const newUpdatedAt = record.updatedAt || new Date(0);
                    if (newUpdatedAt > existingUpdatedAt) {
                        comparison.version2Record = record;
                    }
                } else {
                    comparison.version2Record = record;
                }
                
                // ✅ 只有當version1Record和version2Record都存在時，才設置onlyOneVersion為false並比較
                // ⚠️ 關鍵：必須兩個版本都存在，才能進行對比
                if (comparison.version1Record && comparison.version2Record) {
                    comparison.onlyOneVersion = false;
                    
                    // ✅ 比較兩個版本的差異
                    const version1Total = (comparison.version1Record.totalHours || 0);
                    const version2Total = (comparison.version2Record.totalHours || 0);
                    const version1Misc = (comparison.version1Record.miscellaneousFee || 0);
                    const version2Misc = (comparison.version2Record.miscellaneousFee || 0);
                    
                    if (version1Total !== version2Total || version1Misc !== version2Misc) {
                        comparison.hasDifferences = true;
                        comparison.differences = {
                            totalHours: version1Total !== version2Total,
                            miscellaneousFee: version1Misc !== version2Misc
                        };
                    }
                } else {
                    // ⚠️ 如果只有version2版本，沒有version1版本，則保持onlyOneVersion=true
                    comparison.onlyOneVersion = true;
                    comparison.hasDifferences = false;
                }
            }
        });
        
        // 轉換為數組，並添加向後兼容的字段
        const comparisonResults = Array.from(comparisonMap.values()).map(result => {
            // ✅ 為了向後兼容，同時保留 coachRecord/adminRecord 和 version1Record/version2Record
            if (employeeType === 'admin') {
                // ✅ 對於文書職員（admin）員工：
                // - version1Record: admin自己編輯的記錄
                // - version2Record: 主管/管理員編輯的記錄
                return {
                    ...result,
                    coachRecord: null, // admin員工沒有coach版本
                    adminRecord: result.version1Record, // admin自己編輯的記錄
                    supervisorRecord: result.version2Record // 主管/管理員編輯的記錄
                };
            } else if (employeeType === 'manager') {
                // ✅ 對於管理員（manager）員工：
                // - version1Record: manager自己編輯的記錄
                // - version2Record: 主管編輯的記錄
                return {
                    ...result,
                    coachRecord: null, // manager員工沒有coach版本
                    adminRecord: result.version1Record, // manager自己編輯的記錄
                    supervisorRecord: result.version2Record // 主管編輯的記錄
                };
            } else {
                // ✅ 對於coach員工：
                // - version1Record: coach自己編輯的記錄
                // - version2Record: 主管/文書職員/管理員編輯的記錄
                return {
                    ...result,
                    coachRecord: result.version1Record, // coach自己編輯的記錄
                    adminRecord: result.version2Record, // 主管/文書職員/管理員編輯的記錄
                    supervisorRecord: null // coach員工沒有supervisor版本
                };
            }
        });
        
        res.json({
            success: true,
            comparisonResults: comparisonResults
        });
    } catch (error) {
        console.error('❌ 比較工時記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '比較工時記錄失敗',
            error: error.message
        });
    }
});

// ==================== 管理員相關端點 ====================

// 獲取管理員列表
app.get('/admins', validateApiKeys, async (req, res) => {
    try {
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        const admins = await collection.find({}).toArray();
        
        res.json({
            success: true,
            admins: admins
        });
    } catch (error) {
        console.error('❌ 獲取管理員列表失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取管理員列表失敗',
            error: error.message
        });
    }
});

// 刪除用戶（員工）
app.delete('/admins/:phone', validateApiKeys, async (req, res) => {
    try {
        const { phone } = req.params;
        const client = await getMongoClient();
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
            message: '刪除用戶失敗',
            error: error.message
        });
    }
});

// 創建新員工
app.post('/create-employee', validateApiKeys, async (req, res) => {
    try {
        const employeeData = req.body;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        // 檢查電話是否已存在
        const existing = await collection.findOne({ phone: employeeData.phone });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: '該電話號碼已存在'
            });
        }
        
        // ✅ 如果沒有提供密碼，使用電話號碼的後四位作為密碼
        const phone = employeeData.phone || '';
        const password = employeeData.password || (phone.length >= 4 ? phone.slice(-4) : phone);
        
        // ✅ 生成唯一的 employeeId（8位數字，類似 studentId）
        // 查找當前最大的 employeeId（如果存在 number 字段）或從 employeeId 推斷
        // ✅ 只處理純數字的 employeeId，忽略包含字母的值（如 'A0002'）
        const maxEmployeeResult = await collection.aggregate([
            {
                $match: {
                    $or: [
                        { 
                            employeeId: { 
                                $exists: true, 
                                $ne: null,
                                $regex: /^\d+$/  // ✅ 只匹配純數字
                            } 
                        },
                        { number: { $exists: true, $ne: null } }
                    ]
                }
            },
            {
                $project: {
                    number: {
                        $cond: {
                            if: { 
                                $and: [
                                    { $ne: ['$employeeId', null] }, 
                                    { $ne: ['$employeeId', ''] },
                                    { $regexMatch: { input: { $toString: '$employeeId' }, regex: /^\d+$/ } }  // ✅ 再次驗證是純數字
                                ] 
                            },
                            then: { 
                                $convert: {
                                    input: '$employeeId',
                                    to: 'int',
                                    onError: null,  // ✅ 如果轉換失敗，返回 null
                                    onNull: null
                                }
                            },
                            else: '$number'
                        }
                    }
                }
            },
            {
                $match: {
                    number: { $ne: null, $type: 'number' }  // ✅ 只保留有效的數字
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
        if (maxEmployeeResult && maxEmployeeResult.length > 0 && maxEmployeeResult[0].number) {
            nextNumber = maxEmployeeResult[0].number + 1;
        }
        
        // 確保 employeeId 唯一（檢查是否已存在）
        let newEmployeeId;
        let attempts = 0;
        do {
            newEmployeeId = String(nextNumber).padStart(8, '0');
            const existingCheck = await collection.findOne({ employeeId: newEmployeeId });
            if (!existingCheck) break;
            nextNumber++;
            attempts++;
            if (attempts > 100) {
                throw new Error('無法生成唯一的 employeeId');
            }
        } while (true);
        
        const result = await collection.insertOne({
            ...employeeData,
            employeeId: newEmployeeId, // ✅ 分配唯一的 employeeId
            password: password, // ✅ 使用電話號碼後四位作為密碼
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        res.json({
            success: true,
            message: '創建成功',
            employee: {
                id: result.insertedId,
                ...employeeData,
                password: password // ✅ 返回生成的密碼給前端顯示
            }
        });
    } catch (error) {
        console.error('❌ 創建員工失敗:', error);
        res.status(500).json({
            success: false,
            message: '創建員工失敗',
            error: error.message
        });
    }
});

// ==================== 學生相關端點 ====================

// 更新學生資料
app.put('/students/:id', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_account');
        
        let query;
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            query = { _id: new ObjectId(id) };
        } else if (id.match(/^\d{8}$/)) {
            query = { studentId: id };
        } else {
            query = { phone: id };
        }
        
        if (updateData.birthday && typeof updateData.birthday === 'string') {
            updateData.birthday = new Date(updateData.birthday);
        }
        
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
    }
});

// 刪除學生資料（同時刪除Student_account、Student_bill和students_timeslot）
app.delete('/students/:id', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const studentAccountCollection = db.collection('Student_account');
        const studentBillCollection = db.collection('Student_bill');
        const timeslotCollection = db.collection('students_timeslot');
        
        // 確定查詢條件
        let query;
        let studentId = null;
        let phone = null;
        
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            query = { _id: new ObjectId(id) };
            // 先查找學生信息以獲取studentId和phone
            const student = await studentAccountCollection.findOne(query);
            if (student) {
                studentId = student.studentId;
                phone = student.phone;
            }
        } else if (id.match(/^\d{8}$/)) {
            query = { studentId: id };
            studentId = id;
            // 先查找學生信息以獲取phone
            const student = await studentAccountCollection.findOne(query);
            if (student) {
                phone = student.phone;
            }
        } else {
            query = { phone: id };
            phone = id;
            // 先查找學生信息以獲取studentId
            const student = await studentAccountCollection.findOne(query);
            if (student) {
                studentId = student.studentId;
            }
        }
        
        // 刪除Student_account
        const accountResult = await studentAccountCollection.deleteOne(query);
        
        if (accountResult.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到該學生記錄'
            });
        }
        
        // 刪除Student_bill（如果studentId存在）
        let billDeletedCount = 0;
        if (studentId) {
            const billResult = await studentBillCollection.deleteMany({ studentId: studentId });
            billDeletedCount = billResult.deletedCount;
        }
        
        // 刪除students_timeslot（如果studentId存在）
        let timeslotDeletedCount = 0;
        if (studentId) {
            const timeslotResult = await timeslotCollection.deleteMany({ studentId: studentId });
            timeslotDeletedCount = timeslotResult.deletedCount;
        }
        
        console.log(`✅ 已刪除學生資料: Student_account=${accountResult.deletedCount}, Student_bill=${billDeletedCount}, students_timeslot=${timeslotDeletedCount}`);
        
        res.json({
            success: true,
            message: '刪除成功',
            deletedCount: {
                account: accountResult.deletedCount,
                bill: billDeletedCount,
                timeslot: timeslotDeletedCount
            }
        });
    } catch (error) {
        console.error('❌ 刪除學生資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '刪除失敗',
            error: error.message
        });
    }
});

// ✅ 清除學生的所有時段記錄（students_timeslot）
app.delete('/students/:id/timeslots', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const studentAccountCollection = db.collection('Student_account');
        const timeslotCollection = db.collection('students_timeslot');
        
        // 確定查詢條件
        let query;
        let studentId = null;
        
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            query = { _id: new ObjectId(id) };
            const student = await studentAccountCollection.findOne(query);
            if (student) {
                studentId = student.studentId;
            }
        } else if (id.match(/^\d{8}$/)) {
            studentId = id;
        } else {
            query = { phone: id };
            const student = await studentAccountCollection.findOne(query);
            if (student) {
                studentId = student.studentId;
            }
        }
        
        if (!studentId) {
            return res.status(404).json({
                success: false,
                message: '未找到該學生記錄或缺少studentId'
            });
        }
        
        // 刪除該學生的所有時段記錄
        const result = await timeslotCollection.deleteMany({ studentId: studentId });
        
        console.log(`✅ 已清除學生 ${studentId} 的所有時段記錄: ${result.deletedCount} 條`);
        
        res.json({
            success: true,
            message: '清除成功',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ 清除學生時段記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '清除失敗',
            error: error.message
        });
    }
});

// ==================== 課程相關端點 ====================

// 獲取課堂形式
app.get('/class-formats', validateApiKeys, async (req, res) => {
    try {
        const { classType } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Pricing'); // ✅ 使用 Pricing 集合
        
        const query = classType ? { class_type: classType } : {};
        const pricingRecords = await collection.find(query).toArray();
        
        // ✅ 從 Pricing 集合中提取唯一的 class_format，並構建 classFormats 數組
        const classFormatMap = new Map();
        pricingRecords.forEach(record => {
            const key = `${record.class_type}_${record.class_format}`;
            if (!classFormatMap.has(key)) {
                classFormatMap.set(key, {
                    class_type: record.class_type,
                    class_format: record.class_format,
                    time_slot: record.time_slot || null // ✅ 包含 time_slot
                });
            }
        });
        
        const classFormats = Array.from(classFormatMap.values());
        
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
    }
});

// 獲取導師級別
app.get('/instructor-levels', validateApiKeys, async (req, res) => {
    try {
        const { classType, classFormat } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        // ✅ 使用 Pricing 集合
        const collection = db.collection('Pricing');
        
        // ✅ 如果提供了 classType 和 classFormat，則根據這些條件過濾
        let query = {};
        if (classType && classFormat) {
            query = {
                class_type: classType,
                class_format: classFormat
            };
            console.log(`📋 查詢導師級別: classType="${classType}", classFormat="${classFormat}"`);
            console.log(`📋 查詢條件:`, JSON.stringify(query, null, 2));
        } else {
            console.log('📋 查詢所有導師級別（未提供 classType 和 classFormat）');
        }
        
        // ✅ 先檢查集合中是否有數據
        const totalCount = await collection.countDocuments({});
        console.log(`📊 Pricing 集合總記錄數: ${totalCount}`);
        
        // ✅ 如果集合為空，記錄警告
        if (totalCount === 0) {
            console.warn('⚠️ Pricing 集合為空！請運行 seed-pricing.js 腳本插入數據。');
        }
        
        const pricingRecords = await collection.find(query).toArray();
        
        // ✅ 如果查詢結果為空，嘗試查找類似的記錄來幫助調試
        if (pricingRecords.length === 0 && classType && classFormat) {
            console.warn(`⚠️ 未找到匹配的記錄，嘗試查找類似的記錄...`);
            const similarRecords = await collection.find({
                $or: [
                    { class_type: classType },
                    { class_format: classFormat }
                ]
            }).limit(5).toArray();
            
            if (similarRecords.length > 0) {
                console.warn(`📋 找到 ${similarRecords.length} 條類似的記錄（僅匹配 class_type 或 class_format）:`);
                similarRecords.forEach(r => {
                    console.warn(`  - class_type: "${r.class_type}", class_format: "${r.class_format}", instructor_level: "${r.instructor_level}"`);
                });
            } else {
                console.warn(`⚠️ 集合中沒有任何與 "${classType}" 或 "${classFormat}" 相關的記錄`);
            }
        }
        
        // ✅ 從 Pricing 記錄中提取唯一的 instructor_level，並構建 instructorLevels 數組
        const uniqueLevels = [...new Set(pricingRecords.map(r => r.instructor_level).filter(l => l))];
        const instructorLevels = uniqueLevels.map(level => ({
            class_type: classType || null,
            class_format: classFormat || null,
            level: level, // ✅ 保持向後兼容，使用 level 字段
            instructor_level: level // ✅ 同時提供 instructor_level 字段
        }));
        
        console.log(`✅ 找到 ${pricingRecords.length} 條記錄，${uniqueLevels.length} 個唯一導師級別:`, uniqueLevels);
        
        res.json({
            success: true,
            instructorLevels: instructorLevels,
            uniqueLevels: uniqueLevels  // ✅ 添加唯一級別列表，方便前端使用
        });
    } catch (error) {
        console.error('❌ 獲取導師級別失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取導師級別失敗',
            error: error.message
        });
    }
});

// 獲取價格
app.get('/pricing', validateApiKeys, async (req, res) => {
    try {
        const { classType, classFormat, instructorLevel } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Pricing');
        
        // ✅ 修复：使用正确的字段名（class_type, class_format, instructor_level）
        const pricing = await collection.findOne({
            class_type: classType,
            class_format: classFormat,
            instructor_level: instructorLevel
        });
        
        if (pricing) {
            console.log(`✅ 找到價格: ${classType} - ${classFormat} - ${instructorLevel} = $${pricing.price}`);
        } else {
            console.warn(`⚠️ 未找到價格: ${classType} - ${classFormat} - ${instructorLevel}`);
        }
        
        res.json({
            success: true,
            price: pricing ? pricing.price : null
        });
    } catch (error) {
        console.error('❌ 獲取價格失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取價格失敗',
            error: error.message
        });
    }
});

// ==================== 試堂相關端點 ====================

// 創建試堂記錄
app.post('/trial-bill/create', validateApiKeys, async (req, res) => {
    try {
        const payload = req.body;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('trail_bill');
        
        // ✅ 生成唯一的 TrailID（8位數字，類似 studentId）
        // 查找現有最大的 TrailID
        const maxTrailResult = await collection.aggregate([
            {
                $match: {
                    TrailID: { $exists: true, $ne: null, $regex: /^\d{8}$/ } // 匹配8位數字
                }
            },
            {
                $project: {
                    TrailID: 1,
                    number: {
                        $toInt: "$TrailID"
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
        if (maxTrailResult && maxTrailResult.length > 0 && maxTrailResult[0].number) {
            nextNumber = maxTrailResult[0].number + 1;
        }
        
        // 確保 TrailID 唯一（檢查是否已存在）
        let newTrailId;
        let attempts = 0;
        do {
            newTrailId = String(nextNumber).padStart(8, '0');
            const existingCheck = await collection.findOne({ TrailID: newTrailId });
            if (!existingCheck) break;
            nextNumber++;
            attempts++;
            if (attempts > 100) {
                throw new Error('無法生成唯一的 TrailID');
            }
        } while (true);
        
        // ✅ 為所有記錄添加相同的 TrailID（批量創建時共享同一個 TrailID）
        const records = Array.isArray(payload.records) ? payload.records : [payload];
        const recordsWithTrailId = records.map(record => ({
            ...record,
            TrailID: newTrailId,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        
        const result = await collection.insertMany(recordsWithTrailId);
        
        res.json({
            success: true,
            message: '創建成功',
            count: result.insertedCount,
            trailId: newTrailId, // ✅ 返回生成的 TrailID
            recordIds: Object.values(result.insertedIds)
        });
    } catch (error) {
        console.error('❌ 創建試堂記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '創建試堂記錄失敗',
            error: error.message
        });
    }
});

// 獲取所有試堂記錄（支持分頁）
app.get('/trial-bill/all', validateApiKeys, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('trail_bill');
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await collection.countDocuments({});
        const trials = await collection.find({})
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
        
        // 格式化日期字段
        const formattedTrials = trials.map(trial => {
            const formatted = { ...trial };
            if (formatted.trialDate) {
                formatted.trialDate = formatDateToYYYYMMDD(formatted.trialDate);
            }
            return formatted;
        });
        
        const totalPages = Math.ceil(total / parseInt(limit));
        
        res.json({
            success: true,
            trials: formattedTrials,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: totalPages,
                hasMore: parseInt(page) < totalPages
            }
        });
    } catch (error) {
        console.error('❌ 獲取試堂記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取試堂記錄失敗',
            error: error.message
        });
    }
});

// 根據 TrailID 查詢試堂資料
app.get('/trial-bill/:trailId', validateApiKeys, async (req, res) => {
    try {
        const { trailId } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('trail_bill');
        
        const trials = await collection.find({ TrailID: trailId }).toArray();
        
        res.json({
            success: true,
            trials: trials,
            count: trials.length
        });
    } catch (error) {
        console.error('❌ 查詢試堂資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '查詢試堂資料失敗',
            error: error.message
        });
    }
});

// 更新試堂資料
app.put('/trial-bill/:id', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('trail_bill');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...updateData, updatedAt: new Date() } }
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
    }
});

// 刪除試堂資料
app.delete('/trial-bill/:id', validateApiKeys, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await getMongoClient();
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
    }
});

// ==================== 文件上傳相關端點 ====================

// 配置 multer 用於文件上傳
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的圖片格式'));
        }
    }
});

// 上傳收據圖片
app.post('/upload-receipt', validateApiKeys, upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '沒有上傳文件'
            });
        }
        
        // 這裡可以將文件上傳到雲存儲（如 AWS S3, Cloudinary 等）
        // 目前返回本地文件路徑作為示例
        const imageUrl = `/uploads/${req.file.filename}`;
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            message: '上傳成功'
        });
    } catch (error) {
        console.error('❌ 上傳收據圖片失敗:', error);
        res.status(500).json({
            success: false,
            message: '上傳失敗',
            error: error.message
        });
    }
});

// 創建學生賬單
app.post('/create-student-bill', validateApiKeys, async (req, res) => {
    try {
        const billData = req.body;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        
        // ✅ 保存 Student_bill 記錄
        // ✅ 如果 studentId 為 null 或 undefined，不設置該字段（避免唯一索引衝突）
        const billCollection = db.collection('Student_bill');
        const billDataToInsert = { ...billData };
        
        // ✅ 如果 studentId 為 null 或 undefined，移除該字段（允許一個學生有多個賬單）
        if (billDataToInsert.studentId === null || billDataToInsert.studentId === undefined) {
            delete billDataToInsert.studentId;
        }
        
        const billResult = await billCollection.insertOne({
            ...billDataToInsert,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // ✅ 處理 timeSlotData，創建 students_timeslot 記錄
        if (billData.timeSlotData && Array.isArray(billData.timeSlotData) && billData.timeSlotData.length > 0) {
            const timeslotCollection = db.collection('students_timeslot');
            const timeslotRecords = [];
            
            for (const slot of billData.timeSlotData) {
                const { classTime, selectedDates, pendingLessons, studentIds, receiptImageUrl, courseType, classFormat, instructorType, location } = slot;
                
                // ✅ 獲取基礎 time_slot（從 Pricing 集合）
                const baseTimeSlot = await getTimeSlotForClassFormat(db, courseType || billData.courseType, classFormat || billData.classFormat);
                
                // 計算第一次的 time_slot（originalTimeSlot）
                const firstDuration = extractDurationFromClassTime(classTime);
                const originalTimeSlot = firstDuration && baseTimeSlot ? calculateTotalTimeSlot(baseTimeSlot, firstDuration) : 1;
                
                // 為每個學生創建記錄
                if (studentIds && Array.isArray(studentIds)) {
                    for (const studentPhone of studentIds) {
                        // 查找學生信息
                        const studentCollection = db.collection('Student_account');
                        let student = await studentCollection.findOne({ phone: studentPhone });
                        
                        let studentId;
                        if (student) {
                            // ✅ 如果學生已存在，使用現有的 studentId
                            studentId = student.studentId || student._id.toString();
                        } else {
                            // ✅ 如果學生不存在（新生），創建新的 Student_account 記錄並分配 studentId
                            // 從 billData.students 中查找對應的學生資料
                            const studentData = billData.students?.find(s => s.phone === studentPhone);
                            
                            if (!studentData) {
                                console.warn(`⚠️ 未找到電話 ${studentPhone} 對應的學生資料，跳過`);
                                continue;
                            }
                            
                            // ✅ 生成唯一的 8 位數字 studentId
                            // 查找現有最大的 studentId
                            const maxStudentResult = await studentCollection.aggregate([
                                {
                                    $match: {
                                        studentId: { $regex: /^\d{8}$/ } // 匹配8位數字
                                    }
                                },
                                {
                                    $project: {
                                        studentId: 1,
                                        number: {
                                            $toInt: "$studentId"
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
                            if (maxStudentResult && maxStudentResult.length > 0 && maxStudentResult[0].number) {
                                nextNumber = maxStudentResult[0].number + 1;
                            }
                            
                            // 確保 studentId 唯一（檢查是否已存在）
                            let newStudentId;
                            let attempts = 0;
                            do {
                                newStudentId = String(nextNumber).padStart(8, '0');
                                const existingCheck = await studentCollection.findOne({ studentId: newStudentId });
                                if (!existingCheck) break;
                                nextNumber++;
                                attempts++;
                                if (attempts > 100) {
                                    throw new Error('無法生成唯一的 studentId');
                                }
                            } while (true);
                            
                            // ✅ 創建新的 Student_account 記錄
                            const newStudentResult = await studentCollection.insertOne({
                                name: studentData.name || '',
                                phone: studentPhone,
                                birthday: studentData.birthday || '',
                                age: studentData.age || '',
                                email: studentData.email || '',
                                password: studentData.password || studentPhone.slice(-4), // 默認密碼為電話後4位
                                studentId: newStudentId, // ✅ 分配唯一的 studentId
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                            
                            studentId = newStudentId;
                            console.log(`✅ 已為新生創建 Student_account 記錄: ${studentData.name} (${studentPhone}) -> studentId: ${studentId}`);
                        }
                        
                        // ✅ 處理已選日期（無論是新舊學生都需要創建 timeslot 記錄）
                        if (selectedDates && Array.isArray(selectedDates)) {
                            for (const date of selectedDates) {
                                timeslotRecords.push({
                                    studentId: studentId,
                                    studentPhone: studentPhone,
                                    classDate: date,
                                    classTime: classTime,
                                    courseType: courseType || billData.courseType,
                                    classFormat: classFormat || billData.classFormat,
                                    instructorType: instructorType || billData.instructorType,
                                    location: location || billData.location,
                                    receiptImageUrl: receiptImageUrl || billData.receiptImageUrl,
                                    time_slot: baseTimeSlot || null, // ✅ 基礎時長（分鐘）
                                    originalTimeSlot: originalTimeSlot, // ✅ 第一次的 time_slot（堂數）
                                    total_time_slot: originalTimeSlot, // ✅ 當前的 time_slot（初始等於 originalTimeSlot）
                                    isPending: false,
                                    isAttended: null,
                                    isLeave: null,
                                    isChangeDate: false,
                                    isChangeTime: false,
                                    isChangeLocation: false,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                });
                            }
                        }
                        
                        // ✅ 處理待約堂數（無論是新舊學生都需要創建 timeslot 記錄）
                        if (pendingLessons && typeof pendingLessons === 'object') {
                            const pendingCount = Object.values(pendingLessons).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
                            for (let i = 0; i < pendingCount; i++) {
                                timeslotRecords.push({
                                    studentId: studentId,
                                    studentPhone: studentPhone,
                                    classDate: '',
                                    classTime: classTime,
                                    courseType: courseType || billData.courseType,
                                    classFormat: classFormat || billData.classFormat,
                                    instructorType: instructorType || billData.instructorType,
                                    location: location || billData.location,
                                    receiptImageUrl: receiptImageUrl || billData.receiptImageUrl,
                                    time_slot: baseTimeSlot || null, // ✅ 基礎時長（分鐘）
                                    originalTimeSlot: originalTimeSlot, // ✅ 第一次的 time_slot（堂數）
                                    total_time_slot: originalTimeSlot, // ✅ 當前的 time_slot（初始等於 originalTimeSlot）
                                    isPending: true,
                                    isAttended: null,
                                    isLeave: null,
                                    isChangeDate: false,
                                    isChangeTime: false,
                                    isChangeLocation: false,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                });
                            }
                        }
                    }
                }
            }
            
            // 批量插入 students_timeslot 記錄
            if (timeslotRecords.length > 0) {
                await timeslotCollection.insertMany(timeslotRecords);
                console.log(`✅ 已創建 ${timeslotRecords.length} 條 students_timeslot 記錄`);
            }
        }
        
        res.json({
            success: true,
            message: '創建成功',
            billId: billResult.insertedId
        });
    } catch (error) {
        console.error('❌ 創建學生賬單失敗:', error);
        res.status(500).json({
            success: false,
            message: '創建學生賬單失敗',
            error: error.message
        });
    }
});

// ==================== 用戶偏好設置相關端點 ====================

// 保存工時管理隱藏列表頭狀態
app.post('/user-preferences/work-hours-collapse', validateApiKeys, async (req, res) => {
    try {
        const { accountPhone, employeePhone, collapseStates } = req.body;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('User_preferences');
        
        await collection.updateOne(
            { accountPhone, employeePhone },
            {
                $set: {
                    collapseStates,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        
        res.json({
            success: true,
            message: '保存成功'
        });
    } catch (error) {
        console.error('❌ 保存用戶偏好失敗:', error);
        res.status(500).json({
            success: false,
            message: '保存失敗',
            error: error.message
        });
    }
});

// 獲取工時管理隱藏列表頭狀態
app.get('/user-preferences/work-hours-collapse', validateApiKeys, async (req, res) => {
    try {
        const { accountPhone, employeePhone } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('User_preferences');
        
        const preference = await collection.findOne({ accountPhone, employeePhone });
        
        res.json({
            success: true,
            collapseStates: preference ? preference.collapseStates : {}
        });
    } catch (error) {
        console.error('❌ 獲取用戶偏好失敗:', error);
        res.json({
            success: true,
            collapseStates: {}
        });
    }
});

// 清除工時管理隱藏列表頭狀態
app.delete('/user-preferences/work-hours-collapse', validateApiKeys, async (req, res) => {
    try {
        const { accountPhone, employeePhone } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('User_preferences');
        
        const result = await collection.deleteOne({ accountPhone, employeePhone });
        
        res.json({
            success: true,
            message: '清除成功',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ 清除用戶偏好失敗:', error);
        res.status(500).json({
            success: false,
            message: '清除失敗',
            error: error.message
        });
    }
});

// ==================== 學生堂數相關端點 ====================

// 輔助函數：根據月份確定學期（1-2月、3-4月、5-6月、7-8月、9-10月、11-12月）
function getSemesterFromMonth(month) {
    if (month >= 1 && month <= 2) return '1-2月';
    if (month >= 3 && month <= 4) return '3-4月';
    if (month >= 5 && month <= 6) return '5-6月';
    if (month >= 7 && month <= 8) return '7-8月';
    if (month >= 9 && month <= 10) return '9-10月';
    if (month >= 11 && month <= 12) return '11-12月';
    return '未知學期';
}

// 輔助函數：從日期字符串中提取月份
function extractMonthFromDate(dateString) {
    if (!dateString) return null;
    
    // 處理 YYYY-MM-DD 格式
    const match = dateString.match(/^(\d{4})-(\d{2})/);
    if (match) {
        return parseInt(match[2], 10);
    }
    
    // 處理其他日期格式
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.getMonth() + 1; // getMonth() 返回 0-11
    }
    
    return null;
}

// 輔助函數：獲取記錄的月份（從 classDate 或通過 receiptImageUrl 查找）
async function getRecordMonth(record, collection) {
    // 如果 classDate 有值，直接提取月份
    if (record.classDate && record.classDate !== null && record.classDate !== '') {
        const month = extractMonthFromDate(record.classDate);
        if (month) return month;
    }
    
    // 如果 classDate 為空，通過 receiptImageUrl 查找同一個收據的其他賬單的 classDate
    if (record.receiptImageUrl) {
        const relatedRecords = await collection.find({
            receiptImageUrl: record.receiptImageUrl,
            classDate: { $nin: [null, ''] }
        }).limit(10).toArray();
        
        // 查找第一個有 classDate 的記錄
        for (const relatedRecord of relatedRecords) {
            const month = extractMonthFromDate(relatedRecord.classDate);
            if (month) return month;
        }
    }
    
    return null;
}

// 獲取學生的所有上課日期（已定日子課堂），按學期分類
app.get('/student/:studentId/class-dates', validateApiKeys, async (req, res) => {
    try {
        const { studentId } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // 查詢該學生的所有記錄（排除請假記錄）
        const records = await collection.find({
            studentId: studentId,
            isLeave: { $ne: true }
        }).toArray();
        
        // 批量查詢所有需要的 receiptImageUrl 對應的日期
        const receiptUrls = [...new Set(records
            .filter(r => !r.classDate && r.receiptImageUrl)
            .map(r => r.receiptImageUrl)
            .filter(Boolean))];
        
        const receiptDateMap = {};
        if (receiptUrls.length > 0) {
            const relatedRecords = await collection.find({
                receiptImageUrl: { $in: receiptUrls },
                classDate: { $nin: [null, ''] }
            }).toArray();
            
            for (const relatedRecord of relatedRecords) {
                if (!receiptDateMap[relatedRecord.receiptImageUrl]) {
                    receiptDateMap[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                }
            }
        }
        
        // 按學期分類日期
        const semesterGroups = {};
        
        for (const record of records) {
            // 獲取月份
            let month = null;
            if (record.classDate && record.classDate !== null && record.classDate !== '') {
                month = extractMonthFromDate(record.classDate);
            } else if (record.receiptImageUrl && receiptDateMap[record.receiptImageUrl]) {
                month = extractMonthFromDate(receiptDateMap[record.receiptImageUrl]);
            }
            
            if (!month) continue; // 跳過無法確定月份的記錄
            
            // 確定學期
            const semester = getSemesterFromMonth(month);
            
            // 提取日期
            let classDate = null;
            if (record.classDate && record.classDate !== null && record.classDate !== '') {
                classDate = formatDateToYYYYMMDD(record.classDate) || record.classDate;
            } else if (record.receiptImageUrl && receiptDateMap[record.receiptImageUrl]) {
                classDate = formatDateToYYYYMMDD(receiptDateMap[record.receiptImageUrl]) || receiptDateMap[record.receiptImageUrl];
            }
            
            if (!classDate) continue;
            
            // 初始化學期組
            if (!semesterGroups[semester]) {
                semesterGroups[semester] = [];
            }
            
            // 添加日期（去重）
            if (!semesterGroups[semester].includes(classDate)) {
                semesterGroups[semester].push(classDate);
            }
        }
        
        // 對每個學期的日期進行排序
        for (const semester in semesterGroups) {
            semesterGroups[semester].sort();
        }
        
        res.json({
            success: true,
            classDates: semesterGroups,
            // 為了向後兼容，也提供平鋪的日期列表
            allDates: Object.values(semesterGroups).flat().sort()
        });
    } catch (error) {
        console.error('❌ 獲取學生上課日期失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取學生上課日期失敗',
            error: error.message
        });
    }
});

// ✅ 獲取學生的剩餘時數詳細信息（包括 classFormat 和 total_time_slot）
app.get('/student/:studentId/remaining-time-slots', validateApiKeys, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { semester, year } = req.query; // 可選的學期和年份過濾
        
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // 構建查詢條件
        const query = { studentId: studentId };
        
        // ✅ 獲取該學生的所有時段記錄（不排除 classDate 為空的記錄，因為待約記錄可能沒有 classDate）
        let timeslots = await collection.find(query).toArray();
        
        // 如果指定了學期或年份，需要進一步過濾
        let receiptDateMap = {};
        if (semester || year) {
            // 批量查詢 receiptImageUrl 對應的日期
            const receiptUrls = [...new Set(timeslots
                .filter(r => !r.classDate && r.receiptImageUrl)
                .map(r => r.receiptImageUrl)
                .filter(Boolean))];
            
            if (receiptUrls.length > 0) {
                const relatedRecords = await collection.find({
                    receiptImageUrl: { $in: receiptUrls },
                    classDate: { $nin: [null, ''] }
                }).toArray();
                
                for (const relatedRecord of relatedRecords) {
                    if (!receiptDateMap[relatedRecord.receiptImageUrl]) {
                        receiptDateMap[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                    }
                }
            }
            
            // 過濾記錄
            const semesterFilter = semester ? semester.split(',').map(m => parseInt(m)) : null;
            const yearFilter = year ? parseInt(year) : null;
            
            timeslots = timeslots.filter(slot => {
                let classDate = slot.classDate;
                
                if (!classDate && slot.receiptImageUrl && receiptDateMap[slot.receiptImageUrl]) {
                    classDate = receiptDateMap[slot.receiptImageUrl];
                }
                
                if (!classDate) return false;
                
                const date = formatDateToYYYYMMDD(classDate) || classDate;
                const dateObj = new Date(date);
                if (isNaN(dateObj.getTime())) return false;
                
                const month = dateObj.getMonth() + 1;
                const slotYear = dateObj.getFullYear();
                
                if (yearFilter && slotYear !== yearFilter) return false;
                if (semesterFilter && !semesterFilter.includes(month)) return false;
                
                return true;
            });
        }
        
        // ✅ 篩選剩餘時數的記錄：仍可出席 + 仍可補約
        // 仍可出席：有 classDate 但 isAttended === null 且 isLeave === null（藍色狀態）
        const canStillAttendSlots = timeslots.filter(s => {
            // 如果指定了學期/年份過濾，需要檢查日期是否匹配
            if (semester || year) {
                let classDate = s.classDate;
                if (!classDate && s.receiptImageUrl && receiptDateMap[s.receiptImageUrl]) {
                    classDate = receiptDateMap[s.receiptImageUrl];
                }
                if (!classDate) return false; // 如果沒有日期且無法通過 receiptImageUrl 查找，則排除
            }
            return s.classDate && s.classDate !== '' && 
                   s.isAttended === null && 
                   (s.isLeave === null || s.isLeave === false);
        });
        
        // 仍可補約：classDate 為空或 isPending === true 或 isLeave === true
        const canStillBookSlots = timeslots.filter(s => {
            const isPending = (!s.classDate || s.classDate === '') || s.isPending === true;
            const isLeave = s.isLeave === true;
            
            // ✅ 如果指定了學期/年份過濾，待約記錄需要通過 receiptImageUrl 查找日期來匹配
            if ((isPending || isLeave) && (semester || year)) {
                let classDate = s.classDate;
                if (!classDate && s.receiptImageUrl && receiptDateMap[s.receiptImageUrl]) {
                    classDate = receiptDateMap[s.receiptImageUrl];
                }
                // ✅ 如果找到了日期，需要檢查是否匹配學期/年份
                if (classDate) {
                    const date = formatDateToYYYYMMDD(classDate) || classDate;
                    const dateObj = new Date(date);
                    if (!isNaN(dateObj.getTime())) {
                        const month = dateObj.getMonth() + 1;
                        const slotYear = dateObj.getFullYear();
                        const semesterFilter = semester ? semester.split(',').map(m => parseInt(m)) : null;
                        const yearFilter = year ? parseInt(year) : null;
                        
                        if (yearFilter && slotYear !== yearFilter) return false;
                        if (semesterFilter && !semesterFilter.includes(month)) return false;
                    }
                } else {
                    // ✅ 如果沒有日期且無法通過 receiptImageUrl 查找，則排除（因為無法確定學期/年份）
                    return false;
                }
            }
            
            return isPending || isLeave;
        });
        
        // 合併所有剩餘時數記錄
        const remainingSlots = [...canStillAttendSlots, ...canStillBookSlots];
        
        // ✅ 按 classFormat 分組統計
        const formatGroups = {};
        let totalTimeSlots = 0;
        
        for (const slot of remainingSlots) {
            const classFormat = slot.classFormat || slot.class_format || '未知格式';
            const timeSlot = slot.total_time_slot || 1;
            
            if (!formatGroups[classFormat]) {
                formatGroups[classFormat] = {
                    classFormat: classFormat,
                    count: 0,
                    totalTimeSlot: 0,
                    records: []
                };
            }
            
            formatGroups[classFormat].count++;
            formatGroups[classFormat].totalTimeSlot += timeSlot;
            formatGroups[classFormat].records.push({
                classDate: slot.classDate || '',
                classTime: slot.classTime || '',
                courseType: slot.courseType || slot.course_type || '',
                classFormat: slot.classFormat || slot.class_format || '',
                location: slot.location || '',
                totalTimeSlot: timeSlot,
                isPending: slot.isPending || false,
                isLeave: slot.isLeave || false
            });
            
            totalTimeSlots += timeSlot;
        }
        
        // 轉換為數組並排序
        const formatList = Object.values(formatGroups).sort((a, b) => {
            return b.totalTimeSlot - a.totalTimeSlot; // 按總時數降序排列
        });
        
        res.json({
            success: true,
            studentId: studentId,
            totalTimeSlots: parseFloat(totalTimeSlots.toFixed(1)),
            formatGroups: formatList,
            totalRecords: remainingSlots.length
        });
    } catch (error) {
        console.error('❌ 獲取剩餘時數詳細信息失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取剩餘時數詳細信息失敗',
            error: error.message
        });
    }
});

// 獲取學生的所有補堂日期（已約補堂），按學期分類
app.get('/student/:studentId/makeup-dates', validateApiKeys, async (req, res) => {
    try {
        const { studentId } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // ✅ 查詢該學生的所有補堂記錄（isChangeDate || isChangeLocation 為 true，不包括 isChangeTime）
        const records = await collection.find({
            studentId: studentId,
            $or: [
                { isChangeDate: true },
                { isChangeLocation: true }
            ]
        }).toArray();
        
        // 批量查詢所有需要的 receiptImageUrl 對應的日期
        const receiptUrls = [...new Set(records
            .filter(r => !r.classDate && r.receiptImageUrl)
            .map(r => r.receiptImageUrl)
            .filter(Boolean))];
        
        const receiptDateMap = {};
        if (receiptUrls.length > 0) {
            const relatedRecords = await collection.find({
                receiptImageUrl: { $in: receiptUrls },
                classDate: { $nin: [null, ''] }
            }).toArray();
            
            for (const relatedRecord of relatedRecords) {
                if (!receiptDateMap[relatedRecord.receiptImageUrl]) {
                    receiptDateMap[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                }
            }
        }
        
        // 按學期分類日期
        const semesterGroups = {};
        
        for (const record of records) {
            // 獲取月份
            let month = null;
            if (record.classDate && record.classDate !== null && record.classDate !== '') {
                month = extractMonthFromDate(record.classDate);
            } else if (record.receiptImageUrl && receiptDateMap[record.receiptImageUrl]) {
                month = extractMonthFromDate(receiptDateMap[record.receiptImageUrl]);
            }
            
            if (!month) continue; // 跳過無法確定月份的記錄
            
            // 確定學期
            const semester = getSemesterFromMonth(month);
            
            // 提取日期
            let classDate = null;
            if (record.classDate && record.classDate !== null && record.classDate !== '') {
                classDate = formatDateToYYYYMMDD(record.classDate) || record.classDate;
            } else if (record.receiptImageUrl && receiptDateMap[record.receiptImageUrl]) {
                classDate = formatDateToYYYYMMDD(receiptDateMap[record.receiptImageUrl]) || receiptDateMap[record.receiptImageUrl];
            }
            
            if (!classDate) continue;
            
            // 初始化學期組
            if (!semesterGroups[semester]) {
                semesterGroups[semester] = [];
            }
            
            // 添加日期（去重）
            if (!semesterGroups[semester].includes(classDate)) {
                semesterGroups[semester].push(classDate);
            }
        }
        
        // 對每個學期的日期進行排序
        for (const semester in semesterGroups) {
            semesterGroups[semester].sort();
        }
        
        res.json({
            success: true,
            makeupDates: semesterGroups,
            // 為了向後兼容，也提供平鋪的日期列表
            allDates: Object.values(semesterGroups).flat().sort()
        });
    } catch (error) {
        console.error('❌ 獲取學生補堂日期失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取學生補堂日期失敗',
            error: error.message
        });
    }
});

// 獲取學生的所有請假日期（本期請假堂數），按學期分類
app.get('/student/:studentId/leave-dates', validateApiKeys, async (req, res) => {
    try {
        const { studentId } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // ✅ 查詢該學生的所有請假記錄（isLeave === true）
        const records = await collection.find({
            studentId: studentId,
            isLeave: true
        }).toArray();
        
        // 批量查詢所有需要的 receiptImageUrl 對應的日期
        const receiptUrls = [...new Set(records
            .filter(r => !r.classDate && r.receiptImageUrl)
            .map(r => r.receiptImageUrl)
            .filter(Boolean))];
        
        const receiptDateMap = {};
        if (receiptUrls.length > 0) {
            const relatedRecords = await collection.find({
                receiptImageUrl: { $in: receiptUrls },
                classDate: { $nin: [null, ''] }
            }).toArray();
            
            for (const relatedRecord of relatedRecords) {
                if (!receiptDateMap[relatedRecord.receiptImageUrl]) {
                    receiptDateMap[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                }
            }
        }
        
        // 按學期分類日期
        const semesterGroups = {};
        
        for (const record of records) {
            // 獲取月份
            let month = null;
            if (record.classDate && record.classDate !== null && record.classDate !== '') {
                month = extractMonthFromDate(record.classDate);
            } else if (record.receiptImageUrl && receiptDateMap[record.receiptImageUrl]) {
                month = extractMonthFromDate(receiptDateMap[record.receiptImageUrl]);
            }
            
            if (!month) continue; // 跳過無法確定月份的記錄
            
            // 確定學期
            const semester = getSemesterFromMonth(month);
            
            // 提取日期
            let classDate = null;
            if (record.classDate && record.classDate !== null && record.classDate !== '') {
                classDate = formatDateToYYYYMMDD(record.classDate) || record.classDate;
            } else if (record.receiptImageUrl && receiptDateMap[record.receiptImageUrl]) {
                classDate = formatDateToYYYYMMDD(receiptDateMap[record.receiptImageUrl]) || receiptDateMap[record.receiptImageUrl];
            }
            
            if (!classDate) continue;
            
            // 初始化學期組
            if (!semesterGroups[semester]) {
                semesterGroups[semester] = [];
            }
            
            // 添加日期（去重）
            if (!semesterGroups[semester].includes(classDate)) {
                semesterGroups[semester].push(classDate);
            }
        }
        
        // 對每個學期的日期進行排序
        for (const semester in semesterGroups) {
            semesterGroups[semester].sort();
        }
        
        res.json({
            success: true,
            leaveDates: semesterGroups,
            // 為了向後兼容，也提供平鋪的日期列表
            allDates: Object.values(semesterGroups).flat().sort()
        });
    } catch (error) {
        console.error('❌ 獲取學生請假日期失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取學生請假日期失敗',
            error: error.message
        });
    }
});

// 獲取學生堂數數據（支持分頁、按學期和年份篩選）
app.get('/student-classes', validateApiKeys, async (req, res) => {
    try {
        const { page = 1, limit = 50, semester, year } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const timeslotCollection = db.collection('students_timeslot');
        const studentAccountCollection = db.collection('Student_account');
        
        // 獲取所有學生ID列表
        const allStudents = await studentAccountCollection.find({}).toArray();
        const allStudentIds = allStudents.map(s => s.studentId).filter(Boolean);
        
        // 如果指定了學期和年份，需要從 students_timeslot 查詢數據
        let semesterFilter = null;
        let yearFilter = null;
        
        if (semester) {
            // 解析學期，例如 "1-2月" -> [1, 2]
            const semesterMonths = {
                '1-2月': [1, 2],
                '3-4月': [3, 4],
                '5-6月': [5, 6],
                '7-8月': [7, 8],
                '9-10月': [9, 10],
                '11-12月': [11, 12]
            };
            semesterFilter = semesterMonths[semester] || null;
        }
        
        if (year) {
            yearFilter = parseInt(year);
        }
        
        // ✅ 如果指定了篩選條件，先找出所有符合條件的學生ID
        let studentIdsToProcess = allStudentIds;
        let total = allStudentIds.length;
        
        if (semesterFilter || yearFilter) {
            // 批量查詢所有需要的 receiptImageUrl 對應的日期（優化性能）
            const receiptUrls = [...new Set(
                (await timeslotCollection.find({ receiptImageUrl: { $nin: [null, ''] } }).toArray())
                    .map(r => r.receiptImageUrl)
                    .filter(Boolean)
            )];
            
            const receiptDateMap = {};
            if (receiptUrls.length > 0) {
                const relatedRecords = await timeslotCollection.find({
                    receiptImageUrl: { $in: receiptUrls },
                    classDate: { $nin: [null, ''] }
                }).toArray();
                
                for (const relatedRecord of relatedRecords) {
                    if (!receiptDateMap[relatedRecord.receiptImageUrl]) {
                        receiptDateMap[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                    }
                }
            }
            
            // ✅ 優化：使用批量查詢替代N+1查詢
            // 一次性查詢所有學生的時段記錄
            const allTimeslotsQuery = { studentId: { $in: allStudentIds } };
                if (semesterFilter || yearFilter) {
                allTimeslotsQuery.classDate = { $nin: [null, ''] };
            }
            
            // ✅ 優化：使用投影只返回必要字段，減少內存使用
            const allTimeslots = await timeslotCollection.find(allTimeslotsQuery, {
                projection: {
                    studentId: 1,
                    classDate: 1,
                    receiptImageUrl: 1,
                    isAttended: 1,
                    isLeave: 1,
                    isPending: 1,
                    isChangeDate: 1,
                    isChangeLocation: 1,
                    total_time_slot: 1
                }
            }).toArray();
            
            // ✅ 優化：在內存中過濾，避免多次數據庫查詢
            const validStudentIdsSet = new Set();
            for (const slot of allTimeslots) {
                    let classDate = slot.classDate;
                    
                    // 如果 classDate 為空，嘗試通過 receiptImageUrl 查找
                    if (!classDate && slot.receiptImageUrl && receiptDateMap[slot.receiptImageUrl]) {
                        classDate = receiptDateMap[slot.receiptImageUrl];
                    }
                    
                if (!classDate) continue;
                    
                    const date = formatDateToYYYYMMDD(classDate) || classDate;
                    const dateObj = new Date(date);
                if (isNaN(dateObj.getTime())) continue;
                    
                    const month = dateObj.getMonth() + 1;
                    const slotYear = dateObj.getFullYear();
                    
                if (yearFilter && slotYear !== yearFilter) continue;
                if (semesterFilter && !semesterFilter.includes(month)) continue;
                
                validStudentIdsSet.add(slot.studentId);
            }
            
            const validStudentIds = Array.from(validStudentIdsSet);
            
            studentIdsToProcess = validStudentIds;
            total = validStudentIds.length;
        }
        
        // 分頁處理
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const studentIdsForPage = studentIdsToProcess.slice(skip, skip + parseInt(limit));
        
        console.log('📊 學生堂數查詢:', {
            semester: semester || '無',
            year: year || '無',
            totalStudents: allStudentIds.length,
            validStudents: studentIdsToProcess.length,
            page: parseInt(page),
            limit: parseInt(limit),
            studentsForPage: studentIdsForPage.length
        });
        
        // ✅ 優化：批量查詢當前頁所有學生的時段記錄，避免N+1查詢
        const allPageTimeslots = await timeslotCollection.find({
            studentId: { $in: studentIdsForPage }
        }, {
            projection: {
                studentId: 1,
                classDate: 1,
                receiptImageUrl: 1,
                isAttended: 1,
                isLeave: 1,
                isPending: 1,
                isChangeDate: 1,
                isChangeLocation: 1,
                total_time_slot: 1
            }
        }).toArray();
        
        // ✅ 優化：按學生ID分組，避免重複查詢
        const timeslotsByStudent = {};
        for (const slot of allPageTimeslots) {
            if (!timeslotsByStudent[slot.studentId]) {
                timeslotsByStudent[slot.studentId] = [];
            }
            timeslotsByStudent[slot.studentId].push(slot);
        }
        
        // ✅ 優化：批量查詢所有需要的 receiptImageUrl 對應的日期
        const receiptUrlsForPage = [...new Set(
            allPageTimeslots
                .map(r => r.receiptImageUrl)
                .filter(Boolean)
        )];
        
        const receiptDateMapForPage = {};
        if (receiptUrlsForPage.length > 0) {
            const relatedRecords = await timeslotCollection.find({
                receiptImageUrl: { $in: receiptUrlsForPage },
                classDate: { $nin: [null, ''] }
            }, {
                projection: { receiptImageUrl: 1, classDate: 1 }
            }).toArray();
            
            for (const relatedRecord of relatedRecords) {
                if (!receiptDateMapForPage[relatedRecord.receiptImageUrl]) {
                    receiptDateMapForPage[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                }
            }
        }
        
        // ✅ 優化：批量查詢所有待約記錄
        const allPendingRecordsForPage = await timeslotCollection.find({
            studentId: { $in: studentIdsForPage },
            isPending: true
        }, {
            projection: {
                studentId: 1,
                classDate: 1,
                receiptImageUrl: 1
            }
        }).toArray();
        
        // ✅ 優化：按學生ID分組待約記錄
        const pendingRecordsByStudent = {};
        for (const record of allPendingRecordsForPage) {
            if (!pendingRecordsByStudent[record.studentId]) {
                pendingRecordsByStudent[record.studentId] = [];
            }
            pendingRecordsByStudent[record.studentId].push(record);
        }
        
        // ✅ 優化：並行處理所有學生，提高處理速度
        const studentPromises = studentIdsForPage.map(async (studentId) => {
            const student = allStudents.find(s => s.studentId === studentId);
            if (!student) return null;
            
            // ✅ 從已分組的數據中獲取，避免重複查詢
            let timeslots = timeslotsByStudent[studentId] || [];
            
            // 如果指定了學期或年份，需要進一步過濾
            if (semesterFilter || yearFilter) {
                timeslots = timeslots.filter(slot => {
                    let classDate = slot.classDate;
                    
                    // ✅ 如果 classDate 為空，嘗試通過 receiptImageUrl 查找
                    if (!classDate && slot.receiptImageUrl && receiptDateMapForPage[slot.receiptImageUrl]) {
                        classDate = receiptDateMapForPage[slot.receiptImageUrl];
                    }
                    
                    // ✅ 如果仍然沒有 classDate，且指定了過濾條件，則排除該記錄
                    // 但如果沒有指定過濾條件，則包含所有記錄（包括 classDate 為空的記錄）
                    if (!classDate) {
                        // 如果指定了過濾條件但找不到日期，則排除
                        return false;
                    }
                    
                    const date = formatDateToYYYYMMDD(classDate) || classDate;
                    const dateObj = new Date(date);
                    if (isNaN(dateObj.getTime())) return false;
                    
                    const month = dateObj.getMonth() + 1;
                    const slotYear = dateObj.getFullYear();
                    
                    // 檢查年份
                    if (yearFilter && slotYear !== yearFilter) {
                        return false;
                    }
                    
                    // 檢查學期
                    if (semesterFilter && !semesterFilter.includes(month)) {
                        return false;
                    }
                    
                    return true;
                });
            }
            
            // ✅ 計算統計數據（基於過濾後的記錄）
            // 已定日子課堂：有 classDate 且不是請假的記錄
            const scheduledClasses = timeslots.filter(s => s.classDate && s.classDate !== '' && s.isLeave !== true).length;
            
            // ✅ 補堂已出席：已約補堂且已出席的記錄（需要先計算，因為它是已出席的子集）
            const attendedMakeup = timeslots.filter(s => (s.isChangeDate === true || s.isChangeLocation === true) && s.isAttended === true).length;
            
            // ✅ 已出席：isAttended === true 的記錄（包括普通已出席和補堂已出席）
            const attendedBooked = timeslots.filter(s => s.isAttended === true).length;
            
            // ✅ 本期請假堂數：本期資料格對應學生的isLeave為true的數量
            const currentPeriodLeaveRequests = timeslots.filter(s => s.isLeave === true).length;
            
            // ✅ 計算缺席：isAttended === false 的記錄
            const absences = timeslots.filter(s => s.isAttended === false).length;
            
            // ✅ 計算本期已購堂數（根據學期/年份過濾後的記錄數量）
            const currentPurchasedClasses = timeslots.length;
            
            // ✅ 本期剩餘堂數 = 本期已購堂數 - 本期已出席 - 本期已缺席
            // 注意：attendedBooked 已經包含了所有 isAttended === true 的記錄（包括補堂已出席），
            // 所以不需要再減去 attendedMakeup，否則會重複扣除
            const currentPeriodRemaining = Math.max(0, currentPurchasedClasses - attendedBooked - absences);
            
            // ✅ 優化：從已分組的數據中獲取待約記錄，避免重複查詢
            let allPendingRecords = pendingRecordsByStudent[studentId] || [];
            
            // 如果指定了學期或年份過濾，需要過濾待約記錄
            if (semesterFilter || yearFilter) {
                // 獲取所有待約記錄的 receiptImageUrl
                const pendingReceiptUrls = [...new Set(allPendingRecords
                    .map(r => r.receiptImageUrl)
                    .filter(Boolean))];
                
                // 批量查詢這些 receiptImageUrl 對應的有 classDate 的記錄
                const receiptDateMapForPending = {};
                if (pendingReceiptUrls.length > 0) {
                    const relatedRecords = await timeslotCollection.find({
                        receiptImageUrl: { $in: pendingReceiptUrls },
                        classDate: { $nin: [null, ''] }
                    }).toArray();
                    
                    for (const relatedRecord of relatedRecords) {
                        if (!receiptDateMapForPending[relatedRecord.receiptImageUrl]) {
                            receiptDateMapForPending[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                        }
                    }
                }
                
                // 過濾待約記錄：根據 receiptImageUrl 關聯的 classDate 判斷是否屬於指定學期/年份
                allPendingRecords = allPendingRecords.filter(pendingRecord => {
                    let classDate = null;
                    
                    // 如果待約記錄本身有 classDate，直接使用
                    if (pendingRecord.classDate && pendingRecord.classDate !== '') {
                        classDate = pendingRecord.classDate;
                    } 
                    // 如果沒有 classDate，嘗試通過 receiptImageUrl 查找
                    else if (pendingRecord.receiptImageUrl && receiptDateMapForPending[pendingRecord.receiptImageUrl]) {
                        classDate = receiptDateMapForPending[pendingRecord.receiptImageUrl];
                    }
                    
                    // 如果仍然沒有 classDate，無法確定學期/年份，根據過濾條件決定是否包含
                    // 如果指定了過濾條件但無法確定日期，則排除該記錄
                    if (!classDate) {
                        return false; // 無法確定學期/年份，排除
                    }
                    
                    const date = formatDateToYYYYMMDD(classDate) || classDate;
                    const dateObj = new Date(date);
                    if (isNaN(dateObj.getTime())) return false;
                    
                    const month = dateObj.getMonth() + 1;
                    const slotYear = dateObj.getFullYear();
                    
                    // 檢查年份
                    if (yearFilter && slotYear !== yearFilter) {
                        return false;
                    }
                    
                    // 檢查學期
                    if (semesterFilter && !semesterFilter.includes(month)) {
                        return false;
                    }
                    
                    return true;
                });
            }
            
            const pendingClasses = allPendingRecords.length;
            
            // ✅ 已約補堂：isChangeDate 或 isChangeLocation 為 true 的記錄（不包括 isChangeTime）
            const bookedMakeup = timeslots.filter(s => s.isChangeDate === true || s.isChangeLocation === true).length;
            
            // ✅ 計算上期剩餘堂數：上期已購堂數 - 上期已出席 - 上期補堂已出席 - 上期已缺席
            // 需要確定"上一期"是哪個學期
            let lastPeriodRemaining = 0;
            let lastPeriodTimeslots = [];
            
            if (semesterFilter && yearFilter) {
                // 確定上一期
                const semesterMonths = {
                    '1-2月': [1, 2],
                    '3-4月': [3, 4],
                    '5-6月': [5, 6],
                    '7-8月': [7, 8],
                    '9-10月': [9, 10],
                    '11-12月': [11, 12]
                };
                
                // 找到當前學期的索引
                const currentSemester = Object.keys(semesterMonths).find(key => 
                    JSON.stringify(semesterMonths[key]) === JSON.stringify(semesterFilter)
                );
                const semesterKeys = Object.keys(semesterMonths);
                const currentIndex = semesterKeys.indexOf(currentSemester);
                
                // 確定上一期
                let lastSemesterFilter = null;
                let lastYearFilter = yearFilter;
                
                if (currentIndex > 0) {
                    // 同一年的上一期
                    lastSemesterFilter = semesterMonths[semesterKeys[currentIndex - 1]];
                } else {
                    // 上一年的最後一期（11-12月）
                    lastSemesterFilter = semesterMonths['11-12月'];
                    lastYearFilter = yearFilter - 1;
                }
                
                // ✅ 優化：從已查詢的數據中過濾上一期記錄，避免重複查詢
                // 如果已經有所有時段記錄，直接過濾；否則查詢
                if (timeslotsByStudent[studentId]) {
                    // 從已有數據中過濾
                const lastPeriodQuery = { studentId: studentId };
                if (lastSemesterFilter) {
                    lastPeriodQuery.classDate = { $nin: [null, ''] };
                    }
                    lastPeriodTimeslots = await timeslotCollection.find(lastPeriodQuery, {
                        projection: {
                            studentId: 1,
                            classDate: 1,
                            receiptImageUrl: 1,
                            isAttended: 1,
                            isLeave: 1,
                            isChangeDate: 1,
                            isChangeLocation: 1,
                            total_time_slot: 1
                        }
                    }).toArray();
                } else {
                    // 如果沒有已有數據，查詢
                    const lastPeriodQuery = { studentId: studentId };
                    if (lastSemesterFilter) {
                        lastPeriodQuery.classDate = { $nin: [null, ''] };
                    }
                    lastPeriodTimeslots = await timeslotCollection.find(lastPeriodQuery, {
                        projection: {
                            studentId: 1,
                            classDate: 1,
                            receiptImageUrl: 1,
                            isAttended: 1,
                            isLeave: 1,
                            isChangeDate: 1,
                            isChangeLocation: 1,
                            total_time_slot: 1
                        }
                    }).toArray();
                }
                
                // 過濾上一期的記錄
                if (lastSemesterFilter && lastYearFilter) {
                    // 批量查詢 receiptImageUrl 對應的日期
                    const lastPeriodReceiptUrls = [...new Set(lastPeriodTimeslots
                        .filter(r => !r.classDate && r.receiptImageUrl)
                        .map(r => r.receiptImageUrl)
                        .filter(Boolean))];
                    
                    const lastPeriodReceiptDateMap = {};
                    if (lastPeriodReceiptUrls.length > 0) {
                        const relatedRecords = await timeslotCollection.find({
                            receiptImageUrl: { $in: lastPeriodReceiptUrls },
                            classDate: { $nin: [null, ''] }
                        }).toArray();
                        
                        for (const relatedRecord of relatedRecords) {
                            if (!lastPeriodReceiptDateMap[relatedRecord.receiptImageUrl]) {
                                lastPeriodReceiptDateMap[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                            }
                        }
                    }
                    
                    lastPeriodTimeslots = lastPeriodTimeslots.filter(slot => {
                        let classDate = slot.classDate;
                        
                        if (!classDate && slot.receiptImageUrl && lastPeriodReceiptDateMap[slot.receiptImageUrl]) {
                            classDate = lastPeriodReceiptDateMap[slot.receiptImageUrl];
                        }
                        
                        if (!classDate) return false;
                        
                        const date = formatDateToYYYYMMDD(classDate) || classDate;
                        const dateObj = new Date(date);
                        if (isNaN(dateObj.getTime())) return false;
                        
                        const month = dateObj.getMonth() + 1;
                        const slotYear = dateObj.getFullYear();
                        
                        if (lastYearFilter && slotYear !== lastYearFilter) return false;
                        if (lastSemesterFilter && !lastSemesterFilter.includes(month)) return false;
                        
                        return true;
                    });
                }
                
                // ✅ 優化：從已分組的數據中獲取待約記錄
                const lastPeriodPendingRecords = allPendingRecordsForPage.filter(r => r.studentId === studentId);
                
                const lastPeriodPendingReceiptUrls = [...new Set(lastPeriodPendingRecords
                    .map(r => r.receiptImageUrl)
                    .filter(Boolean))];
                
                const lastPeriodPendingReceiptDateMap = {};
                if (lastPeriodPendingReceiptUrls.length > 0) {
                    const relatedRecords = await timeslotCollection.find({
                        receiptImageUrl: { $in: lastPeriodPendingReceiptUrls },
                        classDate: { $nin: [null, ''] }
                    }).toArray();
                    
                    for (const relatedRecord of relatedRecords) {
                        if (!lastPeriodPendingReceiptDateMap[relatedRecord.receiptImageUrl]) {
                            lastPeriodPendingReceiptDateMap[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                        }
                    }
                }
                
                const lastPeriodPendingFiltered = lastPeriodPendingRecords.filter(pendingRecord => {
                    let classDate = null;
                    
                    if (pendingRecord.classDate && pendingRecord.classDate !== '') {
                        classDate = pendingRecord.classDate;
                    } else if (pendingRecord.receiptImageUrl && lastPeriodPendingReceiptDateMap[pendingRecord.receiptImageUrl]) {
                        classDate = lastPeriodPendingReceiptDateMap[pendingRecord.receiptImageUrl];
                    }
                    
                    if (!classDate) return false;
                    
                    const date = formatDateToYYYYMMDD(classDate) || classDate;
                    const dateObj = new Date(date);
                    if (isNaN(dateObj.getTime())) return false;
                    
                    const month = dateObj.getMonth() + 1;
                    const slotYear = dateObj.getFullYear();
                    
                    if (lastYearFilter && slotYear !== lastYearFilter) return false;
                    if (lastSemesterFilter && !lastSemesterFilter.includes(month)) return false;
                    
                    return true;
                });
                
                lastPeriodPending = lastPeriodPendingFiltered.length;
                lastPeriodLeaveRequests = lastPeriodTimeslots.filter(s => s.isLeave === true).length;
                
                // ✅ 計算上期的統計數據
                const lastPeriodAttendedBooked = lastPeriodTimeslots.filter(s => s.isAttended === true).length;
                const lastPeriodAttendedMakeup = lastPeriodTimeslots.filter(s => 
                    (s.isChangeDate === true || s.isChangeLocation === true) && s.isAttended === true
                ).length;
                const lastPeriodAbsences = lastPeriodTimeslots.filter(s => s.isAttended === false).length;
                const lastPeriodPurchasedClasses = lastPeriodTimeslots.length;
                
                // ✅ 上期剩餘堂數 = 上期已購堂數 - 上期已出席 - 上期已缺席
                // 注意：lastPeriodAttendedBooked 已經包含了所有 isAttended === true 的記錄（包括補堂已出席），
                // 所以不需要再減去 lastPeriodAttendedMakeup，否則會重複扣除
                lastPeriodRemaining = Math.max(0, lastPeriodPurchasedClasses - lastPeriodAttendedBooked - lastPeriodAbsences);
            } else {
                // 如果沒有指定學期/年份，上期剩餘堂數為 0
                lastPeriodRemaining = 0;
            }
            
            // ✅ 可約補堂 = 上期剩餘堂數 + 本期請假堂數 + 待約
            const bookableMakeup = lastPeriodRemaining + currentPeriodLeaveRequests + pendingClasses;
            
            // ✅ 計算本期剩餘時數：（本期已購堂數 - 本期已出席 - 本期補堂已出席 - 本期已缺席）的剩餘資料格的total_time_slot的總和
            // 剩餘記錄 = 本期已購堂數 - 已出席 - 補堂已出席 - 已缺席
            const remainingRecords = timeslots.filter(s => {
                // 排除已出席的記錄
                if (s.isAttended === true) return false;
                // 排除補堂已出席的記錄
                if ((s.isChangeDate === true || s.isChangeLocation === true) && s.isAttended === true) return false;
                // 排除已缺席的記錄（isAttended === false）
                if (s.isAttended === false) return false;
                return true;
            });
            
            const currentPeriodRemainingTimeSlots = remainingRecords.reduce((sum, slot) => {
                const timeSlot = slot.total_time_slot || 1;
                return sum + timeSlot;
            }, 0);
            
            // ✅ 計算可補時數：（上期剩餘堂數 + 本期請假堂數 + 待約）的對應資料格的total_time_slot的總和
            // 需要找出對應的記錄：
            // 1. 上期剩餘的記錄（需要查詢上一期的記錄）
            // 2. 本期請假的記錄（isLeave === true）
            // 3. 待約的記錄（isPending === true）
            let bookableMakeupSlots = [];
            
            // 本期請假的記錄
            const currentLeaveSlots = timeslots.filter(s => s.isLeave === true);
            bookableMakeupSlots.push(...currentLeaveSlots);
            
            // 待約的記錄
            bookableMakeupSlots.push(...allPendingRecords);
            
            // 上期剩餘的記錄（如果有上一期數據）
            if (semesterFilter && yearFilter && lastPeriodRemaining > 0) {
                // 查詢上一期的剩餘記錄
                const lastPeriodRemainingRecords = lastPeriodTimeslots.filter(s => {
                    // 排除已出席的記錄
                    if (s.isAttended === true) return false;
                    // 排除補堂已出席的記錄
                    if ((s.isChangeDate === true || s.isChangeLocation === true) && s.isAttended === true) return false;
                    // 排除已缺席的記錄（isAttended === false）
                    if (s.isAttended === false) return false;
                    return true;
                });
                bookableMakeupSlots.push(...lastPeriodRemainingRecords);
            }
            
            const bookableMakeupTimeSlots = bookableMakeupSlots.reduce((sum, slot) => {
                const timeSlot = slot.total_time_slot || 1;
                return sum + timeSlot;
            }, 0);
            
            // ✅ 剩餘堂數已在上面計算：remainingClasses = canStillAttend + canStillBook
            
            const studentData = {
                studentId: studentId,
                name: student.name || '',
                purchasedClasses: currentPurchasedClasses, // ✅ 本期已購堂數：根據學期/年份過濾後的記錄數量
                lastPeriodRemaining: lastPeriodRemaining, // ✅ 上期剩餘堂數：上期已購堂數 - 上期已出席 - 上期補堂已出席 - 上期已缺席
                currentPeriodRemaining: currentPeriodRemaining, // ✅ 本期剩餘堂數：本期已購堂數 - 本期已出席 - 本期補堂已出席 - 本期已缺席
                scheduledClasses: scheduledClasses, // 已定日子課堂
                attendedBooked: attendedBooked, // 已出席
                absences: absences, // 缺席
                currentPeriodLeaveRequests: currentPeriodLeaveRequests, // ✅ 本期請假堂數：本期isLeave為true的數量
                pendingClasses: pendingClasses, // ✅ 待約：isPending === true 的記錄
                bookableMakeup: bookableMakeup, // ✅ 可約補堂：上期剩餘堂數 + 本期請假堂數 + 待約
                bookedMakeup: bookedMakeup, // 已約補堂
                attendedMakeup: attendedMakeup, // 補堂已出席
                // ✅ 時數相關字段
                currentPeriodRemainingTimeSlots: parseFloat(currentPeriodRemainingTimeSlots.toFixed(1)), // ✅ 本期剩餘時數：（本期已購堂數 - 本期已出席 - 本期補堂已出席 - 本期已缺席）的剩餘資料格的total_time_slot的總和
                bookableMakeupTimeSlots: parseFloat(bookableMakeupTimeSlots.toFixed(1)) // ✅ 可補時數：（上期剩餘堂數 + 本期請假堂數 + 待約）的對應資料格的total_time_slot的總和
            };
            
            return studentData;
        });
        
        // ✅ 優化：並行處理所有學生，等待所有Promise完成
        const studentResults = await Promise.all(studentPromises);
        
        // 過濾掉null值（找不到學生的情況）
        const formattedStudents = studentResults.filter(s => s !== null);
        
        // ✅ 總數和分頁已經在上面計算好了
        const totalPages = Math.ceil(total / parseInt(limit)) || 1;
        
        console.log('📊 學生堂數查詢結果:', {
            semester: semester || '無',
            year: year || '無',
            total: total,
            totalPages: totalPages,
            returnedStudents: formattedStudents.length,
            page: parseInt(page)
        });
        
        res.json({
            success: true,
            students: formattedStudents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: totalPages,
                hasMore: parseInt(page) < totalPages
            }
        });
    } catch (error) {
        console.error('❌ 獲取學生堂數數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取學生堂數數據失敗',
            error: error.message
        });
    }
});

// 啟動服務器
app.listen(PORT, async () => {
    console.log(`🚀 API 服務器啟動成功 - 端口: ${PORT}`);
    console.log(`📊 健康檢查: http://localhost:${PORT}/health`);
    // 初始化 MongoDB 連接池
    await getMongoClient();
});

module.exports = app;
