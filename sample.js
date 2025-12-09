// 主應用程序 - 共通功能和身份檢測

// 全局變量聲明
// 注意：這些變量會被 coach-functions.js 和 supervisor-functions.js 使用
let currentUser = null;
let currentUserType = null;
let securityManager = null;
let databaseConnector = null;
let locations = [];
let clubs = [];

// 依賴注入輔助函數
function safeCallAppFunction(functionName, ...args) {
    if (window.App && window.App[functionName]) {
        return window.App[functionName](...args);
    } else {
        console.error(`❌ App.${functionName} 未定義`);
        return null;
    }
}

// 創建全局應用程序對象，提供依賴注入
window.App = {
    // 全局變量
    getCurrentUser: () => {
        // 從 localStorage 獲取完整的用戶數據
        const savedUserData = localStorage.getItem('current_user_data');
        if (savedUserData) {
            try {
                const userData = JSON.parse(savedUserData);
                return {
                    phone: currentUser,
                    name: userData.name || localStorage.getItem('current_user_name') || '',
                    type: currentUserType,
                    bankAccount: userData.bankAccount || '',
                    bankName: userData.bankName || ''
                };
            } catch (error) {
                console.error('❌ 解析用戶數據失敗:', error);
            }
        }
        
        // 備用方案：返回基本信息
        return {
            phone: currentUser,
            name: localStorage.getItem('current_user_name') || '',
            type: currentUserType,
            bankAccount: '',
            bankName: ''
        };
    },
    getCurrentUserType: () => currentUserType,
    getLocations: () => locations,
    getClubs: () => clubs,
    getSecurityManager: () => securityManager,
    getDatabaseConnector: () => databaseConnector,
    
    // 基礎函數
    hideAllSections: () => hideAllSections(),
    hideAllFeatures: () => hideAllFeatures(),
    showLoading: (show) => showLoading(show),
    getRoleDisplayName: (role) => getRoleDisplayName(role),
    loadLocationsAndClubs: () => loadLocationsAndClubs(),
    
    // 設置函數
    setCurrentUser: (user) => { currentUser = user; },
    setCurrentUserType: (type) => { currentUserType = type; },
    setLocations: (locs) => { locations = locs; },
    setClubs: (clubsList) => { clubs = clubsList; },
    
    // 統一的數據庫訪問函數
    fetchAttendance: async (month, location, club) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return null;
        }
        try {
            return await db.fetchAttendance(month, location, club);
        } catch (error) {
            console.error('❌ 獲取出席記錄失敗:', error);
            return null;
        }
    },
    
    
    // 新增工時管理相關函數
    fetchStaffWorkHours: async (phone, year, month, location, club, editorType) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.fetchStaffWorkHours(phone, year, month, location, club, editorType);
        } catch (error) {
            console.error('❌ 獲取工時記錄失敗:', error);
            return [];
        }
    },
    
    saveStaffWorkHours: async (records, submittedBy, submittedByName, submittedByType) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return null;
        }
        try {
            return await db.saveStaffWorkHours(records, submittedBy, submittedByName, submittedByType);
        } catch (error) {
            console.error('❌ 保存工時記錄失敗:', error);
            return null;
        }
    },
    
    fetchLocationClubs: async () => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.fetchLocationClubs();
        } catch (error) {
            console.error('❌ 獲取地點泳會組合失敗:', error);
            return [];
        }
    },
    
    // 比較工時記錄
    compareWorkHours: async (phone, year, month) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.compareWorkHours(phone, year, month);
        } catch (error) {
            console.error('❌ 比較工時記錄失敗:', error);
            return [];
        }
    },
    
    fetchClassTypes: async () => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.fetchClassTypes();
        } catch (error) {
            console.error('❌ 獲取課程類型失敗:', error);
            return [];
        }
    },
    
    fetchClassFormats: async (classType) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.fetchClassFormats(classType);
        } catch (error) {
            console.error('❌ 獲取課堂形式失敗:', error);
            return [];
        }
    },
    
    fetchInstructorLevels: async (classType = null, classFormat = null) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            // ✅ 不再傳遞 classType 和 classFormat 參數（後端API不再需要這些參數）
            // 直接獲取所有導師級別（從 Instructor_type 集合的 instructor_level 字段）
            return await db.fetchInstructorLevels();
        } catch (error) {
            console.error('❌ 獲取導師級別失敗:', error);
            return [];
        }
    },
    
    fetchPricing: async (classType, classFormat, instructorLevel) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return null;
        }
        try {
            return await db.fetchPricing(classType, classFormat, instructorLevel);
        } catch (error) {
            console.error('❌ 獲取價格失敗:', error);
            return null;
        }
    },
    
    createStudentBill: async (billData) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return null;
        }
        try {
            return await db.createStudentBill(billData);
        } catch (error) {
            console.error('❌ 創建學生賬單失敗:', error);
            return null;
        }
    },
    
    // 試堂創建
    createTrialBill: async (payload) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return null;
        }
        try {
            return await db.createTrialBill(payload);
        } catch (error) {
            console.error('❌ 創建試堂記錄失敗:', error);
            return null;
        }
    },
    
    fetchCoaches: async (options = {}) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.fetchCoaches(options);
        } catch (error) {
            console.error('❌ 獲取教練列表失敗:', error);
            return [];
        }
    },
    
    fetchAdmins: async () => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.fetchAdmins();
        } catch (error) {
            console.error('❌ 獲取管理員列表失敗:', error);
            return [];
        }
    },
    
    fetchRoster: async (month, phone) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return { success: false, roster: [] };
        }
        try {
            const result = await db.fetchRoster(month, phone);
            // database-connector返回的是數組，需要包裝成對象格式
            if (Array.isArray(result)) {
                return { success: true, roster: result };
            }
            return result;
        } catch (error) {
            console.error('❌ 獲取更表數據失敗:', error);
            return { success: false, roster: [] };
        }
    },
    
    fetchLocations: async () => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.fetchLocations();
        } catch (error) {
            console.error('❌ 獲取地點列表失敗:', error);
            return [];
        }
    },
    
    // ✅ 獲取 Class_location 集合中的地點列表
    fetchClassLocations: async () => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return [];
        }
        try {
            return await db.fetchClassLocations();
        } catch (error) {
            console.error('❌ 獲取 Class_location 地點列表失敗:', error);
            return [];
        }
    },
    
    // 數據庫連接狀態檢查
    checkDatabaseConnection: () => {
        const db = databaseConnector;
        if (!db) {
            return { connected: false, error: 'DatabaseConnector 未初始化' };
        }
        return db.connectionStatus || { connected: false, error: '連接狀態未知' };
    },
    
    // 重新檢查數據庫連接
    reconnectDatabase: async () => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return false;
        }
        try {
            await db.checkConnection();
            return db.connectionStatus.connected;
        } catch (error) {
            console.error('❌ 重新連接數據庫失敗:', error);
            return false;
        }
    },
    
    // 更新用戶信息
    updateUserInfo: async (phone, updateData) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return null;
        }
        try {
            return await db.updateUserInfo(phone, updateData);
        } catch (error) {
            console.error('❌ 更新用戶信息失敗:', error);
            return null;
        }
    },
    
    // 創建新員工
    createEmployee: async (employeeData) => {
        const db = databaseConnector;
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return null;
        }
        try {
            return await db.createEmployee(employeeData);
        } catch (error) {
            console.error('❌ 創建員工失敗:', error);
            return null;
        }
    },
    
    // 工時管理權限控制
    canEditWorkHours: (targetPhone, targetType, currentUserPhone, currentUserType) => {
        // 主管可以編輯所有人
        if (currentUserType === 'supervisor') return true;
        
        // ✅ 管理員（manager）可以編輯所有人（與主管權限相同）
        if (currentUserType === 'manager') return true;
        
        // ✅ 文書職員（admin）可以編輯教練，也可以編輯自己
        if (currentUserType === 'admin') {
            // 如果選擇的是自己，返回 true（可以編輯自己的記錄）
            if (targetPhone === currentUserPhone) return true;
            // 如果目標是教練，返回 true（可編輯教練的記錄）
            if (targetType === 'coach') return true;
            // 其他情況返回 false（不能編輯其他文書職員、管理員或主管）
            return false;
        }
        
        // ✅ 教練可以編輯自己的記錄
        if (currentUserType === 'coach') {
            return targetPhone === currentUserPhone;
        }
        
        return false;
    },
    
    // 獲取可編輯的員工列表
    // 注意：這個函數主要用於工時管理模塊
    getEditableEmployees: async (context = 'workHours') => {
        const currentUserType = window.App.getCurrentUserType();
        const currentUser = window.App.getCurrentUser();
        const currentUserPhone = currentUser.phone;
        
        let employees = [];
        
        if (currentUserType === 'supervisor' || currentUserType === 'manager') {
            // 主管/管理員頁面（工時管理）：自己 + 所有文書職員 + 所有教練（不包括其他主管和管理員）
            const coaches = await window.App.fetchCoaches();
            const allAdmins = await window.App.fetchAdmins();
            
            // ✅ 過濾出文書職員（type='admin'），排除主管（type='supervisor'）、管理員（type='manager'）和其他類型
            const admins = allAdmins.filter(emp => {
                const empType = emp.type || emp.userType || '';
                return empType === 'admin';
            });
            
            const currentEmployee = {
                phone: currentUser.phone,
                name: currentUser.name,
                type: currentUserType,
                bankAccount: currentUser.bankAccount || '',
                bankName: currentUser.bankName || ''
            };
            employees = [currentEmployee, ...coaches, ...admins];
        } else if (currentUserType === 'admin') {
            // 文書職員頁面（工時管理）：自己 + 所有教練（不包括其他文書職員、管理員和主管）
            const coaches = await window.App.fetchCoaches();
            const currentAdmin = {
                phone: currentUser.phone,
                name: currentUser.name,
                type: 'admin',
                bankAccount: currentUser.bankAccount || '',
                bankName: currentUser.bankName || ''
            };
            employees = [currentAdmin, ...coaches];
        } else if (currentUserType === 'coach') {
            // 教練頁面（工時管理）：只顯示自己
            employees = [currentUser];
        }
        
        return employees;
    }
};

/**
 * 註冊 Service Worker（用於緩存和離線支持）
 * 注意：Service Worker 只能在 HTTPS 或 localhost 環境下運行
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // 確保在頁面完全加載後註冊
    if (document.readyState === 'loading') {
      window.addEventListener('load', () => {
        registerSW();
      });
    } else {
      registerSW();
    }
  } else {
    console.log('ℹ️ 瀏覽器不支持 Service Worker');
  }
  
  function registerSW() {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker 註冊成功:', registration.scope);
        
        // 檢查更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 發現新的 Service Worker 版本，請刷新頁面以獲取最新功能');
            }
          });
        });
      })
      .catch((error) => {
        console.warn('⚠️ Service Worker 註冊失敗（這在非 HTTPS 環境下是正常的）:', error);
        // 註冊失敗不影響正常功能，因為可能是在 HTTP 環境下
      });
  }
}

// 自動註冊 Service Worker
registerServiceWorker();

/**
 * 检查登入状态
 */
function checkLoginStatus() {
    const savedPhone = localStorage.getItem('current_user_phone');
    const savedUserType = localStorage.getItem('current_user_type');
    
    if (savedPhone && savedUserType) {
        currentUser = savedPhone;
        currentUserType = savedUserType;
        
        // 先更新用戶信息
        updateUserInfo();
        
        // 根據用戶類型顯示對應界面
        switch(savedUserType) {
            case 'coach':
                if (typeof showCoachSection === 'function') {
        showCoachSection();
                } else {
                    console.error('❌ showCoachSection 函數未定義，請確保 coach-functions.js 已加載');
                }
                break;
            case 'supervisor':
                if (typeof showSupervisorSection === 'function') {
                    showSupervisorSection();
                } else {
                    console.error('❌ showSupervisorSection 函數未定義，請確保 supervisor-functions.js 已加載');
                }
                break;
            case 'manager':
                // ✅ manager使用主管界面（與主管權限相同）
                if (typeof showSupervisorSection === 'function') {
                    showSupervisorSection();
                } else {
                    console.error('❌ showSupervisorSection 函數未定義，請確保 supervisor-functions.js 已加載');
                }
                break;
            case 'admin':
                showAdminSection();
                break;
            case 'parent':
                showStudentSection();
                break;
            default:
                if (typeof showCoachSection === 'function') {
                    showCoachSection();
                } else {
                    console.error('❌ showCoachSection 函數未定義，請確保 coach-functions.js 已加載');
                }
                break;
        }
    }
}

/**
 * 处理登入
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const phone = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const role = document.getElementById('roleSelect').value;

    console.log('🔐 開始登入流程:', { phone, role });
    
    if (!phone || !password) {
        showLoginMessage('請輸入電話號碼和密碼', 'error');
        return;
    }
    
    // 安全检查
    if (securityManager && !securityManager.checkLoginAttempts(phone)) {
        showLoginMessage('登入嘗試過多，請15分鐘後再試', 'error');
        return;
    }
    
    // 速率限制检查
    if (securityManager && !securityManager.checkRateLimit(phone, 5, 60000)) {
        showLoginMessage('請求過於頻繁，請稍後再試', 'error');
        return;
    }
    
    if (window.App && window.App.showLoading) {
        window.App.showLoading(true);
    }
    
    try {
        const loginResult = await authenticateUser(phone, password, role);
        
        if (loginResult.success) {
            // 记录成功的登录尝试
            if (securityManager) {
            securityManager.recordLoginAttempt(phone, true);
            }
            
            // 保存用户信息
            currentUser = phone;
            currentUserType = role;
            localStorage.setItem('current_user_phone', phone);
            localStorage.setItem('current_user_type', role);
            localStorage.setItem('current_user_data', JSON.stringify(loginResult.user));
            
            // 設置用戶姓名格式為 usertype_phone（與後端保持一致）
            const userName = loginResult.user.name || `${role}_${phone}`;
            localStorage.setItem('current_user_name', userName);
            
            console.log('✅ 登入成功:', { phone, role });
            
            // 先更新用戶信息
            updateUserInfo();
            updateDatabaseConnectionStatus();
            
            // 根據用戶角色顯示對應的界面
            switch(role) {
                case 'coach':
                    if (typeof showCoachSection === 'function') {
            showCoachSection();
                    } else {
                        console.error('❌ showCoachSection 函數未定義，請確保 coach-functions.js 已加載');
                        // 嘗試重新加載腳本
                        console.log('🔄 嘗試重新加載 coach-functions.js...');
                        const script = document.createElement('script');
                        script.src = 'coach-functions.js';
                        script.onload = () => {
                            console.log('✅ coach-functions.js 重新加載成功');
                            if (typeof showCoachSection === 'function') {
                                showCoachSection();
                            }
                        };
                        script.onerror = () => {
                            console.error('❌ coach-functions.js 重新加載失敗');
                        };
                        document.head.appendChild(script);
                    }
                    break;
                case 'supervisor':
                    if (typeof showSupervisorSection === 'function') {
                    showSupervisorSection();
                    } else {
                        console.error('❌ showSupervisorSection 函數未定義，請確保 supervisor-functions.js 已加載');
                    }
                    break;
                case 'admin':
                    showAdminSection();
                    break;
                case 'manager':
                    // ✅ manager使用主管界面（與主管權限相同）
                    if (typeof showSupervisorSection === 'function') {
                        showSupervisorSection();
                    } else {
                        console.error('❌ showSupervisorSection 函數未定義，請確保 supervisor-functions.js 已加載');
                    }
                    break;
                case 'parent':
                    showStudentSection();
                    break;
                default:
                    if (typeof showCoachSection === 'function') {
                    showCoachSection();
                    } else {
                        console.error('❌ showCoachSection 函數未定義，請確保 coach-functions.js 已加載');
                    }
                    break;
            }
            
            // 如果是主管或管理員，預加載相關數據（manager與主管權限相同）
            if ((role === 'supervisor' || role === 'manager') && databaseConnector && typeof databaseConnector.preloadSupervisorData === 'function') {
                console.log(`🔄 ${role === 'supervisor' ? '主管' : '管理員'}登入，開始預加載數據...`);
                databaseConnector.preloadSupervisorData();
            }
            
            showLoginMessage('登入成功！', 'success');
            
        } else {
            // 记录失败的登录尝试
            if (securityManager) {
            securityManager.recordLoginAttempt(phone, false);
            }
            throw new Error(loginResult.message || '登入失敗');
        }
    } catch (error) {
        console.error('❌ 登入失敗:', error);
        showLoginMessage(error.message || '登入失敗，請檢查您的憑證', 'error');
    } finally {
        if (window.App && window.App.showLoading) {
            window.App.showLoading(false);
        }
    }
}

/**
 * 用户认证 - 验证登录身份与数据库type的匹配
 */
async function authenticateUser(phone, password, role) {
    try {
        console.log('🔐 開始用戶認證:', { phone, role });
        console.log('📤 發送登入請求到後端 API...');
        // 调用后端API验证staff_account集合中的账号
        const response = await fetch('https://swimming-attendance-system-production.up.railway.app/auth/login', {
            method: 'POST',
            headers: databaseConnector ? databaseConnector.getStandardHeaders() : {
                'Content-Type': 'application/json',
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            },
            body: JSON.stringify({
                phone: phone,
                password: password,
                userType: role  // 确保登录身份与数据库type完全匹配
            })
        });
        
        if (!response.ok) {
            let errorMessage = '认证失败';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                console.warn('⚠️ 無法解析錯誤響應:', parseError);
            }
            console.log('⚠️ 认证失败:', errorMessage);
            return {
                success: false,
                message: errorMessage
            };
        }
        
        const data = await response.json();
        console.log('📥 收到後端響應:', { status: response.status, statusText: response.statusText, ok: response.ok });
        console.log('✅ 登入成功 - 後端返回數據:', data);
        
        return {
            success: true,
            user: data.user || data,
            message: data.message || '认证成功'
        };
        
    } catch (error) {
        console.error('❌ 認證失敗:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * 處理用戶登出
 */
function handleLogout() {
    try {
    if (confirm('確定要登出嗎？')) {
            console.log('🔄 開始登出流程...');
            
            // 清除全局變量
        currentUser = null;
        currentUserType = null;
            locations = [];
            clubs = [];
            
            // ✅ 清除所有本地存儲（包括緩存和用戶偏好）
            const storageKeys = [
                'current_user_phone',
                'current_user_type', 
                'current_user_name',
                'current_user_data',
                'rosterDataCache',
                'adminRosterDataCache',
                'userPreferences',
                'collapsedColumns'
            ];
            
            storageKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            // ✅ 清除所有以特定前綴開頭的localStorage項目
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('roster_') || 
                    key.startsWith('admin_roster_') || 
                    key.startsWith('coach_roster_') ||
                    key.startsWith('work_hours_') ||
                    key.startsWith('user_pref_')) {
                    localStorage.removeItem(key);
                }
            });
            
            // 清除更表數據緩存
            if (typeof clearRosterDataCache === 'function') {
                clearRosterDataCache();
            }
            
            // ✅ 清除admin更表緩存
            if (typeof window.adminRosterDataCache !== 'undefined') {
                window.adminRosterDataCache = new Map();
            }
            
            // ✅ 清除所有會話存儲
            sessionStorage.clear();
            
            // 🔥 強制清理所有界面狀態
            hideAllSections();
            hideAllFeatures();
            
            // 隱藏所有功能界面
            const allInterfaces = document.querySelectorAll('.feature-interface, .interface-section, .section');
            allInterfaces.forEach(interface => {
                interface.classList.add('hidden');
                interface.classList.remove('active');
            });
            
            // 移除所有 active 類
            document.querySelectorAll('.section, .feature-interface, .interface-section, .menu-item').forEach(el => {
                el.classList.remove('active');
            });
            
            // ✅ 重置表單
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.reset();
            }
            
            // ✅ 清除登入消息
            const loginMessage = document.getElementById('loginMessage');
            if (loginMessage) {
                loginMessage.textContent = '';
                loginMessage.className = 'message';
            }
            
            // 顯示登入界面
        showLoginSection();
        
            // ✅ 清除瀏覽器緩存
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        caches.delete(name);
                    });
                });
            }
            
            // ✅ 強制重新加載頁面以確保完全重置（延遲執行，讓清理操作完成）
            setTimeout(() => {
                // 使用 location.reload() 而不是 location.href，確保完全重置
                window.location.href = window.location.origin + window.location.pathname;
            }, 100);
            
            console.log('✅ 用戶已成功登出');
        }
    } catch (error) {
        console.error('❌ 登出過程中發生錯誤:', error);
        // 即使發生錯誤，也嘗試顯示登入界面並重新加載頁面
        try {
            hideAllSections();
            hideAllFeatures();
            showLoginSection();
            // 強制重新加載頁面
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname;
            }, 100);
        } catch (showError) {
            console.error('❌ 無法顯示登入界面:', showError);
            // 最後的備選方案：直接重新加載頁面
            window.location.href = window.location.origin + window.location.pathname;
        }
    }
}

/**
 * 显示登录界面
 */
function showLoginSection() {
    hideAllSections();
    document.getElementById('loginSection').classList.add('active');
    
    // 清空登录表单
    document.getElementById('phoneInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('roleSelect').value = 'coach';
    
    // 清空消息
    showLoginMessage('', '');
}

/**
 * 显示主界面 - 調用對應的功能模組
 * 注意：showCoachSection 和 showSupervisorSection 函數定義在對應的功能模組中
 */

function showAdminSection() {
    // 使用依賴注入，調用 admin-functions.js 中的函數
    if (typeof window.showAdminSectionFromAdminFunctions === 'function') {
        window.showAdminSectionFromAdminFunctions();
    } else {
        console.error('❌ admin-functions.js 未正確加載');
        // 備用方案：直接顯示管理員界面
    hideAllSections();
    document.getElementById('adminSection').classList.add('active');
    updateAdminUserInfo();
        console.log('✅ 顯示管理員界面（備用方案）');
    }
}

function showStudentSection() {
    hideAllSections();
    document.getElementById('studentSection').classList.add('active');
    updateStudentUserInfo();
    console.log('✅ 顯示學生界面');
}

function hideAllSections() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
}

function updateAdminUserInfo() {
    // 使用依賴注入，調用 admin-functions.js 中的函數
    if (typeof window.updateAdminUserInfoFromAdminFunctions === 'function') {
        window.updateAdminUserInfoFromAdminFunctions();
    } else {
        console.error('❌ admin-functions.js 未正確加載');
        // 備用方案：直接更新用戶信息
    const userPhoneElement = document.getElementById('userPhone');
    const userTypeElement = document.getElementById('userType');
    
    if (userPhoneElement) {
        userPhoneElement.textContent = currentUser || '';
    }
    if (userTypeElement) {
        userTypeElement.textContent = getRoleDisplayName(currentUserType) || '';
        }
    }
}

function updateStudentUserInfo() {
    const userPhoneElement = document.getElementById('userPhone');
    const userTypeElement = document.getElementById('userType');
    
    if (userPhoneElement) {
        userPhoneElement.textContent = currentUser || '';
    }
    if (userTypeElement) {
        userTypeElement.textContent = getRoleDisplayName(currentUserType) || '';
    }
}

function getRoleDisplayName(role) {
    const roleNames = {
        'coach': '教練',
        'supervisor': '主管',
        'admin': '文書職員',
        'manager': '管理員',
        'parent': '學生'
    };
    return roleNames[role] || role;
}

/**
 * 更新用户信息显示
 */
function updateUserInfo() {
    const userPhoneElements = document.querySelectorAll('#userPhone, #displayUserPhone');
    const userRoleElement = document.getElementById('displayUserRole');
    const loginTimeElement = document.getElementById('loginTime');
    const userRoleDisplayElement = document.getElementById('userRoleDisplay');
    
    userPhoneElements.forEach(element => {
        if (element) element.textContent = currentUser || '';
    });
    
    if (userRoleElement) {
        const roleNames = {
            'parent': '學生',
            'coach': '教練',
            'supervisor': '主管',
            'admin': '文書職員',
            'manager': '管理員'
        };
        userRoleElement.textContent = roleNames[currentUserType] || currentUserType;
    }
    
    if (userRoleDisplayElement) {
        const roleNames = {
            'parent': '學生平台',
            'coach': '教練平台',
            'supervisor': '主管平台',
            'admin': '文書職員平台',
            'manager': '管理平台'
        };
        userRoleDisplayElement.textContent = roleNames[currentUserType] || '管理平台';
    }
    
    if (loginTimeElement) {
        loginTimeElement.textContent = new Date().toLocaleString('zh-TW');
    }
}

/**
 * 显示登录消息
 */
function showLoginMessage(message, type) {
    const messageElement = document.getElementById('loginMessage');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        
        if (message) {
            setTimeout(() => {
                messageElement.textContent = '';
                messageElement.className = 'message';
            }, 5000);
        }
    }
}

/**
 * 显示/隐藏加载指示器
 */
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

/**
 * 加载地点和泳会数据
 */
async function loadLocationsAndClubs() {
    try {
        if (!databaseConnector) {
            console.warn('⚠️ 数据库连接器不可用');
            return;
        }
        
        console.log('🔄 开始加载地点和泳会数据...');
        
        // 从缓存获取数据
        const cachedLocations = databaseConnector.getCachedData('locations');
        const cachedClubs = databaseConnector.getCachedData('clubs');
        
        if (cachedLocations && cachedLocations.length > 0) {
            locations = cachedLocations;
            console.log('📋 使用缓存的地点数据:', locations);
        }
        
        if (cachedClubs && cachedClubs.length > 0) {
            clubs = cachedClubs;
            console.log('📋 使用缓存的泳会数据:', clubs);
        }
        
        // 更新UI（異步函數）
        await populateLocationSelects();
        
        console.log('✅ 地点和泳会数据加载完成');
        
    } catch (error) {
        console.error('❌ 加载地点和泳会数据失败:', error);
        
    }
}

/**
 * 填充地点选择器
 */
async function populateLocationSelects() {
    // ✅ 出席管理模块使用 Class_location 集合（仅主管）
    const attendanceLocationSelects = [
        'supervisorAttendanceLocation'  // 主管出席管理
    ];
    
    // ✅ 其他模块使用 Location_club 集合
    const otherLocationSelects = [
        'locationSelect',
        'coachWorkLocation'
    ];
    
    // ✅ 填充出席管理模块的地点选择器（使用 Class_location）
    if (window.App && typeof window.App.fetchClassLocations === 'function') {
        try {
            const classLocations = await window.App.fetchClassLocations();
            attendanceLocationSelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    const currentValue = select.value;
                    select.innerHTML = '<option value="">全部地點</option>';
                    classLocations.forEach(location => {
                        const option = document.createElement('option');
                        option.value = location;
                        option.textContent = location;
                        select.appendChild(option);
                    });
                    if (currentValue) {
                        select.value = currentValue;
                    }
                }
            });
            console.log(`✅ 已填充出席管理地點選擇器（${attendanceLocationSelects.length}個），使用 Class_location 集合`);
        } catch (error) {
            console.error('❌ 填充出席管理地點選擇器失敗:', error);
        }
    }
    
    // ✅ 填充其他模块的地点选择器（使用 Location_club）
    otherLocationSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">請選擇地點</option>';
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                select.appendChild(option);
            });
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
    
    // 填充泳会选择器
    populateClubSelects();
}

/**
 * 填充泳会选择器
 */
function populateClubSelects() {
    const clubSelects = [
        'attendanceClub',
        'clubSelect',
        'coachWorkClub'
    ];
    
    clubSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // 保存当前选择
            const currentValue = select.value;
            
            // 清空并重新填充
            select.innerHTML = '<option value="">請選擇泳會</option>';
            
            clubs.forEach(club => {
                const option = document.createElement('option');
                option.value = club;
                option.textContent = club;
                select.appendChild(option);
            });
            
            // 恢复之前的选择
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
}

/**
 * 更新数据库连接状态显示
 */
function updateDatabaseConnectionStatus() {
    if (!databaseConnector) return;
    
    const status = databaseConnector.getConnectionStatus();
    
    const statusElement = document.getElementById('dbConnectionStatus');
    const lastSyncElement = document.getElementById('lastSyncTime');
    const cacheInfoElement = document.getElementById('cacheInfo');
    
    if (statusElement) {
        statusElement.textContent = status.connected ? '已連接' : '未連接';
        statusElement.style.color = status.connected ? '#10b981' : '#ef4444';
    }
    
    if (lastSyncElement && status.lastSync) {
        lastSyncElement.textContent = new Date(status.lastSync).toLocaleString('zh-TW');
    }
    
    if (cacheInfoElement) {
        cacheInfoElement.textContent = `${status.cacheSize} 個緩存項目`;
    }
}

/**
 * 刷新数据库连接
 */
async function refreshDatabaseConnection() {
    if (!databaseConnector) return;
    
    if (window.App && window.App.showLoading) {
        window.App.showLoading(true);
    }
    
    try {
        await databaseConnector.reconnect();
        updateDatabaseConnectionStatus();
        await loadLocationsAndClubs();
        
        // 显示成功消息
        const statusElement = document.getElementById('dbConnectionStatus');
        if (statusElement) {
            const originalText = statusElement.textContent;
            statusElement.textContent = '刷新成功';
            statusElement.style.color = '#10b981';
            
            setTimeout(() => {
                updateDatabaseConnectionStatus();
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ 刷新数据库连接失败:', error);
        
        const statusElement = document.getElementById('dbConnectionStatus');
        if (statusElement) {
            statusElement.textContent = '刷新失败';
            statusElement.style.color = '#ef4444';
            
            setTimeout(() => {
                updateDatabaseConnectionStatus();
            }, 2000);
        }
    } finally {
        if (window.App && window.App.showLoading) {
            window.App.showLoading(false);
        }
    }
}

/**
 * 隐藏所有功能界面
 * @param {string} excludeId - 要排除的界面ID（不隱藏此界面）
 */
function hideAllFeatures(excludeId = null) {
    // 隱藏教練功能界面
    const featureInterfaces = document.querySelectorAll('.feature-interface');
    featureInterfaces.forEach(interface => {
        interface.classList.add('hidden');
        interface.classList.remove('active');
    });
    
    // ✅ 隱藏主菜單（feature-grid）- 使用側邊欄時主菜單應該隱藏
    const featureGrids = document.querySelectorAll('.feature-grid');
    featureGrids.forEach(grid => {
        grid.style.display = 'none';
    });
    
    // ✅ 隱藏所有功能界面，但排除指定的界面
    const supervisorInterfaces = document.querySelectorAll('.interface-section');
    supervisorInterfaces.forEach(interface => {
        // ✅ 如果是指定的排除界面，跳過隱藏
        if (excludeId && interface.id === excludeId) {
            console.log(`⏭️  跳過隱藏界面: ${excludeId}`);
            return;
        }
        
        // ✅ 添加 hidden 類並移除 active 類
        interface.classList.add('hidden');
        interface.classList.remove('active');
        
        // ✅ 使用 setProperty 隱藏（不使用 !important，避免過於強制）
        interface.style.setProperty('display', 'none');
        interface.style.setProperty('visibility', 'hidden');
        
        // ✅ 清理可能的間隔器（如果存在）
        if (interface.id && window[`${interface.id}HideInterval`]) {
            clearInterval(window[`${interface.id}HideInterval`]);
            window[`${interface.id}HideInterval`] = null;
        }
    });
    
    // ✅ 特別處理資料管理界面（確保它被隱藏，除非被排除）
    const dataManagementSections = document.querySelectorAll('[id*="DataManagementSection"]');
    dataManagementSections.forEach(section => {
        if (excludeId && section.id === excludeId) {
            return;  // 跳過排除的界面
        }
        section.style.setProperty('display', 'none');
        section.style.setProperty('visibility', 'hidden');
        section.classList.add('hidden');
        section.classList.remove('active');
    });
    
    console.log('✅ 已隱藏所有功能界面' + (excludeId ? `（排除: ${excludeId}）` : ''));
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

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 頁面載入完成，開始初始化...');
    
    // 檢查必要的腳本是否已加載
    setTimeout(() => {
        if (typeof showCoachSection !== 'function') {
            console.error('❌ coach-functions.js 未正確加載');
        }
        if (typeof showSupervisorSection !== 'function') {
            console.error('❌ supervisor-functions.js 未正確加載');
        }
    }, 100);
    
    // 檢查 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const phone = urlParams.get('phone');
    const password = urlParams.get('password');
    const role = urlParams.get('role');
    
    if (phone && password && role) {
        console.log('🔍 發現 URL 參數:', { phone, role });
        
        // ✅ 安全措施：立即清除 URL 中的敏感信息
        // 使用 history.replaceState 清除 URL 參數，避免敏感信息留在瀏覽器歷史記錄中
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('🔒 已清除 URL 中的敏感信息');
        
        // 自動填充表單
        const phoneInput = document.getElementById('phoneInput');
        const passwordInput = document.getElementById('passwordInput');
        const roleSelect = document.getElementById('roleSelect');
        
        if (phoneInput) phoneInput.value = phone;
        if (passwordInput) passwordInput.value = password;
        if (roleSelect) roleSelect.value = role;
        
        console.log('📝 表單已自動填充');
        
        // 自動登入
        console.log('🔄 開始自動登入...');
        const loginForm = document.querySelector('form');
        if (loginForm) {
            const event = new Event('submit');
            loginForm.dispatchEvent(event);
        }
    } else {
        console.log('🔍 檢查登入狀態...');
        checkLoginStatus();
    }
    
    // 初始化安全管理器
    if (typeof SecurityManager !== 'undefined') {
        securityManager = new SecurityManager();
        console.log('🔒 安全管理器已初始化');
    }
    
    // 初始化數據庫連接器
    if (typeof DatabaseConnector !== 'undefined') {
        databaseConnector = new DatabaseConnector();
        console.log('🗄️ 數據庫連接器已初始化');
        
        // 等待 DatabaseConnector 完全初始化後再檢查連接狀態
        setTimeout(async () => {
            await databaseConnector.checkConnection();
            console.log('✅ DatabaseConnector 連接檢查完成');
        }, 100);
    } else {
        console.error('❌ DatabaseConnector 類未定義');
    }
    
    const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log('🔗 登入表單事件已綁定');
}

    // 綁定所有登出按鈕事件
    const logoutButtons = [
        'logoutBtn',           // 教練界面
        'supervisorLogoutBtn', // 主管界面
        'adminLogoutBtn',      // 管理員界面
        'studentLogoutBtn'     // 學生界面
    ];
    
    logoutButtons.forEach(buttonId => {
        const logoutBtn = document.getElementById(buttonId);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
            console.log(`🔗 ${buttonId} 登出按鈕事件已綁定`);
        } else {
            console.warn(`⚠️ 找不到登出按鈕: ${buttonId}`);
    }
    });

    // ✅ 優化：防抖機制（避免快速點擊側邊欄按鈕）
    let sidebarClickDebounceTimer = null;
    const SIDEBAR_DEBOUNCE_DELAY = 200; // 200毫秒防抖
    
    // ✅ 處理功能按鈕點擊（優化後的函數）
    function handleFeatureClick(e) {
        console.log('🖱️ 點擊事件觸發:', e.target);
        
        if (e.target.closest('[data-feature]')) {
            const feature = e.target.closest('[data-feature]').getAttribute('data-feature');
            console.log('🎯 檢測到功能按鈕:', feature);
            
            // ✅ 優化：立即顯示界面，不等待數據加載
            const sidebarItem = e.target.closest('[data-feature]');
            if (sidebarItem) {
                // 移除其他項目的活動狀態
                document.querySelectorAll('.sidebar-item').forEach(item => {
                    item.classList.remove('active');
                });
                // 添加當前項目的活動狀態
                sidebarItem.classList.add('active');
            }
            
            switch(feature) {
                // 教練功能
                case 'work-hours':
                    console.log('⏰ 執行工時管理');
                    // ✅ 優化：立即隱藏其他界面，顯示工時管理界面
                    window.App.hideAllFeatures();
                    // 根據用戶類型顯示不同的工時管理界面
                    if (currentUserType === 'coach') {
                        // 教練頁面使用 coachWorkHours 前綴
                        if (typeof showWorkHours === 'function') {
                            showWorkHours();
                        } else {
                            console.error('❌ showWorkHours 函數未定義');
                        }
                    } else if (currentUserType === 'supervisor' || currentUserType === 'manager') {
                        // 主管/管理員頁面（manager與主管權限相同）
                        if (typeof showSupervisorWorkHours === 'function') {
                            showSupervisorWorkHours();
                        } else {
                            console.error('❌ showSupervisorWorkHours 函數未定義');
                        }
                    } else if (currentUserType === 'admin') {
                        // 文書職員頁面
                        if (typeof showAdminWorkHours === 'function') {
                            showAdminWorkHours();
                        } else {
                            console.error('❌ showAdminWorkHours 函數未定義');
                        }
                    }
                    break;
                case 'roster':
                    console.log('📅 執行教練更表');
                    if (typeof showCoachRoster === 'function') {
                        showCoachRoster();
                    } else {
                        console.error('❌ 更表功能未定義，請確保相關函數已加載');
                    }
                    break;
                case 'personal-settings':
                    console.log('⚙️ 執行個人設置');
                    if (typeof showPersonalSettings === 'function') {
                        showPersonalSettings();
                    } else {
                        console.error('❌ showPersonalSettings 函數未定義');
                    }
                    break;
                
                // 主管功能
                case 'supervisor-attendance':
                    console.log('📊 執行主管出席管理');
                    showSupervisorAttendance();
                    break;
                case 'supervisor-work-hours':
                    console.log('⏰ 執行主管工時管理');
                    showSupervisorWorkHours();
                    break;
                case 'supervisor-roster':
                    console.log('📅 執行主管更表管理');
                    showStaffRoster();
                    break;
                case 'supervisor-reports':
                    console.log('📈 執行主管報表管理');
                    showSupervisorReports();
                    break;
                case 'supervisor-personal-settings':
                    console.log('⚙️ 執行主管個人設置');
                    if (typeof showSupervisorPersonalSettings === 'function') {
                        showSupervisorPersonalSettings();
                    } else {
                        console.error('❌ showSupervisorPersonalSettings 函數未定義');
                    }
                    break;
                case 'employee-create':
                    console.log('👤 執行員工創建');
                    // ✅ 根據用戶類型顯示對應的界面
                    const userType = localStorage.getItem('current_user_type') || '';
                    let employeeCreateSection;
                    let contentId;
                    let suffix = '';
                    
                    // ✅ 確保對應的section是active的，並隱藏另一個section
                    if (userType === 'admin' || userType === 'manager') {
                        const adminSection = document.getElementById('adminSection');
                        const supervisorSection = document.getElementById('supervisorSection');
                        if (adminSection) {
                            adminSection.classList.add('active');
                            adminSection.style.setProperty('display', 'block', 'important');
                        }
                        // ✅ 隱藏主管section，避免同時顯示兩個頁面
                        if (supervisorSection) {
                            supervisorSection.classList.remove('active');
                            supervisorSection.style.setProperty('display', 'none', 'important');
                        }
                        employeeCreateSection = document.getElementById('employeeCreateSectionAdmin');
                        contentId = 'employeeCreateContentAdmin';
                        suffix = 'Admin';
                    } else {
                        const supervisorSection = document.getElementById('supervisorSection');
                        const adminSection = document.getElementById('adminSection');
                        if (supervisorSection) {
                            supervisorSection.classList.add('active');
                            supervisorSection.style.setProperty('display', 'block', 'important');
                        }
                        // ✅ 隱藏管理員section，避免同時顯示兩個頁面
                        if (adminSection) {
                            adminSection.classList.remove('active');
                            adminSection.style.setProperty('display', 'none', 'important');
                        }
                        employeeCreateSection = document.getElementById('employeeCreateSection');
                        contentId = 'employeeCreateContent';
                    }
                    
                    // ✅ 先獲取界面元素，然後隱藏其他界面（排除當前要顯示的界面）
                    if (employeeCreateSection) {
                        // ✅ 先隱藏另一個用戶類型的界面（supervisor 或 admin）
                        const otherSectionId = userType === 'admin' || userType === 'manager' 
                            ? 'employeeCreateSection' 
                            : 'employeeCreateSectionAdmin';
                        const otherSection = document.getElementById(otherSectionId);
                        if (otherSection) {
                            otherSection.classList.add('hidden');
                            otherSection.classList.remove('active');
                            otherSection.style.setProperty('display', 'none', 'important');
                            otherSection.style.setProperty('visibility', 'hidden', 'important');
                            console.log(`✅ 已隱藏另一個用戶類型的界面: ${otherSectionId}`);
                        }
                        
                        // ✅ 先隱藏其他界面，但排除當前要顯示的界面
                        hideAllFeatures(employeeCreateSection.id);
                        
                        // ✅ 立即顯示當前界面（在 hideAllFeatures 之後）
                        console.log('✅ 找到員工創建界面元素:', employeeCreateSection.id);
                        employeeCreateSection.classList.remove('hidden');
                        employeeCreateSection.classList.add('active');
                        employeeCreateSection.style.setProperty('display', 'block', 'important');
                        employeeCreateSection.style.setProperty('visibility', 'visible', 'important');
                        employeeCreateSection.style.setProperty('height', 'auto', 'important');
                        employeeCreateSection.style.setProperty('min-height', '100%', 'important');
                        employeeCreateSection.style.setProperty('width', '100%', 'important');
                        
                        // ✅ 確保所有父容器都是可見的
                        let parent = employeeCreateSection.parentElement;
                        let level = 0;
                        while (parent && level < 10) {
                            const parentTag = parent.tagName?.toLowerCase();
                            const parentId = parent.id || '';
                            const parentClass = parent.className || '';
                            
                            // ✅ 檢查並修復父容器的可見性
                            const computedStyle = window.getComputedStyle(parent);
                            const isHidden = computedStyle.display === 'none' || 
                                           computedStyle.visibility === 'hidden' ||
                                           (parent.classList && parent.classList.contains('hidden'));
                            
                            if (isHidden || parentTag === 'div' || parentClass.includes('content') || parentClass.includes('layout') || parentClass.includes('wrapper')) {
                                if (parent.classList && parent.classList.contains('hidden')) {
                                    parent.classList.remove('hidden');
                                }
                                // ✅ 對於 section 元素，確保有 active 類
                                if (parentClass.includes('section') && !parent.classList.contains('active')) {
                                    parent.classList.add('active');
                                }
                                parent.style.setProperty('display', 'block', 'important');
                                parent.style.setProperty('visibility', 'visible', 'important');
                                console.log(`✅ 確保父容器可見 (level ${level}):`, { tag: parentTag, id: parentId, class: parentClass, wasHidden: isHidden });
                            }
                            
                            // ✅ 停止在 body 或 html
                            if (parentTag === 'body' || parentTag === 'html') {
                                break;
                            }
                            
                            parent = parent.parentElement;
                            level++;
                        }
                        
                        // ✅ 使用 setTimeout 確保樣式已應用
                        setTimeout(() => {
                            const computedStyle = window.getComputedStyle(employeeCreateSection);
                            const contentComputedStyle = content ? window.getComputedStyle(content) : null;
                            console.log('🔍 員工創建界面樣式檢查:', {
                                section: {
                                    display: computedStyle.display,
                                    visibility: computedStyle.visibility,
                                    height: computedStyle.height,
                                    width: computedStyle.width,
                                    hasHidden: employeeCreateSection.classList.contains('hidden'),
                                    hasActive: employeeCreateSection.classList.contains('active'),
                                    offsetParent: employeeCreateSection.offsetParent !== null
                                },
                                content: contentComputedStyle ? {
                                    display: contentComputedStyle.display,
                                    visibility: contentComputedStyle.visibility,
                                    height: contentComputedStyle.height,
                                    width: contentComputedStyle.width,
                                    padding: contentComputedStyle.padding,
                                    hasHidden: content.classList.contains('hidden')
                                } : null
                            });
                        }, 100);
                        
                        // 初始化員工創建表單
                        const content = document.getElementById(contentId);
                        
                        // ✅ 確保內容區域可見
                        if (content) {
                            content.classList.remove('hidden');
                            content.style.setProperty('display', 'block', 'important');
                            content.style.setProperty('visibility', 'visible', 'important');
                            content.style.setProperty('height', 'auto', 'important');
                            content.style.setProperty('width', '100%', 'important');
                            content.style.setProperty('min-height', '400px', 'important');
                            content.style.setProperty('opacity', '1', 'important');
                            content.style.setProperty('padding-top', '20px', 'important');
                            content.style.setProperty('padding-left', '30px', 'important');
                            content.style.setProperty('padding-right', '30px', 'important');
                            content.style.setProperty('padding-bottom', '30px', 'important');
                            content.style.setProperty('box-sizing', 'border-box', 'important');
                            console.log('✅ 內容區域已顯示:', contentId);
                            
                            // ✅ 強制觸發重排，確保樣式生效
                            void content.offsetHeight;
                            
                            // ✅ 額外檢查：確保內容區域內的表單元素可見
                            const formGroups = content.querySelectorAll('.form-group');
                            formGroups.forEach((group, index) => {
                                const groupStyle = window.getComputedStyle(group);
                                if (groupStyle.display === 'none' || groupStyle.visibility === 'hidden') {
                                    console.warn(`⚠️ 表單組 ${index} 被隱藏:`, group);
                                    group.style.setProperty('display', 'block', 'important');
                                    group.style.setProperty('visibility', 'visible', 'important');
                                }
                            });
                            
                            // ✅ 延遲載入選項，確保DOM已完全渲染
                            setTimeout(async () => {
                                console.log('🔄 開始載入員工創建選項...');
                                
                                if (typeof loadEmployeeInstructorLevelOptions === 'function') {
                                    await loadEmployeeInstructorLevelOptions(suffix);
                                } else {
                                    console.error('❌ loadEmployeeInstructorLevelOptions 函數未定義');
                                }
                                if (typeof loadEmployeeClubOptions === 'function') {
                                    await loadEmployeeClubOptions(suffix);
                                } else {
                                    console.error('❌ loadEmployeeClubOptions 函數未定義');
                                }
                            }, 300);
                        } else {
                            console.error(`❌ 找不到 ${contentId} 元素`);
                            }
                    } else {
                        console.error(`❌ 找不到員工創建界面元素 (userType: ${userType})`);
                    }
                    break;
                case 'trial-create':
                    console.log('🏊 執行試堂創建');
                    // ✅ 根據用戶類型顯示對應的界面
                    const userTypeTrial = localStorage.getItem('current_user_type') || '';
                    let trialCreateSection;
                    let trialContentId;
                    let trialSuffix = '';
                    
                    // ✅ 確保對應的section是active的，並隱藏另一個section
                    if (userTypeTrial === 'admin' || userTypeTrial === 'manager') {
                        const adminSection = document.getElementById('adminSection');
                        const supervisorSection = document.getElementById('supervisorSection');
                        if (adminSection) {
                            adminSection.classList.add('active');
                            adminSection.style.setProperty('display', 'block', 'important');
                        }
                        // ✅ 隱藏主管section，避免同時顯示兩個頁面
                        if (supervisorSection) {
                            supervisorSection.classList.remove('active');
                            supervisorSection.style.setProperty('display', 'none', 'important');
                        }
                        trialCreateSection = document.getElementById('trialCreateSectionAdmin');
                        trialContentId = 'trialCreateContentAdmin';
                        trialSuffix = 'Admin';
                    } else {
                        const supervisorSection = document.getElementById('supervisorSection');
                        const adminSection = document.getElementById('adminSection');
                        if (supervisorSection) {
                            supervisorSection.classList.add('active');
                            supervisorSection.style.setProperty('display', 'block', 'important');
                        }
                        // ✅ 隱藏管理員section，避免同時顯示兩個頁面
                        if (adminSection) {
                            adminSection.classList.remove('active');
                            adminSection.style.setProperty('display', 'none', 'important');
                        }
                        trialCreateSection = document.getElementById('trialCreateSection');
                        trialContentId = 'trialCreateContent';
                    }
                    
                    // ✅ 先獲取界面元素，然後隱藏其他界面（排除當前要顯示的界面）
                    if (trialCreateSection) {
                        // ✅ 先隱藏另一個用戶類型的界面（supervisor 或 admin）
                        const otherSectionId = userTypeTrial === 'admin' || userTypeTrial === 'manager' 
                            ? 'trialCreateSection' 
                            : 'trialCreateSectionAdmin';
                        const otherSection = document.getElementById(otherSectionId);
                        if (otherSection) {
                            otherSection.classList.add('hidden');
                            otherSection.classList.remove('active');
                            otherSection.style.setProperty('display', 'none', 'important');
                            otherSection.style.setProperty('visibility', 'hidden', 'important');
                            console.log(`✅ 已隱藏另一個用戶類型的界面: ${otherSectionId}`);
                        }
                        
                        // ✅ 先隱藏其他界面，但排除當前要顯示的界面
                        hideAllFeatures(trialCreateSection.id);
                        
                        // ✅ 立即顯示當前界面（在 hideAllFeatures 之後）
                        trialCreateSection.classList.remove('hidden');
                        trialCreateSection.classList.add('active');
                        trialCreateSection.style.setProperty('display', 'block', 'important');
                        trialCreateSection.style.setProperty('visibility', 'visible', 'important');
                        trialCreateSection.style.setProperty('height', 'auto', 'important');
                        trialCreateSection.style.setProperty('min-height', '100%', 'important');
                        trialCreateSection.style.setProperty('width', '100%', 'important');
                        
                        // ✅ 確保父容器也是可見的
                        let parent = trialCreateSection.parentElement;
                        let level = 0;
                        while (parent && level < 10) {
                            const parentTag = parent.tagName?.toLowerCase();
                            const parentId = parent.id || '';
                            const parentClass = parent.className || '';
                            
                            // ✅ 檢查並修復父容器的可見性
                            const computedStyle = window.getComputedStyle(parent);
                            const isHidden = computedStyle.display === 'none' || 
                                           computedStyle.visibility === 'hidden' ||
                                           (parent.classList && parent.classList.contains('hidden'));
                            
                            if (isHidden || parentTag === 'div' || parentClass.includes('content') || parentClass.includes('layout') || parentClass.includes('wrapper')) {
                                if (parent.classList && parent.classList.contains('hidden')) {
                                    parent.classList.remove('hidden');
                                }
                                // ✅ 對於 section 元素，確保有 active 類
                                if (parentClass.includes('section') && !parent.classList.contains('active')) {
                                    parent.classList.add('active');
                                }
                                parent.style.setProperty('display', 'block', 'important');
                                parent.style.setProperty('visibility', 'visible', 'important');
                                console.log(`✅ 確保試堂創建父容器可見 (level ${level}):`, { tag: parentTag, id: parentId, class: parentClass, wasHidden: isHidden });
                            }
                            
                            // ✅ 停止在 body 或 html
                            if (parentTag === 'body' || parentTag === 'html') {
                                break;
                            }
                            
                            parent = parent.parentElement;
                            level++;
                        }
                        
                        // 初始化試堂創建表單
                        const content = document.getElementById(trialContentId);
                        if (content) {
                            // 確保內容區域是展開的
                            content.classList.remove('hidden');
                            content.style.setProperty('display', 'block', 'important');
                            content.style.setProperty('visibility', 'visible', 'important');
                            content.style.setProperty('height', 'auto', 'important');
                            content.style.setProperty('width', '100%', 'important');
                            content.style.setProperty('min-height', '200px', 'important');
                            content.style.setProperty('opacity', '1', 'important');
                            console.log('✅ 試堂創建內容區域已顯示:', trialContentId);
                            // 增加延遲，確保DOM完全渲染
                            setTimeout(async () => {
                                const loadLocations = window.loadTrialLocations || loadTrialLocations;
                                const loadClubs = window.loadTrialClubs || loadTrialClubs;
                                const loadTimeOptions = window.loadTrialTimeOptions || loadTrialTimeOptions;
                                
                                if (typeof loadLocations === 'function') {
                                    await loadLocations(trialSuffix);
                                }
                                
                                if (typeof loadClubs === 'function') {
                                    await loadClubs(trialSuffix);
                                }
                                
                                if (typeof loadTimeOptions === 'function') {
                                    loadTimeOptions(trialSuffix);
                                }
                            }, 300);
                        } else {
                            console.error(`❌ 找不到 ${trialContentId} 容器`);
                        }
                    } else {
                        console.error(`❌ 找不到試堂創建界面元素 (userType: ${userTypeTrial})`);
                    }
                    break;
                case 'bill-create':
                    console.log('💰 執行賬單創建');
                    // ✅ 根據用戶類型顯示對應的界面
                    const userTypeBill = localStorage.getItem('current_user_type') || '';
                    let billCreateSection;
                    let billSuffix = '';
                    
                    // ✅ 確保對應的section是active的，並隱藏另一個section
                    if (userTypeBill === 'admin' || userTypeBill === 'manager') {
                        const adminSection = document.getElementById('adminSection');
                        const supervisorSection = document.getElementById('supervisorSection');
                        if (adminSection) {
                            adminSection.classList.add('active');
                            adminSection.style.setProperty('display', 'block', 'important');
                        }
                        // ✅ 隱藏主管section，避免同時顯示兩個頁面
                        if (supervisorSection) {
                            supervisorSection.classList.remove('active');
                            supervisorSection.style.setProperty('display', 'none', 'important');
                        }
                        billCreateSection = document.getElementById('billCreateSectionAdmin');
                        billSuffix = 'Admin';
                    } else {
                        const supervisorSection = document.getElementById('supervisorSection');
                        const adminSection = document.getElementById('adminSection');
                        if (supervisorSection) {
                            supervisorSection.classList.add('active');
                            supervisorSection.style.setProperty('display', 'block', 'important');
                        }
                        // ✅ 隱藏管理員section，避免同時顯示兩個頁面
                        if (adminSection) {
                            adminSection.classList.remove('active');
                            adminSection.style.setProperty('display', 'none', 'important');
                        }
                        billCreateSection = document.getElementById('billCreateSection');
                    }
                    
                    // ✅ 先獲取界面元素，然後隱藏其他界面（排除當前要顯示的界面）
                    if (billCreateSection) {
                        // ✅ 先隱藏另一個用戶類型的界面（supervisor 或 admin）
                        const otherSectionId = userTypeBill === 'admin' || userTypeBill === 'manager' 
                            ? 'billCreateSection' 
                            : 'billCreateSectionAdmin';
                        const otherSection = document.getElementById(otherSectionId);
                        if (otherSection) {
                            otherSection.classList.add('hidden');
                            otherSection.classList.remove('active');
                            otherSection.style.setProperty('display', 'none', 'important');
                            otherSection.style.setProperty('visibility', 'hidden', 'important');
                            console.log(`✅ 已隱藏另一個用戶類型的界面: ${otherSectionId}`);
                        }
                        
                        // ✅ 先隱藏其他界面，但排除當前要顯示的界面
                        hideAllFeatures(billCreateSection.id);
                        
                        // ✅ 立即顯示當前界面（在 hideAllFeatures 之後）
                        billCreateSection.classList.remove('hidden');
                        billCreateSection.classList.add('active');
                        billCreateSection.style.setProperty('display', 'block', 'important');
                        billCreateSection.style.setProperty('visibility', 'visible', 'important');
                        billCreateSection.style.setProperty('height', 'auto', 'important');
                        billCreateSection.style.setProperty('min-height', '100%', 'important');
                        billCreateSection.style.setProperty('width', '100%', 'important');
                        
                        // ✅ 確保父容器也是可見的
                        let parent = billCreateSection.parentElement;
                        let level = 0;
                        while (parent && level < 5) {
                            if (parent.classList && parent.classList.contains('hidden')) {
                                parent.classList.remove('hidden');
                            }
                            parent.style.setProperty('display', 'block', 'important');
                            parent.style.setProperty('visibility', 'visible', 'important');
                            parent = parent.parentElement;
                            level++;
                        }
                        
                        // ✅ 確保內容區域可見
                        const billContentId = billSuffix ? 'billCreateContentAdmin' : 'billCreateContent';
                        const billContent = document.getElementById(billContentId);
                        if (billContent) {
                            billContent.classList.remove('hidden');
                            billContent.style.setProperty('display', 'block', 'important');
                            billContent.style.setProperty('visibility', 'visible', 'important');
                            billContent.style.setProperty('height', 'auto', 'important');
                            billContent.style.setProperty('width', '100%', 'important');
                            billContent.style.setProperty('min-height', '200px', 'important');
                        }
                        // 初始化賬單創建表單
                        // ✅ 使用 setTimeout 確保 DOM 完全渲染後再初始化
                        setTimeout(() => {
                        if (typeof toggleBillCreate === 'function') {
                                toggleBillCreate(billSuffix);
                            } else {
                                console.error('❌ toggleBillCreate 函數未定義');
                        }
                        }, 100);
                    } else {
                        console.error(`❌ 找不到賬單創建界面元素 (userType: ${userTypeBill})`);
                    }
                    break;
                
                // 管理員功能
                case 'admin-work-hours':
                    console.log('⏰ 執行管理員工時管理');
                    if (typeof showAdminWorkHours === 'function') {
                        showAdminWorkHours();
                    } else {
                        console.error('❌ showAdminWorkHours 函數未定義');
                    }
                    break;
                case 'admin-roster':
                    console.log('📅 執行管理員更表管理');
                    if (typeof window.showAdminRoster === 'function') {
                        window.showAdminRoster();
                    } else {
                        console.error('❌ showAdminRoster 函數未定義，請確保 admin-functions.js 已加載');
                    }
                    break;
                case 'admin-personal-settings':
                    console.log('⚙️ 執行管理員個人設置');
                    if (typeof window.showAdminPersonalSettings === 'function') {
                        window.showAdminPersonalSettings();
                    } else {
                        console.error('❌ showAdminPersonalSettings 函數未定義，請確保 admin-functions.js 已加載');
                    }
                    break;
                case 'employee-create-admin':
                    console.log('👤 執行員工創建（管理員）');
                    hideAllFeatures();
                    const employeeCreateSectionAdmin = document.getElementById('employeeCreateSectionAdmin');
                    if (employeeCreateSectionAdmin) {
                        employeeCreateSectionAdmin.classList.remove('hidden');
                        employeeCreateSectionAdmin.style.setProperty('display', 'block', 'important');
                        employeeCreateSectionAdmin.style.setProperty('visibility', 'visible', 'important');
                        // 初始化員工創建表單
                        const content = document.getElementById('employeeCreateContentAdmin');
                        const icon = document.getElementById('employeeCreateIconAdmin');
                        
                        // ✅ 確保內容區域可見（即使沒有 icon 元素）
                        if (content) {
                            content.classList.remove('hidden');
                            content.style.setProperty('display', 'block', 'important');
                            content.style.setProperty('visibility', 'visible', 'important');
                            
                            if (icon) {
                                icon.classList.remove('fa-chevron-down');
                                icon.classList.add('fa-chevron-up');
                            }
                            
                            // ✅ 延遲載入選項，確保DOM已完全渲染
                            setTimeout(async () => {
                                console.log('🔄 開始載入員工創建選項（管理員）...');
                                console.log('🔍 檢查容器狀態:', {
                                    contentVisible: !content.classList.contains('hidden'),
                                    contentDisplay: window.getComputedStyle(content).display,
                                    contentVisibility: window.getComputedStyle(content).visibility,
                                    clubContainer: document.getElementById('employeeCreateClubContainerAdmin') ? '存在' : '不存在',
                                    instructorContainer: document.getElementById('employeeCreateInstructorLevelContainerAdmin') ? '存在' : '不存在'
                                });
                                
                                if (typeof loadEmployeeInstructorLevelOptions === 'function') {
                                    await loadEmployeeInstructorLevelOptions('Admin');
                                } else {
                                    console.error('❌ loadEmployeeInstructorLevelOptions 函數未定義');
                                }
                                if (typeof loadEmployeeClubOptions === 'function') {
                                    await loadEmployeeClubOptions('Admin');
                                } else {
                                    console.error('❌ loadEmployeeClubOptions 函數未定義');
                                }
                            }, 300);
                        } else {
                            console.error('❌ 找不到 employeeCreateContentAdmin 元素');
                        if (typeof toggleEmployeeCreate === 'function') {
                            toggleEmployeeCreate('Admin');
                            }
                        }
                    }
                    break;
                case 'trial-create-admin':
                    console.log('🏊 執行試堂創建（管理員）');
                    hideAllFeatures();
                    const trialCreateSectionAdmin = document.getElementById('trialCreateSectionAdmin');
                    if (trialCreateSectionAdmin) {
                        trialCreateSectionAdmin.classList.remove('hidden');
                        trialCreateSectionAdmin.style.setProperty('display', 'block', 'important');
                        trialCreateSectionAdmin.style.setProperty('visibility', 'visible', 'important');
                        // 初始化試堂創建表單
                        const content = document.getElementById('trialCreateContentAdmin');
                        // ✅ 試堂創建模塊沒有 icon，直接檢查 content
                        if (content) {
                            // 確保內容區域是展開的
                            content.classList.remove('hidden');
                            content.style.setProperty('display', 'block', 'important');
                            content.style.setProperty('visibility', 'visible', 'important');
                            content.style.setProperty('height', 'auto', 'important');
                            content.style.setProperty('width', '100%', 'important');
                            content.style.setProperty('min-height', '200px', 'important');
                            // 增加延遲，確保DOM完全渲染
                            setTimeout(async () => {
                                const loadLocations = window.loadTrialLocations || loadTrialLocations;
                                const loadClubs = window.loadTrialClubs || loadTrialClubs;
                                const loadTimeOptions = window.loadTrialTimeOptions || loadTrialTimeOptions;
                                
                                if (typeof loadLocations === 'function') {
                                    await loadLocations('Admin');
                                }
                                
                                if (typeof loadClubs === 'function') {
                                    await loadClubs('Admin');
                                }
                                
                                if (typeof loadTimeOptions === 'function') {
                                    loadTimeOptions('Admin');
                                }
                            }, 300);
                        } else {
                            console.error('❌ 找不到 trialCreateContentAdmin 容器');
                        }
                    }
                    break;
                case 'bill-create-admin':
                    console.log('💰 執行賬單創建（管理員）');
                    hideAllFeatures();
                    const billCreateSectionAdmin = document.getElementById('billCreateSectionAdmin');
                    if (billCreateSectionAdmin) {
                        billCreateSectionAdmin.classList.remove('hidden');
                        billCreateSectionAdmin.style.setProperty('display', 'block', 'important');
                        billCreateSectionAdmin.style.setProperty('visibility', 'visible', 'important');
                        // 初始化賬單創建表單
                        if (typeof toggleBillCreate === 'function') {
                            toggleBillCreate('Admin');
                        }
                    }
                    break;
                case 'data-management':
                    console.log('📊 執行資料管理');
                    // ✅ 停止持續隱藏監聽（如果存在）
                    if (window.adminDataManagementHideInterval) {
                        clearInterval(window.adminDataManagementHideInterval);
                        window.adminDataManagementHideInterval = null;
                        console.log('✅ 已停止資料管理界面持續隱藏監聽');
                    }
                    
                    // ✅ 根據當前用戶類型確定使用哪個資料管理界面
                    let dataManagementSection = null;
                    if (currentUserType === 'supervisor' || currentUserType === 'manager') {
                        // manager使用主管的資料管理界面（與主管權限相同）
                        dataManagementSection = document.getElementById('supervisorDataManagementSection');
                    } else if (currentUserType === 'admin') {
                        dataManagementSection = document.getElementById('adminDataManagementSection');
                    } else {
                        // 默認嘗試找到任何一個資料管理界面
                        dataManagementSection = document.getElementById('supervisorDataManagementSection') || 
                                                document.getElementById('adminDataManagementSection') ||
                                                document.getElementById('dataManagementSection');
                    }
                    
                    // 隱藏其他功能界面
                    if (window.App && window.App.hideAllFeatures) {
                        window.App.hideAllFeatures();
                    }
                    // ✅ 只有在點擊資料管理時才顯示資料管理界面
                    if (dataManagementSection) {
                        dataManagementSection.classList.remove('hidden');
                        dataManagementSection.style.display = '';
                        dataManagementSection.style.visibility = '';
                        console.log('✅ 顯示資料管理界面:', dataManagementSection.id);
                    }
                    // 載入數據
                    if (typeof window.showDataTab === 'function') {
                        window.showDataTab('employee');
                    } else {
                        console.error('❌ showDataTab 函數未定義，請確保有資料管理功能');
                    }
                    break;
            }
        }
    }
    
    // 綁定功能按鈕事件
    document.addEventListener('click', function(e) {
        // ✅ 優化：快速點擊防抖
        if (e.target.closest('[data-feature]')) {
            if (sidebarClickDebounceTimer) {
                clearTimeout(sidebarClickDebounceTimer);
            }
            
            sidebarClickDebounceTimer = setTimeout(() => {
                handleFeatureClick(e);
            }, SIDEBAR_DEBOUNCE_DELAY);
        }
    });
    
    console.log('✅ 初始化完成');
});

// 視窗尺寸變更時，重新調整日曆尺寸
window.addEventListener('resize', () => {
    // 🔥 優化：調整所有可能的日曆容器（包括新統一界面的容器）
    const calendars = [
        document.getElementById('workHoursCalendar'),
        document.getElementById('rosterCalendar'), // 舊容器（保留兼容性）
        document.getElementById('coachRosterDisplay'), // 新統一界面容器
        document.getElementById('supervisorRosterDisplay'),
        document.getElementById('adminRosterDisplay')
    ];
    
    calendars.forEach(calendar => {
        if (calendar) {
            adjustCalendarSizing(calendar);
        }
    });
});

// 將主要函數導出到全局作用域，以便HTML中的onclick事件可以訪問
// 注意：教練和主管相關函數已移至對應的功能模組中導出
window.hideAllFeatures = hideAllFeatures;
window.refreshDatabaseConnection = refreshDatabaseConnection;

// 注意：主管相關函數已移至 supervisor-functions.js 中定義和導出
// 這裡不再重複導出，避免衝突

// ✅ 數據緩存機制（優化加載速度）
const dataCache = new Map();
const CACHE_EXPIRY = 30 * 1000; // 30秒緩存

// ✅ 防抖機制（避免快速點擊）
let showDataTabDebounceTimer = null;
const DEBOUNCE_DELAY = 300; // 300毫秒防抖

// ✅ 獲取緩存數據
function getCachedData(key) {
  const cached = dataCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
    return cached.data;
  }
  return null;
}

// ✅ 設置緩存數據
function setCachedData(key, data) {
  dataCache.set(key, {
    data: data,
    timestamp: Date.now()
  });
}

// ✅ 清除緩存
function clearDataCache(tab = null) {
  if (tab) {
    // 清除特定標籤的緩存
    for (const key of dataCache.keys()) {
      if (key.startsWith(`${tab}_`)) {
        dataCache.delete(key);
      }
    }
  } else {
    // 清除所有緩存
    dataCache.clear();
  }
}

// ===== 資料管理功能 =====
window.showDataTab = async function(tab) {
  // ✅ 防抖處理：避免快速點擊
  if (showDataTabDebounceTimer) {
    clearTimeout(showDataTabDebounceTimer);
  }
  
  return new Promise((resolve) => {
    showDataTabDebounceTimer = setTimeout(async () => {
      await showDataTabInternal(tab);
      resolve();
    }, DEBOUNCE_DELAY);
  });
};

// ✅ 實際的顯示標籤函數（內部實現）
async function showDataTabInternal(tab) {
  // ✅ 根據當前活動的section確定使用哪個資料管理界面
  let dataManagementSection = null;
  let dataSearchZone = null;
  let dataTableZone = null;
  
  // 檢查哪個section是活動的
  const supervisorSection = document.getElementById('supervisorSection');
  const adminSection = document.getElementById('adminSection');
  
  if (supervisorSection && supervisorSection.classList.contains('active')) {
    // 主管頁面
    dataManagementSection = document.getElementById('supervisorDataManagementSection');
    dataSearchZone = document.getElementById('supervisorDataSearchZone');
    dataTableZone = document.getElementById('supervisorDataTableZone');
  } else if (adminSection && adminSection.classList.contains('active')) {
    // 管理員頁面
    dataManagementSection = document.getElementById('adminDataManagementSection');
    dataSearchZone = document.getElementById('adminDataSearchZone');
    dataTableZone = document.getElementById('adminDataTableZone');
  } else {
    // 後備方案：嘗試找到任何一個
    dataManagementSection = document.getElementById('supervisorDataManagementSection') || 
                           document.getElementById('adminDataManagementSection') ||
                           document.getElementById('dataManagementSection');
    dataSearchZone = document.getElementById('supervisorDataSearchZone') || 
                    document.getElementById('adminDataSearchZone') ||
                    document.getElementById('dataSearchZone');
    dataTableZone = document.getElementById('supervisorDataTableZone') || 
                   document.getElementById('adminDataTableZone') ||
                   document.getElementById('dataTableZone');
  }
  
  // ✅ 只有在當前用戶類型匹配時才顯示資料管理界面
  // 如果當前不是資料管理功能被觸發，且資料管理界面應該隱藏，則不要顯示
  if (dataManagementSection && dataManagementSection.id === 'adminDataManagementSection') {
    // ✅ 優先檢查：如果資料管理界面本身是隱藏的，且沒有明確請求顯示它，則不顯示
    const isCurrentlyHidden = dataManagementSection.classList.contains('hidden') || 
                              dataManagementSection.style.display === 'none' ||
                              dataManagementSection.style.visibility === 'hidden';
    
    // 檢查是否有其他界面正在顯示（非資料管理界面）
    const adminSection = document.getElementById('adminSection');
    if (adminSection && adminSection.classList.contains('active')) {
      const adminWorkHoursSection = document.getElementById('adminWorkHoursSection');
      const adminRosterInterface = document.getElementById('adminRosterInterface');
      const adminPersonalSettingsSection = document.getElementById('adminPersonalSettingsSection');
      const employeeCreateSection = document.getElementById('employeeCreateSection');
      const trialCreateSection = document.getElementById('trialCreateSection');
      const billCreateSection = document.getElementById('billCreateSection');
      const employeeCreateSectionAdmin = document.getElementById('employeeCreateSectionAdmin');
      const trialCreateSectionAdmin = document.getElementById('trialCreateSectionAdmin');
      const billCreateSectionAdmin = document.getElementById('billCreateSectionAdmin');
      
      // ✅ 檢查其他管理員界面是否正在顯示（使用計算樣式確保準確）
      const otherInterfaceVisible = 
        (adminWorkHoursSection && 
         window.getComputedStyle(adminWorkHoursSection).display !== 'none' &&
         !adminWorkHoursSection.classList.contains('hidden')) ||
        (adminRosterInterface && 
         window.getComputedStyle(adminRosterInterface).display !== 'none' &&
         !adminRosterInterface.classList.contains('hidden')) ||
        (adminPersonalSettingsSection && 
         window.getComputedStyle(adminPersonalSettingsSection).display !== 'none' &&
         !adminPersonalSettingsSection.classList.contains('hidden')) ||
        (employeeCreateSection && 
         window.getComputedStyle(employeeCreateSection).display !== 'none' &&
         !employeeCreateSection.classList.contains('hidden')) ||
        (trialCreateSection && 
         window.getComputedStyle(trialCreateSection).display !== 'none' &&
         !trialCreateSection.classList.contains('hidden')) ||
        (billCreateSection && 
         window.getComputedStyle(billCreateSection).display !== 'none' &&
         !billCreateSection.classList.contains('hidden')) ||
        (employeeCreateSectionAdmin && 
         window.getComputedStyle(employeeCreateSectionAdmin).display !== 'none' &&
         !employeeCreateSectionAdmin.classList.contains('hidden')) ||
        (trialCreateSectionAdmin && 
         window.getComputedStyle(trialCreateSectionAdmin).display !== 'none' &&
         !trialCreateSectionAdmin.classList.contains('hidden')) ||
        (billCreateSectionAdmin && 
         window.getComputedStyle(billCreateSectionAdmin).display !== 'none' &&
         !billCreateSectionAdmin.classList.contains('hidden'));
      
      // ✅ 如果其他界面正在顯示，或者資料管理界面被強制隱藏，則不顯示
      if (otherInterfaceVisible || isCurrentlyHidden) {
        // ✅ 靜默處理，不輸出警告（這是正常的後台操作）
        // 確保資料管理界面保持隱藏
        dataManagementSection.classList.add('hidden');
        dataManagementSection.style.display = 'none';
        dataManagementSection.style.visibility = 'hidden';
        return; // 直接返回，不執行後續顯示邏輯
      }
    } else if (isCurrentlyHidden) {
      // ✅ 如果不在管理員頁面，但資料管理界面被隱藏，也不顯示（靜默處理）
      return;
    }
    
    // ✅ 只有在確認可以顯示時，才清除隱藏狀態
    // ✅ 額外檢查：如果持續隱藏監聽正在運行，說明其他模塊正在顯示，不應該顯示資料管理界面
    if (window.adminDataManagementHideInterval) {
        // ✅ 靜默處理，不輸出警告（這是正常的後台操作）
        dataManagementSection.classList.add('hidden');
        dataManagementSection.style.display = 'none';
        dataManagementSection.style.visibility = 'hidden';
        return; // 直接返回，不執行後續邏輯
    }
    
    dataManagementSection.classList.remove('hidden');
    dataManagementSection.style.display = '';
    dataManagementSection.style.visibility = '';
    console.log('✅ 允許顯示資料管理界面');
  } else if (dataManagementSection) {
    // 主管頁面的資料管理界面，正常顯示
    // ✅ 也要檢查持續隱藏監聽
    if (window.adminDataManagementHideInterval && dataManagementSection.id === 'adminDataManagementSection') {
        // ✅ 靜默處理，不輸出警告（這是正常的後台操作）
        dataManagementSection.classList.add('hidden');
        dataManagementSection.style.display = 'none';
        dataManagementSection.style.visibility = 'hidden';
        return;
    }
    
    dataManagementSection.classList.remove('hidden');
    dataManagementSection.style.display = '';
    dataManagementSection.style.visibility = '';
  }
  
  // ✅ 設置全局變量，供其他函數使用
  window.currentDataManagementSection = dataManagementSection;
  window.currentDataSearchZone = dataSearchZone;
  window.currentDataTableZone = dataTableZone;
  
  if (tab === 'workhours') {
    // ✅ 工時記錄標籤：顯示搜索功能並渲染表格
    await renderWorkHoursSummaryTable();
    // ✅ 為工時記錄添加搜索功能（在表格渲染後）
    const searchZone = window.currentDataSearchZone || 
                      document.getElementById('supervisorDataSearchZone') ||
                      document.getElementById('adminDataSearchZone') ||
                      document.getElementById('dataSearchZone');
    if (searchZone) {
      // 清空搜索區域
      searchZone.innerHTML = '';
      // 工時記錄的搜索功能已經集成在表格中（按員工分組），不需要額外的搜索框
      // 但可以添加一個提示
      const hint = document.createElement('div');
      hint.textContent = '提示：點擊員工姓名可查看詳細工時記錄';
      hint.style.cssText = 'padding: 8px; color: #6b7280; font-size: 12px; font-style: italic;';
      searchZone.appendChild(hint);
    }
    return;
  }
  if (tab === 'roster') {
    // ✅ 教練更表標籤：顯示搜索功能並渲染表格
    await renderRosterSummaryTable();
    // ✅ 為教練更表添加搜索功能（在表格渲染後）
    const searchZone = window.currentDataSearchZone || 
                      document.getElementById('supervisorDataSearchZone') ||
                      document.getElementById('adminDataSearchZone') ||
                      document.getElementById('dataSearchZone');
    if (searchZone) {
      // 清空搜索區域
      searchZone.innerHTML = '';
      // 教練更表的搜索功能已經集成在表格中（按員工分組），不需要額外的搜索框
      // 但可以添加一個提示
      const hint = document.createElement('div');
      hint.textContent = '提示：點擊員工姓名可查看詳細更表記錄';
      hint.style.cssText = 'padding: 8px; color: #6b7280; font-size: 12px; font-style: italic;';
      searchZone.appendChild(hint);
    }
    return;
  }
  
  // ✅ 優化：檢查緩存，如果數據已緩存且未過期，直接使用
  const cacheKey = `${tab}_${window.currentSelectedSemester || ''}_${window.currentSelectedYear || ''}`;
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log('✅ 使用緩存數據:', tab);
    window.currentDataTab = tab;
    window.renderDataTable(tab, cachedData.data, cachedData.config, cachedData.pagination);
    return;
  }
  
  // ✅ 顯示快速加載提示（不阻塞UI）
  const tableZone = dataTableZone;
  if (tableZone) {
    const existingLoading = tableZone.querySelector('.quick-loading');
    if (!existingLoading) {
      const quickLoading = document.createElement('div');
      quickLoading.className = 'quick-loading';
      quickLoading.style.cssText = 'text-align: center; padding: 20px; color: #666; font-size: 14px;';
      quickLoading.textContent = '載入中...';
      tableZone.innerHTML = '';
      tableZone.appendChild(quickLoading);
    }
  }
  // ✅ 顯示/隱藏學生堂數操作按鈕（已移動到出席管理頁面，這裡可以隱藏）
  const studentClassesActions = document.getElementById('studentClassesActions');
  const studentClassesActionsAdmin = document.getElementById('studentClassesActionsAdmin');
  if (tab === 'student-classes') {
    // ✅ 隱藏資料管理頁面的待補創建按鈕（已移動到出席管理頁面）
    if (studentClassesActions) studentClassesActions.style.display = 'none';
    if (studentClassesActionsAdmin) studentClassesActionsAdmin.style.display = 'none';
  } else {
    if (studentClassesActions) studentClassesActions.style.display = 'none';
    if (studentClassesActionsAdmin) studentClassesActionsAdmin.style.display = 'none';
  }
  
  const allTabButtons = document.querySelectorAll('.data-tabs button');
  allTabButtons.forEach(btn => btn.classList.remove('active'));
  const scopedTabButtons = dataManagementSection
    ? dataManagementSection.querySelectorAll('.data-tabs button')
    : allTabButtons;
  scopedTabButtons.forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
    }
  });

  let data = [];
  let config = { search: [] };
  let pagination = null;
  
  // ✅ 優化：並行加載數據和配置，提高速度
  const loadStartTime = Date.now();
  
  if(tab === 'employee') {
    // ✅ 優化：使用分頁加載
    const db = window.App.getDatabaseConnector();
    if (db) {
      try {
        // ✅ 使用 AbortController 支持取消請求（如果用戶快速切換標籤）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超時
        
        const resp = await fetch(`${db.baseUrl}/admins?page=1&limit=50`, {
          headers: db.getStandardHeaders(),
          signal: controller.signal,
          cache: 'default' // 允許瀏覽器緩存
        });
        clearTimeout(timeoutId);
        
        const result = await resp.json();
        data = result.admins || [];
        pagination = result.pagination;
        // ✅ 保存分頁信息到全局變量
        if (pagination) window.currentPagination = pagination;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('⏸️ 請求已取消（用戶切換標籤）');
          return;
        }
        console.error('❌ 獲取員工數據失敗，使用舊方法:', error);
        data = await window.App.getEmployees();
      }
    } else {
      data = await window.App.getEmployees();
    }
    config.search = [
      { field: 'name', label: '姓名', type: 'input' },
      { field: 'phone', label: '電話', type: 'input' },
      { field: 'type', label: '角色', type: 'select', options: [
        { value: 'admin', label: '文書職員' },
        { value: 'manager', label: '管理員' },
        { value: 'supervisor', label: '主管' },
        { value: 'coach', label: '教練' }
      ] },
      { field: 'gender', label: '性別', type: 'select', options: [
        { value: 'M', label: '男' },
        { value: 'F', label: '女' }
      ] }
    ];
  } else if(tab === 'formal') {
    // ✅ 優化：使用分頁加載
    const db = window.App.getDatabaseConnector();
    if (db) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const resp = await fetch(`${db.baseUrl}/students?page=1&limit=50`, {
          headers: db.getStandardHeaders(),
          signal: controller.signal,
          cache: 'default'
        });
        clearTimeout(timeoutId);
        
        const result = await resp.json();
        data = result.students || [];
        pagination = result.pagination;
        // ✅ 保存分頁信息到全局變量
        if (pagination) window.currentPagination = pagination;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('⏸️ 請求已取消（用戶切換標籤）');
          return;
        }
        console.error('❌ 獲取正式會員數據失敗，使用舊方法:', error);
        data = await window.App.getFormalMembers();
      }
    } else {
      data = await window.App.getFormalMembers();
    }
    config.search = [
      { field: 'studentId', label: '學生ID', type: 'input' },
      { field: 'name', label: '姓名', type: 'input' },
      { field: 'phone', label: '電話', type: 'input' },
      { field: 'status', label: '狀態', type: 'select', optionsFn: d=>[...new Set(d.map(i=>i.status||'未知'))].sort() }
    ];
  } else if(tab === 'trial') {
    // ✅ 優化：使用分頁加載
    const db = window.App.getDatabaseConnector();
    if (db) {
      try {
        const resp = await fetch(`${db.baseUrl}/trial-bill/all?page=1&limit=50`, {
          headers: db.getStandardHeaders()
        });
        
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        
        const result = await resp.json();
        
        if (!result.success) {
          console.error('❌ API 返回錯誤:', result.message || '未知錯誤');
          data = [];
        } else {
        data = result.trials || [];
        pagination = result.pagination;
        // ✅ 保存分頁信息到全局變量
        if (pagination) window.currentPagination = pagination;
          
          console.log(`✅ 獲取非正式會員數據成功: ${data.length} 條記錄`);
          if (data.length === 0) {
            console.warn('⚠️ Trial_bill 集合為空，可能沒有試堂記錄');
          }
        }
      } catch (error) {
        console.error('❌ 獲取非正式會員數據失敗，使用舊方法:', error);
        try {
        data = await window.App.getTrialBills();
        } catch (fallbackError) {
          console.error('❌ 舊方法也失敗:', fallbackError);
          data = [];
        }
      }
    } else {
      console.error('❌ DatabaseConnector 未初始化');
      try {
      data = await window.App.getTrialBills();
      } catch (error) {
        console.error('❌ 獲取非正式會員數據失敗:', error);
        data = [];
      }
    }
    config.search = [
      { field: 'name', label: '姓名', type: 'input' },
      { field: 'phone', label: '電話', type: 'input' },
      { field: 'trialDate', label: '試堂日期', type: 'input' },
      { field: 'platform', label: '來源/平臺', type: 'select', optionsFn: d=>[...new Set(d.map(i=>i.platform||'未知'))].sort() }
    ];
  } else if(tab === 'student-classes') {
    // ✅ 獲取學生堂數數據（支持學期和年份篩選）
    const db = window.App.getDatabaseConnector();
    if (db) {
      try {
        // 獲取當前選擇的學期和年份
        const selectedSemester = window.currentSelectedSemester || null;
        const selectedYear = window.currentSelectedYear || new Date().getFullYear();
        
        console.log('📊 學生堂數篩選條件:', { 
          semester: selectedSemester, 
          year: selectedYear,
          url: `${db.baseUrl}/student-classes`
        });
        
        let url = `${db.baseUrl}/student-classes?page=1&limit=50`;
        if (selectedSemester) {
          url += `&semester=${encodeURIComponent(selectedSemester)}`;
        }
        if (selectedYear) {
          url += `&year=${selectedYear}`;
        }
        
        // ✅ 優化：只在需要時添加時間戳（避免緩存時）
        // 如果使用緩存數據，不需要時間戳
        if (!getCachedData(cacheKey)) {
        url += `&_t=${Date.now()}`;
        }
        
        console.log('📡 請求URL:', url);
        console.log('📡 請求參數:', { 
          semester: selectedSemester, 
          year: selectedYear,
          page: 1,
          limit: 50
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超時（學生堂數查詢可能較慢）
        
        const resp = await fetch(url, {
          headers: db.getStandardHeaders(),
          cache: 'default', // ✅ 允許瀏覽器緩存
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        
        const result = await resp.json();
        
        console.log('📡 API 響應:', {
          success: result.success,
          studentsCount: result.students?.length || 0,
          pagination: result.pagination
        });
        
        if (!result.success) {
          console.error('❌ API 返回錯誤:', result.message || '未知錯誤');
          data = [];
        } else {
        data = result.students || [];
        pagination = result.pagination;
        // ✅ 保存分頁信息到全局變量
        if (pagination) window.currentPagination = pagination;
          
          console.log(`✅ 獲取學生堂數數據成功: ${data.length} 條記錄`);
          if (data.length === 0) {
            console.warn('⚠️ 沒有找到符合條件的記錄');
            console.warn('⚠️ 篩選條件:', { semester: selectedSemester, year: selectedYear });
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('⏸️ 請求已取消（用戶切換標籤）');
          return;
        }
        console.error('❌ 獲取學生堂數數據失敗:', error);
        console.error('❌ 錯誤詳情:', error.message, error.stack);
        data = [];
      }
    } else {
      console.error('❌ DatabaseConnector 未初始化');
      data = [];
    }
    config.search = [
      { field: 'studentId', label: '學生ID', type: 'input' },
      { field: 'name', label: '姓名', type: 'input' }
    ];
  }
  // ✅ 如果是學生堂數標籤，初始化篩選條件（如果還沒有設置）
  if (tab === 'student-classes') {
    if (window.currentSelectedYear === undefined) {
      window.currentSelectedYear = new Date().getFullYear();
    }
    if (window.currentSelectedSemester === undefined) {
      window.currentSelectedSemester = null;
    }
  } else {
    // ✅ 切換到其他標籤時，清除學生堂數的篩選條件（可選）
    // 如果希望保留篩選條件，可以註釋掉下面兩行
    // window.currentSelectedSemester = null;
    // window.currentSelectedYear = new Date().getFullYear();
  }
  
  // ✅ 優化：記錄加載時間
  const loadEndTime = Date.now();
  const loadTime = loadEndTime - loadStartTime;
  console.log(`⏱️ 數據加載耗時: ${loadTime}ms`);
  
  // ✅ 保存到緩存
  setCachedData(cacheKey, { data, config, pagination });
  
  window.renderDataSearch(config.search, data);
  window.renderDataTable(tab, data, config, pagination);
  window.currentRawData = data; window.currentDataTab = tab; window.currentSearchConfig = config.search;
};
window.renderDataSearch = function(config, data) {
  // ✅ 使用當前設置的搜索區域，如果沒有則嘗試查找
  const zone = window.currentDataSearchZone || 
               document.getElementById('supervisorDataSearchZone') ||
               document.getElementById('adminDataSearchZone') ||
               document.getElementById('dataSearchZone');
  if(!zone) {
    console.warn('⚠️ 找不到資料搜索區域');
    return;
  }
  zone.innerHTML = '';
  if(!config||!config.length) return;
  config.forEach(sconf => {
    let ctrl,label=document.createElement('label'); label.textContent=sconf.label; label.style.fontWeight='600';
    if(sconf.type==='input') {
      ctrl=document.createElement('input');
      ctrl.className='data-search-input';
      ctrl.placeholder='搜尋'+sconf.label;
      ctrl.oninput=window.onDataSearchChanged;
    } else if(sconf.type==='select') {
      ctrl=document.createElement('select');
      ctrl.className='data-search-select';
      ctrl.onchange=window.onDataSearchChanged;
      let opts=(sconf.options||[]);
      if(sconf.optionsFn) opts=sconf.optionsFn(window.currentRawData||[]);
      // 支援字串或 {value,label}
      const renderOption = (o)=>{
        if(typeof o==='object' && o!==null) return `<option value="${o.value}">${o.label??o.value}</option>`;
        return `<option value="${o}">${o}</option>`;
      };
      ctrl.innerHTML=`<option value="">全部</option>`+opts.map(renderOption).join('');
    }
    ctrl.dataset.field=sconf.field; ctrl.dataset.type=sconf.type;
    const wrap=document.createElement('div');wrap.style.display='flex';wrap.style.flexDirection='column';wrap.appendChild(label);wrap.appendChild(ctrl);
    zone.appendChild(wrap);
  });
};
// ✅ 優化：使用防抖處理搜索輸入
window.onDataSearchChanged = window.debounce ? 
  window.debounce(function(){
    // ✅ 使用當前設置的搜索區域查找輸入框
    const searchZone = window.currentDataSearchZone || 
                      document.getElementById('supervisorDataSearchZone') ||
                      document.getElementById('adminDataSearchZone') ||
                      document.getElementById('dataSearchZone');
    if (!searchZone) return;
    
    // ✅ 收集所有搜索條件
    const searchElements = Array.from(searchZone.querySelectorAll('input,select'));
    const filters = searchElements.reduce((acc, el) => {
      acc[el.dataset.field] = { value: el.value, type: el.dataset.type || 'input' };
      return acc;
    }, {});
    
    // ✅ 過濾數據
    const filtered = window.currentRawData.filter(row => {
      return Object.keys(filters).every(field => {
        const filter = filters[field];
        const val = filter.value;
        if (!val) return true; // 空值表示不過濾
        
        const dataVal = row[field];
        if (!dataVal) return false;
        
        // ✅ 根據字段類型進行不同的匹配
        if (filter.type === 'input') {
          // 輸入框：支持部分匹配（包含搜索），不區分大小寫
          const searchFields = ['phone', 'name', 'trialDate', 'studentId', 'email', 'engName', 'employeeId', 'location', 'club', 'platform'];
          if (searchFields.includes(field)) {
            return dataVal.toString().toLowerCase().includes(val.toLowerCase());
          }
          return dataVal.toString().includes(val);
        } else {
          // 下拉框：精確匹配
          return dataVal == val;
        }
      });
    });
    
    window.renderDataTable(window.currentDataTab, filtered, { search: window.currentSearchConfig });
  }, 300) :
  function(){
    // ✅ 使用當前設置的搜索區域查找輸入框
    const searchZone = window.currentDataSearchZone || 
                      document.getElementById('supervisorDataSearchZone') ||
                      document.getElementById('adminDataSearchZone') ||
                      document.getElementById('dataSearchZone');
    if (!searchZone) return;
    
    // ✅ 收集所有搜索條件
    const searchElements = Array.from(searchZone.querySelectorAll('input,select'));
    const filters = searchElements.reduce((acc, el) => {
      acc[el.dataset.field] = { value: el.value, type: el.dataset.type || 'input' };
      return acc;
    }, {});
    
    // ✅ 過濾數據
    const filtered = window.currentRawData.filter(row => {
      return Object.keys(filters).every(field => {
        const filter = filters[field];
        const val = filter.value;
        if (!val) return true; // 空值表示不過濾
        
        const dataVal = row[field];
        if (!dataVal) return false;
        
        // ✅ 根據字段類型進行不同的匹配
        if (filter.type === 'input') {
          // 輸入框：支持部分匹配（包含搜索），不區分大小寫
          const searchFields = ['phone', 'name', 'trialDate', 'studentId', 'email', 'engName', 'employeeId', 'location', 'club', 'platform'];
          if (searchFields.includes(field)) {
            return dataVal.toString().toLowerCase().includes(val.toLowerCase());
          }
          return dataVal.toString().includes(val);
        } else {
          // 下拉框：精確匹配
          return dataVal == val;
        }
      });
    });
    
    window.renderDataTable(window.currentDataTab, filtered, { search: window.currentSearchConfig });
  };
// ✅ 優化：支持虛擬滾動和分頁（與 index.js 保持一致）
window.renderDataTable = function(tab, data, config, pagination = null) {
  // ✅ 使用當前設置的表格區域，如果沒有則嘗試查找
  const zone = window.currentDataTableZone ||
               document.getElementById('supervisorDataTableZone') ||
               document.getElementById('adminDataTableZone') ||
               document.getElementById('dataTableZone');
  if (!zone) {
    console.warn('⚠️ 找不到資料表格區域');
    return;
  }
  
  // ✅ 如果是學生堂數標籤，先渲染學期和年份篩選器
  let filterContainer = null;
  if (tab === 'student-classes') {
    // 先保存篩選器（如果存在）
    filterContainer = zone.querySelector('.student-classes-filters');
    const savedFilter = filterContainer ? filterContainer.outerHTML : '';
    
    // 清空容器
  zone.innerHTML = '';
    
    // 恢復篩選器（如果存在）
    if (savedFilter) {
      zone.innerHTML = savedFilter;
      filterContainer = zone.querySelector('.student-classes-filters');
    } else {
      // 創建新的篩選器容器
      filterContainer = document.createElement('div');
      filterContainer.className = 'student-classes-filters';
      filterContainer.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; margin-bottom: 16px; flex-wrap: wrap;';
      zone.appendChild(filterContainer);
    }
    
    // 渲染篩選器
    renderStudentClassesFilters(filterContainer);
  } else {
    // 非學生堂數標籤，直接清空
    zone.innerHTML = '';
  }
  
  // 創建表格容器
  const tableContainer = document.createElement('div');
  tableContainer.className = 'data-table-container';
  
  if (!data || !data.length) {
    const noDataDiv = document.createElement('div');
    noDataDiv.className = 'data-no-data';
    noDataDiv.textContent = '暫無資料';
    tableContainer.appendChild(noDataDiv);
    zone.appendChild(tableContainer);
    return;
  }
  
  // ✅ 過濾字段：排除敏感信息和內部ID
  let keys = Object.keys(data[0]).filter(k => !['password', '_id'].includes(k));
  
        // ✅ 優化：為正式會員（formal）設置字段順序，studentId 優先顯示
        if (tab === 'formal') {
          const priorityFields = ['studentId', 'name', 'phone', 'email', 'birthday', 'age', 'gender', 'club'];
          const otherFields = keys.filter(k => !priorityFields.includes(k));
          keys = [...priorityFields.filter(k => keys.includes(k)), ...otherFields];
        }

        // ✅ 優化：為學生堂數（student-classes）設置字段順序
        if (tab === 'student-classes') {
          const priorityFields = ['studentId', 'name', 'purchasedClasses', 'lastPeriodRemaining', 'currentPeriodRemaining', 'scheduledClasses', 'attendedBooked', 'absences', 'currentPeriodLeaveRequests', 'pendingClasses', 'bookableMakeup', 'bookedMakeup', 'attendedMakeup', 'currentPeriodRemainingTimeSlots', 'bookableMakeupTimeSlots'];
          const otherFields = keys.filter(k => !priorityFields.includes(k));
          keys = [...priorityFields.filter(k => keys.includes(k)), ...otherFields];
        }
        
        // ✅ 優化：為非正式會員（trial）設置字段順序
        if (tab === 'trial') {
          const priorityFields = ['trailId', 'name', 'phone', 'trialDate', 'trialTime', 'location', 'gender', 'club', 'attendanceStatus', 'platform', 'level', 'howKnow', 'notes'];
          const otherFields = keys.filter(k => !priorityFields.includes(k));
          keys = [...priorityFields.filter(k => keys.includes(k)), ...otherFields];
        }

        // ✅ 字段中文標籤映射
        const fieldLabels = {
          studentId: '學生ID',
          name: '姓名',
          phone: '電話',
          email: '郵箱',
          birthday: '生日',
          age: '年齡',
          gender: '性別',
          club: '泳會',
          status: '狀態',
          createdAt: '創建時間',
          updatedAt: '更新時間',
          currentPeriodRemaining: '本期剩餘堂數',
          purchasedClasses: '本期已購堂數',
          currentPurchasedClasses: '本期已購堂數',
          lastPeriodRemaining: '上期剩餘堂數',
          scheduledClasses: '已定日子課堂',
          attendedBooked: '已出席',
          absences: '缺席',
          currentPeriodLeaveRequests: '本期請假堂數',
          bookableMakeup: '可約補堂',
          pendingClasses: '待約',
          bookedMakeup: '已約補堂',
          attendedMakeup: '補堂已出席',
          currentPeriodRemainingTimeSlots: '本期剩餘時數',
          bookableMakeupTimeSlots: '可補時數',
          trailId: '試堂ID',
          trialDate: '試堂日期',
          trialTime: '試堂時間',
          location: '地點',
          attendanceStatus: '出席狀態',
          platform: '來源/平臺',
          level: '程度',
          howKnow: '如何得知',
          notes: '備註'
        };
  
  // ✅ 暫時禁用虛擬滾動，確保操作按鈕可見（虛擬滾動不支持操作列）
  // 如果數據量大於 100 行，使用虛擬滾動
  if (false && data.length > 100 && window.VirtualScroll) {
    if (window.currentVirtualScroll) {
      window.currentVirtualScroll.destroy();
      window.currentVirtualScroll = null;
    }
    
    zone.style.height = '600px';
    zone.style.overflow = 'hidden';
    
    window.currentVirtualScroll = new window.VirtualScroll(zone, {
      rowHeight: 40,
      visibleRows: 15,
      buffer: 5
    });
    
    const dataWithKeys = data.map(row => {
      const obj = {};
      keys.forEach(k => obj[k] = row[k]);
      return obj;
    });
    window.currentVirtualScroll.setData(dataWithKeys, keys);
    
    if (pagination) {
      renderPagination(zone, pagination, tab);
    }
  } else {
    zone.style.height = 'auto';
    zone.style.overflow = 'auto';
    // ✅ 使用中文標籤顯示表頭
    let ths = keys.map(k => {
      const label = fieldLabels[k] || k;
      return `<th>${label}</th>`;
    }).join('');
    // 添加操作列標題
    if (tab === 'student-classes') {
      ths += '<th style="min-width: 80px;">操作</th>';
    } else {
      ths += '<th style="min-width: 120px;">操作</th>';
    }
    
    // 為每行添加編輯和刪除按鈕，並保存原始數據的_id
    let trs = data.map((row, rowIndex) => {
      const rowId = row._id || `row-${rowIndex}`;
      const cells = keys.map(k => {
        const value = row[k] === undefined ? '' : row[k];
        // ✅ 如果是學生堂數標籤的已定日子課堂列，使其可點擊
        if (tab === 'student-classes' && k === 'scheduledClasses' && value) {
          const studentId = row.studentId || '';
          return `<td data-field="${k}" data-original="${escapeHtml(String(value))}" data-student-id="${escapeHtml(studentId)}" class="clickable-scheduled-classes" style="cursor: pointer; color: #007bff; text-decoration: underline;" title="點擊查看上課日期">${escapeHtml(String(value))}</td>`;
        }
        // ✅ 如果是學生堂數標籤的已約補堂列，使其可點擊
        if (tab === 'student-classes' && k === 'bookedMakeup' && value) {
          const studentId = row.studentId || '';
          return `<td data-field="${k}" data-original="${escapeHtml(String(value))}" data-student-id="${escapeHtml(studentId)}" class="clickable-booked-makeup" style="cursor: pointer; color: #007bff; text-decoration: underline;" title="點擊查看補堂日期">${escapeHtml(String(value))}</td>`;
        }
        // ✅ 如果是學生堂數標籤的剩餘時數列，使其可點擊
        if (tab === 'student-classes' && k === 'currentPeriodRemainingTimeSlots' && value) {
          const studentId = row.studentId || '';
          return `<td data-field="${k}" data-original="${escapeHtml(String(value))}" data-student-id="${escapeHtml(studentId)}" class="clickable-remaining-time-slots" style="cursor: pointer; color: #007bff; text-decoration: underline;" title="點擊查看剩餘時數詳情">${escapeHtml(String(value))}</td>`;
        }
        // ✅ 如果是學生堂數標籤的本期請假堂數列，使其可點擊
        if (tab === 'student-classes' && k === 'currentPeriodLeaveRequests' && value) {
          const studentId = row.studentId || '';
          return `<td data-field="${k}" data-original="${escapeHtml(String(value))}" data-student-id="${escapeHtml(studentId)}" class="clickable-leave-requests" style="cursor: pointer; color: #007bff; text-decoration: underline;" title="點擊查看請假日期">${escapeHtml(String(value))}</td>`;
        }
        // ✅ 如果是非正式會員標籤的出席狀態列，顯示中文狀態
        if (tab === 'trial' && k === 'attendanceStatus') {
          const attendanceStatus = getAttendanceStatusText(row.isAttended, row.isLeave);
          return `<td data-field="${k}" data-original="${escapeHtml(attendanceStatus)}">${escapeHtml(attendanceStatus)}</td>`;
        }
        // ✅ 如果是性別列，格式化為"男/女"
        if (k === 'gender') {
          let genderText = '';
          if (value === 'M' || value === 'm' || value === '男' || value === 'Male') {
            genderText = '男';
          } else if (value === 'F' || value === 'f' || value === '女' || value === 'Female') {
            genderText = '女';
          } else if (value) {
            genderText = String(value);
          }
          return `<td data-field="${k}" data-original="${escapeHtml(String(value))}">${escapeHtml(genderText)}</td>`;
        }
        // ✅ 如果是泳會列，處理數組格式
        if (k === 'club') {
          let clubText = '';
          if (Array.isArray(value)) {
            clubText = value.filter(c => c).join(', ');
          } else if (value) {
            clubText = String(value);
          }
          return `<td data-field="${k}" data-original="${escapeHtml(String(value))}">${escapeHtml(clubText)}</td>`;
        }
        return `<td data-field="${k}" data-original="${escapeHtml(String(value))}">${escapeHtml(String(value))}</td>`;
      }).join('');
      // ✅ 學生堂數標籤頁顯示"清除"按鈕（清除該學生的所有時段記錄）
      let actionButtons = '';
      if (tab === 'student-classes') {
        // 學生堂數標籤頁顯示清除按鈕
        actionButtons = `
          <td style="text-align: center;">
            <button class="btn-clear-student" data-row-id="${rowId}" data-student-id="${row.studentId || ''}" style="padding: 4px 8px; font-size: 12px; background: #ffc107; color: white; border: none; border-radius: 3px; cursor: pointer;">
              <i class="fas fa-eraser"></i> 清除
            </button>
          </td>
        `;
      } else {
        actionButtons = `
          <td style="text-align: center;">
            <button class="btn-edit-row" data-row-id="${rowId}" data-row-index="${rowIndex}" style="margin-right: 5px; padding: 4px 8px; font-size: 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
              <i class="fas fa-edit"></i> 修改
            </button>
            <button class="btn-delete-row" data-row-id="${rowId}" data-row-index="${rowIndex}" style="padding: 4px 8px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
              <i class="fas fa-trash"></i> 刪除
            </button>
          </td>
        `;
      }
      return `<tr data-row-id="${rowId}" data-row-data='${JSON.stringify(row)}'>${cells}${actionButtons}</tr>`;
    }).join('');
    
    const table = document.createElement('table');
    table.className = 'data-data-table';
    table.innerHTML = `<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody>`;
    tableContainer.appendChild(table);
    zone.appendChild(tableContainer);
    
    // 綁定編輯和刪除按鈕事件
    if (tab !== 'student-classes') {
      tableContainer.querySelectorAll('.btn-edit-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const rowId = btn.dataset.rowId;
          const row = btn.closest('tr');
          window.editDataRow(tab, rowId, row);
        });
      });
      
      tableContainer.querySelectorAll('.btn-delete-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const rowId = btn.dataset.rowId;
          const rowIndex = parseInt(btn.dataset.rowIndex);
          window.deleteDataRow(tab, rowId, rowIndex);
        });
      });
    } else {
      // ✅ 綁定學生堂數標籤頁的清除按鈕事件
      tableContainer.querySelectorAll('.btn-clear-student').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const studentId = btn.dataset.studentId;
          if (!studentId) {
            alert('缺少學生ID');
            return;
          }
          
          if (!confirm(`確定要清除學生 ${studentId} 的所有時段記錄嗎？此操作無法復原。`)) {
            return;
          }
          
          try {
            const db = window.App.getDatabaseConnector();
            if (!db) {
              alert('數據庫連接器未初始化');
              return;
            }
            
            const result = await db.clearStudentTimeslots(studentId);
            
            if (result && result.success) {
              alert(`✅ 清除成功！已刪除 ${result.deletedCount} 條時段記錄。`);
              // ✅ 清除緩存，確保下次加載最新數據
              clearDataCache(tab);
              // 重新載入當前頁面數據
              const currentPage = window.currentPagination?.page || 1;
              await window.loadPage(currentPage, tab);
            } else {
              alert('❌ 清除失敗，請重試');
            }
          } catch (error) {
            console.error('❌ 清除學生時段記錄失敗:', error);
            alert('清除失敗：' + (error.message || '請重試'));
          }
        });
      });
    }
    
    // ✅ 綁定已定日子課堂列的點擊事件
    if (tab === 'student-classes') {
      tableContainer.querySelectorAll('.clickable-scheduled-classes').forEach(cell => {
        cell.addEventListener('click', async (e) => {
          e.stopPropagation();
          const studentId = cell.dataset.studentId;
          if (!studentId) {
            alert('缺少學生ID');
            return;
          }
          
          // 獲取學生的所有上課日期
          await showStudentClassDates(studentId);
        });
      });
      
      // ✅ 綁定本期請假堂數列的點擊事件
      tableContainer.querySelectorAll('.clickable-leave-requests').forEach(cell => {
        cell.addEventListener('click', async (e) => {
          e.stopPropagation();
          const studentId = cell.dataset.studentId;
          if (!studentId) {
            alert('缺少學生ID');
            return;
          }
          
          // 獲取學生的所有請假日期
          await showStudentLeaveDates(studentId);
        });
      });
      
      // ✅ 綁定已約補堂列的點擊事件
      tableContainer.querySelectorAll('.clickable-booked-makeup').forEach(cell => {
        cell.addEventListener('click', async (e) => {
          e.stopPropagation();
          const studentId = cell.dataset.studentId;
          if (!studentId) {
            alert('缺少學生ID');
            return;
          }
          
          // 獲取學生的所有補堂日期
          await showStudentMakeupDates(studentId);
        });
      });
      
      // ✅ 綁定剩餘時數列的點擊事件
      tableContainer.querySelectorAll('.clickable-remaining-time-slots').forEach(cell => {
        cell.addEventListener('click', async (e) => {
          e.stopPropagation();
          const studentId = cell.dataset.studentId;
          if (!studentId) {
            alert('缺少學生ID');
            return;
          }
          
          // 獲取學生的剩餘時數詳細信息
          await showStudentRemainingTimeSlots(studentId);
        });
      });
    }
    
    if (pagination) {
      renderPagination(tableContainer, pagination, tab);
    }
  }
};

// ✅ 渲染學生堂數的學期和年份篩選器
function renderStudentClassesFilters(container) {
  // 清空容器並重新創建（確保狀態正確）
  container.innerHTML = '';
  
  const filterContainer = document.createElement('div');
  filterContainer.className = 'student-classes-filters';
  filterContainer.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; margin-bottom: 16px; flex-wrap: wrap;';
  container.appendChild(filterContainer);
  
  // 學期按鈕
  const semesterLabel = document.createElement('span');
  semesterLabel.textContent = '學期：';
  semesterLabel.style.cssText = 'font-weight: bold; margin-right: 4px;';
  filterContainer.appendChild(semesterLabel);
  
  const semesters = ['1-2月', '3-4月', '5-6月', '7-8月', '9-10月', '11-12月'];
  const selectedSemester = window.currentSelectedSemester || null;
  
  console.log('🎨 渲染篩選器，當前選中:', { 
    semester: selectedSemester, 
    year: window.currentSelectedYear 
  });
  
  semesters.forEach(semester => {
    const btn = document.createElement('button');
    btn.textContent = semester;
    btn.className = 'semester-filter-btn';
    btn.dataset.semester = semester;
    btn.style.cssText = `
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: ${selectedSemester === semester ? '#007bff' : 'white'};
      color: ${selectedSemester === semester ? 'white' : '#333'};
      cursor: pointer;
      transition: all 0.2s;
    `;
    
    btn.addEventListener('mouseenter', () => {
      if (selectedSemester !== semester) {
        btn.style.background = '#e9ecef';
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (selectedSemester !== semester) {
        btn.style.background = 'white';
      }
    });
    
    btn.addEventListener('click', () => {
      // 切換選中狀態
      const oldSemester = window.currentSelectedSemester;
      if (window.currentSelectedSemester === semester) {
        window.currentSelectedSemester = null;
      } else {
        window.currentSelectedSemester = semester;
      }
      
      console.log('🔄 學期按鈕點擊:', {
        semester: semester,
        oldSemester: oldSemester,
        newSemester: window.currentSelectedSemester,
        currentYear: window.currentSelectedYear
      });
      
      // 重新加載數據
      if (window.currentDataTab === 'student-classes') {
        // 重置分頁到第一頁
        window.currentPagination = null;
        window.showDataTab('student-classes');
      }
    });
    
    filterContainer.appendChild(btn);
  });
  
  // 年份篩選器
  const yearLabel = document.createElement('span');
  yearLabel.textContent = '年份：';
  yearLabel.style.cssText = 'font-weight: bold; margin-left: 16px; margin-right: 4px;';
  filterContainer.appendChild(yearLabel);
  
  const yearSelect = document.createElement('select');
  yearSelect.id = 'studentClassesYearFilter';
  yearSelect.style.cssText = 'padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
  
  // 生成年份選項（當前年份前後5年）
  const currentYear = new Date().getFullYear();
  const selectedYear = window.currentSelectedYear || currentYear;
  
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === selectedYear) {
      option.selected = true;
    }
    yearSelect.appendChild(option);
  }
  
  yearSelect.addEventListener('change', () => {
    const oldYear = window.currentSelectedYear;
    window.currentSelectedYear = parseInt(yearSelect.value);
    
    console.log('🔄 年份選擇變更:', {
      oldYear: oldYear,
      newYear: window.currentSelectedYear,
      currentSemester: window.currentSelectedSemester
    });
    
    // 重新加載數據
    if (window.currentDataTab === 'student-classes') {
      // 重置分頁到第一頁
      window.currentPagination = null;
      window.showDataTab('student-classes');
    }
  });
  
  filterContainer.appendChild(yearSelect);
  
  // 清除篩選按鈕
  if (selectedSemester || selectedYear !== currentYear) {
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清除篩選';
    clearBtn.style.cssText = 'padding: 6px 12px; border: 1px solid #dc3545; border-radius: 4px; background: white; color: #dc3545; cursor: pointer; margin-left: auto;';
    clearBtn.addEventListener('click', () => {
      console.log('🔄 清除篩選');
      window.currentSelectedSemester = null;
      window.currentSelectedYear = currentYear;
      // 重置分頁到第一頁
      window.currentPagination = null;
      if (window.currentDataTab === 'student-classes') {
        window.showDataTab('student-classes');
      }
    });
    filterContainer.appendChild(clearBtn);
  }
}

// 輔助函數：轉義HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ✅ 獲取出席狀態文本
function getAttendanceStatusText(isAttended, isLeave) {
  if (isLeave === true) return '請假';
  if (isAttended === true) return '已出席';
  if (isAttended === false) return '缺席';
  return ''; // 初始狀態，無狀態
}

// 分頁控件渲染函數
function renderPagination(container, pagination, tab) {
  // 先移除可能存在的舊分頁控件
  const existingPagination = container.querySelector('.pagination-controls');
  if (existingPagination) {
    existingPagination.remove();
  }
  
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination-controls';
  paginationDiv.style.cssText = 'margin-top: 15px; display: flex; justify-content: center; align-items: center; gap: 10px;';
  
  const prevButton = document.createElement('button');
  prevButton.textContent = '上一頁';
  prevButton.className = 'btn-secondary';
  prevButton.disabled = pagination.page <= 1;
  prevButton.addEventListener('click', () => {
    if (pagination.page > 1) {
      window.loadPage(pagination.page - 1, tab);
    }
  });
  
  const infoSpan = document.createElement('span');
  infoSpan.style.fontSize = '14px';
  infoSpan.textContent = `第 ${pagination.page} / ${pagination.totalPages} 頁，共 ${pagination.total} 條記錄`;
  
  const nextButton = document.createElement('button');
  nextButton.textContent = '下一頁';
  nextButton.className = 'btn-secondary';
  nextButton.disabled = pagination.page >= pagination.totalPages;
  nextButton.addEventListener('click', () => {
    if (pagination.page < pagination.totalPages) {
      window.loadPage(pagination.page + 1, tab);
    }
  });
  
  paginationDiv.appendChild(prevButton);
  paginationDiv.appendChild(infoSpan);
  paginationDiv.appendChild(nextButton);
  
  container.appendChild(paginationDiv);
}

// 編輯資料行
window.editDataRow = function(tab, rowId, rowElement) {
  // 如果已在編輯模式，切換為保存模式
  if (rowElement.classList.contains('editing')) {
    window.saveDataRow(tab, rowId, rowElement);
    return;
  }
  
  // 獲取原始數據
  const rowDataStr = rowElement.dataset.rowData;
  const rowData = JSON.parse(rowDataStr);
  const tabConfig = getTabConfig(tab);
  
  // 標記為編輯模式
  rowElement.classList.add('editing');
  
  // 將每個欄位轉為可編輯的輸入框
  const cells = rowElement.querySelectorAll('td[data-field]');
  cells.forEach(cell => {
    const field = cell.dataset.field;
    const originalValue = cell.dataset.original || '';
    const fieldConfig = tabConfig.fields && tabConfig.fields.find(f => f.name === field);
    
    // ✅ studentId 字段設為只讀，不可編輯
    if (field === 'studentId' || (fieldConfig && fieldConfig.readonly)) {
      const readonlyInput = document.createElement('input');
      readonlyInput.type = 'text';
      readonlyInput.className = 'data-edit-input';
      readonlyInput.value = originalValue;
      readonlyInput.readOnly = true;
      readonlyInput.style.cssText = 'width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; background-color: #f5f5f5; cursor: not-allowed;';
      readonlyInput.dataset.field = field;
      cell.innerHTML = '';
      cell.appendChild(readonlyInput);
      return;
    }
    
    let input;
    if (fieldConfig && fieldConfig.type === 'select') {
      // 下拉清單
      input = document.createElement('select');
      input.className = 'data-edit-input';
      input.style.cssText = 'width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;';
      
      // 添加選項
      if (fieldConfig.options) {
        fieldConfig.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = typeof opt === 'object' ? opt.value : opt;
          option.textContent = typeof opt === 'object' ? opt.label || opt.value : opt;
          if (option.value === originalValue) option.selected = true;
          input.appendChild(option);
        });
      }
    } else {
      // 文本輸入框
      input = document.createElement('input');
      input.type = field === 'phone' ? 'tel' : (field === 'email' || field.includes('email')) ? 'email' : 'text';
      input.className = 'data-edit-input';
      input.value = originalValue;
      input.style.cssText = 'width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;';
    }
    
    input.dataset.field = field;
    cell.innerHTML = '';
    cell.appendChild(input);
  });
  
  // 修改操作按鈕
  const actionCell = rowElement.querySelector('td:last-child');
  actionCell.innerHTML = `
    <button class="btn-save-row" data-row-id="${rowId}" style="margin-right: 5px; padding: 4px 8px; font-size: 12px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">
      <i class="fas fa-save"></i> 保存
    </button>
    <button class="btn-cancel-row" data-row-id="${rowId}" style="padding: 4px 8px; font-size: 12px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">
      <i class="fas fa-times"></i> 取消
    </button>
  `;
  
  actionCell.querySelector('.btn-save-row').addEventListener('click', () => {
    window.saveDataRow(tab, rowId, rowElement);
  });
  
  actionCell.querySelector('.btn-cancel-row').addEventListener('click', () => {
    window.cancelEditDataRow(tab, rowId, rowElement);
  });
};

// 保存資料行
window.saveDataRow = async function(tab, rowId, rowElement) {
  try {
    const rowDataStr = rowElement.dataset.rowData;
    const originalData = JSON.parse(rowDataStr);
    
    // 收集修改後的數據
    const updateData = {};
    const cells = rowElement.querySelectorAll('td[data-field]');
    cells.forEach(cell => {
      const input = cell.querySelector('.data-edit-input');
      if (input) {
        const field = input.dataset.field;
        let value = input.value;
        
        // ✅ 處理日期字段：如果是日期類型的輸入，確保格式正確
        if (field.includes('Date') || field === 'trialDate') {
          // 如果值為空或無效，設為空字符串
          if (!value || value.trim() === '') {
            value = '';
          } else {
            // 確保日期格式正確（ISO格式或可解析的日期格式）
            const dateValue = new Date(value);
            if (!isNaN(dateValue.getTime())) {
              value = dateValue.toISOString();
            }
          }
        }
        
        // ✅ 過濾掉系統字段（這些不應該被更新）
        if (!['_id', 'createdAt', 'updatedAt'].includes(field)) {
          updateData[field] = value;
        }
      }
    });
    
    // 調用API更新數據
    const db = window.App.getDatabaseConnector();
    if (!db) {
      alert('數據庫連接器未初始化');
      return;
    }
    
    let result;
    if (tab === 'employee') {
      result = await db.updateUserInfo(originalData.phone, updateData);
    } else if (tab === 'formal') {
      result = await db.updateStudent(originalData._id || originalData.phone, updateData);
    } else if (tab === 'trial') {
      result = await db.updateTrialBill(originalData._id, updateData);
    } else {
      alert('不支持的資料類型');
      return;
    }
    
    if (result) {
      alert('✅ 保存成功！');
      // ✅ 清除緩存，確保下次加載最新數據
      clearDataCache(tab);
      // 重新載入當前頁面數據
      const currentPage = window.currentPagination?.page || 1;
      await window.loadPage(currentPage, tab);
    } else {
      alert('❌ 保存失敗，請重試');
    }
  } catch (error) {
    console.error('❌ 保存資料失敗:', error);
    alert('保存失敗：' + (error.message || '請重試'));
  }
};

// 取消編輯
window.cancelEditDataRow = function(tab, rowId, rowElement) {
  // 恢復原始顯示
  const cells = rowElement.querySelectorAll('td[data-field]');
  cells.forEach(cell => {
    const original = cell.dataset.original || '';
    cell.innerHTML = escapeHtml(original);
  });
  
  // 恢復操作按鈕
  const actionCell = rowElement.querySelector('td:last-child');
  const rowIndex = Array.from(rowElement.parentElement.children).indexOf(rowElement) - 1;
  actionCell.innerHTML = `
    <button class="btn-edit-row" data-row-id="${rowId}" data-row-index="${rowIndex}" style="margin-right: 5px; padding: 4px 8px; font-size: 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
      <i class="fas fa-edit"></i> 修改
    </button>
    <button class="btn-delete-row" data-row-id="${rowId}" data-row-index="${rowIndex}" style="padding: 4px 8px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
      <i class="fas fa-trash"></i> 刪除
    </button>
  `;
  
  actionCell.querySelector('.btn-edit-row').addEventListener('click', () => {
    window.editDataRow(tab, rowId, rowElement);
  });
  
  actionCell.querySelector('.btn-delete-row').addEventListener('click', () => {
    window.deleteDataRow(tab, rowId, rowIndex);
  });
  
  rowElement.classList.remove('editing');
};

// 刪除資料行
window.deleteDataRow = async function(tab, rowId, rowIndex) {
  if (!confirm('確定要刪除這筆資料嗎？此操作無法復原。')) {
    return;
  }
  
  try {
    // 獲取原始數據
    const rowElement = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!rowElement) {
      alert('找不到要刪除的資料');
      return;
    }
    
    const rowDataStr = rowElement.dataset.rowData;
    const originalData = JSON.parse(rowDataStr);
    
    // 調用API刪除數據
    const db = window.App.getDatabaseConnector();
    if (!db) {
      alert('數據庫連接器未初始化');
      return;
    }
    
    let result;
    if (tab === 'employee') {
      result = await db.deleteUser(originalData.phone);
    } else if (tab === 'formal') {
      result = await db.deleteStudent(originalData._id || originalData.phone);
    } else if (tab === 'trial') {
      result = await db.deleteTrialBill(originalData._id);
    } else {
      alert('不支持的資料類型');
      return;
    }
    
    if (result) {
      alert('✅ 刪除成功！');
      // ✅ 清除緩存，確保下次加載最新數據
      clearDataCache(tab);
      // 重新載入當前頁面數據
      const currentPage = window.currentPagination?.page || 1;
      await window.loadPage(currentPage, tab);
    } else {
      alert('❌ 刪除失敗，請重試');
    }
  } catch (error) {
    console.error('❌ 刪除資料失敗:', error);
    alert('刪除失敗：' + (error.message || '請重試'));
  }
};

// 獲取資料分類配置
function getTabConfig(tab) {
  if (tab === 'employee') {
    return {
      fields: [
        { name: 'type', type: 'select', options: [
          { value: 'admin', label: '文書職員' },
          { value: 'manager', label: '管理員' },
          { value: 'supervisor', label: '主管' },
          { value: 'coach', label: '教練' }
        ]},
        { name: 'gender', type: 'select', options: [
          { value: 'M', label: '男' },
          { value: 'F', label: '女' }
        ]}
      ]
    };
  } else if (tab === 'formal') {
    return {
      fields: [
        { name: 'studentId', type: 'text', readonly: true }, // ✅ studentId 只讀，不可編輯
        { name: 'status', type: 'select', options: [
          { value: 'active', label: '活躍' },
          { value: 'inactive', label: '非活躍' },
          { value: 'suspended', label: '暫停' }
        ]}
      ]
    };
  }
  return { fields: [] };
}

// 加載指定頁面的數據
window.loadPage = async function(page, tab) {
  if (!tab) tab = window.currentDataTab || 'employee';
  
  const limit = 50;
  let data = [];
  let pagination = null;
  
  try {
    if (tab === 'employee') {
      const db = window.App.getDatabaseConnector();
      if (db) {
        const resp = await fetch(`${db.baseUrl}/admins?page=${page}&limit=${limit}`, {
          headers: db.getStandardHeaders()
        });
        const result = await resp.json();
        data = result.admins || [];
        pagination = result.pagination;
        // ✅ 保存分頁信息到全局變量
        if (pagination) window.currentPagination = pagination;
      }
    } else if (tab === 'formal') {
      const db = window.App.getDatabaseConnector();
      if (db) {
        const resp = await fetch(`${db.baseUrl}/students?page=${page}&limit=${limit}`, {
          headers: db.getStandardHeaders()
        });
        const result = await resp.json();
        data = result.students || [];
        pagination = result.pagination;
        // ✅ 保存分頁信息到全局變量
        if (pagination) window.currentPagination = pagination;
      }
    } else if (tab === 'trial') {
      const db = window.App.getDatabaseConnector();
      if (db) {
        try {
        const resp = await fetch(`${db.baseUrl}/trial-bill/all?page=${page}&limit=${limit}`, {
          headers: db.getStandardHeaders()
        });
          
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
          }
          
        const result = await resp.json();
          
          if (!result.success) {
            console.error('❌ API 返回錯誤:', result.message || '未知錯誤');
            data = [];
          } else {
        data = result.trials || [];
        pagination = result.pagination;
        // ✅ 保存分頁信息到全局變量
        if (pagination) window.currentPagination = pagination;
          }
        } catch (error) {
          console.error('❌ 載入非正式會員分頁數據失敗:', error);
          data = [];
        }
      }
    } else if (tab === 'student-classes') {
      const db = window.App.getDatabaseConnector();
      if (db) {
        try {
          // 獲取當前選擇的學期和年份
          const selectedSemester = window.currentSelectedSemester || null;
          const selectedYear = window.currentSelectedYear || new Date().getFullYear();
          
          let url = `${db.baseUrl}/student-classes?page=${page}&limit=${limit}`;
          if (selectedSemester) {
            url += `&semester=${encodeURIComponent(selectedSemester)}`;
          }
          if (selectedYear) {
            url += `&year=${selectedYear}`;
          }
          
          // ✅ 添加時間戳防止緩存
          url += `&_t=${Date.now()}`;
          
          console.log('📡 分頁請求URL:', url);
          
          const resp = await fetch(url, {
            headers: db.getStandardHeaders(),
            cache: 'no-cache' // ✅ 禁用緩存
          });
          
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
          }
          
        const result = await resp.json();
          
          if (!result.success) {
            console.error('❌ API 返回錯誤:', result.message || '未知錯誤');
            data = [];
          } else {
        data = result.students || [];
        pagination = result.pagination;
        // ✅ 保存分頁信息到全局變量
        if (pagination) window.currentPagination = pagination;
          }
        } catch (error) {
          console.error('❌ 載入學生堂數分頁數據失敗:', error);
          data = [];
        }
      }
    }
    
    let config = { search: window.currentSearchConfig || [] };
    window.currentRawData = data;
    window.currentDataTab = tab;
    
    window.renderDataTable(tab, data, config, pagination);
  } catch (error) {
    console.error('❌ 載入分頁數據失敗:', error);
    alert('載入數據失敗，請重試');
  }
};
// ✅ 資料管理卡片點擊事件綁定（已由上方的事件監聽器處理，這裡保留以確保兼容性）
// 注意：這段代碼可能會與上方的事件監聽器衝突，如果出現重複觸發問題，可以移除這段代碼
// for(const el of document.querySelectorAll('.feature-card[data-feature="data-management"]')){el.onclick=()=>{if(window.App&&window.App.hideAllFeatures)window.App.hideAllFeatures();document.getElementById('dataManagementSection').classList.remove('hidden');window.showDataTab('employee');};}
// App暴露查詢方法
window.App.getEmployees = async () => {
    let db = window.App.getDatabaseConnector();
    if (!db) return [];
    let res = await db.fetchAdmins();
    let arr = Array.isArray(res) ? res : res.admins || [];
    return arr.filter(x => ['admin','manager','supervisor','coach'].includes((x.type||x.userType)));
  };
window.App.getFormalMembers=async()=>{let db=window.App.getDatabaseConnector();if(!db)return[];let resp=await fetch(db.baseUrl+'/students',{headers:db.getStandardHeaders()});let d=await resp.json();return d.students||[];};

// ✅ 顯示學生的所有上課日期
async function showStudentClassDates(studentId) {
  try {
    const db = window.App?.getDatabaseConnector();
    if (!db) {
      alert('數據庫連接未初始化');
      return;
    }
    
    // 顯示加載提示
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'classDatesLoading';
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;';
    loadingMsg.textContent = '載入中...';
    document.body.appendChild(loadingMsg);
    
    // 獲取學生的所有上課日期
    const response = await fetch(`${db.baseUrl}/student/${studentId}/class-dates`, {
      headers: db.getStandardHeaders()
    });
    
    const result = await response.json();
    loadingMsg.remove();
    
    // 檢查返回的數據格式（可能是按學期分類的對象或平鋪的數組）
    const classDatesBySemester = result.classDates || {};
    const allDates = result.allDates || [];
    
    if (Object.keys(classDatesBySemester).length === 0 && allDates.length === 0) {
      alert('該學生暫無上課日期記錄');
      return;
    }
    
    // 計算總日期數
    const totalDates = allDates.length || Object.values(classDatesBySemester).flat().length;
    
    // 創建日期列表彈窗
    const modal = document.createElement('div');
    modal.id = 'classDatesModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    
    const title = document.createElement('h3');
    title.textContent = `學生上課日期 (共 ${totalDates} 個)`;
    title.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: #333;';
    
    const datesList = document.createElement('div');
    datesList.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
    
    // 如果按學期分類，按學期顯示
    if (Object.keys(classDatesBySemester).length > 0) {
      // 定義學期順序
      const semesterOrder = ['1-2月', '3-4月', '5-6月', '7-8月', '9-10月', '11-12月'];
      
      semesterOrder.forEach(semester => {
        if (!classDatesBySemester[semester] || classDatesBySemester[semester].length === 0) {
          return;
        }
        
        // 學期標題
        const semesterTitle = document.createElement('div');
        semesterTitle.textContent = `📅 ${semester} (${classDatesBySemester[semester].length} 個日期)`;
        semesterTitle.style.cssText = 'font-weight: bold; font-size: 16px; color: #007bff; margin-top: 8px; margin-bottom: 8px;';
        datesList.appendChild(semesterTitle);
        
        // 該學期的日期列表
        classDatesBySemester[semester].forEach(date => {
          const dateItem = document.createElement('div');
          dateItem.style.cssText = 'padding: 10px 12px; background: #f5f5f5; border-radius: 4px; cursor: pointer; transition: background 0.2s; margin-left: 16px;';
          dateItem.textContent = date;
          dateItem.addEventListener('mouseenter', () => {
            dateItem.style.background = '#e0e0e0';
          });
          dateItem.addEventListener('mouseleave', () => {
            dateItem.style.background = '#f5f5f5';
          });
          dateItem.addEventListener('click', () => {
            modal.remove();
            navigateToAttendanceWithDate(date);
          });
          datesList.appendChild(dateItem);
        });
      });
    } else {
      // 如果沒有按學期分類，使用平鋪的日期列表（向後兼容）
      allDates.forEach(date => {
      const dateItem = document.createElement('div');
      dateItem.style.cssText = 'padding: 12px; background: #f5f5f5; border-radius: 4px; cursor: pointer; transition: background 0.2s;';
      dateItem.textContent = date;
      dateItem.addEventListener('mouseenter', () => {
        dateItem.style.background = '#e0e0e0';
      });
      dateItem.addEventListener('mouseleave', () => {
        dateItem.style.background = '#f5f5f5';
      });
      dateItem.addEventListener('click', () => {
        modal.remove();
        navigateToAttendanceWithDate(date);
      });
      datesList.appendChild(dateItem);
    });
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '關閉';
    closeBtn.style.cssText = 'margin-top: 16px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;';
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    modalContent.appendChild(title);
    modalContent.appendChild(datesList);
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('❌ 獲取學生上課日期失敗:', error);
    alert('獲取學生上課日期失敗，請重試');
  }
}

// ✅ 顯示學生的請假日期列表
async function showStudentLeaveDates(studentId) {
  try {
    const db = window.App?.getDatabaseConnector();
    if (!db) {
      alert('數據庫連接未初始化');
      return;
    }
    
    // 顯示加載提示
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'leaveDatesLoading';
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;';
    loadingMsg.textContent = '載入中...';
    document.body.appendChild(loadingMsg);
    
    // 獲取學生的所有請假日期
    const response = await fetch(`${db.baseUrl}/student/${studentId}/leave-dates`, {
      headers: db.getStandardHeaders()
    });
    
    const result = await response.json();
    loadingMsg.remove();
    
    // 檢查返回的數據格式（可能是按學期分類的對象或平鋪的數組）
    const leaveDatesBySemester = result.leaveDates || {};
    const allDates = result.allDates || [];
    
    if (Object.keys(leaveDatesBySemester).length === 0 && allDates.length === 0) {
      alert('該學生暫無請假日期記錄');
      return;
    }
    
    // 計算總日期數
    const totalDates = allDates.length || Object.values(leaveDatesBySemester).flat().length;
    
    // 創建日期列表彈窗
    const modal = document.createElement('div');
    modal.id = 'leaveDatesModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    
    const title = document.createElement('h3');
    title.textContent = `學生請假日期 (共 ${totalDates} 個)`;
    title.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: #333;';
    
    const datesList = document.createElement('div');
    datesList.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
    
    // 如果按學期分類，按學期顯示
    if (Object.keys(leaveDatesBySemester).length > 0) {
      // 定義學期順序
      const semesterOrder = ['1-2月', '3-4月', '5-6月', '7-8月', '9-10月', '11-12月'];
      
      semesterOrder.forEach(semester => {
        if (!leaveDatesBySemester[semester] || leaveDatesBySemester[semester].length === 0) {
          return;
        }
        
        // 學期標題
        const semesterTitle = document.createElement('div');
        semesterTitle.textContent = `📅 ${semester} (${leaveDatesBySemester[semester].length} 個日期)`;
        semesterTitle.style.cssText = 'font-weight: bold; font-size: 16px; color: #007bff; margin-top: 8px; margin-bottom: 8px;';
        datesList.appendChild(semesterTitle);
        
        // 該學期的日期列表
        leaveDatesBySemester[semester].forEach(date => {
          const dateItem = document.createElement('div');
          dateItem.style.cssText = 'padding: 10px 12px; background: #f5f5f5; border-radius: 4px; cursor: pointer; transition: background 0.2s; margin-left: 16px;';
          dateItem.textContent = date;
          dateItem.addEventListener('mouseenter', () => {
            dateItem.style.background = '#e0e0e0';
          });
          dateItem.addEventListener('mouseleave', () => {
            dateItem.style.background = '#f5f5f5';
          });
          dateItem.addEventListener('click', () => {
            modal.remove();
            navigateToAttendanceWithDate(date);
          });
          datesList.appendChild(dateItem);
        });
      });
    } else {
      // 如果沒有按學期分類，使用平鋪的日期列表（向後兼容）
      allDates.forEach(date => {
        const dateItem = document.createElement('div');
        dateItem.style.cssText = 'padding: 12px; background: #f5f5f5; border-radius: 4px; cursor: pointer; transition: background 0.2s;';
        dateItem.textContent = date;
        dateItem.addEventListener('mouseenter', () => {
          dateItem.style.background = '#e0e0e0';
        });
        dateItem.addEventListener('mouseleave', () => {
          dateItem.style.background = '#f5f5f5';
        });
        dateItem.addEventListener('click', () => {
          modal.remove();
          navigateToAttendanceWithDate(date);
        });
        datesList.appendChild(dateItem);
      });
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '關閉';
    closeBtn.style.cssText = 'margin-top: 16px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;';
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    modalContent.appendChild(title);
    modalContent.appendChild(datesList);
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('❌ 獲取學生請假日期失敗:', error);
    alert('獲取學生請假日期失敗，請重試');
  }
}

// ✅ 顯示學生的補堂日期列表
async function showStudentMakeupDates(studentId) {
  try {
    const db = window.App?.getDatabaseConnector();
    if (!db) {
      alert('數據庫連接未初始化');
      return;
    }
    
    // 顯示加載提示
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'makeupDatesLoading';
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;';
    loadingMsg.textContent = '載入中...';
    document.body.appendChild(loadingMsg);
    
    // 獲取學生的所有補堂日期
    const response = await fetch(`${db.baseUrl}/student/${studentId}/makeup-dates`, {
      headers: db.getStandardHeaders()
    });
    
    const result = await response.json();
    loadingMsg.remove();
    
    // 檢查返回的數據格式（可能是按學期分類的對象或平鋪的數組）
    const makeupDatesBySemester = result.makeupDates || {};
    const allDates = result.allDates || [];
    
    if (Object.keys(makeupDatesBySemester).length === 0 && allDates.length === 0) {
      alert('該學生暫無補堂日期記錄');
      return;
    }
    
    // 計算總日期數
    const totalDates = allDates.length || Object.values(makeupDatesBySemester).flat().length;
    
    // 創建日期列表彈窗
    const modal = document.createElement('div');
    modal.id = 'makeupDatesModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    
    const title = document.createElement('h3');
    title.textContent = `學生補堂日期 (共 ${totalDates} 個)`;
    title.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: #333;';
    
    const datesList = document.createElement('div');
    datesList.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
    
    // 如果按學期分類，按學期顯示
    if (Object.keys(makeupDatesBySemester).length > 0) {
      // 定義學期順序
      const semesterOrder = ['1-2月', '3-4月', '5-6月', '7-8月', '9-10月', '11-12月'];
      
      semesterOrder.forEach(semester => {
        if (!makeupDatesBySemester[semester] || makeupDatesBySemester[semester].length === 0) {
          return;
        }
        
        // 學期標題
        const semesterTitle = document.createElement('div');
        semesterTitle.textContent = `📅 ${semester} (${makeupDatesBySemester[semester].length} 個日期)`;
        semesterTitle.style.cssText = 'font-weight: bold; font-size: 16px; color: #007bff; margin-top: 8px; margin-bottom: 8px;';
        datesList.appendChild(semesterTitle);
        
        // 該學期的日期列表
        makeupDatesBySemester[semester].forEach(date => {
          const dateItem = document.createElement('div');
          dateItem.style.cssText = 'padding: 10px 12px; background: #f5f5f5; border-radius: 4px; cursor: pointer; transition: background 0.2s; margin-left: 16px;';
          dateItem.textContent = date;
          dateItem.addEventListener('mouseenter', () => {
            dateItem.style.background = '#e0e0e0';
          });
          dateItem.addEventListener('mouseleave', () => {
            dateItem.style.background = '#f5f5f5';
          });
          dateItem.addEventListener('click', () => {
            modal.remove();
            navigateToAttendanceWithDate(date);
          });
          datesList.appendChild(dateItem);
        });
      });
    } else {
      // 如果沒有按學期分類，使用平鋪的日期列表（向後兼容）
      allDates.forEach(date => {
        const dateItem = document.createElement('div');
        dateItem.style.cssText = 'padding: 12px; background: #f5f5f5; border-radius: 4px; cursor: pointer; transition: background 0.2s;';
        dateItem.textContent = date;
        dateItem.addEventListener('mouseenter', () => {
          dateItem.style.background = '#e0e0e0';
        });
        dateItem.addEventListener('mouseleave', () => {
          dateItem.style.background = '#f5f5f5';
        });
        dateItem.addEventListener('click', () => {
          modal.remove();
          navigateToAttendanceWithDate(date);
        });
        datesList.appendChild(dateItem);
      });
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '關閉';
    closeBtn.style.cssText = 'margin-top: 16px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;';
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    modalContent.appendChild(title);
    modalContent.appendChild(datesList);
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('❌ 獲取學生補堂日期失敗:', error);
    alert('獲取學生補堂日期失敗，請重試');
  }
}

// ✅ 顯示學生的剩餘時數詳細信息
async function showStudentRemainingTimeSlots(studentId) {
  try {
    const db = window.App?.getDatabaseConnector();
    if (!db) {
      alert('數據庫連接未初始化');
      return;
    }
    
    // 獲取當前的學期和年份過濾條件（如果有的話）
    const selectedSemester = window.currentSelectedSemester || null;
    const selectedYear = window.currentSelectedYear || null;
    
    // 將學期字符串轉換為月份數組（例如："1-2月" -> [1, 2]）
    let semesterFilter = null;
    if (selectedSemester) {
      const semesterMonths = {
        '1-2月': [1, 2],
        '3-4月': [3, 4],
        '5-6月': [5, 6],
        '7-8月': [7, 8],
        '9-10月': [9, 10],
        '11-12月': [11, 12]
      };
      semesterFilter = semesterMonths[selectedSemester] || null;
    }
    
    // 構建查詢參數
    const params = new URLSearchParams();
    if (semesterFilter) {
      params.append('semester', semesterFilter.join(','));
    }
    if (selectedYear) {
      params.append('year', selectedYear);
    }
    
    // 顯示加載提示
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'remainingTimeSlotsLoading';
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;';
    loadingMsg.textContent = '載入中...';
    document.body.appendChild(loadingMsg);
    
    // 獲取學生的剩餘時數詳細信息
    const url = `${db.baseUrl}/student/${studentId}/remaining-time-slots${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: db.getStandardHeaders()
    });
    
    const result = await response.json();
    loadingMsg.remove();
    
    if (!result.success) {
      alert(result.message || '獲取剩餘時數詳細信息失敗');
      return;
    }
    
    if (!result.formatGroups || result.formatGroups.length === 0) {
      alert('該學生暫無剩餘時數記錄');
      return;
    }
    
    // 創建詳細信息彈窗
    const modal = document.createElement('div');
    modal.id = 'remainingTimeSlotsModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 8px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    
    const title = document.createElement('h3');
    title.textContent = `剩餘時數詳細信息 (總時數: ${result.totalTimeSlots || 0}，共 ${result.totalRecords} 條記錄)`;
    title.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: #333;';
    
    const formatList = document.createElement('div');
    formatList.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
    
    // 顯示每個 classFormat 的詳細信息
    result.formatGroups.forEach((formatGroup, index) => {
      const formatCard = document.createElement('div');
      formatCard.style.cssText = 'border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; background: #f9f9f9;';
      
      const formatHeader = document.createElement('div');
      formatHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';
      
      const formatTitle = document.createElement('div');
      formatTitle.style.cssText = 'font-weight: bold; font-size: 16px; color: #007bff;';
      formatTitle.textContent = `📚 ${formatGroup.classFormat}`;
      
      const formatStats = document.createElement('div');
      formatStats.style.cssText = 'font-size: 14px; color: #666;';
      formatStats.textContent = `${formatGroup.count} 條記錄，總時數: ${formatGroup.totalTimeSlot.toFixed(1)}`;
      
      formatHeader.appendChild(formatTitle);
      formatHeader.appendChild(formatStats);
      formatCard.appendChild(formatHeader);
      
      // 顯示記錄列表
      const recordsList = document.createElement('div');
      recordsList.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 12px;';
      
      formatGroup.records.forEach((record, recordIndex) => {
        const recordItem = document.createElement('div');
        recordItem.style.cssText = 'padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #007bff; font-size: 13px;';
        
        const recordInfo = [];
        // ✅ 待約記錄可能沒有 classDate，但如果有則顯示
        if (record.classDate) {
          recordInfo.push(`日期: ${record.classDate}`);
        } else if (record.isPending) {
          // ✅ 如果是待約記錄且沒有日期，顯示"待約"標記
          recordInfo.push('日期: 待約');
        }
        // ✅ 待約記錄可能沒有 classTime，但如果有則顯示
        if (record.classTime) {
          recordInfo.push(`時間: ${record.classTime}`);
        }
        if (record.courseType) {
          recordInfo.push(`課程類型: ${record.courseType}`);
        }
        recordInfo.push(`時數: ${record.totalTimeSlot.toFixed(1)}`);
        
        // ✅ 顯示狀態標記（待約或請假）
        if (record.isPending) {
          recordInfo.push('(待約)');
        }
        if (record.isLeave) {
          recordInfo.push('(請假)');
        }
        
        recordItem.textContent = recordInfo.join(' | ');
        recordsList.appendChild(recordItem);
      });
      
      formatCard.appendChild(recordsList);
      formatList.appendChild(formatCard);
    });
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '關閉';
    closeBtn.style.cssText = 'margin-top: 16px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    modalContent.appendChild(title);
    modalContent.appendChild(formatList);
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    
    // 點擊外部關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('❌ 顯示剩餘時數詳細信息失敗:', error);
    alert('獲取剩餘時數詳細信息失敗，請重試');
  }
}

// ✅ 跳轉到出席管理模塊並定位到指定日期
function navigateToAttendanceWithDate(classDate) {
  // 根據當前用戶類型決定跳轉到哪個出席管理界面
  const userType = window.App ? window.App.getCurrentUserType() : '';
  
  if (userType === 'supervisor' || userType === 'admin' || userType === 'manager') {
    // 顯示主管出席管理界面
    if (typeof window.showSupervisorAttendance === 'function') {
      window.showSupervisorAttendance();
      
      // 等待界面加載完成後設置日期並刷新
      setTimeout(() => {
        const dateInput = document.getElementById('supervisorAttendanceDate');
        if (dateInput) {
          dateInput.value = classDate;
          console.log('✅ 已設置日期:', classDate);
          
          // 觸發刷新出席板
          const container = document.getElementById('supervisorAttendanceTable');
          if (container && window.initAttendanceBoard) {
            // 直接初始化出席板，傳入日期過濾
            window.initAttendanceBoard(container.id, { classDate: classDate });
            console.log('✅ 已初始化出席板，日期:', classDate);
          } else {
            console.error('❌ 找不到出席板容器或 initAttendanceBoard 函數');
          }
        } else {
          console.error('❌ 找不到日期輸入框');
        }
      }, 500);
    } else {
      console.error('❌ showSupervisorAttendance 函數未定義');
    }
  } else {
    alert('當前用戶無權限訪問出席管理模塊');
  }
}
window.App.getTrialBills=async()=>{
  try {
    let db=window.App.getDatabaseConnector();
    if(!db) {
      console.error('❌ DatabaseConnector 未初始化');
      return [];
    }
    const baseUrl = db.baseUrl || 'https://swimming-attendance-system-production.up.railway.app';
    const url = `${baseUrl}/trial-bill/all`;
    console.log('📡 請求 trial-bill/all:', url);
    let resp=await fetch(url, {
      headers: db.getStandardHeaders()
    });
    if(!resp.ok) {
      console.error(`❌ API 錯誤響應: ${resp.status} ${resp.statusText}`);
      const errorText = await resp.text();
      console.error('❌ 錯誤詳情:', errorText);
      return [];
    }
    let d=await resp.json();
    return d.trials||[];
  } catch(error) {
    console.error('❌ 獲取非正式會員數據失敗:', error);
    return [];
  }
};

// ✅ 暴露創建試堂記錄方法（支持批量）
window.App.createTrialBill = async function(payload) {
  const db = window.App.getDatabaseConnector();
  if (!db) {
    throw new Error('DatabaseConnector 未初始化');
  }
  return await db.createTrialBill(payload);
};

// ✅ 暴露根據 TrailID 查詢試堂資料方法
window.App.fetchTrialBillByTrailId = async function(trailId) {
  const db = window.App.getDatabaseConnector();
  if (!db) {
    throw new Error('DatabaseConnector 未初始化');
  }
  return await db.fetchTrialBillByTrailId(trailId);
};

function initializeMonthSelect(id){
    const s=document.getElementById(id);
    if(!s){
        console.warn('⚠️ 找不到月份選擇器:', id);
        // 如果找不到，嘗試再次查找（延遲重試）
        setTimeout(() => {
            const retryS = document.getElementById(id);
            if(retryS){
                const mn=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
                const cm=new Date().getMonth()+1;
                retryS.innerHTML='';
                for(let i=1;i<=12;i++){
                    retryS.innerHTML+=`<option value="${i}" ${i===cm?'selected':''}>${mn[i-1]}</option>`;
                }
                console.log('✅ 初始化月份選擇器（重試成功）:', id, '當前值:', retryS.value);
            } else {
                console.error('❌ 重試後仍找不到月份選擇器:', id);
            }
        }, 100);
        return;
    }
    const mn=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    const cm=new Date().getMonth()+1;
    s.innerHTML='';
    for(let i=1;i<=12;i++){
        s.innerHTML+=`<option value="${i}" ${i===cm?'selected':''}>${mn[i-1]}</option>`;
    }
    console.log('✅ 初始化月份選擇器:', id, '當前值:', s.value);
}
function initializeWorkHoursDateSelectors(yid,mid){
    const ys=document.getElementById(yid);
    const ms=document.getElementById(mid);
    
    // 🔥 修復：更詳細的日誌和重試邏輯
    if(!ys){
        console.warn('⚠️ 找不到年份選擇器:', yid);
        console.warn('🔍 調試信息:', {
            elementExists: !!document.getElementById(yid),
            sectionVisible: document.getElementById('coachWorkHoursRosterSection')?.classList.contains('hidden') === false,
            sectionExists: !!document.getElementById('coachWorkHoursRosterSection'),
            adminSectionVisible: document.getElementById('adminWorkHoursRosterSection')?.classList.contains('hidden') === false,
            supervisorSectionVisible: document.getElementById('supervisorWorkHoursRosterSection')?.classList.contains('hidden') === false
        });
        // 如果找不到，嘗試多次重試（增加重試次數和間隔）
        let retryCount = 0;
        const maxRetries = 8; // 增加到8次
        const retryInterval = 150; // 增加到150ms
        
        const retryInitYear = () => {
            retryCount++;
            const retryYs = document.getElementById(yid);
            if(retryYs){
                const cy=new Date().getFullYear();
                retryYs.innerHTML='';
                for(let y=cy-1;y<=cy+1;y++){
                    retryYs.innerHTML+=`<option value="${y}">${y}年</option>`;
                }
                retryYs.value=cy.toString();
                console.log(`✅ 初始化年份選擇器（重試 ${retryCount}/${maxRetries} 成功）:`, yid, '當前值:', retryYs.value);
            } else if(retryCount < maxRetries){
                console.log(`🔄 重試初始化年份選擇器 (${retryCount}/${maxRetries}):`, yid);
                setTimeout(retryInitYear, retryInterval);
            } else {
                console.error('❌ 多次重試後仍找不到年份選擇器:', yid);
                console.error('🔍 最終調試信息:', {
                    elementId: yid,
                    elementExists: !!document.getElementById(yid),
                    parentSection: document.getElementById(yid)?.closest('.interface-section')?.id
                });
            }
        };
        setTimeout(retryInitYear, retryInterval);
    } else {
        const cy=new Date().getFullYear();
        ys.innerHTML='';
        for(let y=cy-1;y<=cy+1;y++){
            ys.innerHTML+=`<option value="${y}">${y}年</option>`;
        }
        ys.value=cy.toString();
        console.log('✅ 初始化年份選擇器:', yid, '當前值:', ys.value);
    }
    
    if(!ms){
        console.warn('⚠️ 找不到月份選擇器:', mid);
        // 如果找不到，嘗試多次重試（增加重試次數和間隔）
        let retryCount = 0;
        const maxRetries = 8; // 增加到8次
        const retryInterval = 150; // 增加到150ms
        
        const retryInitMonth = () => {
            retryCount++;
            const retryMs = document.getElementById(mid);
            if(retryMs){
                const mn=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
                const cm=new Date().getMonth()+1;
                retryMs.innerHTML='';
                for(let i=1;i<=12;i++){
                    retryMs.innerHTML+=`<option value="${i}" ${i===cm?'selected':''}>${mn[i-1]}</option>`;
                }
                retryMs.value=cm.toString();
                console.log(`✅ 初始化月份選擇器（重試 ${retryCount}/${maxRetries} 成功）:`, mid, '當前值:', retryMs.value);
            } else if(retryCount < maxRetries){
                console.log(`🔄 重試初始化月份選擇器 (${retryCount}/${maxRetries}):`, mid);
                setTimeout(retryInitMonth, retryInterval);
            } else {
                console.error('❌ 多次重試後仍找不到月份選擇器:', mid);
                console.error('🔍 最終調試信息:', {
                    elementId: mid,
                    elementExists: !!document.getElementById(mid),
                    parentSection: document.getElementById(mid)?.closest('.interface-section')?.id
                });
            }
        };
        setTimeout(retryInitMonth, retryInterval);
    } else {
        const mn=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
        const cm=new Date().getMonth()+1;
        ms.innerHTML='';
        for(let i=1;i<=12;i++){
            ms.innerHTML+=`<option value="${i}" ${i===cm?'selected':''}>${mn[i-1]}</option>`;
        }
        ms.value=cm.toString();
        console.log('✅ 初始化月份選擇器:', mid, '當前值:', ms.value);
    }
}

// 員工選擇變更處理函數 - 直接定義為 window 方法
window.onSupervisorEmployeeSelectChange = function() {
    // 員工選擇改變時清空顯示
    const rosterDisplay = document.getElementById('supervisorRosterDisplay');
    const workHoursDisplay = document.getElementById('supervisorWorkHoursDisplay');
    if (rosterDisplay) rosterDisplay.innerHTML = '<div class="empty">請選擇月份並點擊「載入更表」</div>';
    if (workHoursDisplay) workHoursDisplay.innerHTML = '<div class="empty">請選擇年份和月份並點擊「載入工時」</div>';
};

window.onAdminEmployeeSelectChange = function() {
    // 員工選擇改變時清空顯示
    const rosterDisplay = document.getElementById('adminRosterDisplay');
    const workHoursDisplay = document.getElementById('adminWorkHoursDisplay');
    if (rosterDisplay) rosterDisplay.innerHTML = '<div class="empty">請選擇月份並點擊「載入更表」</div>';
    if (workHoursDisplay) workHoursDisplay.innerHTML = '<div class="empty">請選擇年份和月份並點擊「載入工時」</div>';
};


async function renderWorkHoursSummaryTable() {
  // ✅ 使用全局變量或嘗試查找正確的元素
  const zone = window.currentDataTableZone ||
               document.getElementById('supervisorDataTableZone') ||
               document.getElementById('adminDataTableZone') ||
               document.getElementById('dataTableZone');
  
  if (!zone) {
    console.error('❌ 找不到資料表格區域 (dataTableZone)');
    return;
  }
  
  zone.innerHTML = '<div class="loading">正在加載工時記錄...</div>';
  const employees = await window.App.getEmployees();
  const year = new Date().getFullYear(), month = new Date().getMonth()+1;
  
  // ✅ 優化：並行加載所有員工的工時數據
  const workHoursPromises = employees.map(emp => 
    window.App.fetchStaffWorkHours(emp.phone, year, month)
      .then(list => ({ emp, rows: list || [] }))
      .catch(error => {
        console.error(`❌ 獲取${emp.name}的工時記錄失敗:`, error);
        return { emp, rows: [] };
      })
  );
  
  // 等待所有請求完成
  const empRows = (await Promise.all(workHoursPromises))
    .filter(({ rows }) => rows && rows.length > 0);
  
  // 彙整所有地點泳會
  let allLocClubs = new Set(), allDates = new Set();
  empRows.forEach(({ rows }) => {
    rows.forEach(r => {
      if(r.location && r.club) allLocClubs.add(`${r.location}@${r.club}`);
      if(r.workDate) allDates.add(r.workDate);
    });
  });
  allLocClubs = [...allLocClubs].sort();
  allDates = [...allDates].sort();
  let html = '';
  for(const {emp, rows} of empRows) {
    // 員工姓名變為可點擊，點擊後跳轉到工時管理模塊
    html += `<div class="workhours-summary-block"><h4><a href="javascript:void(0)" onclick="navigateToWorkHours('${emp.phone}')" style="color: #007bff; text-decoration: underline; cursor: pointer;">${emp.name}</a></h4><div style="overflow:auto">`;
    html += '<table class="data-data-table"><thead><tr><th>日期</th>'+allLocClubs.map(lc=>`<th>${lc.replace('@','<br>')}</th>`).join('')+'<th>每日小計</th></tr></thead><tbody>';
    for(const d of allDates) {
      let row = `<td>${d}</td>`, rowSum = 0, hasContent = false;
      for(const lc of allLocClubs) {
        const [loc, club] = lc.split('@');
        const rec = rows.find(r=>r.workDate===d && r.location===loc && r.club===club);
        let val = rec && rec.totalHours ? +rec.totalHours : '';
        rowSum += Number(val)||0;
        if(Number(val)>0) hasContent = true;
        row += `<td>${val||''}</td>`;
      }
      if(hasContent)
        html += `<tr>${row}<td>${rowSum?rowSum:''}</td></tr>`;
    }
    let sumRow = '<td>總計</td>'; let totalAll = 0;
    for(const lc of allLocClubs) {
      const [loc, club] = lc.split('@');
      let sum = rows.filter(r=>r.location===loc && r.club===club).reduce((acc,r)=>acc+(Number(r.totalHours)||0),0);
      totalAll += sum;
      sumRow += `<td>${sum?sum:''}</td>`;
    }
    sumRow += `<td>${totalAll||''}</td>`;
    html += `<tr style="background:#f3f4f6;font-weight:bold">${sumRow}</tr>`;
    html += '</tbody></table></div></div>';
  }
  if(!html) html = '<div class="empty">無工時資料</div>';
  zone.innerHTML = html;
}

async function renderRosterSummaryTable() {
  // ✅ 使用全局變量或嘗試查找正確的元素
  const zone = window.currentDataTableZone ||
               document.getElementById('supervisorDataTableZone') ||
               document.getElementById('adminDataTableZone') ||
               document.getElementById('dataTableZone');
  
  if (!zone) {
    console.error('❌ 找不到資料表格區域 (dataTableZone)');
    return;
  }
  
  // ✅ 先保存篩選器（如果存在）
  const existingFilterContainer = zone.querySelector('.roster-summary-filters');
  const savedFilter = existingFilterContainer ? existingFilterContainer.outerHTML : '';
  
  // ✅ 清空整個區域（避免重複顯示）
  zone.innerHTML = '';
  
  // ✅ 恢復篩選器（如果存在）
  if (savedFilter) {
    zone.innerHTML = savedFilter;
  }
  
  // ✅ 渲染篩選器（如果還沒有）
  renderRosterSummaryFilters(zone);
  
  // ✅ 獲取選中的年月（從全局變量或使用當前月份）
  const currentDate = new Date();
  const selectedYear = window.currentRosterSummaryYear || currentDate.getFullYear();
  const selectedMonth = window.currentRosterSummaryMonth || (currentDate.getMonth() + 1);
  const year = selectedYear;
  const month = selectedMonth;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  
  // ✅ 找到或創建內容區域
  let contentZone = zone.querySelector('.roster-summary-content');
  if (!contentZone) {
    // 如果沒有單獨的內容區域，創建一個
    contentZone = document.createElement('div');
    contentZone.className = 'roster-summary-content';
    zone.appendChild(contentZone);
  }
  contentZone.innerHTML = '<div class="loading">正在加載教練更表...</div>';
  
  const employees = await window.App.getEmployees();
  
  // ✅ 顯示所有員工（不只是教練），然後並行加載所有員工的更表數據（選中月份）
  // 獲取選中月份的數據
  const rosterPromises = employees.map(async emp => {
    try {
      // ✅ 獲取當前月份的數據
      const rosterData = await window.App.fetchRoster(monthStr, emp.phone);
        // 處理不同格式的返回值
      let rosterList = [];
      if (Array.isArray(rosterData)) {
        rosterList = rosterData;
      } else if (rosterData && rosterData.roster && Array.isArray(rosterData.roster)) {
        rosterList = rosterData.roster;
      } else if (rosterData && rosterData.success && rosterData.roster) {
        rosterList = rosterData.roster;
      }
      
      // ✅ 計算當前月份統計：使用 isClicked 字段判斷上班和請假
      const workDays = new Set(); // 上班日期（去重）
      const leaveDays = new Set(); // 請假日期（去重）
      
      rosterList.forEach(item => {
        const dateStr = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
        if (!dateStr) return;
        
        // ✅ 檢查日期是否屬於當前月份
        const itemDate = new Date(dateStr);
        if (itemDate.getFullYear() !== year || (itemDate.getMonth() + 1) !== month) {
          return; // 跳過非當前月份的記錄
        }
        
        // ✅ 使用 isClicked 字段判斷
        if (item.isClicked === true) {
          // 請假（isClicked = true）
          leaveDays.add(dateStr);
        } else if (item.isClicked === false && item.location && item.location.trim() !== '') {
          // 上班（isClicked = false 且有地點）
          workDays.add(dateStr);
        }
      });
      
      return { 
        emp, 
        roster: rosterList || [],
        workCount: workDays.size,
        leaveCount: leaveDays.size,
        leaveDates: Array.from(leaveDays).sort()
      };
    } catch (error) {
        console.error(`❌ 獲取${emp.name}的更表失敗:`, error);
      return { emp, roster: [], workCount: 0, leaveCount: 0, leaveDates: [] };
    }
  });
  
  // 等待所有請求完成
  const empRows = await Promise.all(rosterPromises);
  
  // ✅ 顯示所有員工，即使沒有更表數據也顯示（確保員工齊全）
  // 按員工類型排序：coach 優先，然後按姓名排序
  const sortedEmpRows = empRows.sort((a, b) => {
    const typeA = a.emp.type || a.emp.userType || '';
    const typeB = b.emp.type || b.emp.userType || '';
    if (typeA === 'coach' && typeB !== 'coach') return -1;
    if (typeA !== 'coach' && typeB === 'coach') return 1;
    return (a.emp.name || '').localeCompare(b.emp.name || '');
  });
  
  // ✅ 確保內容區域存在（使用之前聲明的 contentZone）
  if (!contentZone) {
    contentZone = zone.querySelector('.roster-summary-content') || zone;
  }
  
  if (sortedEmpRows.length === 0) {
    contentZone.innerHTML = `<div class="empty">${year}年${month}月無更表資料</div>`;
    return;
  }
  
  let html = `<div style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 5px;">`;
  html += `<strong>統計月份：${year}年${month}月</strong> <span style="color: #6b7280; font-size: 12px;">(共 ${sortedEmpRows.length} 位員工)</span>`;
  html += `</div>`;
  
  for(const {emp, roster, workCount, leaveCount, leaveDates} of sortedEmpRows) {
    // 員工姓名變為可點擊，點擊後跳轉到教練更表模塊
    html += `<div class="roster-summary-block" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">`;
    html += `<h4><a href="javascript:void(0)" onclick="navigateToRoster('${emp.phone}')" style="color: #007bff; text-decoration: underline; cursor: pointer;">${emp.name}</a> <span style="color: #6b7280; font-size: 12px;">(${emp.type || emp.userType || '未知'})</span></h4>`;
    
    // ✅ 顯示當前月份統計
    html += `<div style="margin-bottom: 10px; padding: 10px; background: #f3f4f6; border-radius: 5px;">`;
    html += `<strong>${year}年${month}月統計：</strong>`;
    html += `<span style="margin-left: 15px;">上班日數：<strong style="color: #059669;">${workCount}</strong> 天</span>`;
    
    // ✅ 請假列可點擊，顯示請假日期
    if (leaveCount > 0) {
      // ✅ 轉義單引號，避免JavaScript錯誤
      const escapedName = emp.name.replace(/'/g, "\\'");
      const escapedPhone = emp.phone.replace(/'/g, "\\'");
      const leaveDatesArray = leaveDates.map(d => `'${d.replace(/'/g, "\\'")}'`).join(',');
      html += `<span style="margin-left: 15px;">請假日數：<a href="javascript:void(0)" onclick="showEmployeeLeaveDates('${escapedPhone}', '${escapedName}', ${leaveCount}, [${leaveDatesArray}])" style="color: #dc3545; text-decoration: underline; cursor: pointer; font-weight: bold;" title="點擊查看請假日期">${leaveCount}</a> 天</span>`;
    } else {
      html += `<span style="margin-left: 15px;">請假日數：<strong style="color: #6b7280;">${leaveCount}</strong> 天</span>`;
    }
    html += `</div>`;
    
    // 按日期分組（只顯示當前月份的數據）
    const byDate = {};
    roster.forEach(item => {
      const dateStr = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
      if (!dateStr) return;
      const itemDate = new Date(dateStr);
      // ✅ 只顯示當前月份的數據
      if (itemDate.getFullYear() === year && (itemDate.getMonth() + 1) === month) {
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push(item);
      }
    });
    
    const dates = Object.keys(byDate).sort();
    if (dates.length > 0) {
      html += '<table class="data-data-table" style="margin-top: 10px;"><thead><tr><th>日期</th><th>時段</th><th>時間</th><th>地點</th><th>狀態</th></tr></thead><tbody>';
      for(const dateStr of dates) {
        const items = byDate[dateStr];
        const date = new Date(dateStr);
        const dateDisplay = `${date.getMonth() + 1}/${date.getDate()}`;
        
        items.forEach((item, idx) => {
          const slotName = item.slot === 1 ? '上午' : item.slot === 2 ? '中午' : item.slot === 3 ? '下午' : '未知';
          const unavailable = item.unavailable ? '不上班' : '';
          const status = unavailable || (item.isSubmitted ? '已提交' : '未提交');
          html += `<tr>`;
          if (idx === 0) {
            html += `<td rowspan="${items.length}">${dateDisplay}</td>`;
          }
          html += `<td>${slotName}</td>`;
          html += `<td>${item.time || ''}</td>`;
          html += `<td>${item.location || ''}</td>`;
          html += `<td>${status}</td>`;
          html += `</tr>`;
        });
      }
      html += '</tbody></table>';
    } else {
      html += '<p style="color: #999; font-size: 14px;">本月暫無更表資料</p>';
    }
    html += '</div>';
  }
  
  // ✅ 更新內容區域
  if (!contentZone) {
    contentZone = zone.querySelector('.roster-summary-content') || zone;
  }
  contentZone.innerHTML = html;
}

/**
 * 渲染教練更表統計的篩選器（年份和月份選擇）
 */
function renderRosterSummaryFilters(zone) {
  // ✅ 檢查是否已經有篩選器，避免重複創建
  let filterContainer = zone.querySelector('.roster-summary-filters');
  
  if (!filterContainer) {
    // 創建篩選器容器
    filterContainer = document.createElement('div');
    filterContainer.className = 'roster-summary-filters';
    filterContainer.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; margin-bottom: 16px; flex-wrap: wrap;';
    
    // 插入到 zone 的最前面
    if (zone.firstChild) {
      zone.insertBefore(filterContainer, zone.firstChild);
    } else {
      zone.appendChild(filterContainer);
    }
    
    // 創建標籤
    const label = document.createElement('label');
    label.textContent = '選擇月份：';
    label.style.cssText = 'font-weight: bold; color: #374151;';
    filterContainer.appendChild(label);
    
    // 創建年份選擇器
    const yearSelect = document.createElement('select');
    yearSelect.id = 'rosterSummaryYearSelect';
    yearSelect.style.cssText = 'padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
    
    const currentYear = new Date().getFullYear();
    const selectedYear = window.currentRosterSummaryYear || currentYear;
    
    // 生成年份選項（當前年份前後2年）
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      const option = document.createElement('option');
      option.value = y;
      option.textContent = `${y}年`;
      if (y === selectedYear) {
        option.selected = true;
      }
      yearSelect.appendChild(option);
    }
    
    yearSelect.addEventListener('change', () => {
      window.currentRosterSummaryYear = parseInt(yearSelect.value);
      console.log('🔄 教練更表統計年份變更:', window.currentRosterSummaryYear);
      renderRosterSummaryTable();
    });
    
    filterContainer.appendChild(yearSelect);
    
    // 創建月份選擇器
    const monthSelect = document.createElement('select');
    monthSelect.id = 'rosterSummaryMonthSelect';
    monthSelect.style.cssText = 'padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
    
    const currentMonth = new Date().getMonth() + 1;
    const selectedMonth = window.currentRosterSummaryMonth || currentMonth;
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                       '七月', '八月', '九月', '十月', '十一月', '十二月'];
    
    for (let i = 1; i <= 12; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = monthNames[i - 1];
      if (i === selectedMonth) {
        option.selected = true;
      }
      monthSelect.appendChild(option);
    }
    
    monthSelect.addEventListener('change', () => {
      window.currentRosterSummaryMonth = parseInt(monthSelect.value);
      console.log('🔄 教練更表統計月份變更:', window.currentRosterSummaryMonth);
      renderRosterSummaryTable();
    });
    
    filterContainer.appendChild(monthSelect);
    
    // 創建"重置為當前月份"按鈕
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置為當前月份';
    resetBtn.style.cssText = 'padding: 6px 12px; border: 1px solid #6b7280; border-radius: 4px; background: white; color: #6b7280; cursor: pointer; font-size: 12px;';
    resetBtn.addEventListener('click', () => {
      const now = new Date();
      window.currentRosterSummaryYear = now.getFullYear();
      window.currentRosterSummaryMonth = now.getMonth() + 1;
      yearSelect.value = window.currentRosterSummaryYear;
      monthSelect.value = window.currentRosterSummaryMonth;
      console.log('🔄 重置為當前月份:', window.currentRosterSummaryYear, window.currentRosterSummaryMonth);
      renderRosterSummaryTable();
    });
    filterContainer.appendChild(resetBtn);
  } else {
    // ✅ 如果篩選器已存在，更新選中值
    const yearSelect = filterContainer.querySelector('#rosterSummaryYearSelect');
    const monthSelect = filterContainer.querySelector('#rosterSummaryMonthSelect');
    
    if (yearSelect) {
      const selectedYear = window.currentRosterSummaryYear || new Date().getFullYear();
      yearSelect.value = selectedYear;
    }
    if (monthSelect) {
      const selectedMonth = window.currentRosterSummaryMonth || (new Date().getMonth() + 1);
      monthSelect.value = selectedMonth;
    }
  }
}

// ✅ 顯示員工請假日期
function showEmployeeLeaveDates(phone, name, count, leaveDates) {
  const modal = document.createElement('div');
  modal.id = 'employeeLeaveDatesModal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
  
  const title = document.createElement('h3');
  title.textContent = `${name} 請假日期 (共 ${count} 天)`;
  title.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: #333;';
  
  const datesList = document.createElement('div');
  datesList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
  
  leaveDates.forEach(date => {
    const dateItem = document.createElement('div');
    dateItem.style.cssText = 'padding: 10px 12px; background: #f5f5f5; border-radius: 4px;';
    const dateObj = new Date(date);
    const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
    dateItem.textContent = formattedDate;
    datesList.appendChild(dateItem);
  });
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '關閉';
  closeBtn.style.cssText = 'margin-top: 16px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;';
  closeBtn.addEventListener('click', () => { modal.remove(); });
  
  modalContent.appendChild(title);
  modalContent.appendChild(datesList);
  modalContent.appendChild(closeBtn);
  modal.appendChild(modalContent);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  document.body.appendChild(modal);
}

// 導出到全局作用域
window.showEmployeeLeaveDates = showEmployeeLeaveDates;

// 導航到工時管理模塊並選擇特定員工
window.navigateToWorkHours = function(phone) {
  // 根據當前用戶類型決定跳轉到哪個工時管理界面
  const userType = window.App ? window.App.getCurrentUserType() : '';
  
  if (userType === 'supervisor' || userType === 'admin' || userType === 'manager') {
    // 顯示主管/管理員工時管理界面
    if (typeof window.showSupervisorWorkHours === 'function') {
      window.showSupervisorWorkHours();
      
      // 等待界面加載完成後選擇員工並載入數據
      setTimeout(() => {
        // 主管頁面使用 supervisorWorkHoursEmployeeSelect，管理員頁面使用 workHoursEmployeeSelect
        const employeeSelect = document.getElementById('supervisorWorkHoursEmployeeSelect') || 
                               document.getElementById('workHoursEmployeeSelect');
        
        if (employeeSelect) {
          employeeSelect.value = phone;
          console.log('✅ 已設置員工選擇器值:', phone);
          
          // 觸發變更事件以載入該員工的工時記錄
          if (window.WorkHoursFunctions && window.WorkHoursFunctions.onEmployeeChange) {
            window.WorkHoursFunctions.onEmployeeChange();
            console.log('✅ 已觸發員工變更事件，開始載入工時記錄');
          } else if (window.WorkHoursFunctions && window.WorkHoursFunctions.loadWorkHoursData) {
            // 如果 onEmployeeChange 不存在，直接調用 loadWorkHoursData
            window.WorkHoursFunctions.loadWorkHoursData();
            console.log('✅ 直接調用載入工時記錄函數');
          } else {
            console.error('❌ 找不到工時記錄載入函數');
          }
        } else {
          console.error('❌ 找不到員工選擇器');
        }
      }, 500); // 增加延遲時間確保DOM完全渲染
    }
  } else if (userType === 'coach') {
    // 教練只能查看自己的工時記錄
    if (typeof window.showWorkHours === 'function') {
      window.showWorkHours();
    }
  }
};

// 導航到教練更表模塊並選擇特定員工
window.navigateToRoster = function(phone) {
  // 根據當前用戶類型決定跳轉到哪個更表界面
  const userType = window.App ? window.App.getCurrentUserType() : '';
  
  if (userType === 'supervisor' || userType === 'admin' || userType === 'manager') {
    // 顯示主管/管理員更表界面
    if (typeof window.showStaffRoster === 'function') {
      window.showStaffRoster();
      
      // 等待界面加載完成後選擇員工並載入數據
      setTimeout(() => {
        if (userType === 'supervisor' || userType === 'manager') {
          // 主管/管理員頁面使用 staffCoachSelect（manager與主管權限相同）
          const employeeSelect = document.getElementById('staffCoachSelect');
          
          if (employeeSelect) {
            employeeSelect.value = phone;
            console.log('✅ 已設置主管更表員工選擇器值:', phone);
            
            // 觸發變更事件（會調用 onChangeStaffCoach，進而調用 renderCoachRoster）
            const changeEvent = new Event('change', { bubbles: true });
            employeeSelect.dispatchEvent(changeEvent);
            
            // 同時直接調用載入函數確保數據被載入
            setTimeout(() => {
              if (window.renderCoachRoster) {
                window.renderCoachRoster(phone);
                console.log('✅ 已調用 renderCoachRoster 載入更表');
              }
            }, 200);
          } else {
            console.error('❌ 找不到主管更表員工選擇器，直接調用 renderCoachRoster');
            // 如果找不到選擇器，直接調用載入函數
            setTimeout(() => {
              if (window.renderCoachRoster) {
                window.renderCoachRoster(phone);
                console.log('✅ 直接調用 renderCoachRoster 載入更表');
              }
            }, 300);
          }
        } else if (userType === 'admin' || userType === 'manager') {
          // 文書職員/管理員頁面：只能查看自己的更表，但我們仍然嘗試載入指定員工的更表
          console.log(`ℹ️ ${userType === 'admin' ? '文書職員' : '管理員'}頁面：嘗試載入員工更表`, phone);
          // 文書職員/管理員頁面可能需要不同的處理邏輯
          if (window.renderCoachRoster) {
            setTimeout(() => {
              window.renderCoachRoster(phone);
              console.log('✅ 已調用 renderCoachRoster 載入更表（管理員頁面）');
            }, 300);
          }
        }
      }, 600); // 增加延遲時間確保DOM完全渲染和初始化完成
    }
  } else if (userType === 'coach') {
    // 教練只能查看自己的更表
    if (typeof window.showCoachRoster === 'function') {
      window.showCoachRoster();
    }
  }
};

/**
 * 切換側邊欄顯示/隱藏（移動端）
 */
function toggleSidebar(userType) {
    const sidebarId = `${userType}Sidebar`;
    const sidebar = document.getElementById(sidebarId);
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!sidebar) return;
    
    // 創建遮罩層（如果不存在）
    if (!overlay) {
        const newOverlay = document.createElement('div');
        newOverlay.id = 'sidebarOverlay';
        newOverlay.className = 'sidebar-overlay';
        newOverlay.onclick = () => toggleSidebar(userType);
        document.body.appendChild(newOverlay);
    }
    
    const currentOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (currentOverlay) currentOverlay.classList.remove('active');
    } else {
        sidebar.classList.add('open');
        if (currentOverlay) currentOverlay.classList.add('active');
    }
}

/**
 * 初始化側邊欄導航項點擊事件
 */
function initSidebarNavigation() {
    // 為所有側邊欄導航項添加點擊事件
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const feature = this.getAttribute('data-feature');
            
            if (!feature) return;
            
            // 移除當前section中所有側邊欄項的活動狀態
            const currentSection = this.closest('.section');
            if (currentSection) {
                currentSection.querySelectorAll('.sidebar-item').forEach(nav => {
                    nav.classList.remove('active');
                });
            }
            
            // 添加活動狀態到當前項
            this.classList.add('active');
            
            // 觸發功能切換 - 由於已有全局點擊事件監聽器，直接觸發即可
            // 這會自動調用相應的功能函數
            const featureCard = document.querySelector(`[data-feature="${feature}"]`);
            if (featureCard) {
                featureCard.click();
            } else {
                // 如果找不到對應的feature-card，創建一個臨時元素觸發事件
                const tempElement = document.createElement('div');
                tempElement.setAttribute('data-feature', feature);
                tempElement.style.display = 'none';
                document.body.appendChild(tempElement);
                tempElement.click();
                document.body.removeChild(tempElement);
            }
            
            // 移動端：點擊後自動關閉側邊欄
            if (window.innerWidth <= 768) {
                const userType = currentSection?.id.replace('Section', '') || '';
                if (userType) {
                    toggleSidebar(userType);
                }
            }
        });
    });
    
    // 監聽功能切換，自動更新側邊欄活動狀態
    document.addEventListener('click', function(e) {
        if (e.target.closest('[data-feature]')) {
            const feature = e.target.closest('[data-feature]').getAttribute('data-feature');
            const activeSection = document.querySelector('.section.active');
            if (activeSection && feature) {
                // 移除所有活動狀態
                activeSection.querySelectorAll('.sidebar-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                
                // 添加活動狀態到對應的側邊欄項
                const sidebarItem = activeSection.querySelector(`.sidebar-item[data-feature="${feature}"]`);
                if (sidebarItem) {
                    sidebarItem.classList.add('active');
                }
            }
        }
    });
}

// ✅ 綁定普通用戶出席管理的刪除按鈕事件
function bindAttendanceDeleteButtons() {
    const deleteBtn = document.getElementById('deleteAttendance');
    const confirmDeleteBtn = document.getElementById('confirmDeleteAttendance');
    const cancelDeleteBtn = document.getElementById('cancelDeleteAttendance');
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            window.enableDeleteMode('attendanceTable');
            deleteBtn.style.display = 'none';
            if (confirmDeleteBtn) confirmDeleteBtn.style.display = 'inline-block';
            if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'inline-block';
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            await window.confirmDeleteRecords('attendanceTable');
            confirmDeleteBtn.style.display = 'none';
            if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            window.disableDeleteMode('attendanceTable');
            cancelDeleteBtn.style.display = 'none';
            if (confirmDeleteBtn) confirmDeleteBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
        });
    }
}

// ✅ 綁定待補創建按鈕事件
function bindCreatePendingClassButtons() {
    // ✅ 資料管理頁面的按鈕（保留以向後兼容，但可以隱藏）
    const createBtnSupervisor = document.getElementById('createPendingClassSupervisor');
    const createBtnAdmin = document.getElementById('createPendingClassAdmin');
    
    // ✅ 出席管理頁面的按鈕（新增）
    const createBtnAttendance = document.getElementById('createPendingClassAttendance');
    const createBtnSupervisorAttendance = document.getElementById('createPendingClassSupervisorAttendance');
    
    // ✅ 綁定資料管理頁面的按鈕（如果存在）
    if (createBtnSupervisor) {
        const newBtnSupervisor = createBtnSupervisor.cloneNode(true);
        createBtnSupervisor.parentNode.replaceChild(newBtnSupervisor, createBtnSupervisor);
        newBtnSupervisor.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ 點擊待補創建按鈕（主管-資料管理）');
            openCreatePendingClassModal();
        });
    }
    
    if (createBtnAdmin) {
        const newBtnAdmin = createBtnAdmin.cloneNode(true);
        createBtnAdmin.parentNode.replaceChild(newBtnAdmin, createBtnAdmin);
        newBtnAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ 點擊待補創建按鈕（管理員-資料管理）');
            openCreatePendingClassModal();
        });
    }
    
    // ✅ 綁定出席管理頁面的按鈕（只有主管和管理員的出席管理頁面才有此功能）
    // 注意：教練頁面的出席管理沒有此功能，所以不綁定 createBtnAttendance
    // createBtnAttendance 是教練頁面的按鈕，應該被移除（已在HTML中移除）
    
    if (createBtnSupervisorAttendance) {
        const newBtnSupervisorAttendance = createBtnSupervisorAttendance.cloneNode(true);
        createBtnSupervisorAttendance.parentNode.replaceChild(newBtnSupervisorAttendance, createBtnSupervisorAttendance);
        newBtnSupervisorAttendance.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ 點擊待補創建按鈕（主管/管理員-出席管理）');
            openCreatePendingClassModal();
        });
    }
    
    // ✅ 綁定學生ID輸入框的change事件，自動填充姓名和電話
    const studentIdInput = document.getElementById('pendingClassStudentId');
    if (studentIdInput) {
        // 移除舊的事件監聽器
        const newStudentIdInput = studentIdInput.cloneNode(true);
        studentIdInput.parentNode.replaceChild(newStudentIdInput, studentIdInput);
        newStudentIdInput.addEventListener('change', async () => {
            await loadStudentInfoForPendingClass();
        });
    }
    
    // ✅ 綁定電話輸入框的change事件，自動填充學生資料
    const phoneInput = document.getElementById('pendingClassPhone');
    if (phoneInput) {
        // 移除舊的事件監聽器
        const newPhoneInput = phoneInput.cloneNode(true);
        phoneInput.parentNode.replaceChild(newPhoneInput, phoneInput);
        newPhoneInput.addEventListener('change', async () => {
            await loadStudentInfoByPhone();
        });
    }
    
    // ✅ 綁定學生ID下拉選擇框的change事件
    const studentIdSelect = document.getElementById('pendingClassStudentIdSelect');
    if (studentIdSelect) {
        studentIdSelect.addEventListener('change', async () => {
            await loadStudentInfoForPendingClassFromSelect();
        });
    }
}

// ✅ 打開待補創建模態窗口
async function openCreatePendingClassModal() {
    console.log('🔍 嘗試打開待補創建模態窗口...');
    let modal = document.getElementById('createPendingClassModal');
    
    // ✅ 如果模態窗口不存在，動態創建它
    if (!modal) {
        console.warn('⚠️ 模態窗口不存在，正在動態創建...');
        modal = document.createElement('div');
        modal.id = 'createPendingClassModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-plus-circle"></i> 待補創建</h3>
                    <button class="modal-close" onclick="closeCreatePendingClassModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>學生ID <span style="color: red;">*</span></label>
                        <input type="text" id="pendingClassStudentId" class="form-control" placeholder="輸入學生ID" />
                        <div id="pendingClassNoSlotsWarning" style="display: none; color: #dc3545; font-size: 12px; margin-top: 4px;">
                            <i class="fas fa-exclamation-triangle"></i> 沒有多餘的堂數可以創建
                        </div>
                    </div>
                    <div class="form-group">
                        <label>姓名</label>
                        <input type="text" id="pendingClassName" class="form-control" readonly />
                    </div>
                    <div class="form-group">
                        <label>電話 <span style="color: red;">*</span></label>
                        <input type="text" id="pendingClassPhone" class="form-control" placeholder="輸入電話號碼" />
                    </div>
                    <div id="pendingClassStudentSelector" class="form-group" style="display: none;">
                        <label>學生ID <span style="color: red;">*</span></label>
                        <select id="pendingClassStudentIdSelect" class="form-control">
                            <option value="">請選擇學生ID</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>日期 <span style="color: red;">*</span></label>
                        <input type="date" id="pendingClassDate" class="form-control" />
                    </div>
                    <div class="form-group">
                        <label>課程類型 <span style="color: red;">*</span></label>
                        <select id="pendingClassCourseType" class="form-control">
                            <option value="">請選擇課程類型</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>時間 <span style="color: red;">*</span> (格式: hhmm-hhmm)</label>
                        <input type="text" id="pendingClassTime" class="form-control" placeholder="例如: 0900-1000" pattern="[0-9]{4}-[0-9]{4}" />
                    </div>
                    <div class="form-group">
                        <label>地點 <span style="color: red;">*</span></label>
                        <select id="pendingClassLocation" class="form-control">
                            <option value="">請選擇地點</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeCreatePendingClassModal()" class="btn-secondary">取消</button>
                    <button onclick="confirmCreatePendingClass()" class="btn-primary">創建</button>
                </div>
            </div>
        `;
        // ✅ 將模態窗口添加到body的最後，確保它在最上層
        document.body.appendChild(modal);
        console.log('✅ 模態窗口已動態創建');
    }
    
    // ✅ 確保模態窗口在body的直接子元素中（不在任何section內）
    if (modal.parentElement !== document.body) {
        console.warn('⚠️ 模態窗口不在body中，正在移動...');
        document.body.appendChild(modal);
    }
    
    console.log('✅ 找到待補創建模態窗口，正在打開...');
    
    // ✅ 使用多種方式確保模態窗口顯示
    modal.style.display = 'block';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.classList.add('show');
    modal.classList.remove('hidden');
    
    // 確保模態窗口在最上層
    modal.style.zIndex = '10000';
    
    // 清空表單
    const studentIdInput = document.getElementById('pendingClassStudentId');
    const studentIdSelect = document.getElementById('pendingClassStudentIdSelect');
    const studentIdSelectContainer = document.getElementById('pendingClassStudentSelector');
    const studentIdInputContainer = studentIdInput ? studentIdInput.closest('.form-group') : null;
    const nameInput = document.getElementById('pendingClassName');
    const phoneInput = document.getElementById('pendingClassPhone');
    const dateInput = document.getElementById('pendingClassDate');
    const courseTypeSelect = document.getElementById('pendingClassCourseType');
    const timeInput = document.getElementById('pendingClassTime');
    const locationSelect = document.getElementById('pendingClassLocation');
    const warningDiv = document.getElementById('pendingClassNoSlotsWarning');
    
    if (studentIdInput) studentIdInput.value = '';
    if (studentIdSelect) {
        studentIdSelect.innerHTML = '<option value="">請選擇學生ID</option>';
        studentIdSelect.value = '';
    }
    if (studentIdSelectContainer) studentIdSelectContainer.style.display = 'none';
    if (studentIdInputContainer) studentIdInputContainer.style.display = 'block';
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (dateInput) dateInput.value = '';
    if (courseTypeSelect) courseTypeSelect.innerHTML = '<option value="">請選擇課程類型</option>';
    if (timeInput) timeInput.value = '';
    if (locationSelect) locationSelect.innerHTML = '<option value="">請選擇地點</option>';
    if (warningDiv) warningDiv.style.display = 'none';
    
    // ✅ 加載地點選項
    if (locationSelect && window.App && typeof window.App.fetchClassLocations === 'function') {
        try {
            const locations = await window.App.fetchClassLocations();
            if (locations && locations.length > 0) {
                locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location;
                    option.textContent = location;
                    locationSelect.appendChild(option);
                });
                console.log(`✅ 已加載 ${locations.length} 個地點選項到待補創建模態窗口`);
            }
        } catch (error) {
            console.error('❌ 加載地點選項失敗:', error);
        }
    }
    
    // ✅ 點擊模態窗口外部關閉窗口（移除舊的監聽器，避免重複綁定）
    const modalClickHandler = function(e) {
        if (e.target === modal) {
            closeCreatePendingClassModal();
        }
    };
    
    // 移除舊的監聽器（如果存在）
    modal.removeEventListener('click', modalClickHandler);
    modal.addEventListener('click', modalClickHandler);
    
    // ✅ 防止點擊模態內容區域時關閉窗口
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        const contentClickHandler = function(e) {
            e.stopPropagation();
        };
        modalContent.removeEventListener('click', contentClickHandler);
        modalContent.addEventListener('click', contentClickHandler);
    }
    
    console.log('✅ 待補創建模態窗口已打開', {
        display: modal.style.display,
        visibility: modal.style.visibility,
        zIndex: modal.style.zIndex,
        hasShowClass: modal.classList.contains('show')
    });
}

// ✅ 關閉待補創建模態窗口
function closeCreatePendingClassModal() {
    const modal = document.getElementById('createPendingClassModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.classList.remove('show');
        console.log('✅ 待補創建模態窗口已關閉');
    }
}

// ✅ 根據電話號碼加載學生資料
async function loadStudentInfoByPhone() {
    const phoneInput = document.getElementById('pendingClassPhone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const studentIdInput = document.getElementById('pendingClassStudentId');
    const nameInput = document.getElementById('pendingClassName');
    const studentIdSelect = document.getElementById('pendingClassStudentIdSelect');
    const studentIdSelectContainer = document.getElementById('pendingClassStudentSelector');
    const studentIdInputContainer = studentIdInput ? studentIdInput.closest('.form-group') : null;
    const warningDiv = document.getElementById('pendingClassNoSlotsWarning');
    
    if (!phone) {
        if (nameInput) nameInput.value = '';
        if (studentIdInput) studentIdInput.value = '';
        if (studentIdSelect) studentIdSelect.innerHTML = '<option value="">請選擇學生ID</option>';
        if (studentIdSelectContainer) studentIdSelectContainer.style.display = 'none';
        if (studentIdInputContainer) studentIdInputContainer.style.display = 'block';
        if (warningDiv) warningDiv.style.display = 'none';
        return;
    }
    
    try {
        const db = window.App?.getDatabaseConnector();
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return;
        }
        
        // 根據電話號碼查詢學生
        const response = await fetch(`${db.baseUrl}/students?phone=${encodeURIComponent(phone)}`, {
            headers: db.getStandardHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        const students = result.students || [];
        
        if (students.length === 0) {
            // 沒有找到學生
            if (nameInput) nameInput.value = '';
            if (studentIdInput) studentIdInput.value = '';
            if (studentIdSelect) studentIdSelect.innerHTML = '<option value="">請選擇學生ID</option>';
            if (studentIdSelectContainer) studentIdSelectContainer.style.display = 'none';
            if (studentIdInputContainer) studentIdInputContainer.style.display = 'block';
            alert('未找到該電話號碼對應的學生資料');
            return;
        }
        
        if (students.length === 1) {
            // 只有一個學生，直接填充
            const student = students[0];
            if (nameInput) nameInput.value = student.name || '';
            if (studentIdInput) {
                studentIdInput.value = student.studentId || student.phone || '';
                // 觸發change事件以加載課程類型
                studentIdInput.dispatchEvent(new Event('change'));
            }
            if (studentIdSelectContainer) studentIdSelectContainer.style.display = 'none';
            if (studentIdInputContainer) studentIdInputContainer.style.display = 'block';
        } else {
            // 多個學生，顯示下拉選擇框
            if (studentIdSelect) {
                studentIdSelect.innerHTML = '<option value="">請選擇學生ID</option>';
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.studentId || student.phone || '';
                    option.textContent = `${student.studentId || student.phone || ''} - ${student.name || ''}`;
                    option.dataset.name = student.name || '';
                    studentIdSelect.appendChild(option);
                });
            }
            if (studentIdSelectContainer) studentIdSelectContainer.style.display = 'block';
            if (studentIdInputContainer) studentIdInputContainer.style.display = 'none';
            // 清空姓名，等待選擇學生ID後填充
            if (nameInput) nameInput.value = '';
        }
    } catch (error) {
        console.error('❌ 根據電話號碼查詢學生失敗:', error);
        alert('查詢學生資料失敗，請重試');
    }
}

// ✅ 從下拉選擇框加載學生信息
async function loadStudentInfoForPendingClassFromSelect() {
    const studentIdSelect = document.getElementById('pendingClassStudentIdSelect');
    const nameInput = document.getElementById('pendingClassName');
    const studentIdInput = document.getElementById('pendingClassStudentId');
    
    if (!studentIdSelect || !studentIdSelect.value) {
        if (nameInput) nameInput.value = '';
        return;
    }
    
    const selectedOption = studentIdSelect.options[studentIdSelect.selectedIndex];
    const studentId = studentIdSelect.value;
    const studentName = selectedOption ? selectedOption.dataset.name || '' : '';
    
    if (nameInput) nameInput.value = studentName;
    if (studentIdInput) {
        studentIdInput.value = studentId;
        // 觸發change事件以加載課程類型
        studentIdInput.dispatchEvent(new Event('change'));
    }
}

// ✅ 根據學生ID加載學生信息和課程類型，並檢測待約堂數
async function loadStudentInfoForPendingClass() {
    const studentIdInput = document.getElementById('pendingClassStudentId');
    const studentId = studentIdInput ? studentIdInput.value.trim() : '';
    const warningDiv = document.getElementById('pendingClassNoSlotsWarning');
    
    if (!studentId) {
        document.getElementById('pendingClassName').value = '';
        const phoneInput = document.getElementById('pendingClassPhone');
        if (phoneInput && !phoneInput.value.trim()) {
            phoneInput.value = '';
        }
        document.getElementById('pendingClassCourseType').innerHTML = '<option value="">請選擇課程類型</option>';
        if (warningDiv) warningDiv.style.display = 'none';
        return;
    }
    
    try {
        const db = window.App?.getDatabaseConnector();
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            return;
        }
        
        // 獲取學生基本信息
        const studentResponse = await fetch(`${db.baseUrl}/students/${studentId}`, {
            headers: db.getStandardHeaders()
        });
        
        if (studentResponse.ok) {
            const studentResult = await studentResponse.json();
            if (studentResult.success && studentResult.student) {
                const student = studentResult.student;
                document.getElementById('pendingClassName').value = student.name || '';
                document.getElementById('pendingClassPhone').value = student.phone || '';
            }
        }
        
        // 獲取該學生的課程類型（從students_timeslot中獲取）
        const timeslotResponse = await fetch(`${db.baseUrl}/student/${studentId}/course-types`, {
            headers: db.getStandardHeaders()
        });
        
        if (timeslotResponse.ok) {
            const timeslotResult = await timeslotResponse.json();
            if (timeslotResult.success && timeslotResult.courseTypes) {
                const courseTypeSelect = document.getElementById('pendingClassCourseType');
                courseTypeSelect.innerHTML = '<option value="">請選擇課程類型</option>';
                timeslotResult.courseTypes.forEach(courseType => {
                    const option = document.createElement('option');
                    option.value = courseType;
                    option.textContent = courseType;
                    courseTypeSelect.appendChild(option);
                });
            }
        }
        
        // ✅ 檢測該學生是否有多餘的待約堂數可以創建
        const pendingCheckResponse = await fetch(`${db.baseUrl}/student/${studentId}/pending-slots-check`, {
            headers: db.getStandardHeaders()
        });
        
        if (pendingCheckResponse.ok) {
            const pendingCheckResult = await pendingCheckResponse.json();
            if (pendingCheckResult.success !== undefined) {
                if (pendingCheckResult.hasPendingSlots === false) {
                    // 沒有多餘的待約堂數
                    if (warningDiv) {
                        warningDiv.style.display = 'block';
                    }
                    console.warn('⚠️ 該學生沒有多餘的待約堂數可以創建');
                } else {
                    // 有待約堂數
                    if (warningDiv) {
                        warningDiv.style.display = 'none';
                    }
                    console.log('✅ 該學生有待約堂數可以創建');
                }
            }
        } else {
            console.warn('⚠️ 檢查待約堂數失敗，但繼續允許創建');
            if (warningDiv) {
                warningDiv.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('❌ 加載學生信息失敗:', error);
        alert('加載學生信息失敗，請重試');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }
    }
}

// ✅ 確認創建待補課程
async function confirmCreatePendingClass() {
    // ✅ 優先從下拉選擇框獲取學生ID，如果沒有則從輸入框獲取
    const studentIdSelect = document.getElementById('pendingClassStudentIdSelect');
    const studentIdInput = document.getElementById('pendingClassStudentId');
    let studentId = '';
    
    const studentIdSelectContainer = document.getElementById('pendingClassStudentSelector');
    if (studentIdSelect && studentIdSelectContainer && studentIdSelectContainer.style.display !== 'none' && studentIdSelect.value) {
        studentId = studentIdSelect.value.trim();
    } else if (studentIdInput) {
        studentId = studentIdInput.value.trim();
    }
    const classDate = document.getElementById('pendingClassDate').value;
    const courseType = document.getElementById('pendingClassCourseType').value;
    const classTime = document.getElementById('pendingClassTime').value.trim();
    const location = document.getElementById('pendingClassLocation').value;
    
    if (!studentId) {
        alert('請輸入學生ID');
        return;
    }
    
    if (!classDate) {
        alert('請選擇日期');
        return;
    }
    
    if (!courseType) {
        alert('請選擇課程類型');
        return;
    }
    
    if (!classTime || !/^\d{4}-\d{4}$/.test(classTime)) {
        alert('請輸入正確的時間格式 (例如: 0900-1000)');
        return;
    }
    
    if (!location) {
        alert('請選擇地點');
        return;
    }
    
    // ✅ 檢查是否有待約堂數警告
    const warningDiv = document.getElementById('pendingClassNoSlotsWarning');
    if (warningDiv && warningDiv.style.display !== 'none') {
        const confirmCreate = confirm('該學生沒有多餘的待約堂數，確定要繼續創建嗎？');
        if (!confirmCreate) {
            return;
        }
    }
    
    try {
        const db = window.App?.getDatabaseConnector();
        if (!db) {
            console.error('❌ DatabaseConnector 未初始化');
            alert('系統錯誤，請刷新頁面重試');
            return;
        }
        
        const response = await fetch(`${db.baseUrl}/attendance/pending-class/create`, {
            method: 'POST',
            headers: {
                ...db.getStandardHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId,
                classDate,
                courseType,
                classTime,
                location
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
            alert('待補課程創建成功！');
            closeCreatePendingClassModal();
            // 刷新出席管理數據（如果當前在出席管理頁面）
            if (typeof window.refreshSupervisorAttendanceBoard === 'function') {
                window.refreshSupervisorAttendanceBoard();
            }
            // 刷新學生堂數數據（如果當前在資料管理頁面）
            if (typeof window.showDataTab === 'function' && window.currentDataTab === 'student-classes') {
                await window.showDataTab('student-classes');
            }
        } else {
            alert(result.message || '創建失敗，請重試');
        }
    } catch (error) {
        console.error('❌ 創建待補課程失敗:', error);
        alert('創建失敗，請重試');
    }
}

// 將函數導出到全局作用域
window.openCreatePendingClassModal = openCreatePendingClassModal;
window.closeCreatePendingClassModal = closeCreatePendingClassModal;
window.confirmCreatePendingClass = confirmCreatePendingClass;

// 當DOM加載完成時初始化側邊欄
document.addEventListener('DOMContentLoaded', function() {
    initSidebarNavigation();
    bindAttendanceDeleteButtons();
    bindCreatePendingClassButtons();
});

// 確保在頁面切換時也重新初始化
if (typeof window !== 'undefined') {
    window.toggleSidebar = toggleSidebar;
    window.initSidebarNavigation = initSidebarNavigation;
}