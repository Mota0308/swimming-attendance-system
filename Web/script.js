// 全局变量
let currentUser = null;
let currentUserType = null;
let locations = [];
let clubs = [];

// API配置 - 使用代理，避免CORS问题
const API_CONFIG = {
    BASE_URL: '', // 使用空字符串，通过代理访问
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
                const apiUserType = (loginResult.user && loginResult.user.userType) ? loginResult.user.userType : null;
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
        showLoginMessage(`登入失敗：${error.message}`, 'error');
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
    } else {
        // 主管
        populateCoachSelect();
        renderAllCoachesRoster();
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
        
        row.innerHTML = `
            <div class="table-cell">${record.name}</div>
            <div class="table-cell">
                <span class="status-badge ${record.status === '出席' ? 'present' : 'absent'}">
                    ${record.status}
                </span>
            </div>
            <div class="table-cell">${record.date}</div>
            <div class="table-cell">
                <button class="edit-btn" onclick="editAttendance('${record.name}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;
        
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
					html += `<div class="coach-calendar-card">`+
						`<div class="coach-calendar-title">${label}</div>`+
						`<div class="coach-calendar-body"><div class="coach-calendar" data-coach="${String(key)}"></div></div>`+
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
		generateRosterCalendar(year, month, rosterByDay);
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
async function renderAllCoachesRoster() {
    try {
        showLoading(true);
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
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
        // 直接渲染到容器（重用 generateRosterCalendar 的 DOM 結構要求）
        // 暫時複用現有函數，將容器 id 切換為 rosterCalendar 所需結構
        container.id = 'rosterCalendar';
        generateRosterCalendar(year, month, rosterByDay);
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
    if (phone) {
        renderCoachRoster(phone);
    } else {
        renderAllCoachesRoster();
    }
}

async function renderCoachRoster(phone) {
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
        // 使用統一的只讀格式渲染
        generateRosterCalendar(year, month, rosterByDay);
        container.id = 'staffRosterCalendars';
        // 保存當前教練電話於容器屬性
        container.setAttribute('data-coach-phone', phone);
        // 隱藏保存按鈕（此視圖為統一格式展示）
        const saveBtn = document.querySelector('#staffRosterSection .export-btn');
        if (saveBtn) saveBtn.style.display = 'none';
    } catch (e) {
        console.warn('載入單一教練更表失敗', e);
    } finally {
        showLoading(false);
    }
}

function generateEditableRosterCalendar(year, month, rosterByDay) {
    // 基於現有 generateRosterCalendar，加入可編輯輸入框
    const container = document.getElementById('rosterCalendar');
    if (!container) return;
    let html = '';
    html += `<div class="cal-title">${year} 年 ${month} 月</div>`;
    html += '<div class="cal grid-7">';
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const items = rosterByDay.get(day) || [];
        const lines = items.map(it => `${it.time} ${it.location}`);
        html += `<div class="cal-cell">
            <div class="cal-day">${day}</div>
            <textarea class="cal-editor" data-day="${day}" placeholder="時間 地點\n例如: 09:00 九龍公園">${lines.join('\n')}</textarea>
        </div>`;
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
        const nodes = (document.querySelectorAll('#rosterCalendar .cal-editor') || []);
        const records = [];
        nodes.forEach(node => {
            const day = Number(node.getAttribute('data-day'));
            const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const lines = (node.value || '').split('\n').map(s => s.trim()).filter(Boolean);
            lines.forEach(line => {
                // 拆成「時間 地點」
                const firstSpace = line.indexOf(' ');
                const time = firstSpace > 0 ? line.slice(0, firstSpace) : line;
                const location = firstSpace > 0 ? line.slice(firstSpace + 1) : '';
                records.push({ phone, date, time, location });
            });
        });
        if (records.length === 0) { alert('沒有可保存的內容'); return; }
        showLoading(true);
        // 通過代理提交
        const resp = await fetch('/api/coach-roster/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            },
            body: JSON.stringify({ records })
        });
        const json = await resp.json();
        if (resp.ok && json?.success) {
            alert('保存成功');
            // 重新載入
            renderCoachRoster(phone);
        } else {
            alert('保存失敗：' + (json?.message || resp.status));
        }
    } catch (e) {
        console.warn('保存更表失敗', e);
        alert('保存更表失敗');
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
}

async function initSupervisorWorkFilters() {
    try {
        const m = document.getElementById('coachWorkMonth');
        if (m) m.value = String(new Date().getMonth() + 1);
        const locSel = document.getElementById('coachWorkLocation');
        const clubSel = document.getElementById('coachWorkClub');
        const locs = await databaseConnector.fetchWorkHoursLocations();
        locSel.innerHTML = '<option value="">全部地點</option>' + (locs||[]).map(l=>`<option value="${l}">${l}</option>`).join('');
        const clubs = await databaseConnector.fetchWorkHoursClubs('');
        clubSel.innerHTML = '<option value="">全部泳會</option>' + (clubs||[]).map(c=>`<option value="${c}">${c}</option>`).join('');
        // 聯動：選地點後重載對應泳會
        locSel.onchange = async ()=>{
            const c = await databaseConnector.fetchWorkHoursClubs(locSel.value||'');
            clubSel.innerHTML = '<option value="">全部泳會</option>' + (c||[]).map(x=>`<option value="${x}">${x}</option>`).join('');
        };
    } catch (_) {}
}

async function refreshSupervisorWorkHours() {
    try {
        showLoading(true);
        const month = parseInt((document.getElementById('coachWorkMonth')||{}).value || (new Date().getMonth()+1), 10);
        const year = new Date().getFullYear();
        const location = (document.getElementById('coachWorkLocation')||{}).value || '';
        const club = (document.getElementById('coachWorkClub')||{}).value || '';
        // 空 phone + supervisor = 全部教練
        const data = await databaseConnector.fetchCoachWorkHours('', year, month, location, club);
        // 分組並渲染
        const calendarContainer = document.getElementById('staffWorkHoursCalendars');
        if (!calendarContainer) return;
        const byCoach = new Map();
        (data||[]).forEach(item => {
            const phoneVal = item.phone || item.coachPhone || '';
            const name = item.studentName || item.name || '';
            if (!phoneVal && !name) return;
            const key = phoneVal || name;
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
        calendarContainer.innerHTML = html;
        // 逐個渲染內容，隻顯示>0h
        const todayYear = new Date().getFullYear();
        const todayMonth = month;
        byCoach.forEach((value, key) => {
            const allNodes = calendarContainer.querySelectorAll('.coach-calendar');
            let wrap = null;
            allNodes.forEach(node => { if (node.getAttribute('data-coach') === String(key)) wrap = node; });
            const hoursByDay = new Map();
            (value.list || []).forEach(rec => {
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
    if (userType === 'coach') {
        // 教練：隱藏教練選擇與保存，僅顯示自己
        const selWrap = document.getElementById('staffCoachSelect');
        if (selWrap) selWrap.parentElement.style.display = 'none';
        const container = document.getElementById('staffRosterCalendars');
        const phone = localStorage.getItem('current_user_phone') || '';
        // 只渲染只讀
        renderCoachRosterReadonly(phone);
    } else {
        // 主管
        populateCoachSelect();
        renderAllCoachesRoster();
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
        generateRosterCalendar(year, month, rosterByDay);
        container.id = 'staffRosterCalendars';
    } catch (e) {
        console.warn('載入只讀更表失敗', e);
    } finally {
        showLoading(false);
    }
}