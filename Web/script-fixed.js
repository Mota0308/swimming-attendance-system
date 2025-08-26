// 全局变量
let currentUser = null;
let currentUserType = null;
let locations = [];
let clubs = [];

// API配置
const API_CONFIG = {
    BASE_URL: 'https://swiming-production.up.railway.app',
    PUBLIC_API_KEY: 'ttdrcccy',
    PRIVATE_API_KEY: '2b207365-cbf0-4e42-a3bf-f932c84557c4'
};

// 简化的安全检查器
const SimpleSecurityManager = {
    attempts: new Map(),
    
    checkLoginAttempts(phone) {
        const attempts = this.attempts.get(phone) || { count: 0, lastAttempt: 0 };
        const now = Date.now();
        
        // 15分钟后重置
        if (now - attempts.lastAttempt > 15 * 60 * 1000) {
            attempts.count = 0;
        }
        
        return attempts.count < 5;
    },
    
    recordLoginAttempt(phone, success) {
        const attempts = this.attempts.get(phone) || { count: 0, lastAttempt: 0 };
        attempts.count = success ? 0 : attempts.count + 1;
        attempts.lastAttempt = Date.now();
        this.attempts.set(phone, attempts);
    },
    
    checkRateLimit(phone, maxAttempts, timeWindow) {
        const attempts = this.attempts.get(phone) || { count: 0, lastAttempt: 0 };
        const now = Date.now();
        
        if (now - attempts.lastAttempt < timeWindow) {
            return attempts.count < maxAttempts;
        }
        
        attempts.count = 0;
        this.attempts.set(phone, attempts);
        return true;
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 页面加载完成，开始初始化...');
    initializeApp();
});

// 初始化应用
function initializeApp() {
    console.log('🚀 开始初始化应用...');
    setupEventListeners();
    checkLoginStatus();
    
    // 使用默认数据初始化
    locations = ['全部地點', '維多利亞公園游泳池', '荔枝角公園游泳池', '觀塘游泳池'];
    clubs = ['全部泳會', '維多利亞泳會', '荔枝角泳會', '觀塘泳會'];
    populateLocationSelects();
}

// 设置事件监听器
function setupEventListeners() {
    // 登入表单提交
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('✅ 登入表单事件监听器已设置');
    }

    // 登出按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ 登出按钮事件监听器已设置');
    }

    // 月份选择变化事件
    setupMonthSelectors();
}

// 设置月份选择器事件
function setupMonthSelectors() {
    const monthSelectors = [
        'attendanceMonth',
        'workHoursMonth', 
        'rosterMonth'
    ];
    
    monthSelectors.forEach(id => {
        const selector = document.getElementById(id);
        if (selector) {
            selector.value = new Date().getMonth() + 1;
        }
    });
}

// 检查登入状态
function checkLoginStatus() {
    const savedPhone = localStorage.getItem('current_user_phone');
    const savedUserType = localStorage.getItem('current_user_type');
    
    if (savedPhone && savedUserType) {
        currentUser = savedPhone;
        currentUserType = savedUserType;
        showCoachSection();
        updateUserInfo();
    }
}

// 处理登入
async function handleLogin(event) {
    event.preventDefault();
    console.log('🔐 开始处理登入...');
    
    const phone = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const role = document.getElementById('roleSelect').value;
    
    console.log(`📱 登入信息: 电话=${phone}, 角色=${role}`);
    
    if (!phone || !password) {
        showLoginMessage('請輸入電話號碼和密碼', 'error');
        return;
    }
    
    // 安全检查
    if (!SimpleSecurityManager.checkLoginAttempts(phone)) {
        showLoginMessage('登入嘗試過多，請15分鐘後再試', 'error');
        return;
    }
    
    // 速率限制检查
    if (!SimpleSecurityManager.checkRateLimit(phone, 5, 60000)) {
        showLoginMessage('請求過於頻繁，請稍後再試', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        console.log('🔄 正在调用登入API...');
        const loginResult = await authenticateUser(phone, password, role);
        console.log('📋 登入API响应:', loginResult);
        
        if (loginResult.success) {
            // 记录成功登录
            SimpleSecurityManager.recordLoginAttempt(phone, true);
            
            // 保存用户信息
            currentUser = phone;
            currentUserType = role;
            localStorage.setItem('current_user_phone', phone);
            localStorage.setItem('current_user_type', role);
            
            showLoginMessage('登入成功', 'success');
            console.log('✅ 登入成功，准备跳转...');
            
            // 延迟跳转，让用户看到成功消息
            setTimeout(() => {
                const apiUserType = (loginResult.user && loginResult.user.userType) ? loginResult.user.userType : null;
                const finalRole = (apiUserType || role || '').toString().toLowerCase();
                
                console.log(`🎭 最终角色: ${finalRole}`);
                
                if (finalRole === 'coach') {
                    console.log('👨‍🏫 切换到教练界面...');
                    // 正常切换
                    showCoachSection();
                    updateUserInfo();
                    // 兜底处理：确保可见
                    const loginEl = document.getElementById('loginSection');
                    const coachEl = document.getElementById('coachSection');
                    if (loginEl && coachEl) {
                        loginEl.classList.remove('active');
                        coachEl.classList.add('active');
                        coachEl.style.display = 'block';
                        loginEl.style.display = 'none';
                        console.log('✅ 界面切换完成');
                    } else {
                        console.error('❌ 找不到必要的DOM元素');
                    }
                    // 设置锚点，防止浏览器恢复旧视图
                    try { 
                        window.location.hash = '#coach'; 
                        console.log('📍 锚点设置完成');
                    } catch (e) {
                        console.warn('⚠️ 锚点设置失败:', e);
                    }
                } else {
                    showLoginMessage('此版本僅支持教練登入', 'error');
                }
            }, 400);
        } else {
            // 记录失败登录
            SimpleSecurityManager.recordLoginAttempt(phone, false);
            showLoginMessage(loginResult.message || '登入失敗', 'error');
        }
    } catch (error) {
        console.error('❌ 登入过程出错:', error);
        // 记录失败登录
        SimpleSecurityManager.recordLoginAttempt(phone, false);
        showLoginMessage(`登入失敗：${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// 用户认证
async function authenticateUser(phone, password, userType) {
    const url = `${API_CONFIG.BASE_URL}/api/auth/login`;
    console.log(`🌐 调用登入API: ${url}`);
    
    const requestBody = {
        phone: phone,
        password: password,
        userType: userType
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': API_CONFIG.PUBLIC_API_KEY,
                'X-API-Private-Key': API_CONFIG.PRIVATE_API_KEY,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`📊 API响应状态: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📋 API响应数据:', data);
        return data;
    } catch (error) {
        console.error('❌ 认证错误:', error);
        throw error;
    }
}

// 处理登出
function handleLogout() {
    console.log('🚪 处理登出...');
    
    // 使用简化安全检查器的安全登出
    SimpleSecurityManager.attempts.clear();
    
    currentUser = null;
    currentUserType = null;
    
    showLoginSection();
    clearUserInfo();
    console.log('✅ 登出完成');
}

// 显示登入界面
function showLoginSection() {
    const loginSection = document.getElementById('loginSection');
    const coachSection = document.getElementById('coachSection');
    
    if (loginSection && coachSection) {
        loginSection.classList.add('active');
        coachSection.classList.remove('active');
        loginSection.style.display = 'block';
        coachSection.style.display = 'none';
    }
    
    // 清空表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
    }
    clearLoginMessage();
}

// 显示教练界面
function showCoachSection() {
    const loginSection = document.getElementById('loginSection');
    const coachSection = document.getElementById('coachSection');
    
    if (loginSection && coachSection) {
        loginSection.classList.remove('active');
        coachSection.classList.add('active');
        loginSection.style.display = 'none';
        coachSection.style.display = 'block';
    }
}

// 更新用户信息
function updateUserInfo() {
    if (currentUser) {
        const userPhoneEl = document.getElementById('userPhone');
        const displayUserPhoneEl = document.getElementById('displayUserPhone');
        const loginTimeEl = document.getElementById('loginTime');
        
        if (userPhoneEl) userPhoneEl.textContent = currentUser;
        if (displayUserPhoneEl) displayUserPhoneEl.textContent = currentUser;
        if (loginTimeEl) loginTimeEl.textContent = new Date().toLocaleString('zh-TW');
    }
}

// 清空用户信息
function clearUserInfo() {
    const userPhoneEl = document.getElementById('userPhone');
    const displayUserPhoneEl = document.getElementById('displayUserPhone');
    const loginTimeEl = document.getElementById('loginTime');
    
    if (userPhoneEl) userPhoneEl.textContent = '';
    if (displayUserPhoneEl) displayUserPhoneEl.textContent = '';
    if (loginTimeEl) loginTimeEl.textContent = '';
}

// 显示登入消息
function showLoginMessage(message, type) {
    const messageElement = document.getElementById('loginMessage');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
    }
}

// 清空登入消息
function clearLoginMessage() {
    const messageElement = document.getElementById('loginMessage');
    if (messageElement) {
        messageElement.textContent = '';
        messageElement.className = 'message';
    }
}

// 显示加载指示器
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// 填充地点选择器
function populateLocationSelects() {
    const locationSelects = [
        'attendanceLocation',
        'locationSelect',
        'workHoursLocation'
    ];
    
    locationSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">請選擇地點</option>';
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                select.appendChild(option);
            });
        }
    });
    
    // 填充泳会选择器
    const clubSelects = [
        'attendanceClub',
        'clubSelect',
        'workHoursClub'
    ];
    
    clubSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">請選擇泳會</option>';
            clubs.forEach(club => {
                const option = document.createElement('option');
                option.value = club;
                option.textContent = club;
                select.appendChild(option);
            });
        }
    });
}

// 导出函数供HTML使用
window.showAttendanceManagement = function() {
    console.log('📊 显示出席管理界面');
    // 实现出席管理界面显示逻辑
};

window.showWorkHours = function() {
    console.log('⏰ 工時管理已移除');
};

window.showRoster = function() {
    console.log('📅 更表管理已移除');
};

window.showLocationClub = function() {
    console.log('📍 显示地点泳会管理界面');
    // 实现地点泳会管理界面显示逻辑
};

window.hideAllFeatures = function() {
    console.log('🔙 隐藏所有功能界面');
    // 实现隐藏所有功能界面的逻辑
};

console.log('✅ script-fixed.js 已加载完成'); 