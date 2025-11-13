# 後端性能優化建議

## 🔍 當前狀態分析

### 已實施的優化
1. ✅ 使用 `Promise.all` 並行查詢（如 `/students` 端點）
2. ✅ 使用 MongoDB 聚合管道優化分組查詢（`/work-hours/compare`）
3. ✅ 分頁支持減少數據傳輸量

### 需要優化的地方

## 📊 數據庫索引優化

### 建議添加的索引

#### 1. Admin_account 集合
```javascript
// 登入查詢優化
db.Admin_account.createIndex({ phone: 1, password: 1, type: 1 });
```

#### 2. Staff_work_hours 集合
```javascript
// 工時查詢優化
db.Staff_work_hours.createIndex({ phone: 1, year: 1, month: 1 });
db.Staff_work_hours.createIndex({ phone: 1, location: 1, club: 1, workDate: 1 });
db.Staff_work_hours.createIndex({ phone: 1, editorType: 1, year: 1, month: 1 });
```

#### 3. Coach_roster 集合
```javascript
// 更表查詢優化
db.Coach_roster.createIndex({ phone: 1, date: 1 });
db.Coach_roster.createIndex({ date: 1 }); // 月份查詢
```

#### 4. Student_account 集合
```javascript
// 學生查詢優化
db.Student_account.createIndex({ phone: 1 });
db.Student_account.createIndex({ name: 1 }); // 搜索優化
```

#### 5. students_timeslot 集合
```javascript
// 時段查詢優化
db.students_timeslot.createIndex({ studentPhone: 1, classDate: 1 });
db.students_timeslot.createIndex({ classDate: 1, location: 1 });
```

#### 6. Pricing 集合
```javascript
// 價格查詢優化
db.Pricing.createIndex({ class_type: 1, class_format: 1, instructor_level: 1 }, { unique: true });
```

### 索引創建腳本

創建 `create-indexes.js` 文件：

```javascript
const { MongoClient } = require('mongodb');

async function createIndexes() {
    const client = new MongoClient(process.env.MONGO_BASE_URI);
    await client.connect();
    const db = client.db(process.env.DEFAULT_DB_NAME || 'test');
    
    try {
        // Admin_account
        await db.collection('Admin_account').createIndex({ phone: 1, password: 1, type: 1 });
        
        // Staff_work_hours
        await db.collection('Staff_work_hours').createIndex({ phone: 1, year: 1, month: 1 });
        await db.collection('Staff_work_hours').createIndex({ phone: 1, location: 1, club: 1, workDate: 1 });
        await db.collection('Staff_work_hours').createIndex({ phone: 1, editorType: 1, year: 1, month: 1 });
        
        // Coach_roster
        await db.collection('Coach_roster').createIndex({ phone: 1, date: 1 });
        await db.collection('Coach_roster').createIndex({ date: 1 });
        
        // Student_account
        await db.collection('Student_account').createIndex({ phone: 1 });
        await db.collection('Student_account').createIndex({ name: 1 });
        
        // students_timeslot
        await db.collection('students_timeslot').createIndex({ studentPhone: 1, classDate: 1 });
        await db.collection('students_timeslot').createIndex({ classDate: 1, location: 1 });
        
        // Pricing
        await db.collection('Pricing').createIndex(
            { class_type: 1, class_format: 1, instructor_level: 1 }, 
            { unique: true }
        );
        
        console.log('✅ 所有索引創建完成');
    } catch (error) {
        console.error('❌ 創建索引失敗:', error);
    } finally {
        await client.close();
    }
}

createIndexes();
```

## 🚀 查詢優化建議

### 1. 使用投影減少數據傳輸
```javascript
// ❌ 不推薦：獲取所有字段
const students = await collection.find({}).toArray();

// ✅ 推薦：只獲取需要的字段
const students = await collection.find({}, {
    projection: { password: 0, _id: 0 } // 排除不需要的字段
}).toArray();
```

### 2. 使用聚合管道優化複雜查詢
```javascript
// ✅ 示例：優化工時比較查詢（已實施）
const pipeline = [
    { $match: { phone, year, month } },
    { $group: { _id: { location: "$location", date: "$workDate" }, records: { $push: "$$ROOT" } } }
];
```

### 3. 批量操作優化
```javascript
// ✅ 使用 bulkWrite 進行批量更新
const operations = records.map(record => ({
    updateOne: {
        filter: { phone: record.phone, workDate: record.workDate },
        update: { $set: record },
        upsert: true
    }
}));
await collection.bulkWrite(operations);
```

### 4. 連接池優化
```javascript
// 使用連接池，避免頻繁創建連接
const client = new MongoClient(MONGO_BASE_URI, {
    maxPoolSize: 10, // 最大連接數
    minPoolSize: 5,  // 最小連接數
    maxIdleTimeMS: 30000 // 空閒連接超時
});
```

## 📈 緩存策略

### 1. 內存緩存（Node.js）
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5分鐘緩存

// 使用緩存
app.get('/coaches', validateApiKeys, async (req, res) => {
    const cacheKey = 'coaches-list';
    const cached = cache.get(cacheKey);
    
    if (cached) {
        return res.json(cached);
    }
    
    // 查詢數據庫
    const coaches = await collection.find({}).toArray();
    const result = { success: true, coaches };
    
    // 保存到緩存
    cache.set(cacheKey, result);
    res.json(result);
});
```

### 2. Redis 緩存（可選，用於生產環境）
```javascript
const redis = require('redis');
const client = redis.createClient();

app.get('/coaches', validateApiKeys, async (req, res) => {
    const cached = await client.get('coaches-list');
    if (cached) {
        return res.json(JSON.parse(cached));
    }
    
    const coaches = await collection.find({}).toArray();
    const result = { success: true, coaches };
    await client.setEx('coaches-list', 300, JSON.stringify(result));
    res.json(result);
});
```

## 🔧 響應優化

### 1. 壓縮響應
```javascript
const compression = require('compression');
app.use(compression()); // 啟用 gzip 壓縮
```

### 2. 設置適當的 HTTP 頭
```javascript
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5分鐘緩存
    res.setHeader('ETag', generateETag(req.url));
    next();
});
```

## 📝 監控和測量

### 1. 添加查詢時間日誌
```javascript
const startTime = Date.now();
const result = await collection.find(query).toArray();
const queryTime = Date.now() - startTime;
console.log(`⏱️ 查詢耗時: ${queryTime}ms`);
```

### 2. 使用 MongoDB 查詢分析
```javascript
// 啟用慢查詢日誌
db.setProfilingLevel(1, { slowms: 100 }); // 記錄超過100ms的查詢
```

## ⚠️ 注意事項

1. **索引維護**：索引會增加寫入開銷，需要平衡讀寫性能
2. **緩存失效**：數據更新時要清除相關緩存
3. **連接管理**：避免連接洩漏，確保正確關閉連接

## 🎯 預期效果

實施這些優化後，預期可以獲得：
- 查詢速度提升：50-80%
- 數據庫負載降低：30-50%
- API 響應時間減少：40-60%
























