const axios = require('axios');

console.log('🚀 快速測試 Railway API...');
console.log('📍 地址: https://swiming-production.up.railway.app');

axios.get('https://swiming-production.up.railway.app/health', {
    headers: {
        'X-API-Public-Key': 'ttdrcccy',
        'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
    },
    timeout: 10000
})
.then(response => {
    console.log('✅ API 可訪問！');
    console.log('📊 響應:', response.data);
})
.catch(error => {
    console.log('❌ API 無法訪問');
    console.log('🔍 錯誤:', error.message);
}); 