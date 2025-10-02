// 全局变量
let currentUser = null;
let currentUserType = null;
let locations = [];
let clubs = [];

// API配置 - 使用代理，避免CORS问题
const API_CONFIG = {
    BASE_URL: 'https://swimming-attendance-system-production.up.railway.app', // 正确的API服务器地址
    PUBLIC_API_KEY: 'ttdrcccy',
    PRIVATE_API_KEY: '2b207365-cbf0-4e42-a3bf-f932c84557c4'
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 页面加载完成，等待数据库连接器就绪...');
    
    // 监听数据库连接器就绪事件
    document.addEventListener('databaseConnectorReady', function(event) {
        console.log('🎉 数据库连接器已就绪，开始初始化应用');
        initializeApp();
        
        // 监听基础数据更新事件
        document.addEventListener('basicDataUpdated', function(event) {
            console.log('🎉 收到基础数据更新事件:', event.detail);
            const { locations: newLocations, clubs: newClubs } = event.detail;
            
            // 立即更新全局变量
            if (newLocations && newLocations.length > 0) {
                locations = newLocations;
                console.log('📋 更新地点数据:', locations);
            }
            
            if (newClubs && newClubs.length > 0) {
                clubs = newClubs;
                console.log('📋 更新泳会数据:', clubs);
            }
            
            // 立即更新UI
            populateLocationSelects();
            console.log('✅ UI已更新，地点数量:', locations.length, '泳会数量:', clubs.length);
        });
        
        // 监听主管数据预加载完成事件
        document.addEventListener('supervisorDataReady', function(event) {
            console.log('🎉 主管数据预加载完成:', event.detail);
            const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
            
            if (userType === 'supervisor') {
                // 预初始化教练更表，确保月份下拉选项可用
                console.log('🔧 预初始化教练更表月份下拉选项...');
                
                // 如果当前在教练更表页面，立即刷新以显示下拉选项
                const staffRosterSection = document.getElementById('staffRosterSection');
                if (staffRosterSection && !staffRosterSection.classList.contains('hidden')) {
                    console.log('🔄 当前在教练更表页面，立即刷新...');
                    setTimeout(() => {
                        onChangeStaffCoach();
                    }, 100);
                }
            }
        });
    });
    
    // 如果数据库连接器已经可用，立即初始化
    if (typeof databaseConnector !== 'undefined' && databaseConnector) {
        console.log('✅ 数据库连接器已可用，立即初始化应用');
        initializeApp();
    } else {
        console.log('⏳ 等待数据库连接器初始化...');
        // 设置超时，如果5秒内没有收到事件，使用默认数据初始化
        setTimeout(() => {
            if (typeof databaseConnector !== 'undefined' && databaseConnector) {
                console.log('✅ 超时后数据库连接器可用，初始化应用');
                initializeApp();
            } else {
                console.warn('⚠️ 超时后数据库连接器仍不可用，使用默认数据初始化');
                initializeAppWithDefaults();
            }
        }, 5000);
    }
});

// 使用默认数据初始化应用
function initializeAppWithDefaults() {
    console.log('使用默认数据初始化应用');
    setupEventListeners();
    checkLoginStatus();
    // 使用默认数据而不是调用loadLocationsAndClubs
    locations = ['全部地點', '維多利亞公園游泳池', '荔枝角公園游泳池', '觀塘游泳池'];
    clubs = ['全部泳會', '維多利亞泳會', '荔枝角泳會', '觀塘泳會'];
    populateLocationSelects();
}

// 初始化应用
function initializeApp() {
    console.log('开始初始化应用...');
    setupEventListeners();
    checkLoginStatus();
    
    // 确保数据库连接器可用后再加载数据
    if (databaseConnector && databaseConnector.connectionStatus) {
        loadLocationsAndClubs();
    } else {
        console.warn('数据库连接器未准备好，使用默认数据');
        initializeAppWithDefaults();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 登入表单提交
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 登出按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
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
            
            // 为更表月份选择器添加事件监听
            if (id === 'rosterMonth') {
                selector.addEventListener('change', () => {
                    loadRosterData();
                });
            }
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
    
    const phone = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const role = document.getElementById('roleSelect').value;
    
    if (!phone || !password) {
        showLoginMessage('請輸入電話號碼和密碼', 'error');
        return;
    }
    
    // 安全检查
    if (!securityManager.checkLoginAttempts(phone)) {
        showLoginMessage('登入嘗試過多，請15分鐘後再試', 'error');
        return;
    }
    
    // 速率限制检查
    if (!securityManager.checkRateLimit(phone, 5, 60000)) {
        showLoginMessage('請求過於頻繁，請稍後再試', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const loginResult = await authenticateUser(phone, password, role);
        
        if (loginResult.success) {
            // 验证后端返回的用户信息
            const userData = loginResult.user;
            
            // 对于教练登录，必须验证position和type
            if (role === 'coach') {
                if (!userData.position || userData.position !== 'staff') {
                    securityManager.recordLoginAttempt(phone, false);
                    showLoginMessage('登入失敗：教練賬號必須具有staff職位', 'error');
                    return;
                }
                
                if (!userData.type || !['full-time', 'part-time'].includes(userData.type)) {
                    securityManager.recordLoginAttempt(phone, false);
                    showLoginMessage('登入失敗：教練賬號必須指定工作類型(full-time或part-time)', 'error');
                    return;
                }
                
                // 保存完整的用户数据，包括工作类型
                localStorage.setItem('current_user_data', JSON.stringify(userData));
                localStorage.setItem('current_user_name', userData.name || `教練_${phone}`);
                
                console.log('✅ 教練登錄驗證通過:', {
                    phone: phone,
                    position: userData.position,
                    type: userData.type,
                    name: userData.name
                });
            }
            
            // 记录成功登录
            securityManager.recordLoginAttempt(phone, true);
            
            // 保存用户信息
            currentUser = phone;
            currentUserType = role;
            localStorage.setItem('current_user_phone', phone);
            localStorage.setItem('current_user_type', role);
            
            showLoginMessage('登入成功', 'success');
            
            // 延迟跳转，让用户看到成功消息
            setTimeout(() => {
                const apiUserType = userData.userType;
                const finalRole = (apiUserType || role || '').toString().toLowerCase();
                
                if (finalRole === 'coach' || finalRole === 'supervisor') {
                    // 正常切換
                    showCoachSection();
                    updateUserInfo();
                    // 兜底處理：確保可見
                    const loginEl = document.getElementById('loginSection');
                    const coachEl = document.getElementById('coachSection');
                    if (loginEl && coachEl) {
                        loginEl.classList.remove('active');
                        coachEl.classList.add('active');
                        coachEl.style.display = 'block';
                        loginEl.style.display = 'none';
                    }
                    // 設置錨點，防止瀏覽器恢復舊視圖
                    try { window.location.hash = '#coach'; } catch (_) {}

                    // 主管：登入後立即預加載數據
                    if (finalRole === 'supervisor' && window.databaseConnector) {
                        window.databaseConnector.preloadSupervisorData?.();
                    }
                } else {
                    showLoginMessage('此版本僅支持教練和主管登入', 'error');
                }
            }, 400);
        } else {
            // 记录失败登录
            securityManager.recordLoginAttempt(phone, false);
            showLoginMessage(loginResult.message || '登入失敗', 'error');
        }
    } catch (error) {
        // 记录失败登录
        securityManager.recordLoginAttempt(phone, false);
        
        // 检查是否是403错误（验证失败）
        if (error.message.includes('403')) {
            showLoginMessage('登入失敗：賬號權限不足或資料不完整', 'error');
        } else {
            showLoginMessage(`登入失敗：${error.message}`, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// 用户认证
async function authenticateUser(phone, password, userType) {
    const url = `${API_CONFIG.BASE_URL}/api/auth/login`;
    
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
        
        if (!response.ok) {
            // 对于403错误，尝试解析错误消息
            if (response.status === 403) {
                try {
                    const errorData = await response.json();
                    throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
                } catch (parseError) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('认证错误:', error);
        throw error;
    }
}

// 处理登出
function handleLogout() {
    // 使用安全管理器的安全登出
    securityManager.logout();
    
    currentUser = null;
    currentUserType = null;
    
    showLoginSection();
    clearUserInfo();
}

// 显示登入界面
function showLoginSection() {
    document.getElementById('loginSection').classList.add('active');
    document.getElementById('coachSection').classList.remove('active');
    
    // 清空表单
    document.getElementById('loginForm').reset();
    clearLoginMessage();
}

// 显示教练界面
function showCoachSection() {
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('coachSection').classList.add('active');
}

// 更新用户信息
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userPhone').textContent = currentUser;
        document.getElementById('displayUserPhone').textContent = currentUser;
        document.getElementById('loginTime').textContent = new Date().toLocaleString('zh-TW');
        
        // 更新用户身份显示
        const userRole = currentUserType || localStorage.getItem('current_user_type') || '教練';
        const roleDisplay = userRole === 'supervisor' ? '主管' : 
                           userRole === 'coach' ? '教練' : 
                           userRole === 'admin' ? '管理員' : '教練';
        
        const displayUserRole = document.getElementById('displayUserRole');
        const userRoleDisplay = document.getElementById('userRoleDisplay');
        
        if (displayUserRole) {
            displayUserRole.textContent = roleDisplay;
        }
        if (userRoleDisplay) {
            userRoleDisplay.textContent = roleDisplay + '版本';
        }
    }
    
    // 更新数据库连接状态
    updateDatabaseStatus();
}

// 更新数据库连接状态
function updateDatabaseStatus() {
    if (databaseConnector) {
        const status = databaseConnector.getConnectionStatus();
        
        // 更新连接状态
        const statusElement = document.getElementById('dbConnectionStatus');
        if (statusElement) {
            if (status.connected) {
                statusElement.innerHTML = '<span style="color: #28a745;">✅ 已連接</span>';
            } else {
                statusElement.innerHTML = '<span style="color: #dc3545;">❌ 未連接</span>';
            }
        }
        
        // 更新最后同步时间
        const syncElement = document.getElementById('lastSyncTime');
        if (syncElement) {
            if (status.lastSync) {
                syncElement.textContent = new Date(status.lastSync).toLocaleString('zh-TW');
            } else {
                syncElement.textContent = '尚未同步';
            }
        }
        
        // 更新缓存信息
        const cacheElement = document.getElementById('cacheInfo');
        if (cacheElement) {
            const cacheData = databaseConnector.getCachedData('locations');
            cacheElement.textContent = `${cacheData.length} 個地點, ${databaseConnector.getCachedData('clubs').length} 個泳會`;
        }
    }
}

// 刷新数据库连接
async function refreshDatabaseConnection() {
    if (databaseConnector) {
        const refreshBtn = document.getElementById('refreshDbBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...';
        }
        
        try {
            await databaseConnector.reconnect();
            updateDatabaseStatus();
            
            // 显示成功消息
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-check"></i> 刷新成功';
                setTimeout(() => {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新連接';
                }, 2000);
                }
        } catch (error) {
            console.error('刷新数据库连接失败:', error);
            
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-times"></i> 刷新失敗';
                setTimeout(() => {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新連接';
                }, 2000);
            }
        }
    }
}

// 清空用户信息
function clearUserInfo() {
    document.getElementById('userPhone').textContent = '';
    document.getElementById('displayUserPhone').textContent = '';
    document.getElementById('loginTime').textContent = '';
}

// 显示登入消息
function showLoginMessage(message, type) {
    const messageElement = document.getElementById('loginMessage');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
}

// 清空登入消息
function clearLoginMessage() {
    const messageElement = document.getElementById('loginMessage');
    messageElement.textContent = '';
    messageElement.className = 'message';
}

// 显示加载指示器
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// 加载地点和泳会数据
async function loadLocationsAndClubs() {
    try {
        console.log('🔄 开始加载地点和泳会数据...');
        
        // 使用数据库连接器获取数据
        if (databaseConnector && databaseConnector.connectionStatus && databaseConnector.connectionStatus.connected) {
            console.log('✅ 数据库连接器可用，开始获取数据');
            
            // 优先使用缓存数据，如果缓存为空则重新获取
            if (databaseConnector.cache && databaseConnector.cache.locations && databaseConnector.cache.locations.length > 0) {
                locations = databaseConnector.cache.locations;
                console.log('📋 使用缓存的地点数据:', locations);
            } else {
                console.log('🔄 缓存为空，从API获取地点数据');
                locations = await databaseConnector.fetchLocations();
                console.log('📋 重新获取的地点数据:', locations);
            }
            
            // 优先使用缓存的泳会数据
            if (databaseConnector.cache && databaseConnector.cache.clubs && databaseConnector.cache.clubs.length > 0) {
                clubs = databaseConnector.cache.clubs;
                console.log('📋 使用缓存的泳会数据:', clubs);
            } else {
                console.log('🔄 泳会缓存为空，从API获取泳会数据');
                clubs = await databaseConnector.fetchClubs();
                console.log('📋 重新获取的泳会数据:', clubs);
            }
            
            console.log('✅ 数据加载完成，开始填充选择器');
            populateLocationSelects();
        } else {
            console.warn('⚠️ 数据库连接器不可用，使用默认数据');
            // 如果连接器不可用，使用默认数据
            locations = ['全部地點', '維多利亞公園游泳池', '荔枝角公園游泳池', '觀塘游泳池'];
            clubs = ['全部泳會', '維多利亞泳會', '荔枝角泳會', '觀塘泳會'];
        }
        
        // 确保locations和clubs是数组
        if (!Array.isArray(locations)) {
            console.warn('⚠️ locations不是数组，使用默认数据');
            locations = ['全部地點', '維多利亞公園游泳池', '荔枝角公園游泳池', '觀塘游泳池'];
        }
        
        if (!Array.isArray(clubs)) {
            console.warn('⚠️ clubs不是数组，使用默认数据');
            clubs = ['全部泳會', '維多利亞泳會', '荔枝角泳會', '觀塘泳會'];
        }
        
        console.log('✅ 数据加载完成，开始填充选择器');
        populateLocationSelects();
        
    } catch (error) {
        console.error('❌ 加载地点和泳会数据失败:', error);
        
        // 错误时使用默认数据
        console.log('🔄 使用默认数据作为回退方案');
        locations = ['全部地點', '維多利亞公園游泳池', '荔枝角公園游泳池', '觀塘游泳池'];
        clubs = ['全部泳會', '維多利亞泳會', '荔枝角泳會', '觀塘泳會'];
        populateLocationSelects();
    }
}

// 填充地点选择器
async function populateLocationSelects() {
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

    // 工時管理：當選擇地點時，從 /clubs 重新載入對應泳會
    const workLoc = document.getElementById('workHoursLocation');
    const workClub = document.getElementById('workHoursClub');
    if (workLoc && workClub) {
        workLoc.onchange = async () => {
            const loc = workLoc.value;
            workClub.innerHTML = '<option value="">請選擇泳會</option>';
            if (!loc) return;
            
            try {
                if (databaseConnector && databaseConnector.connectionStatus.connected) {
                    const list = await databaseConnector.fetchWorkHoursClubs(loc);
                    console.log('工时管理泳会数据:', list);
                    (list || []).forEach(c => {
                        const option = document.createElement('option');
                        option.value = c;
                        option.textContent = c;
                        workClub.appendChild(option);
                    });
                }
            } catch (e) {
                console.warn('載入對應泳會失敗', e);
            }
        };
        
        // 當選擇泳會時，自動加載工時數據
        workClub.onchange = () => {
            const loc = workLoc.value;
            const club = workClub.value;
            if (loc && club) {
                loadWorkHoursData();
            }
        };
    }
}

// 功能界面显示控制
function showAttendanceManagement() {
    hideAllFeatures();
    document.getElementById('attendanceSection').classList.remove('hidden');
    
    // 初始化課程編排系統
    console.log('🔄 初始化課程編排系統...');
    
    // 等待課程編排系統模組載入
    function initSchedulerWhenReady() {
        if (typeof window.initSchedulerLight === 'function') {
            window.initSchedulerLight('schedulerContainer');
            console.log('✅ 課程編排系統已初始化');
        } else {
            console.log('⏳ 等待課程編排系統模組載入...');
            setTimeout(initSchedulerWhenReady, 100);
        }
    }
    
    // 立即嘗試初始化
    initSchedulerWhenReady();
}

function showWorkHours() {
    // 已移除：主管頁面的工時管理 UI
    console.log('工時管理已從主管頁面移除');
}

function showRoster() {
    // 已移除：主管頁面的更表管理 UI
    console.log('更表管理已從主管頁面移除');
}

function showLocationClub() {
    hideAllFeatures();
    const sec = document.getElementById('locationClubSection');
    if (sec) sec.classList.remove('hidden');
    loadLocationClubData();
}

function showStaffWorkHours() {
    hideAllFeatures();
    const sec = document.getElementById('staffWorkHoursSection');
    if (sec) sec.classList.remove('hidden');
    const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
    if (userType === 'coach') {
        initCoachWorkFilters();
        refreshCoachWorkHours();
    } else {
        initSupervisorWorkFilters();
        refreshSupervisorWorkHours();
    }
}

function showStaffRoster() {
    hideAllFeatures();
    const sec = document.getElementById('staffRosterSection');
    if (sec) sec.classList.remove('hidden');
    const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
    if (userType === 'coach') {
        // 教練：隱藏教練選擇與保存，僅顯示自己
        const selWrap = document.getElementById('staffCoachSelect');
        if (selWrap) selWrap.parentElement.style.display = 'none';
        const container = document.getElementById('staffRosterCalendars');
        const phone = localStorage.getItem('current_user_phone') || '';
        // 只渲染只讀
        renderCoachRosterReadonly(phone);
        const saveBtn = document.querySelector('#staffRosterSection .export-btn');
        if (saveBtn) saveBtn.style.display = 'none';
    } else {
        // 主管：可選教練並可編輯
        const selWrap = document.getElementById('staffCoachSelect');
        if (selWrap) selWrap.parentElement.style.display = '';
        const saveBtn = document.querySelector('#staffRosterSection .export-btn');
        if (saveBtn) saveBtn.style.display = '';
        populateCoachSelect();
        // 若已選擇教練則載入該教練可編輯界面
        onChangeStaffCoach();
    }
}

function hideAllFeatures() {
    const ids = ['attendanceSection','workHoursSection','rosterSection','locationClubSection','staffWorkHoursSection','staffRosterSection'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
}

// 加载出席记录数据
async function loadAttendanceData() {
    const month = document.getElementById('attendanceMonth').value;
    const location = document.getElementById('attendanceLocation').value;
    const club = document.getElementById('attendanceClub').value;
    
    if (!location || !club) {
        alert('請選擇地點和泳會');
        return;
    }
    
    showLoading(true);
    
    try {
        let attendanceData;
        
        // 使用数据库连接器获取数据
        if (databaseConnector && databaseConnector.connectionStatus.connected) {
            attendanceData = await databaseConnector.fetchAttendance(month, location, club);
        }
        
        // 如果没有数据或连接器不可用，使用模拟数据
        if (!attendanceData || attendanceData.length === 0) {
            attendanceData = [
                { name: '張小明', status: '出席', date: '2025-08-21' },
                { name: '李小華', status: '缺席', date: '2025-08-21' },
                { name: '王小美', status: '出席', date: '2025-08-21' }
            ];
        }
        
        displayAttendanceData(attendanceData);
    } catch (error) {
        console.error('加载出席记录失败:', error);
        alert('加载数据失败');
    } finally {
        showLoading(false);
    }
}

// 显示出席记录数据
function displayAttendanceData(data) {
    const tableBody = document.getElementById('attendanceData');
    tableBody.innerHTML = '';
    
    data.forEach(record => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
        row.style.borderBottom = '1px solid #e1e5e9';
        
        const coerceBool = v => (typeof v === 'string' ? v.toLowerCase() === 'true' : !!v);
        const hasStar = coerceBool(record.hasStar ?? record.star ?? record.has_star);
        const hasBalloon = coerceBool(record.hasBalloonMark ?? record.balloonMark ?? record.has_balloon_mark);
        
        const nameHtml = `
            <div class=\"table-cell\" style=\"display:flex;align-items:center;gap:8px;\">
                <span>${record.name}</span>
                <span class=\"badge-wrap\" style=\"display:inline-flex;gap:6px;\">
                    ${hasStar ? '<span title=\"重點學生\">🌟</span>' : ''}
                    ${hasBalloon ? '<span title=\"氣球標記\">🎈</span>' : ''}
                </span>
            </div>`;
        
        row.innerHTML = `
            ${nameHtml}
            <div class=\"table-cell\">\n                <span class=\"status-badge ${record.status === '出席' ? 'present' : 'absent'}\">\n                    ${record.status}\n                </span>\n            </div>\n            <div class=\"table-cell\">${record.date}</div>\n            <div class=\"table-cell\">\n                <button class=\"edit-btn\" onclick=\"editAttendance('${record.name}')\">\n                    <i class=\"fas fa-edit\"></i>\n                </button>\n            </div>\n        `;
        
        tableBody.appendChild(row);
    });
}

// 加载工時数据
async function loadWorkHoursData() {
	const monthEl = document.getElementById('workHoursMonth');
	const month = parseInt((monthEl && monthEl.value) ? monthEl.value : (new Date().getMonth()+1), 10);
	const year = new Date().getFullYear();
	const locationEl = document.getElementById('workHoursLocation');
	const clubEl = document.getElementById('workHoursClub');
	const selectedLocation = locationEl ? locationEl.value : '';
	const selectedClub = clubEl ? clubEl.value : '';
	
	// 新的邏輯：至少需要選擇一個選項
	if (!monthEl.value && !selectedLocation && !selectedClub) {
		showLoading(false);
		// 清空日曆以提示
		const cal = document.getElementById('workHoursCalendar');
		if (cal) cal.innerHTML = '<div style="padding:12px;color:#888;">請至少選擇一個篩選條件（月份、地點或泳會）</div>';
		return;
	}
	
	showLoading(true);
	
	try {
		let workHoursList = [];
		let statsData = null;
		let phone = '';
		
		if (typeof databaseConnector !== 'undefined' && databaseConnector && databaseConnector.connectionStatus.connected) {
			const userType = localStorage.getItem('current_user_type') || 'coach';
			
			// 主管可以查看所有教练数据，教练只能查看自己的数据
			if (userType === 'supervisor') {
				phone = ''; // 空字符串表示获取所有教练数据
				console.log('🔍 主管模式：獲取所有教練工時數據');
			} else {
				phone = localStorage.getItem('current_user_phone') || '';
				
				if (!phone) {
					console.warn('⚠️ 未找到教練電話號碼，無法獲取工時數據');
					alert('請先登入教練賬號');
					return;
				}
			}
			
			console.log('🔍 獲取教練工時數據:', { phone, year, month, selectedLocation, selectedClub });
			
			// 新的邏輯：根據選擇的條件靈活獲取數據
			if (monthEl.value && selectedLocation && selectedClub) {
				// 三個條件都選擇：精確篩選
				console.log('📊 精確篩選：月份 + 地點 + 泳會');
				workHoursList = await databaseConnector.fetchCoachWorkHours(
					phone, 
					year, 
					month, 
					selectedLocation, 
					selectedClub
				);
				statsData = await databaseConnector.fetchCoachWorkHoursStats(
					phone, 
					year, 
					month, 
					selectedLocation, 
					selectedClub
				);
			} else if (monthEl.value && selectedLocation) {
				// 選擇月份和地點：顯示該月該地點的所有泳會
				console.log('📊 遞進篩選：月份 + 地點');
				workHoursList = await databaseConnector.fetchCoachWorkHours(
					phone, 
					year, 
					month, 
					selectedLocation, 
					''  // 不限制泳會
				);
				statsData = await databaseConnector.fetchCoachWorkHoursStats(
					phone, 
					year, 
					month, 
					selectedLocation, 
					''  // 不限制泳會
				);
			} else if (monthEl.value && selectedClub) {
				// 選擇月份和泳會：顯示該月該泳會的所有地點
				console.log('📊 遞進篩選：月份 + 泳會');
				workHoursList = await databaseConnector.fetchCoachWorkHours(
					phone, 
					year, 
					month, 
					'',  // 不限制地點
					selectedClub
				);
				statsData = await databaseConnector.fetchCoachWorkHoursStats(
					phone, 
					year, 
					month, 
					'',  // 不限制地點
					selectedClub
				);
			} else if (selectedLocation && selectedClub) {
				// 選擇地點和泳會：顯示所有月份
				console.log('📊 遞進篩選：地點 + 泳會');
				workHoursList = await databaseConnector.fetchCoachWorkHours(
					phone, 
					0, 
					0, 
					selectedLocation, 
					selectedClub
				);
				statsData = await databaseConnector.fetchCoachWorkHoursStats(
					phone, 
					0, 
					0, 
					selectedLocation, 
					selectedClub
				);
			} else if (monthEl.value) {
				// 只選擇月份：顯示該月所有地點與泳會
				console.log('📊 並列篩選：僅月份');
				workHoursList = await databaseConnector.fetchCoachWorkHours(
					phone, 
					year, 
					month, 
					'', 
					''
				);
				statsData = await databaseConnector.fetchCoachWorkHoursStats(
					phone, 
					year, 
					month, 
					'', 
					''
				);
			} else if (selectedLocation) {
				console.log('📊 並列篩選：僅地點');
				workHoursList = await databaseConnector.fetchCoachWorkHours(
					phone, 
					0, 
					0, 
					selectedLocation, 
					''
				);
				statsData = await databaseConnector.fetchCoachWorkHoursStats(
					phone, 
					0, 
					0, 
					selectedLocation, 
					''
				);
			} else if (selectedClub) {
				console.log('📊 並列篩選：僅泳會');
				workHoursList = await databaseConnector.fetchCoachWorkHours(
					phone, 
					0, 
					0, 
					'', 
					selectedClub
				);
				statsData = await databaseConnector.fetchCoachWorkHoursStats(
					phone, 
					0, 
					0, 
					'', 
					selectedClub
				);
			}

			// Fallback：若返回0但統計顯示有記錄，退回寬鬆查詢並在前端過濾
			try {
				const totalRecords = statsData?.total_records ?? statsData?.totalRecords ?? 0;
				if ((Array.isArray(workHoursList) && workHoursList.length === 0) && totalRecords > 0) {
					console.warn('⚠️ 伺服器篩選過嚴，啟用前端回退過濾');
					const rawAll = await databaseConnector.fetchCoachWorkHours(phone, year, month, '', '');
					const loc = (selectedLocation || '').trim();
					const clb = (selectedClub || '').trim();
					const ilike = (a,b)=> String(a||'').toLowerCase().includes(String(b||'').toLowerCase());
					workHoursList = (rawAll||[]).filter(r => {
						const rLoc = r.location || r.place || '';
						const rClb = r.club || r.work_club || '';
						let ok = true;
						if (loc && loc !== '全部地點') ok = ok && ilike(rLoc, loc);
						if (clb && clb !== '全部泳會') ok = ok && ilike(rClb, clb);
						return ok;
					});
					console.log('✅ 前端回退過濾後記錄數:', workHoursList.length);
				}
			} catch(_){ }
		}

		// 主管模式：按教練分組渲染多個日曆，左上角標註教練姓名
		const userTypeNow = localStorage.getItem('current_user_type') || 'coach';
		if (userTypeNow === 'supervisor') {
			const calendarContainer = document.getElementById('workHoursCalendar');
			if (calendarContainer) {
				const byCoach = new Map(); // key: phone, value: { name, phone, list: [] }
				(workHoursList || []).forEach(item => {
					const phoneVal = item.phone || item.coachPhone || '';
					const name = item.studentName || item.name || '';
					if (!phoneVal && !name) return;
					const key = phoneVal || name;
					if (!byCoach.has(key)) byCoach.set(key, { name, phone: phoneVal, list: [] });
					byCoach.get(key).list.push(item);
				});
				
				// 生成HTML：每位教練一個小卡片包含標題和日曆
				let html = '<div class="coach-calendars">';
				byCoach.forEach((value, key) => {
					const label = (value.name || '未命名教練') + (value.phone ? '（' + value.phone + '）' : '');
					// 依該教練的記錄彙總所屬地點與泳會（此日曆所屬的實際來源）
					const locSet = new Set();
					const clubSet = new Set();
					(value.list||[]).forEach(rec => {
						const loc = (rec.location || rec.place || '').toString().trim();
						const club = (rec.club || rec.work_club || '').toString().trim();
						if (loc) locSet.add(loc);
						if (club) clubSet.add(club);
					});
					const locLabel = locSet.size === 1 ? Array.from(locSet)[0] : (locSet.size === 0 ? '—' : '多地點');
					const clubLabel = clubSet.size === 1 ? Array.from(clubSet)[0] : (clubSet.size === 0 ? '—' : '多泳會');
					html += `<div class=\"coach-calendar-card\">`+
						`<div class=\"coach-calendar-title\" style=\"display:flex;align-items:center;justify-content:space-between;\">`+
							`<span>${label}</span>`+
							`<span style=\"color:#6b7280;font-weight:500;font-size:12px;\">${locLabel} · ${clubLabel}</span>`+
						`</div>`+
						`<div class=\"coach-calendar-body\"><div class=\"coach-calendar\" data-coach=\"${String(key)}\"></div></div>`+
					`</div>`;
				});
				html += '</div>';
				calendarContainer.innerHTML = html;
				
				// 對每位教練渲染日曆
				byCoach.forEach((value, key) => {
					const allNodes = calendarContainer.querySelectorAll('.coach-calendar');
					let wrap = null;
					allNodes.forEach(node => { if (node.getAttribute('data-coach') === String(key)) wrap = node; });
					const hoursByDay = new Map();
					let count = 0;
					(value.list || []).forEach(rec => {
						const dateStr = rec?.date || rec?.workDate || rec?.day || rec?.work_date;
						if (!dateStr) return;
						const d = new Date(dateStr);
						if (!Number.isNaN(d.getTime()) && (d.getFullYear()===year) && ((d.getMonth()+1)===month)) {
							const day = d.getDate();
							const hRaw = rec?.hours ?? rec?.totalHours ?? rec?.hour ?? rec?.work_hours ?? 0;
							const h = Number(hRaw) || 0;
							hoursByDay.set(day, (hoursByDay.get(day) || 0) + h);
							count += h > 0 ? 1 : 0;
						}
					});
					console.log('🧮 教練日曆資料彙總', { coach: value.name || value.phone || key, records: (value.list||[]).length, monthRecords: count });
					if (wrap) {
						generateWorkHoursCalendarIn(wrap, year, month, hoursByDay);
						if (hoursByDay.size === 0) {
							wrap.innerHTML += '<div style="padding:8px;color:#888;">本月沒有工時記錄</div>';
						}
					}
				});
			}
		} else {
			// 教練模式：保持單一日曆
			const hoursByDay = new Map();
			(workHoursList || []).forEach(item => {
				const d = new Date(item.date);
				if (!Number.isNaN(d.getTime()) && (d.getFullYear()===year) && ((d.getMonth()+1)===month)) {
					const day = d.getDate();
					const h = Number(item.hours) || 0;
					hoursByDay.set(day, (hoursByDay.get(day) || 0) + h);
				}
			});
			generateWorkHoursCalendar(year, month, hoursByDay);
		}

	} catch (e) {
		console.error(e);
	} finally {
		showLoading(false);
	}
}

// 更新工時总结
function updateWorkHoursSummary(data) {
    document.getElementById('totalWorkDays').textContent = data.totalDays;
    document.getElementById('totalWorkHours').textContent = data.totalHours;
    document.getElementById('avgWorkHours').textContent = data.averageHours;
}

// 更新全部工時总结
async function updateAllWorkHoursSummary(coachPhone) {
    try {
        if (typeof databaseConnector !== 'undefined' && databaseConnector && databaseConnector.connectionStatus.connected) {
            const allWorkHours = await databaseConnector.fetchAllCoachWorkHours(coachPhone);
            
            let totalAllDays = 0;
            let totalAllHours = 0;
            
            // 按地点和泳会分组统计
            const locationClubStats = {};
            
            allWorkHours.forEach(record => {
                const hours = Number(record.hours || 0);
                const location = record.location || '';
                const club = record.club || '';
                const key = `${location}__${club}`;
                
                if (hours > 0) {
                    totalAllDays++;
                    totalAllHours += hours;
                    
                    if (!locationClubStats[key]) {
                        locationClubStats[key] = {
                            location: location,
                            club: club,
                            days: 0,
                            hours: 0
                        };
                    }
                    locationClubStats[key].days++;
                    locationClubStats[key].hours += hours;
                }
            });
            
            // 更新全部工時总结显示
            document.getElementById('totalAllWorkDays').textContent = totalAllDays;
            document.getElementById('totalAllWorkHours').textContent = totalAllHours;
            
            // 保存统计数据供Excel导出使用
            window.allWorkHoursData = {
                totalAllDays: totalAllDays,
                totalAllHours: totalAllHours,
                locationClubStats: locationClubStats
            };
            
            console.log('✅ 全部工時总结更新成功:', {
                totalAllDays,
                totalAllHours,
                locationClubStats
            });
        }
    } catch (error) {
        console.error('❌ 更新全部工時总结失败:', error);
    }
}

// 顯示工時數據加載狀態
function showWorkHoursLoading(show) {
    const loadingElement = document.getElementById('workHoursLoading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    // 更新刷新按鈕狀態
    const refreshBtn = document.querySelector('#workHoursSection .refresh-btn');
    if (refreshBtn) {
        refreshBtn.disabled = show;
        refreshBtn.innerHTML = show ? '<i class="fas fa-spinner fa-spin"></i> 載入中...' : '<i class="fas fa-sync-alt"></i> 刷新數據';
    }
}

// 導出工時Excel
async function exportWorkHoursExcel() {
    try {
        const coachPhone = localStorage.getItem('current_user_phone') || '';
        const coachName = localStorage.getItem('current_user_name') || '教練';
        
        console.log('🔍 开始导出Excel:', { coachPhone, coachName });
        
        if (!coachPhone) {
            alert('請先登入教練賬號');
            return;
        }
        
        // 强制重新获取全部工時数据
        console.log('📊 强制重新获取全部工時数据...');
        await updateAllWorkHoursSummary(coachPhone);
        
        const data = window.allWorkHoursData;
        console.log('📋 全部工時数据:', data);
        
        if (!data) {
            alert('無法獲取工時數據，請先刷新數據');
            return;
        }
        
        if (!data.locationClubStats || Object.keys(data.locationClubStats).length === 0) {
            // 如果没有数据，创建一个空的Excel文件
            console.log('📝 没有工时数据，创建空记录Excel');
            const emptyData = {
                locationClubStats: {},
                totalAllDays: 0,
                totalAllHours: 0
            };
            const excelData = generateWorkHoursExcelData(coachName, emptyData);
            downloadExcelFile(excelData, `${coachName}_工時記錄_${new Date().toISOString().split('T')[0]}.xlsx`);
            alert('已導出空記錄Excel文件（當前無工時數據）');
            return;
        }
        
        // 生成Excel数据
        console.log('📊 生成Excel数据...');
        const excelData = generateWorkHoursExcelData(coachName, data);
        
        // 下载Excel文件
        const filename = `${coachName}_工時記錄_${new Date().toISOString().split('T')[0]}.xlsx`;
        downloadExcelFile(excelData, filename);
        
        console.log('✅ Excel导出成功:', filename);
        alert('Excel文件已成功導出！');
        
    } catch (error) {
        console.error('❌ Excel导出失败:', error);
        alert('導出失敗: ' + error.message);
    }
}

// 生成工時Excel数据
function generateWorkHoursExcelData(coachName, data) {
    const { locationClubStats, totalAllDays, totalAllHours } = data;
    
    console.log('📊 生成Excel数据:', { coachName, locationClubStats, totalAllDays, totalAllHours });
    
    // 创建工作簿
    const workbook = {
        SheetNames: ['工時記錄'],
        Sheets: {
            '工時記錄': {}
        }
    };
    
    const worksheet = workbook.Sheets['工時記錄'];
    
    // 设置列宽
    worksheet['!cols'] = [
        { width: 15 }, // 地点
        { width: 15 }, // 泳会
        { width: 15 }, // 总工作天数
        { width: 15 }  // 总工作时数
    ];
    
    // 标题行
    worksheet['A1'] = { v: '教練工時記錄', t: 's' };
    worksheet['A2'] = { v: `教練姓名: ${coachName}`, t: 's' };
    worksheet['A3'] = { v: `導出日期: ${new Date().toLocaleDateString('zh-TW')}`, t: 's' };
    
    // 表头
    worksheet['A5'] = { v: '地點', t: 's' };
    worksheet['B5'] = { v: '泳會', t: 's' };
    worksheet['C5'] = { v: '總工作天數', t: 's' };
    worksheet['D5'] = { v: '總工作時數', t: 's' };
    
    // 数据行
    let row = 6;
    const locationClubArray = Object.values(locationClubStats || {});
    
    console.log('📋 地点泳会数组:', locationClubArray);
    
    if (locationClubArray.length === 0) {
        // 如果没有数据，添加一行说明
        worksheet[`A${row}`] = { v: '暫無工時記錄', t: 's' };
        worksheet[`B${row}`] = { v: '', t: 's' };
        worksheet[`C${row}`] = { v: 0, t: 'n' };
        worksheet[`D${row}`] = { v: 0, t: 'n' };
        row++;
    } else {
        locationClubArray.forEach(stat => {
            console.log('📝 添加数据行:', stat);
            worksheet[`A${row}`] = { v: stat.location || '', t: 's' };
            worksheet[`B${row}`] = { v: stat.club || '', t: 's' };
            worksheet[`C${row}`] = { v: stat.days || 0, t: 'n' };
            worksheet[`D${row}`] = { v: stat.hours || 0, t: 'n' };
            row++;
        });
    }
    
    // 总计行
    worksheet[`A${row}`] = { v: '全部工作天數', t: 's' };
    worksheet[`C${row}`] = { v: totalAllDays || 0, t: 'n' };
    worksheet[`A${row + 1}`] = { v: '全部工作時數', t: 's' };
    worksheet[`D${row + 1}`] = { v: totalAllHours || 0, t: 'n' };
    
    console.log('✅ Excel工作簿生成完成');
    return workbook;
}

// 下载Excel文件
function downloadExcelFile(workbook, filename) {
    // 使用SheetJS库生成Excel文件
    if (typeof XLSX === 'undefined') {
        // 如果没有SheetJS库，使用简单的CSV格式
        downloadCSVFile(workbook, filename.replace('.xlsx', '.csv'));
        return;
    }
    
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    
    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }
    
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 下载CSV文件（备用方案）
function downloadCSVFile(workbook, filename) {
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 生成工時日曆
function generateWorkHoursCalendar(year, month, hoursByDay) {
	const calendar = document.getElementById('workHoursCalendar');
	const weekdays = ['日','一','二','三','四','五','六'];
	
	// 建立表頭
	let html = '<div class="cal grid-7">';
	weekdays.forEach(w => { html += `<div class="cal-head">${w}</div>`; });
	
	const first = new Date(year, month - 1, 1);
	const daysInMonth = new Date(year, month, 0).getDate();
	const offset = first.getDay(); // 0..6 Sun..Sat
	
	// 前置空白
	for (let i = 0; i < offset; i++) html += '<div class="cal-cell cal-empty"></div>';
	
	const today = new Date();
	const isThisMonth = (today.getFullYear() === year && (today.getMonth()+1) === month);
	const todayDate = isThisMonth ? today.getDate() : -1;
	
	for (let d = 1; d <= daysInMonth; d++) {
		const h = hoursByDay.get(d) || 0;
		const isToday = d === todayDate;
		const hoursHtml = (Number(h) > 0) ? `${Number(h).toFixed(1)}h` : '';
		html += `<div class="cal-cell ${isToday ? 'is-today' : ''} ${h>0 ? 'has-hours' : ''}">`+
			`<div class="cal-day">${d}</div>`+
			`<div class="cal-hours">${hoursHtml}</div>`+
		`</div>`;
	}
	
	html += '</div>';
	calendar.innerHTML = html;
	
	// 點擊提示
	[...calendar.querySelectorAll('.cal-cell')].forEach((cell, idx) => {
		const day = idx - offset + 1;
		if (day >= 1 && day <= daysInMonth) {
			const hh = hoursByDay.get(day) || 0;
			cell.addEventListener('click', () => {
				alert(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}：${hh>0?Number(hh).toFixed(1)+' 小時':'無記錄'}`);
			});
		}
	});
	
	// 渲染後強制調整單元格高度
	adjustCalendarSizing(calendar);
}

// 生成工時日曆（容器版本，用於主管模式多教練）
function generateWorkHoursCalendarIn(containerEl, year, month, hoursByDay) {
	if (!containerEl) return;
	const weekdays = ['日','一','二','三','四','五','六'];
	let html = '<div class="cal grid-7">';
	weekdays.forEach(w => { html += `<div class="cal-head">${w}</div>`; });
	const first = new Date(year, month - 1, 1);
	const daysInMonth = new Date(year, month, 0).getDate();
	const offset = first.getDay();
	for (let i = 0; i < offset; i++) html += '<div class="cal-cell cal-empty"></div>';
	const today = new Date();
	const isThisMonth = (today.getFullYear() === year && (today.getMonth()+1) === month);
	const todayDate = isThisMonth ? today.getDate() : -1;
	for (let d = 1; d <= daysInMonth; d++) {
		const h = hoursByDay.get(d) || 0;
		const isToday = d === todayDate;
		const hoursHtml = (Number(h) > 0) ? `${Number(h).toFixed(1)}h` : '';
		html += `<div class="cal-cell ${isToday ? 'is-today' : ''} ${h>0 ? 'has-hours' : ''}">`+
			`<div class="cal-day">${d}</div>`+
			`<div class="cal-hours">${hoursHtml}</div>`+
		`</div>`;
	}
	html += '</div>';
	containerEl.innerHTML = html;
	adjustCalendarSizing(containerEl);
}

// 生成更表日曆
function generateRosterCalendar(year, month, rosterByDay) {
	const calendar = document.getElementById('rosterCalendar');
	const weekdays = ['日','一','二','三','四','五','六'];
	let html = '<div class="cal grid-7">';
	weekdays.forEach(w => { html += `<div class="cal-head">${w}</div>`; });
	
	const cal = new Date(year, month - 1, 1);
	const firstDow = cal.getDay();
	const daysInMonth = new Date(year, month, 0).getDate();
	for (let i=0;i<firstDow;i++) html += '<div class="cal-cell cal-empty"></div>';
	
	const today = new Date();
	const isThisMonth = (today.getFullYear()===year && (today.getMonth()+1)===month);
	const todayDay = isThisMonth ? today.getDate() : -1;
	
	// 小工具：時間正規化並排序
	const normalizeTime = (t) => {
		const s = String(t||'').trim();
		const m = s.match(/^(\d{1,2})(:?)(\d{0,2})(?:\s*-\s*(\d{1,2})(:?)(\d{0,2}))?/);
		if (!m) return { sortKey: 9999, label: s };
		const h1 = Number(m[1]); const min1 = m[3] ? Number(m[3]) : 0;
		const h2 = m[4] ? Number(m[4]) : null; const min2 = m[6] ? Number(m[6]) : 0;
		const pad = (n)=> String(n).padStart(2,'0');
		const left = `${pad(h1)}:${pad(min1)}`;
		const right = (h2!==null) ? `${pad(h2)}:${pad(min2)}` : '';
		return { sortKey: h1*60+min1, label: right? `${left}-${right}` : left };
	};
	
	for (let d=1; d<=daysInMonth; d++) {
		const raw = rosterByDay.get(d) || [];
		// 排序並格式化
		const slots = raw
			.map(s=>({ timeObj: normalizeTime(s.time||s.timeRange||''), location: s.location||s.place||'' }))
			.sort((a,b)=> a.timeObj.sortKey - b.timeObj.sortKey)
			.map(x=>({ time: x.timeObj.label, location: x.location }));
		const topClass = d===todayDay ? 'is-today' : '';
		html += `<div class="cal-cell ${topClass} ${slots.length? 'has-hours':''}">`+
			`<div class="cal-day">${d}</div>`+
			`<div class="cal-roster">${slots.map(s => `<div class=\"slot\"><div class=\"cal-roster-time\">${s.time||''}</div><div class=\"cal-roster-loc\">${s.location||''}</div></div>`).join('')}</div>`+
		`</div>`;
	}
	
	html += '</div>';
	calendar.innerHTML = html;
	adjustCalendarSizing(calendar);
}

// 強制調整日曆方格高度 = 寬度，確保鋪滿容器且不變形
function adjustCalendarSizing(containerEl) {
	try {
		if (!containerEl) return;
		const grid = containerEl.querySelector('.cal.grid-7');
		if (!grid) return;
		const cells = grid.querySelectorAll('.cal-cell');
		if (!cells.length) return;
		// 使用第一個單元格的實際寬度作為高度
		const firstCell = cells[0];
		const cellWidth = firstCell.getBoundingClientRect().width;
		cells.forEach(c => { c.style.height = `${Math.max(60, Math.round(cellWidth))}px`; });
	} catch (_) {}
}

// 生成每日上課地點統計
async function generateDailyLocationStats() {
    try {
        showLoading(true);
        const month = parseInt(document.getElementById('statsMonth').value);
        const year = new Date().getFullYear();
        const userType = localStorage.getItem('current_user_type') || 'coach';
        
        // 確保地點數據已加載
        if (!locations || locations.length === 0) {
            console.log('🔄 地點數據未加載，正在重新獲取...');
            await loadLocationsAndClubs();
        }
        
        // 根據用戶類型獲取數據
        let rosterList = [];
        if (userType === 'supervisor') {
            // 主管：獲取所有教練的更表數據
            rosterList = await databaseConnector.fetchRoster(month, '');
        } else {
            // 教練：僅獲取自己的更表數據
            const phone = localStorage.getItem('current_user_phone') || '';
            rosterList = await databaseConnector.fetchRoster(month, phone);
        }
        
        if (!Array.isArray(rosterList)) {
            const roster = (rosterList && Array.isArray(rosterList.roster)) ? rosterList.roster : [];
            if (roster.length === 0) {
                showDailyLocationStats([]);
                return;
            }
        }
        
        // 按日期聚合數據
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // 處理更表數據，收集教練和地點信息
        const coachDailyData = new Map(); // 教練每日地點數據
        const dailyStats = new Map(); // 每日統計數據
        
        console.log('🔍 開始處理更表數據，總條目數:', rosterList.length);
        
        (rosterList || []).forEach((item, index) => {
            const dateStr = item?.date || item?.rosterDate || item?.day;
            if (!dateStr) {
                console.log(`⚠️ 條目 ${index}: 缺少日期信息`, item);
                return;
            }
            
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime()) || d.getFullYear() !== year || (d.getMonth() + 1) !== month) {
                console.log(`⚠️ 條目 ${index}: 日期不匹配`, { dateStr, year, month, item });
                return;
            }
            
            const day = d.getDate();
            const time = item?.time || item?.timeRange || '';
            const location = item?.location || item?.place || '';
            const coachPhone = item?.phone || item?.coachPhone || '';
            const coachName = item?.name || item?.studentName || item?.coachName || `教練_${coachPhone || '未知'}`;
            
            console.log(`📋 條目 ${index}:`, {
                day,
                time,
                location,
                coachPhone,
                coachName,
                originalItem: item
            });
            
            if (!location || location.trim() === '') {
                console.log(`⚠️ 條目 ${index}: 缺少地點信息`);
                return;
            }
            
            // 使用實際地點數據提取地點信息
            const locationInfo = extractLocationFromRoster(location, time);
            console.log(`📍 條目 ${index} 地點提取結果:`, locationInfo);
            
            if (locationInfo.isValidLocation) {
                // 收集教練每日地點數據
                if (!coachDailyData.has(coachName)) {
                    coachDailyData.set(coachName, {
                        name: coachName,
                        dailyLocations: new Map()
                    });
                    console.log(`👤 新增教練: ${coachName}`);
                }
                const coachData = coachDailyData.get(coachName);
                coachData.dailyLocations.set(day, locationInfo.location);
                console.log(`✅ 教練 ${coachName} 第 ${day} 天設置地點: ${locationInfo.location}`);
                
                // 收集每日統計數據
                const dayStats = dailyStats.get(day) || new Map();
                const count = dayStats.get(locationInfo.location) || 0;
                dayStats.set(locationInfo.location, count + 1);
                dailyStats.set(day, dayStats);
            } else {
                console.log(`❌ 條目 ${index}: 地點無效 - ${location}`);
            }
        });
        
        console.log('📊 處理完成，教練數據:', coachDailyData);
        console.log('📊 處理完成，每日統計:', dailyStats);
        
        // 轉換為顯示格式
        const statsArray = Array.from(dailyStats.entries()).map(([day, locationCounts]) => {
            const locations = Array.from(locationCounts.entries()).map(([loc, count]) => ({
                location: loc,
                count: count
            })).sort((a, b) => b.count - a.count); // 按數量降序排列
            
            return {
                day: day,
                locations: locations,
                totalCount: locations.reduce((sum, loc) => sum + loc.count, 0)
            };
        });
        
        // 將教練數據添加到統計結果中
        statsArray.coachData = coachDailyData;
        
        // 添加調試日誌
        console.log('教練數據結構:', coachDailyData);
        console.log('統計數組:', statsArray);
        
        showDailyLocationStats(statsArray);
        
    } catch (error) {
        console.error('生成每日地點統計失敗:', error);
        alert('生成統計失敗: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 從更表條目中提取地點信息（使用實際的地點數據）
function extractLocationFromRoster(location, time) {
    if (!location || typeof location !== 'string') {
        return { isValidLocation: false, location: '' };
    }
    
    const loc = location.trim();
    
    // 排除非地點條目（常見的假期和休息狀態）
    const nonLocationPatterns = [
        /^DO\s*$/i,           // 例假
        /^OFF\s*$/i,          // 無薪假
        /^PH\s*$/i,           // 勞假
        /^AL\s*$/i,           // 年假
        /^BO\s*$/i,           // 生日假
        /^休息\s*$/i,         // 休息
        /^放假\s*$/i,         // 放假
        /^病假\s*$/i,         // 病假
        /^事假\s*$/i,         // 事假
        /^請假\s*$/i,         // 請假
        /^曠工\s*$/i,         // 曠工
        /^出差\s*$/i,         // 出差
        /^培訓\s*$/i,         // 培訓
        /^會議\s*$/i          // 會議
    ];
    
    for (const pattern of nonLocationPatterns) {
        if (pattern.test(loc)) {
            return { isValidLocation: false, location: '' };
        }
    }
    
    // 檢查是否匹配實際的地點數據
    if (typeof locations !== 'undefined' && Array.isArray(locations)) {
        // 直接匹配完整地點名稱
        for (const validLocation of locations) {
            if (validLocation && loc === validLocation) {
                return { isValidLocation: true, location: validLocation };
            }
        }
        
        // 模糊匹配（包含關係）
        for (const validLocation of locations) {
            if (validLocation && (loc.includes(validLocation) || validLocation.includes(loc))) {
                return { isValidLocation: true, location: validLocation };
            }
        }
    }
    
    // 如果沒有匹配到實際地點數據，但看起來像地點，則保留原值
    // 放寬條件：只要是有效的字符串且不是純數字，就認為是地點
    if (loc.length > 0 && loc.length <= 50 && !/^\d+$/.test(loc)) {
        // 特別處理一些常見的地點名稱
        const commonLocations = [
            '九龍公園', '維園', '維多利亞公園', '荔枝角公園', '觀塘', '美孚', '堅尼地城',
            '上門', '維多利亞公園游泳池', '荔枝角公園游泳池', '觀塘游泳池'
        ];
        
        for (const commonLoc of commonLocations) {
            if (loc.includes(commonLoc) || commonLoc.includes(loc)) {
                return { isValidLocation: true, location: commonLoc };
            }
        }
        
        // 如果包含"公園"、"游泳池"等關鍵詞，也認為是有效地點
        if (loc.includes('公園') || loc.includes('游泳池') || loc.includes('泳池')) {
            return { isValidLocation: true, location: loc };
        }
        
        // 最後的兜底：任何看起來像地點的字符串
        return { isValidLocation: true, location: loc };
    }
    
    return { isValidLocation: false, location: '' };
}

// 顯示每日地點統計結果（橫向表格格式）
function showDailyLocationStats(statsArray) {
    const container = document.getElementById('dailyLocationStats');
    if (!container) return;
    
    if (!statsArray || statsArray.length === 0) {
        container.innerHTML = '<div class="empty">本月沒有更表數據</div>';
        container.className = 'daily-stats-container empty';
        return;
    }
    
    container.className = 'daily-stats-container';
    
    // 獲取月份信息
    const month = parseInt(document.getElementById('statsMonth').value);
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 創建橫向表格
    let html = '<div class="stats-table-container">';
    html += '<table class="daily-stats-table horizontal">';
    
    // 表頭：第一列為教練名稱，後面的列為日期
    html += '<thead><tr>';
    html += '<th class="coach-header">教練名稱</th>';
    
    // 添加日期列標題
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
        const isToday = new Date().getDate() === day && new Date().getMonth() === month - 1;
        const todayClass = isToday ? ' today-header' : '';
        
        html += `<th class="date-header${todayClass}">`;
        html += `<div class="date-number">${day}</div>`;
        html += `<div class="date-weekday">${dayOfWeek}</div>`;
        html += '</th>';
    }
    html += '</tr></thead>';
    
    // 表格主體：每行代表一個教練
    html += '<tbody>';
    
    // 從統計數據中提取教練信息
    const coachData = statsArray.coachData || new Map();
    
    // 如果沒有教練數據，嘗試從統計數據中構建
    if (coachData.size === 0) {
        statsArray.forEach(stat => {
            if (stat.locations && stat.locations.length > 0) {
                stat.locations.forEach(loc => {
                    // 使用地點作為教練標識（當沒有具體教練信息時）
                    const coachKey = `教練_${loc.location}`;
                    if (!coachData.has(coachKey)) {
                        coachData.set(coachKey, {
                            name: `教練_${loc.location}`,
                            dailyLocations: new Map()
                        });
                    }
                    const coach = coachData.get(coachKey);
                    coach.dailyLocations.set(stat.day, loc.location);
                });
            }
        });
    }
    
    // 如果沒有教練數據，顯示提示信息
    if (coachData.size === 0) {
        html += '<tr><td colspan="' + (daysInMonth + 1) + '" class="no-data">本月沒有教練更表數據</td></tr>';
    } else {
        // 顯示每個教練的行
        coachData.forEach((coach, coachKey) => {
            // 檢查教練數據結構
            if (!coach || typeof coach !== 'object') {
                console.warn('教練數據結構異常:', coach);
                return;
            }
            
            const coachName = coach.name || coachKey || '未知教練';
            const dailyLocations = coach.dailyLocations || new Map();
            
            html += '<tr>';
            html += `<td class="coach-name">${coachName}</td>`;
            
            // 為每一天添加地點信息
            for (let day = 1; day <= daysInMonth; day++) {
                const location = dailyLocations.get ? dailyLocations.get(day) : null;
                const isToday = new Date().getDate() === day && new Date().getMonth() === month - 1;
                const todayClass = isToday ? ' today-cell' : '';
                
                if (location) {
                    html += `<td class="location-cell${todayClass}" title="${location}">${location}</td>`;
                } else {
                    html += `<td class="empty-cell${todayClass}">-</td>`;
                }
            }
            html += '</tr>';
        });
    }
    
    html += '</tbody></table>';
    html += '</div>';
    
    // 添加月度總結
    const totalDays = statsArray.length;
    const totalLocations = statsArray.reduce((sum, stat) => sum + stat.locations.length, 0);
    const totalCoaches = statsArray.reduce((sum, stat) => sum + stat.totalCount, 0);
    const avgCoachesPerDay = totalDays > 0 ? (totalCoaches / totalDays).toFixed(1) : 0;
    
    html += '<div style="margin-top: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px;">';
    html += '<h5 style="margin: 0 0 12px 0; color: #374151;">月度統計總結</h5>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">';
    html += `<div><strong>總天數：</strong>${totalDays}天</div>`;
    html += `<div><strong>總地點數：</strong>${totalLocations}個</div>`;
    html += `<div><strong>總教練數：</strong>${totalCoaches}人次</div>`;
    html += `<div><strong>日均教練數：</strong>${avgCoachesPerDay}人</div>`;
    html += '</div>';
    
    // 添加地點數據來源信息
    if (locations && locations.length > 0) {
        html += '<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #d1d5db;">';
        html += '<h6 style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">地點數據來源</h6>';
        html += '<div style="font-size: 12px; color: #6b7280; line-height: 1.4;">';
        html += `<strong>可用地點：</strong>${locations.length}個<br>`;
        html += `<strong>地點列表：</strong>${locations.join('、')}`;
        html += '</div></div>';
    }
    
    html += '</div>';
    
    container.innerHTML = html;
}

// 導出地點統計數據
function exportLocationStats() {
    try {
        const month = parseInt(document.getElementById('statsMonth').value);
        const year = new Date().getFullYear();
        const monthName = document.getElementById('statsMonth').options[document.getElementById('statsMonth').selectedIndex].text;
        
        // 獲取當前顯示的統計數據
        const container = document.getElementById('dailyLocationStats');
        if (!container || container.classList.contains('empty')) {
            alert('請先生成統計數據');
            return;
        }
        
        // 創建Excel數據
        const data = [];
        data.push([`${year}年${monthName}教練更表每日上課地點統計`]);
        data.push([]);
        data.push(['日期', '上課地點數量', '總教練數', '各地點詳情']);
        
        const rows = container.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const date = cells[0].textContent;
                const locationCount = cells[1].textContent;
                const totalCoaches = cells[2].textContent;
                const locationDetails = cells[3].textContent;
                
                data.push([date, locationCount, totalCoaches, locationDetails]);
            }
        });
        
        // 添加月度總結
        data.push([]);
        const summaryDiv = container.querySelector('div[style*="background: #f3f4f6"]');
        if (summaryDiv) {
            const summaryText = summaryDiv.textContent;
            data.push(['月度統計總結']);
            data.push([summaryText]);
        }
        
        // 創建並下載Excel文件
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '地點統計');
        
        const fileName = `${year}年${monthName}教練更表地點統計_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
    } catch (error) {
        console.error('導出統計失敗:', error);
        alert('導出失敗: ' + error.message);
    }
}

// 視窗尺寸變更時，重新調整兩個日曆尺寸
window.addEventListener('resize', () => {
	adjustCalendarSizing(document.getElementById('workHoursCalendar'));
	adjustCalendarSizing(document.getElementById('rosterCalendar'));
});

// 加载更表数据
async function loadRosterData() {
	const rosterMonthEl = document.getElementById('rosterMonth');
	const month = parseInt((rosterMonthEl && rosterMonthEl.value) ? rosterMonthEl.value : (new Date().getMonth()+1), 10);
	const year = new Date().getFullYear();
	showLoading(true);
	try {
		let rosterList = [];
		if (typeof databaseConnector !== 'undefined' && databaseConnector && databaseConnector.connectionStatus.connected) {
			const userType = localStorage.getItem('current_user_type') || 'coach';
			
			// 主管可以查看所有教练数据，教练只能查看自己的数据
			let phone = '';
			if (userType === 'supervisor') {
				phone = ''; // 空字符串表示获取所有教练数据
				console.log('🔍 主管模式：獲取所有教練更表數據');
			} else {
				phone = localStorage.getItem('current_user_phone') || '';
			}
			
			rosterList = await databaseConnector.fetchRoster(month, phone);
		}
		// 若後端回傳非陣列，兼容 {roster:[...]} 或 null
		if (!Array.isArray(rosterList)) {
			rosterList = (rosterList && Array.isArray(rosterList.roster)) ? rosterList.roster : [];
		}
		// 兼容：一天多段 [{date,time,location}] 聚合為 Map<day, Array<{time,location}>>
		const rosterByDay = new Map();
		(rosterList || []).forEach(item => {
			const dateStr = item?.date || item?.rosterDate || item?.day;
			if (!dateStr) return;
			const d = new Date(dateStr);
			const t = d.getTime();
			if (!Number.isNaN(t) && d.getFullYear() === year && (d.getMonth()+1) === month) {
				const day = d.getDate();
				const time = item?.time || item?.timeRange || '';
				const location = item?.location || item?.place || '';
				const arr = rosterByDay.get(day) || [];
				arr.push({ time, location });
				rosterByDay.set(day, arr);
			}
		});
		// 使用可编辑版本以支持月份选择
		const container = document.getElementById('rosterCalendar');
		if (container) {
			generateEditableRosterCalendar(year, month, rosterByDay);
		}
	} catch (error) {
		console.error('加载更表数据失败:', error);
		alert('加载数据失败');
	} finally {
		showLoading(false);
	}
}

// 加载地点泳会数据
async function loadLocationClubData() {
    const location = document.getElementById('locationSelect').value;
    const club = document.getElementById('clubSelect').value;
    
    if (location && club) {
        document.getElementById('currentLocation').textContent = location;
        document.getElementById('currentClub').textContent = club;
    }
}

// 编辑出席记录
function editAttendance(studentName) {
    alert(`編輯 ${studentName} 的出席記錄\n此功能將在實際API整合後實現`);
}

// 添加CSS样式到页面
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .table-row {
            background: white;
        }
        
        .table-row:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .status-badge.present {
            background: #d4edda;
            color: #155724;
        }
        
        .status-badge.absent {
            background: #f8d7da;
            color: #721c24;
        }
        
        .edit-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
        }
        
        .edit-btn:hover {
            background: #0056b3;
        }
    `;
    document.head.appendChild(style);
}

// 页面加载完成后添加动态样式
document.addEventListener('DOMContentLoaded', function() {
    addDynamicStyles();
});

// 错误处理函数
function handleError(error, context) {
    console.error(`${context} 错误:`, error);
    alert(`${context} 失败: ${error.message}`);
}

// 工具函数：格式化日期
function formatDate(date) {
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 工具函数：格式化时间
function formatTime(date) {
    return date.toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 工具函数：验证手机号格式
function validatePhone(phone) {
    const phoneRegex = /^[0-9]{8,11}$/;
    return phoneRegex.test(phone);
}

// 工具函数：验证密码强度
function validatePassword(password) {
    return password.length >= 6;
}

// 强制刷新UI以显示最新缓存数据
function forceRefreshUI() {
    if (databaseConnector && databaseConnector.cache) {
        console.log('🔄 强制刷新UI，使用最新缓存数据');
        
        // 更新全局变量
        if (databaseConnector.cache.locations && databaseConnector.cache.locations.length > 0) {
            locations = databaseConnector.cache.locations;
            console.log('📋 更新地点数据:', locations);
        }
        
        if (databaseConnector.cache.clubs && databaseConnector.cache.clubs.length > 0) {
            clubs = databaseConnector.cache.clubs;
            console.log('📋 更新泳会数据:', clubs);
        }
        
        // 重新填充选择器
        populateLocationSelects();
        console.log('✅ UI刷新完成，地点数量:', locations.length, '泳会数量:', clubs.length);
    }
}

// 导出函数供HTML使用
window.showAttendanceManagement = showAttendanceManagement;
window.showWorkHours = showWorkHours;
window.showRoster = showRoster;
window.showLocationClub = showLocationClub;
window.hideAllFeatures = hideAllFeatures;
window.loadAttendanceData = loadAttendanceData;
window.loadWorkHoursData = loadWorkHoursData;
window.loadRosterData = loadRosterData;
window.loadLocationClubData = loadLocationClubData;
window.editAttendance = editAttendance;

// 渲染所有教練工時日曆
async function renderAllCoachesWorkHours() {
    try {
        showLoading(true);
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        // 主管模式拉取全部工時（空 phone）
        const list = await databaseConnector.fetchCoachWorkHours('', year, month, '', '');
        const container = document.getElementById('staffWorkHoursCalendars');
        if (!container) return;
        const byCoach = new Map();
        (list || []).forEach(item => {
            const phoneVal = item.phone || item.coachPhone || '';
            const name = item.studentName || item.name || '';
            const key = phoneVal || name || 'unknown';
            if (!byCoach.has(key)) byCoach.set(key, { name, phone: phoneVal, list: [] });
            byCoach.get(key).list.push(item);
        });
        let html = '<div class="coach-calendars">';
        byCoach.forEach((value, key) => {
            const label = (value.name || '未命名教練') + (value.phone ? '（' + value.phone + '）' : '');
            html += `<div class="coach-calendar-card">`+
                `<div class="coach-calendar-title">${label}</div>`+
                `<div class="coach-calendar-body"><div class="coach-calendar" data-coach="${String(key)}"></div></div>`+
            `</div>`;
        });
        html += '</div>';
        container.innerHTML = html;
        byCoach.forEach((value, key) => {
            const allNodes = container.querySelectorAll('.coach-calendar');
            let wrap = null;
            allNodes.forEach(node => { if (node.getAttribute('data-coach') === String(key)) wrap = node; });
            const hoursByDay = new Map();
            (value.list || []).forEach(rec => {
                const dateStr = rec?.date || rec?.workDate || rec?.day || rec?.work_date;
                if (!dateStr) return;
                const d = new Date(dateStr);
                if (!Number.isNaN(d.getTime()) && (d.getFullYear()===year) && ((d.getMonth()+1)===month)) {
                    const day = d.getDate();
                    const hRaw = rec?.hours ?? rec?.totalHours ?? rec?.hour ?? rec?.work_hours ?? 0;
                    const h = Number(hRaw) || 0;
                    hoursByDay.set(day, (hoursByDay.get(day) || 0) + h);
                }
            });
            if (wrap) {
                generateWorkHoursCalendarIn(wrap, year, month, hoursByDay);
                if (hoursByDay.size === 0) {
                    wrap.innerHTML += '<div style="padding:8px;color:#888;">本月沒有工時記錄</div>';
                }
            }
        });
    } catch (e) {
        console.warn('載入教練工時失敗', e);
    } finally {
        showLoading(false);
    }
}

// 渲染所有教練更表
async function renderAllCoachesRoster(targetYear = null, targetMonth = null) {
    try {
        showLoading(true);
        
        // 如果没有指定年月，尝试从选择器获取，否则使用当前年月
        let year = targetYear;
        let month = targetMonth;
        
        if (!year || !month) {
            const rosterMonthSelector = document.getElementById('rosterMonthSelector');
            if (rosterMonthSelector && rosterMonthSelector.value) {
                const [selectedYear, selectedMonth] = rosterMonthSelector.value.split('-');
                year = parseInt(selectedYear);
                month = parseInt(selectedMonth);
            } else {
                year = new Date().getFullYear();
                month = new Date().getMonth() + 1;
            }
        }
        // 空 phone + supervisor 代表全部
        const list = await databaseConnector.fetchRoster(month, '');
        const container = document.getElementById('staffRosterCalendars');
        if (!container) return;
        // 聚合為單一月曆（需求：顯示所有 staff 的更表），這裡採用合併視圖
        const rosterByDay = new Map();
        (list || []).forEach(item => {
            const dateStr = item?.date || item?.rosterDate || item?.day;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth()+1) === month) {
                const day = d.getDate();
                const time = item?.time || item?.timeRange || '';
                const location = item?.location || item?.place || '';
                const arr = rosterByDay.get(day) || [];
                arr.push({ time, location });
                rosterByDay.set(day, arr);
            }
        });
        // 直接渲染到容器（使用可編輯版本以支持月份選擇）
        // 將容器 id 切換為 rosterCalendar 所需結構
        container.id = 'rosterCalendar';
        generateEditableRosterCalendar(year, month, rosterByDay);
        container.id = 'staffRosterCalendars';
    } catch (e) {
        console.warn('載入教練更表失敗', e);
    } finally {
        showLoading(false);
    }
}

async function populateCoachSelect() {
    try {
        const sel = document.getElementById('staffCoachSelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">全部教練</option>';
        const list = await databaseConnector.fetchCoaches();
        (list || []).forEach(c => {
            const phone = c.phone || c.studentPhone || '';
            const name = c.name || c.studentName || phone;
            const opt = document.createElement('option');
            opt.value = phone;
            opt.textContent = name + (phone ? `（${phone}）` : '');
            sel.appendChild(opt);
        });
    } catch (e) {
        console.warn('載入教練清單失敗', e);
    }
}

function onChangeStaffCoach() {
    const phone = (document.getElementById('staffCoachSelect') || {}).value || '';
    const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
    if (userType === 'supervisor' && phone) {
        renderCoachRoster(phone);
    } else if (userType === 'supervisor' && !phone) {
        // 未選擇教練清空
        const container = document.getElementById('staffRosterCalendars');
        if (container) container.innerHTML = '';
    } else {
        renderAllCoachesRoster();
    }
}

async function renderCoachRoster(phone, targetYear = null, targetMonth = null) {
    try {
        showLoading(true);
        
        // 如果没有指定年月，尝试从选择器获取，否则使用当前年月
        let year = targetYear;
        let month = targetMonth;
        
        if (!year || !month) {
            const rosterMonthSelector = document.getElementById('rosterMonthSelector');
            if (rosterMonthSelector && rosterMonthSelector.value) {
                const [selectedYear, selectedMonth] = rosterMonthSelector.value.split('-');
                year = parseInt(selectedYear);
                month = parseInt(selectedMonth);
            } else {
                year = new Date().getFullYear();
                month = new Date().getMonth() + 1;
            }
        }
        const records = await databaseConnector.fetchRoster(month, phone);
        const container = document.getElementById('staffRosterCalendars');
        if (!container) return;
        const rosterByDay = new Map();
        (records || []).forEach(item => {
            const dateStr = item?.date || item?.rosterDate || item?.day;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth()+1) === month) {
                const day = d.getDate();
                const time = item?.time || item?.timeRange || '';
                const location = item?.location || item?.place || '';
                const arr = rosterByDay.get(day) || [];
                arr.push({ time, location });
                rosterByDay.set(day, arr);
            }
        });
        container.id = 'rosterCalendar';
        // 主管：使用可編輯樣式
        generateEditableRosterCalendar(year, month, rosterByDay);
        container.id = 'staffRosterCalendars';
        container.setAttribute('data-coach-phone', phone);
        
        // 獲取並設置教練姓名
        try {
            const coachInfo = await databaseConnector.fetchCoaches({ phone: phone });
            if (coachInfo && coachInfo.length > 0) {
                const coachName = coachInfo[0].name || coachInfo[0].studentName || `教練_${phone}`;
                container.setAttribute('data-coach-name', coachName);
            } else {
                container.setAttribute('data-coach-name', `教練_${phone}`);
            }
        } catch (e) {
            console.warn('無法獲取教練姓名，使用默認名稱:', e);
            container.setAttribute('data-coach-name', `教練_${phone}`);
        }
    } catch (e) {
        console.warn('載入單一教練更表失敗', e);
    } finally {
        showLoading(false);
    }
}

async function generateEditableRosterCalendar(year, month, rosterByDay) {
    const container = document.getElementById('rosterCalendar');
    if (!container) return;
    // 預備地點列表
    const locations = (databaseConnector.cache && databaseConnector.cache.locations && databaseConnector.cache.locations.length)
        ? databaseConnector.cache.locations
        : await databaseConnector.fetchLocations();

    const weekdays = ['日','一','二','三','四','五','六'];
    let html = '';
    
    // 生成月份选择选项
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let monthOptions = '';
    
    // 生成過去12個月、當月、未來3個月的選項
    for (let i = -12; i <= 3; i++) {
        const date = new Date(currentYear, currentMonth - 1 + i, 1);
        const optionYear = date.getFullYear();
        const optionMonth = date.getMonth() + 1;
        const selected = (optionYear === year && optionMonth === month) ? 'selected' : '';
        monthOptions += `<option value="${optionYear}-${optionMonth.toString().padStart(2, '0')}" ${selected}>${optionYear}年${optionMonth}月</option>`;
    }
    
    html += `<div class="cal-title-container" style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px; gap: 10px;">`;
    html += `<label style="font-weight: bold; color: #333;">選擇月份：</label>`;
    html += `<select id="rosterMonthSelector" onchange="onRosterMonthChange()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">`;
    html += monthOptions;
    html += `</select>`;
    html += `</div>`;
    html += '<div class="cal grid-7">';
    weekdays.forEach(w => { html += `<div class=\"cal-head\">${w}</div>`; });

    const first = new Date(year, month - 1, 1);
    const offset = first.getDay();
    for (let i = 0; i < offset; i++) html += '<div class="cal-cell cal-empty"></div>';

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const items = rosterByDay.get(day) || [];
        const firstItem = items[0] || { time: '', location: '' };
        const timeVal = firstItem.time || '';
        const locVal = firstItem.location || '';
        html += `<div class=\"cal-cell\">`+
            `<div class=\"cal-day\">${day}</div>`+
            `<input class=\"roster-time\" data-day=\"${day}\" type=\"text\" placeholder=\"hh:mm-hh:mm\" value=\"${timeVal}\" style=\"width:100%;height:32px;padding:6px;border:1px solid #d1d5db;border-radius:6px;\"/>`+
            `<select class=\"roster-location\" data-day=\"${day}\" style=\"width:100%;height:32px;margin-top:6px;border:1px solid #d1d5db;border-radius:6px;\">`+
                `<option value=\"\">選擇地點</option>`+
                `${(locations||[]).map(loc => `<option value=\"${loc}\" ${loc===locVal?'selected':''}>${loc}</option>`).join('')}`+
            `</select>`+
        `</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

async function saveSelectedCoachRoster() {
    try {
        const container = document.getElementById('staffRosterCalendars');
        if (!container) return;
        const phone = container.getAttribute('data-coach-phone') || '';
        if (!phone) { alert('請先選擇教練再保存'); return; }
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        const nodes = (document.querySelectorAll('#staffRosterCalendars .cal-cell') || []);
        const entries = [];
        nodes.forEach(cell => {
            const timeElement = cell.querySelector('.roster-time');
            const locationElement = cell.querySelector('.roster-location');
            
            if (!timeElement || !locationElement) {
                console.log(`跳過：缺少必要的DOM元素`);
                return;
            }
            
            const day = Number(timeElement.getAttribute('data-day'));
            const time = timeElement.value || '';
            const location = locationElement.value || '';
            
            console.log(`檢查日期 ${day}: 時間="${time}", 地點="${location}"`);
            
            // 只要有日期和地點或時間，就認為是有效條目
            if (!day) {
                console.log(`跳過：無效日期 ${day}`);
                return;
            }
            if (!time && !location) {
                console.log(`跳過：日期 ${day} 既無時間也無地點`);
                return;
            }
            
            const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            entries.push({ date, time, location });
            console.log(`添加條目：${date} - 時間:${time}, 地點:${location}`);
        });
        
        // 獲取教練姓名
        const coachName = container.getAttribute('data-coach-name') || `教練_${phone}`;
        
        showLoading(true);
        
        // 使用正確的API基礎URL
        const apiBaseURL = databaseConnector?.apiConfig?.baseURL || 'https://swiming-production.up.railway.app';
        const apiURL = `${apiBaseURL}/api/coach-roster/batch`;
        
        // 檢查是否有有效的條目
        if (entries.length === 0) {
            alert('沒有找到有效的更表數據，請檢查時間和地點是否已填寫');
            return;
        }
        
        // 按照後端API期望的格式構建請求數據
        const requestData = {
            phone: phone,
            name: coachName,
            entries: entries
        };
        
        console.log('保存更表API請求:', { apiURL, requestData });
        console.log('條目數量:', entries.length);
        console.log('教練電話:', phone);
        console.log('教練姓名:', coachName);
        
        const resp = await fetch(apiURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            },
            body: JSON.stringify(requestData)
        });
        const json = await resp.json();
        console.log('API響應:', { status: resp.status, json });
        
        if (resp.ok && json?.success) {
            alert(`保存成功！共保存了 ${json.count || entries.length} 條記錄\n\n統計數據已自動更新，如需查看最新更表數據請點擊"載入更表"按鈕`);
            
            // 保存成功後只刷新統計數據，不刷新更表顯示（避免覆蓋編輯內容）
            console.log('🔄 保存成功，自動刷新統計數據...');
            try {
                // 只刷新統計數據
                await generateDailyLocationStats();
                console.log('✅ 統計數據刷新完成');
                
                // 不刷新教練更表顯示，保持用戶的編輯狀態
                console.log('ℹ️ 保持更表編輯狀態，不自動刷新顯示');
            } catch (refreshError) {
                console.warn('⚠️ 自動刷新統計數據失敗:', refreshError);
            }
        } else {
            const errorMessage = json?.message || `HTTP ${resp.status}`;
            console.error('保存更表失敗:', { status: resp.status, message: errorMessage, json });
            alert(`保存失敗：${errorMessage}`);
        }
    } catch (e) {
        console.error('保存更表失敗:', e);
        alert(`保存更表失敗：${e.message}`);
    } finally {
        showLoading(false);
    }
}

// 導出新功能到 window（供 HTML onclick 調用）
try {
    window.showStaffWorkHours = showStaffWorkHours;
    window.showStaffRoster = showStaffRoster;
    window.renderAllCoachesWorkHours = renderAllCoachesWorkHours;
    window.renderAllCoachesRoster = renderAllCoachesRoster;
} catch (_) {}

function showStaffWorkHours() {
    hideAllFeatures();
    const sec = document.getElementById('staffWorkHoursSection');
    if (sec) sec.classList.remove('hidden');
    const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
    if (userType === 'coach') {
        initCoachWorkFilters();
        refreshCoachWorkHours();
    } else {
        initSupervisorWorkFilters();
        refreshSupervisorWorkHours();
    }
    
    // 生成工时汇总表格
    generateWorkHoursSummaryTable();
}

async function initSupervisorWorkFilters() {
    try {
        const m = document.getElementById('coachWorkMonth');
        if (m) m.value = String(new Date().getMonth() + 1);
        const locSel = document.getElementById('coachWorkLocation');
        const clubSel = document.getElementById('coachWorkClub');
        const apiLocs = await databaseConnector.fetchWorkHoursLocations();
        const fallbackLocs = ['九龍公園','上門'];
        const locs = Array.from(new Set(['全部地點', ...apiLocs, ...fallbackLocs].filter(Boolean)));
        locSel.innerHTML = locs.map(l=>`<option value="${l==='全部地點'?'':l}">${l}</option>`).join('');
        const apiClubs = await databaseConnector.fetchWorkHoursClubs('');
        const fallbackClubs = ['SH','HPP'];
        const clubs = Array.from(new Set(['全部泳會', ...apiClubs, ...fallbackClubs].filter(Boolean)));
        clubSel.innerHTML = clubs.map(c=>`<option value="${c==='全部泳會'?'':c}">${c}</option>`).join('');
        locSel.onchange = async ()=>{
            const cApi = await databaseConnector.fetchWorkHoursClubs(locSel.value||'');
            const cMerged = Array.from(new Set(['全部泳會', ...cApi, ...fallbackClubs].filter(Boolean)));
            clubSel.innerHTML = cMerged.map(c=>`<option value="${c==='全部泳會'?'':c}">${c}</option>`).join('');
        };
    } catch (_) {}
}

function refreshCurrentWorkHours() {
    const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
    if (userType === 'coach') {
        refreshCoachWorkHours();
    } else {
        refreshSupervisorWorkHours();
    }
    
    // 同时刷新工时汇总表格
    generateWorkHoursSummaryTable();
}

async function refreshSupervisorWorkHours() {
    try {
        showLoading(true);
        const month = parseInt((document.getElementById('coachWorkMonth')||{}).value || (new Date().getMonth()+1), 10);
        const year = new Date().getFullYear();
        const location = (document.getElementById('coachWorkLocation')||{}).value || '';
        const club = (document.getElementById('coachWorkClub')||{}).value || '';
        // 預取教練名單，用於映射電話->姓名
        let coaches = (databaseConnector.cache && Array.isArray(databaseConnector.cache.coaches) && databaseConnector.cache.coaches.length>0)
            ? databaseConnector.cache.coaches
            : await databaseConnector.fetchCoaches();
        const phoneToName = new Map();
        (coaches||[]).forEach(c => {
            const phone = c.phone || c.studentPhone || '';
            const name = c.name || c.studentName || '';
            if (phone) phoneToName.set(String(phone), name);
        });
        // 空 phone + supervisor = 全部教練
        const data = await databaseConnector.fetchCoachWorkHours('', year, month, location, club);
        if (!Array.isArray(data)) return;
        // 以 教練phone + location + club 分組
        const groups = new Map();
        data.forEach(item => {
            const phone = String(item.phone || item.coachPhone || '');
            const name = phoneToName.get(phone) || item.studentName || item.name || '';
            const loc = (item.location || item.place || '').toString().trim();
            const clb = (item.club || item.work_club || '').toString().trim();
            const key = `${phone}||${loc}||${clb}`;
            if (!groups.has(key)) groups.set(key, { phone, name, location: loc, club: clb, list: [] });
            groups.get(key).list.push(item);
        });

        // 概要：統計每個日期、每個地點的卡片數（人數）
        const summaryByDateLoc = new Map(); // key: YYYY-MM-DD||location -> count
        const fmt = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        groups.forEach(grp => {
            (grp.list||[]).forEach(rec => {
                const d = new Date(rec?.date || rec?.workDate || rec?.day || rec?.work_date);
                if (Number.isNaN(d.getTime())) return;
                if (!(d.getFullYear()===year && (d.getMonth()+1)===month)) return;
                const dateStr = fmt(d);
                const loc = grp.location || (rec.location||rec.place||'');
                const key = `${dateStr}||${loc}`;
                summaryByDateLoc.set(key, (summaryByDateLoc.get(key)||0) + 1);
            });
        });

        // 渲染卡片
        const calendarContainer = document.getElementById('staffWorkHoursCalendars');
        if (!calendarContainer) return;
        let html = '<div class="coach-calendars">';
        groups.forEach((grp, key) => {
            const label = `${grp.name || '未命名教練'}${grp.phone ? '（'+grp.phone+'）' : ''}`;
            const locLabel = grp.location || '—';
            const clubLabel = grp.club || '—';
            html += `<div class=\"coach-calendar-card\">`+
                `<div class=\"coach-calendar-title\" style=\"display:flex;align-items:center;justify-content:space-between;\">`+
                    `<span>${label}</span>`+
                    `<span style=\"color:#6b7280;font-weight:500;font-size:12px;\">${locLabel} · ${clubLabel}</span>`+
                `</div>`+
                `<div class=\"coach-calendar-body\"><div class=\"coach-calendar\" data-coach=\"${String(key)}\"></div></div>`+
            `</div>`;
        });
        html += '</div>';
        calendarContainer.innerHTML = html;
        const todayYear = new Date().getFullYear();
        const todayMonth = month;
        // 顯示當前人數（日曆卡片數量）
        try {
            const countEl = document.getElementById('workHoursCount');
            if (countEl) countEl.textContent = `當前人數：${groups.size}`;
        } catch(_) {}
        groups.forEach((grp, key) => {
            const allNodes = calendarContainer.querySelectorAll('.coach-calendar');
            let wrap = null;
            allNodes.forEach(node => { if (node.getAttribute('data-coach') === String(key)) wrap = node; });
            const hoursByDay = new Map();
            (grp.list || []).forEach(rec => {
                const d = new Date(rec?.date || rec?.workDate || rec?.day || rec?.work_date);
                if (!Number.isNaN(d.getTime()) && d.getFullYear()===todayYear && (d.getMonth()+1)===todayMonth) {
                    const day = d.getDate();
                    const hRaw = rec?.hours ?? rec?.totalHours ?? rec?.hour ?? rec?.work_hours ?? 0;
                    const h = Number(hRaw) || 0;
                    if (h > 0) hoursByDay.set(day, (hoursByDay.get(day)||0) + h);
                }
            });
            if (wrap) generateWorkHoursCalendarIn(wrap, year, month, hoursByDay);
        });


    } catch (e) {
        console.warn('主管工時刷新失敗', e);
    } finally {
        showLoading(false);
    }
}



function initCoachWorkFilters() {
    try {
        const m = document.getElementById('coachWorkMonth');
        if (m) m.value = String(new Date().getMonth() + 1);
        const loc = document.getElementById('coachWorkLocation');
        const club = document.getElementById('coachWorkClub');
        // 填充地點/泳會
        loc.innerHTML = '<option value="">全部地點</option>' + (databaseConnector.cache.locations||[]).map(l=>`<option value="${l}">${l}</option>`).join('');
        club.innerHTML = '<option value="">全部泳會</option>' + (databaseConnector.cache.clubs||[]).map(c=>`<option value="${c}">${c}</option>`).join('');
    } catch(_) {}
}

async function refreshCoachWorkHours() {
    try {
        showLoading(true);
        const month = parseInt((document.getElementById('coachWorkMonth')||{}).value || (new Date().getMonth()+1), 10);
        const year = new Date().getFullYear();
        const location = (document.getElementById('coachWorkLocation')||{}).value || '';
        const club = (document.getElementById('coachWorkClub')||{}).value || '';
        const phone = localStorage.getItem('current_user_phone') || '';
        const list = await databaseConnector.fetchCoachWorkHours(phone, year, month, location, club);
        const container = document.getElementById('staffWorkHoursCalendars');
        if (!container) return;
        // 僅顯示「有內容」的日期
        const hoursByDay = new Map();
        (list||[]).forEach(rec => {
            const d = new Date(rec?.date || rec?.workDate || rec?.day || rec?.work_date);
            if (!Number.isNaN(d.getTime()) && d.getFullYear()===year && (d.getMonth()+1)===month) {
                const day = d.getDate();
                const h = Number(rec?.hours ?? rec?.totalHours ?? rec?.hour ?? rec?.work_hours ?? 0) || 0;
                if (h > 0) hoursByDay.set(day, (hoursByDay.get(day)||0) + h);
            }
        });
        // 生成單一教練日曆，清空月份里沒有內容的格子提示
        container.innerHTML = '';
        const wrap = document.createElement('div');
        container.appendChild(wrap);
        generateWorkHoursCalendarIn(wrap, year, month, hoursByDay);
    } catch (e) {
        console.warn('載入教練工時失敗', e);
    } finally {
        showLoading(false);
    }
}

function showStaffRoster() {
    hideAllFeatures();
    const sec = document.getElementById('staffRosterSection');
    if (sec) sec.classList.remove('hidden');
    const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
    
            // 初始化統計功能（主管和教練都可以使用）
        initializeRosterStatistics();
        
        // 綁定月份選擇器變化事件，自動刷新統計
        const statsMonthSelect = document.getElementById('statsMonth');
        if (statsMonthSelect && !statsMonthSelect._bound) {
            statsMonthSelect._bound = true;
            statsMonthSelect.addEventListener('change', () => {
                console.log('📅 月份選擇變化，自動刷新統計...');
                generateDailyLocationStats();
            });
        }
    
    if (userType === 'coach') {
        // 教練：隱藏教練選擇與保存，僅顯示自己
        const selWrap = document.getElementById('staffCoachSelect');
        if (selWrap) selWrap.parentElement.style.display = 'none';
        const container = document.getElementById('staffRosterCalendars');
        const phone = localStorage.getItem('current_user_phone') || '';
        // 只渲染只讀
        renderCoachRosterReadonly(phone);
        const saveBtn = document.querySelector('#staffRosterSection .export-btn');
        if (saveBtn) saveBtn.style.display = 'none';
        
        // 教練模式：統計功能僅顯示自己的數據
        const statsSection = document.querySelector('.roster-statistics-section');
        if (statsSection) {
            const statsTitle = statsSection.querySelector('h4');
            if (statsTitle) {
                statsTitle.innerHTML = '<i class="fas fa-chart-bar"></i> 我的上課地點統計';
            }
        }
    } else {
        // 主管：可選教練並可編輯
        const selWrap = document.getElementById('staffCoachSelect');
        if (selWrap) selWrap.parentElement.style.display = '';
        const saveBtn = document.querySelector('#staffRosterSection .export-btn');
        if (saveBtn) saveBtn.style.display = '';
        populateCoachSelect();
        // 若已選擇教練則載入該教練可編輯界面
        onChangeStaffCoach();
        
        // 主管模式：統計功能顯示所有教練數據
        const statsSection = document.querySelector('.roster-statistics-section');
        if (statsSection) {
            const statsTitle = statsSection.querySelector('h4');
            if (statsTitle) {
                statsTitle.innerHTML = '<i class="fas fa-chart-bar"></i> 每日上課地點統計';
            }
        }
    }
}

// 初始化教練更表統計功能
function initializeRosterStatistics() {
    try {
        // 設置當前月份為8月（根據PDF文件名）
        const currentMonth = new Date().getMonth() + 1;
        const statsMonthSelect = document.getElementById('statsMonth');
        if (statsMonthSelect) {
            statsMonthSelect.value = currentMonth;
        }
        
        // 清空統計顯示區域
        const statsContainer = document.getElementById('dailyLocationStats');
        if (statsContainer) {
            // 顯示當前可用的地點數據信息
            let infoText = '點擊「生成統計」按鈕開始統計';
            if (locations && locations.length > 0) {
                infoText += `<br><br><strong>當前可用地點：</strong>${locations.length}個<br>`;
                infoText += `<small style="color: #6b7280;">${locations.join('、')}</small>`;
            } else {
                infoText += '<br><br><small style="color: #9ca3af;">地點數據正在加載中...</small>';
            }
            
            statsContainer.innerHTML = `<div class="empty">${infoText}</div>`;
            statsContainer.className = 'daily-stats-container empty';
        }
        
        console.log('✅ 教練更表統計功能初始化完成');
    } catch (error) {
        console.error('初始化教練更表統計功能失敗:', error);
    }
}

async function renderCoachRosterReadonly(phone) {
    try {
        showLoading(true);
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        const records = await databaseConnector.fetchRoster(month, phone);
        const container = document.getElementById('staffRosterCalendars');
        if (!container) return;
        const rosterByDay = new Map();
        (records || []).forEach(item => {
            const dateStr = item?.date || item?.rosterDate || item?.day;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth()+1) === month) {
                const day = d.getDate();
                const time = item?.time || item?.timeRange || '';
                const location = item?.location || item?.place || '';
                const arr = rosterByDay.get(day) || [];
                arr.push({ time, location });
                rosterByDay.set(day, arr);
            }
        });
        container.id = 'rosterCalendar';
        // 使用只讀版本以支持月份選擇但內容只讀
        generateReadonlyRosterCalendar(year, month, rosterByDay);
        container.id = 'staffRosterCalendars';
    } catch (e) {
        console.warn('載入只讀更表失敗', e);
    } finally {
        showLoading(false);
    }
}

// 处理更表月份变更
window.onRosterMonthChange = function() {
    const rosterMonthSelector = document.getElementById('rosterMonthSelector');
    if (!rosterMonthSelector || !rosterMonthSelector.value) return;
    
    const [year, month] = rosterMonthSelector.value.split('-');
    const numYear = parseInt(year);
    const numMonth = parseInt(month);
    
    console.log('📅 更表月份变更:', { year: numYear, month: numMonth });
    
    // 重新加载选定月份的数据
    const userType = localStorage.getItem('current_user_type');
    const staffCoachSelect = document.getElementById('staffCoachSelect');
    const selectedCoachPhone = staffCoachSelect ? staffCoachSelect.value : '';
    
    if (userType === 'supervisor') {
        if (selectedCoachPhone) {
            // 主管模式：重新加载选定教练的更表
            renderCoachRoster(selectedCoachPhone, numYear, numMonth);
        } else {
            // 主管模式：重新加载所有教练的更表
            renderAllCoachesRoster(numYear, numMonth);
        }
    } else {
        // 教练模式：重新加载个人更表
        const phone = localStorage.getItem('current_user_phone');
        if (phone) {
            renderCoachRoster(phone, numYear, numMonth);
        }
    }
}

// 生成教练工时汇总表格
async function generateWorkHoursSummaryTable() {
    try {
        const tbody = document.getElementById('workHoursSummaryBody');
        if (!tbody) return;
        
        // 显示加载状态
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i> 載入工時數據中...
                </td>
            </tr>
        `;
        
        // 获取当前选择的月份
        const monthSelector = document.getElementById('coachWorkMonth');
        const currentMonth = monthSelector ? parseInt(monthSelector.value) : new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        // 获取所有教练的工时数据
        const workHoursData = await databaseConnector.fetchWorkHours(currentMonth, ''); // 空字符串表示获取所有教练
        
        if (!workHoursData || !Array.isArray(workHoursData)) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="loading-message">
                        <i class="fas fa-exclamation-circle"></i> 暂无工时数据
                    </td>
                </tr>
            `;
            return;
        }
        
        // 按教练分组并计算总工时
        const coachSummary = new Map();
        
        workHoursData.forEach(record => {
            const phone = record.phone || record.coachPhone || '';
            const coachName = record.name || record.studentName || record.coachName || `教练_${phone}`;
            const hours = parseFloat(record.hours || record.workHours || 0);
            
            if (!coachSummary.has(phone)) {
                coachSummary.set(phone, {
                    name: coachName,
                    totalHours: 0
                });
            }
            
            coachSummary.get(phone).totalHours += hours;
        });
        
        // 生成表格行
        let tableRows = '';
        const monthLabel = `${currentYear}年${currentMonth}月`;
        
        if (coachSummary.size === 0) {
            tableRows = `
                <tr>
                    <td colspan="3" class="loading-message">
                        <i class="fas fa-info-circle"></i> 本月暂无工时记录
                    </td>
                </tr>
            `;
        } else {
            // 按总工时降序排序
            const sortedCoaches = Array.from(coachSummary.entries()).sort((a, b) => b[1].totalHours - a[1].totalHours);
            
            sortedCoaches.forEach(([phone, data]) => {
                const formattedHours = data.totalHours > 0 ? data.totalHours.toFixed(1) : '0.0';
                tableRows += `
                    <tr>
                        <td class="month-label">${monthLabel}</td>
                        <td class="coach-name">${data.name}</td>
                        <td class="total-hours">${formattedHours}小時</td>
                    </tr>
                `;
            });
        }
        
        tbody.innerHTML = tableRows;
        
        console.log('✅ 工时汇总表格生成完成', { month: currentMonth, coachCount: coachSummary.size });
        
    } catch (error) {
        console.error('生成工时汇总表格失败:', error);
        const tbody = document.getElementById('workHoursSummaryBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="loading-message">
                        <i class="fas fa-exclamation-triangle"></i> 载入失败，请重试
                    </td>
                </tr>
            `;
        }
    }
}

// 刷新工时汇总表格
function refreshWorkHoursSummary() {
    generateWorkHoursSummaryTable();
}

// 生成只讀版本的更表日曆（支持月份選擇但內容只讀）
async function generateReadonlyRosterCalendar(year, month, rosterByDay) {
    const container = document.getElementById('rosterCalendar');
    if (!container) return;

    const weekdays = ['日','一','二','三','四','五','六'];
    let html = '';
    
    // 生成月份选择选项
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let monthOptions = '';
    
    // 生成過去12個月、當月、未來3個月的選項
    for (let i = -12; i <= 3; i++) {
        const date = new Date(currentYear, currentMonth - 1 + i, 1);
        const optionYear = date.getFullYear();
        const optionMonth = date.getMonth() + 1;
        const selected = (optionYear === year && optionMonth === month) ? 'selected' : '';
        monthOptions += `<option value="${optionYear}-${optionMonth.toString().padStart(2, '0')}" ${selected}>${optionYear}年${optionMonth}月</option>`;
    }
    
    html += `<div class="cal-title-container" style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px; gap: 10px;">`;
    html += `<label style="font-weight: bold; color: #333;">選擇月份：</label>`;
    html += `<select id="rosterMonthSelector" onchange="onCoachRosterMonthChange()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">`;
    html += monthOptions;
    html += `</select>`;
    html += `</div>`;
    
    // 生成只讀日曆內容
    html += '<div class="cal grid-7">';
    weekdays.forEach(w => { html += `<div class="cal-head">${w}</div>`; });
    
    const cal = new Date(year, month - 1, 1);
    const firstDow = cal.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i=0;i<firstDow;i++) html += '<div class="cal-cell cal-empty"></div>';
    
    const today = new Date();
    const isThisMonth = (today.getFullYear()===year && (today.getMonth()+1)===month);
    const todayDay = isThisMonth ? today.getDate() : -1;
    
    // 小工具：時間正規化並排序
    const normalizeTime = (t) => {
        const s = String(t||'').trim();
        const m = s.match(/^(\d{1,2})(:?)(\d{0,2})(?:\s*-\s*(\d{1,2})(:?)(\d{0,2}))?/);
        if (!m) return { sortKey: 9999, label: s };
        const h1 = Number(m[1]); const min1 = m[3] ? Number(m[3]) : 0;
        const h2 = m[4] ? Number(m[4]) : null; const min2 = m[6] ? Number(m[6]) : 0;
        const pad = (n)=> String(n).padStart(2,'0');
        const left = `${pad(h1)}:${pad(min1)}`;
        const right = (h2!==null) ? `${pad(h2)}:${pad(min2)}` : '';
        return { sortKey: h1*60+min1, label: right? `${left}-${right}` : left };
    };
    
    for (let d=1; d<=daysInMonth; d++) {
        const raw = rosterByDay.get(d) || [];
        // 排序並格式化
        const slots = raw
            .map(s=>({ timeObj: normalizeTime(s.time||s.timeRange||''), location: s.location||s.place||'' }))
            .sort((a,b)=> a.timeObj.sortKey - b.timeObj.sortKey)
            .map(x=>({ time: x.timeObj.label, location: x.location }));
        const topClass = d===todayDay ? 'is-today' : '';
        html += `<div class="cal-cell ${topClass} ${slots.length? 'has-hours':''}">`+
            `<div class="cal-day">${d}</div>`+
            `<div class="cal-roster">${slots.map(s => `<div class="slot"><div class="cal-roster-time">${s.time||''}</div><div class="cal-roster-loc">${s.location||''}</div></div>`).join('')}</div>`+
        `</div>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
    adjustCalendarSizing(container);
}

// 教練更表月份變更處理函數
window.onCoachRosterMonthChange = async function() {
    const selector = document.getElementById('rosterMonthSelector');
    if (!selector || !selector.value) return;
    
    const [year, month] = selector.value.split('-');
    const phone = localStorage.getItem('current_user_phone') || '';
    
    try {
        showLoading(true);
        const records = await databaseConnector.fetchRoster(parseInt(month), phone);
        const container = document.getElementById('staffRosterCalendars');
        if (!container) return;
        
        const rosterByDay = new Map();
        (records || []).forEach(item => {
            const dateStr = item?.date || item?.rosterDate || item?.day;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (!Number.isNaN(d.getTime()) && d.getFullYear() === parseInt(year) && (d.getMonth()+1) === parseInt(month)) {
                const day = d.getDate();
                const time = item?.time || item?.timeRange || '';
                const location = item?.location || item?.place || '';
                const arr = rosterByDay.get(day) || [];
                arr.push({ time, location });
                rosterByDay.set(day, arr);
            }
        });
        
        container.id = 'rosterCalendar';
        generateReadonlyRosterCalendar(parseInt(year), parseInt(month), rosterByDay);
        container.id = 'staffRosterCalendars';
    } catch (e) {
        console.warn('載入教練更表失敗', e);
    } finally {
        showLoading(false);
    }
};

// ===== 新的更表系统 =====

// 全局变量
let currentWorkType = null; // 'full-time' 或 'part-time'
let selectedDays = new Set(); // 存储选中的日期
let currentMonth = new Date().getMonth() + 1; // 当前选择的月份
let currentYear = new Date().getFullYear(); // 当前年份

// 初始化新更表系统
function initNewRosterSystem() {
    console.log('🔄 初始化新更表系统');
    
    // 获取用户工作类型
    const userType = localStorage.getItem('current_user_type');
    const userData = JSON.parse(localStorage.getItem('current_user_data') || '{}');
    currentWorkType = userData.type || null;
    
    console.log('👤 用户类型:', userType, '工作类型:', currentWorkType);
    
    // 更新工作类型指示器
    updateWorkTypeIndicator();
    
    // 生成日历
    generateNewRosterCalendar();
    
    // 绑定月份选择事件
    const monthSelect = document.getElementById('rosterMonth');
    if (monthSelect) {
        monthSelect.addEventListener('change', (e) => {
            currentMonth = parseInt(e.target.value);
            generateNewRosterCalendar();
        });
    }
}

// 更新工作类型指示器
function updateWorkTypeIndicator() {
    const indicator = document.getElementById('workTypeIndicator');
    const typeText = document.getElementById('workTypeText');
    const instructions = document.getElementById('workTypeInstructions');
    
    if (!indicator || !typeText || !instructions) return;
    
    // 清除之前的类
    indicator.classList.remove('full-time', 'part-time');
    
    if (currentWorkType === 'full-time') {
        indicator.classList.add('full-time');
        typeText.textContent = '工作類型：全職 (Full-time)';
        instructions.innerHTML = `
            <strong>全職教練操作說明：</strong><br>
            • 所有日期默認為上班日（綠色高亮）<br>
            • 點擊日期中的紅色 ✕ 按鈕標記該日不上班<br>
            • 點擊「提交更表」確認您的排班安排
        `;
    } else if (currentWorkType === 'part-time') {
        indicator.classList.add('part-time');
        typeText.textContent = '工作類型：兼職 (Part-time)';
        instructions.innerHTML = `
            <strong>兼職教練操作說明：</strong><br>
            • 點擊星期標題選擇整列日期（如：點擊「星期一」選擇所有星期一）<br>
            • 選中的日期會變成綠色，表示可以上班<br>
            • 點擊已選日期中的紅色 ✕ 按鈕取消該日<br>
            • 點擊「提交更表」確認您的排班安排
        `;
    } else {
        typeText.textContent = '工作類型：未知';
        instructions.innerHTML = '請聯繫管理員確認您的工作類型設置。';
    }
}

// 生成新的更表日历
function generateNewRosterCalendar() {
    const container = document.getElementById('newRosterCalendar');
    if (!container) return;
    
    console.log(`📅 生成 ${currentYear}年${currentMonth}月 更表日历`);
    
    // 获取月份信息
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay(); // 0=Sunday, 1=Monday, ...
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建日历头部
    const header = document.createElement('div');
    header.className = 'calendar-header';
    header.innerHTML = `<h3>${currentYear}年 ${currentMonth}月</h3>`;
    container.appendChild(header);
    
    // 创建星期标题行
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekdayContainer = document.createElement('div');
    weekdayContainer.className = 'calendar-weekdays';
    
    weekdays.forEach((day, index) => {
        const weekdayEl = document.createElement('div');
        weekdayEl.className = 'weekday-header';
        weekdayEl.textContent = day;
        weekdayEl.dataset.weekday = index;
        
        // 为兼职教练添加列选择功能
        if (currentWorkType === 'part-time') {
            weekdayEl.addEventListener('click', () => selectWeekdayColumn(index));
        }
        
        weekdayContainer.appendChild(weekdayEl);
    });
    
    container.appendChild(weekdayContainer);
    
    // 创建日历网格
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    // 计算需要显示的总天数（包括上月末尾和下月开头）
    const totalCells = Math.ceil((daysInMonth + startWeekday) / 7) * 7;
    
    for (let i = 0; i < totalCells; i++) {
        const dayNumber = i - startWeekday + 1;
        const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
        
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (isCurrentMonth) {
            dayEl.classList.add('current-month');
            dayEl.dataset.date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
            dayEl.dataset.day = dayNumber;
            dayEl.dataset.weekday = i % 7;
            
            // 创建日期显示
            const dayNumberEl = document.createElement('div');
            dayNumberEl.className = 'day-number';
            dayNumberEl.textContent = dayNumber;
            dayEl.appendChild(dayNumberEl);
            
            // 创建状态显示
            const statusEl = document.createElement('div');
            statusEl.className = 'day-status';
            dayEl.appendChild(statusEl);
            
            // 创建删除按钮
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '✕';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDayUnavailable(dayEl);
            });
            dayEl.appendChild(removeBtn);
            
            // 设置初始状态
            if (currentWorkType === 'full-time') {
                // 全职：默认所有日期都可用
                setDayAvailable(dayEl);
            } else if (currentWorkType === 'part-time') {
                // 兼职：默认所有日期都不可用
                setDayUnavailable(dayEl);
                
                // 为兼职教练添加日期点击事件
                dayEl.addEventListener('click', () => toggleDaySelection(dayEl));
            }
        } else {
            dayEl.classList.add('other-month');
            // 显示上月或下月的日期
            let displayDay;
            if (dayNumber <= 0) {
                // 上月日期
                const prevMonth = new Date(currentYear, currentMonth - 2, 0);
                displayDay = prevMonth.getDate() + dayNumber;
            } else {
                // 下月日期
                displayDay = dayNumber - daysInMonth;
            }
            dayEl.innerHTML = `<div class="day-number">${displayDay}</div>`;
        }
        
        grid.appendChild(dayEl);
    }
    
    container.appendChild(grid);
}

// 为兼职教练选择整列（星期几）
function selectWeekdayColumn(weekday) {
    if (currentWorkType !== 'part-time') return;
    
    console.log(`📅 选择星期 ${weekday} 的所有日期`);
    
    // 切换星期标题的选中状态
    const weekdayHeaders = document.querySelectorAll('.weekday-header');
    const header = weekdayHeaders[weekday];
    const isSelected = header.classList.contains('selected');
    
    if (isSelected) {
        header.classList.remove('selected');
    } else {
        header.classList.add('selected');
    }
    
    // 选择/取消选择该列的所有日期
    const days = document.querySelectorAll(`.calendar-day[data-weekday="${weekday}"]`);
    days.forEach(day => {
        if (day.classList.contains('current-month')) {
            if (isSelected) {
                setDayUnavailable(day);
            } else {
                setDayAvailable(day);
            }
        }
    });
}

// 切换单个日期的选择状态（仅兼职）
function toggleDaySelection(dayEl) {
    if (currentWorkType !== 'part-time') return;
    
    const isAvailable = dayEl.classList.contains('available');
    
    if (isAvailable) {
        setDayUnavailable(dayEl);
    } else {
        setDayAvailable(dayEl);
    }
}

// 切换日期为不可用（红色×按钮功能）
function toggleDayUnavailable(dayEl) {
    const isAvailable = dayEl.classList.contains('available');
    
    if (isAvailable) {
        setDayUnavailable(dayEl);
    } else if (currentWorkType === 'full-time') {
        // 全职可以重新设为可用
        setDayAvailable(dayEl);
    }
}

// 设置日期为可用
function setDayAvailable(dayEl) {
    dayEl.classList.remove('unavailable');
    dayEl.classList.add('available');
    
    const statusEl = dayEl.querySelector('.day-status');
    if (statusEl) {
        statusEl.textContent = '可上班';
        statusEl.className = 'day-status status-available';
    }
    
    // 添加到选中日期集合
    const date = dayEl.dataset.date;
    if (date) {
        selectedDays.add(date);
    }
}

// 设置日期为不可用
function setDayUnavailable(dayEl) {
    dayEl.classList.remove('available');
    dayEl.classList.add('unavailable');
    
    const statusEl = dayEl.querySelector('.day-status');
    if (statusEl) {
        statusEl.textContent = '不上班';
        statusEl.className = 'day-status status-unavailable';
    }
    
    // 从选中日期集合中移除
    const date = dayEl.dataset.date;
    if (date) {
        selectedDays.delete(date);
    }
}

// 保存更表数据
async function saveRosterData() {
    console.log('💾 保存更表数据');
    
    try {
        showLoading(true);
        
        // 收集当前选择的数据
        const rosterData = {
            month: currentMonth,
            year: currentYear,
            workType: currentWorkType,
            selectedDays: Array.from(selectedDays),
            savedAt: new Date().toISOString()
        };
        
        // 保存到本地存储
        const phone = localStorage.getItem('current_user_phone');
        const storageKey = `roster_${phone}_${currentYear}_${currentMonth}`;
        localStorage.setItem(storageKey, JSON.stringify(rosterData));
        
        console.log('✅ 更表数据已保存到本地存储');
        showMessage('更表已保存到本地', 'success');
        
    } catch (error) {
        console.error('❌ 保存更表失败:', error);
        showMessage('保存失败：' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 载入更表数据
async function loadRosterData() {
    console.log('📥 载入更表数据');
    
    try {
        showLoading(true);
        
        const phone = localStorage.getItem('current_user_phone');
        const storageKey = `roster_${phone}_${currentYear}_${currentMonth}`;
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
            const rosterData = JSON.parse(savedData);
            
            // 恢复选中的日期
            selectedDays.clear();
            rosterData.selectedDays.forEach(date => selectedDays.add(date));
            
            // 重新生成日历以反映加载的数据
            generateNewRosterCalendar();
            
            console.log('✅ 更表数据已从本地存储载入');
            showMessage('更表已载入', 'success');
        } else {
            console.log('ℹ️ 没有找到保存的更表数据');
            showMessage('没有找到保存的更表数据', 'info');
        }
        
    } catch (error) {
        console.error('❌ 载入更表失败:', error);
        showMessage('载入失败：' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 提交更表数据
async function submitRosterData() {
    console.log('📤 提交更表数据');
    
    try {
        showLoading(true);
        
        const phone = localStorage.getItem('current_user_phone');
        const userName = localStorage.getItem('current_user_name') || `教练_${phone}`;
        
        if (selectedDays.size === 0) {
            showMessage('请先选择可上班的日期', 'warning');
            return;
        }
        
        // 准备提交数据
        const submitData = {
            phone: phone,
            name: userName,
            month: currentMonth,
            year: currentYear,
            workType: currentWorkType,
            availableDays: Array.from(selectedDays),
            submittedAt: new Date().toISOString()
        };
        
        console.log('📋 提交数据:', submitData);
        
        // 调用后端API提交数据
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/roster/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': API_CONFIG.PUBLIC_API_KEY,
                'X-API-Private-Key': API_CONFIG.PRIVATE_API_KEY
            },
            body: JSON.stringify(submitData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 更表提交成功');
            
            // 显示成功状态
            showSubmitSuccess();
            
            // 保存提交状态
            const phone = localStorage.getItem('current_user_phone');
            const statusKey = `roster_submitted_${phone}_${currentYear}_${currentMonth}`;
            localStorage.setItem(statusKey, 'true');
            
            showMessage('更表提交成功！主管可以查看您的排班安排。', 'success');
        } else {
            throw new Error(result.message || '提交失败');
        }
        
    } catch (error) {
        console.error('❌ 提交更表失败:', error);
        showMessage('提交失败：' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 显示提交成功状态
function showSubmitSuccess() {
    const statusEl = document.getElementById('submitStatus');
    if (statusEl) {
        statusEl.classList.remove('hidden');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000);
    }
}

// 显示消息
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideDown 0.3s ease;
    `;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    // 3秒后移除
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// 修改showStaffRoster函数以使用新系统
function showStaffRoster() {
    hideAllFeatures();
    document.getElementById('staffRosterSection').classList.remove('hidden');
    
    // 初始化新更表系统
    initNewRosterSystem();
}