# 🔒 游泳系統網頁應用安全指南

## 概述
本文檔詳細說明游泳系統網頁應用的安全配置和保護措施。

## Railway提供的基礎安全

### ✅ 已自動配置的安全功能
- **HTTPS/SSL**: 強制HTTPS訪問，自動SSL證書
- **DDoS防護**: 內建DDoS攻擊防護
- **網絡隔離**: 服務間網絡隔離
- **容器安全**: 安全的容器運行環境
- **環境變量**: 敏感信息通過環境變量管理
- **訪問控制**: 項目級別的訪問權限控制
- **日誌監控**: 完整的訪問和錯誤日誌

## 額外添加的安全功能

### 1. 前端安全防護

#### 🔐 登入安全
- **登入嘗試限制**: 最多5次失敗嘗試，15分鐘鎖定
- **速率限制**: 每分鐘最多5次請求
- **會話超時**: 30分鐘無活動自動登出
- **安全登出**: 清除所有敏感數據

#### 🛡️ XSS防護
- **輸入淨化**: 自動移除潛在的XSS代碼
- **內容安全策略**: 限制資源加載來源
- **XSS防護頭**: 瀏覽器級別XSS防護

#### 🚫 CSRF防護
- **CSRF令牌**: 每個表單自動添加CSRF令牌
- **令牌驗證**: 服務器端驗證CSRF令牌
- **隨機生成**: 使用加密隨機數生成令牌

#### 📊 安全監控
- **安全事件日誌**: 記錄所有安全相關事件
- **環境安全檢查**: 自動檢測運行環境安全性
- **開發者工具檢測**: 檢測並記錄開發者工具使用

### 2. 安全配置詳情

#### 內容安全策略 (CSP)
```javascript
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
font-src 'self' https://cdnjs.cloudflare.com;
img-src 'self' data: https:;
connect-src 'self' https://swiming-production.up.railway.app;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

#### 安全頭設置
- **X-XSS-Protection**: 1; mode=block
- **Content-Security-Policy**: 如上配置
- **X-Frame-Options**: 防止點擊劫持

### 3. 安全功能配置

#### 登入安全配置
```javascript
maxLoginAttempts: 5,           // 最大登入嘗試次數
lockoutDuration: 15 * 60 * 1000, // 鎖定時間（15分鐘）
sessionTimeout: 30 * 60 * 1000,  // 會話超時（30分鐘）
```

#### 速率限制配置
```javascript
maxRequests: 10,               // 最大請求次數
timeWindow: 60000              // 時間窗口（1分鐘）
```

## 安全最佳實踐

### 1. 用戶端安全
- 定期更換密碼
- 不要在公共設備上保存登入狀態
- 及時登出
- 報告可疑活動

### 2. 管理員安全
- 定期檢查安全日誌
- 監控異常訪問模式
- 及時更新安全配置
- 備份重要數據

### 3. 開發安全
- 定期更新依賴包
- 代碼安全審查
- 安全測試
- 漏洞修復

## 安全監控和日誌

### 1. 安全事件類型
- 登入嘗試（成功/失敗）
- 登出操作
- 會話超時
- 開發者工具檢測
- 右鍵菜單阻止
- 安全配置檢查

### 2. 日誌格式
```javascript
{
    timestamp: "2025-08-21T04:15:55.000Z",
    event: "Login Attempt",
    details: { success: true, phone: "12345678" },
    userAgent: "Mozilla/5.0...",
    url: "https://swimming-system-web-production.up.railway.app"
}
```

## 安全測試

### 1. 自動化測試
- XSS注入測試
- CSRF攻擊測試
- 輸入驗證測試
- 會話管理測試

### 2. 手動測試
- 登入嘗試限制
- 會話超時
- 安全登出
- 開發者工具檢測

## 故障排除

### 1. 常見安全問題
- **登入被鎖定**: 等待15分鐘後重試
- **請求被限制**: 減少請求頻率
- **會話超時**: 重新登入
- **安全警告**: 檢查瀏覽器控制台

### 2. 安全配置檢查
```javascript
// 檢查環境安全性
const securityStatus = securityManager.checkEnvironmentSecurity();
console.log('Security Status:', securityStatus);
```

## 更新和維護

### 1. 定期更新
- 安全腳本更新
- 依賴包更新
- 安全配置優化

### 2. 安全審查
- 代碼安全審查
- 配置安全檢查
- 漏洞掃描

## 聯繫支持

如有安全問題或建議，請聯繫開發團隊。

---

🔒 **安全是我們的首要任務！** 