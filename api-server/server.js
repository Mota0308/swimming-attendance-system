const express = require('express');
const cors = require('cors');
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
        
        if (loginType === 'coach' || loginType === 'supervisor' || loginType === 'admin') {
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
        const { page = 1, limit = 50, phone } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Student_account');
        
        const query = {};
        if (phone) {
            query.phone = phone;
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
        if (month) {
            const targetMonth = parseInt(month);
            const year = new Date().getFullYear();
            const startDate = new Date(year, targetMonth - 1, 1);
            const endDate = new Date(year, targetMonth, 0, 23, 59, 59);
            query.date = { $gte: startDate, $lte: endDate };
        }
        if (phone) {
            query.phone = phone;
        }
        
        const roster = await collection.find(query).toArray();
        const formattedRoster = roster.map(item => ({
            date: item.date,
            time: item.time || item.timeRange || '',
            location: item.location || item.place || '',
            phone: item.phone || item.coachPhone || '',
            name: item.name || item.coachName || ''
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
        
        // ==================== 5. 按 classDate + location 分組 ====================
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
                isChangeDate: record.isChangeDate || false,
                isChangeTime: record.isChangeTime || false,
                isChangeLocation: record.isChangeLocation || false
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
        
        if (isAttended !== undefined) {
            updateData.isAttended = isAttended === true;
        }
        if (isLeave !== undefined) {
            updateData.isLeave = isLeave === true;
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
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (classTime !== undefined) {
            updateData.classTime = classTime;
            updateData.isChangeTime = true;
        }
        if (classFormat !== undefined) {
            updateData.classFormat = classFormat;
        }
        if (instructorType !== undefined) {
            updateData.instructorType = instructorType;
        }
        if (classDate !== undefined) {
            updateData.classDate = classDate;
            updateData.isChangeDate = true;
        }
        if (location !== undefined) {
            updateData.location = location;
            updateData.isChangeLocation = true;
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
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (classDate !== undefined) {
            updateData.classDate = classDate;
            updateData.isChangeDate = true;
        }
        if (location !== undefined) {
            updateData.location = location;
            updateData.isChangeLocation = true;
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
        
        if (isAttended !== undefined) {
            updateData.isAttended = isAttended === true;
        }
        if (isLeave !== undefined) {
            updateData.isLeave = isLeave === true;
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
        
        const coachRecords = await collection.find({
            phone,
            year: parseInt(year),
            month: parseInt(month),
            editorType: 'coach'
        }).toArray();
        
        const adminRecords = await collection.find({
            phone,
            year: parseInt(year),
            month: parseInt(month),
            editorType: { $in: ['admin', 'supervisor'] }
        }).toArray();
        
        res.json({
            success: true,
            comparisonResults: {
                coach: coachRecords,
                admin: adminRecords
            }
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
        
        const result = await collection.insertOne({
            ...employeeData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        res.json({
            success: true,
            message: '創建成功',
            employee: {
                id: result.insertedId,
                ...employeeData
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

// 刪除學生資料
app.delete('/students/:id', validateApiKeys, async (req, res) => {
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
    }
});

// ==================== 課程相關端點 ====================

// 獲取課堂形式
app.get('/class-formats', validateApiKeys, async (req, res) => {
    try {
        const { classType } = req.query;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('class_format');
        
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
    }
});

// 獲取導師級別
app.get('/instructor-levels', validateApiKeys, async (req, res) => {
    try {
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Instructor_type');
        
        const instructorLevels = await collection.find({}).toArray();
        
        res.json({
            success: true,
            instructorLevels: instructorLevels
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
        
        const pricing = await collection.findOne({
            classType: classType,
            classFormat: classFormat,
            instructorLevel: instructorLevel
        });
        
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
        
        const result = await collection.insertMany(payload.records || [payload]);
        
        res.json({
            success: true,
            message: '創建成功',
            count: result.insertedCount,
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
        const collection = db.collection('Student_bill');
        
        const result = await collection.insertOne({
            ...billData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        res.json({
            success: true,
            message: '創建成功',
            billId: result.insertedId
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

// 獲取學生的所有補堂日期（已約補堂），按學期分類
app.get('/student/:studentId/makeup-dates', validateApiKeys, async (req, res) => {
    try {
        const { studentId } = req.params;
        const client = await getMongoClient();
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('students_timeslot');
        
        // 查詢該學生的所有補堂記錄（isChangeDate || isChangeTime || isChangeLocation 為 true）
        const records = await collection.find({
            studentId: studentId,
            $or: [
                { isChangeDate: true },
                { isChangeTime: true },
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
            
            // 找出所有符合條件的學生ID
            const validStudentIds = [];
            for (const studentId of allStudentIds) {
                const timeslotQuery = { studentId: studentId };
                if (semesterFilter || yearFilter) {
                    timeslotQuery.classDate = { $nin: [null, ''] };
                }
                
                let studentTimeslots = await timeslotCollection.find(timeslotQuery).toArray();
                
                // 過濾符合條件的記錄
                studentTimeslots = studentTimeslots.filter(slot => {
                    let classDate = slot.classDate;
                    
                    // 如果 classDate 為空，嘗試通過 receiptImageUrl 查找
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
                
                if (studentTimeslots.length > 0) {
                    validStudentIds.push(studentId);
                }
            }
            
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
        
        // 為每個學生計算統計數據
        const formattedStudents = [];
        
        // 批量查詢所有需要的 receiptImageUrl 對應的日期（用於當前頁的學生）
        const receiptUrlsForPage = [...new Set(
            (await timeslotCollection.find({ 
                studentId: { $in: studentIdsForPage },
                receiptImageUrl: { $nin: [null, ''] }
            }).toArray())
                .map(r => r.receiptImageUrl)
                .filter(Boolean)
        )];
        
        const receiptDateMapForPage = {};
        if (receiptUrlsForPage.length > 0) {
            const relatedRecords = await timeslotCollection.find({
                receiptImageUrl: { $in: receiptUrlsForPage },
                classDate: { $nin: [null, ''] }
            }).toArray();
            
            for (const relatedRecord of relatedRecords) {
                if (!receiptDateMapForPage[relatedRecord.receiptImageUrl]) {
                    receiptDateMapForPage[relatedRecord.receiptImageUrl] = relatedRecord.classDate;
                }
            }
        }
        
        for (const studentId of studentIdsForPage) {
            const student = allStudents.find(s => s.studentId === studentId);
            if (!student) continue;
            
            // 構建查詢條件
            const timeslotQuery = { studentId: studentId };
            
            // 如果指定了學期或年份，需要過濾 classDate
            if (semesterFilter || yearFilter) {
                timeslotQuery.classDate = { $nin: [null, ''] };
            }
            
            // 獲取該學生的所有時段記錄
            let timeslots = await timeslotCollection.find(timeslotQuery).toArray();
            
            // 如果指定了學期或年份，需要進一步過濾
            if (semesterFilter || yearFilter) {
                timeslots = timeslots.filter(slot => {
                    let classDate = slot.classDate;
                    
                    // 如果 classDate 為空，嘗試通過 receiptImageUrl 查找
                    if (!classDate && slot.receiptImageUrl && receiptDateMapForPage[slot.receiptImageUrl]) {
                        classDate = receiptDateMapForPage[slot.receiptImageUrl];
                    }
                    
                    if (!classDate) return false;
                    
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
            
            // 計算統計數據（基於過濾後的記錄）
            const stats = {
                purchasedClasses: timeslots.length,
                scheduledClasses: timeslots.filter(s => s.classDate && s.classDate !== '' && s.isLeave !== true).length,
                attendedBooked: timeslots.filter(s => s.isAttended === true).length,
                absences: 0,
                leaveRequests: timeslots.filter(s => s.isLeave === true).length,
                bookedMakeup: timeslots.filter(s => s.isChangeDate === true || s.isChangeTime === true || s.isChangeLocation === true).length,
                attendedMakeup: timeslots.filter(s => (s.isChangeDate === true || s.isChangeTime === true || s.isChangeLocation === true) && s.isAttended === true).length
            };
            
            // 計算缺席（過去日期 && isAttended 不為 true）
            const todayString = new Date().toISOString().split('T')[0];
            stats.absences = timeslots.filter(s => {
                if (!s.classDate) return false;
                const classDateStr = formatDateToYYYYMMDD(s.classDate) || s.classDate;
                return classDateStr < todayString && s.isAttended !== true;
            }).length;
            
            // ✅ 如果指定了學期或年份，只包含有數據的學生（至少有一條記錄）
            // 如果沒有指定篩選條件，包含所有學生（即使數據為0）
            const hasData = stats.purchasedClasses > 0 || 
                           stats.scheduledClasses > 0 || 
                           stats.attendedBooked > 0 || 
                           stats.absences > 0 || 
                           stats.leaveRequests > 0 || 
                           stats.bookedMakeup > 0 || 
                           stats.attendedMakeup > 0;
            
            // ✅ 如果指定了篩選條件，studentIdsForPage 已經只包含有數據的學生
            // 所以這裡直接添加即可（因為已經在分頁前過濾過了）
            if (!semesterFilter && !yearFilter) {
                // 沒有篩選條件，包含所有學生
                formattedStudents.push({
                    studentId: studentId,
                    name: student.name || '',
                    totalClasses: stats.purchasedClasses,
                    purchasedClasses: stats.purchasedClasses,
                    lastPeriodRemaining: stats.purchasedClasses - stats.scheduledClasses,
                    scheduledClasses: stats.scheduledClasses,
                    attendedBooked: stats.attendedBooked,
                    absences: stats.absences,
                    leaveRequests: stats.leaveRequests,
                    bookedMakeup: stats.bookedMakeup,
                    attendedMakeup: stats.attendedMakeup
                });
            } else {
                // 有篩選條件，studentIdsForPage 已經只包含有數據的學生，直接添加
                formattedStudents.push({
                    studentId: studentId,
                    name: student.name || '',
                    totalClasses: stats.purchasedClasses,
                    purchasedClasses: stats.purchasedClasses,
                    lastPeriodRemaining: stats.purchasedClasses - stats.scheduledClasses,
                    scheduledClasses: stats.scheduledClasses,
                    attendedBooked: stats.attendedBooked,
                    absences: stats.absences,
                    leaveRequests: stats.leaveRequests,
                    bookedMakeup: stats.bookedMakeup,
                    attendedMakeup: stats.attendedMakeup
                });
            }
        }
        
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
