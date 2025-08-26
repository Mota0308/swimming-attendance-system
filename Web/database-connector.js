// 数据库连接器和数据管理器
class DatabaseConnector {
    constructor() {
        this.apiConfig = {
            baseURL: window.location.origin, // 使用当前域名，通过代理访问
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
            roster: []
        };
        
        this.init();
    }

    // 初始化数据库连接
    async init() {
        try {
            console.log('🔄 正在初始化数据库连接...');
            
            // 测试API连接
            await this.testConnection();
            
            // 预加载基础数据
            await this.preloadBasicData();
            
            // 设置自动同步
            this.setupAutoSync();
            
            console.log('✅ 数据库连接初始化完成');
        } catch (error) {
            console.error('❌ 数据库连接初始化失败:', error);
            this.connectionStatus.errorCount++;
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
            const response = await fetch(`${this.apiConfig.baseURL}/api/health`, {
                method: 'GET',
                headers: this.getStandardHeaders()
            });
            
            if (response.ok) {
                this.connectionStatus.connected = true;
                console.log('✅ API连接测试成功');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ API连接测试失败:', error);
            this.connectionStatus.connected = false;
            throw error;
        }
    }

    // 预加载基础数据（立即更新UI）
    async preloadBasicData() {
        try {
            console.log('🔄 正在预加载基础数据...');
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
            const event = new CustomEvent('basicDataUpdated', { 
                detail: { 
                    locations: locations, 
                    clubs: clubs,
                    timestamp: new Date().toISOString()
                } 
            });
            document.dispatchEvent(event);
            console.log('📡 已发送基础数据更新事件');
            
        } catch (error) {
            console.error('❌ 基础数据预加载失败:', error);
        }
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
            const userType = localStorage.getItem('current_user_type') || 'coach';
            const isSupervisor = userType === 'supervisor';
            
            // 主管模式：允许不提供phone参数，获取所有教练数据
            if (!coachPhone && !isSupervisor) {
                console.warn('⚠️ 未提供教練電話號碼，無法獲取更表數據');
                return [];
            }
            
            const year = new Date().getFullYear();

            // 優先從 localStorage 讀取教練名字，沒有再調 /coaches 獲取
            let coachName = '';
            try { coachName = localStorage.getItem('current_user_name') || ''; } catch (_) {}
            if (!coachName) {
                const coachResp = await fetch(`${this.apiConfig.baseURL}/api/coaches?phone=${encodeURIComponent(coachPhone)}`, {
                    method: 'GET',
                    headers: this.getStandardHeaders()
                });
                if (coachResp.ok) {
                    const coachJson = await coachResp.json();
                    coachName = coachJson?.coach?.studentName || coachJson?.coach?.name || '';
                    if (coachName) {
                        try { localStorage.setItem('current_user_name', coachName); } catch (_) {}
                    }
                } else {
                    console.warn('⚠️ 無法獲取教練姓名，狀態:', coachResp.status);
                }
            }

            const params = new URLSearchParams();
            
            // 主管模式：不限制特定教练
            if (coachPhone && coachPhone.trim()) {
                params.append('phone', coachPhone);
            }
            
            // 添加用户类型参数
            params.append('userType', userType);
            params.append('year', year);
            params.append('month', month);
            if (coachName) params.append('name', coachName);
            
            console.log('🔍 獲取更表數據:', { phone: coachPhone, year, month, name: coachName });
            
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
            params.append('phone', coachPhone);
            
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