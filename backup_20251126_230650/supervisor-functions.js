// 主管功能模組 - 從 main-app.js 分離出來的主管相關功能

/**
 * 顯示主管界面
 */
function showSupervisorSection() {
    // 使用依賴注入，避免直接依賴全局函數
    if (window.App && window.App.hideAllSections) {
        window.App.hideAllSections();
    } else {
        console.error('❌ App.hideAllSections 未定義');
        return;
    }
    
    document.getElementById('supervisorSection').classList.add('active');
    updateSupervisorUserInfo();
    console.log('✅ 顯示主管界面');
}

/**
 * 更新主管用戶信息
 */
function updateSupervisorUserInfo() {
    const userPhoneElement = document.getElementById('userPhone');
    const userTypeElement = document.getElementById('userType');
    
    // 使用依賴注入獲取全局變量
    const currentUser = window.App ? window.App.getCurrentUser() : null;
    const currentUserType = window.App ? window.App.getCurrentUserType() : null;
    
    console.log('🔍 更新主管用戶信息:', { currentUser, currentUserType });
    
    if (userPhoneElement) {
        // currentUser 現在是一個對象，需要訪問 phone 屬性
        if (currentUser && typeof currentUser === 'object') {
            userPhoneElement.textContent = currentUser.phone || '';
        } else {
        userPhoneElement.textContent = currentUser || '';
        }
        console.log('✅ 主管電話:', userPhoneElement.textContent);
    }
    if (userTypeElement && window.App && window.App.getRoleDisplayName) {
        userTypeElement.textContent = window.App.getRoleDisplayName(currentUserType) || '';
        console.log('✅ 主管類型:', userTypeElement.textContent);
    }
}


/**
 * 初始化主管工時界面
 */
async function initializeSupervisorWorkHoursInterface() {
    console.log('🔄 初始化主管工時界面');
    
    // 使用新的工時管理功能
    if (window.WorkHoursFunctions && window.WorkHoursFunctions.initializeWorkHoursInterface) {
        await window.WorkHoursFunctions.initializeWorkHoursInterface('supervisorWorkHours');
    } else {
        console.error('❌ WorkHoursFunctions 未定義');
    }
}

/**
 * 填充地點選擇器
 */
async function populateLocationSelect() {
    try {
        const locationSelect = document.getElementById('supervisorWorkLocation');
        if (!locationSelect) return;
        
        const locations = window.App ? await window.App.fetchLocations() : [];
        
        // 清空現有選項（保留"全部地點"）
        locationSelect.innerHTML = '<option value="">全部地點</option>';
        
        // 添加地點選項
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.location || location;
            option.textContent = location.location || location;
            locationSelect.appendChild(option);
        });
        
        console.log('✅ 地點選擇器填充完成，共', locations.length, '個地點');
    } catch (error) {
        console.error('❌ 填充地點選擇器失敗:', error);
    }
}

/**
 * 填充俱樂部選擇器
 */
async function populateClubSelect() {
    try {
        const clubSelect = document.getElementById('supervisorWorkClub');
        if (!clubSelect) return;
        
        const clubs = window.App ? window.App.getClubs() : [];
        
        // 清空現有選項（保留"全部俱樂部"）
        clubSelect.innerHTML = '<option value="">全部俱樂部</option>';
        
        // 添加俱樂部選項
        clubs.forEach(club => {
            const option = document.createElement('option');
            option.value = club.club || club;
            option.textContent = club.club || club;
            clubSelect.appendChild(option);
        });
        
        console.log('✅ 俱樂部選擇器填充完成，共', clubs.length, '個俱樂部');
    } catch (error) {
        console.error('❌ 填充俱樂部選擇器失敗:', error);
    }
}

/**
 * 填充教練和管理員選擇器的公共邏輯
 */
async function populateCoachSelectCommon(targetElementId, options = {}) {
    const {
        includeAllOption = false,
        allOptionText = '全部員工',
        checkConnection = false,
        logPrefix = '員工選擇器'
    } = options;
    
    try {
        const selectElement = document.getElementById(targetElementId);
        if (!selectElement) {
            console.warn(`⚠️ 找不到 ${targetElementId} 元素`);
            return;
        }
        
        // 檢查數據庫連接（如果需要）
        if (checkConnection) {
            const connectionStatus = window.App ? window.App.checkDatabaseConnection() : { connected: false };
            if (!connectionStatus.connected) {
                // ✅ 嘗試重新檢查連接，但不阻止繼續執行（因為可能是初始化時連接狀態未更新）
                console.log('🔄 DatabaseConnector 連接狀態未確認，嘗試重新檢查連接...');
                const reconnected = await window.App.reconnectDatabase();
                
                if (!reconnected) {
                    // ✅ 即使連接檢查失敗，也繼續執行（因為實際API調用可能會成功）
                    console.warn('⚠️ DatabaseConnector 連接檢查失敗，但繼續執行（實際API調用可能會成功）');
                    // 不返回，讓函數繼續執行
                } else {
                    console.log('✅ DatabaseConnector 連接已確認');
                }
            }
        }
        
        console.log(`🔄 開始載入${logPrefix}...`);
        
        // 獲取當前用戶信息
        const currentUser = window.App ? window.App.getCurrentUser() : null;
        const currentUserType = window.App ? window.App.getCurrentUserType() : '';
        
        // 獲取教練和管理員列表
        const coaches = window.App ? await window.App.fetchCoaches() : [];
        const allAdmins = window.App ? await window.App.fetchAdmins() : [];
        
        // ✅ 過濾出管理員（type='admin'），排除主管（type='supervisor'）和其他類型
        const admins = allAdmins.filter(emp => {
            const empType = emp.type || emp.userType || '';
            return empType === 'admin';
        });
        
        // 清空現有選項
        selectElement.innerHTML = '';
        
        // 添加"全部員工"選項（如果需要）
        if (includeAllOption) {
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = allOptionText;
            selectElement.appendChild(allOption);
        }
        
        // ✅ 主管/管理員頁面（更表）：自己 + 所有管理員 + 所有教練（不包括其他主管和管理員）
        const isSupervisorOrManager = currentUserType === 'supervisor' || currentUserType === 'manager';
        if (isSupervisorOrManager && currentUser) {
            // 先添加自己（主管或管理員）
            const selfOption = document.createElement('option');
            selfOption.value = currentUser.phone;
            const roleLabel = currentUserType === 'supervisor' ? '主管' : '管理員';
            selfOption.textContent = `${currentUser.name} (${roleLabel}) - 自己`;
            selectElement.appendChild(selfOption);
        }
        
        // 添加教練選項
        coaches.forEach(coach => {
            const option = document.createElement('option');
            option.value = coach.phone;
            option.textContent = `${coach.name} (${coach.phone})`;
            selectElement.appendChild(option);
        });
        
        // 添加管理員選項（主管/管理員頁面才顯示，且已過濾掉主管和管理員）
        if (isSupervisorOrManager) {
            admins.forEach(admin => {
                const option = document.createElement('option');
                option.value = admin.phone;
                option.textContent = `${admin.name} (${admin.phone})`;
                selectElement.appendChild(option);
            });
        }
        
        const totalCount = (isSupervisorOrManager && currentUser ? 1 : 0) + coaches.length + (isSupervisorOrManager ? admins.length : 0);
        const roleLabel = isSupervisorOrManager ? (currentUserType === 'supervisor' ? '主管' : '管理員') : '';
        console.log(`✅ ${logPrefix}填充完成，共 ${totalCount} 個員工（${roleLabel}自己: ${isSupervisorOrManager && currentUser ? 1 : 0}, 教練: ${coaches.length}, 管理員: ${isSupervisorOrManager ? admins.length : 0}）`);
        
    } catch (error) {
        console.error(`❌ 填充${logPrefix}失敗:`, error);
    }
}

/**
 * 显示主管工時管理界面
 */
function showSupervisorWorkHours() {
    // ✅ 先獲取要顯示的元素，避免在 hideAllFeatures 後找不到
    const supervisorWorkHoursSection = document.getElementById('supervisorWorkHoursSection');
    const supervisorSection = document.getElementById('supervisorSection');
    
    // ✅ 隱藏所有界面，但排除主管工時管理界面
    if (window.App && window.App.hideAllFeatures) {
        window.App.hideAllFeatures('supervisorWorkHoursSection');
    }
    
    // ✅ 確保主管section是活動的
    if (supervisorSection && !supervisorSection.classList.contains('active')) {
        supervisorSection.classList.add('active');
        supervisorSection.style.setProperty('display', 'block', 'important');
        console.log('✅ 已激活主管section');
    }
    
    // ✅ 隱藏主菜單（feature-grid）
    const featureGrid = supervisorSection?.querySelector('.feature-grid');
    if (featureGrid) {
        featureGrid.style.display = 'none';
    }
    
    if (supervisorWorkHoursSection) {
        supervisorWorkHoursSection.classList.remove('hidden');
        // ✅ 使用 setProperty 與 'important' 來覆蓋 CSS 的 !important 規則
        supervisorWorkHoursSection.style.setProperty('display', 'block', 'important');
        supervisorWorkHoursSection.style.setProperty('visibility', 'visible', 'important');
        supervisorWorkHoursSection.classList.add('active');
        
        // ✅ 使用 setTimeout 確保 DOM 更新後再初始化
        setTimeout(() => {
            console.log('⏰ 显示主管工時管理界面', {
                hasHiddenClass: supervisorWorkHoursSection.classList.contains('hidden'),
                display: window.getComputedStyle(supervisorWorkHoursSection).display,
                visibility: window.getComputedStyle(supervisorWorkHoursSection).visibility
            });
            
            // 初始化工時管理界面
            if (window.WorkHoursFunctions && window.WorkHoursFunctions.initializeWorkHoursInterface) {
                window.WorkHoursFunctions.initializeWorkHoursInterface('supervisorWorkHours');
            }
        }, 50);
    } else {
        console.error('❌ 找不到主管工時管理界面元素');
    }
}

/**
 * 显示主管出席管理界面
 */
function showSupervisorAttendance() {
    // ✅ 先獲取要顯示的元素，避免在 hideAllFeatures 後找不到
    const supervisorAttendanceSection = document.getElementById('supervisorAttendanceSection');
    const supervisorSection = document.getElementById('supervisorSection');
    
    if (!supervisorAttendanceSection) {
        console.error('❌ 找不到主管出席管理界面元素');
        return;
    }
    
    if (!supervisorSection) {
        console.error('❌ 找不到主管section元素');
        return;
    }
    
    // ✅ 隱藏所有界面，但排除主管出席管理界面
    if (window.App && window.App.hideAllFeatures) {
        window.App.hideAllFeatures('supervisorAttendanceSection');
    }
    
    // ✅ 確保主管section是活動的
    if (!supervisorSection.classList.contains('active')) {
        supervisorSection.classList.add('active');
        supervisorSection.style.setProperty('display', 'block', 'important');
    }
    
    // ✅ 隱藏主菜單（feature-grid）
    const featureGrid = supervisorSection?.querySelector('.feature-grid');
    if (featureGrid) {
        featureGrid.style.display = 'none';
    }
    
    // ✅ 顯示主管出席管理界面
        supervisorAttendanceSection.classList.remove('hidden');
    supervisorAttendanceSection.classList.add('active');
        supervisorAttendanceSection.style.setProperty('display', 'block', 'important');
        supervisorAttendanceSection.style.setProperty('visibility', 'visible', 'important');
        
            console.log('📊 显示主管出席管理界面');
    
    // ✅ 初始化主管出席管理界面
    initializeSupervisorAttendanceInterface();
}

/**
 * ✅ 初始化主管出席管理界面
 */
function initializeSupervisorAttendanceInterface() {
    console.log('🔄 初始化主管出席管理界面');
    
    // ✅ 設置默認日期為今天
    const dateInput = document.getElementById('supervisorAttendanceDate');
    if (dateInput) {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        dateInput.value = dateString;
    }
    
    // ✅ 填充地點選擇器（從 Class_location 集合獲取）
    const locationSelect = document.getElementById('supervisorAttendanceLocation');
    if (locationSelect) {
        // ✅ 從 Class_location 集合獲取地點
        if (window.App && typeof window.App.fetchClassLocations === 'function') {
            window.App.fetchClassLocations().then(locations => {
                if (locations && locations.length > 0) {
                    locationSelect.innerHTML = '<option value="">全部地點</option>';
                    locations.forEach(location => {
                        const option = document.createElement('option');
                        option.value = location;
                        option.textContent = location;
                        locationSelect.appendChild(option);
                    });
                    console.log(`✅ 已為主管出席管理加載 ${locations.length} 個地點（來自 Class_location 集合）`);
    } else {
                    // 如果獲取失敗，嘗試備用方案
                    loadLocationsForSupervisorAttendance();
                }
            }).catch(error => {
                console.error('❌ 獲取 Class_location 地點失敗:', error);
                loadLocationsForSupervisorAttendance();
            });
        } else {
            // 如果 API 不可用，嘗試從舊的 API 獲取
            loadLocationsForSupervisorAttendance();
        }
    }
    
    // ✅ 綁定刷新按鈕事件
    const refreshBtn = document.getElementById('refreshSupervisorAttendance');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshSupervisorAttendanceBoard();
        });
    }
    
    // ✅ 綁定刪除按鈕事件
    const deleteBtn = document.getElementById('deleteSupervisorAttendance');
    const confirmDeleteBtn = document.getElementById('confirmDeleteSupervisorAttendance');
    const cancelDeleteBtn = document.getElementById('cancelDeleteSupervisorAttendance');
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            window.enableDeleteMode('supervisorAttendanceTable');
            deleteBtn.style.display = 'none';
            if (confirmDeleteBtn) confirmDeleteBtn.style.display = 'inline-block';
            if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'inline-block';
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            await window.confirmDeleteRecords('supervisorAttendanceTable');
            confirmDeleteBtn.style.display = 'none';
            if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            window.disableDeleteMode('supervisorAttendanceTable');
            cancelDeleteBtn.style.display = 'none';
            if (confirmDeleteBtn) confirmDeleteBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
        });
    }
    
    // ✅ 綁定日期和地點變更事件
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            refreshSupervisorAttendanceBoard();
        });
    }
    
    if (locationSelect) {
        locationSelect.addEventListener('change', () => {
            refreshSupervisorAttendanceBoard();
        });
    }
    
    // ✅ 初始化出席板
    refreshSupervisorAttendanceBoard();
}

/**
 * ✅ 為主管出席管理加載地點數據（從 Class_location 集合）
 */
async function loadLocationsForSupervisorAttendance() {
    try {
        const db = window.App?.getDatabaseConnector();
        if (!db) {
            console.warn('⚠️ DatabaseConnector 未初始化，無法加載地點');
            return;
        }

        // ✅ 從 Class_location 集合獲取地點
        const response = await fetch(`${db.baseUrl}/class-locations`, {
            headers: db.getStandardHeaders()
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const locations = result.locations || [];

        const locationSelect = document.getElementById('supervisorAttendanceLocation');
        if (locationSelect && locations.length > 0) {
            locationSelect.innerHTML = '<option value="">全部地點</option>';
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                locationSelect.appendChild(option);
            });
            console.log(`✅ 已為主管出席管理加載 ${locations.length} 個地點（來自 Class_location 集合）`);
        }
    } catch (error) {
        console.error('❌ 加載 Class_location 地點數據失敗:', error);
    }
}

/**
 * ✅ 刷新主管出席板數據
 */
function refreshSupervisorAttendanceBoard() {
    const dateInput = document.getElementById('supervisorAttendanceDate');
    const locationSelect = document.getElementById('supervisorAttendanceLocation');
    const container = document.getElementById('supervisorAttendanceTable');
    
    if (!container) {
        console.error('❌ 找不到主管出席板容器');
        return;
    }
    
    const classDate = dateInput?.value || null;
    const location = locationSelect?.value || null;
    
    console.log('🔄 刷新主管出席板', { classDate, location });
    
    // 調用出席板初始化函數
    if (typeof window.initAttendanceBoard === 'function') {
        window.initAttendanceBoard('supervisorAttendanceTable', { classDate, location });
    } else {
        console.error('❌ initAttendanceBoard 函數未定義，請確保 attendance-board.js 已加載');
        container.innerHTML = '<div class="text-red-500 p-4">出席板模塊未加載</div>';
    }
}

/**
 * 显示主管報表管理界面
 */
function showSupervisorReports() {
    // ✅ 先獲取要顯示的元素，避免在 hideAllFeatures 後找不到
    const supervisorReportsSection = document.getElementById('supervisorReportsSection');
    const supervisorSection = document.getElementById('supervisorSection');
    
    // ✅ 隱藏所有界面，但排除主管報表管理界面
    if (window.App && window.App.hideAllFeatures) {
        window.App.hideAllFeatures('supervisorReportsSection');
    }
    
    // ✅ 確保主管section是活動的
    if (supervisorSection && !supervisorSection.classList.contains('active')) {
        supervisorSection.classList.add('active');
        supervisorSection.style.setProperty('display', 'block', 'important');
    }
    
    // ✅ 隱藏主菜單（feature-grid）
    const featureGrid = supervisorSection?.querySelector('.feature-grid');
    if (featureGrid) {
        featureGrid.style.display = 'none';
    }
    
    if (supervisorReportsSection) {
        supervisorReportsSection.classList.remove('hidden');
        // ✅ 使用 setProperty 與 'important' 來覆蓋 CSS 的 !important 規則
        supervisorReportsSection.style.setProperty('display', 'block', 'important');
        supervisorReportsSection.style.setProperty('visibility', 'visible', 'important');
        supervisorReportsSection.classList.add('active');
        
        setTimeout(() => {
            console.log('📈 显示主管報表管理界面');
        }, 50);
    } else {
        console.error('❌ 找不到主管報表管理界面元素');
    }
}

/**
 * 显示主管個人設置界面
 */
function showSupervisorPersonalSettings() {
    // ✅ 先獲取要顯示的元素，避免在 hideAllFeatures 後找不到
    const settingsInterface = document.getElementById('supervisorPersonalSettingsSection');
    const supervisorSection = document.getElementById('supervisorSection');
    
    // ✅ 隱藏所有界面，但排除主管個人設置界面
    if (window.App && window.App.hideAllFeatures) {
        window.App.hideAllFeatures('supervisorPersonalSettingsSection');
    }
    
    // ✅ 確保主管section是活動的
    if (supervisorSection && !supervisorSection.classList.contains('active')) {
        supervisorSection.classList.add('active');
        supervisorSection.style.setProperty('display', 'block', 'important');
    }
    
    // ✅ 隱藏主菜單（feature-grid）
    const featureGrid = supervisorSection?.querySelector('.feature-grid');
    if (featureGrid) {
        featureGrid.style.display = 'none';
    }
    
    if (settingsInterface) {
        settingsInterface.classList.remove('hidden');
        // ✅ 使用 setProperty 與 'important' 來覆蓋 CSS 的 !important 規則
        settingsInterface.style.setProperty('display', 'block', 'important');
        settingsInterface.style.setProperty('visibility', 'visible', 'important');
        settingsInterface.classList.add('active');
        
        setTimeout(() => {
            console.log('⚙️ 主管個人設置界面已顯示');
            
            // 初始化個人設置界面（使用教練頁面的共用函數）
            if (window.initializePersonalSettings) {
                window.initializePersonalSettings('supervisor');
            } else {
                console.error('❌ initializePersonalSettings 函數未定義');
            }
        }, 50);
    } else {
        console.error('❌ 找不到主管個人設置界面元素');
    }
}

// ===== 主管教練更表管理功能 =====

/**
 * 顯示主管更表界面
 */
function showStaffRoster() {
    // ✅ 隱藏所有界面，但排除主管更表界面
    if (window.App && window.App.hideAllFeatures) {
        window.App.hideAllFeatures('supervisorRosterSection');
    }
    
    // ✅ 確保主管section是活動的
    const supervisorSection = document.getElementById('supervisorSection');
    if (supervisorSection && !supervisorSection.classList.contains('active')) {
        supervisorSection.classList.add('active');
    }
    
    // ✅ 隱藏主菜單（feature-grid）
    const featureGrid = supervisorSection?.querySelector('.feature-grid');
    if (featureGrid) {
        featureGrid.style.display = 'none';
    }
    
    // 顯示主管更表界面
    const supervisorRosterSection = document.getElementById('supervisorRosterSection');
    if (supervisorRosterSection) {
        supervisorRosterSection.classList.remove('hidden');
        // ✅ 使用 setProperty 與 'important' 來覆蓋 CSS 的 !important 規則
        supervisorRosterSection.style.setProperty('display', 'block', 'important');
        supervisorRosterSection.style.setProperty('visibility', 'visible', 'important');
        supervisorRosterSection.classList.add('active'); // 🔥 添加 active 類
        
        // ✅ 強制確保父容器 supervisorSection 可見
        if (supervisorSection) {
            supervisorSection.classList.add('active');
            supervisorSection.style.setProperty('display', 'block', 'important');
            supervisorSection.style.setProperty('visibility', 'visible', 'important');
        }
        
        // ✅ 使用 setTimeout 確保 DOM 更新後再初始化
        setTimeout(() => {
            // ✅ 再次確保所有相關元素可見
            if (supervisorSection) {
                supervisorSection.classList.add('active');
                supervisorSection.style.setProperty('display', 'block', 'important');
                supervisorSection.style.setProperty('visibility', 'visible', 'important');
            }
            
            supervisorRosterSection.classList.remove('hidden');
            supervisorRosterSection.style.setProperty('display', 'block', 'important');
            supervisorRosterSection.style.setProperty('visibility', 'visible', 'important');
            supervisorRosterSection.classList.add('active');
            
            console.log('✅ 主管更表界面已顯示', {
                sectionId: supervisorRosterSection.id,
                hasHidden: supervisorRosterSection.classList.contains('hidden'),
                display: window.getComputedStyle(supervisorRosterSection).display,
                visibility: window.getComputedStyle(supervisorRosterSection).visibility,
                parentActive: supervisorSection?.classList.contains('active'),
                parentDisplay: supervisorSection ? window.getComputedStyle(supervisorSection).display : 'N/A',
                parentVisibility: supervisorSection ? window.getComputedStyle(supervisorSection).visibility : 'N/A'
            });
            
            // 初始化主管更表界面
            initializeSupervisorRosterInterface();
        }, 100);
    } else {
        console.error('❌ 找不到主管更表界面元素');
    }
}

/**
 * 初始化主管更表界面
 */
async function initializeSupervisorRosterInterface() {
    try {
        console.log('🔄 初始化主管更表界面');
        
        // 初始化月份選擇器
        initializeRosterMonthSelector();
        
        // 填充教練選擇器
        await populateCoachSelect();
        
        // 初始化更表統計功能
        initializeRosterStatistics();
        
        // ✅ 再次確保主管更表界面可見（在初始化數據之前）
        const supervisorRosterSectionForInit = document.getElementById('supervisorRosterSection');
        if (supervisorRosterSectionForInit) {
            supervisorRosterSectionForInit.classList.remove('hidden');
            supervisorRosterSectionForInit.style.setProperty('display', 'block', 'important');
            supervisorRosterSectionForInit.style.setProperty('visibility', 'visible', 'important');
            console.log('✅ 確保主管更表界面可見:', {
                hasHiddenClass: supervisorRosterSectionForInit.classList.contains('hidden'),
                display: window.getComputedStyle(supervisorRosterSectionForInit).display,
                visibility: window.getComputedStyle(supervisorRosterSectionForInit).visibility
            });
        }
        
        // ✅ 確保容器可見
        const calendarContainer = document.getElementById('staffRosterCalendars');
        if (calendarContainer) {
            calendarContainer.style.setProperty('display', 'block', 'important');
            calendarContainer.style.setProperty('visibility', 'visible', 'important');
        }
        
        // 自動載入全部教練的更表
        const coachSelect = document.getElementById('staffCoachSelect');
        if (coachSelect && coachSelect.options.length > 0) {
            // 選擇"全部教練"選項（第一個選項）
            coachSelect.selectedIndex = 0;
            const selectedValue = coachSelect.value;
            if (!selectedValue) {
                console.log('🔄 自動載入全部教練的更表');
                await renderAllCoachesRoster();
            } else {
                console.log('🔄 自動載入指定教練的更表:', selectedValue);
                await renderCoachRoster(selectedValue);
            }
        } else {
            console.warn('⚠️ 教練選擇器未準備好，跳過自動載入');
        }
        
        // ✅ 最後一次確保界面可見（初始化完成後）
        if (supervisorRosterSectionForInit) {
            supervisorRosterSectionForInit.style.setProperty('display', 'block', 'important');
            supervisorRosterSectionForInit.style.setProperty('visibility', 'visible', 'important');
            supervisorRosterSectionForInit.classList.remove('hidden');
        }
        
        console.log('✅ 主管更表界面初始化完成', {
            sectionDisplay: supervisorRosterSectionForInit ? window.getComputedStyle(supervisorRosterSectionForInit).display : 'N/A',
            containerDisplay: calendarContainer ? window.getComputedStyle(calendarContainer).display : 'N/A'
        });
    } catch (error) {
        console.error('❌ 初始化主管更表界面失敗:', error);
    }
}

/**
 * 初始化更表月份選擇器
 */
function initializeRosterMonthSelector() {
    try {
        console.log('🔄 開始初始化更表月份選擇器');
        
        // 查找主管頁面的月份選擇器（在 supervisorRosterSection 內）
        const supervisorSection = document.getElementById('supervisorRosterSection');
        let monthSelect = null;
        
        if (supervisorSection) {
            monthSelect = supervisorSection.querySelector('#rosterMonth');
        }
        
        // 如果找不到，嘗試全局查找
        if (!monthSelect) {
            monthSelect = document.getElementById('rosterMonth');
        }
        
        if (!monthSelect) {
            console.warn('⚠️ 找不到更表月份選擇器，ID: rosterMonth');
            console.log('🔍 當前頁面所有 select 元素:', document.querySelectorAll('select'));
            return;
        }
        console.log('✅ 找到更表月份選擇器:', monthSelect);
        
        // 生成月份選項（當前月份前4個月到後6個月）
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        let monthOptions = '';
        
        for (let i = -4; i <= 6; i++) {
            const date = new Date(currentYear, currentMonth - 1 + i, 1);
            const optionYear = date.getFullYear();
            const optionMonth = date.getMonth() + 1;
            const selected = (optionYear === currentYear && optionMonth === currentMonth) ? 'selected' : '';
            monthOptions += `<option value="${optionYear}-${optionMonth.toString().padStart(2, '0')}" ${selected}>${optionYear}年${optionMonth}月</option>`;
        }
        
        monthSelect.innerHTML = monthOptions;
        console.log('✅ 更表月份選擇器初始化完成:', { 
            elementId: monthSelect.id, 
            optionsCount: monthSelect.options.length,
            currentValue: monthSelect.value,
            firstOption: monthSelect.options[0]?.textContent,
            lastOption: monthSelect.options[monthSelect.options.length-1]?.textContent
        });
    } catch (error) {
        console.error('❌ 初始化更表月份選擇器失敗:', error);
    }
}

/**
 * 填充更表管理教練選擇器
 */
async function populateCoachSelect() {
    return populateCoachSelectCommon('staffCoachSelect', {
        includeAllOption: true,
        allOptionText: '全部員工',
        checkConnection: true,
        logPrefix: '更表教練選擇器'
    });
}

// 處理教練選擇變化
function onChangeStaffCoach() {
    const phone = (document.getElementById('staffCoachSelect') || {}).value || '';
    const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
    
    // ✅ 如果選擇了"全部員工"（空值），顯示所有員工的更表
    if (!phone) {
        console.log('🔄 選擇了"全部員工"，顯示所有員工的更表');
        renderAllCoachesRoster();
        // ✅ 如果批量操作模态框打开，更新批量操作日历
        onBatchEmployeeChange();
        return;
    }
    
    // ✅ 如果選擇了具體員工，顯示該員工的更表（主管或管理員都可以）
    if ((userType === 'supervisor' || userType === 'manager') && phone) {
        console.log('🔄 選擇了員工:', phone);
        renderCoachRoster(phone);
    } else {
        renderAllCoachesRoster();
    }
    
    // ✅ 如果批量操作模态框打开，更新批量操作日历
    onBatchEmployeeChange();
}

/**
 * 處理更表月份變更
 */
function onRosterMonthChange() {
    const coachSelect = document.getElementById('staffCoachSelect');
    if (coachSelect && coachSelect.value) {
        renderCoachRoster(coachSelect.value);
    } else {
        renderAllCoachesRoster();
    }
    
    // ✅ 如果批量操作模态框打开，更新批量操作日历
    const modal = document.getElementById('batchOperationModal');
    if (modal && !modal.classList.contains('hidden')) {
        // 清空之前月份的选择（但保留假期类型的选择）
        batchSelectedDates.clear();
        // 重新生成日历（会检查当前选择的员工并显示员工名称）
        generateBatchOperationCalendar();
        // ✅ 重新应用假期高亮显示（包括跨月份的例假日期）
        setTimeout(() => {
            updateBatchCalendarLeaveHighlight();
        }, 100);
        updateBatchSelectionDisplay();
    }
    
    // ✅ 重新应用主日历的假期高亮显示（包括跨月份的例假日期）
    setTimeout(() => {
        updateLeaveHighlightInCalendar();
    }, 100);
}

/**
 * 处理员工选择变更时更新批量操作日历
 */
function onBatchEmployeeChange() {
    const modal = document.getElementById('batchOperationModal');
    if (modal && !modal.classList.contains('hidden')) {
        // 清空之前的选择
        batchSelectedDates.clear();
        // 重新生成日历（会显示新选择的员工）
        generateBatchOperationCalendar();
        updateBatchSelectionDisplay();
    }
}

// 渲染單個教練的更表
async function renderCoachRoster(phone, targetYear = null, targetMonth = null) {
    try {
        if (window.App && window.App.showLoading) {
            window.App.showLoading(true);
        }
        
        // 如果没有指定年月，尝试从选择器获取，否则使用当前年月
        let year = targetYear;
        let month = targetMonth;
        
        if (!year || !month) {
            // 查找主管頁面的月份選擇器
            const supervisorSection = document.getElementById('supervisorRosterSection');
            let rosterMonthElement = null;
            
            if (supervisorSection) {
                rosterMonthElement = supervisorSection.querySelector('#rosterMonth');
            }
            
            // 如果找不到，嘗試全局查找
            if (!rosterMonthElement) {
                rosterMonthElement = document.getElementById('rosterMonth');
            }
            
            if (rosterMonthElement && rosterMonthElement.value) {
                const [selectedYear, selectedMonth] = rosterMonthElement.value.split('-');
                year = parseInt(selectedYear);
                month = parseInt(selectedMonth);
                console.log('📅 從月份選擇器獲取年月:', { year, month, value: rosterMonthElement.value });
            } else {
                year = new Date().getFullYear();
                month = new Date().getMonth() + 1;
                console.log('📅 使用當前年月:', { year, month });
            }
        }
        
        // 構建月份字符串（YYYY-MM 格式）
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        // ✅ 優化：並行加載更表數據和員工信息（包括教練和管理員）
        const [rosterDataResult, coachInfoResult, adminInfoResult] = await Promise.all([
            window.App ? window.App.fetchRoster(monthStr, phone) : Promise.resolve([]),
            window.App && window.App.fetchCoaches ? window.App.fetchCoaches({ phone: phone }) : Promise.resolve([]),
            window.App && window.App.fetchAdmins ? window.App.fetchAdmins() : Promise.resolve([])
        ]);
        
        const rosterData = rosterDataResult || [];
        const coachInfo = coachInfoResult || [];
        const allAdmins = adminInfoResult || [];
        // ✅ 過濾出管理員（type='admin'），排除主管（type='supervisor'）和其他類型
        const admins = allAdmins.filter(emp => {
            const empType = emp.type || emp.userType || '';
            return empType === 'admin';
        });
        // ✅ 查找員工信息（可能是教練或管理員）
        const employeeInfo = coachInfo.find(c => c.phone === phone) || admins.find(a => a.phone === phone) || [];
        console.log('📊 獲取到的更表數據:', { phone, month, rosterData, employeeInfo });
        
        // 處理不同格式的返回值
        let records = [];
        if (Array.isArray(rosterData)) {
            records = rosterData;
        } else if (rosterData && rosterData.roster && Array.isArray(rosterData.roster)) {
            records = rosterData.roster;
        } else if (rosterData && rosterData.success && rosterData.roster && Array.isArray(rosterData.roster)) {
            records = rosterData.roster;
        }
        
        console.log('📊 處理後的更表記錄:', { phone, month, recordsCount: records?.length, records });
        
        const container = document.getElementById('staffRosterCalendars');
        if (!container) {
            console.error('❌ 找不到更表容器: staffRosterCalendars');
            return;
        }
        
        // ✅ 確保容器可見
        container.style.setProperty('display', 'block', 'important');
        container.style.setProperty('visibility', 'visible', 'important');
        
        // ✅ 確保父容器（supervisorRosterSection）可見
        const rosterSection = document.getElementById('supervisorRosterSection');
        if (rosterSection) {
            rosterSection.style.setProperty('display', 'block', 'important');
            rosterSection.style.setProperty('visibility', 'visible', 'important');
            rosterSection.classList.remove('hidden');
        }
        
        const rosterByDay = new Map();
        (records || []).forEach(item => {
            const dateStr = item?.date || item?.rosterDate || item?.day;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth()+1) === month) {
                const day = d.getDate();
                const time = item?.time || item?.timeRange || '';
                const location = item?.location || item?.place || '';
                const supervisorApproved = item?.supervisorApproved || false;
                const submittedBy = item?.submittedBy || 'unknown';
                const isSubmitted = item?.isSubmitted || false;
                const isConfirmed = item?.isConfirmed || false;
                // ✅ 修復：從 unavailable 字段讀取，因為數據庫使用 unavailable 而不是 isClicked
                const unavailable = item?.unavailable !== undefined ? item.unavailable : false;
                const isClicked = item?.isClicked !== undefined ? item.isClicked : unavailable; // 優先使用 isClicked，否則使用 unavailable
                // 🔥 修復：使用 day_location 作為鍵，與 generateEditableRosterCalendar 保持一致
                // 對於教練模式（標記不上班），location 可能是空字符串，需要統一處理
                const dayLocationKey = `${day}_${location || ''}`;
                const arr = rosterByDay.get(dayLocationKey) || [];
                arr.push({ time, location, supervisorApproved, submittedBy, isSubmitted, isConfirmed, isClicked, unavailable, leaveType: item?.leaveType || null });
                rosterByDay.set(dayLocationKey, arr);
            }
        });
        
        // 檢查審核狀態
        // ✅ 修正邏輯：只要有任何一條記錄標記為已確認/已審核，就認為該月更表已審核
        // 不需要所有日期都有數據，也不需要所有日期都填滿
        let hasApprovedData = false;
        let hasPendingData = false;
        let hasUnapprovedData = false;
        
        // ✅ 修復：即使 rosterByDay 為空，也從原始 records 中檢查狀態
        if (rosterByDay.size === 0 && records && records.length > 0) {
            console.log('⚠️ rosterByDay 為空，從原始 records 檢查狀態');
            records.forEach(item => {
                const isSubmitted = item?.isSubmitted === true || item?.isSubmitted === 'true' || item?.isSubmitted === 1;
                const isConfirmed = item?.isConfirmed === true || item?.isConfirmed === 'true' || item?.isConfirmed === 1;
                const supervisorApproved = item?.supervisorApproved === true || item?.supervisorApproved === 'true' || item?.supervisorApproved === 1;
                
                if (isConfirmed || supervisorApproved) {
                    hasApprovedData = true;
                }
                if (isSubmitted && !isConfirmed && !supervisorApproved) {
                    hasPendingData = true;
                }
            });
        }
        
        for (let [dayLocationKey, items] of rosterByDay) {
            if (items && items.length > 0) {
                // 檢查該日期所有時段的記錄
                for (const item of items) {
                    if (item) {
                        // 檢查確認狀態（只要有任何一條記錄被確認，就標記為已審核）
                        if (item.isConfirmed === true || item.supervisorApproved === true) {
                            hasApprovedData = true;
                        }
                        // 檢查提交狀態（只要有任何一條記錄已提交，就標記為待審核）
                        if (item.isSubmitted === true && !item.isConfirmed && !item.supervisorApproved) {
                            hasPendingData = true;
                        }
                        // 檢查未審核狀態（已提交但未確認）
                        if (item.isSubmitted === true && item.submittedBy === 'coach' && !item.isConfirmed && !item.supervisorApproved) {
                            hasUnapprovedData = true;
                        }
                    }
                }
            }
        }
        
        // 如果已確認的記錄存在，優先顯示"已審核"
        // 如果只有已提交但未確認的記錄，顯示"待審核"
        // 如果兩者都存在，顯示"混合狀態"（但通常這種情況不會發生，因為主管確認後會更新所有記錄）
        
        // 添加主管狀態指示器
        // ✅ 優先級：已審核 > 混合狀態 > 待審核 > 尚未提交
        let supervisorStatusIndicator = '';
        if (hasApprovedData) {
            // 只要有已審核的記錄，就顯示"已審核"（不需要所有日期都填滿）
            if (hasPendingData || hasUnapprovedData) {
                // 如果同時有已審核和待審核的記錄，顯示"混合狀態"
                supervisorStatusIndicator = '<div style="background: #e0e7ff; border: 1px solid #6366f1; border-radius: 6px; padding: 8px; margin-bottom: 15px; text-align: center;"><span style="color: #3730a3; font-weight: bold;">📋 混合狀態</span><br><span style="color: #4f46e5; font-size: 12px;">該月更表部分已審核，部分待審核</span></div>';
            } else {
                // 純已審核狀態
                supervisorStatusIndicator = '<div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 6px; padding: 8px; margin-bottom: 15px; text-align: center;"><span style="color: #065f46; font-weight: bold;">✅ 已審核</span><br><span style="color: #047857; font-size: 12px;">此更表已審核通過，您仍可編輯並重新確認</span></div>';
            }
        } else if (hasPendingData || hasUnapprovedData) {
            // 只有待審核的記錄（已提交但未確認）
            supervisorStatusIndicator = '<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px; margin-bottom: 15px; text-align: center;"><span style="color: #92400e; font-weight: bold;">⏳ 待審核</span><br><span style="color: #b45309; font-size: 12px;">教練已提交更表，紅色格子表示希望不上班的日子，等待您審核</span></div>';
        } else {
            // 沒有已提交或已審核的記錄
            supervisorStatusIndicator = '<div style="background: #e0f2fe; border: 1px solid #0ea5e9; border-radius: 6px; padding: 8px; margin-bottom: 15px; text-align: center;"><span style="color: #0c4a6e; font-weight: bold;">📝 尚未提交</span><br><span style="color: #0369a1; font-size: 12px;">教練尚未提交本月更表，紅色格子表示希望不上班的日子</span></div>';
        }
        
        // 主管：使用可編輯樣式（調用教練版本的函數）
        await window.generateEditableRosterCalendar(year, month, rosterByDay, false, false, false); // isStaff=false, isReadOnly=false, includeMonthSelector=false
        
        // ✅ 如果批量操作模态框打开，重新启用日期选择
        const modal = document.getElementById('batchOperationModal');
        if (modal && !modal.classList.contains('hidden') && batchOperationActive) {
            // 延迟一点确保DOM完全渲染
            setTimeout(() => {
                enableBatchDateSelection();
                // 恢复已选择的日期高亮
                batchSelectedDates.forEach(day => {
                    const cells = container?.querySelectorAll('.cal-cell');
                    cells?.forEach(cell => {
                        const dayElement = cell.querySelector('.cal-day');
                        if (dayElement && parseInt(dayElement.textContent) === day) {
                            cell.classList.add('batch-selected');
                        }
                    });
                });
            }, 100);
        }
        
        // 添加主管狀態指示器到容器（替換教練版本的狀態指示器）
        if (supervisorStatusIndicator) {
            // 先移除教練版本的狀態指示器
            const existingStatusIndicator = container.querySelector('div[style*="background: #d1fae5"], div[style*="background: #fef3c7"], div[style*="background: #e0f2fe"]');
            if (existingStatusIndicator) {
                existingStatusIndicator.remove();
            }
            // 添加主管版本的狀態指示器
            container.insertAdjacentHTML('afterbegin', supervisorStatusIndicator);
        }
        
        // 設置容器屬性
        container.setAttribute('data-coach-phone', phone);
        
        // ✅ 優化：使用並行加載時獲取的員工信息（可能是教練或管理員）
        try {
            if (employeeInfo && employeeInfo.name) {
                // 使用與後端一致的姓名格式
                const employeeName = employeeInfo.name || employeeInfo.studentName || `employee_${phone}`;
                container.setAttribute('data-coach-name', employeeName);
            } else if (coachInfo && coachInfo.length > 0) {
                // 如果找不到員工信息，嘗試從教練信息獲取
                const coachName = coachInfo[0].name || coachInfo[0].studentName || `coach_${phone}`;
                container.setAttribute('data-coach-name', coachName);
            } else {
                container.setAttribute('data-coach-name', `employee_${phone}`);
            }
        } catch (e) {
            console.warn('無法獲取員工姓名，使用默認名稱:', e);
            container.setAttribute('data-coach-name', `employee_${phone}`);
        }
        
        // 添加主管專用的保存按鈕
        addSupervisorSaveButton(phone);
        
        // ✅ 再次確保容器和父容器可見（渲染後）
        container.style.setProperty('display', 'block', 'important');
        container.style.setProperty('visibility', 'visible', 'important');
        
        const rosterSectionForVisibility = document.getElementById('supervisorRosterSection');
        if (rosterSectionForVisibility) {
            rosterSectionForVisibility.style.setProperty('display', 'block', 'important');
            rosterSectionForVisibility.style.setProperty('visibility', 'visible', 'important');
            rosterSectionForVisibility.classList.remove('hidden');
        }
        
        console.log('✅ 教練更表渲染完成:', { 
            phone, 
            year, 
            month, 
            rosterByDaySize: rosterByDay.size,
            containerDisplay: window.getComputedStyle(container).display,
            containerVisible: window.getComputedStyle(container).visibility !== 'hidden',
            parentDisplay: container.parentElement ? window.getComputedStyle(container.parentElement).display : 'N/A'
        });
        
    } catch (e) {
        console.error('❌ 載入單一教練更表失敗:', e);
    } finally {
        if (window.App && window.App.showLoading) {
            window.App.showLoading(false);
        }
    }
}

// ===== 全新的月份更表功能 =====

/**
 * 渲染所有教練的月份更表 - 重新設計版本
 * 要求：按日期和地點正確分組，不混合不同地點的教練數據
 */
async function renderAllCoachesRoster(targetYear = null, targetMonth = null) {
    try {
        if (window.App && window.App.showLoading) {
        window.App.showLoading(true);
    }
        
        // 獲取年月
        let year = targetYear;
        let month = targetMonth;
        
        if (!year || !month) {
            const supervisorSection = document.getElementById('supervisorRosterSection');
            let rosterMonthElement = null;
            
            if (supervisorSection) {
                rosterMonthElement = supervisorSection.querySelector('#rosterMonth');
            }
            
            if (!rosterMonthElement) {
                rosterMonthElement = document.getElementById('rosterMonth');
            }
            
            if (rosterMonthElement && rosterMonthElement.value) {
                const [selectedYear, selectedMonth] = rosterMonthElement.value.split('-');
                year = parseInt(selectedYear);
                month = parseInt(selectedMonth);
            } else {
                year = new Date().getFullYear();
                month = new Date().getMonth() + 1;
            }
        }
        
        // 獲取數據
        const rawData = window.App ? await window.App.fetchRoster(month.toString(), '') : [];
        const container = document.getElementById('dailyLocationStats');
        if (!container) {
            console.error('❌ 找不到更表統計容器: dailyLocationStats');
            return;
        }
        
        // ✅ 確保容器和父容器可見
        container.style.setProperty('display', 'block', 'important');
        container.style.setProperty('visibility', 'visible', 'important');
        
        const rosterSectionForStats = document.getElementById('supervisorRosterSection');
        if (rosterSectionForStats) {
            rosterSectionForStats.style.setProperty('display', 'block', 'important');
            rosterSectionForStats.style.setProperty('visibility', 'visible', 'important');
            rosterSectionForStats.classList.remove('hidden');
        }
        
        // 處理數據格式
        let rosterList = [];
        if (Array.isArray(rawData)) {
            rosterList = rawData;
        } else if (rawData && Array.isArray(rawData.roster)) {
            rosterList = rawData.roster;
        }
        
        // 清空容器
        container.innerHTML = '';
        
        // 生成月份更表
        await generateMonthlyRosterTable(year, month, rosterList, container);
        
    } catch (e) {
        console.error('載入月份更表失敗', e);
        const container = document.getElementById('dailyLocationStats');
        if (container) {
            container.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">載入更表失敗，請重試</div>';
            container.classList.remove('empty');
        }
    } finally {
        if (window.App && window.App.showLoading) {
            window.App.showLoading(false);
        }
    }
}

/**
 * 生成月份更表表格
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @param {Array} rosterList - 更表數據列表
 * @param {HTMLElement} container - 容器元素
 */
async function generateMonthlyRosterTable(year, month, rosterList, container) {
    // 獲取地點列表
    const locations = await getLocationList();
    
    // ✅ 先獲取員工列表，用於根據 employeeId 查找員工名稱
    let employeesMap = new Map(); // {employeeId: name}
    try {
        if (window.App && typeof window.App.getEmployees === 'function') {
            const employees = await window.App.getEmployees();
            employees.forEach(emp => {
                // ✅ 優先使用 employeeId，如果沒有則使用 phone 作為備用
                if (emp.employeeId && emp.name) {
                    employeesMap.set(emp.employeeId, emp.name);
                } else if (emp.phone && emp.name) {
                    employeesMap.set(emp.phone, emp.name);
                }
            });
            console.log(`✅ 已載入 ${employeesMap.size} 個員工信息用於名稱映射（通過 employeeId）`);
        }
    } catch (e) {
        console.warn('⚠️ 獲取員工列表失敗，將使用記錄中的名稱字段:', e);
    }
    
    // ✅ 按日期、地點和時段分組數據，確保同一員工同一天的不同時段和地點都能正確顯示
    const rosterByDayLocationSlot = new Map();
    
    // ✅ 收集每個員工的請假日期
    const employeeLeaveDates = new Map(); // {員工名: Set<日期>}
    
    rosterList.forEach(item => {
            const dateStr = item?.date || item?.rosterDate || item?.day;
            if (!dateStr) return;
        
            const d = new Date(dateStr);
        if (Number.isNaN(d.getTime()) || d.getFullYear() !== year || (d.getMonth() + 1) !== month) {
            return;
        }
        
                const day = d.getDate();
                const location = item?.location || item?.place || '';
        // ✅ 獲取員工名稱（優先順序：從 employeeId 查找 > name > 從 phone 查找 > coachName > studentName）
        let name = item?.name || item?.coachName || item?.studentName;
        // 如果 name 為空，優先嘗試從 employeeId 查找，然後從 phone 查找
        if (!name || name.trim() === '') {
            const employeeId = item?.employeeId || '';
            if (employeeId && employeesMap.has(employeeId)) {
                name = employeesMap.get(employeeId);
                console.log(`✅ 通過 employeeId 找到員工名稱: ${employeeId} -> ${name}`);
            } else {
                const phone = item?.phone || item?.coachPhone || '';
                if (phone && employeesMap.has(phone)) {
                    name = employeesMap.get(phone);
                    console.log(`✅ 通過 phone 找到員工名稱: ${phone} -> ${name}`);
                }
            }
        }
        name = name || '未知教練';
        
        const time = item?.time || item?.timeRange || '';
        const isClicked = item?.isClicked === true || item?.isClicked === 'true' || item?.isClicked === 1;
        const leaveType = item?.leaveType || null; // ✅ 獲取假期類型
        
        // ✅ 檢查是否為請假記錄：使用 isClicked 而不是 unavailable
        // isClicked = true 表示員工提交的請假記錄（顯示紅色）
        // 如果有 leaveType，則根據不同類型顯示不同顏色
        if (isClicked && name && name !== '未知教練') {
            if (!employeeLeaveDates.has(name)) {
                employeeLeaveDates.set(name, new Map()); // ✅ 改為 Map，存儲 {日期: leaveType}
            }
            employeeLeaveDates.get(name).set(day, leaveType); // ✅ 存儲日期和假期類型
        }
        
        // ✅ 如果 isClicked=true，無論是否有地點內容，都不顯示在月份更表中（只記錄請假日期）
        // 月份更表只顯示正常的工作安排，不顯示請假記錄
        if (isClicked) {
            // isClicked=true 的記錄只記錄請假日期，不添加到表格中
            return;
        }
        
        // ✅ 跳過空地點的正常記錄
        if (!location || location.trim() === '') {
            return;
        }
        
        // ✅ 使用 item.slot（後端返回的），如果沒有或無效則默認為 1（上午）
        let slot = item?.slot;
        if (slot === undefined || slot === null || slot < 1 || slot > 3 || isNaN(slot)) {
            slot = 1; // 默認為上午
            console.warn(`⚠️ 記錄缺少有效的slot，使用默認值 slot=1:`, { day, location, name, time, itemSlot: item?.slot });
        }
        
        // ✅ 使用 日期_地點_時段 作為鍵，確保同一員工同一天的不同時段和地點都能正確顯示
        const key = `${day}_${location}_${slot}`;
        
        if (!rosterByDayLocationSlot.has(key)) {
            rosterByDayLocationSlot.set(key, []);
        }
        
        rosterByDayLocationSlot.get(key).push({
            name,
            time,
            isClicked,
            leaveType: item?.leaveType || null, // ✅ 添加 leaveType 字段
            location,
            slot
        });
    });
    
    
    // 生成表格HTML
    const tableHtml = generateRosterTableHTML(year, month, rosterByDayLocationSlot, locations, employeeLeaveDates);
    container.innerHTML = tableHtml;
    
    // 移除 empty 類，因為現在有內容了
    container.classList.remove('empty');
}

/**
 * 生成更表表格HTML
 * @param {Map} rosterByDayLocationSlot - 按 日期_地點_時段 分組的更表數據
 * @param {Map} employeeLeaveDates - 每個員工的請假日期 {員工名: Map<日期, leaveType>}
 */
function generateRosterTableHTML(year, month, rosterByDayLocationSlot, locations, employeeLeaveDates = new Map()) {
    // ✅ 確保可以訪問假期類型顏色常量（如果未定義，使用默認值）
    const LEAVE_TYPE_COLORS = window.LEAVE_TYPE_COLORS || {
        'regular': '#fef3c7',    // 例假 - 黄色
        'annual': '#dbeafe',     // 年假 - 蓝色
        'maternity': '#fce7f3',  // 产假 - 粉色
        'sick': '#dcfce7',      // 病假 - 绿色
        'nopaid': '#fee2e2',    // No Paid - 红色
        'statutory': '#e0e7ff'   // 法定劳工假 - 紫色
    };
    
    const LEAVE_TYPE_BORDER_COLORS = window.LEAVE_TYPE_BORDER_COLORS || {
        'regular': '#fbbf24',
        'annual': '#3b82f6',
        'maternity': '#ec4899',
        'sick': '#22c55e',
        'nopaid': '#ef4444',
        'statutory': '#6366f1'
    };
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthNames = ['', '一月', '二月', '三月', '四月', '五月', '六月', 
                       '七月', '八月', '九月', '十月', '十一月', '十二月'];
    
    // ✅ 生成請假日期信息（顯示在左上角）
    let leaveDatesHtml = '';
    if (employeeLeaveDates && employeeLeaveDates.size > 0) {
        const leaveDatesArray = Array.from(employeeLeaveDates.entries())
            .filter(([name, datesMap]) => datesMap && datesMap.size > 0)
            .map(([name, datesMap]) => {
                // ✅ datesMap 是 Map<日期, leaveType>
                const sortedDates = Array.from(datesMap.keys()).sort((a, b) => a - b);
                const datesStr = sortedDates.map(d => String(d).padStart(2, '0')).join('/');
                return `${name}：${datesStr}`;
            });
        
        if (leaveDatesArray.length > 0) {
            leaveDatesHtml = `
                <div style="text-align: left; margin-bottom: 15px; padding: 12px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; font-size: 13px; line-height: 1.8;">
                    <div style="font-weight: 600; color: #92400e; margin-bottom: 8px;">📅 員工請假日期（isClicked=true）：</div>
                    ${leaveDatesArray.map(info => `<div style="color: #78350f;">${info}</div>`).join('')}
                </div>
            `;
        }
    }
    
    let html = `
        <div style="margin: 20px 0;">
            ${leaveDatesHtml}
            <h3 style="text-align: center; color: #1f2937; margin-bottom: 20px;">
                ${year}年${monthNames[month]}月份更表
            </h3>
            <div style="overflow-x: auto; border: 1px solid #d1d5db; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse; min-width: 1200px;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 600; min-width: 80px; position: sticky; left: 0; background: #f9fafb; z-index: 10;">地點</th>
    `;
    
    // 添加日期標題，每個日期有三個時段列
    for (let day = 1; day <= daysInMonth; day++) {
        html += `<th colspan="3" style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 600; min-width: 120px;">${day}日</th>`;
    }
    
    html += `
                        </tr>
                        <tr style="background: #f3f4f6;">
                            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 600; font-size: 12px; position: sticky; left: 0; background: #f3f4f6; z-index: 10;">時間</th>
    `;
    
    // 為每個日期添加時段標題
    for (let day = 1; day <= daysInMonth; day++) {
        html += `<th style="border: 1px solid #d1d5db; padding: 6px; text-align: center; font-weight: 600; font-size: 11px;">上午</th>`;
        html += `<th style="border: 1px solid #d1d5db; padding: 6px; text-align: center; font-weight: 600; font-size: 11px;">中午</th>`;
        html += `<th style="border: 1px solid #d1d5db; padding: 6px; text-align: center; font-weight: 600; font-size: 11px;">下午</th>`;
    }
    
    html += `
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    // 為每個地點生成一行
    locations.forEach(location => {
        html += `<tr>`;
        html += `<td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 600; background: #f8fafc; position: sticky; left: 0; z-index: 5;">${location}</td>`;
        
        // 為每個日期生成三個時段單元格
        for (let day = 1; day <= daysInMonth; day++) {
            // ✅ 從 rosterByDayLocationSlot 中獲取該地點該日期的所有時段記錄（包括 isClicked=true 的記錄）
            const morningKey = `${day}_${location}_1`;
            const noonKey = `${day}_${location}_2`;
            const afternoonKey = `${day}_${location}_3`;
            
            // ✅ 不再過濾 isClicked=true 的記錄，因為這些是請假記錄，需要顯示
            const morningCoaches = rosterByDayLocationSlot.get(morningKey) || [];
            const noonCoaches = rosterByDayLocationSlot.get(noonKey) || [];
            const afternoonCoaches = rosterByDayLocationSlot.get(afternoonKey) || [];
            
            // ✅ 生成單元格內容的輔助函數
            const generateCellContent = (coaches) => {
                if (coaches.length === 0) {
                    return '<div style="color: #9ca3af; font-style: italic; font-size: 10px;">無</div>';
                }
                
                let content = '';
                coaches.forEach(coach => {
                    // ✅ 根據 isClicked 和 leaveType 設置樣式
                    let coachStyle = 'margin: 2px 0;';
                    let cellBgColor = '';
                    
                    if (coach.isClicked === true) {
                        // ✅ isClicked=true 表示請假記錄
                        if (coach.leaveType) {
                            // ✅ 有 leaveType，根據類型顯示不同顏色
                            const bgColor = LEAVE_TYPE_COLORS[coach.leaveType] || '#f3f4f6';
                            const borderColor = LEAVE_TYPE_BORDER_COLORS[coach.leaveType] || '#d1d5db';
                            coachStyle += ` color: ${borderColor}; font-weight: 600; background: ${bgColor}; padding: 2px 4px; border-radius: 3px;`;
                        } else {
                            // ✅ 沒有 leaveType，顯示紅色（員工初始提交）
                            coachStyle += ' color: #dc2626; font-weight: 600; background: #fef2f2; padding: 2px 4px; border-radius: 3px;';
                        }
                    }
                    
                    content += `<div style="${coachStyle}">${coach.name}</div>`;
                });
                return content;
            };
            
            // ✅ 檢查該單元格是否有 isClicked=true 的記錄，用於設置單元格背景色
            const getCellBackgroundStyle = (coaches) => {
                const clickedCoaches = coaches.filter(c => c.isClicked === true);
                if (clickedCoaches.length === 0) return '';
                
                // ✅ 如果有多個請假記錄，優先顯示第一個的顏色
                const firstClicked = clickedCoaches[0];
                if (firstClicked.leaveType) {
                    const bgColor = LEAVE_TYPE_COLORS[firstClicked.leaveType] || '#f3f4f6';
                    return `background: ${bgColor};`;
                } else {
                    // ✅ 沒有 leaveType，顯示紅色背景
                    return 'background: #fef2f2;';
                }
            };
            
            // 生成上午時段單元格
            const morningContent = generateCellContent(morningCoaches);
            const morningBgStyle = getCellBackgroundStyle(morningCoaches);
            html += `<td style="border: 1px solid #d1d5db; padding: 6px; vertical-align: top; min-height: 40px; font-size: 11px; ${morningBgStyle}">${morningContent}</td>`;
            
            // 生成中午時段單元格
            const noonContent = generateCellContent(noonCoaches);
            const noonBgStyle = getCellBackgroundStyle(noonCoaches);
            html += `<td style="border: 1px solid #d1d5db; padding: 6px; vertical-align: top; min-height: 40px; font-size: 11px; ${noonBgStyle}">${noonContent}</td>`;
            
            // 生成下午時段單元格
            const afternoonContent = generateCellContent(afternoonCoaches);
            const afternoonBgStyle = getCellBackgroundStyle(afternoonCoaches);
            html += `<td style="border: 1px solid #d1d5db; padding: 6px; vertical-align: top; min-height: 40px; font-size: 11px; ${afternoonBgStyle}">${afternoonContent}</td>`;
        }
        
        html += `</tr>`;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    return html;
}

/**
 * 獲取地點列表
 */
async function getLocationList() {
    try {
        if (window.App && window.App.fetchLocations) {
            const locations = await window.App.fetchLocations();
            // 確保 Office 包含在地點列表中
            if (Array.isArray(locations) && !locations.includes('Office')) {
                locations.push('Office');
            }
            return Array.isArray(locations) ? locations : ['九龍公園', '美孚', '荔枝角公園', 'Office'];
        }
        return ['九龍公園', '美孚', '荔枝角公園', 'Office'];
    } catch (e) {
        console.warn('獲取地點列表失敗', e);
        return ['九龍公園', '美孚', '荔枝角公園', 'Office'];
    }
}

// ===== 主管更表保存功能 =====

/**
 * 添加主管專用的保存按鈕
 */
function addSupervisorSaveButton(phone) {
    const container = document.getElementById('staffRosterCalendars');
    if (!container) return;
    
    // 檢查是否已經有保存按鈕
    const existingButton = container.querySelector('.supervisor-save-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    // 創建保存按鈕
    const saveButton = document.createElement('div');
    saveButton.className = 'supervisor-save-button';
    saveButton.style.cssText = `
        margin-top: 16px;
        text-align: center;
        padding: 12px;
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 8px;
    `;
    
    saveButton.innerHTML = `
        <button onclick="saveSupervisorRoster('${phone}')" 
                style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-check-circle"></i> 確認更表
        </button>
        <p style="margin: 8px 0 0 0; color: #0369a1; font-size: 14px;">
            點擊確認將更新數據庫中的更表數據，並同步到教練賬號
        </p>
    `;
    
    container.appendChild(saveButton);
}

/**
 * 主管保存更表數據
 */
async function saveSupervisorRoster(phone) {
    try {
        console.log('💾 主管保存更表數據:', phone);
        
        if (!phone) {
            alert('無法識別教練信息');
            return;
        }
        
        // 獲取教練姓名
        const container = document.getElementById('staffRosterCalendars');
        let coachName = container?.getAttribute('data-coach-name') || `教練_${phone}`;
        
        // 🔥 修復：如果前端獲取的姓名與後端不一致，讓後端來決定正確的姓名
        // 這裡先使用電話號碼作為標識，讓後端從數據庫獲取正確的姓名
        console.log('🔍 主管保存更表 - 教練姓名:', {
            frontendName: coachName,
            phone: phone,
            containerExists: !!container
        });
        
        // 從主管頁面的月份選擇器獲取年月
        let year, month;
        
        // 查找主管頁面的月份選擇器
        const supervisorSection = document.getElementById('supervisorRosterSection');
        let rosterMonthElement = null;
        
        if (supervisorSection) {
            rosterMonthElement = supervisorSection.querySelector('#rosterMonth');
        }
        
        // 如果找不到，嘗試全局查找
        if (!rosterMonthElement) {
            rosterMonthElement = document.getElementById('rosterMonth');
        }
        
        if (rosterMonthElement && rosterMonthElement.value) {
            console.log('🔍 主管保存更表 - 月份選擇器值:', rosterMonthElement.value);
            const [selectedYear, selectedMonth] = rosterMonthElement.value.split('-');
            year = parseInt(selectedYear);
            month = parseInt(selectedMonth);
            console.log('🔍 主管保存更表 - 解析後的年月:', { year, month, selectedYear, selectedMonth });
        } else {
            // 如果沒有月份選擇器，使用當前年月
            year = new Date().getFullYear();
            month = new Date().getMonth() + 1;
            console.log('🔍 主管保存更表 - 使用當前年月:', { year, month });
        }
        const nodes = document.querySelectorAll('#staffRosterCalendars .cal-cell') || [];
        const entries = [];
        
        console.log('🔍 主管保存更表 - 數據收集:', {
            nodesFound: nodes.length,
            containerExists: !!container,
            containerId: container?.id,
            year: year,
            month: month,
            phone: phone,
            coachName: coachName
        });
        
        // 🔥 修復：從數據庫數據中獲取原始的 isClicked 狀態
        // 重新獲取該教練的原始更表數據來確定 isClicked 狀態
        const monthStr = month.toString(); // 定義 monthStr 變量
        const originalRosterData = await window.App.fetchRoster(monthStr, phone);
        const originalRosterList = Array.isArray(originalRosterData) ? originalRosterData : 
                                  (originalRosterData?.roster || []);
        
        // 建立原始 isClicked 狀態的映射
        const originalClickedMap = new Map();
        originalRosterList.forEach(item => {
            const dateStr = item?.date || item?.rosterDate || item?.day;
            if (dateStr) {
                const d = new Date(dateStr);
                if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth()+1) === month) {
                    const day = d.getDate();
                    const isClicked = item?.isClicked || false;
                    originalClickedMap.set(day, isClicked);
                }
            }
        });
        
        
        nodes.forEach(cell => {
            const dayElement = cell.querySelector('.cal-day');
            if (!dayElement) return;
            
            const day = Number(dayElement.textContent);
            if (!day) return;
            
            // 🔥 修復：使用數據庫中的原始 isClicked 狀態
            const isOriginallyClicked = originalClickedMap.get(day) || false;
            
            // ✅ 獲取當前 unavailable 狀態（從 data-unavailable 屬性）
            // 注意：如果屬性不存在，默認為 false（未請假）
            const dataUnavailable = cell.getAttribute('data-unavailable');
            const unavailable = dataUnavailable === 'true';
            
            
            // 收集該日期的所有時間欄數據
            const timeSlots = cell.querySelectorAll('.time-slot');
            let hasAnyData = false;
            
            timeSlots.forEach((slotElement, index) => {
                // ✅ 從4個下拉框中獲取時間值並組合成 hhmm-hhmm 格式
                const startHourSelect = slotElement.querySelector('.roster-time-start-hour');
                const startMinSelect = slotElement.querySelector('.roster-time-start-min');
                const endHourSelect = slotElement.querySelector('.roster-time-end-hour');
                const endMinSelect = slotElement.querySelector('.roster-time-end-min');
                const timeHidden = slotElement.querySelector('.roster-time');
                const locationElement = slotElement.querySelector('.roster-location');
                
                if (!locationElement) return;
                
                // ✅ 從下拉框獲取時間值
                const startHour = startHourSelect?.value || '';
                const startMin = startMinSelect?.value || '';
                const endHour = endHourSelect?.value || '';
                const endMin = endMinSelect?.value || '';
                
                let time = '';
                if (startHour && startMin && endHour && endMin) {
                    time = `${startHour}${startMin}-${endHour}${endMin}`;
                    // ✅ 更新隱藏的 input 值
                    if (timeHidden) {
                        timeHidden.value = time;
                    }
                } else if (timeHidden) {
                    // 如果下拉框未填寫，使用隱藏 input 的值（兼容舊數據）
                    time = timeHidden.value?.trim() || '';
                }
                
                const location = locationElement.value?.trim() || '';
                
                // ✅ 獲取 slot 編號（從 data-slot 屬性）
                const slot = parseInt(startHourSelect?.getAttribute('data-slot') || timeHidden?.getAttribute('data-slot') || (index + 1));
                
                // ✅ 只要有時間或地點，或標記了請假狀態，就認為是有效條目
                if (time || location || unavailable) {
                    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    
                    // ✅ 如果 unavailable=true（點擊了請假按鈕），則設置 isClicked=true
                    // isClicked=true 表示員工提交的請假記錄
                    // 如果 unavailable=false（取消請假），則保持原來的 isClicked 狀態（可能是 true 或 false）
                    let isClicked = isOriginallyClicked;
                    if (unavailable) {
                        // ✅ 點擊請假時，設置 isClicked=true
                        isClicked = true;
                        console.log(`✅ 日期 ${day} 點擊了請假按鈕，設置 isClicked=true`);
                    } else if (!unavailable && isOriginallyClicked) {
                        // ✅ 取消請假時，如果原來是 isClicked=true，保持原來的狀態
                        isClicked = isOriginallyClicked;
                        console.log(`ℹ️ 日期 ${day} 取消請假，保持原來的 isClicked=${isOriginallyClicked}`);
                    }
                    
                    entries.push({ 
                        date, 
                        time: time, // 保持主管編輯的時間
                        location: location, // 保持主管編輯的地點
                        slot: slot, // ✅ 添加 slot 信息（1=上午, 2=中午, 3=下午）
                        isClicked: isClicked, // ✅ 根據 unavailable 狀態設置 isClicked
                        unavailable: unavailable // ✅ 添加 unavailable 狀態（包括 false 的情況）
                    });
                    hasAnyData = true;
                }
            });
            
            // ✅ 如果沒有任何時間地點數據，但標記了請假狀態（無論 true 或 false），也要保留
            // 這樣可以確保取消請假（unavailable: false）也能保存到數據庫
            // 注意：data-unavailable 屬性總是存在（初始化時設置為 "false"），所以我們檢查是否被修改過
            // 如果原本是請假狀態，現在取消請假，或者原本不是請假狀態，現在請假，都需要保存
            if (!hasAnyData) {
                // 檢查是否有 unavailable 屬性的變化（從數據庫中獲取原始狀態）
                const originalUnavailable = originalRosterList.some(item => {
                    const dateStr = item?.date || item?.rosterDate || item?.day;
                    if (dateStr) {
                        const d = new Date(dateStr);
                        if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth()+1) === month) {
                            const itemDay = d.getDate();
                            if (itemDay === day) {
                                return item?.unavailable === true || item?.unavailable === 'true' || item?.unavailable === 1;
                            }
                        }
                    }
                    return false;
                });
                
                // ✅ 修改邏輯：如果 unavailable 為 true（批量請假設置的），或者狀態有變化，都要保存
                // 這樣可以確保批量請假的 unavailable = true 能被保存到數據庫
                if (unavailable || originalUnavailable !== unavailable || originalUnavailable) {
                    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    // ✅ 如果 unavailable=true（點擊了請假按鈕），則設置 isClicked=true
                    let isClicked = isOriginallyClicked;
                    if (unavailable) {
                        // ✅ 點擊請假時，設置 isClicked=true
                        isClicked = true;
                        console.log(`✅ 日期 ${day} 點擊了請假按鈕（無時間地點），設置 isClicked=true`);
                    }
                    
                    entries.push({ 
                        date, 
                        time: '', 
                        location: '',
                        slot: 1, // 默認 slot
                        isClicked: isClicked, // ✅ 根據 unavailable 狀態設置 isClicked
                        unavailable: unavailable // ✅ 保持請假狀態（包括 false）
                    });
                }
            }
        });
        
        if (entries.length === 0) {
            alert('沒有找到有效的更表數據');
            return;
        }
        
        if (window.App && window.App.showLoading) {
            window.App.showLoading(true);
        }
        
        // 構建請求數據
        const requestData = {
            phone: phone,
            name: coachName,
            entries: entries,
            supervisorApproved: true, // 標記為主管審核通過
            submittedBy: 'supervisor', // 標記提交者
            isSubmitted: true, // 標記為已提交狀態
            isConfirmed: false // 🔥 修復：讓後端來設置確認狀態
        };
        
        console.log('主管保存更表API請求:', requestData);
        console.log('📋 請求詳情:', {
            url: '/coach-roster/batch',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            },
            body: JSON.stringify(requestData),
            entriesCount: entries.length,
            phone: phone,
            coachName: coachName,
            year: year,
            month: month
        });
        
        const resp = await fetch('https://swimming-attendance-system-production.up.railway.app/coach-roster/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Public-Key': 'ttdrcccy',
                'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
            },
            body: JSON.stringify(requestData)
        });
        
        let json;
        try {
            json = await resp.json();
        } catch (parseError) {
            console.error('❌ 解析響應失敗:', parseError);
            alert('服務器響應格式錯誤');
            return;
        }
        console.log('主管保存API響應:', { status: resp.status, json });
        
        if (resp.ok && json?.success) {
            
            console.log('✅ 主管更表確認成功');
            
            // 重新載入更表以顯示最新數據
            await renderCoachRoster(phone);
            
            // ✅ 如果月份更表已顯示，自動刷新月份更表
            const dailyLocationStatsContainer = document.getElementById('dailyLocationStats');
            if (dailyLocationStatsContainer && !dailyLocationStatsContainer.classList.contains('empty')) {
                console.log('🔄 檢測到月份更表已顯示，自動刷新月份更表');
                // 獲取當前選擇的月份（優先從主管頁面的月份選擇器獲取）
                let targetYear, targetMonth;
                const supervisorSection = document.getElementById('supervisorRosterSection');
                let rosterMonthElement = null;
                
                if (supervisorSection) {
                    rosterMonthElement = supervisorSection.querySelector('#rosterMonth');
                }
                
                if (!rosterMonthElement) {
                    rosterMonthElement = document.getElementById('rosterMonth');
                }
                
                if (rosterMonthElement && rosterMonthElement.value) {
                    const [selectedYear, selectedMonth] = rosterMonthElement.value.split('-');
                    targetYear = parseInt(selectedYear);
                    targetMonth = parseInt(selectedMonth);
                } else {
                    // 如果沒有月份選擇器，使用當前年月
                    const now = new Date();
                    targetYear = now.getFullYear();
                    targetMonth = now.getMonth() + 1;
                }
                
                console.log('🔄 刷新月份更表:', { targetYear, targetMonth });
                await renderAllCoachesRoster(targetYear, targetMonth);
            }
        } else {
            const errorMessage = json?.message || `HTTP ${resp.status}`;
            console.error('主管確認更表失敗:', { status: resp.status, message: errorMessage, json });
            alert(`確認失敗：${errorMessage}`);
        }
    } catch (e) {
        console.error('主管保存更表失敗:', e);
        alert(`保存失敗：${e.message}`);
    } finally {
        if (window.App && window.App.showLoading) {
            window.App.showLoading(false);
        }
    }
}

// ===== 統計分析功能 =====

// 初始化教練更表統計功能
function initializeRosterStatistics() {
    try {
        // 設置當前月份
        const currentMonth = new Date().getMonth() + 1;
        // 🔥 修復：優先查找主管頁面的月份選擇器
        let statsMonthSelect = null;
        const supervisorSectionForStats = document.getElementById('supervisorRosterSection');
        if (supervisorSectionForStats && supervisorSectionForStats.classList.contains('active')) {
            statsMonthSelect = supervisorSectionForStats.querySelector('#statsMonth');
        }
        
        // 如果找不到，嘗試全局查找
        if (!statsMonthSelect) {
            statsMonthSelect = document.getElementById('statsMonth');
        }
        
        if (statsMonthSelect) {
            statsMonthSelect.value = currentMonth;
        }
        
        // 清空統計顯示區域
        // 🔥 修復：優先查找主管頁面的統計容器
        let statsContainer = null;
        const supervisorSection = document.getElementById('supervisorRosterSection');
        if (supervisorSection && supervisorSection.classList.contains('active')) {
            statsContainer = supervisorSection.querySelector('#dailyLocationStats');
        }
        
        // 如果找不到，嘗試全局查找
        if (!statsContainer) {
            statsContainer = document.getElementById('dailyLocationStats');
        }
        
        if (statsContainer) {
            // 使用依賴注入獲取地點數據
            const locations = window.App ? window.App.getLocations() : [];
            
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




// 從更表條目中提取地點信息（使用實際的地點數據）
function extractLocationFromRoster(location, time) {
    // 🔥 修復：處理空地點的情況 - 空地點不應該被分配任何地點
    if (!location || typeof location !== 'string' || location.trim() === '') {
        // 空地點直接返回無效，不應該顯示在統計表格中
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
            '九龍公園', '美孚', '荔枝角公園', 'Office'
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
function showDailyLocationStats(data) {
    // 🔥 修復：優先查找主管頁面的統計容器
    let container = null;
    
    // 先嘗試查找主管頁面的統計容器
    const supervisorSection = document.getElementById('supervisorRosterSection');
    if (supervisorSection && supervisorSection.classList.contains('active')) {
        container = supervisorSection.querySelector('#dailyLocationStats');
    }
    
    // 如果找不到，嘗試全局查找
    if (!container) {
        container = document.getElementById('dailyLocationStats');
    }
    
    if (!container) {
        console.error('❌ 找不到統計容器: dailyLocationStats');
        return;
    }
    
    // 🔥 修復：處理新的數據結構
    let statsArray, coachData;
    if (Array.isArray(data)) {
        // 兼容舊格式（直接傳入數組）
        statsArray = data;
        coachData = null;
    } else if (data && data.statsArray) {
        // 新格式（包含 statsArray 和 coachData）
        statsArray = data.statsArray;
        coachData = data.coachData;
    } else {
        console.error('❌ 無效的數據格式:', data);
        container.innerHTML = '<div class="empty">數據格式錯誤</div>';
        container.className = 'daily-stats-container empty';
        return;
    }
    
    if (!statsArray || statsArray.length === 0) {
        container.innerHTML = '<div class="empty">本月沒有更表數據</div>';
        container.className = 'daily-stats-container empty';
        return;
    }
    
    container.className = 'daily-stats-container';
    
    // 🔥 添加調試日誌
    console.log('🔍 showDailyLocationStats 調用:', {
        dataType: typeof data,
        isArray: Array.isArray(data),
        statsArrayLength: statsArray ? statsArray.length : 0,
        coachDataExists: !!coachData,
        containerExists: !!container,
        supervisorSectionExists: !!supervisorSection,
        supervisorSectionActive: supervisorSection ? supervisorSection.classList.contains('active') : false,
        containerId: container ? container.id : 'not found'
    });
    
    // 獲取月份信息
    // 🔥 修復：優先查找主管頁面的月份選擇器
    let statsMonthElement = null;
    const supervisorSectionForMonth = document.getElementById('supervisorRosterSection');
    if (supervisorSectionForMonth && supervisorSectionForMonth.classList.contains('active')) {
        statsMonthElement = supervisorSectionForMonth.querySelector('#statsMonth');
    }
    
    // 如果找不到，嘗試全局查找
    if (!statsMonthElement) {
        statsMonthElement = document.getElementById('statsMonth');
    }
    
    if (!statsMonthElement) {
        console.error('❌ 找不到統計月份選擇器: statsMonth');
        container.innerHTML = '<div class="empty">找不到統計月份選擇器</div>';
        container.className = 'daily-stats-container empty';
        return;
    }
    
    const month = parseInt(statsMonthElement.value);
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 收集所有地點和員工數據
    const locationData = new Map(); // key: location, value: Map(day, [employees])
    const allLocations = new Set();
    const allEmployees = new Set();
    
    // 處理統計數據
    statsArray.forEach(stat => {
        if (stat.locations && stat.locations.length > 0) {
            stat.locations.forEach(locObj => {
                // 修復：locObj 是一個對象 {location: string, count: number}
                // 確保正確提取地點名稱
                let location;
                if (typeof locObj === 'string') {
                    location = locObj;
                } else if (locObj && typeof locObj === 'object' && locObj.location) {
                    location = locObj.location;
                } else {
                    console.warn('⚠️ 無效的地點對象:', locObj);
                    return; // 跳過無效的地點對象
                }
                
                allLocations.add(location);
                
                if (!locationData.has(location)) {
                    locationData.set(location, new Map());
                }
                
                const dayData = locationData.get(location);
                const day = stat.day;
                
                if (!dayData.has(day)) {
                    dayData.set(day, []);
                }
                
                // 添加員工信息
                if (stat.employees && stat.employees.length > 0) {
                    stat.employees.forEach(emp => {
                        allEmployees.add(emp.name);
                        dayData.get(day).push(emp.name);
                    });
                }
            });
        }
    });
    
    // 創建新的統計表格
    let html = '<div class="stats-table-container">';
    html += '<table class="location-stats-table">';
    
    // 表頭：第一列為地點，後面的列為日期（每個日期分成3個小格子）
    html += '<thead><tr>';
    html += '<th class="location-header">地點</th>';
    
    // 添加日期列標題（每個日期3個小格子）
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
        const isToday = new Date().getDate() === day && new Date().getMonth() === month - 1;
        const todayClass = isToday ? ' today-header' : '';
        
        html += `<th class="date-header${todayClass}" colspan="3">`;
        html += `<div class="date-number">${day}</div>`;
        html += `<div class="date-weekday">${dayOfWeek}</div>`;
        html += '</th>';
    }
    html += '</tr>';
    
    // 添加小格子標題行
    html += '<tr class="slot-headers">';
    html += '<th class="location-header"></th>';
    for (let day = 1; day <= daysInMonth; day++) {
        html += '<th class="slot-header">上午</th>';
        html += '<th class="slot-header">中午</th>';
        html += '<th class="slot-header">下午</th>';
    }
    html += '</tr></thead>';
    
    // 表格主體：每行代表一個地點
    html += '<tbody>';
    
    // 定義所有可能的地點（包括沒有數據的地點）
    const predefinedLocations = [
        '九龍公園', '美孚', '荔枝角公園', 'Office'
    ];
    
    // 合併預定義地點和實際有數據的地點
    const allPossibleLocations = new Set([...predefinedLocations, ...allLocations]);
    
    // 按地點名稱排序，但Office永遠在最後
    const sortedLocations = Array.from(allPossibleLocations).sort((a, b) => {
        // Office 永遠排在最後
        if (a === 'Office') return 1;
        if (b === 'Office') return -1;
        // 其他地點按字母順序排序
        return a.localeCompare(b);
    });
    
    sortedLocations.forEach(location => {
        html += '<tr>';
        html += `<td class="location-name">${location}</td>`;
        
        // 為每個日期添加3個小格子
        for (let day = 1; day <= daysInMonth; day++) {
            const dayData = locationData.get(location)?.get(day) || [];
            
            // 🔥 簡化：直接按順序分配到上午、中午、下午
            const timeSlots = ['上午', '中午', '下午'];
            const employeesBySlot = {
                '上午': [],
                '中午': [],
                '下午': []
            };
            
            // 將教練按順序分配到三個時段
            dayData.forEach((employee, index) => {
                const slotIndex = index % 3;
                const slotName = timeSlots[slotIndex];
                employeesBySlot[slotName].push(employee);
            });
            
            // 生成三個時段單元格
            timeSlots.forEach(slotName => {
                const employees = employeesBySlot[slotName] || [];
                const uniqueEmployees = Array.from(new Set(employees));
                const employeeText = uniqueEmployees.join(', ') || '';
                const isEmpty = !employeeText;
                const cellClass = isEmpty ? 'empty-slot' : 'employee-slot';
                
                html += `<td class="${cellClass}" title="${slotName}: ${employeeText}">${employeeText}</td>`;
            });
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '</div>';
    
    // 添加統計信息
    const totalLocations = allLocations.size;
    const totalEmployees = allEmployees.size;
    const totalDays = daysInMonth;
    
    html += '<div class="stats-summary">';
    html += `<h5>統計摘要</h5>`;
    html += `<p>📊 <strong>已確認更表統計</strong>：本月共有 <strong>${totalLocations}</strong> 個地點，<strong>${totalEmployees}</strong> 名員工參與排班</p>`;
    html += `<p>📅 統計期間：${year}年${month}月（共${totalDays}天）</p>`;
    html += `<p>✅ 數據來源：僅包含主管已確認的更表記錄</p>`;
    html += '</div>';
    
    // 🔥 添加調試日誌
    console.log('🔍 準備渲染統計表格:', {
        htmlLength: html.length,
        containerId: container.id,
        totalLocations,
        totalEmployees,
        totalDays
    });
    
    container.innerHTML = html;
    
    // 🔥 強制確保容器可見
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.height = 'auto';
    container.style.minHeight = '100px';
    
    // 🔥 添加渲染後的調試日誌
    console.log('✅ 統計表格渲染完成:', {
        containerHTML: container.innerHTML.length,
        hasTable: container.querySelector('table') !== null,
        containerDisplay: container.style.display,
        containerVisibility: container.style.visibility,
        containerOpacity: container.style.opacity,
        containerHeight: container.style.height,
        containerMinHeight: container.style.minHeight
    });
}

// 導出地點統計數據為PDF（使用純JavaScript方法）
function exportLocationStats() {
    try {
        // 🔥 修復：優先查找主管頁面的月份選擇器
        let statsMonthElement = null;
        const supervisorSection = document.getElementById('supervisorRosterSection');
        if (supervisorSection && supervisorSection.classList.contains('active')) {
            statsMonthElement = supervisorSection.querySelector('#statsMonth');
        }
        
        // 如果找不到，嘗試全局查找
        if (!statsMonthElement) {
            statsMonthElement = document.getElementById('statsMonth');
        }
        
        if (!statsMonthElement) {
            alert('找不到統計月份選擇器');
            return;
        }
        
        const month = parseInt(statsMonthElement.value);
        const year = new Date().getFullYear();
        
        // 定義月份名稱數組
        const monthNames = [
            '一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'
        ];
        const monthName = monthNames[month - 1];
        
        // 🔥 修復：優先查找主管頁面的統計容器
        let container = null;
        if (supervisorSection && supervisorSection.classList.contains('active')) {
            container = supervisorSection.querySelector('#dailyLocationStats');
        }
        
        // 如果找不到，嘗試全局查找
        if (!container) {
            container = document.getElementById('dailyLocationStats');
        }
        
        if (!container || container.classList.contains('empty')) {
            alert('請先生成統計數據');
            return;
        }
        
        // 創建CSV格式的數據
        const csvData = generateCSVData(container, year, monthName);
        
        // 下載CSV文件
        downloadCSV(csvData, `${year}年${monthName}教練更表_${new Date().toISOString().split('T')[0]}.csv`);
        
        console.log('✅ CSV導出成功');
        
    } catch (error) {
        console.error('❌ CSV導出失敗:', error);
        alert('CSV導出失敗: ' + error.message);
    }
}

// 生成CSV數據
function generateCSVData(container, year, monthName) {
    const table = container.querySelector('table');
    if (!table) {
        throw new Error('找不到統計表格');
    }
    
    let csvContent = `"${year}年${monthName}教練更表"\n`;
    csvContent += `"生成時間：${new Date().toLocaleString('zh-TW')}"\n\n`;
    
    // 獲取表格標題
    const headers = table.querySelectorAll('thead th');
    const headerRow = Array.from(headers).map(th => `"${th.textContent.trim()}"`).join(',');
    csvContent += headerRow + '\n';
    
    // 獲取表格內容
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(cell => {
            const text = cell.textContent.trim();
            // 處理包含逗號或引號的內容
            return `"${text.replace(/"/g, '""')}"`;
        }).join(',');
        csvContent += rowData + '\n';
    });
    
    // 添加統計摘要
    const summaryDiv = container.querySelector('.stats-summary');
        if (summaryDiv) {
        csvContent += '\n"統計摘要"\n';
        const summaryText = summaryDiv.textContent.trim();
        const lines = summaryText.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            csvContent += `"${line.trim()}"\n`;
        });
    }
    
    return csvContent;
}

// 下載CSV文件
function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 將主管功能導出到全局作用域
window.showSupervisorSection = showSupervisorSection;
window.updateSupervisorUserInfo = updateSupervisorUserInfo;
window.showSupervisorWorkHours = showSupervisorWorkHours;
window.showSupervisorAttendance = showSupervisorAttendance;
window.initializeSupervisorAttendanceInterface = initializeSupervisorAttendanceInterface;
window.refreshSupervisorAttendanceBoard = refreshSupervisorAttendanceBoard;
window.showSupervisorReports = showSupervisorReports;
window.showSupervisorPersonalSettings = showSupervisorPersonalSettings;
window.showStaffRoster = showStaffRoster;

// 显示主管雜項界面
window.showSupervisorMisc = function() {
    // ✅ 先獲取要顯示的元素，避免在 hideAllFeatures 後找不到
    const miscSection = document.getElementById('supervisorMiscSection');
    const supervisorSection = document.getElementById('supervisorSection');
    
    if (window.App && window.App.hideAllFeatures) {
        window.App.hideAllFeatures();
    }
    
    // ✅ 確保主管section是活動的
    if (supervisorSection && !supervisorSection.classList.contains('active')) {
        supervisorSection.classList.add('active');
        supervisorSection.style.setProperty('display', 'block', 'important');
    }
    
    // ✅ 隱藏主菜單（feature-grid）
    const featureGrid = supervisorSection?.querySelector('.feature-grid');
    if (featureGrid) {
        featureGrid.style.display = 'none';
    }
    
    if (miscSection) {
        miscSection.classList.remove('hidden');
        // ✅ 使用 setProperty 與 'important' 來覆蓋 CSS 的 !important 規則
        miscSection.style.setProperty('display', 'block', 'important');
        miscSection.style.setProperty('visibility', 'visible', 'important');
        miscSection.classList.add('active');
        
        setTimeout(() => {
            // 初始狀態：收起員工創建內容
            const content = document.getElementById('employeeCreateContent');
            const icon = document.getElementById('employeeCreateIcon');
            if (content && icon) {
                content.classList.add('hidden');
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        }, 50);
    } else {
        console.error('❌ 找不到主管雜項界面元素');
    }
};
window.initializeSupervisorRosterInterface = initializeSupervisorRosterInterface;
window.populateCoachSelect = populateCoachSelect;
window.onChangeStaffCoach = onChangeStaffCoach;
window.onRosterMonthChange = onRosterMonthChange;
window.renderCoachRoster = renderCoachRoster;
window.renderAllCoachesRoster = renderAllCoachesRoster;
window.initializeRosterStatistics = initializeRosterStatistics;
window.showDailyLocationStats = showDailyLocationStats;
window.extractLocationFromRoster = extractLocationFromRoster;
window.exportLocationStats = exportLocationStats;
window.populateLocationSelect = populateLocationSelect;
window.populateClubSelect = populateClubSelect;
window.addSupervisorSaveButton = addSupervisorSaveButton;
window.saveSupervisorRoster = saveSupervisorRoster;

// ===== 批量修改功能（旧版本 - 将被新版本替代） =====

// 假期类型颜色配置
const BATCH_MODIFY_LEAVE_TYPE_COLORS = {
    'regular': '#fef3c7',    // 例假 - 黄色
    'annual': '#dbeafe',     // 年假 - 蓝色
    'maternity': '#fce7f3',  // 产假 - 粉色
    'sick': '#dcfce7',      // 病假 - 绿色
    'nopaid': '#fee2e2',    // No Paid - 红色
    'statutory': '#e0e7ff'   // 法定劳工假 - 紫色
};

const BATCH_MODIFY_LEAVE_TYPE_BORDER_COLORS = {
    'regular': '#fbbf24',
    'annual': '#3b82f6',
    'maternity': '#ec4899',
    'sick': '#22c55e',
    'nopaid': '#ef4444',
    'statutory': '#6366f1'
};

/**
 * 打开批量操作模态框
 */
function openBatchOperationModal() {
    const modal = document.getElementById('batchOperationModal');
    if (!modal) return;
    
    // 检查是否选择了员工
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    if (!selectedPhone) {
        alert('請先選擇要操作的員工！批量操作需要先選擇一個員工。');
        return;
    }
    
    // 重置状态
    batchSelectedDates.clear();
    batchOperationActive = true;
    currentLeaveType = null;
    leaveDatesByType.clear();
    regularLeaveWeekday = null;
    regularLeaveDateRange = { start: null, end: null };
    updateBatchSelectionDisplay();
    
    // 加载地点选项
    loadBatchLocationOptions();
    
    // ✅ 初始化批量填充的时间选择器
    initializeBatchTimeSelectors();
    
    // 生成批量操作专用日历（会显示当前选择的员工）
    generateBatchOperationCalendar();
    
    // ✅ 如果已有例假日期，重新应用高亮显示
    if (leaveDatesByType.has('regular') && leaveDatesByType.get('regular').size > 0) {
        setTimeout(() => {
            updateBatchCalendarLeaveHighlight();
            updateLeaveHighlightInCalendar();
        }, 100);
    }
    
    // 绑定操作模式切换事件
    document.querySelectorAll('input[name="batchMode"]').forEach(radio => {
        radio.removeEventListener('change', handleBatchModeChange);
        radio.addEventListener('change', handleBatchModeChange);
    });
    
    // 初始化模式显示（默认显示填充模式）
    handleBatchModeChange();
    
    // ✅ 初始化确认执行按钮状态（根据是否有选中日期）
    updateBatchSelectionDisplay();
    
    // 显示模态框
    modal.classList.remove('hidden');
}

/**
 * 关闭批量操作模态框
 */
function closeBatchOperationModal() {
    const modal = document.getElementById('batchOperationModal');
    if (!modal) return;
    
    batchOperationActive = false;
    batchSelectedDates.clear();
    currentLeaveType = null;
    leaveDatesByType.clear();
    regularLeaveWeekday = null;
    regularLeaveDateRange = { start: null, end: null };
    
    // 移除日历选择样式
    disableBatchDateSelection();
    
    // 隐藏预览
    const preview = document.getElementById('batchPreview');
    if (preview) preview.classList.add('hidden');
    
    // ✅ 重置确认按钮（会根据日期选择状态自动更新）
    const executeBtn = document.getElementById('batchExecuteBtn');
    if (executeBtn) executeBtn.disabled = true;
    
    // ✅ 重置假期类型按钮状态
    document.querySelectorAll('.leave-type-btn').forEach(btn => {
        btn.style.borderColor = '#d1d5db';
        btn.style.background = '#fff';
    });
    
    // ✅ 隐藏所有假期设置
    document.querySelectorAll('.leave-type-settings').forEach(el => {
        el.classList.add('hidden');
    });
    
    modal.classList.add('hidden');
}

/**
 * 处理模态框点击事件（点击外部关闭）
 */
function handleBatchModalClick(event) {
    // 如果点击的是模态框背景（不是内容区域），则关闭
    if (event.target.id === 'batchOperationModal') {
        closeBatchOperationModal();
    }
}

/**
 * 处理操作模式切换
 */
function handleBatchModeChange() {
    const mode = document.querySelector('input[name="batchMode"]:checked')?.value;
    
    // 隐藏所有模式内容
    document.querySelectorAll('.batch-mode-content').forEach(el => {
        el.classList.add('hidden');
    });
    
    // 显示对应模式内容
    if (mode === 'fill') {
        document.getElementById('batchFillSettings')?.classList.remove('hidden');
    } else if (mode === 'leave') {
        document.getElementById('batchLeaveSettings')?.classList.remove('hidden');
    } else if (mode === 'clear') {
        document.getElementById('batchClearSettings')?.classList.remove('hidden');
    }
    
    // 重置预览
    const preview = document.getElementById('batchPreview');
    if (preview) preview.classList.add('hidden');
    const executeBtn = document.getElementById('batchExecuteBtn');
    if (executeBtn) executeBtn.disabled = true;
}

/**
 * 生成批量操作专用日历
 */
function generateBatchOperationCalendar() {
    const calendarContainer = document.getElementById('batchOperationCalendar');
    if (!calendarContainer) return;
    
    // 获取当前选择的员工
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    // 检查是否选择了员工
    if (!selectedPhone) {
        calendarContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <p style="margin: 0; font-weight: 600;">⚠️ 請先選擇員工</p>
                <p style="margin: 8px 0 0 0; font-size: 14px;">批量操作需要先選擇要操作的員工</p>
            </div>
        `;
        return;
    }
    
    // 获取员工名称
    let employeeName = '';
    if (coachSelect && coachSelect.options) {
        const selectedOption = Array.from(coachSelect.options).find(opt => opt.value === selectedPhone);
        if (selectedOption) {
            employeeName = selectedOption.textContent || selectedOption.text || '';
        }
    }
    
    // 获取当前月份
    const monthSelect = document.getElementById('rosterMonth');
    if (!monthSelect || !monthSelect.value) {
        // 如果没有选择月份，使用当前月份
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        renderBatchCalendar(year, month, calendarContainer, employeeName);
        return;
    }
    
    const [year, month] = monthSelect.value.split('-').map(Number);
    renderBatchCalendar(year, month, calendarContainer, employeeName);
}

/**
 * 渲染批量操作日历
 */
function renderBatchCalendar(year, month, container, employeeName = '') {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=周日, 1=周一, ..., 6=周六
    
    // 星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    
    let html = `<div class="batch-calendar-header">`;
    if (employeeName) {
        html += `<div style="margin-bottom: 4px; font-size: 14px; color: #6b7280; font-weight: 500;">員工：${employeeName}</div>`;
    }
    html += `<h5>${year}年${month}月</h5>
    </div>`;
    
    html += `<div class="batch-calendar-grid">`;
    
    // 星期标题（可點擊選中整列）
    weekdays.forEach((day, index) => {
        html += `<div class="batch-calendar-weekday" style="cursor: pointer; user-select: none;" onclick="selectBatchWeekdayColumn(${index})" title="點擊選中此列所有日期">${day}</div>`;
    });
    
    // 填充开始前的空白
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div class="batch-calendar-day batch-calendar-empty"></div>`;
    }
    
    // 生成日期
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const weekday = date.getDay();
        const isWeekend = weekday === 0 || weekday === 6;
        const isSelected = batchSelectedDates.has(day);
        
        html += `<div class="batch-calendar-day ${isWeekend ? 'batch-calendar-weekend' : ''} ${isSelected ? 'batch-calendar-selected' : ''}" 
            data-day="${day}" 
            onclick="toggleBatchDateSelectionFromCalendar(${day}, this)">
            ${day}
        </div>`;
    }
    
    html += `</div>`;
    
    container.innerHTML = html;
    
    // ✅ 日历生成后，立即应用假期高亮显示
    setTimeout(() => {
        updateBatchCalendarLeaveHighlight();
    }, 50);
}

/**
 * 从批量操作日历切换日期选择 - 支持假期类型
 */
function toggleBatchDateSelectionFromCalendar(day, element) {
    // ✅ 如果选择了假期类型，使用假期类型逻辑
    if (currentLeaveType) {
        const monthSelect = document.getElementById('rosterMonth');
        let year, month;
        if (monthSelect?.value) {
            const parts = monthSelect.value.split('-').map(Number);
            year = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
            month = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
        } else {
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1;
        }
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 初始化该假期类型的日期集合
        if (!leaveDatesByType.has(currentLeaveType)) {
            leaveDatesByType.set(currentLeaveType, new Set());
        }
        
        const dates = leaveDatesByType.get(currentLeaveType);
        
        if (dates.has(dateStr)) {
            // 取消选择
            dates.delete(dateStr);
            if (dates.size === 0) {
                leaveDatesByType.delete(currentLeaveType);
            }
        } else {
            // 选择
            dates.add(dateStr);
        }
        
        // ✅ 更新日历高亮显示（包括颜色）
        updateLeaveHighlightInCalendar();
        updateBatchCalendarLeaveHighlight();
        
        // 更新确认按钮状态
        updateBatchSelectionDisplay();
        return;
    }
    
    // 如果没有选择假期类型，使用原来的批量选择逻辑
    if (batchSelectedDates.has(day)) {
        batchSelectedDates.delete(day);
        element.classList.remove('batch-calendar-selected');
        
        // 同时更新主日历
        const calendar = document.getElementById('staffRosterCalendars');
        if (calendar) {
            const cells = calendar.querySelectorAll('.cal-cell');
            cells.forEach(cell => {
                const dayElement = cell.querySelector('.cal-day');
                if (dayElement && parseInt(dayElement.textContent) === day) {
                    cell.classList.remove('batch-selected');
                }
            });
        }
    } else {
        batchSelectedDates.add(day);
        element.classList.add('batch-calendar-selected');
        
        // 同时更新主日历
        const calendar = document.getElementById('staffRosterCalendars');
        if (calendar) {
            const cells = calendar.querySelectorAll('.cal-cell');
            cells.forEach(cell => {
                const dayElement = cell.querySelector('.cal-day');
                if (dayElement && parseInt(dayElement.textContent) === day) {
                    cell.classList.add('batch-selected');
                }
            });
        }
    }
    
    updateBatchSelectionDisplay();
}

/**
 * 启用日历日期选择（保留原有功能，用于主日历）
 */
function enableBatchDateSelection() {
    const calendar = document.getElementById('staffRosterCalendars');
    if (!calendar) return;
    
    const cells = calendar.querySelectorAll('.cal-cell');
    cells.forEach(cell => {
        const dayElement = cell.querySelector('.cal-day');
        if (!dayElement) return;
        
        const day = parseInt(dayElement.textContent);
        if (!day || isNaN(day)) return;
        
        // 添加可选择样式
        cell.classList.add('batch-selectable');
        
        // 检查是否已经选中
        if (batchSelectedDates.has(day)) {
            cell.classList.add('batch-selected');
        }
        
        // 添加点击事件（使用事件委托，避免重复绑定）
        if (!cell.hasAttribute('data-batch-listener')) {
            cell.setAttribute('data-batch-listener', 'true');
            cell.addEventListener('click', function(e) {
                // 如果点击的是输入框、选择框或按钮，不触发选择
                if (e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'SELECT' || 
                    e.target.tagName === 'BUTTON' ||
                    e.target.closest('input') ||
                    e.target.closest('select') ||
                    e.target.closest('button')) {
                    return;
                }
                
                // 阻止事件冒泡
                e.stopPropagation();
                
                toggleBatchDateSelection(day, cell);
            });
        }
    });
}

/**
 * 禁用日历日期选择（保留原有功能，用于主日历）
 */
function disableBatchDateSelection() {
    const calendar = document.getElementById('staffRosterCalendars');
    if (!calendar) return;
    
    const cells = calendar.querySelectorAll('.cal-cell');
    cells.forEach(cell => {
        cell.classList.remove('batch-selectable', 'batch-selected');
        cell.removeAttribute('data-batch-listener');
    });
}

/**
 * ✅ 切换日期选择状态（从主日历）- 支持假期类型
 */
function toggleBatchDateSelection(day, cellElement) {
    if (!currentLeaveType) {
        // 如果没有选择假期类型，使用原来的批量选择逻辑
    if (batchSelectedDates.has(day)) {
        batchSelectedDates.delete(day);
        cellElement.classList.remove('batch-selected');
        
        // 同时更新批量操作日历
        const batchCalendar = document.getElementById('batchOperationCalendar');
        if (batchCalendar) {
            const dayElement = batchCalendar.querySelector(`.batch-calendar-day[data-day="${day}"]`);
            if (dayElement) {
                dayElement.classList.remove('batch-calendar-selected');
            }
        }
    } else {
        batchSelectedDates.add(day);
        cellElement.classList.add('batch-selected');
        
        // 同时更新批量操作日历
        const batchCalendar = document.getElementById('batchOperationCalendar');
        if (batchCalendar) {
            const dayElement = batchCalendar.querySelector(`.batch-calendar-day[data-day="${day}"]`);
            if (dayElement) {
                dayElement.classList.add('batch-calendar-selected');
            }
        }
        }
        updateBatchSelectionDisplay();
        return;
    }
    
    // ✅ 假期类型选择逻辑
    const monthSelect = document.getElementById('rosterMonth');
    let year, month;
    if (monthSelect?.value) {
        const parts = monthSelect.value.split('-').map(Number);
        year = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
        month = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // 初始化该假期类型的日期集合
    if (!leaveDatesByType.has(currentLeaveType)) {
        leaveDatesByType.set(currentLeaveType, new Set());
    }
    
    const dates = leaveDatesByType.get(currentLeaveType);
    
    if (dates.has(dateStr)) {
        // 取消选择
        dates.delete(dateStr);
        if (dates.size === 0) {
            leaveDatesByType.delete(currentLeaveType);
        }
    } else {
        // 选择
        dates.add(dateStr);
    }
    
    // 更新日历高亮显示
    updateLeaveHighlightInCalendar();
    updateBatchCalendarLeaveHighlight();
    
    // 更新确认按钮状态
    updateBatchSelectionDisplay();
}

/**
 * ✅ 更新选择显示（支持假期类型）
 */
function updateBatchSelectionDisplay() {
    const countElement = document.getElementById('selectedDatesCount');
    const listElement = document.getElementById('batchSelectedDatesList');
    const executeBtn = document.getElementById('batchExecuteBtn');
    
    if (!countElement || !listElement) return;
    
    // ✅ 如果选择了假期类型，计算所有假期类型的日期总数
    let count = 0;
    let allDates = [];
    
    if (currentLeaveType && leaveDatesByType.size > 0) {
        // 计算所有假期类型的日期总数
        for (let [leaveType, dates] of leaveDatesByType) {
            count += dates.size;
            dates.forEach(dateStr => {
                const day = parseInt(dateStr.split('-')[2]);
                if (!isNaN(day)) {
                    allDates.push({ day, dateStr, leaveType });
                }
            });
        }
    } else {
        // 使用原来的批量选择逻辑
        count = batchSelectedDates.size;
        allDates = Array.from(batchSelectedDates).map(day => ({ day }));
    }
    
    countElement.textContent = `已选择：${count}个日期`;
    
    if (count === 0) {
        listElement.innerHTML = '<p class="batch-hint">请在下方日历中点击日期进行选择</p>';
        // ✅ 没有选择日期时，禁用确认执行按钮
        if (executeBtn) {
            executeBtn.disabled = true;
        }
    } else {
        // 按日期排序
        allDates.sort((a, b) => a.day - b.day);
        
        // 生成日期标签列表
        const leaveTypeNames = { 
            regular: '例假', 
            annual: '年假', 
            maternity: '产假', 
            sick: '病假', 
            nopaid: 'No Paid', 
            statutory: '法定劳工假' 
        };
        
        listElement.innerHTML = allDates.map(({ day, leaveType }) => {
            const typeLabel = leaveType ? ` (${leaveTypeNames[leaveType] || leaveType})` : '';
            return `<span class="batch-selected-date-tag">
                ${day}日${typeLabel}
                <span class="remove-date" onclick="removeBatchDate(${day})">×</span>
            </span>`;
        }).join('');
        
        // ✅ 有选择日期时，自动启用确认执行按钮
        if (executeBtn) {
            executeBtn.disabled = false;
        }
    }
}

/**
 * 移除选中的日期 - 支持假期类型
 */
function removeBatchDate(day) {
    // ✅ 如果选择了假期类型，从 leaveDatesByType 中移除
    if (currentLeaveType) {
        const monthSelect = document.getElementById('rosterMonth');
        let year, month;
        if (monthSelect?.value) {
            const parts = monthSelect.value.split('-').map(Number);
            year = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
            month = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
        } else {
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1;
        }
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 从所有假期类型中移除该日期
        for (let [leaveType, dates] of leaveDatesByType) {
            if (dates.has(dateStr)) {
                dates.delete(dateStr);
                if (dates.size === 0) {
                    leaveDatesByType.delete(leaveType);
                }
            }
        }
        
        // ✅ 更新日历高亮显示（包括颜色）
        updateLeaveHighlightInCalendar();
        updateBatchCalendarLeaveHighlight();
    } else {
        // 使用原来的批量选择逻辑
        batchSelectedDates.delete(day);
        
        // 更新主日历显示
        const calendar = document.getElementById('staffRosterCalendars');
        if (calendar) {
            const cells = calendar.querySelectorAll('.cal-cell');
            cells.forEach(cell => {
                const dayElement = cell.querySelector('.cal-day');
                if (dayElement && parseInt(dayElement.textContent) === day) {
                    cell.classList.remove('batch-selected');
                }
            });
        }
        
        // 更新批量操作日历显示
        const batchCalendar = document.getElementById('batchOperationCalendar');
        if (batchCalendar) {
            const dayElement = batchCalendar.querySelector(`.batch-calendar-day[data-day="${day}"]`);
            if (dayElement) {
                dayElement.classList.remove('batch-calendar-selected');
            }
        }
    }
    
    updateBatchSelectionDisplay();
}

/**
 * 清空选择 - 支持假期类型
 */
function clearBatchSelection() {
    // ✅ 如果选择了假期类型，清空 leaveDatesByType
    if (currentLeaveType) {
        leaveDatesByType.clear();
        // ✅ 更新日历高亮显示（包括颜色）
        updateLeaveHighlightInCalendar();
        updateBatchCalendarLeaveHighlight();
    } else {
        batchSelectedDates.clear();
        
        // 更新主日历显示
        disableBatchDateSelection();
        enableBatchDateSelection();
        
        // 更新批量操作日历显示
        const batchCalendar = document.getElementById('batchOperationCalendar');
        if (batchCalendar) {
            const selectedDays = batchCalendar.querySelectorAll('.batch-calendar-selected');
            selectedDays.forEach(day => {
                day.classList.remove('batch-calendar-selected');
            });
        }
    }
    
    updateBatchSelectionDisplay();
}

/**
 * 选择工作日（周一到周五）- 支持假期类型
 */
function selectWeekdays() {
    const monthSelect = document.getElementById('rosterMonth');
    if (!monthSelect || !monthSelect.value) return;
    
    let year, month;
    if (monthSelect.value) {
        const parts = monthSelect.value.split('-').map(Number);
        year = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
        month = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // ✅ 如果选择了假期类型，添加到 leaveDatesByType
    if (currentLeaveType) {
        if (!leaveDatesByType.has(currentLeaveType)) {
            leaveDatesByType.set(currentLeaveType, new Set());
        }
        const dates = leaveDatesByType.get(currentLeaveType);
        dates.clear();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const weekday = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
            if (weekday >= 1 && weekday <= 5) { // 周一到周五
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                dates.add(dateStr);
            }
        }
        
        // ✅ 更新日历高亮显示（包括颜色）
        updateLeaveHighlightInCalendar();
        updateBatchCalendarLeaveHighlight();
    } else {
        batchSelectedDates.clear();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const weekday = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
            if (weekday >= 1 && weekday <= 5) { // 周一到周五
                batchSelectedDates.add(day);
            }
        }
        
        // 更新主日历显示
        disableBatchDateSelection();
        enableBatchDateSelection();
        
        // 更新批量操作日历显示
        updateBatchCalendarSelection();
    }
    
    updateBatchSelectionDisplay();
}

/**
 * 选择周末（周六和周日）- 支持假期类型
 */
function selectWeekends() {
    const monthSelect = document.getElementById('rosterMonth');
    if (!monthSelect || !monthSelect.value) return;
    
    let year, month;
    if (monthSelect.value) {
        const parts = monthSelect.value.split('-').map(Number);
        year = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
        month = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // ✅ 如果选择了假期类型，添加到 leaveDatesByType
    if (currentLeaveType) {
        if (!leaveDatesByType.has(currentLeaveType)) {
            leaveDatesByType.set(currentLeaveType, new Set());
        }
        const dates = leaveDatesByType.get(currentLeaveType);
        dates.clear();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const weekday = date.getDay(); // 0=周日, 6=周六
            if (weekday === 0 || weekday === 6) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                dates.add(dateStr);
            }
        }
        
        // ✅ 更新日历高亮显示（包括颜色）
        updateLeaveHighlightInCalendar();
        updateBatchCalendarLeaveHighlight();
    } else {
        batchSelectedDates.clear();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const weekday = date.getDay(); // 0=周日, 6=周六
            if (weekday === 0 || weekday === 6) {
                batchSelectedDates.add(day);
            }
        }
        
        // 更新主日历显示
        disableBatchDateSelection();
        enableBatchDateSelection();
        
        // 更新批量操作日历显示
        updateBatchCalendarSelection();
    }
    
    updateBatchSelectionDisplay();
}

/**
 * 更新批量操作日历的选择状态
 */
function updateBatchCalendarSelection() {
    const batchCalendar = document.getElementById('batchOperationCalendar');
    if (!batchCalendar) return;
    
    const dayElements = batchCalendar.querySelectorAll('.batch-calendar-day[data-day]');
    dayElements.forEach(element => {
        const day = parseInt(element.getAttribute('data-day'));
        if (batchSelectedDates.has(day)) {
            element.classList.add('batch-calendar-selected');
        } else {
            element.classList.remove('batch-calendar-selected');
        }
    });
}

/**
 * 加载地点选项到批量操作界面
 */
async function loadBatchLocationOptions() {
    try {
        const locations = await getLocationList();
        
        // 填充所有地点选择器
        for (let i = 1; i <= 3; i++) {
            const select = document.getElementById(`batchLocation${i}`);
            if (select) {
                select.innerHTML = '<option value="">请选择地点</option>' +
                    locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('加载地点列表失败:', error);
    }
}

/**
 * 预览批量操作（可选功能，不影响执行）
 */
function previewBatchOperation() {
    if (batchSelectedDates.size === 0) {
        alert('请先选择要操作的日期');
        return;
    }
    
    const mode = document.querySelector('input[name="batchMode"]:checked')?.value;
    if (!mode) return;
    
    const previewElement = document.getElementById('batchPreview');
    const previewContent = document.getElementById('batchPreviewContent');
    
    if (!previewElement || !previewContent) return;
    
    let previewHTML = '';
    const datesArray = Array.from(batchSelectedDates).sort((a, b) => a - b);
    
    if (mode === 'fill') {
        previewHTML = generateFillPreview(datesArray);
    } else if (mode === 'leave') {
        previewHTML = generateLeavePreview(datesArray);
    } else if (mode === 'clear') {
        previewHTML = generateClearPreview(datesArray);
    }
    
    previewContent.innerHTML = previewHTML;
    previewElement.classList.remove('hidden');
    
    // ✅ 预览不再控制确认执行按钮的启用状态，按钮会根据日期选择自动启用
}

/**
 * 生成填充预览
 */
function generateFillPreview(datesArray) {
    const slot1 = document.getElementById('batchSlot1')?.checked;
    const slot2 = document.getElementById('batchSlot2')?.checked;
    const slot3 = document.getElementById('batchSlot3')?.checked;
    const time1 = document.getElementById('batchTime1')?.value || '';
    const loc1 = document.getElementById('batchLocation1')?.value || '';
    const time2 = document.getElementById('batchTime2')?.value || '';
    const loc2 = document.getElementById('batchLocation2')?.value || '';
    const time3 = document.getElementById('batchTime3')?.value || '';
    const loc3 = document.getElementById('batchLocation3')?.value || '';
    const conflictMode = document.querySelector('input[name="batchConflict"]:checked')?.value;
    
    let slotsCount = 0;
    if (slot1) slotsCount++;
    if (slot2) slotsCount++;
    if (slot3) slotsCount++;
    
    const totalSlots = datesArray.length * slotsCount;
    
    let html = `<div style="margin-bottom: 16px; padding: 12px; background: #e0f2fe; border-radius: 8px;">
        <strong>操作统计：</strong><br>
        - 目标日期：${datesArray.length}个<br>
        - 将修改时段：${totalSlots}个<br>
        - 冲突处理：${conflictMode === 'overwrite' ? '覆盖已有数据' : conflictMode === 'skip' ? '跳过已有数据' : '仅填充空白时段'}
    </div>`;
    
    html += '<div style="max-height: 200px; overflow-y: auto;">';
    datesArray.forEach(day => {
        const dateStr = `${day}日`;
        let operations = [];
        
        if (slot1 && (time1 || loc1)) {
            operations.push(`上午：${time1 || '(无时间)'} | ${loc1 || '(无地点)'}`);
        }
        if (slot2 && (time2 || loc2)) {
            operations.push(`中午：${time2 || '(无时间)'} | ${loc2 || '(无地点)'}`);
        }
        if (slot3 && (time3 || loc3)) {
            operations.push(`下午：${time3 || '(无时间)'} | ${loc3 || '(无地点)'}`);
        }
        
        if (operations.length > 0) {
            html += `<div class="batch-preview-item new">
                <strong>${dateStr}</strong>：${operations.join('；')}
            </div>`;
        }
    });
    html += '</div>';
    
    return html;
}

/**
 * 生成请假预览（简化版本）
 */
function generateLeavePreview(datesArray) {
    let html = `<div style="margin-bottom: 16px; padding: 12px; background: #e0f2fe; border-radius: 8px;">
        <strong>操作统计：</strong><br>
        - 目标日期：${datesArray.length}个<br>
        - 操作内容：将选中日期标记为请假（unavailable = true）
    </div>`;
    
    html += '<div style="max-height: 200px; overflow-y: auto;">';
    datesArray.forEach(day => {
        html += `<div class="batch-preview-item">
            <strong>${day}日</strong>：标记为请假
        </div>`;
    });
    html += '</div>';
    
    return html;
}

/**
 * 生成清除预览
 */
function generateClearPreview(datesArray) {
    const slot1 = document.getElementById('batchClearSlot1')?.checked;
    const slot2 = document.getElementById('batchClearSlot2')?.checked;
    const slot3 = document.getElementById('batchClearSlot3')?.checked;
    const clearTime = document.getElementById('batchClearTime')?.checked;
    const clearLocation = document.getElementById('batchClearLocation')?.checked;
    const clearLeave = document.getElementById('batchClearLeave')?.checked;
    
    let slots = [];
    if (slot1) slots.push('上午');
    if (slot2) slots.push('中午');
    if (slot3) slots.push('下午');
    
    let clearItems = [];
    if (clearTime) clearItems.push('时间');
    if (clearLocation) clearItems.push('地点');
    if (clearLeave) clearItems.push('请假状态');
    
    let html = `<div style="margin-bottom: 16px; padding: 12px; background: #e0f2fe; border-radius: 8px;">
        <strong>操作统计：</strong><br>
        - 目标日期：${datesArray.length}个<br>
        - 清除时段：${slots.join('、') || '无'}<br>
        - 清除内容：${clearItems.join('、') || '无'}
    </div>`;
    
    html += '<div style="max-height: 200px; overflow-y: auto;">';
    datesArray.forEach(day => {
        html += `<div class="batch-preview-item">
            <strong>${day}日</strong>：清除${slots.join('、') || '所有'}时段的${clearItems.join('、') || '数据'}
        </div>`;
    });
    html += '</div>';
    
    return html;
}

/**
 * 执行批量操作
 */
function executeBatchOperation() {
    // 检查是否选择了员工
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    if (!selectedPhone) {
        alert('請先選擇要操作的員工！');
        return;
    }
    
    const mode = document.querySelector('input[name="batchMode"]:checked')?.value;
    if (!mode) return;
    
    // ✅ 批量请假模式使用 leaveDatesByType，其他模式使用 batchSelectedDates
    if (mode === 'leave') {
        // 检查是否有选择的假期日期
        if (leaveDatesByType.size === 0) {
            alert('請先選擇假期類型和日期！');
            return;
        }
        
        // 统计所有假期日期
        let totalDates = 0;
        for (let [leaveType, dates] of leaveDatesByType) {
            totalDates += dates.size;
        }
        
        if (totalDates === 0) {
            alert('請先選擇假期日期！');
            return;
        }
    } else {
        // 其他模式（fill, clear）使用 batchSelectedDates
        if (batchSelectedDates.size === 0) {
            alert('请先选择要操作的日期');
            return;
        }
    }
    
    // 获取员工名称
    let employeeName = '';
    if (coachSelect && coachSelect.options) {
        const selectedOption = Array.from(coachSelect.options).find(opt => opt.value === selectedPhone);
        if (selectedOption) {
            employeeName = selectedOption.textContent || selectedOption.text || '';
        }
    }
    
    let operationText = '';
    let dateCount = 0;
    if (mode === 'fill') {
        operationText = '填充';
        dateCount = batchSelectedDates.size;
    } else if (mode === 'leave') {
        operationText = '請假（標記 unavailable = true）';
        // ✅ 统计所有假期日期
        for (let [leaveType, dates] of leaveDatesByType) {
            dateCount += dates.size;
        }
    } else if (mode === 'clear') {
        operationText = '清除';
        dateCount = batchSelectedDates.size;
    }
    
    if (!confirm(`確認要對員工「${employeeName}」的 ${dateCount} 個日期執行批量${operationText}操作嗎？`)) {
        return;
    }
    
    try {
        if (mode === 'fill') {
            executeBatchFill();
        } else if (mode === 'leave') {
            executeBatchLeave();
        } else if (mode === 'clear') {
            executeBatchClear();
        }
        
        // 关闭模态框
        closeBatchOperationModal();
        
        // 显示成功提示
        let successText = '';
        if (mode === 'fill') {
            successText = '批量填充完成！';
        } else if (mode === 'leave') {
            successText = '批量請假完成！已將選中日期標記為請假。\n\n💡 請記得點擊"確認更表"按鈕將請假狀態保存到數據庫。';
        } else if (mode === 'clear') {
            successText = '批量清除完成！';
        }
        alert(`${successText}\n\n已處理員工「${employeeName}」的 ${batchSelectedDates.size} 個日期`);
        
    } catch (error) {
        console.error('批量操作失败:', error);
        alert(`批量操作失敗：${error.message}`);
    }
}

/**
 * 执行批量填充
 */
function executeBatchFill() {
    // 获取当前选择的员工
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    if (!selectedPhone) {
        alert('請先選擇要操作的員工！');
        return;
    }
    
    const calendar = document.getElementById('staffRosterCalendars');
    if (!calendar) return;
    
    // ✅ 只操作当前选择的员工的日历
    // 检查容器是否有 data-coach-phone 属性，确保只操作对应员工的日历
    const containerPhone = calendar.getAttribute('data-coach-phone');
    if (containerPhone && containerPhone !== selectedPhone) {
        console.warn('⚠️ 日历容器与选择的员工不匹配，重新渲染日历');
        renderCoachRoster(selectedPhone);
        // 等待渲染完成后再执行操作
        setTimeout(() => {
            executeBatchFill();
        }, 500);
        return;
    }
    
    const slot1 = document.getElementById('batchSlot1')?.checked;
    const slot2 = document.getElementById('batchSlot2')?.checked;
    const slot3 = document.getElementById('batchSlot3')?.checked;
    const time1 = document.getElementById('batchTime1')?.value || '';
    const loc1 = document.getElementById('batchLocation1')?.value || '';
    const time2 = document.getElementById('batchTime2')?.value || '';
    const loc2 = document.getElementById('batchLocation2')?.value || '';
    const time3 = document.getElementById('batchTime3')?.value || '';
    const loc3 = document.getElementById('batchLocation3')?.value || '';
    const conflictMode = document.querySelector('input[name="batchConflict"]:checked')?.value;
    
    const cells = calendar.querySelectorAll('.cal-cell');
    
    batchSelectedDates.forEach(day => {
        cells.forEach(cell => {
            const dayElement = cell.querySelector('.cal-day');
            if (!dayElement) return;
            
            const cellDay = parseInt(dayElement.textContent);
            if (cellDay !== day) return;
            
            // 处理每个时段
            if (slot1) {
                fillSlot(cell, 1, time1, loc1, conflictMode);
            }
            if (slot2) {
                fillSlot(cell, 2, time2, loc2, conflictMode);
            }
            if (slot3) {
                fillSlot(cell, 3, time3, loc3, conflictMode);
            }
        });
    });
}

/**
 * 填充单个时段
 */
function fillSlot(cell, slotIndex, time, location, conflictMode) {
    const timeInput = cell.querySelector(`.roster-time[data-slot="${slotIndex}"]`);
    const locationSelect = cell.querySelector(`.roster-location[data-slot="${slotIndex}"]`);
    
    if (!timeInput || !locationSelect) return;
    
    // 检查冲突处理
    const hasExistingData = timeInput.value || locationSelect.value;
    if (hasExistingData && conflictMode === 'skip') {
        return; // 跳过已有数据
    }
    
    if (hasExistingData && conflictMode === 'blank') {
        return; // 仅填充空白时段
    }
    
    // 填充数据
    if (time) timeInput.value = time;
    if (location) locationSelect.value = location;
    
    // 触发change事件以确保数据更新
    timeInput.dispatchEvent(new Event('input', { bubbles: true }));
    locationSelect.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * ✅ 初始化批量填充的时间选择器
 */
function initializeBatchTimeSelectors() {
    const modal = document.getElementById('batchOperationModal');
    if (!modal) return;
    
    // 获取所有时间选择器
    const startHourSelects = modal.querySelectorAll('.roster-time-start-hour');
    const startMinSelects = modal.querySelectorAll('.roster-time-start-min');
    const endHourSelects = modal.querySelectorAll('.roster-time-end-hour');
    const endMinSelects = modal.querySelectorAll('.roster-time-end-min');
    
    // 初始化小时选项（0-23）
    startHourSelects.forEach(select => {
        if (select.innerHTML === '<option value="">時</option>') {
            for (let hour = 0; hour <= 23; hour++) {
                const hourStr = String(hour).padStart(2, '0');
                const option = document.createElement('option');
                option.value = hourStr;
                option.textContent = hourStr;
                select.appendChild(option);
            }
        }
    });
    
    endHourSelects.forEach(select => {
        if (select.innerHTML === '<option value="">時</option>') {
            for (let hour = 0; hour <= 23; hour++) {
                const hourStr = String(hour).padStart(2, '0');
                const option = document.createElement('option');
                option.value = hourStr;
                option.textContent = hourStr;
                select.appendChild(option);
            }
        }
    });
    
    // 初始化分钟选项（5分钟间隔）
    startMinSelects.forEach(select => {
        if (select.innerHTML === '<option value="">分</option>') {
            for (let minute = 0; minute < 60; minute += 5) {
                const minStr = String(minute).padStart(2, '0');
                const option = document.createElement('option');
                option.value = minStr;
                option.textContent = minStr;
                select.appendChild(option);
            }
        }
    });
    
    endMinSelects.forEach(select => {
        if (select.innerHTML === '<option value="">分</option>') {
            for (let minute = 0; minute < 60; minute += 5) {
                const minStr = String(minute).padStart(2, '0');
                const option = document.createElement('option');
                option.value = minStr;
                option.textContent = minStr;
                select.appendChild(option);
            }
        }
    });
    
    // ✅ 添加事件监听器，当选择改变时更新隐藏的 roster-time 值
    modal.querySelectorAll('.roster-time-start-hour, .roster-time-start-min, .roster-time-end-hour, .roster-time-end-min').forEach(select => {
        select.addEventListener('change', function() {
            const slot = this.getAttribute('data-slot');
            const timeHidden = modal.querySelector(`.roster-time[data-slot="${slot}"]`);
            if (!timeHidden) return;
            
            const startHour = modal.querySelector(`.roster-time-start-hour[data-slot="${slot}"]`)?.value || '';
            const startMin = modal.querySelector(`.roster-time-start-min[data-slot="${slot}"]`)?.value || '';
            const endHour = modal.querySelector(`.roster-time-end-hour[data-slot="${slot}"]`)?.value || '';
            const endMin = modal.querySelector(`.roster-time-end-min[data-slot="${slot}"]`)?.value || '';
            
            if (startHour && startMin && endHour && endMin) {
                timeHidden.value = `${startHour}${startMin}-${endHour}${endMin}`;
            } else {
                timeHidden.value = '';
            }
        });
    });
}

/**
 * ✅ 选择假期类型
 */
function selectLeaveType(leaveType) {
    currentLeaveType = leaveType;
    
    // 更新按钮样式
    document.querySelectorAll('.leave-type-btn').forEach(btn => {
        const btnType = btn.getAttribute('data-leave-type');
        if (btnType === leaveType) {
            btn.style.borderColor = LEAVE_TYPE_BORDER_COLORS[leaveType] || '#3b82f6';
            btn.style.background = LEAVE_TYPE_COLORS[leaveType] || '#dbeafe';
        } else {
            btn.style.borderColor = '#d1d5db';
            btn.style.background = '#fff';
        }
    });
    
    // 显示/隐藏对应的设置
    document.querySelectorAll('.leave-type-settings').forEach(el => {
        el.classList.add('hidden');
    });
    
    if (leaveType === 'regular') {
        document.getElementById('regularLeaveSettings')?.classList.remove('hidden');
        // ✅ 如果已有例假日期范围，立即高亮显示
        if (regularLeaveWeekday !== null && regularLeaveDateRange.start && regularLeaveDateRange.end) {
            setTimeout(() => {
                highlightRegularLeaveDates();
            }, 50);
        }
    } else if (leaveType === 'statutory') {
        alert('法定劳工假功能待更新');
        return;
    } else {
        document.getElementById('manualLeaveSettings')?.classList.remove('hidden');
        // 启用日历日期选择
        enableBatchDateSelection();
    }
}

/**
 * ✅ 选择例假的星期
 */
function selectRegularLeaveWeekday(weekday) {
    regularLeaveWeekday = weekday;
    
    // 更新按钮样式
    document.querySelectorAll('.weekday-btn').forEach(btn => {
        const btnWeekday = parseInt(btn.getAttribute('data-weekday'));
        if (btnWeekday === weekday) {
            btn.style.borderColor = '#3b82f6';
            btn.style.background = '#dbeafe';
        } else {
            btn.style.borderColor = '#d1d5db';
            btn.style.background = '#fff';
        }
    });
    
    // 获取日期范围
    const startDate = document.getElementById('regularLeaveStartDate')?.value;
    const endDate = document.getElementById('regularLeaveEndDate')?.value;
    
    if (!startDate || !endDate) {
        alert('請先選擇日期時間段');
        return;
    }
    
    regularLeaveDateRange.start = startDate;
    regularLeaveDateRange.end = endDate;
    
    // 计算并高亮显示日期
    highlightRegularLeaveDates();
    
    // ✅ 确保日历立即更新显示
    setTimeout(() => {
        updateBatchCalendarLeaveHighlight();
        updateLeaveHighlightInCalendar();
    }, 100);
}

/**
 * ✅ 高亮显示例假日期（支持跨月份）
 */
function highlightRegularLeaveDates() {
    if (regularLeaveWeekday === null || !regularLeaveDateRange.start || !regularLeaveDateRange.end) {
        console.log('⚠️ highlightRegularLeaveDates 缺少必要参数:', {
            regularLeaveWeekday,
            start: regularLeaveDateRange.start,
            end: regularLeaveDateRange.end
        });
        return;
    }
    
    // 解析日期范围字符串（YYYY-MM-DD 格式）
    const [startYear, startMonth, startDay] = regularLeaveDateRange.start.split('-').map(Number);
    const [endYear, endMonth, endDay] = regularLeaveDateRange.end.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    
    // 初始化例假日期集合
    if (!leaveDatesByType.has('regular')) {
        leaveDatesByType.set('regular', new Set());
    }
    const regularDates = leaveDatesByType.get('regular');
    
    // 清空之前的例假日期（重新计算）
    regularDates.clear();
    
    // 遍历日期范围，找出所有对应星期的日期（包括跨月份的日期）
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === regularLeaveWeekday) {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            regularDates.add(dateStr);
        }
    }
    
    console.log('✅ 例假日期计算完成:', {
        weekday: regularLeaveWeekday,
        weekdayName: ['日', '一', '二', '三', '四', '五', '六'][regularLeaveWeekday],
        dateRange: `${regularLeaveDateRange.start} 至 ${regularLeaveDateRange.end}`,
        totalDates: regularDates.size,
        dates: Array.from(regularDates).sort()
    });
    
    // ✅ 更新当前月份的日历显示
    updateLeaveHighlightInCalendar();
    
    // ✅ 更新批量操作日历（当前月份）
    const batchCalendar = document.getElementById('batchOperationCalendar');
    if (batchCalendar) {
        updateBatchCalendarLeaveHighlight();
    }
    
    // ✅ 如果日期范围跨越了其他月份，需要更新那些月份的显示
    // 获取当前查看的月份
    const monthSelect = document.getElementById('rosterMonth');
    let currentYear, currentMonth;
    if (monthSelect?.value) {
        const parts = monthSelect.value.split('-').map(Number);
        currentYear = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
        currentMonth = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
    } else {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth() + 1;
    }
    
    console.log('✅ 例假日期范围:', {
        start: `${startYear}-${String(startMonth).padStart(2, '0')}`,
        end: `${endYear}-${String(endMonth).padStart(2, '0')}`,
        current: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        totalDates: regularDates.size
    });
}

/**
 * ✅ 更新批量操作日历中的假期高亮
 */
function updateBatchCalendarLeaveHighlight() {
    const calendar = document.getElementById('batchOperationCalendar');
    if (!calendar) {
        console.log('⚠️ updateBatchCalendarLeaveHighlight: 找不到日历容器');
        return;
    }
    
    const days = calendar.querySelectorAll('.batch-calendar-day');
    if (days.length === 0) {
        console.log('⚠️ updateBatchCalendarLeaveHighlight: 日历中没有日期元素');
        return;
    }
    
    const monthSelect = document.getElementById('rosterMonth');
    let year, month;
    if (monthSelect?.value) {
        const parts = monthSelect.value.split('-').map(Number);
        year = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
        month = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }
    
    console.log('🔄 updateBatchCalendarLeaveHighlight 开始:', { year, month, daysCount: days.length });
    
    // ✅ 先清除所有假期样式
    days.forEach(dayEl => {
        dayEl.classList.remove('leave-regular', 'leave-annual', 'leave-maternity', 'leave-sick', 'leave-nopaid', 'leave-statutory');
        dayEl.style.background = '';
        dayEl.style.borderColor = '';
        dayEl.style.borderWidth = '';
        dayEl.style.borderStyle = '';
        dayEl.title = '';
    });
    
    // ✅ 高亮星期列（例假功能）- 先执行，确保例假日期被添加到 leaveDatesByType
    if (regularLeaveWeekday !== null && regularLeaveDateRange.start && regularLeaveDateRange.end) {
        const startDateStr = regularLeaveDateRange.start; // YYYY-MM-DD 格式
        const endDateStr = regularLeaveDateRange.end; // YYYY-MM-DD 格式
        
        console.log('🔍 检查例假星期列高亮:', {
            weekday: regularLeaveWeekday,
            weekdayName: ['日', '一', '二', '三', '四', '五', '六'][regularLeaveWeekday],
            start: startDateStr,
            end: endDateStr,
            currentMonth: `${year}-${String(month).padStart(2, '0')}`
        });
        
        // 解析日期范围
        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
        
        // ✅ 检查当前月份是否在日期范围内
        // 修复：正确计算当前月份的最后一天
        const currentMonthStart = new Date(year, month - 1, 1);
        // ✅ 使用更安全的方式获取当前月份的最后一天
        const currentMonthEnd = new Date(year, month, 0); // 下个月的第0天 = 当前月份的最后一天
        
        const rangeStart = new Date(startYear, startMonth - 1, startDay);
        const rangeEnd = new Date(endYear, endMonth - 1, endDay);
        
        // ✅ 验证日期是否有效
        const isValidDate = (date) => !isNaN(date.getTime());
        
        if (!isValidDate(currentMonthStart) || !isValidDate(currentMonthEnd) || 
            !isValidDate(rangeStart) || !isValidDate(rangeEnd)) {
            console.error('❌ 日期无效:', {
                currentMonthStart: isValidDate(currentMonthStart) ? currentMonthStart.toISOString().split('T')[0] : 'INVALID',
                currentMonthEnd: isValidDate(currentMonthEnd) ? currentMonthEnd.toISOString().split('T')[0] : 'INVALID',
                rangeStart: isValidDate(rangeStart) ? rangeStart.toISOString().split('T')[0] : 'INVALID',
                rangeEnd: isValidDate(rangeEnd) ? rangeEnd.toISOString().split('T')[0] : 'INVALID',
                year, month, startYear, startMonth, startDay, endYear, endMonth, endDay
            });
            return;
        }
        
        console.log('🔍 日期范围比较（批量操作日历）:', {
            currentMonth: `${year}-${String(month).padStart(2, '0')}`,
            currentMonthStart: currentMonthStart.toISOString().split('T')[0],
            currentMonthEnd: currentMonthEnd.toISOString().split('T')[0],
            rangeStart: rangeStart.toISOString().split('T')[0],
            rangeEnd: rangeEnd.toISOString().split('T')[0],
            condition1: currentMonthStart <= rangeEnd,
            condition2: currentMonthEnd >= rangeStart,
            willHighlight: currentMonthStart <= rangeEnd && currentMonthEnd >= rangeStart
        });
        
        // 如果当前月份与日期范围有重叠
        if (currentMonthStart <= rangeEnd && currentMonthEnd >= rangeStart) {
            console.log('✅ 当前月份在日期范围内，开始高亮星期列');
            
            // 高亮整个星期列
            let highlightedCount = 0;
            days.forEach(dayEl => {
                const day = parseInt(dayEl.textContent);
                if (!day || isNaN(day)) return;
                
                const date = new Date(year, month - 1, day);
                const dateDayOfWeek = date.getDay();
                
                // 检查是否匹配选择的星期
                if (dateDayOfWeek === regularLeaveWeekday) {
                    // 检查该日期是否在日期范围内（只比较日期部分，不考虑时间）
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dateObj = new Date(year, month - 1, day);
                    const rangeStartObj = new Date(startYear, startMonth - 1, startDay);
                    const rangeEndObj = new Date(endYear, endMonth - 1, endDay);
                    
                    // 重置时间部分为0，只比较日期
                    dateObj.setHours(0, 0, 0, 0);
                    rangeStartObj.setHours(0, 0, 0, 0);
                    rangeEndObj.setHours(23, 59, 59, 999);
                    
                    if (dateObj >= rangeStartObj && dateObj <= rangeEndObj) {
                        // 添加到 leaveDatesByType（如果还没有）
                        if (!leaveDatesByType.has('regular')) {
                            leaveDatesByType.set('regular', new Set());
                        }
                        leaveDatesByType.get('regular').add(dateStr);
                        
                        // 添加例假样式
                        dayEl.classList.add('leave-regular');
                        dayEl.style.background = LEAVE_TYPE_COLORS['regular'] || '#fef3c7';
                        dayEl.style.borderColor = LEAVE_TYPE_BORDER_COLORS['regular'] || '#fbbf24';
                        dayEl.style.borderWidth = '2px';
                        dayEl.style.borderStyle = 'solid';
                        highlightedCount++;
                        
                        console.log(`✅ 高亮日期: ${dateStr} (星期${['日', '一', '二', '三', '四', '五', '六'][dateDayOfWeek]})`);
                    }
                }
            });
            
            console.log(`✅ 星期列高亮完成，共高亮 ${highlightedCount} 个日期`);
        } else {
            console.log('⚠️ 当前月份不在日期范围内');
        }
    }
    
    // ✅ 收集该日期所有假期类型并应用样式
    days.forEach(dayEl => {
        const day = parseInt(dayEl.textContent);
        if (!day || isNaN(day)) return;
        
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const leaveTypesForThisDate = [];
        
        // 检查该日期有哪些假期类型
        for (let [leaveType, dates] of leaveDatesByType) {
            if (dates.has(dateStr)) {
                leaveTypesForThisDate.push(leaveType);
            }
        }
        
        // ✅ 如果有假期，应用样式（优先显示第一个假期类型的颜色）
        if (leaveTypesForThisDate.length > 0) {
            const primaryLeaveType = leaveTypesForThisDate[0];
            dayEl.classList.add(`leave-${primaryLeaveType}`);
            const bgColor = LEAVE_TYPE_COLORS[primaryLeaveType] || '#f3f4f6';
            const borderColor = LEAVE_TYPE_BORDER_COLORS[primaryLeaveType] || '#d1d5db';
            
            dayEl.style.background = bgColor;
            dayEl.style.borderColor = borderColor;
            dayEl.style.borderWidth = '2px';
            dayEl.style.borderStyle = 'solid';
            
            // ✅ 如果有多个假期类型，添加标题提示
            if (leaveTypesForThisDate.length > 1) {
                dayEl.title = `假期类型: ${leaveTypesForThisDate.map(t => {
                    const names = { regular: '例假', annual: '年假', maternity: '产假', sick: '病假', nopaid: 'No Paid', statutory: '法定劳工假' };
                    return names[t] || t;
                }).join(', ')}`;
            }
        }
    });
    
    console.log('✅ updateBatchCalendarLeaveHighlight 完成');
}

/**
 * ✅ 更新主日历中的假期高亮
 */
function updateLeaveHighlightInCalendar() {
    const calendar = document.getElementById('staffRosterCalendars');
    if (!calendar) return;
    
    const cells = calendar.querySelectorAll('.cal-cell');
    const monthSelect = document.getElementById('rosterMonth');
    let year, month;
    if (monthSelect?.value) {
        const parts = monthSelect.value.split('-').map(Number);
        year = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
        month = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }
    
    // ✅ 先清除所有假期样式
    cells.forEach(cell => {
        cell.classList.remove('leave-regular', 'leave-annual', 'leave-maternity', 'leave-sick', 'leave-nopaid', 'leave-statutory');
        cell.style.background = '';
        cell.style.borderColor = '';
        cell.style.borderWidth = '';
        cell.style.borderStyle = '';
    });
    
    // ✅ 收集该日期所有假期类型并应用样式
    cells.forEach(cell => {
        const dayElement = cell.querySelector('.cal-day');
        if (!dayElement) return;
        
        const day = parseInt(dayElement.textContent);
        if (!day || isNaN(day)) return;
        
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const leaveTypesForThisDate = [];
        
        // 检查该日期有哪些假期类型
        for (let [leaveType, dates] of leaveDatesByType) {
            if (dates.has(dateStr)) {
                leaveTypesForThisDate.push(leaveType);
            }
        }
        
        // ✅ 如果有假期，应用样式（优先显示第一个假期类型的颜色）
        if (leaveTypesForThisDate.length > 0) {
            const primaryLeaveType = leaveTypesForThisDate[0];
            cell.classList.add(`leave-${primaryLeaveType}`);
            const bgColor = LEAVE_TYPE_COLORS[primaryLeaveType] || '#f3f4f6';
            const borderColor = LEAVE_TYPE_BORDER_COLORS[primaryLeaveType] || '#d1d5db';
            
            cell.style.background = bgColor;
            cell.style.borderColor = borderColor;
            cell.style.borderWidth = '2px';
            cell.style.borderStyle = 'solid';
        }
    });
    
    // ✅ 高亮星期列（例假功能）
    if (regularLeaveWeekday !== null && regularLeaveDateRange.start && regularLeaveDateRange.end) {
        const startDateStr = regularLeaveDateRange.start; // YYYY-MM-DD 格式
        const endDateStr = regularLeaveDateRange.end; // YYYY-MM-DD 格式
        
        // 解析日期范围
        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
        
        // ✅ 检查当前月份是否在日期范围内
        // 修复：正确计算当前月份的最后一天
        const currentMonthStart = new Date(year, month - 1, 1);
        // ✅ 使用更安全的方式获取当前月份的最后一天
        const currentMonthEnd = new Date(year, month, 0); // 下个月的第0天 = 当前月份的最后一天
        
        const rangeStart = new Date(startYear, startMonth - 1, startDay);
        const rangeEnd = new Date(endYear, endMonth - 1, endDay);
        
        // ✅ 验证日期是否有效
        const isValidDate = (date) => !isNaN(date.getTime());
        
        if (!isValidDate(currentMonthStart) || !isValidDate(currentMonthEnd) || 
            !isValidDate(rangeStart) || !isValidDate(rangeEnd)) {
            console.error('❌ 日期无效（主日历）:', {
                currentMonthStart: isValidDate(currentMonthStart) ? currentMonthStart.toISOString().split('T')[0] : 'INVALID',
                currentMonthEnd: isValidDate(currentMonthEnd) ? currentMonthEnd.toISOString().split('T')[0] : 'INVALID',
                rangeStart: isValidDate(rangeStart) ? rangeStart.toISOString().split('T')[0] : 'INVALID',
                rangeEnd: isValidDate(rangeEnd) ? rangeEnd.toISOString().split('T')[0] : 'INVALID',
                year, month, startYear, startMonth, startDay, endYear, endMonth, endDay
            });
            return;
        }
        
        console.log('🔍 日期范围比较（主日历）:', {
            currentMonth: `${year}-${String(month).padStart(2, '0')}`,
            currentMonthStart: currentMonthStart.toISOString().split('T')[0],
            currentMonthEnd: currentMonthEnd.toISOString().split('T')[0],
            rangeStart: rangeStart.toISOString().split('T')[0],
            rangeEnd: rangeEnd.toISOString().split('T')[0],
            condition1: currentMonthStart <= rangeEnd,
            condition2: currentMonthEnd >= rangeStart,
            willHighlight: currentMonthStart <= rangeEnd && currentMonthEnd >= rangeStart
        });
        
        // 如果当前月份与日期范围有重叠
        if (currentMonthStart <= rangeEnd && currentMonthEnd >= rangeStart) {
            // 高亮整个星期列
            cells.forEach(cell => {
                const dayElement = cell.querySelector('.cal-day');
                if (!dayElement) return;
                
                const day = parseInt(dayElement.textContent);
                if (!day || isNaN(day)) return;
                
                const date = new Date(year, month - 1, day);
                const dateDayOfWeek = date.getDay();
                
                // 检查是否匹配选择的星期
                if (dateDayOfWeek === regularLeaveWeekday) {
                    // 检查该日期是否在日期范围内（只比较日期部分，不考虑时间）
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dateObj = new Date(year, month - 1, day);
                    const rangeStartObj = new Date(startYear, startMonth - 1, startDay);
                    const rangeEndObj = new Date(endYear, endMonth - 1, endDay);
                    
                    // 重置时间部分为0，只比较日期
                    dateObj.setHours(0, 0, 0, 0);
                    rangeStartObj.setHours(0, 0, 0, 0);
                    rangeEndObj.setHours(23, 59, 59, 999);
                    
                    if (dateObj >= rangeStartObj && dateObj <= rangeEndObj) {
                        // 添加到 leaveDatesByType（如果还没有）
                        if (!leaveDatesByType.has('regular')) {
                            leaveDatesByType.set('regular', new Set());
                        }
                        leaveDatesByType.get('regular').add(dateStr);
                        
                        // 添加例假样式
                        cell.classList.add('leave-regular');
                        cell.style.background = LEAVE_TYPE_COLORS['regular'] || '#fef3c7';
                        cell.style.borderColor = LEAVE_TYPE_BORDER_COLORS['regular'] || '#fbbf24';
                        cell.style.borderWidth = '2px';
                        cell.style.borderStyle = 'solid';
                    }
                }
            });
        }
    }
}

/**
 * ✅ 执行批量请假（支持多种假期类型）
 */
function executeBatchLeave() {
    // 获取当前选择的员工
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    if (!selectedPhone) {
        alert('請先選擇要操作的員工！');
        return;
    }
    
    // 检查是否有选择的假期日期
    if (leaveDatesByType.size === 0) {
        alert('請先選擇假期類型和日期！');
        return;
    }
    
    // 获取员工名称
    let employeeName = '';
    if (coachSelect && coachSelect.options) {
        const selectedOption = Array.from(coachSelect.options).find(opt => opt.value === selectedPhone);
        if (selectedOption) {
            employeeName = selectedOption.textContent || selectedOption.text || '';
        }
    }
    
    // 统计所有假期日期
    let totalDates = 0;
    for (let [leaveType, dates] of leaveDatesByType) {
        totalDates += dates.size;
    }
    
    if (totalDates === 0) {
        alert('請先選擇假期日期！');
        return;
    }
    
    if (!confirm(`確認要對員工「${employeeName}」的 ${totalDates} 個日期執行批量請假操作嗎？`)) {
        return;
    }
    
    // 准备提交到后端的数据
    const leaveEntries = [];
    const monthSelect = document.getElementById('rosterMonth');
    let currentYear, currentMonth;
    if (monthSelect?.value) {
        const parts = monthSelect.value.split('-').map(Number);
        currentYear = parts[0] && !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
        currentMonth = parts[1] && !isNaN(parts[1]) ? parts[1] : new Date().getMonth() + 1;
    } else {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth() + 1;
    }
    
    // 遍历所有假期类型和日期
    for (let [leaveType, dates] of leaveDatesByType) {
        dates.forEach(dateStr => {
            const [year, month, day] = dateStr.split('-').map(Number);
            
            // 构建完整的日期字符串（YYYY-MM-DD）
            const fullDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            leaveEntries.push({
                date: fullDateStr,
                phone: selectedPhone,
                name: employeeName, // ✅ 添加员工名称
                leaveType: leaveType,
                unavailable: true,
                isClicked: true, // ✅ 批量请假时，isClicked 设置为 true
                isSubmitted: false,
                isConfirmed: false,
                supervisorApproved: false,
                submittedBy: 'supervisor',
                updatedAt: new Date()
            });
        });
    }
    
    // ✅ 提交到后端
    if (databaseConnector) {
        databaseConnector.submitBatchLeave(selectedPhone, leaveEntries)
            .then((result) => {
                console.log('✅ 批量请假保存成功:', result);
                alert(`✅ 批量請假完成！已將 ${totalDates} 個日期標記為請假，並已保存到數據庫。\n\n新增: ${result.insertedCount || 0} 條\n更新: ${result.modifiedCount || 0} 條`);
                
                // 关闭模态框
                closeBatchOperationModal();
                
                // 重新加载更表数据
                renderCoachRoster(selectedPhone);
                
                // ✅ 如果月份更表已顯示，自動刷新月份更表
                const dailyLocationStatsContainer = document.getElementById('dailyLocationStats');
                if (dailyLocationStatsContainer && !dailyLocationStatsContainer.classList.contains('empty')) {
                    console.log('🔄 批量請假後，檢測到月份更表已顯示，自動刷新月份更表');
                    // 獲取當前選擇的月份
                    const statsMonthElement = document.getElementById('statsMonth');
                    if (statsMonthElement && statsMonthElement.value) {
                        const month = parseInt(statsMonthElement.value);
                        const year = new Date().getFullYear();
                        renderAllCoachesRoster(year, month);
                    } else {
                        // 如果沒有月份選擇器，使用當前年月
                        const now = new Date();
                        renderAllCoachesRoster(now.getFullYear(), now.getMonth() + 1);
                    }
                }
            })
            .catch(error => {
                console.error('批量請假失敗:', error);
                alert(`批量請假失敗：${error.message}`);
            });
    } else {
        // 如果没有数据库连接器，使用原来的方式（仅前端标记）
        const calendar = document.getElementById('staffRosterCalendars');
        if (!calendar) return;
    
    const cells = calendar.querySelectorAll('.cal-cell');
    let updatedCount = 0;
    
        // 遍历所有假期日期，将 unavailable 设置为 true
        for (let [leaveType, dates] of leaveDatesByType) {
            dates.forEach(dateStr => {
                const [year, month, day] = dateStr.split('-').map(Number);
                
                // 只处理当前月份的日期
                if (year === currentYear && month === currentMonth) {
        cells.forEach(cell => {
            const dayElement = cell.querySelector('.cal-day');
            if (!dayElement) return;
            
            const cellDay = parseInt(dayElement.textContent);
            if (cellDay !== day) return;
            
            // ✅ 直接将 unavailable 设置为 true
            cell.setAttribute('data-unavailable', 'true');
                        cell.setAttribute('data-leave-type', leaveType);
            updatedCount++;
        });
                }
    });
        }
    
    if (updatedCount > 0) {
            alert(`✅ 批量請假完成：已將 ${updatedCount} 個日期標記為請假。\n\n💡 請記得點擊"確認更表"按鈕將請假狀態保存到數據庫。`);
        }
    }
}

/**
 * 执行批量清除
 */
function executeBatchClear() {
    // 获取当前选择的员工
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    if (!selectedPhone) {
        alert('請先選擇要操作的員工！');
        return;
    }
    
    const calendar = document.getElementById('staffRosterCalendars');
    if (!calendar) return;
    
    // ✅ 只操作当前选择的员工的日历
    const containerPhone = calendar.getAttribute('data-coach-phone');
    if (containerPhone && containerPhone !== selectedPhone) {
        console.warn('⚠️ 日历容器与选择的员工不匹配，重新渲染日历');
        renderCoachRoster(selectedPhone);
        setTimeout(() => {
            executeBatchClear();
        }, 500);
        return;
    }
    
    const slot1 = document.getElementById('batchClearSlot1')?.checked;
    const slot2 = document.getElementById('batchClearSlot2')?.checked;
    const slot3 = document.getElementById('batchClearSlot3')?.checked;
    const clearTime = document.getElementById('batchClearTime')?.checked;
    const clearLocation = document.getElementById('batchClearLocation')?.checked;
    const clearLeave = document.getElementById('batchClearLeave')?.checked;
    
    const cells = calendar.querySelectorAll('.cal-cell');
    
    batchSelectedDates.forEach(day => {
        cells.forEach(cell => {
            const dayElement = cell.querySelector('.cal-day');
            if (!dayElement) return;
            
            const cellDay = parseInt(dayElement.textContent);
            if (cellDay !== day) return;
            
            // 清除时段数据
            if (slot1) clearSlot(cell, 1, clearTime, clearLocation);
            if (slot2) clearSlot(cell, 2, clearTime, clearLocation);
            if (slot3) clearSlot(cell, 3, clearTime, clearLocation);
            
            // 清除请假状态
            if (clearLeave) {
                cell.setAttribute('data-unavailable', 'false');
            }
        });
    });
}

/**
 * 清除单个时段
 */
function clearSlot(cell, slotIndex, clearTime = true, clearLocation = true) {
    if (clearTime) {
        const timeInput = cell.querySelector(`.roster-time[data-slot="${slotIndex}"]`);
        if (timeInput) {
            timeInput.value = '';
            timeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    if (clearLocation) {
        const locationSelect = cell.querySelector(`.roster-location[data-slot="${slotIndex}"]`);
        if (locationSelect) {
            locationSelect.value = '';
            locationSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

// 导出函数到全局作用域
/**
 * 選中批量操作日曆中某個星期列的所有日期
 */
function selectBatchWeekdayColumn(weekdayIndex) {
    const calendarContainer = document.getElementById('batchOperationCalendar');
    if (!calendarContainer) return;
    
    // 獲取當前顯示的年份和月份
    const monthSelect = document.getElementById('rosterMonth');
    if (!monthSelect || !monthSelect.value) return;
    
    const [year, month] = monthSelect.value.split('-').map(Number);
    
    // 計算該月份的第一天是星期幾
    const firstDay = new Date(year, month - 1, 1);
    const startDayOfWeek = firstDay.getDay(); // 0=周日, 1=周一, ..., 6=周六
    
    // 計算該月份有多少天
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    // 找出該星期列的所有日期
    const datesInColumn = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === weekdayIndex) {
            datesInColumn.push(day);
        }
    }
    
    // 選中或取消選中這些日期
    const allSelected = datesInColumn.every(day => batchSelectedDates.has(day));
    
    datesInColumn.forEach(day => {
        if (allSelected) {
            // 如果全部已選中，則取消選中
            batchSelectedDates.delete(day);
        } else {
            // 如果未全部選中，則選中
            batchSelectedDates.add(day);
        }
        
        // 更新日曆顯示
        const dayElement = calendarContainer.querySelector(`.batch-calendar-day[data-day="${day}"]`);
        if (dayElement) {
            if (allSelected) {
                dayElement.classList.remove('batch-calendar-selected');
            } else {
                dayElement.classList.add('batch-calendar-selected');
            }
        }
        
        // 同時更新主日曆
        const calendar = document.getElementById('staffRosterCalendars');
        if (calendar) {
            const cells = calendar.querySelectorAll('.cal-cell');
            cells.forEach(cell => {
                const dayElement = cell.querySelector('.cal-day');
                if (dayElement && parseInt(dayElement.textContent) === day) {
                    if (allSelected) {
                        cell.classList.remove('batch-selected');
                    } else {
                        cell.classList.add('batch-selected');
                    }
                }
            });
        }
    });
    
    updateBatchSelectionDisplay();
}

window.openBatchOperationModal = openBatchOperationModal;
window.closeBatchOperationModal = closeBatchOperationModal;
window.handleBatchModalClick = handleBatchModalClick;
window.clearBatchSelection = clearBatchSelection;
window.selectWeekdays = selectWeekdays;
window.selectWeekends = selectWeekends;
window.removeBatchDate = removeBatchDate;
window.previewBatchOperation = previewBatchOperation;
window.executeBatchOperation = executeBatchOperation;
window.toggleBatchDateSelectionFromCalendar = toggleBatchDateSelectionFromCalendar;
window.generateBatchOperationCalendar = generateBatchOperationCalendar;
window.selectBatchWeekdayColumn = selectBatchWeekdayColumn;
window.selectLeaveType = selectLeaveType;
window.selectRegularLeaveWeekday = selectRegularLeaveWeekday;

/**
 * ✅ 例假日期范围改变时的处理
 */
function onRegularLeaveDateChange() {
    // 如果已经选择了星期，立即更新高亮
    if (regularLeaveWeekday !== null) {
        const startDate = document.getElementById('regularLeaveStartDate')?.value;
        const endDate = document.getElementById('regularLeaveEndDate')?.value;
        
        if (startDate && endDate) {
            regularLeaveDateRange.start = startDate;
            regularLeaveDateRange.end = endDate;
            highlightRegularLeaveDates();
        }
    }
}

window.onRegularLeaveDateChange = onRegularLeaveDateChange;

// ===== 新版本批量操作功能 =====
// 完整的批量操作实现，包含工作填充、请假和清除功能

// 批量操作全局变量
let batchWorkSelectedDates = new Set(); // Set<string> 工作模式选中的日期
let batchOperationActive = false;
let currentLeaveType = null; // 当前选择的假期类型
let leaveDatesByType = new Map(); // 按假期类型存储选中的日期 {leaveType: Set<dateString>}
let regularLeaveWeekday = null; // 例假选择的星期（0-6）
let regularLeaveDateRange = { start: null, end: null }; // 例假的日期范围
let batchDateRange = { start: null, end: null }; // 日期时间段
let batchOperationType = null; // 操作类型：'work' 或 'leave' 或 'clear'
let batchCurrentDisplayMonth = null; // 当前显示的月份 {year, month}
let batchFillTimeSlots = []; // 填充时段配置数组
let batchSelectedWeekdays = new Set(); // 选中的星期（工作模式）
let batchLeaveSelectedWeekdays = new Set(); // 选中的星期（请假模式）
let weekdaySelectionByType = new Map(); // 跟踪每个星期列被哪个操作类型选择
let currentActiveSlotIndex = 0; // 当前活动的填充时段索引

// 批量操作假期颜色配置
const LEAVE_TYPE_COLORS = {
    'regular': '#fef3c7',    // 例假 - 黄色
    'annual': '#dcfce7',     // 年假 - 绿色
    'maternity': '#fce7f3',  // 产假 - 粉色
    'sick': '#fee2e2',      // 病假 - 红色
    'nopaid': '#787a80',    // No Paid - 灰色
    'statutory': '#e0e7ff'   // 法定劳工假 - 紫色
};

const LEAVE_TYPE_BORDER_COLORS = {
    'regular': '#fbbf24',    // 例假 - 深黄色边框
    'annual': '#22c55e',     // 年假 - 深绿色边框
    'maternity': '#ec4899',  // 产假 - 深粉色边框
    'sick': '#ef4444',      // 病假 - 深红色边框
    'nopaid': '#4b5563',    // No Paid - 深灰色边框
    'statutory': '#6366f1'   // 法定劳工假 - 深紫色边框
};

// 暴露到 window 对象
if (typeof window !== 'undefined') {
    window.LEAVE_TYPE_COLORS = LEAVE_TYPE_COLORS;
    window.LEAVE_TYPE_BORDER_COLORS = LEAVE_TYPE_BORDER_COLORS;
}

/**
 * 打开批量操作模态框
 */
function openBatchOperationModal() {
    const modal = document.getElementById('batchOperationModal');
    if (!modal) return;
    
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    if (!selectedPhone) {
        alert('請先選擇要操作的員工！批量修改需要先選擇一個員工。');
        return;
    }
    
    // 重置状态
    batchModifySelectedDates.clear();
    batchModifyActive = true;
    batchModifyCurrentLeaveType = null;
    batchModifyLeaveDatesByType.clear();
    batchModifyRegularLeaveWeekday = null;
    batchModifyRegularLeaveDateRange = { start: null, end: null };
    batchModifyDateRange = { start: null, end: null };
    batchModifyOperationType = 'fill';
    
    const calendarSection = document.getElementById('batchModifyCalendarSection');
    if (calendarSection) calendarSection.classList.add('hidden');
    
    loadBatchModifyLocationOptions();
    initializeBatchModifyTimeSelectors();
    initializeBatchModifyDateRange();
    selectBatchModifyOperationType('fill');
    
    modal.classList.remove('hidden');
}

/**
 * 关闭批量修改模态框
 */
function closeBatchModifyModal() {
    const modal = document.getElementById('batchModifyModal');
    if (!modal) return;
    
    batchModifyActive = false;
    batchModifySelectedDates.clear();
    batchModifyCurrentLeaveType = null;
    batchModifyLeaveDatesByType.clear();
    batchModifyRegularLeaveWeekday = null;
    batchModifyRegularLeaveDateRange = { start: null, end: null };
    
    const preview = document.getElementById('batchModifyPreview');
    if (preview) preview.classList.add('hidden');
    
    const executeBtn = document.getElementById('batchModifyExecuteBtn');
    if (executeBtn) executeBtn.disabled = true;
    
    document.querySelectorAll('.leave-type-btn').forEach(btn => {
        btn.style.borderColor = '#d1d5db';
        btn.style.background = '#fff';
    });
    
    document.querySelectorAll('.leave-type-settings').forEach(el => {
        el.classList.add('hidden');
    });
    
    modal.classList.add('hidden');
}

/**
 * 处理模态框点击事件
 */
function handleBatchModifyModalClick(event) {
    if (event.target.id === 'batchModifyModal') {
        closeBatchModifyModal();
    }
}

/**
 * 初始化日期范围
 */
function initializeBatchModifyDateRange(forceReset = true) {
    const startInput = document.getElementById('batchModifyStartDate');
    const endInput = document.getElementById('batchModifyEndDate');
    const monthSelect = document.getElementById('rosterMonth');
    
    if (!startInput || !endInput) return;
    
    let year, month;
    if (monthSelect?.value) {
        [year, month] = monthSelect.value.split('-').map(Number);
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    
    startInput.min = firstDay;
    startInput.max = lastDay;
    endInput.min = firstDay;
    endInput.max = lastDay;
    
    if (forceReset || !startInput.value) startInput.value = firstDay;
    if (forceReset || !endInput.value) endInput.value = lastDay;
    
    batchModifyDateRange = { start: startInput.value, end: endInput.value };
    onBatchModifyDateRangeChange();
}

function resetBatchModifyDateRangeToMonth() {
    initializeBatchModifyDateRange(true);
}

function updateBatchModifyDateRangeDisplay() {
    const display = document.getElementById('batchModifyDateRangeDisplay');
    if (!display) return;
    
    if (!batchModifyDateRange.start || !batchModifyDateRange.end) {
        display.textContent = '尚未選擇日期範圍';
        return;
    }
    
    display.textContent = `已選擇：${batchModifyDateRange.start} 至 ${batchModifyDateRange.end}`;
}

function onBatchModifyDateRangeChange() {
    const startInput = document.getElementById('batchModifyStartDate');
    const endInput = document.getElementById('batchModifyEndDate');
    if (!startInput || !endInput || !startInput.value || !endInput.value) return;
    
    let startDate = new Date(startInput.value);
    let endDate = new Date(endInput.value);
    
    if (startDate > endDate) {
        endDate = startDate;
        endInput.value = startInput.value;
    }
    
    batchModifyDateRange = { start: startInput.value, end: endInput.value };
    batchModifySelectedDates.clear();
    
    const startDay = parseInt(batchModifyDateRange.start.split('-')[2], 10);
    const endDay = parseInt(batchModifyDateRange.end.split('-')[2], 10);
    
    for (let day = startDay; day <= endDay; day++) {
        batchModifySelectedDates.add(day);
    }
    
    generateBatchModifyCalendar();
    updateBatchModifyCalendarSelection();
    updateBatchModifyDateRangeDisplay();
    updateBatchModifySelectionDisplay();
    
    const calendarSection = document.getElementById('batchModifyCalendarSection');
    if (calendarSection) calendarSection.classList.remove('hidden');
}

function selectBatchModifyOperationType(type) {
    batchModifyOperationType = type;
    
    const buttons = document.querySelectorAll('.batch-operation-type-btn');
    buttons.forEach(btn => {
        const mode = btn.getAttribute('data-mode');
        if (mode === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const fillSettings = document.getElementById('batchModifyFillSettings');
    const clearSettings = document.getElementById('batchModifyClearSettings');
    const leaveTypeSection = document.getElementById('batchModifyLeaveTypeSection');
    
    if (fillSettings) fillSettings.classList.toggle('hidden', type !== 'fill');
    if (clearSettings) clearSettings.classList.toggle('hidden', type !== 'clear');
    if (leaveTypeSection) leaveTypeSection.classList.toggle('hidden', type !== 'leave');
    
    if (type !== 'leave') {
        batchModifyCurrentLeaveType = null;
        batchModifyLeaveDatesByType.clear();
    }
    
    const preview = document.getElementById('batchModifyPreview');
    if (preview) preview.classList.add('hidden');
    
    const executeBtn = document.getElementById('batchModifyExecuteBtn');
    if (executeBtn) executeBtn.disabled = true;
    
    const calendarSection = document.getElementById('batchModifyCalendarSection');
    if (calendarSection) calendarSection.classList.remove('hidden');
    
    updateBatchModifySelectionDisplay();
}

// 生成批量修改日历（复用原有逻辑，使用新ID）
function generateBatchModifyCalendar() {
    const calendarContainer = document.getElementById('batchModifyCalendar');
    if (!calendarContainer) return;
    
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    if (!selectedPhone) {
        calendarContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">
            <p style="margin: 0; font-weight: 600;">⚠️ 請先選擇員工</p>
        </div>`;
        return;
    }
    
    let employeeName = '';
    if (coachSelect && coachSelect.options) {
        const selectedOption = Array.from(coachSelect.options).find(opt => opt.value === selectedPhone);
        if (selectedOption) employeeName = selectedOption.textContent || '';
    }
    
    const monthSelect = document.getElementById('rosterMonth');
    let year, month;
    if (monthSelect?.value) {
        [year, month] = monthSelect.value.split('-').map(Number);
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }
    
    renderBatchModifyCalendar(year, month, calendarContainer, employeeName);
}

function renderBatchModifyCalendar(year, month, container, employeeName = '') {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    
    let html = `<div class="batch-calendar-header">`;
    if (employeeName) {
        html += `<div style="margin-bottom: 4px; font-size: 14px; color: #6b7280; font-weight: 500;">員工：${employeeName}</div>`;
    }
    html += `<h5>${year}年${month}月</h5></div>`;
    
    html += `<div class="batch-calendar-grid">`;
    
    weekdays.forEach((day, index) => {
        html += `<div class="batch-calendar-weekday" style="cursor: pointer;" onclick="selectBatchModifyWeekdayColumn(${index})" title="點擊選中此列">${day}</div>`;
    });
    
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div class="batch-calendar-day batch-calendar-empty"></div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const weekday = date.getDay();
        const isWeekend = weekday === 0 || weekday === 6;
        const isSelected = batchModifySelectedDates.has(day);
        
        html += `<div class="batch-calendar-day ${isWeekend ? 'batch-calendar-weekend' : ''} ${isSelected ? 'batch-calendar-selected' : ''}" 
            data-day="${day}" onclick="toggleBatchModifyDateSelection(${day}, this)">${day}</div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function toggleBatchModifyDateSelection(day, element) {
    if (batchModifySelectedDates.has(day)) {
        batchModifySelectedDates.delete(day);
        element.classList.remove('batch-calendar-selected');
    } else {
        batchModifySelectedDates.add(day);
        element.classList.add('batch-calendar-selected');
    }
    updateBatchModifySelectionDisplay();
}

function updateBatchModifySelectionDisplay() {
    const countElement = document.getElementById('batchModifySelectedDatesCount');
    const listElement = document.getElementById('batchModifySelectedDatesList');
    const executeBtn = document.getElementById('batchModifyExecuteBtn');
    
    if (!countElement || !listElement) return;
    
    let count = 0;
    let allDates = [];
    
    if (batchModifyOperationType === 'leave' && batchModifyLeaveDatesByType.size > 0) {
        for (let [leaveType, dates] of batchModifyLeaveDatesByType) {
            count += dates.size;
            dates.forEach(dateStr => {
                const day = parseInt(dateStr.split('-')[2]);
                if (!isNaN(day)) allDates.push({ day, dateStr, leaveType });
            });
        }
    } else {
        count = batchModifySelectedDates.size;
        allDates = Array.from(batchModifySelectedDates).map(day => ({ day }));
    }
    
    countElement.textContent = `已选择：${count}个日期`;
    
    if (count === 0) {
        listElement.innerHTML = '<p class="batch-hint">请选择日期</p>';
        if (executeBtn) executeBtn.disabled = true;
    } else {
        allDates.sort((a, b) => a.day - b.day);
        listElement.innerHTML = allDates.map(({ day }) => 
            `<span class="batch-selected-date-tag">${day}日<span class="remove-date" onclick="removeBatchModifyDate(${day})">×</span></span>`
        ).join('');
        if (executeBtn) executeBtn.disabled = false;
    }
}

function clearBatchModifySelection() {
    batchModifySelectedDates.clear();
    batchModifyLeaveDatesByType.clear();
    const calendar = document.getElementById('batchModifyCalendar');
    if (calendar) {
        calendar.querySelectorAll('.batch-calendar-selected').forEach(el => {
            el.classList.remove('batch-calendar-selected');
        });
    }
    updateBatchModifySelectionDisplay();
}

function selectBatchModifyWeekdays() {
    const monthSelect = document.getElementById('rosterMonth');
    if (!monthSelect || !monthSelect.value) return;
    
    const [year, month] = monthSelect.value.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    batchModifySelectedDates.clear();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const weekday = date.getDay();
        if (weekday >= 1 && weekday <= 5) {
            batchModifySelectedDates.add(day);
        }
    }
    
    updateBatchModifyCalendarSelection();
    updateBatchModifySelectionDisplay();
}

function selectBatchModifyWeekends() {
    const monthSelect = document.getElementById('rosterMonth');
    if (!monthSelect || !monthSelect.value) return;
    
    const [year, month] = monthSelect.value.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    batchModifySelectedDates.clear();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const weekday = date.getDay();
        if (weekday === 0 || weekday === 6) {
            batchModifySelectedDates.add(day);
        }
    }
    
    updateBatchModifyCalendarSelection();
    updateBatchModifySelectionDisplay();
}

function updateBatchModifyCalendarSelection() {
    const calendar = document.getElementById('batchModifyCalendar');
    if (!calendar) return;
    
    calendar.querySelectorAll('.batch-calendar-day[data-day]').forEach(element => {
        const day = parseInt(element.getAttribute('data-day'));
        if (batchModifySelectedDates.has(day)) {
            element.classList.add('batch-calendar-selected');
        } else {
            element.classList.remove('batch-calendar-selected');
        }
    });
}

function removeBatchModifyDate(day) {
    batchModifySelectedDates.delete(day);
    const calendar = document.getElementById('batchModifyCalendar');
    if (calendar) {
        const dayElement = calendar.querySelector(`.batch-calendar-day[data-day="${day}"]`);
        if (dayElement) dayElement.classList.remove('batch-calendar-selected');
    }
    updateBatchModifySelectionDisplay();
}

function selectBatchModifyWeekdayColumn(weekdayIndex) {
    const monthSelect = document.getElementById('rosterMonth');
    if (!monthSelect || !monthSelect.value) return;
    
    const [year, month] = monthSelect.value.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const datesInColumn = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() === weekdayIndex) {
            datesInColumn.push(day);
        }
    }
    
    const allSelected = datesInColumn.every(day => batchModifySelectedDates.has(day));
    
    datesInColumn.forEach(day => {
        if (allSelected) {
            batchModifySelectedDates.delete(day);
        } else {
            batchModifySelectedDates.add(day);
        }
    });
    
    updateBatchModifyCalendarSelection();
    updateBatchModifySelectionDisplay();
}

async function loadBatchModifyLocationOptions() {
    try {
        const locations = await getLocationList();
        for (let i = 1; i <= 3; i++) {
            const select = document.getElementById(`batchModifyLocation${i}`);
            if (select) {
                select.innerHTML = '<option value="">请选择地点</option>' +
                    locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('加载地点列表失败:', error);
    }
}

function initializeBatchModifyTimeSelectors() {
    const modal = document.getElementById('batchModifyModal');
    if (!modal) return;
    
    // 获取所有时间选择器
    const startHourSelects = modal.querySelectorAll('.roster-time-start-hour[data-slot]');
    const startMinSelects = modal.querySelectorAll('.roster-time-start-min[data-slot]');
    const endHourSelects = modal.querySelectorAll('.roster-time-end-hour[data-slot]');
    const endMinSelects = modal.querySelectorAll('.roster-time-end-min[data-slot]');
    
    // 填充小时选项（00-23）
    startHourSelects.forEach(select => {
        if (select.options.length <= 1) { // 只有默认选项
            for (let hour = 0; hour <= 23; hour++) {
                const hourStr = String(hour).padStart(2, '0');
                const option = document.createElement('option');
                option.value = hourStr;
                option.textContent = hourStr;
                select.appendChild(option);
            }
        }
    });
    
    endHourSelects.forEach(select => {
        if (select.options.length <= 1) {
            for (let hour = 0; hour <= 23; hour++) {
                const hourStr = String(hour).padStart(2, '0');
                const option = document.createElement('option');
                option.value = hourStr;
                option.textContent = hourStr;
                select.appendChild(option);
            }
        }
    });
    
    // 填充分钟选项（00, 05, 10, ... 55）
    startMinSelects.forEach(select => {
        if (select.options.length <= 1) {
            for (let minute = 0; minute < 60; minute += 5) {
                const minStr = String(minute).padStart(2, '0');
                const option = document.createElement('option');
                option.value = minStr;
                option.textContent = minStr;
                select.appendChild(option);
            }
        }
    });
    
    endMinSelects.forEach(select => {
        if (select.options.length <= 1) {
            for (let minute = 0; minute < 60; minute += 5) {
                const minStr = String(minute).padStart(2, '0');
                const option = document.createElement('option');
                option.value = minStr;
                option.textContent = minStr;
                select.appendChild(option);
            }
        }
    });
    
    // 为所有时间选择器添加 change 事件监听器
    // 当用户选择时间时，自动更新隐藏的 input 字段
    const updateTimeInput = function() {
        const slot = this.getAttribute('data-slot');
        if (!slot) return;
        
        // 查找对应时段的隐藏时间输入框
        const timeHidden = modal.querySelector(`#batchModifyTime${slot}`);
        if (!timeHidden) {
            console.warn(`未找到时段 ${slot} 的隐藏时间输入框`);
            return;
        }
        
        // 获取该时段的所有时间组件
        const startHour = modal.querySelector(`.roster-time-start-hour[data-slot="${slot}"]`)?.value || '';
        const startMin = modal.querySelector(`.roster-time-start-min[data-slot="${slot}"]`)?.value || '';
        const endHour = modal.querySelector(`.roster-time-end-hour[data-slot="${slot}"]`)?.value || '';
        const endMin = modal.querySelector(`.roster-time-end-min[data-slot="${slot}"]`)?.value || '';
        
        // 如果四个时间组件都已选择，则组合成时间字符串（格式：HHmm-HHmm）
        if (startHour && startMin && endHour && endMin) {
            timeHidden.value = `${startHour}${startMin}-${endHour}${endMin}`;
            console.log(`✅ 时段 ${slot} 时间已更新: ${timeHidden.value}`);
        } else {
            timeHidden.value = '';
            console.log(`⚠️ 时段 ${slot} 时间不完整，已清空`);
        }
    };
    
    // 绑定事件监听器到所有时间选择器
    modal.querySelectorAll('.roster-time-start-hour[data-slot], .roster-time-start-min[data-slot], .roster-time-end-hour[data-slot], .roster-time-end-min[data-slot]').forEach(select => {
        // 移除旧的监听器（如果有）
        select.removeEventListener('change', updateTimeInput);
        // 添加新的监听器
        select.addEventListener('change', updateTimeInput);
    });
    
    console.log('✅ 批量修改时间选择器已初始化');
}

function selectBatchModifyLeaveType(leaveType) {
    batchModifyCurrentLeaveType = leaveType;
    
    document.querySelectorAll('.leave-type-btn').forEach(btn => {
        const btnType = btn.getAttribute('data-leave-type');
        if (btnType === leaveType) {
            btn.style.borderColor = BATCH_MODIFY_LEAVE_BORDER_COLORS[leaveType] || '#3b82f6';
            btn.style.background = BATCH_MODIFY_LEAVE_COLORS[leaveType] || '#dbeafe';
        } else {
            btn.style.borderColor = '#d1d5db';
            btn.style.background = '#fff';
        }
    });
    
    document.querySelectorAll('.leave-type-settings').forEach(el => el.classList.add('hidden'));
    
    if (leaveType === 'regular') {
        document.getElementById('batchModifyRegularLeaveSettings')?.classList.remove('hidden');
    } else if (leaveType === 'statutory') {
        alert('法定劳工假功能待更新');
        return;
    } else {
        document.getElementById('batchModifyManualLeaveSettings')?.classList.remove('hidden');
    }
}

function selectBatchModifyRegularLeaveWeekday(weekday) {
    batchModifyRegularLeaveWeekday = weekday;
    
    document.querySelectorAll('.weekday-btn').forEach(btn => {
        const btnWeekday = parseInt(btn.getAttribute('data-weekday'));
        if (btnWeekday === weekday) {
            btn.style.borderColor = '#3b82f6';
            btn.style.background = '#dbeafe';
        } else {
            btn.style.borderColor = '#d1d5db';
            btn.style.background = '#fff';
        }
    });
    
    const startDate = document.getElementById('batchModifyRegularLeaveStartDate')?.value;
    const endDate = document.getElementById('batchModifyRegularLeaveEndDate')?.value;
    
    if (!startDate || !endDate) {
        alert('請先選擇日期時間段');
        return;
    }
    
    batchModifyRegularLeaveDateRange.start = startDate;
    batchModifyRegularLeaveDateRange.end = endDate;
}

function onBatchModifyRegularLeaveDateChange() {
    if (batchModifyRegularLeaveWeekday !== null) {
        const startDate = document.getElementById('batchModifyRegularLeaveStartDate')?.value;
        const endDate = document.getElementById('batchModifyRegularLeaveEndDate')?.value;
        
        if (startDate && endDate) {
            batchModifyRegularLeaveDateRange.start = startDate;
            batchModifyRegularLeaveDateRange.end = endDate;
        }
    }
}

function previewBatchModifyOperation() {
    if (batchModifySelectedDates.size === 0 && batchModifyLeaveDatesByType.size === 0) {
        alert('请先选择要操作的日期');
        return;
    }
    
    const preview = document.getElementById('batchModifyPreview');
    const previewContent = document.getElementById('batchModifyPreviewContent');
    if (!preview || !previewContent) return;
    
    let html = `<div style="padding: 12px; background: #e0f2fe; border-radius: 8px;">
        <strong>操作统计：</strong><br>
        - 目标日期：${batchModifySelectedDates.size}个<br>
        - 操作类型：${batchModifyOperationType === 'fill' ? '批量填充' : batchModifyOperationType === 'leave' ? '批量请假' : '批量清除'}
    </div>`;
    
    previewContent.innerHTML = html;
    preview.classList.remove('hidden');
}

function executeBatchModifyOperation() {
    const coachSelect = document.getElementById('staffCoachSelect');
    const selectedPhone = coachSelect?.value || '';
    
    if (!selectedPhone) {
        alert('請先選擇要操作的員工！');
        return;
    }
    
    if (batchModifySelectedDates.size === 0 && batchModifyLeaveDatesByType.size === 0) {
        alert('请先选择要操作的日期！');
        return;
    }
    
    let employeeName = '';
    if (coachSelect && coachSelect.options) {
        const selectedOption = Array.from(coachSelect.options).find(opt => opt.value === selectedPhone);
        if (selectedOption) employeeName = selectedOption.textContent || '';
    }
    
    const operationText = batchModifyOperationType === 'fill' ? '填充' : 
                         batchModifyOperationType === 'leave' ? '請假' : '清除';
    
    // 构建确认消息
    let confirmMessage = `確認要對員工「${employeeName}」的 ${batchModifySelectedDates.size} 個日期執行批量${operationText}操作嗎？\n\n`;
    
    if (batchModifyOperationType === 'fill') {
        const slot1 = document.getElementById('batchModifySlot1')?.checked;
        const slot2 = document.getElementById('batchModifySlot2')?.checked;
        const slot3 = document.getElementById('batchModifySlot3')?.checked;
        const slots = [];
        if (slot1) slots.push('上午');
        if (slot2) slots.push('中午');
        if (slot3) slots.push('下午');
        confirmMessage += `將填充時段：${slots.join('、')}\n`;
        confirmMessage += `\n⚠️ 注意：批量修改後需要點擊「保存更表」按鈕才會保存到數據庫！`;
    } else if (batchModifyOperationType === 'leave') {
        confirmMessage += `將標記為請假狀態\n`;
        confirmMessage += `\n⚠️ 注意：批量修改後需要點擊「保存更表」按鈕才會保存到數據庫！`;
    } else if (batchModifyOperationType === 'clear') {
        confirmMessage += `將清除選中日期的數據\n`;
        confirmMessage += `\n⚠️ 注意：批量修改後需要點擊「保存更表」按鈕才會保存到數據庫！`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        if (batchModifyOperationType === 'fill') {
            executeBatchModifyFill();
        } else if (batchModifyOperationType === 'leave') {
            executeBatchModifyLeave();
        } else if (batchModifyOperationType === 'clear') {
            executeBatchModifyClear();
        }
        
        closeBatchModifyModal();
        
        // 显示成功消息，提醒用户保存
        alert(`✅ 批量${operationText}完成！已處理員工「${employeeName}」的 ${batchModifySelectedDates.size} 個日期\n\n📌 重要提醒：請點擊下方的「保存更表」按鈕將修改保存到數據庫！`);
        
        // 高亮保存按钮（如果存在）
        const saveButton = document.querySelector(`button[onclick*="saveSupervisorRoster('${selectedPhone}')"]`);
        if (saveButton) {
            saveButton.style.animation = 'pulse 1s ease-in-out 3';
            saveButton.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.6)';
            setTimeout(() => {
                saveButton.style.animation = '';
                saveButton.style.boxShadow = '';
            }, 3000);
        }
        
    } catch (error) {
        console.error('批量修改失败:', error);
        alert(`批量修改失敗：${error.message}`);
    }
}

function executeBatchModifyFill() {
    const calendar = document.getElementById('staffRosterCalendars');
    if (!calendar) {
        console.error('❌ 未找到教练更表日历容器');
        return;
    }
    
    // 获取选中的时段
    const slot1 = document.getElementById('batchModifySlot1')?.checked;
    const slot2 = document.getElementById('batchModifySlot2')?.checked;
    const slot3 = document.getElementById('batchModifySlot3')?.checked;
    
    // 获取时间和地点（从隐藏的 input 字段）
    const time1 = document.getElementById('batchModifyTime1')?.value || '';
    const loc1 = document.getElementById('batchModifyLocation1')?.value || '';
    const time2 = document.getElementById('batchModifyTime2')?.value || '';
    const loc2 = document.getElementById('batchModifyLocation2')?.value || '';
    const time3 = document.getElementById('batchModifyTime3')?.value || '';
    const loc3 = document.getElementById('batchModifyLocation3')?.value || '';
    
    // 获取冲突处理模式
    const conflictMode = document.querySelector('input[name="batchModifyConflict"]:checked')?.value || 'overwrite';
    
    console.log('📋 批量填充参数:', {
        slot1, slot2, slot3,
        time1, loc1, time2, loc2, time3, loc3,
        conflictMode,
        selectedDates: Array.from(batchModifySelectedDates)
    });
    
    // 验证：至少选择了一个时段
    if (!slot1 && !slot2 && !slot3) {
        alert('请至少选择一个时段进行填充！');
        return;
    }
    
    // 验证：选中的时段必须有时间或地点
    if (slot1 && !time1 && !loc1) {
        alert('上午时段已选中，但未设置时间或地点！');
        return;
    }
    if (slot2 && !time2 && !loc2) {
        alert('中午时段已选中，但未设置时间或地点！');
        return;
    }
    if (slot3 && !time3 && !loc3) {
        alert('下午时段已选中，但未设置时间或地点！');
        return;
    }
    
    const cells = calendar.querySelectorAll('.cal-cell');
    let processedCount = 0;
    
    // 遍历所有选中的日期
    batchModifySelectedDates.forEach(day => {
        cells.forEach(cell => {
            const dayElement = cell.querySelector('.cal-day');
            if (!dayElement) return;
            
            const cellDay = parseInt(dayElement.textContent);
            if (cellDay !== day) return;
            
            // 填充选中的时段
            if (slot1 && (time1 || loc1)) {
                fillSlotForBatchModify(cell, 1, time1, loc1, conflictMode);
            }
            if (slot2 && (time2 || loc2)) {
                fillSlotForBatchModify(cell, 2, time2, loc2, conflictMode);
            }
            if (slot3 && (time3 || loc3)) {
                fillSlotForBatchModify(cell, 3, time3, loc3, conflictMode);
            }
            
            processedCount++;
        });
    });
    
    console.log(`✅ 批量填充完成：已处理 ${processedCount} 个日期`);
}

function fillSlotForBatchModify(cell, slotIndex, time, location, conflictMode) {
    const timeInput = cell.querySelector(`.roster-time[data-slot="${slotIndex}"]`);
    const locationSelect = cell.querySelector(`.roster-location[data-slot="${slotIndex}"]`);
    
    if (!timeInput || !locationSelect) {
        console.warn(`未找到时段 ${slotIndex} 的输入元素`);
        return;
    }
    
    // 检查是否有现有数据
    const hasExistingTime = timeInput.value && timeInput.value.trim() !== '';
    const hasExistingLocation = locationSelect.value && locationSelect.value.trim() !== '';
    const hasExistingData = hasExistingTime || hasExistingLocation;
    
    // 根据冲突处理模式决定是否填充
    if (hasExistingData) {
        if (conflictMode === 'skip') {
            // 跳过：完全不处理有数据的单元格
            console.log(`跳过时段 ${slotIndex}（已有数据）`);
            return;
        } else if (conflictMode === 'blank') {
            // 填充空白：只填充空白字段
            if (!hasExistingTime && time) {
                timeInput.value = time;
                timeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (!hasExistingLocation && location) {
                locationSelect.value = location;
                locationSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }
        // overwrite：覆盖现有数据（继续执行下面的代码）
    }
    
    // 填充时间
    if (time && time.trim() !== '') {
        timeInput.value = time;
        timeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // 填充地点
    if (location && location.trim() !== '') {
        locationSelect.value = location;
        locationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function executeBatchModifyLeave() {
    const calendar = document.getElementById('staffRosterCalendars');
    if (!calendar) {
        console.error('❌ 未找到教练更表日历容器');
        return;
    }
    
    // 检查是否选择了请假类型
    if (!batchModifyCurrentLeaveType) {
        alert('请先选择请假类型！');
        return;
    }
    
    console.log('📋 批量请假参数:', {
        leaveType: batchModifyCurrentLeaveType,
        selectedDates: Array.from(batchModifySelectedDates)
    });
    
    const cells = calendar.querySelectorAll('.cal-cell');
    let processedCount = 0;
    
    batchModifySelectedDates.forEach(day => {
        cells.forEach(cell => {
            const dayElement = cell.querySelector('.cal-day');
            if (!dayElement) return;
            
            const cellDay = parseInt(dayElement.textContent);
            if (cellDay !== day) return;
            
            // 标记为不可用（请假）
            cell.setAttribute('data-unavailable', 'true');
            
            // 设置请假类型
            if (batchModifyCurrentLeaveType) {
                cell.setAttribute('data-leave-type', batchModifyCurrentLeaveType);
            }
            
            processedCount++;
        });
    });
    
    console.log(`✅ 批量请假完成：已处理 ${processedCount} 个日期，请假类型：${batchModifyCurrentLeaveType}`);
}

function executeBatchModifyClear() {
    const calendar = document.getElementById('staffRosterCalendars');
    if (!calendar) {
        console.error('❌ 未找到教练更表日历容器');
        return;
    }
    
    const slot1 = document.getElementById('batchModifyClearSlot1')?.checked;
    const slot2 = document.getElementById('batchModifyClearSlot2')?.checked;
    const slot3 = document.getElementById('batchModifyClearSlot3')?.checked;
    const clearTime = document.getElementById('batchModifyClearTime')?.checked;
    const clearLocation = document.getElementById('batchModifyClearLocation')?.checked;
    const clearLeave = document.getElementById('batchModifyClearLeave')?.checked;
    
    console.log('📋 批量清除参数:', {
        slot1, slot2, slot3,
        clearTime, clearLocation, clearLeave,
        selectedDates: Array.from(batchModifySelectedDates)
    });
    
    // 验证：至少选择了一个清除选项
    if (!slot1 && !slot2 && !slot3 && !clearLeave) {
        alert('请至少选择一个清除选项！');
        return;
    }
    
    const cells = calendar.querySelectorAll('.cal-cell');
    let processedCount = 0;
    
    batchModifySelectedDates.forEach(day => {
        cells.forEach(cell => {
            const dayElement = cell.querySelector('.cal-day');
            if (!dayElement) return;
            
            const cellDay = parseInt(dayElement.textContent);
            if (cellDay !== day) return;
            
            // 清除选中的时段
            if (slot1) clearSlotForBatchModify(cell, 1, clearTime, clearLocation);
            if (slot2) clearSlotForBatchModify(cell, 2, clearTime, clearLocation);
            if (slot3) clearSlotForBatchModify(cell, 3, clearTime, clearLocation);
            
            // 清除请假标记
            if (clearLeave) {
                cell.setAttribute('data-unavailable', 'false');
                cell.removeAttribute('data-leave-type');
            }
            
            processedCount++;
        });
    });
    
    console.log(`✅ 批量清除完成：已处理 ${processedCount} 个日期`);
}

function clearSlotForBatchModify(cell, slotIndex, clearTime = true, clearLocation = true) {
    // 清除时间
    if (clearTime) {
        const timeInput = cell.querySelector(`.roster-time[data-slot="${slotIndex}"]`);
        if (timeInput) {
            timeInput.value = '';
            timeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // 同时清除可见的时间选择器（如果存在）
        const timeStartHour = cell.querySelector(`.roster-time-start-hour[data-slot="${slotIndex}"]`);
        const timeStartMin = cell.querySelector(`.roster-time-start-min[data-slot="${slotIndex}"]`);
        const timeEndHour = cell.querySelector(`.roster-time-end-hour[data-slot="${slotIndex}"]`);
        const timeEndMin = cell.querySelector(`.roster-time-end-min[data-slot="${slotIndex}"]`);
        
        if (timeStartHour) timeStartHour.value = '';
        if (timeStartMin) timeStartMin.value = '';
        if (timeEndHour) timeEndHour.value = '';
        if (timeEndMin) timeEndMin.value = '';
    }
    
    // 清除地点
    if (clearLocation) {
        const locationSelect = cell.querySelector(`.roster-location[data-slot="${slotIndex}"]`);
        if (locationSelect) {
            locationSelect.value = '';
            locationSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

// 导出批量操作函数到全局作用域
window.openBatchOperationModal = openBatchOperationModal;
window.closeBatchOperationModal = closeBatchOperationModal;
window.handleBatchModalClick = handleBatchModalClick;
window.executeBatchOperation = executeBatchOperation;
window.selectBatchOperationType = selectBatchOperationType;
window.onBatchDateRangeChange = onBatchDateRangeChange;
window.toggleBatchWeekday = toggleBatchWeekday;
window.toggleBatchLeaveWeekday = toggleBatchLeaveWeekday;
window.addBatchFillTimeSlot = addBatchFillTimeSlot;
window.removeBatchFillTimeSlot = removeBatchFillTimeSlot;
window.clearBatchSelection = clearBatchSelection;
window.selectLeaveType = selectLeaveType;
window.batchNavigateMonth = batchNavigateMonth;

console.log('✅ 新版批量操作功能已加载');









