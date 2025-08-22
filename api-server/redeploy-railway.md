# 🚂 Railway API 重新部署指南

## 📋 當前問題
Railway上的API服務器缺少 `/coach-roster` 端點，需要重新部署包含最新代碼的版本。

## 🚀 重新部署步驟

### 步驟 1: 檢查當前代碼
確保 `api-server/server.js` 包含更表端點：

```javascript
// 取得教練某月份的更表資料（Coach_roster）
app.get('/coach-roster', validateApiKeys, async (req, res) => {
  try {
    const phone = (req.query.phone || '').toString();
    const name = (req.query.name || '').toString();
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    if (!phone || !name || !year || !month) {
      return res.status(400).json({ success: false, message: '缺少必要參數 phone, name, year, month' });
    }
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('Coach_roster');
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const docs = await col.find({ phone, name, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).toArray();
    await client.close();
    const records = (docs || []).map(d => ({ date: d.date, time: d.time || '', location: d.location || '' }));
    return res.json({ success: true, records });
  } catch (e) {
    console.error('❌ 讀取更表錯誤:', e);
    return res.status(500).json({ success: false, message: '讀取更表失敗', error: e.message });
  }
});
```

### 步驟 2: 登錄 Railway 控制台
1. 訪問：https://railway.app
2. 使用您的賬號登錄
3. 找到您的API項目：`swimming-attendance-system-production`

### 步驟 3: 觸發重新部署
1. 在項目控制台中，點擊 "Deployments" 標籤
2. 點擊 "Redeploy" 按鈕
3. 選擇 "Deploy from GitHub repo"
4. 確保選擇正確的倉庫和 `api-server` 目錄

### 步驟 4: 檢查環境變量
確保以下環境變量已正確設置：

```
MONGODB_URI=mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=test
API_PUBLIC_KEY=ttdrcccy
API_PRIVATE_KEY=2b207365-cbf0-4e42-a3bf-f932c84557c4
```

### 步驟 5: 等待部署完成
1. 監控部署進度
2. 等待狀態變為 "Deployed"
3. 檢查部署日誌是否有錯誤

### 步驟 6: 測試新端點
部署完成後，測試更表端點：

```bash
# 測試健康檢查
curl -H "x-api-public-key: ttdrcccy" -H "x-api-private-key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" "https://swimming-attendance-system-production.up.railway.app/health"

# 測試更表端點
curl -H "x-api-public-key: ttdrcccy" -H "x-api-private-key: 2b207365-cbf0-4e42-a3bf-f932c84557c4" "https://swimming-attendance-system-production.up.railway.app/coach-roster?phone=66666666&name=AAAb&year=2025&month=8"
```

## 🔧 替代方案：手動推送代碼

如果自動重新部署不工作，可以手動推送代碼到GitHub：

### 1. 提交最新代碼
```bash
cd api-server
git add .
git commit -m "Add coach roster endpoint"
git push origin main
```

### 2. Railway 會自動檢測並重新部署

## 🧪 部署後測試

### 1. 使用測試腳本
```bash
node test-railway-api.js
```

### 2. 測試手機應用
1. 安裝最新構建的APK
2. 使用教練賬號登錄：`66666666` / `123456`
3. 檢查更表功能是否正常顯示

## 📊 驗證清單

- [ ] Railway 部署狀態為 "Deployed"
- [ ] 健康檢查端點返回 200
- [ ] 更表端點返回正確數據
- [ ] 手機應用能正常載入更表
- [ ] 更表日曆顯示正確的時間和地點

## 🚨 故障排除

### 如果部署失敗：
1. 檢查部署日誌
2. 確認環境變量設置正確
3. 檢查 `package.json` 格式
4. 確認所有依賴都已安裝

### 如果端點仍然404：
1. 確認代碼已正確推送
2. 檢查 `server.js` 是否包含更表端點
3. 重新觸發部署

## 🎉 完成！

部署成功後，手機應用就能正常顯示更表內容了！ 