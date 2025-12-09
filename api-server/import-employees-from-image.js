/**
 * 批量導入員工資料到 Admin_account 集合
 * 從圖片表格中提取：中文名、英文名、電話號碼、全職/兼職、職位
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_BASE_URI = process.env.MONGO_BASE_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB_NAME = process.env.DEFAULT_DB_NAME || 'test';

// ✅ 從圖片中提取的員工數據（根據 WhatsApp Image 2025-12-02 at 12.36.31.jpeg）
// 格式：{ 中文姓名, 英文姓名, 電話號碼, 全職/兼職, 職位 }
const employeesData = [
    { chineseName: '郭兆忠', englishName: 'Kwok Siu Chung', phone: '98766873', employmentType: '全職', position: '總監' },
    { chineseName: '黃智樂', englishName: 'Wong Chi Lok', phone: '97681657', employmentType: '全職', position: '總教練' },
    { chineseName: '黃子峰', englishName: 'Wong Tsz Fung', phone: '63559985', employmentType: '全職', position: '主管' },
    { chineseName: '葉文瀚', englishName: 'Ip Man Hon', phone: '91699680', employmentType: '全職', position: '教練' },
    { chineseName: '陳泰江', englishName: 'Chan Chun Kon', phone: '91588663', employmentType: '全職', position: '教練' },
    { chineseName: '林卓恩', englishName: 'Lam Cheuk Yan', phone: '64344181', employmentType: '全職', position: '教練' },
    { chineseName: '孫子健', englishName: 'Suen Tsz Kin', phone: '91638221', employmentType: '全職', position: '教練' },
    { chineseName: '趙順安', englishName: 'Zhao Shu Nan', phone: '51828931', employmentType: '全職', position: '教練' },
    { chineseName: '梁泳藝', englishName: 'Leung Wing Ngai', phone: '52236619', employmentType: '全職', position: '教練' },
    { chineseName: '陳蔚林', englishName: 'Chan Wai Lam', phone: '62563923', employmentType: '全職', position: '教練' },
    { chineseName: '邱嗣培', englishName: 'Yau Chi Pui', phone: '97924290', employmentType: '全職', position: '教練' },
    { chineseName: '蔡敏芝', englishName: 'Choi Man Chi Fiona', phone: '63303357', employmentType: '全職', position: '教練' },
    { chineseName: '蔡肇聰', englishName: 'Choy siu chung', phone: '98256363', employmentType: '全職', position: '教練' },
    { chineseName: '文苑琦', englishName: 'Man Yuen kei', phone: '59885970', employmentType: '全職', position: '教練' },
    { chineseName: '曾詩朗', englishName: 'Tsang Sze Long Sharon', phone: '98790667', employmentType: '全職', position: '教練' },
    { chineseName: '梁馨華', englishName: 'Leung Hing Wah', phone: '51179390', employmentType: '全職', position: '教練' },
    { chineseName: '黃瑋', englishName: 'Wong Wai Angela', phone: '62757881', employmentType: '全職', position: '高級行政助理' },
    { chineseName: '吳夢宜', englishName: 'NG MUNG YEE', phone: '64180773', employmentType: '全職', position: '助教' },
    { chineseName: '袁鏡澄', englishName: 'Yuen Yee Ching', phone: '55431828', employmentType: '全職', position: '教練' },
    { chineseName: '梁劍怡', englishName: 'Leung Kim yi Angel', phone: '54044202', employmentType: '全職', position: '教練' },
    { chineseName: '林浩文', englishName: 'Lam Ho Man', phone: '', employmentType: '', position: '' }
];

/**
 * 將職位映射到 type 字段
 */
function mapPositionToType(position) {
    if (!position) return 'coach';
    
    const positionLower = position.toLowerCase();
    
    if (positionLower.includes('總監') || positionLower.includes('總教練')) {
        return 'manager';
    } else if (positionLower.includes('主管')) {
        return 'supervisor';
    } else if (positionLower.includes('行政') || positionLower.includes('文書') || positionLower.includes('助理')) {
        return 'admin';
    } else {
        return 'coach';
    }
}

/**
 * 生成唯一的 employeeId
 */
async function generateEmployeeId(collection, type) {
    const typePrefix = {
        'supervisor': 'S',
        'manager': 'M',
        'admin': 'A',
        'coach': 'C'
    }[type] || 'C';
    
    // 查找同類型員工的最大 employeeId
    const maxEmployeeResult = await collection.aggregate([
        {
            $match: {
                type: type,
                employeeId: { 
                    $exists: true, 
                    $ne: null,
                    $regex: new RegExp(`^${typePrefix}\\d+$`)
                }
            }
        },
        {
            $project: {
                employeeId: 1,
                number: {
                    $cond: {
                        if: { 
                            $and: [
                                { $ne: ['$employeeId', null] }, 
                                { $ne: ['$employeeId', ''] },
                                { $regexMatch: { input: { $toString: '$employeeId' }, regex: new RegExp(`^${typePrefix}\\d+$`) } }
                            ] 
                        },
                        then: { 
                            $convert: {
                                input: {
                                    $substr: ['$employeeId', 1, -1]
                                },
                                to: 'int',
                                onError: null,
                                onNull: null
                            }
                        },
                        else: null
                    }
                }
            }
        },
        {
            $match: {
                number: { $ne: null, $type: 'number' }
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
    
    // 確保 employeeId 唯一
    let newEmployeeId;
    let attempts = 0;
    do {
        const numberPart = String(nextNumber).padStart(4, '0');
        newEmployeeId = `${typePrefix}${numberPart}`;
        const existingCheck = await collection.findOne({ employeeId: newEmployeeId });
        if (!existingCheck) break;
        nextNumber++;
        attempts++;
        if (attempts > 100) {
            throw new Error('無法生成唯一的 employeeId');
        }
    } while (true);
    
    return newEmployeeId;
}

async function importEmployees() {
    let client;
    try {
        console.log('🔄 開始批量導入員工資料...');
        
        client = await MongoClient.connect(MONGO_BASE_URI);
        const db = client.db(DEFAULT_DB_NAME);
        const collection = db.collection('Admin_account');
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const emp of employeesData) {
            try {
                // 跳過沒有電話號碼的記錄
                if (!emp.phone || emp.phone.trim() === '') {
                    console.log(`⚠️ 跳過：${emp.chineseName} - 沒有電話號碼`);
                    skipCount++;
                    continue;
                }
                
                const phone = emp.phone.trim();
                
                // 檢查電話是否已存在
                const existing = await collection.findOne({ phone: phone });
                if (existing) {
                    console.log(`⏭️ 跳過：${emp.chineseName} (${phone}) - 電話號碼已存在`);
                    skipCount++;
                    continue;
                }
                
                // 映射職位到 type
                const type = mapPositionToType(emp.position);
                
                // 生成 employeeId
                const employeeId = await generateEmployeeId(collection, type);
                
                // 生成密碼（使用電話號碼後四位）
                const password = phone.length >= 4 ? phone.slice(-4) : phone;
                
                // 構建員工數據
                const employeeData = {
                    name: emp.chineseName,
                    englishName: emp.englishName || '',
                    phone: phone,
                    type: type,
                    employeeId: employeeId,
                    password: password,
                    employmentType: emp.employmentType || '全職',
                    position: emp.position || '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                // 插入數據
                await collection.insertOne(employeeData);
                console.log(`✅ 創建成功：${emp.chineseName} (${phone}) - ${type} - ${employeeId}`);
                successCount++;
                
            } catch (error) {
                console.error(`❌ 創建失敗：${emp.chineseName} (${emp.phone}) - ${error.message}`);
                errors.push({ employee: emp, error: error.message });
                errorCount++;
            }
        }
        
        console.log('\n📊 導入結果統計：');
        console.log(`✅ 成功：${successCount} 個`);
        console.log(`⏭️ 跳過（已存在）：${skipCount} 個`);
        console.log(`❌ 失敗：${errorCount} 個`);
        
        if (errors.length > 0) {
            console.log('\n❌ 失敗詳情：');
            errors.forEach(({ employee, error }) => {
                console.log(`  - ${employee.chineseName} (${employee.phone}): ${error}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 批量導入失敗:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ MongoDB 連接已關閉');
        }
    }
}

// 運行導入函數
if (require.main === module) {
    importEmployees()
        .then(() => {
            console.log('\n✅ 批量導入完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 批量導入失敗:', error);
            process.exit(1);
        });
}

module.exports = { importEmployees };

