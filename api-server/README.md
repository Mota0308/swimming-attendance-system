# 游泳課程管理系統 API 服務器

## 🚀 持續運行設置

為了確保API服務器在用戶使用APP時持續運行，我們提供了多種解決方案。

## 📋 文件說明

### 核心文件
- `server.js` - API服務器主程序
- `ecosystem.config.js` - PM2配置文件
- `auto-start.bat` - 自動啟動批處理文件

### 管理腳本
- `maintenance.ps1` - 維護腳本（推薦使用）
- `setup-windows-service.ps1` - Windows服務設置腳本
- `monitor-server.ps1` - 監控腳本

## 🔧 快速設置

### 1. 手動啟動（測試用）
```bash
# 直接啟動
node server.js

# 或使用PM2啟動
pm2 start ecosystem.config.js --env production
```

### 2. 自動啟動設置（推薦）

#### 方法A：使用維護腳本
```powershell
# 啟動服務器
.\maintenance.ps1 start

# 查看狀態
.\maintenance.ps1 status

# 重啟服務器
.\maintenance.ps1 restart

# 停止服務器
.\maintenance.ps1 stop

# 查看日誌
.\maintenance.ps1 logs

# 清理日誌
.\maintenance.ps1 clean
```

#### 方法B：設置Windows服務（開機自啟動）
```powershell
# 以管理員身份運行PowerShell
.\setup-windows-service.ps1 -Install
```

#### 方法C：使用批處理文件
```bash
# 雙擊運行
auto-start.bat
```

## 📊 監控和管理

### PM2 命令
```bash
# 查看狀態
pm2 status

# 查看日誌
pm2 logs swimming-api-server

# 重啟服務器
pm2 restart swimming-api-server

# 停止服務器
pm2 stop swimming-api-server

# 保存配置
pm2 save
```

### 健康檢查
API服務器提供健康檢查端點：
```
GET http://localhost:3000/health
```

## 🔄 自動重啟機制

### PM2 自動重啟
- 服務器崩潰時自動重啟
- 內存使用超過1GB時重啟
- 最多重啟10次，間隔4秒

### 日誌管理
- 錯誤日誌：`logs/err.log`
- 輸出日誌：`logs/out.log`
- 綜合日誌：`logs/combined.log`

## 🛠️ 故障排除

### 1. 端口被佔用
```bash
# 停止所有Node.js進程
taskkill /f /im node.exe

# 重新啟動
pm2 start ecosystem.config.js --env production
```

### 2. 服務器無法啟動
```bash
# 檢查Node.js版本
node --version

# 檢查PM2安裝
pm2 --version

# 重新安裝PM2
npm install -g pm2
```

### 3. 連接問題
```bash
# 檢查防火牆設置
netsh advfirewall firewall add rule name="Node.js API" dir=in action=allow protocol=TCP localport=3000

# 檢查端口監聽
netstat -an | findstr :3000
```

## 📱 手機APP連接

### 本地網絡
- API地址：`http://192.168.1.24:3000`
- 適用於手機和電腦在同一Wi-Fi網絡

### 公網訪問
- API地址：`http://203.145.95.240:3000`
- 適用於不同網絡的用戶

## 🔐 安全配置

### API密鑰
- 公開密鑰：`ttdrcccy`
- 私有密鑰：`2b207365-cbf0-4e42-a3bf-f932c84557c4`

### 網絡安全
- 允許HTTP連接
- 支持本地和公網訪問
- 已配置CORS

## 📈 性能監控

### 資源使用
- CPU使用率：實時監控
- 內存使用：限制1GB
- 重啟次數：記錄在PM2狀態中

### 日誌輪轉
- 自動清理舊日誌
- 保留最近1000行日誌
- 錯誤日誌單獨記錄

## 🚨 告警設置

### 服務器狀態檢查
```powershell
# 定期檢查（建議每小時執行一次）
.\maintenance.ps1 status
```

### 自動恢復
- PM2自動重啟崩潰的進程
- 系統重啟後自動啟動服務
- 日誌記錄所有錯誤

## 📞 支持

如果遇到問題，請檢查：
1. PM2狀態：`pm2 status`
2. 服務器日誌：`pm2 logs swimming-api-server`
3. 健康檢查：訪問 `http://localhost:3000/health`
4. 網絡連接：確保端口3000開放

## 🔄 更新和維護

### 更新服務器
```bash
# 停止服務器
pm2 stop swimming-api-server

# 更新代碼
git pull

# 重新啟動
pm2 start ecosystem.config.js --env production
```

### 備份配置
```bash
# 保存PM2配置
pm2 save

# 備份配置文件
copy ecosystem.config.js backup/
```

---

**注意**：確保服務器有足夠的內存和CPU資源來運行API服務器。建議定期檢查日誌文件以監控服務器健康狀況。 