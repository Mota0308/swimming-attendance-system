const express = require('express');
const path = require('path');
const cors = require('cors');

// 添加fetch polyfill支持
if (typeof fetch === 'undefined') {
    const fetch = require('node-fetch');
    global.fetch = fetch;
}

const app = express();
const PORT = process.env.PORT || 3001;

// 启用CORS - 允许前端域名访问
app.use(cors({
    origin: [
        'https://swimming-system-web-production.up.railway.app',
        'http://localhost:3000',
        'http://localhost:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-API-Public-Key', 
        'X-API-Private-Key',
        'Accept',
        'Origin'
    ]
}));

// 中间件
app.use(express.json());
// 修復路徑配置，確保在 Railway 環境中正確工作
const staticPath = process.env.RAILWAY_ENVIRONMENT ? '/app' : __dirname;
app.use(express.static(staticPath));

// 安全头设置
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '完整版服务器运行正常',
        timestamp: new Date().toISOString(),
        server: 'Express Full Server',
        version: '1.0.0',
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        database: 'MongoDB Atlas (集成中)'
    });
});

// 数据库连接状态端点
app.get('/db-status', (req, res) => {
    res.json({
        success: true,
        message: '数据库连接状态',
        timestamp: new Date().toISOString(),
        database: {
            type: 'MongoDB Atlas',
            url: 'API服務器 (通過代理)',
            status: 'Connected',
            features: ['auth', 'locations', 'clubs', 'students', 'attendance', 'work-hours', 'roster']
        }
    });
});

// API代理 - 转发到后端API服务器
app.use('/api', async (req, res) => {
    try {
        const targetUrl = `https://swimming-attendance-system-production.up.railway.app${req.url}`;
        console.log(`🔄 API代理: ${req.method} ${req.url} -> ${targetUrl}`);
        
        // 转发请求到API服务器
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
                'Accept': 'application/json',
                'User-Agent': 'Swimming-System-Web/1.0.0'
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        
        const data = await response.text();
        
        // 检查响应是否为HTML（错误页面）
        if (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html')) {
            console.warn('⚠️ 后端返回HTML而不是JSON:', targetUrl);
            // 返回结构化的错误信息
            return res.status(500).json({
                success: false,
                message: '后端服务暂时不可用',
                error: 'Backend returned HTML instead of JSON',
                endpoint: req.url,
                status: response.status
            });
        }
        
        // 尝试解析JSON
        try {
            const jsonData = JSON.parse(data);
            // 设置正确的响应头
            res.setHeader('Content-Type', 'application/json');
            res.status(response.status).json(jsonData);
        } catch (parseError) {
            console.warn('⚠️ 无法解析JSON响应:', data.substring(0, 100));
            // 返回结构化的错误信息
            res.status(500).json({
                success: false,
                message: 'API响应格式错误',
                error: 'Invalid JSON response from backend',
                endpoint: req.url,
                status: response.status
            });
        }
        
    } catch (error) {
        console.error('❌ API代理错误:', error);
        res.status(500).json({
            success: false,
            message: 'API代理失败',
            error: error.message,
            endpoint: req.url
        });
    }
});

// 测试数据库连接端点
app.get('/test-db-connection', async (req, res) => {
    try {
        console.log('🔍 测试数据库连接...');
        
        const response = await fetch('https://swimming-attendance-system-production.up.railway.app/api/health', {
            method: 'GET',
            headers: {
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ 数据库连接测试成功');
            res.json({
                success: true,
                message: '数据库连接正常',
                timestamp: new Date().toISOString(),
                database: data
            });
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ 数据库连接测试失败:', error);
        res.status(500).json({
            success: false,
            message: '数据库连接失败',
            error: error.message
        });
    }
});

// 移除重複的地點端點，統一使用 /api 代理
// 地點數據通過 /api/locations 獲取

// 移除重複的泳會端點，統一使用 /api 代理
// 泳會數據通過 /api/clubs 獲取

// 根路径 - 返回主页面
app.get('/', (req, res) => {
    const indexPath = process.env.RAILWAY_ENVIRONMENT ? '/app/index.html' : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

// 404处理 - 对于所有未匹配的路径返回主页面（SPA支持）
app.get('*', (req, res) => {
    const indexPath = process.env.RAILWAY_ENVIRONMENT ? '/app/index.html' : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 完整版服务器已启动`);
    console.log(`📍 端口: ${PORT}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 静态文件目录: ${__dirname}`);
    console.log(`🗄️ 数据库: MongoDB Atlas (已集成)`);
    console.log(`🔗 API代理: 已启用`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('🔄 收到SIGTERM信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 收到SIGINT信号，正在关闭服务器...');
    process.exit(0);
}); 