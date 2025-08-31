const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// API 服務器地址
const API_BASE_URL = 'https://swimming-attendance-system-production.up.railway.app';

// 啟用 CORS
app.use(cors());

// 解析 JSON 請求體
app.use(express.json());

// 靜態文件服務
app.use(express.static(__dirname));

// API 代理中間件
app.use('/api', async (req, res) => {
    try {
        const apiPath = req.path;
        let apiUrl = `${API_BASE_URL}${apiPath}`;
        
        console.log(`🔄 代理 API 請求: ${req.method} ${apiPath} -> ${apiUrl}`);
        
        // 構建請求選項
        const requestOptions = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        };
        
        // 添加查詢參數
        if (Object.keys(req.query).length > 0) {
            const queryString = new URLSearchParams(req.query).toString();
            apiUrl = `${apiUrl}?${queryString}`;
        }
        
        // 添加請求體（非 GET 請求）
        if (req.method !== 'GET' && req.body) {
            requestOptions.body = JSON.stringify(req.body);
        }
        
        console.log(`🔗 最終 API URL: ${apiUrl}`);
        
        // 轉發請求到 API 服務器
        const apiResponse = await fetch(apiUrl, requestOptions);
        
        // 檢查響應狀態
        if (!apiResponse.ok) {
            console.error(`❌ API 服務器返回錯誤: ${apiResponse.status} ${apiResponse.statusText}`);
            const errorText = await apiResponse.text();
            console.error(`錯誤詳情: ${errorText}`);
            
            return res.status(apiResponse.status).json({
                error: 'API 服務器錯誤',
                status: apiResponse.status,
                statusText: apiResponse.statusText,
                path: apiPath,
                details: errorText
            });
        }
        
        // 嘗試解析 JSON 響應
        let data;
        try {
            data = await apiResponse.json();
        } catch (parseError) {
            console.warn(`⚠️ 無法解析 API 響應為 JSON: ${parseError.message}`);
            const textResponse = await apiResponse.text();
            data = { message: textResponse };
        }
        
        // 設置響應狀態碼和頭部
        res.status(apiResponse.status);
        res.set('Content-Type', 'application/json');
        
        console.log(`✅ API 代理成功: ${apiPath} -> ${apiResponse.status}`);
        res.json(data);
        
    } catch (error) {
        console.error(`❌ API 代理失敗: ${req.path}`, error);
        
        // 提供更詳細的錯誤信息
        res.status(500).json({
            error: 'API 代理失敗',
            message: error.message,
            path: req.path,
            timestamp: new Date().toISOString(),
            apiServer: API_BASE_URL
        });
    }
});

// 健康檢查端點
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'swimming-system-web',
        version: '1.0.0',
        apiProxy: 'enabled',
        apiServer: API_BASE_URL
    });
});

// 調試端點 - 測試 API 代理
app.get('/debug/api-test', async (req, res) => {
    try {
        const testUrl = `${API_BASE_URL}/api/health`;
        console.log(`🧪 測試 API 連接: ${testUrl}`);
        
        const response = await fetch(testUrl, {
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        });
        
        const data = await response.text();
        
    res.json({
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            apiUrl: testUrl,
            response: data,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            apiUrl: `${API_BASE_URL}/api/health`,
            timestamp: new Date().toISOString()
        });
    }
});

// 主頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 處理
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// 啟動服務器
app.listen(PORT, () => {
    console.log(`🚀 游泳系統網頁版服務已啟動`);
    console.log(`📍 服務地址: http://localhost:${PORT}`);
    console.log(`🌐 環境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API 代理已啟用: ${API_BASE_URL}`);
    console.log(`⏰ 啟動時間: ${new Date().toISOString()}`);
});

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('🔄 收到 SIGTERM 信號，正在關閉服務器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 收到 SIGINT 信號，正在關閉服務器...');
    process.exit(0);
}); 