# 更表數據遷移指南

## 概述
此遷移腳本會為舊的更表記錄添加 `slot` 字段（1=上午, 2=中午, 3=下午），確保月份更表能正確顯示在不同時段列中。

## 使用方法

### 方法 1: 使用 API 端點（推薦）

使用以下命令調用遷移端點：

**Windows PowerShell:**
```powershell
$headers = @{
    'Content-Type' = 'application/json'
    'X-API-Public-Key' = 'ttdrcccy'
    'X-API-Private-Key' = '2b207365-cbf0-4e42-a3bf-f932c84557c4'
}

Invoke-RestMethod -Uri 'https://swimming-attendance-system-production.up.railway.app/coach-roster/backfill-slots' -Method POST -Headers $headers
```

**curl (Linux/Mac):**
```bash
curl -X POST https://swimming-attendance-system-production.up.railway.app/coach-roster/backfill-slots \
  -H "Content-Type: application/json" \
  -H "X-API-Public-Key: ttdrcccy" \
  -H "X-API-Private-Key: 2b207365-cbf0-4e42-a3bf-f932c84557c4"
```

### 方法 2: 在本地運行（開發環境）

如果後端在本地運行：
```powershell
Invoke-RestMethod -Uri 'http://localhost:3001/coach-roster/backfill-slots' -Method POST -Headers $headers
```

## 遷移邏輯

遷移腳本會：
1. 查找所有沒有 `slot` 字段或 `slot` 無效（< 1 或 > 3）的記錄
2. 從 `time` 字段推導 `slot` 值：
   - **上午 (slot=1)**: 時間包含 "上午"、"morning"、"AM"，或時間範圍為 8:00-12:00
   - **中午 (slot=2)**: 時間包含 "中午"、"noon"、"lunch"，或時間範圍為 12:00-14:00
   - **下午 (slot=3)**: 時間包含 "下午"、"afternoon"、"PM"，或時間範圍為 14:00-18:00
   - **默認**: 如果無法推導，默認為上午 (slot=1)

## 預期結果

成功執行後，你會收到類似以下的響應：
```json
{
  "success": true,
  "message": "數據遷移完成",
  "total": 150,
  "updated": 150,
  "errors": 0
}
```

## 注意事項

1. **備份數據**: 執行遷移前建議先備份數據庫
2. **多次執行**: 遷移腳本可以安全地多次執行，只會更新沒有 `slot` 字段的記錄
3. **時間推導**: 如果舊數據的 `time` 字段無法明確推導時段，會默認設置為上午 (slot=1)

