const fs = require('fs');
const path = require('path');

console.log('🚂 Railway 部署前檢查\n');

// 檢查必要文件
const requiredFiles = [
    'package.json',
    'server.js',
    'Procfile'
];

console.log('📋 檢查必要文件...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} - 存在`);
    } else {
        console.log(`❌ ${file} - 缺失`);
        allFilesExist = false;
    }
});

console.log('');

// 檢查 package.json 內容
console.log('📦 檢查 package.json...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // 檢查必要字段
    const requiredFields = ['name', 'version', 'main', 'scripts', 'dependencies'];
    requiredFields.forEach(field => {
        if (packageJson[field]) {
            console.log(`✅ ${field} - 已配置`);
        } else {
            console.log(`❌ ${field} - 缺失`);
            allFilesExist = false;
        }
    });
    
    // 檢查依賴
    console.log('\n📚 檢查依賴...');
    const requiredDeps = ['express', 'mongodb', 'cors'];
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`✅ ${dep} - 已安裝`);
        } else {
            console.log(`❌ ${dep} - 缺失`);
            allFilesExist = false;
        }
    });
    
    // 檢查 engines
    if (packageJson.engines && packageJson.engines.node) {
        console.log(`✅ Node.js 版本要求 - ${packageJson.engines.node}`);
    } else {
        console.log('⚠️ 未指定 Node.js 版本要求');
    }
    
} catch (error) {
    console.log(`❌ package.json 解析錯誤: ${error.message}`);
    allFilesExist = false;
}

console.log('');

// 檢查 Procfile
console.log('📄 檢查 Procfile...');
try {
    const procfile = fs.readFileSync('Procfile', 'utf8').trim();
    if (procfile === 'web: node server.js') {
        console.log('✅ Procfile 配置正確');
    } else {
        console.log(`⚠️ Procfile 內容: ${procfile}`);
    }
} catch (error) {
    console.log(`❌ Procfile 讀取錯誤: ${error.message}`);
    allFilesExist = false;
}

console.log('');

// 檢查 server.js
console.log('🔧 檢查 server.js...');
try {
    const serverContent = fs.readFileSync('server.js', 'utf8');
    
    // 檢查必要的導入
    const requiredImports = ['express', 'mongodb', 'cors'];
    requiredImports.forEach(importName => {
        if (serverContent.includes(importName)) {
            console.log(`✅ ${importName} - 已導入`);
        } else {
            console.log(`❌ ${importName} - 未導入`);
            allFilesExist = false;
        }
    });
    
    // 檢查端口配置
    if (serverContent.includes('process.env.PORT')) {
        console.log('✅ 端口配置 - 支持環境變量');
    } else {
        console.log('⚠️ 端口配置 - 建議使用環境變量');
    }
    
    // 檢查環境變量支持
    if (serverContent.includes('process.env.')) {
        console.log('✅ 環境變量 - 已配置');
    } else {
        console.log('⚠️ 環境變量 - 建議配置');
    }
    
} catch (error) {
    console.log(`❌ server.js 讀取錯誤: ${error.message}`);
    allFilesExist = false;
}

console.log('');

// 檢查 node_modules
console.log('📁 檢查依賴安裝...');
if (fs.existsSync('node_modules')) {
    console.log('✅ node_modules - 已安裝');
} else {
    console.log('⚠️ node_modules - 未安裝，運行 npm install');
}

console.log('');

// 總結
if (allFilesExist) {
    console.log('🎉 檢查完成！您的項目已經準備好部署到 Railway！');
    console.log('\n📋 下一步：');
    console.log('1. 訪問 https://railway.app');
    console.log('2. 使用 GitHub 註冊');
    console.log('3. 創建新項目');
    console.log('4. 選擇 "Deploy from GitHub repo"');
    console.log('5. 選擇您的倉庫和 api-server 目錄');
    console.log('6. 配置環境變量');
    console.log('7. 等待部署完成');
} else {
    console.log('❌ 檢查發現問題，請修復後再部署');
    console.log('\n🔧 需要修復的問題：');
    console.log('- 確保所有必要文件存在');
    console.log('- 檢查 package.json 配置');
    console.log('- 運行 npm install 安裝依賴');
}

console.log('\n📖 詳細部署指南請查看：railway-deploy-guide.md'); 