module.exports = {
  apps: [{
    name: 'swimming-api-server',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // 自動重啟設置
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // 監控設置
    monitor: true,
    // 日誌設置
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 環境變量
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}; 