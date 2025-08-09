console.log('🔍 開始調試...');

try {
    console.log('📦 檢查依賴...');
    const express = require('express');
    console.log('✅ Express 已加載');
    
    const { MongoClient } = require('mongodb');
    console.log('✅ MongoDB 已加載');
    
    const cors = require('cors');
    console.log('✅ CORS 已加載');
    
    console.log('🎉 所有依賴都正常！');
    
    // 測試創建應用
    const app = express();
    console.log('✅ Express 應用已創建');
    
    // 測試端口
    const PORT = 3001;
    console.log(`📡 端口: ${PORT}`);
    
    // 測試監聽
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 服務器已啟動在端口 ${PORT}`);
        server.close(() => {
            console.log('✅ 服務器測試完成');
        });
    });
    
} catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.error('📋 錯誤詳情:', error);
} 