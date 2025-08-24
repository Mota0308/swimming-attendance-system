const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 基本中间件
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 简单的健康检查
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '简化版服务器运行正常',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
});

// 根路径
app.get('/', (req, res) => {
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
    console.log(`🚀 简化版服务器已启动`);
    console.log(`📍 端口: ${PORT}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 静态文件目录: ${__dirname}`);
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