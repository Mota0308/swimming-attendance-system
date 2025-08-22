const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
// 端口：優先使用 Railway 提供的環境變數 PORT，本地默認 8080
const PORT = process.env.PORT || 8080;
const DEFAULT_PORT = 8080;
const EXPECTED_PORT = PORT;


// 启用CORS
app.use(cors());

// 安全头设置
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '网页应用服务器运行正常',
        timestamp: new Date().toISOString(),
        server: 'Express Web Server',
        version: '1.0.0',
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        railway: process.env.RAILWAY_ENVIRONMENT || 'unknown'
    });
});

// 端口信息端点
app.get('/port-info', (req, res) => {
    res.json({
        currentPort: PORT,
        defaultPort: DEFAULT_PORT,
        expectedPort: EXPECTED_PORT,
        environmentPort: process.env.PORT,
        isRailway: !!process.env.RAILWAY_ENVIRONMENT,
        railwayEnv: process.env.RAILWAY_ENVIRONMENT || 'not-set'
    });
});

// API代理 - 转发到后端API服务器
app.use('/api', (req, res) => {
    const targetUrl = `https://swimming-attendance-system-production.up.railway.app${req.url}`;
    
    // 这里可以添加代理逻辑，或者直接重定向
    res.redirect(targetUrl);
});

// 根路径 - 返回主页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 404处理 - 对于所有未匹配的路径返回主页面（SPA支持）
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
    console.log(`🌐 网页应用服务器已启动`);
    console.log(`📍 当前端口: ${PORT}`);
    console.log(`🔧 默认端口: ${DEFAULT_PORT}`);
    console.log(`🎯 期望端口: ${EXPECTED_PORT}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚂 Railway环境: ${process.env.RAILWAY_ENVIRONMENT || '未设置'}`);
    console.log(`📁 静态文件目录: ${__dirname}`);
    console.log(`🌐 公網訪問地址: http://您的公網IP:${PORT}`);
    
    // 端口检查
    if (PORT !== EXPECTED_PORT) {
        console.log(`⚠️  注意：当前端口 ${PORT} 与期望端口 ${EXPECTED_PORT} 不同`);
        if (process.env.PORT) {
            console.log(`ℹ️  这是由环境变量 PORT=${process.env.PORT} 设置的`);
        }
    } else {
        console.log(`✅ 端口配置正确：${PORT}`);
    }
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