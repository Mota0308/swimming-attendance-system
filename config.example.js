// 游泳課程出席管理系統配置文件範例
// 請複製此文件為 config.js 並填入實際的配置值

module.exports = {
    // MongoDB 連接配置
    mongodb: {
        uri: 'mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority',
        dbName: 'your_database_name',
        collectionName: 'students'
    },
    
    // API 密鑰配置
    api: {
        publicKey: 'your_public_api_key',
        privateKey: 'your_private_api_key'
    },
    
    // 應用程序配置
    app: {
        name: '游泳課程出席管理系統',
        version: '1.0.0',
        unlockCodeKey: 'swimming_unlock_code'
    }
}; 