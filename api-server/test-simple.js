const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

// 簡單的健康檢查端點
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API 服務器運行正常',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// 啟動服務器
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 簡單 API 服務器已啟動');
    console.log(`📍 地址: http://localhost:${PORT}`);
    console.log(`⏰ 啟動時間: ${new Date().toLocaleString()}`);
});

// 錯誤處理
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕獲的異常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未處理的 Promise 拒絕:', reason);
}); 