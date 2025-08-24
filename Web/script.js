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
                
                if (finalRole === 'coach') {
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
                } else {
                    showLoginMessage('此版本僅支持教練登入', 'error');
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
    hideAllFeatures();
    document.getElementById('workHoursSection').classList.remove('hidden');
    // 移除自动加载，等用户选择地点和泳会后再加载
}

function showRoster() {
    hideAllFeatures();
    document.getElementById('rosterSection').classList.remove('hidden');
    loadRosterData();
}

function showLocationClub() {
    hideAllFeatures();
    document.getElementById('locationClubSection').classList.remove('hidden');
    loadLocationClubData();
}

function hideAllFeatures() {
    const featureInterfaces = [
        'attendanceSection',
        'workHoursSection',
        'rosterSection',
        'locationClubSection'
    ];
    
    featureInterfaces.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
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
	
	// 與 Android 相同：需要選擇地點與泳會
	if (!selectedLocation || !selectedClub) {
		showLoading(false);
		// 清空日曆以提示
		const cal = document.getElementById('workHoursCalendar');
		if (cal) cal.innerHTML = '<div style="padding:12px;color:#888;">請先選擇地點與泳會</div>';
		return;
	}
	
	showLoading(true);
	
	try {
		let workHoursList = [];
		let statsData = null;
		
		if (typeof databaseConnector !== 'undefined' && databaseConnector && databaseConnector.connectionStatus.connected) {
			const coachPhone = localStorage.getItem('current_user_phone') || '';
			
			if (!coachPhone) {
				console.warn('⚠️ 未找到教練電話號碼，無法獲取工時數據');
				alert('請先登入教練賬號');
				return;
			}
			
			console.log('🔍 獲取教練工時數據:', { coachPhone, year, month, selectedLocation, selectedClub });
			
			// 從 Coach_work_hours 表獲取教練工時數據
			workHoursList = await databaseConnector.fetchCoachWorkHours(
				coachPhone, 
				year, 
				month, 
				selectedLocation, 
				selectedClub
			);
			
			// 獲取工時統計信息
			statsData = await databaseConnector.fetchCoachWorkHoursStats(
				coachPhone, 
				year, 
				month, 
				selectedLocation, 
				selectedClub
			);
			
			console.log('✅ 工時數據獲取成功:', workHoursList.length, '條記錄');
			console.log('✅ 統計數據獲取成功:', statsData);
		}
		
		// 若後端回傳非陣列，兼容 {workHours:[...]} 或 null
		if (!Array.isArray(workHoursList)) {
			workHoursList = (workHoursList && Array.isArray(workHoursList.workHours)) ? workHoursList.workHours : [];
		}
		
		// 兼容數據格式：[{ date: 'YYYY-MM-DD', hours: 8, location, club }, ...]
		const hoursByDay = new Map();
		let totalHours = 0;
		let daysWithHours = 0;
		
		(workHoursList || []).forEach(item => {
			const dateStr = item?.date || item?.workDate || item?.day || item?.work_date;
			const hours = Number(item?.hours ?? item?.totalHours ?? item?.hour ?? item?.work_hours ?? 0);
			const loc = item?.location || item?.place || item?.work_location || '';
			const clb = item?.club || item?.work_club || '';
			
			if (!dateStr) return;
			
			const d = new Date(dateStr);
			const t = d.getTime();
			
			if (!Number.isNaN(t) && d.getFullYear() === year && (d.getMonth() + 1) === month) {
				if (selectedLocation && loc && loc !== selectedLocation) return;
				if (selectedClub && clb && clb !== selectedClub) return;
				
				const day = d.getDate();
				hoursByDay.set(day, (hoursByDay.get(day) || 0) + hours);
				totalHours += hours;
				daysWithHours += hours > 0 ? 1 : 0;
			}
		});
		
		// 如果有統計數據，使用統計數據；否則使用計算結果
		if (statsData) {
			updateWorkHoursSummary({
				totalDays: statsData.total_days || statsData.totalDays || daysWithHours,
				totalHours: statsData.total_hours || statsData.totalHours || totalHours,
				averageHours: statsData.average_hours || statsData.averageHours || (daysWithHours ? Math.round((totalHours / daysWithHours) * 10) / 10 : 0)
			});
		} else {
			updateWorkHoursSummary({
				totalDays: daysWithHours,
				totalHours: totalHours,
				averageHours: daysWithHours ? Math.round((totalHours / daysWithHours) * 10) / 10 : 0
			});
		}
		
		// 只有在沒有數據時才使用默認示例數據
		if (hoursByDay.size === 0) {
			console.log('📋 沒有找到工時數據，顯示提示信息');
			const cal = document.getElementById('workHoursCalendar');
			if (cal) cal.innerHTML = '<div style="padding:20px;text-align:center;color:#888;"><i class="fas fa-info-circle"></i><br>本月沒有工時記錄<br><small>請檢查選擇的月份、地點和泳會</small></div>';
			return;
		}
		
		updateWorkHoursSummary({
			totalDays: daysWithHours,
			totalHours: totalHours,
			averageHours: daysWithHours ? Math.round((totalHours / daysWithHours) * 10) / 10 : 0
		});
		
		generateWorkHoursCalendar(year, month, hoursByDay);
	} catch (error) {
		console.error('加载工時数据失败:', error);
		alert('加载数据失败');
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
		html += `<div class="cal-cell ${isToday ? 'is-today' : ''} ${h>0 ? 'has-hours' : ''}">`+
			`<div class="cal-day">${d}</div>`+
			`<div class="cal-hours">${h>0 ? (h.toFixed(1)+'h') : ''}</div>`+
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
				alert(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}：${hh>0?hh.toFixed(1)+' 小時':'無記錄'}`);
			});
		}
	});
	
	// 渲染後強制調整單元格高度
	adjustCalendarSizing(calendar);
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
	
	for (let d=1; d<=daysInMonth; d++) {
		const slots = rosterByDay.get(d) || [];
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
			const coachPhone = localStorage.getItem('current_user_phone') || '';
			rosterList = await databaseConnector.fetchRoster(month, coachPhone);
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