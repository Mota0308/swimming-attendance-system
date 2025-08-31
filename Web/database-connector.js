// 数据库连接器和数据管理器
class DatabaseConnector {
    constructor() {
        this.apiConfig = {
            baseURL: window.location.origin, // 使用當前域名，通過代理訪問
            publicKey: 'ttdrcccy',
            privateKey: '2b207365-cbf0-4e42-a3bf-f932c84557c4'
        };
        
        this.connectionStatus = {
            connected: false,
            lastSync: null,
            errorCount: 0
        };
        
        this.cache = {
            locations: [],
            clubs: [],
            students: [],
            attendance: [],
            workHours: [],
            roster: [],
            coaches: []
        };
        
        // 添加特殊標記的處理邏輯
        this.specialMarks = {
            balloon: '🎈',
            star: '🌟'
        };
        
        this.init();
    }

    // 初始化数据库连接
    async init() {
        try {
            console.log('🔄 正在初始化数据库连接...');
            
            // 並行執行多個初始化任務
            const initTasks = [
                this.testConnection(),
                this.preloadBasicData(),
                this.setupAutoSync()
            ];
            
            // 使用 Promise.allSettled 避免單個任務失敗影響整體
            const results = await Promise.allSettled(initTasks);
            
            // 檢查結果
            const connectionSuccess = results[0].status === 'fulfilled' && results[0].value === true;
            const dataSuccess = results[1].status === 'fulfilled';
            const syncSuccess = results[2].status === 'fulfilled';
            
            if (connectionSuccess) {
                this.connectionStatus.connected = true;
                console.log('✅ API连接成功');
            } else {
                console.warn('⚠️ API 連接失敗，將使用離線模式');
                this.connectionStatus.connected = false;
            }
            
            if (dataSuccess) {
                console.log('✅ 基础数据预加载成功');
            } else {
                console.warn('⚠️ 基础数据预加载失败，使用默认数据');
            }
            
            if (syncSuccess) {
                console.log('✅ 自动同步设置成功');
            } else {
                console.warn('⚠️ 自动同步设置失败');
            }
            
            // 觸發就緒事件
            this.dispatchReadyEvent();
            
            console.log('✅ 数据库连接初始化完成');
        } catch (error) {
            console.error('❌ 数据库连接初始化失败:', error);
            this.connectionStatus.errorCount++;
            
            // 即使失敗也要觸發事件，讓UI可以顯示錯誤狀態
            this.dispatchReadyEvent();
        }
    }

    // 获取标准请求头（匹配Android版本）
    getStandardHeaders() {
        return {
            'X-API-Public-Key': this.apiConfig.publicKey,
            'X-API-Private-Key': this.apiConfig.privateKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // 测试API连接
    async testConnection() {
        try {
            console.log('🔄 正在測試 API 連接...');
            console.log(`📍 API 地址: ${this.apiConfig.baseURL}`);
            
            // 嘗試多個端點來測試連接
            const testEndpoints = [
                '/api/health',
                '/api/locations',
                '/health'
            ];
            
            for (const endpoint of testEndpoints) {
                try {
                    const response = await fetch(`${this.apiConfig.baseURL}${endpoint}`, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (response.ok) {
                        console.log(`✅ API 連接測試成功 (${endpoint})`);
                this.connectionStatus.connected = true;
                return true;
            } else {
                        console.log(`⚠️ 端點 ${endpoint} 返回 ${response.status}`);
                    }
                } catch (endpointError) {
                    console.log(`⚠️ 端點 ${endpoint} 測試失敗: ${endpointError.message}`);
                }
            }
            
            // 如果所有端點都失敗，嘗試基本的網絡連接測試
            try {
                const testResponse = await fetch(`${this.apiConfig.baseURL}`, {
                    method: 'HEAD',
                    headers: this.getStandardHeaders()
                });
                
                if (testResponse.status < 500) { // 任何非 5xx 錯誤都表示服務器可達
                    console.log('✅ 服務器可達，但 API 端點可能不可用');
                    this.connectionStatus.connected = true;
                    return true;
                }
            } catch (basicError) {
                console.log('⚠️ 基本連接測試失敗');
            }
            
            // 如果都失敗，設置為未連接
            this.connectionStatus.connected = false;
            console.warn('⚠️ 所有 API 連接測試都失敗，設置為未連接狀態');
            return false;
            
        } catch (error) {
            console.error('❌ API 連接測試失敗:', error);
            this.connectionStatus.connected = false;
            return false;
        }
    }

    // 预加载基础数据（立即更新UI）
    async preloadBasicData() {
        try {
            console.log('🔄 正在预加载基础数据...');
            
            // 使用 Promise.all 並行載入數據
            const [locations, clubs] = await Promise.all([
                this.fetchLocations(),
                this.fetchClubs()
            ]);
            
            // 更新缓存
            this.cache.locations = locations;
            this.cache.clubs = clubs;
            console.log(`✅ 基础数据缓存完成: ${locations.length} 个地点, ${clubs.length} 个泳会`);
            
            // 立即更新UI，不等待登录逻辑
            console.log('🔄 立即更新UI以显示最新缓存数据');
            this.updateLocationSelects();
            this.updateClubSelects();
            
            // 觸發自定義事件，通知其他組件數據已更新
            this.dispatchBasicDataUpdated();
            
            // 預載入其他常用數據（非阻塞）
            this.preloadOtherData();
            
            return { locations, clubs };
        } catch (error) {
            console.error('❌ 预加载基础数据失败:', error);
            // 使用緩存數據作為降級方案
            return this.getFallbackData();
        }
    }

    // 預載入其他常用數據（非阻塞）
    async preloadOtherData() {
        try {
            // 使用 Promise.allSettled 避免單個失敗影響整體
            const results = await Promise.allSettled([
                this.fetchCoaches().catch(() => []),
                this.fetchStudents().catch(() => [])
            ]);
            
            if (results[0].status === 'fulfilled') {
                this.cache.coaches = results[0].value;
            }
            
            if (results[1].status === 'fulfilled') {
                this.cache.students = results[1].value;
            }
            
            console.log('✅ 其他數據預載入完成');
        } catch (error) {
            console.warn('⚠️ 其他數據預載入失敗，不影響主要功能:', error);
        }
    }

    // 獲取降級數據
    getFallbackData() {
        const fallbackLocations = ['全部地點', '維多利亞公園游泳池', '荔枝角公園游泳池', '觀塘游泳池'];
        const fallbackClubs = ['全部泳會', '維多利亞泳會', '荔枝角泳會', '觀塘泳會'];
        
        this.cache.locations = fallbackLocations;
        this.cache.clubs = fallbackClubs;
        
        return { locations: fallbackLocations, clubs: fallbackClubs };
    }

    // 處理學生數據中的特殊標記
    processStudentSpecialMarks(studentData) {
        if (!studentData || !Array.isArray(studentData)) {
            return studentData;
        }

        return studentData.map(student => {
            // 檢查上課日期中是否包含特殊標記
            const hasBalloonMark = this.checkForSpecialMark(student, this.specialMarks.balloon);
            const hasStarMark = this.checkForSpecialMark(student, this.specialMarks.star);

            return {
                ...student,
                hasBalloonMark: hasBalloonMark,
                hasStarMark: hasStarMark
            };
        });
    }

    // 檢查學生記錄中是否包含特定標記
    checkForSpecialMark(student, mark) {
        // 檢查多個可能包含標記的字段
        const fieldsToCheck = [
            '上課日期', '上課', '日期', 'time', 'classDates', 'originalDates'
        ];

        for (const field of fieldsToCheck) {
            if (student[field]) {
                const value = String(student[field]);
                if (value.includes(mark)) {
                    return true;
                }
            }
        }

        // 檢查數組字段
        if (student.originalDates && Array.isArray(student.originalDates)) {
            for (const date of student.originalDates) {
                if (String(date).includes(mark)) {
                    return true;
                }
            }
        }

        return false;
    }

    // 更新學生記錄的特殊標記
    async updateStudentSpecialMarks(studentId, hasBalloonMark, hasStarMark) {
        try {
            const response = await fetch(`${this.apiConfig.baseURL}/api/students/${studentId}/marks`, {
                method: 'PATCH',
                headers: this.getStandardHeaders(),
                body: JSON.stringify({
                    hasBalloonMark: hasBalloonMark,
                    hasStarMark: hasStarMark
                })
            });

            if (response.ok) {
                console.log('✅ 學生特殊標記更新成功');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ 更新學生特殊標記失敗:', error);
            return false;
        }
    }

    // 保存學生數據
    async saveStudent(studentData) {
        try {
            console.log('🔄 正在保存學生數據...');
            
            // 處理特殊標記
            const processedData = this.processStudentSpecialMarks([studentData])[0];
            
            // 保存到資料庫
            const response = await fetch(`${this.apiConfig.baseURL}/api/students`, {
                method: 'POST',
                headers: this.getStandardHeaders(),
                body: JSON.stringify(processedData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ 學生數據保存成功');
                
                // 更新緩存
                this.updateStudentCache(processedData);
                
                return { success: true, data: result };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ 保存學生數據失敗:', error);
            return { success: false, error: error.message };
        }
    }

    // 更新學生緩存
    updateStudentCache(studentData) {
        if (!this.cache.students) {
            this.cache.students = [];
        }
        
        // 查找是否已存在該學生
        const existingIndex = this.cache.students.findIndex(s => 
            s._id === studentData._id || s.Phone_number === studentData.Phone_number
        );
        
        if (existingIndex >= 0) {
            // 更新現有記錄
            this.cache.students[existingIndex] = { ...this.cache.students[existingIndex], ...studentData };
        } else {
            // 添加新記錄
            this.cache.students.push(studentData);
        }
        
        console.log('✅ 學生緩存已更新');
    }

    // 获取地点数据（匹配手机版逻辑）
    async fetchLocations() {
        try {
            const url = `${this.apiConfig.baseURL}/api/locations`;  // 修复：添加/api前缀
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (!response.ok) return ['全部地點'];  // 修复：失败时返回默认选项
            const json = await response.json();
            const locationsArray = json?.locations ?? [];
            
            if (!Array.isArray(locationsArray)) {
                console.warn('⚠️ locations不是数组:', locationsArray);
                return ['全部地點'];
            }
            
            const newLocations = ['全部地點'];  // 修复：添加"全部地點"选项
            
            locationsArray.forEach(location => {
                const locationStr = String(location).trim();
                if (locationStr && !newLocations.includes(locationStr)) {
                    newLocations.push(locationStr);
                }
            });
            
            return newLocations;
        } catch (error) {
            console.warn('⚠️ 无法获取地点数据:', error);
            return ['全部地點'];  // 修复：错误时返回默认选项
        }
    }

    // 获取泳会数据（匹配手机版逻辑）
    async fetchClubs(location = '') {
        try {
            const params = new URLSearchParams();
            const cleanLoc = (location || '').trim();
            if (cleanLoc && cleanLoc !== '全部地點') {
                params.append('location', cleanLoc);
            }
            const url = params.toString() ? `${this.apiConfig.baseURL}/api/clubs?${params}` : `${this.apiConfig.baseURL}/api/clubs`;
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (!response.ok) return ['全部泳會'];
            const json = await response.json();
            const clubsArray = json?.clubs ?? [];
            
            if (!Array.isArray(clubsArray)) {
                console.warn('⚠️ clubs不是数组:', clubsArray);
                return ['全部泳會'];
            }
            
            const newClubs = ['全部泳會'];  // 修复：添加"全部泳會"选项
            
            clubsArray.forEach(club => {
                const clubStr = String(club).trim();
                if (clubStr && !newClubs.includes(clubStr)) {
                    newClubs.push(clubStr);
                }
            });
            
            return newClubs;
        } catch (error) {
            console.warn('⚠️ 无法获取泳会数据:', error);
            return ['全部泳會'];
        }
    }

    // 获取学生数据
    async fetchStudents(location = '', club = '') {
        try {
            const params = new URLSearchParams();
            if (location) params.append('location', location);
            if (club) params.append('club', club);
            
            const response = await fetch(`${this.apiConfig.baseURL}/api/students?${params}`, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.cache.students = data.students || [];
                return this.cache.students;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ 获取学生数据失败:', error);
            return [];
        }
    }

    // 获取出席记录
    async fetchAttendance(month, location, club) {
        try {
            const params = new URLSearchParams({
                month: month,
                location: location,
                club: club
            });
            
            const response = await fetch(`${this.apiConfig.baseURL}/api/attendance?${params}`, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.cache.attendance = data.attendance || [];
                return this.cache.attendance;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ 获取出席记录失败:', error);
            return [];
        }
    }

    // 获取工时数据
    async fetchWorkHours(month, location = '', club = '', coachPhone = '') {
        try {
            const params = new URLSearchParams({ month: month });
            if (location) params.append('location', location);
            if (club) params.append('club', club);
            if (coachPhone) params.append('coach', coachPhone);
            
            const response = await fetch(`${this.apiConfig.baseURL}/api/work-hours?${params}`, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.cache.workHours = data.workHours || [];
                return this.cache.workHours;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ 获取工时数据失败:', error);
            return [];
        }
    }

    // 获取更表数据
    async fetchRoster(month, coachPhone = '') {
        try {
            const year = new Date().getFullYear();
            const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();

            // 修復：優先使用傳入的coachPhone，而不是localStorage中的數據
            let phone = coachPhone;
            let coachName = '';
            
            // 如果有phone，嘗試獲取對應的教練姓名
            if (phone && phone.trim()) {
                try {
                    const coachResp = await fetch(`${this.apiConfig.baseURL}/api/coaches?phone=${phone}`, {
                    method: 'GET',
                    headers: this.getStandardHeaders()
                });
                    
                if (coachResp.ok) {
                    const coachJson = await coachResp.json();
                        // 修復：使用正確的數據結構
                        if (coachJson?.coaches && coachJson.coaches.length > 0) {
                            coachName = coachJson.coaches[0].name || coachJson.coaches[0].studentName || '';
                        } else if (coachJson?.coach) {
                            coachName = coachJson.coach.name || coachJson.coach.studentName || '';
                        }
                        console.log('🔍 獲取到教練姓名:', coachName, '電話:', phone);
                } else {
                    console.warn('⚠️ 無法獲取教練姓名，狀態:', coachResp.status);
                    }
                } catch (e) {
                    console.warn('⚠️ 獲取教練姓名失敗:', e);
                }
            }

            const params = new URLSearchParams();
            
            // 主管模式：不限制特定教练
            if (phone && phone.trim()) {
                params.append('phone', phone);
            }
            
            // 添加用户类型参数
            params.append('userType', userType);
            params.append('year', year);
            params.append('month', month);
            if (coachName) params.append('name', coachName);
            
            console.log('🔍 獲取更表數據:', { phone: phone, year, month, name: coachName });
            
            const response = await fetch(`${this.apiConfig.baseURL}/api/coach-roster?${params}`, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ 更表數據獲取成功:', data);
                
                const roster = data.records || [];
                this.cache.roster = roster;
                return roster;
            } else {
                const errorText = await response.text();
                console.error('❌ 更表數據獲取失敗:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ 获取更表数据失败:', error);
            return [];
        }
    }

    // 主管登入後預加載數據（Coach_account / Coach_work_hours / Coach_roster）
    async preloadSupervisorData() {
        try {
            const userType = (localStorage.getItem('current_user_type') || '').toLowerCase();
            if (userType !== 'supervisor') {
                return;
            }
            console.log('🗂️ 主管模式：開始預加載 Coach_account / Coach_work_hours / Coach_roster 數據');

            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            // 並行獲取：教練名單、當月全部工時、當月全部更表
            const [coaches, workHoursAll, rosterAll] = await Promise.all([
                this.fetchCoaches(),
                // 空 phone + supervisor 代表全部
                this.fetchCoachWorkHours('', year, month, '', ''),
                this.fetchRoster(month, '')
            ]);

            // 緩存
            this.cache.coaches = coaches || [];
            this.cache.workHours = Array.isArray(workHoursAll) ? workHoursAll : [];
            this.cache.roster = Array.isArray(rosterAll) ? rosterAll : [];

            // 標記時間
            try { this.connectionStatus.lastSync = new Date(); } catch(_) {}

            // 發送事件，通知界面可以即時渲染
            const event = new CustomEvent('supervisorDataReady', {
                detail: {
                    year,
                    month,
                    coachesCount: (this.cache.coaches || []).length,
                    workHoursCount: (this.cache.workHours || []).length,
                    rosterCount: (this.cache.roster || []).length
                }
            });
            document.dispatchEvent(event);
            console.log('✅ 主管數據預加載完成');
        } catch (e) {
            console.warn('⚠️ 主管數據預加載失敗:', e);
        }
    }

    // 获取工时管理的地点数据（从 /api/locations 端点）
    async fetchWorkHoursLocations() {
        try {
            console.log('🔍 开始获取地点数据...');
            const response = await fetch(`${this.apiConfig.baseURL}/api/locations`, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            console.log('🔍 API响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                console.warn('⚠️ API响应失败:', response.status, response.statusText);
                return [];
            }
            
            const json = await response.json();
            console.log('🔍 API原始响应:', json);
            
            const raw = json?.locations ?? json?.data ?? json?.list ?? [];
            console.log('🔍 提取的原始数据:', raw);
            
            const arr = Array.isArray(raw) ? raw : [];
            // 兼容字符串或对象（{location: '...'}）
            const list = arr.map(v => (typeof v === 'string' ? v : (v?.location || ''))).map(s => String(s).trim()).filter(Boolean);
            const result = Array.from(new Set(list));
            
            console.log('🔍 最终处理的地点数据:', result);
            return result;
        } catch (error) {
            console.warn('⚠️ 无法获取工时管理地点数据:', error);
            return [];
        }
    }

    // 获取工时管理的泳会数据（从 /api/clubs 端点）
    async fetchWorkHoursClubs(location = '') {
        try {
            const params = new URLSearchParams();
            const cleanLoc = (location || '').trim();
            if (cleanLoc) params.append('location', cleanLoc);
            
            const url = params.toString() 
                ? `${this.apiConfig.baseURL}/api/clubs?${params}`
                : `${this.apiConfig.baseURL}/api/clubs`;
                
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (!response.ok) return [];
            const json = await response.json();
            const raw = json?.clubs ?? json?.data ?? json?.list ?? [];
            const arr = Array.isArray(raw) ? raw : [];
            // 兼容字符串或对象（{club: '...'}）
            const list = arr.map(v => (typeof v === 'string' ? v : (v?.club || ''))).map(s => String(s).trim()).filter(Boolean);
            return Array.from(new Set(list));
        } catch (error) {
            console.warn('⚠️ 无法获取工时管理泳会数据:', error);
            return [];
        }
    }

    // 获取教练工时数据（从 Coach_work_hours 表）
    async fetchCoachWorkHours(coachPhone, year, month, location = '', club = '') {
        try {
            console.log('🔍 获取教练工时数据:', { coachPhone, year, month, location, club });
            
            const params = new URLSearchParams();
            
            // 主管模式：不限制特定教练
            if (coachPhone && coachPhone.trim()) {
            params.append('phone', coachPhone);
            }
            
            // 添加用户类型参数
            const userType = localStorage.getItem('current_user_type') || 'coach';
            params.append('userType', userType);
            
            // 新的邏輯：只有當year和month不為0時才添加參數
            if (year && year !== 0) {
            params.append('year', year);
            }
            if (month && month !== 0) {
            params.append('month', month);
            }
            if (location && location.trim()) {
                params.append('location', location);
            }
            if (club && club.trim()) {
                params.append('club', club);
            }
            
            const url = `${this.apiConfig.baseURL}/api/coach-work-hours?${params}`;
            console.log('🔍 请求URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (!response.ok) {
                console.warn('⚠️ 获取教练工时数据失败:', response.status, response.statusText);
                return [];
            }
            
            const json = await response.json();
            const workHours = json?.records ?? json?.work_hours ?? json?.data ?? [];
            
            console.log('✅ 获取教练工时数据成功:', workHours.length, '条记录');
            return workHours;
            
        } catch (error) {
            console.error('❌ 获取教练工时数据失败:', error);
            return [];
        }
    }

    // 获取教练工时统计信息
    async fetchCoachWorkHoursStats(coachPhone, year, month, location = '', club = '') {
        try {
            console.log('📊 获取教练工时统计:', { coachPhone, year, month, location, club });
            
            const params = new URLSearchParams();
            
            // 主管模式：不限制特定教练
            if (coachPhone && coachPhone.trim()) {
                params.append('phone', coachPhone);
            }
            
            // 添加用户类型参数
            const userType = localStorage.getItem('current_user_type') || 'coach';
            params.append('userType', userType);
            
            // 新的邏輯：只有當year和month不為0時才添加參數
            if (year && year !== 0) {
                params.append('year', year);
            }
            if (month && month !== 0) {
                params.append('month', month);
            }
            if (location && location.trim()) {
                params.append('location', location);
            }
            if (club && club.trim()) {
                params.append('club', club);
            }
            
            const url = `${this.apiConfig.baseURL}/api/coach-work-hours-stats?${params}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (!response.ok) {
                console.warn('⚠️ 获取教练工时统计失败:', response.status, response.statusText);
                return null;
            }
            
            const json = await response.json();
            const stats = json?.stats ?? json?.data ?? {};
            
            console.log('✅ 获取教练工时统计成功:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ 获取教练工时统计失败:', error);
            return null;
        }
    }

    // 获取教练全部工时数据（所有月份、地点、泳会）
    async fetchAllCoachWorkHours(coachPhone) {
        try {
            console.log('📊 获取教练全部工时数据:', { coachPhone });
            
            const params = new URLSearchParams();
            params.append('phone', coachPhone);
            
            const url = `${this.apiConfig.baseURL}/api/coach-work-hours-all?${params}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (!response.ok) {
                console.warn('⚠️ 获取教练全部工时数据失败:', response.status, response.statusText);
                return [];
            }
            
            const json = await response.json();
            const allWorkHours = json?.records ?? json?.data ?? [];
            
            console.log('✅ 获取教练全部工时数据成功:', allWorkHours.length, '条记录');
            return allWorkHours;
            
        } catch (error) {
            console.error('❌ 获取教练全部工时数据失败:', error);
            return [];
        }
    }

    // 更新地点选择器
    updateLocationSelects() {
        const locationSelects = [
            'attendanceLocation',
            'locationSelect',
            'workHoursLocation'
        ];
        
        locationSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">請選擇地點</option>';
                this.cache.locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location;
                    option.textContent = location;
                    select.appendChild(option);
                });
            }
        });

        // 地點變更時，聯動更新工時頁面的泳會選單
        const workLoc = document.getElementById('workHoursLocation');
        const workClub = document.getElementById('workHoursClub');
        if (workLoc && workClub) {
            workLoc.onchange = async () => {
                const loc = workLoc.value;
                workClub.innerHTML = '<option value="">請選擇泳會</option>';
                if (!loc) return;
                try {
                    const list = await this.fetchClubs(loc);
                    list.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c;
                        opt.textContent = c;
                        workClub.appendChild(opt);
                    });
                } catch (e) {
                    console.warn('載入泳會失敗', e);
                }
            };
        }
    }

    // 更新泳会选择器
    updateClubSelects() {
        const clubSelects = [
            'attendanceClub',
            'clubSelect',
            'workHoursClub'
        ];
        
        clubSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">請選擇泳會</option>';
                this.cache.clubs.forEach(club => {
                    const option = document.createElement('option');
                    option.value = club;
                    option.textContent = club;
                    select.appendChild(option);
                });
            }
        });
    }

    // 更新學生課程時間與類型（依電話+姓名定位）
    async updateStudentLesson({ phone, name, date = '', location = '', time, type }) {
        try {
            const body = { phone, name, date, location, time, type };
            const resp = await fetch(`${this.apiConfig.baseURL}/api/students/update-lesson`, {
                method: 'POST',
                headers: this.getStandardHeaders(),
                body: JSON.stringify(body)
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            return json;
        } catch (e) {
            console.warn('更新學生課程失敗', e);
            throw e;
        }
    }

    // 设置自动同步
    setupAutoSync() {
        // 每5分钟自动同步一次数据
        setInterval(async () => {
            try {
                await this.syncData();
            } catch (error) {
                console.error('❌ 自动同步失败:', error);
            }
        }, 5 * 60 * 1000);
    }

    // 同步数据
    async syncData() {
        try {
            console.log('🔄 正在同步数据...');
            // 同步基础数据
            const [locations, clubs] = await Promise.all([
                this.fetchLocations(),
                this.fetchClubs()
            ]);
            // 更新缓存
            this.cache.locations = locations;
            this.cache.clubs = clubs;
            // 更新UI
            this.updateLocationSelects();
            this.updateClubSelects();
            
            this.connectionStatus.lastSync = new Date();
            console.log('✅ 数据同步完成');
        } catch (error) {
            console.error('❌ 数据同步失败:', error);
        }
    }

    // 获取连接状态
    getConnectionStatus() {
        return {
            ...this.connectionStatus,
            cacheSize: Object.keys(this.cache).length,
            lastSync: this.connectionStatus.lastSync
        };
    }

    // 获取缓存数据
    getCachedData(type) {
        return this.cache[type] || [];
    }

    // 清除缓存
    clearCache() {
        Object.keys(this.cache).forEach(key => {
            this.cache[key] = [];
        });
        console.log('🗑️ 缓存已清除');
    }

    // 重新连接
    async reconnect() {
        try {
            console.log('🔄 正在重新连接...');
            this.connectionStatus.connected = false;
            
            await this.testConnection();
            await this.preloadBasicData();
            
            console.log('✅ 重新连接成功');
        } catch (error) {
            console.error('❌ 重新连接失败:', error);
        }
    }

    // 獲取教練列表（Coach_account）
    async fetchCoaches(query = {}) {
        try {
            const params = new URLSearchParams();
            const { phone = '', club = '' } = query || {};
            if (phone) params.append('phone', phone);
            if (club) params.append('club', club);
            const url = params.toString()
                ? `${this.apiConfig.baseURL}/api/coaches?${params}`
                : `${this.apiConfig.baseURL}/api/coaches`;
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            if (!response.ok) {
                console.warn('⚠️ 無法獲取教練列表:', response.status, response.statusText);
                return [];
            }
            const json = await response.json();
            const coaches = Array.isArray(json?.coaches) ? json.coaches : [];
            this.cache.coaches = coaches;
            return coaches;
        } catch (e) {
            console.warn('⚠️ 獲取教練列表失敗:', e);
            return [];
        }
    }

    // 觸發就緒事件
    dispatchReadyEvent() {
        const event = new CustomEvent('databaseConnectorReady', {
            detail: {
                connected: this.connectionStatus.connected,
                cache: this.cache
            }
        });
        document.dispatchEvent(event);
    }

    // 觸發基础数据更新事件
    dispatchBasicDataUpdated() {
        const event = new CustomEvent('basicDataUpdated', { 
            detail: { 
                locations: this.cache.locations, 
                clubs: this.cache.clubs,
                timestamp: new Date().toISOString()
            } 
        });
        document.dispatchEvent(event);
        console.log('�� 已发送基础数据更新事件');
    }
}

// 创建全局数据库连接器实例
const databaseConnector = new DatabaseConnector();

// 导出数据库连接器
window.DatabaseConnector = DatabaseConnector;
window.databaseConnector = databaseConnector;

// 页面加载完成后初始化数据库连接
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 页面加载完成，数据库连接器已初始化');
    
    // 确保全局变量可用
    if (typeof window !== 'undefined') {
        window.databaseConnector = databaseConnector;
        console.log('✅ 数据库连接器已添加到全局作用域');
    }
    
    // 显示连接状态
    const status = databaseConnector.getConnectionStatus();
    console.log('📊 数据库连接状态:', status);
    
    // 触发一个自定义事件，通知其他脚本数据库连接器已准备好
    const event = new CustomEvent('databaseConnectorReady', { 
        detail: { connector: databaseConnector } 
    });
    document.dispatchEvent(event);
    console.log('📡 已发送数据库连接器就绪事件');
}); 