const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 解鎖碼（支持本地存儲）
const ABSOLUTE_PASSWORD = 'wtsm';
const UNLOCK_CODE_KEY = 'swimming_unlock_code';

// 使用立即執行函數來安全地初始化解鎖碼
const UNLOCK_CODE = (function() {
    try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem) {
            const storedCode = localStorage.getItem(UNLOCK_CODE_KEY);
            if (storedCode) {
                return storedCode;
            }
        }
    } catch (error) {
        console.log('無法從 localStorage 讀取解鎖碼，使用預設值');
    }
    return '0000'; // 預設值
})();

// 當前解鎖碼（可變）
let currentUnlockCode = UNLOCK_CODE;

// 全局變量
let currentDocument = null;
let isLoggedIn = false;

// 全局緩存雲端學生資料
window.cloudStudentsGrouped = null;

// 計算時間差並返回選項3的值
function calculateOption3FromTimeDifference(timeStr, dateStr, courseType = '') {
    // 第一步：檢查基本參數是否為空
    if (!timeStr || !dateStr) {
        return '';
    }
    
    // 第二步：檢查時間格式是否正確
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!timeMatch) {
        return '';
    }
    
    // 第三步：計算時間差
    const startHour = parseInt(timeMatch[1]);
    const startMinute = parseInt(timeMatch[2]);
    const endHour = parseInt(timeMatch[3]);
    const endMinute = parseInt(timeMatch[4]);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    let diffMinutes = endMinutes - startMinutes;
    
    // 處理跨日的情況
    if (diffMinutes <= 0) {
        diffMinutes += 24 * 60; // 加上24小時
    }
    
    // 第四步：根據課程類型計算點數
    if (courseType && courseType.includes('指定導師高班')) {
        // 指定導師高班的計算規則
        if (diffMinutes === 90) { return '1.5'; }
        else if (diffMinutes === 120) { return '2'; }
        else if (diffMinutes === 150) { return '2.5'; }
        else if (diffMinutes === 180) { return '3'; }
        else if (diffMinutes === 210) { return '3.5'; }
        else if (diffMinutes === 240) { return '4'; }
        else if (diffMinutes === 270) { return '4.5'; }
        else if (diffMinutes === 300) { return '5'; }
        return '';
    } else {
        // 默認計算規則
        if (diffMinutes === 60) { return '1.5'; }
        else if (diffMinutes === 90) { return '2'; }
        else if (diffMinutes === 120) { return '2.5'; }
        else if (diffMinutes === 150) { return '3'; }
        else if (diffMinutes === 180) { return '3.5'; }
        else if (diffMinutes === 210) { return '4'; }
        else if (diffMinutes === 240) { return '4.5'; }
        return '';
    }
}

// 啟動時自動加載雲端資料
async function preloadCloudStudents() {
    try {
        const grouped = await ipcRenderer.invoke('fetch-students-from-cloud');
        window.cloudStudentsGrouped = grouped;
    } catch (e) {
        window.cloudStudentsGrouped = [];
    }
}

// 登入功能
window.login = function() {
    const unlockCode = document.getElementById('unlockCode').value;
    const errorMessage = document.getElementById('errorMessage');
    
    if (unlockCode === currentUnlockCode) {
        isLoggedIn = true;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        errorMessage.textContent = '';
        
        // 初始化應用程式
        initializeApp();
    } else {
        errorMessage.textContent = '解鎖碼錯誤，請重試';
        document.getElementById('unlockCode').value = '';
    }
}

// 登出功能
window.logout = function() {
    isLoggedIn = false;
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('unlockCode').value = '';
    document.getElementById('errorMessage').textContent = '';
}

// 切換標籤頁
window.switchTab = function(tabName, event) {
    // 隱藏所有標籤內容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // 移除所有標籤的活動狀態
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => tab.classList.remove('active'));
    
    // 顯示選中的標籤內容
    let tab = document.getElementById(tabName + 'Tab');
    if (tab) {
        tab.classList.add('active');
    }
    
    // 設置選中標籤的活動狀態
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // 載入對應的內容
    loadTabContent(tabName);
}

// 載入標籤內容
window.loadTabContent = function(tabName) {
    // 如果切換到非教練頁面，清理教練頁面的自動刷新
    if (tabName !== 'coach' && window.coachAutoRefreshInterval) {
        clearInterval(window.coachAutoRefreshInterval);
        window.coachAutoRefreshInterval = null;
        console.log('已清理教練頁面自動刷新');
    }
    
    switch(tabName) {
        case 'attendance':
            loadAttendanceContent();
            break;
        case 'students':
            loadStudentsContent();
            break;
        case 'coach':
            loadCoachContent();
            break;
        case 'config':
            loadConfigContent();
            break;
        case 'documents':
            loadDocumentsContent();
            break;
    }
}

// 載入出席記錄內容
window.loadAttendanceContent = function() {
    const content = document.getElementById('attendanceContent');
    content.innerHTML = `
        <h2>出席記錄</h2>
        <button id="refreshAttendanceBtn" style="padding:10px 20px;margin-bottom:20px;">刷新</button>
        <div id="attendanceTableArea"></div>
    `;
    document.getElementById('refreshAttendanceBtn').onclick = refreshAttendanceTable;
    renderAttendanceTable();
}

// 渲染雲端資料表格（用緩存）
window.renderAttendanceTable = function() {
    const tableArea = document.getElementById('attendanceTableArea');
    let grouped = window.cloudStudentsGrouped || [];
    // 將所有學生攤平成一個陣列
    let allStudents = [];
    (grouped || []).forEach(group => {
        (group.students || []).forEach(stu => {
            allStudents.push(stu);
        });
    });
    
    // 按上課地點分組
    let locationGroups = {};
    allStudents.forEach(stu => {
        let location = stu.location || '未知地點'; // 如果沒有location欄位，使用預設值
        
        // 標準化地點名稱，移除表情符號和多餘空格
        let normalizedLocation = location
            .replace(/[🏊‍♂🏊♂]/g, '') // 移除游泳表情符號
            .replace(/\s+/g, ' ') // 將多個空格替換為單個空格
            .trim(); // 移除首尾空格
        
        if (!locationGroups[normalizedLocation]) {
            locationGroups[normalizedLocation] = [];
        }
        locationGroups[normalizedLocation].push(stu);
    });
    
    // 生成搜索界面
    let html = `
        <!-- 搜索功能 -->
        <div class="search-section" style="margin:20px 0;padding:15px;background:#f8f9fa;border-radius:8px;">
            <h3 style="margin-bottom:15px;color:#333;">搜索功能</h3>
            <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:5px;">
                    <label style="font-weight:bold;">姓名搜索:</label>
                    <input type="text" id="attendanceNameSearch" placeholder="輸入學生姓名" style="padding:8px;border:1px solid #ddd;border-radius:4px;width:150px;">
                </div>
                <div style="display:flex;align-items:center;gap:5px;">
                    <label style="font-weight:bold;">電話搜索:</label>
                    <input type="text" id="attendancePhoneSearch" placeholder="輸入電話號碼" style="padding:8px;border:1px solid #ddd;border-radius:4px;width:150px;">
                </div>
                <button onclick="searchAttendanceRecords()" style="padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">搜索</button>
                <button onclick="resetAttendanceSearch()" style="padding:8px 16px;background:#95a5a6;color:white;border:none;border-radius:4px;cursor:pointer;">重置</button>
            </div>
        </div>
    `;
    
    // 生成表格，按地點分類
    Object.keys(locationGroups).sort().forEach(location => {
        let students = locationGroups[location];
        
        // 以姓名+電話為 key 聚合所有上課日期
        let studentMap = {};
        students.forEach(stu => {
            // 正確對應雲端資料庫欄位：Phone_number 和 age
            let phoneNumber = stu.Phone_number || stu.phoneNumber || stu["電話號碼"] || stu.phone || '';
            let key = `${stu.name || ''}|${phoneNumber}`;
            if (!studentMap[key]) {
                studentMap[key] = {
                    name: stu.name || '',
                    age: stu.age || '', // 對應雲端資料庫的 age 欄位
                    phone: phoneNumber, // 對應雲端資料庫的 Phone_number 欄位
                    location: stu.location || location,
                    wait: stu.待約 || stu.wait || '', // 對應雲端資料庫的 待約 欄位
                    dates: []
                };
            }
            let dateVal = stu["上課日期"] || stu["dates"] || '';
            if (dateVal && !studentMap[key].dates.includes(dateVal)) {
                studentMap[key].dates.push(dateVal);
            }
        });
        
        // 為每個地點生成一個表格
        html += `<div style="margin-top:20px;"><b>${location}</b></div>`;
                    html += `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
            <tr style="background:#f5f5f5;">
                <th style="border:1px solid #ddd;padding:8px;">學生姓名</th>
                <th style="border:1px solid #ddd;padding:8px;">學生年齡</th>
                <th style="border:1px solid #ddd;padding:8px;">電話號碼</th>
                <th style="border:1px solid #ddd;padding:8px;color: #FF0000;">已有點數</th>
                <th style="border:1px solid #ddd;padding:8px;color: #FF0000;">已購買堂數</th>
                <th style="border:1px solid #ddd;padding:8px;">待約堂數</th>
                <th style="border:1px solid #ddd;padding:8px;">已約堂數</th>
                <th style="border:1px solid #ddd;padding:8px;">已出席堂數</th>
                <th style="border:1px solid #ddd;padding:8px;color: #FF0000;">剩餘堂數</th>
                <th style="border:1px solid #ddd;padding:8px;color: #FF0000;">剩餘點數</th>
                <th style="border:1px solid #ddd;padding:8px;color:#e67e22;">需補堂數</th>
            </tr>`;
        
        Object.values(studentMap).forEach(stu => {
            // 計算學生的堂數統計
            let stats = calculateStudentStats(stu, allStudents);
            
            html += `<tr>
                <td style="border:1px solid #ddd;padding:8px;">${stu.name}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stu.age}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stu.phone}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.totalPoints}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.totalPurchased}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.waitCount}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.bookedCount}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.attendedCount}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.remainingCount}</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.remainingpoints}</td>
                <td style="border:1px solid #ddd;padding:8px;color:#e67e22;">${stats.needMakeUpCount || 0}</td>
            </tr>`;
        });
        html += '</table>';
    });
    
    tableArea.innerHTML = html;
}

// 刷新並顯示雲端資料，並更新緩存
async function refreshAttendanceTable() {
    const tableArea = document.getElementById('attendanceTableArea');
    tableArea.innerHTML = '加載中...';
    let grouped = await ipcRenderer.invoke('fetch-students-from-cloud');
    window.cloudStudentsGrouped = grouped;
    renderAttendanceTable();
}

// 啟動時自動加載雲端資料
preloadCloudStudents();

// 載入學生管理內容
function loadStudentsContent() {
    const content = document.getElementById('studentsContent');
    let locationMap = {};
    try {
        locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    } catch (e) {}
    let html = `<h2 style="margin-bottom: 20px; color: #333;">學生管理</h2>`;
    let locations = Object.keys(locationMap);
    if (locations.length === 0) {
        html += '<p style="color: #666;">暫無已保存的學生資料</p>';
    } else {
        html += '<div id="locationBtns">';
        locations.forEach(loc => {
            html += `
              <meta charset="UTF-8">
              <style>
    .location-tag {
      display: inline-block;
      position: relative;
      margin-right: 16px;
      margin-bottom: 12px;
    }
       .location-btn {
      padding: 16px 30px;
      background: #1976d2;
      color: #fff;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      position: relative;
      z-index: 1;
      font-size: 15px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.10);
      transition: background 0.2s, box-shadow 0.2s;
      min-width: 180px;
    }
      .delete-location-btn {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #ff0000;
      font-size: 20px;
      cursor: pointer;
      z-index: 2;
    }
      </style>
              <span class="location-tag">
                <button class="location-btn" onclick="showStudentsByLocation('${loc}' )">${loc}</button>
                <button class="delete-location-btn" onclick="deleteLocation('${loc}')" title="刪除此地點">×</button>
              </span>
            `;
        });
        html += '</div>';
        html += '<div id="studentsList"></div>';
    }
    content.innerHTML = html;
}

// 載入系統配置內容
function loadConfigContent() {
    const content = document.getElementById('configContent');
    content.innerHTML = `
        <h2>系統配置</h2>
        <p>管理游泳地點、班級和時間段配置。</p>
        <button id="exportCloudBtn" style="padding:10px 20px;margin-bottom:20px;">導出雲端資料</button>
        <button id="createWaitBtn" style="padding:10px 20px;margin-bottom:20px;margin-left:10px;background:#27ae60;color:white;border:none;border-radius:5px;cursor:pointer;">創建待約</button>
        <button id="addStudentBtn" style="padding:10px 20px;margin-bottom:20px;margin-left:10px;background:#3498db;color:white;border:none;border-radius:5px;cursor:pointer;">添加學生</button>
        <button id="createFormBtn" style="padding:10px 20px;margin-bottom:20px;margin-left:10px;background:#8e44ad;color:white;border:none;border-radius:5px;cursor:pointer;">創建表單</button>
        <button id="exportExcelBtn" style="padding:10px 20px;margin-bottom:20px;margin-left:10px;background:#e67e22;color:white;border:none;border-radius:5px;cursor:pointer;">導出Excel</button>
        
        <!-- 導出路徑設置 -->
        <div style="margin:10px 0;display:flex;align-items:center;gap:10px;">
            <label style="font-weight:bold;color:#333;font-size:14px;">導出路徑:</label>
            <input type="text" id="configExportPath" placeholder="請選擇保存路徑" style="padding:8px;border:1px solid #ddd;border-radius:4px;width:300px;font-size:14px;" readonly>
            <button onclick="selectConfigExportPath()" style="padding:8px 12px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">選擇路徑</button>
        </div>
        
        <!-- 搜索功能 -->
        <div style="margin:20px 0;padding:15px;background:#f8f9fa;border-radius:8px;">
            <h3 style="margin-bottom:15px;color:#333;">搜索功能</h3>
            <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:5px;">
                    <label style="font-weight:bold;">姓名搜索:</label>
                    <input type="text" id="configNameSearch" placeholder="輸入學生姓名" style="padding:8px;border:1px solid #ddd;border-radius:4px;width:150px;">
                </div>
                <div style="display:flex;align-items:center;gap:5px;">
                    <label style="font-weight:bold;">地點搜索:</label>
                    <select id="configLocationSearch" style="padding:8px;border:1px solid #ddd;border-radius:4px;width:150px;">
                        <option value="">全部地點</option>
                    </select>
                </div>
                <div style="display:flex;align-items:center;gap:5px;">
                    <label style="font-weight:bold;">日期搜索:</label>
                    <input type="date" id="configDateSearch" style="padding:8px;border:1px solid #ddd;border-radius:4px;width:150px;">
                </div>
                <button onclick="resetConfigSearch()" style="padding:8px 16px;background:#95a5a6;color:white;border:none;border-radius:4px;cursor:pointer;">重置</button>
                <button onclick="generateTimetable()" style="padding:8px 16px;background:#e67e22;color:white;border:none;border-radius:4px;cursor:pointer;">生成課表</button>
                <button onclick="filterWaitStudents()" style="padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">查詢待約</button>
            </div>
        </div>
        
        <div id="cloudStudentsList"></div>
    `;
    document.getElementById('exportCloudBtn').onclick = loadCloudStudents;
    document.getElementById('createWaitBtn').onclick = showCreateWaitModal;
    document.getElementById('addStudentBtn').onclick = showAddStudentModal;
    document.getElementById('createFormBtn').onclick = function(){
        if (!window.__TAILWIND_FORM_HTML__) {
            alert('尚未載入表單模板');
            return;
        }
        showCreateFormModal();
    };
    document.getElementById('exportExcelBtn').onclick = exportCloudExcel;
    
    // 初始化搜索功能
    initializeConfigSearch();
    renderCloudStudentsTableFromCache();
}

// 新增：渲染雲端緩存資料
function renderCloudStudentsTableFromCache() {
    const grouped = window.cloudStudentsGrouped || [];
    
    // 將所有學生攤平成一個陣列
    let allStudents = [];
    (grouped || []).forEach(group => {
        (group.students || []).forEach(stu => {
            allStudents.push({...stu, "上課日期": group.date});
        });
    });
    
    // 按上課地點分組
    let locationGroups = {};
    allStudents.forEach(stu => {
        let location = stu.location || '未知地點'; // 如果沒有location欄位，使用預設值
        
        // 標準化地點名稱，移除表情符號和多餘空格
        let normalizedLocation = location
            .replace(/[🏊‍♂🏊♂]/g, '') // 移除游泳表情符號
            .replace(/\s+/g, ' ') // 將多個空格替換為單個空格
            .trim(); // 移除首尾空格
        
        if (!locationGroups[normalizedLocation]) {
            locationGroups[normalizedLocation] = [];
        }
        locationGroups[normalizedLocation].push(stu);
    });
    
    // 生成表格，按地點分類
    let html = '';
    Object.keys(locationGroups).sort().forEach(location => {
        let students = locationGroups[location];
        
        // 按日期分組
        let dateGroups = {};
        students.forEach(stu => {
            let date = stu["上課日期"];
            if (!dateGroups[date]) dateGroups[date] = [];
            dateGroups[date].push(stu);
        });
        
        // 為每個地點生成表格標題
        let totalStudentsInLocation = students.length;
        html += `<div style="margin-top:20px;"><b style="font-size: 16px; color: #333;">📍 ${location}</b> <span style="font-size: 12px; color: #999;">(共 ${totalStudentsInLocation} 名學生)</span></div>`;
        
        // 添加全選按鈕
        html += `<div style="margin:10px 0;">
            <input type="checkbox" id="selectAll_${location.replace(/\s+/g, '_')}" onchange="toggleSelectAllInLocation('${location}', this)" style="margin-right:8px;">
            <label for="selectAll_${location.replace(/\s+/g, '_')}" style="cursor:pointer;font-weight:bold;color:#3498db;">全選 ${location}</label>
        </div>`;
        
        // 按時間順序排序日期
        let sortedDates = sortCloudDatesByChronologicalOrder(Object.keys(dateGroups));
        sortedDates.forEach(date => {
            let dateStudents = dateGroups[date];
            html += `<div style="margin-top:10px;margin-left:20px;display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="selectAllDate_${location.replace(/\s+/g, '_')}_${date.replace(/[^a-zA-Z0-9]/g, '_')}" onchange="toggleSelectAllInDate('${location}', '${date}', this)" style="margin-right:8px;">
                <b style="color: #FF0000;">📅 ${date}</b> 
                <span style="font-size: 12px; color: #999;">(共 ${dateStudents.length} 名學生)</span>
            </div>`;
            html += '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">';
            html += '<tr style="background:#f5f5f5;"><th style="border:1px solid #ddd;padding:8px;">選擇</th><th style="border:1px solid #ddd;padding:8px;">姓名</th><th style="border:1px solid #ddd;padding:8px;">年齡</th><th style="border:1px solid #ddd;padding:8px;">電話號碼</th><th style="border:1px solid #ddd;padding:8px;">課程類型</th><th style="border:1px solid #ddd;padding:8px;">待約</th><th style="border:1px solid #ddd;padding:8px;">待約月份</th><th style="border:1px solid #ddd;padding:8px;">出席</th><th style="border:1px solid #ddd;padding:8px;">補/調堂</th><th style="border:1px solid #ddd;padding:8px;">補/調堂點數</th><th style="border:1px solid #ddd;padding:8px;">時間</th><th style="border:1px solid #ddd;padding:8px;">上課日期</th><th style="border:1px solid #ddd;padding:8px;">操作</th><th style="border:1px solid #ddd;padding:8px;">請假</th></tr>';
            
            dateStudents.forEach(stu => {
                // 解析時間格式
                let timeStart = '', timeEnd = '';
                if (stu.time) {
                    console.log(`解析時間: ${stu.time}`);
                    let timeParts = stu.time.split('-');
                    if (timeParts.length === 2) {
                        let startTime = timeParts[0].trim();
                        let endTime = timeParts[1].trim();
                        
                        // 處理開始時間 - 移除中文星期部分
                        startTime = startTime.replace(/星期[一二三四五六日]\s*/, '');
                        if (startTime.includes(':')) {
                            timeStart = startTime;
                        } else {
                            // 如果只有數字，假設是小時，補充分鐘
                            let startHour = parseInt(startTime);
                            if (!isNaN(startHour)) {
                                timeStart = `${String(startHour).padStart(2, '0')}:00`;
                            }
                        }
                        
                        // 處理結束時間 - 移除pm/am等後綴
                        endTime = endTime.replace(/[ap]m$/i, '');
                        if (endTime.includes(':')) {
                            timeEnd = endTime;
                        } else {
                            // 如果只有數字，假設是小時，補充分鐘
                            let endHour = parseInt(endTime);
                            if (!isNaN(endHour)) {
                                timeEnd = `${String(endHour).padStart(2, '0')}:00`;
                            }
                        }
                        
                        console.log(`解析結果: ${timeStart} - ${timeEnd}`);
                    }
                }
                
                // 解析日期格式
                let dateValue = '';
                if (stu['上課日期']) {
                    // 移除特殊字符（如🎈）並提取日期部分
                    let cleanDate = stu['上課日期'].replace(/🎈/g, '').trim();
                    let dateMatch = cleanDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                    if (dateMatch) {
                        dateValue = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[3]).padStart(2,'0')}`;
                    } else {
                        // 如果標準格式不匹配，嘗試其他格式
                        let alternativeMatch = cleanDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                        if (alternativeMatch) {
                            dateValue = `${alternativeMatch[1]}-${String(alternativeMatch[2]).padStart(2,'0')}-${String(alternativeMatch[3]).padStart(2,'0')}`;
                        } else {
                            // 如果都不匹配，直接使用原始值
                            dateValue = cleanDate;
                        }
                    }
                }
                
                // 讀取請假狀態
                let leaveMap = {};
                try { leaveMap = JSON.parse(localStorage.getItem('leaveStatusMap') || '{}'); } catch(e) {}
                const key = `${stu.name}|${stu.Phone_number||stu.phone||''}|${stu['上課日期']}`;
                const leaveOn = !!leaveMap[key];
                
                html += `<tr>
                    <td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.name || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'name')" style="width: 80px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.age || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'age')" style="width: 60px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.Phone_number || stu.phone || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'phone')" style="width: 100px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.type || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'type')" style="width: 120px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.待約 || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', '待約')" style="width: 80px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.待約月份 || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', '待約月份')" style="width: 80px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <select onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'option1')" style="width: 80px;">
                            <option value="">--</option>
                            <option value="1" ${stu.option1==="1"?"selected":""}>1</option>
                            <option value="1.5" ${stu.option1==="1.5"?"selected":""}>1.5</option>
                            <option value="2" ${stu.option1==="2"?"selected":""}>2</option>
                            <option value="2.5" ${stu.option1==="2.5"?"selected":""}>2.5</option>
                            <option value="3" ${stu.option1==="3"?"selected":""}>3</option>
                            <option value="缺席" ${stu.option1==="缺席"?"selected":""}>缺席</option>
                        </select>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <select onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'option2')" style="width: 100px;">
                            <option value="">--</option>
                            <option value="🌟0.5" ${stu.option2==="🌟0.5"?"selected":""}>🌟0.5</option>
                            <option value="🌟1" ${stu.option2==="🌟1"?"selected":""}>🌟1</option>
                            <option value="🌟1.5" ${stu.option2==="🌟1.5"?"selected":""}>🌟1.5</option>
                            <option value="🔁0.5" ${stu.option2==="🔁0.5"?"selected":""}>🔁0.5</option>
                            <option value="🔁1" ${stu.option2==="🔁1"?"selected":""}>🔁1</option>
                            <option value="🔁1.5" ${stu.option2==="🔁1.5"?"selected":""}>🔁1.5</option>
                          
                        </select>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="text" value="${stu.option3 || ''}" style="width: 60px; text-align: center;" readonly>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="number" min="0" max="23" value="${timeStart.includes(':') ? timeStart.split(':')[0] || '' : ''}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}')">:
                        <input type="number" min="0" max="59" value="${timeStart.includes(':') ? timeStart.split(':')[1] || '' : ''}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}')"> -
                        <input type="number" min="0" max="23" value="${timeEnd.includes(':') ? timeEnd.split(':')[0] || '' : ''}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}')">:
                        <input type="number" min="0" max="59" value="${timeEnd.includes(':') ? timeEnd.split(':')[1] || '' : ''}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}')">
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="date" value="${dateValue}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'date')" style="width:130px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;text-align:center;">
                        <button onclick="deleteCloudStudent('${stu.name || ''}', '${stu['上課日期'] || ''}')" style="padding:4px 10px;background:#e74c3c;color:white;border:none;border-radius:3px;">刪除</button>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;text-align:center;">
                        <button onclick="toggleLeaveForStudent('${stu.name || ''}', '${stu.Phone_number || stu.phone || ''}', '${stu['上課日期'] || ''}', '${stu.option3 || ''}', '${stu.option1 || ''}', '${stu.option2 || ''}', this)" style="padding:4px 10px;background:${leaveOn ? '#34495e' : '#e67e22'};color:white;border:none;border-radius:3px;">請假</button>
                    </td>
                </tr>`;
            });
            html += '</table>';
        });
    });
    
    document.getElementById('cloudStudentsList').innerHTML = html;
}

// 修改 loadCloudStudents 讓刷新後自動渲染
window.loadCloudStudents = async function() {
    try {
        const grouped = await ipcRenderer.invoke('fetch-students-from-cloud');
        window.cloudStudentsGrouped = grouped;
        renderCloudStudentsTableFromCache();
        
        // 自動更新地點選項
        updateLocationOptions();
        
        return grouped;
    } catch (error) {
        console.error('載入雲端資料失敗:', error);
        throw error;
    }
};



window.searchCloudStudents = function() {
    let nameKey = document.getElementById('cloudSearchName').value.trim();
    ipcRenderer.invoke('fetch-students-from-cloud').then(grouped => {
        if (nameKey) {
            grouped = grouped.map(group => ({
                date: group.date,
                students: group.students.filter(stu => stu.name.includes(nameKey))
            })).filter(group => group.students.length > 0);
        }
        renderCloudStudentsPage(grouped);
    });
};
window.resetCloudSearch = function() {
    document.getElementById('cloudSearchName').value = '';
    window.loadCloudStudents();
};

// 載入文檔編輯內容
function loadDocumentsContent() {
    // 文檔編輯器已經在 HTML 中定義
}

// 文檔編輯功能
function newDocument() {
    document.getElementById('documentEditor').value = '';
    currentDocument = null;
    alert('新建文檔已準備就緒');
}

async function openDocument() {
    try {
        const result = await ipcRenderer.invoke('open-file');
        if (result) {
            document.getElementById('documentEditor').value = result.content;
            currentDocument = result.filePath;
            alert('文檔已打開');
        }
    } catch (error) {
        alert('打開文檔失敗: ' + error.message);
    }
}

async function saveDocument() {
    const content = document.getElementById('documentEditor').value;
    
    if (currentDocument) {
        // 保存到當前文件
        try {
            const result = await ipcRenderer.invoke('save-file', {
                filePath: currentDocument,
                content: content
            });
            
            if (result.success) {
                alert('文檔已保存');
            } else {
                alert('保存失敗: ' + result.error);
            }
        } catch (error) {
            alert('保存文檔失敗: ' + error.message);
        }
    } else {
        // 顯示保存對話框
        try {
            const result = await ipcRenderer.invoke('save-file-dialog', content);
            if (result.success) {
                currentDocument = result.filePath;
                alert('文檔已保存到: ' + result.filePath);
            }
        } catch (error) {
            alert('保存文檔失敗: ' + error.message);
        }
    }
}

// 出席記錄功能
function searchAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const location = document.getElementById('attendanceLocation').value;
    const className = document.getElementById('attendanceClass').value;
    const timeSlot = document.getElementById('attendanceTimeSlot').value;
    
    if (!date || !location || !className || !timeSlot) {
        alert('請填寫所有查詢條件');
        return;
    }
    
    // 模擬查詢結果
    const results = document.getElementById('attendanceResults');
    results.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
            <h3 style="margin-bottom: 10px;">查詢結果</h3>
            <p><strong>日期:</strong> ${date}</p>
            <p><strong>地點:</strong> ${location}</p>
            <p><strong>班級:</strong> ${className}</p>
            <p><strong>時間段:</strong> ${timeSlot}</p>
            <p><strong>出席學生:</strong> 5人</p>
            <p><strong>缺席學生:</strong> 2人</p>
            <p><strong>請假學生:</strong> 1人</p>
        </div>
    `;
}

function exportAttendance() {
    alert('出席記錄已匯出為Excel文件');
}

// 初始化應用程式
function initializeApp() {
    // 設置默認日期為今天
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        dateInput.value = today;
    }
}

window.showChangeUnlockModal = function() {
    document.getElementById('changeUnlockModal').style.display = 'flex';
    document.getElementById('absolutePassword').value = '';
    document.getElementById('newUnlockCode').value = '';
    document.getElementById('changeUnlockError').textContent = '';
}

window.hideChangeUnlockModal = function() {
    document.getElementById('changeUnlockModal').style.display = 'none';
}

function changeUnlockCode() {
    const absPwd = document.getElementById('absolutePassword').value;
    const newCode = document.getElementById('newUnlockCode').value;
    const errorDiv = document.getElementById('changeUnlockError');
    if (absPwd !== ABSOLUTE_PASSWORD) {
        errorDiv.textContent = '絕對密碼錯誤';
        return;
    }
    if (!newCode || newCode.length < 2) {
        errorDiv.textContent = '新解鎖碼不能為空且至少2位';
        return;
    }
    
    // 安全地保存解鎖碼
    try {
        if (typeof localStorage !== 'undefined') {
    localStorage.setItem(UNLOCK_CODE_KEY, newCode);
        }
        currentUnlockCode = newCode;
    errorDiv.textContent = '';
    hideChangeUnlockModal();
    alert('解鎖碼已成功修改！');
    } catch (error) {
        console.error('保存解鎖碼失敗:', error);
        errorDiv.textContent = '保存失敗，但解鎖碼已暫時更新';
        currentUnlockCode = newCode;
        hideChangeUnlockModal();
    }
}

// 鍵盤事件處理
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') {
        login();
    }
});

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    // 設置默認標籤頁
    switchTab('attendance');
}); 

// 多格式上課日期解析函數
function parseCourseDates(dateLines) {
    // 合併所有行
    let text = dateLines.join(' ');
    // 去除所有非數字、非「月」、「/」、「,」、「、」、「-」、「日」、「空格」的符號
    text = text.replace(/[^0-9月/、,\-日\s]/g, '');
    let results = [];
    let yearList = [];
    // 支持多種分隔符
    let parts = text.split(/[、,\s]+/).filter(Boolean);
    let currentMonth = null;
    const now = new Date();
    let baseYear = now.getMonth() + 1 > 6 ? now.getFullYear() : now.getFullYear() - 1;
    parts.forEach(part => {
        // 1. X月Y日
        let m1 = part.match(/^([0-9]{1,2})月([0-9]{1,2})日?$/);
        if (m1) {
            const month = parseInt(m1[1], 10);
            const day = parseInt(m1[2], 10);
            let year = month < 6 ? baseYear + 1 : baseYear;
            results.push(`${month}月${day}日`);
            yearList.push(year);
            currentMonth = month;
            return;
        }
        // 2. X月Y/Z/...
        let m2 = part.match(/^([0-9]{1,2})月([0-9/]+)$/);
        if (m2) {
            const month = parseInt(m2[1], 10);
            let year = month < 6 ? baseYear + 1 : baseYear;
            m2[2].split('/').forEach(day => {
                day = day.replace(/[^0-9]/g, '');
                if(day) {
                    results.push(`${month}月${parseInt(day,10)}日`);
                    yearList.push(year);
                }
            });
            currentMonth = month;
            return;
        }
        // 3. X/Y  或 /Y 片段（如7/13、/13）
        let m3 = part.match(/^([0-9]{1,2})?\/?([0-9]{1,2})$/);
        if (m3 && currentMonth) {
            // m3[1] 可能是月，也可能是空
            const month = m3[1] ? parseInt(m3[1], 10) : currentMonth;
            const day = parseInt(m3[2], 10);
            let year = month < 6 ? baseYear + 1 : baseYear;
            results.push(`${month}月${day}日`);
            yearList.push(year);
            currentMonth = month;
            return;
        }
        // 4. 只有數字，補全月
        let m4 = part.match(/^([0-9]{1,2})$/);
        if (m4 && currentMonth) {
            const day = parseInt(m4[1], 10);
            let year = currentMonth < 6 ? baseYear + 1 : baseYear;
            results.push(`${currentMonth}月${day}日`);
            yearList.push(year);
            return;
        }
        // 5. X月（只標月，無日，跳過）
        let m5 = part.match(/^([0-9]{1,2})月$/);
        if (m5) {
            currentMonth = parseInt(m5[1], 10);
            return;
        }
        // 6. X月Y-Z月W（區間）
        let m6 = part.match(/^([0-9]{1,2})月([0-9]{1,2})-([0-9]{1,2})月([0-9]{1,2})$/);
        if (m6) {
            let mStart = parseInt(m6[1], 10), dStart = parseInt(m6[2], 10);
            let mEnd = parseInt(m6[3], 10), dEnd = parseInt(m6[4], 10);
            let yStart = mStart < 6 ? baseYear + 1 : baseYear;
            let yEnd = mEnd < 6 ? baseYear + 1 : baseYear;
            let curMonth = mStart, curDay = dStart, curYear = yStart;
            while (curYear < yEnd || (curYear === yEnd && (curMonth < mEnd || (curMonth === mEnd && curDay <= dEnd)))) {
                results.push(`${curMonth}月${curDay}日`);
                yearList.push(curYear);
                // 下一天
                curDay++;
                let daysInMonth = new Date(curYear, curMonth, 0).getDate();
                if (curDay > daysInMonth) {
                    curDay = 1;
                    curMonth++;
                    if (curMonth > 12) {
                        curMonth = 1;
                        curYear++;
                    }
                }
            }
            return;
        }
    });
    // 去重
    results = [...new Set(results)];
    yearList = [...new Set(yearList)];
    return {dates: results, years: yearList};
}

function extractStudentInfo() {
    let extractButton = null;
    let originalText = '';
    const text = document.getElementById('documentEditor').value;
    if (!text.trim()) {
        alert('請輸入文檔內容');
        return;
    }
    try {
        extractButton = document.querySelector('button[onclick="extractStudentInfo()"]');
        originalText = extractButton.textContent;
        extractButton.textContent = '提取';
        extractButton.disabled = false;
        
        console.log('開始提取學生資料...');
        console.log('文檔內容:', text);
        
        const lines = text.split(/\n|\r/);
        const students = [];
        let currentStudentBase = {};
        let i = 0;
        while (i < lines.length) {
            let line = lines[i].trim();
            if (!line) { i++; continue; }
            // 學員姓名
            if (/^\d*\.?\s*(學員姓名|姓名|學生姓名)[:：]?\s*(.+)$/.test(line)) {
                console.log('找到學員姓名:', line);
                if (Object.keys(currentStudentBase).length > 0 && currentStudentBase.name) {
                    // 若有殘留未提取的時間/日期，忽略
                }
                currentStudentBase = { name: line.replace(/^\d*\.?\s*(學員姓名|姓名|學生姓名)[:：]?\s*/, '').trim() };
                console.log('設置學生基礎資料:', currentStudentBase);
                i++;
                continue;
            }
            // 學員年齡
            if (/^\d*\.?\s*(學員年齡|年齡)[:：]?\s*(.+)$/.test(line)) {
                currentStudentBase.age = line.replace(/^\d*\.?\s*(學員年齡|年齡)[:：]?\s*/, '').trim();
                i++;
                continue;
            }
            // 電話號碼
            if (/^\d*\.?\s*(電話號碼|學員電話)[:：]?\s*(.+)$/.test(line)) {
                currentStudentBase.phone = line.replace(/^\d*\.?\s*(電話號碼|學員電話)[:：]?\s*/, '').replace(/[:：]/g, '').trim();
                i++;
                continue;
            }
            // 上課地點
            if (/^\d*\.?\s*(上課地點|地點|游泳地點)[:：]?\s*(.+)$/.test(line)) {
                currentStudentBase.location = line.replace(/^\d*\.?\s*(上課地點|地點|游泳地點)[:：]?\s*/, '').trim();
                i++;
                continue;
            }
            // 課程類型
            if (/^\d*\.?\s*(報課課程|課程類型|課程|報讀課程)[:：]?\s*(.+)$/.test(line)) {
                currentStudentBase.type = line.replace(/^\d*\.?\s*(報課課程|課程類型|課程|報讀課程)[:：]?\s*/, '').trim();
                i++;
                continue;
            }
            // 上課日期/上課時間/報名日期組合（多組）
            if (/^\d*\.?\s*(上課日期|日期)[:：]?\s*(.+)$/.test(line)) {
                let weekday = line.replace(/^\d*\.?\s*(上課日期|日期)[:：]?\s*/, '').trim();
                console.log('找到上課日期:', line, '星期:', weekday);
                // 查找下一行是否為上課時間
                let j = i + 1;
                let foundTime = false;
                let time = '';
                let dateArr = [];
                while (j < lines.length) {
                    let nextLine = lines[j].trim();
                    if (!nextLine) { j++; continue; }
                    // 上課時間
                    if (/^\d*\.?\s*(上課時間|時間)[:：]?\s*(.+)$/.test(nextLine)) {
                        time = nextLine.replace(/^\d*\.?\s*(上課時間|時間)[:：]?\s*/, '').trim();
                        console.log('找到上課時間:', nextLine, '時間:', time);
                        foundTime = true;
                        j++;
                        // 繼續查找報名日期
                        while (j < lines.length) {
                            let dateLine = lines[j].trim();
                            if (!dateLine) { j++; continue; }
                            // 報名日期
                            if (/^\d*\.?\s*(報名日期|日期)[:：]?\s*(.+)$/.test(dateLine)) {
                                let dateStr = dateLine.replace(/^\d*\.?\s*(報名日期|日期)[:：]?\s*/, '').trim();
                                dateArr = dateStr.split(/[、,，]/).map(d => d.trim()).filter(Boolean);
                                console.log('找到報名日期:', dateLine, '日期數組:', dateArr);
                                j++;
                                break;
                            }
                            // 如果遇到下一個區塊，則結束
                            if (/^\d*\.?\s*(學員姓名|學員年齡|上課地點|報課課程|課程類型|師生比例|課堂收費|上課時間|上課日期|報名)[:：]?/.test(dateLine)) break;
                            j++;
                        }
                        break;
                    }
                    // 如果遇到下一個區塊，則結束
                    if (/^\d*\.?\s*(學員姓名|學員年齡|上課地點|報課課程|課程類型|師生比例|課堂收費|上課時間|上課日期|報名)[:：]?/.test(nextLine)) break;
                    j++;
                }
                // 若找到時間和日期，生成一組學生資料
                if (foundTime && dateArr.length > 0) {
                    const studentData = { 
                        ...currentStudentBase, 
                        time, 
                        weekday, 
                        dates: dateArr.join('、'), 
                        datesArr: dateArr
                    };
                    
                    // 新增：檢查下一行是否為"10.待約課堂"
                    let wait = '';
                    let waitMonth = '';
                    let lookahead = j;
                    if (
                        lookahead < lines.length &&
                        /^\d*\.?\s*10\.?\s*待約課堂[:：]?/.test(lines[lookahead].trim())
                    ) {
                        // 進一步檢查該行是否有"X堂"
                        let nextLine = lines[lookahead] ? lines[lookahead].trim() : '';
                        let match = nextLine.match(/(\d{1,2}-\d{1,2}月).*?(\d+)堂/);
                        if (match) {
                            waitMonth = match[1];  // 提取月份格式
                            wait = match[2];       // 提取堂數
                            j = lookahead + 1;     // 跳過這一行
                        } else {
                            // 只匹配堂數（如果沒有月份格式）
                            let match2 = nextLine.match(/(\d+)堂/);
                            if (match2) {
                                wait = match2[1];
                                j = lookahead + 1;
                            }
                        }
                    }
                    
                    studentData.wait = wait;
                    studentData.waitMonth = waitMonth;
                    students.push(studentData);
                } else {
                    console.log('未找到完整的上課時間和日期組合');
                }
                i = j;
                continue;
            }
            i++;
        }
        console.log('提取完成，共找到', students.length, '組學生資料');
        // 更新表格
        const table = document.getElementById('extractedTable');
        const tbody = document.getElementById('extractedTableBody');
        if (students.length > 0) {
            table.style.display = '';
            students.forEach((stu, idx) => {
                const tr = document.createElement('tr');
                const datesArr = stu.datesArr || (stu.dates ? stu.dates.split('、') : []);
                tr.innerHTML = `
                    <td style='border:1px solid #ddd;padding:8px;'><input type='checkbox' class='student-row-checkbox'></td>
                    <td style='border:1px solid #ddd;padding:8px;'>${tbody.children.length + 1}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${stu.name || ''}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${stu.phone || ''}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${stu.age || ''}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${stu.location || ''}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${stu.type || ''}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${stu.weekday ? stu.weekday + ' ' : ''}${stu.time || ''}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${datesArr.join('、')}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${stu.wait || ''}</td>
                    <td style='border:1px solid #ddd;padding:8px;'>${stu.waitMonth || ''}</td>
                    <td style='border:1px solid #ddd;padding:8px;'><button onclick='deleteStudentRow(this)' style='color:#e74c3c;background:none;border:none;cursor:pointer;'>刪除</button></td>
                `;
                tbody.appendChild(tr);
            });
            alert(`成功提取了 ${students.length} 組上課時間/日期的學生資料`);
        } else {
            table.style.display = 'none';
            alert(`未找到學生資料`);
        }
    } catch (error) {
        console.error('学生信息提取错误:', error);
        alert('提取失敗：' + error.message);
    } finally {
        if (extractButton) {
            extractButton.textContent = originalText;
            extractButton.disabled = false;
        }
    }
}

function showDatesModal(datesArr) {
    const modal = document.getElementById('datesModal');
    const content = document.getElementById('datesModalContent');
    if (datesArr && datesArr.length > 0) {
        content.innerHTML = datesArr.map(d => `<div>${d}</div>`).join('');
    } else {
        content.innerHTML = '<div>無日期資料</div>';
    }
    modal.style.display = 'flex';
}
function hideDatesModal() {
    document.getElementById('datesModal').style.display = 'none';
} 



// 處理時間格式的輔助函數
function processTimeForExcel(timeStr) {
    if (!timeStr) return '';
    // 處理時間範圍格式（如 "12:10-1:50 pm"）
    let rangeMatch = timeStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (rangeMatch) {
        let startHour = parseInt(rangeMatch[1], 10);
        let startMin = rangeMatch[2];
        let endHour = parseInt(rangeMatch[3], 10);
        let endMin = rangeMatch[4];
        let period = rangeMatch[5].toLowerCase();
        // 新增：若開始時間12:xx，結束時間ab:xx，ab<12或ab=12，且pm，直接返回原始
        if (startHour === 12 && period === 'pm' && (endHour < 12 || endHour === 12)) {
            return timeStr;
        }
        // 其餘維持原有邏輯
        if (period === 'pm' && startHour !== 12) startHour += 12;
        if (period === 'pm' && endHour !== 12) endHour += 12;
        let formattedStart = `${startHour}:${startMin}`;
        let formattedEnd = `${endHour}:${endMin}`;
                return `${formattedStart}-${formattedEnd}`;
            }
    // 單一時間點
    let match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!match) return timeStr;
    let hour = parseInt(match[1], 10);
    let min = match[2];
    let period = match[3].toLowerCase();
    if (period === 'pm' && hour !== 12) {
        hour += 12;
    }
    if (period === 'pm' && parseInt(match[1], 10) === 12) {
        return `12:${min} pm`;
    }
    if (period === 'pm') {
        return `${hour}:${min}`;
    }
    return `${match[1]}:${min} ${period}`;
}

// 時間比較函數
function compareTimes(timeA, timeB) {
    // 解析時間
    const parseTime = (timeStr) => {
        if (!timeStr) return { totalMinutes: 0, isAM: false, isPM: false };
        
        const cleanTime = timeStr.toLowerCase().replace(/\s/g, '');
        const hasAM = cleanTime.includes('am');
        const hasPM = cleanTime.includes('pm');
        
        // 處理時間範圍格式（如 "1:10-1:50 pm"）
        if (cleanTime.includes('-')) {
            const parts = cleanTime.split('-');
            if (parts.length === 2) {
                const startTime = parts[0].replace(/am|pm/g, '');
                const [startHours, startMinutes] = startTime.split(':').map(Number);
                
                if (!isNaN(startHours) && !isNaN(startMinutes)) {
                    let startHour24 = startHours;
                    if (hasPM && startHours !== 12) {
                        startHour24 = startHours + 12;
                    } else if (hasAM && startHours === 12) {
                        startHour24 = 0;
                    }
                    
                    return {
                        totalMinutes: startHour24 * 60 + startMinutes,
                        isAM: hasAM,
                        isPM: hasPM
                    };
                }
            }
        }
        
        // 處理單個時間點格式
        const timeOnly = cleanTime.replace(/am|pm/g, '');
        const [hours, minutes] = timeOnly.split(':').map(Number);
        
        if (isNaN(hours) || isNaN(minutes)) {
            return { totalMinutes: 0, isAM: false, isPM: false };
        }
        
        let hour24 = hours;
        if (hasPM && hours !== 12) {
            hour24 = hours + 12;
        } else if (hasAM && hours === 12) {
            hour24 = 0;
        }
        
        return {
            totalMinutes: hour24 * 60 + minutes,
            isAM: hasAM,
            isPM: hasPM
        };
    };
    
    const timeA_parsed = parseTime(timeA);
    const timeB_parsed = parseTime(timeB);
    
    // AM 優先於 PM
    if (timeA_parsed.isAM && timeB_parsed.isPM) {
        return -1;
    } else if (timeA_parsed.isPM && timeB_parsed.isAM) {
        return 1;
    }
    
    // 如果都是 AM 或都是 PM，按時間先後排序
    return timeA_parsed.totalMinutes - timeB_parsed.totalMinutes;
} 

function formatDocumentText() {
    let originalText = '';
    const text = document.getElementById('documentEditor').value;
    if (!text.trim()) {
        alert('請輸入文檔內容');
        return;
    }
    let formatButton = null;
    try {
        formatButton = document.querySelector('button[onclick="formatDocumentText()"]');
        originalText = formatButton.textContent;
        formatButton.textContent = '整理';
        formatButton.disabled = false;
        const lines = text.split(/\n|\r/);
        let outputLines = [];
        let i = 0;
        while (i < lines.length) {
            let line = lines[i].trim();
            if (!line) {
                outputLines.push('');
                i++;
                continue;
            }
            // 處理多組"上課時間/報名"區塊
            if (/^\d*\.?\s*(上課時間|時間)[:：]?/.test(line)) {
                // 1. 收集上課時間
                let timeLine = line;
                let timeContent = timeLine.replace(/^\d*\.?\s*(上課時間|時間)[:：]?\s*/, '');
                outputLines.push(timeLine); // 先插入時間行
                // 2. 查找後續的報名區塊
                let j = i + 1;
                let foundBaoming = false;
                while (j < lines.length) {
                    let nextLine = lines[j].trim();
                    if (!nextLine) { j++; continue; }
                    // 報名區塊
                    if (/^\d*\.?\s*(報名)[:：]?/.test(nextLine)) {
                        foundBaoming = true;
                        let baomingContent = nextLine.replace(/^\d*\.?\s*(報名)[:：]?\s*/, '');
                        let additionalDates = [];
                        let k = j + 1;
                        while (k < lines.length) {
                            let dateLine = lines[k].trim();
                            if (!dateLine) { k++; continue; }
                            // 如果遇到下一個時間/上課日期/姓名等區塊，則結束
                            if (/^\d*\.?\s*(學員姓名|學員年齡|上課地點|報課課程|課程類型|師生比例|課堂收費|上課時間|上課日期|報名|待約課堂)[:：]?/.test(dateLine)) break;
                            additionalDates.push(dateLine);
                            k++;
                        }
                        let allDateContent = [baomingContent, ...additionalDates].filter(Boolean);
                        // 展開如"7月 13/20/27 8月 3/10/17/24"格式，保留🎈符號
                        let expandedDates = [];
                        allDateContent.forEach(block => {
                            let monthBlockRegex = /([0-9]{1,2})月[ ]*([0-9\/🎈🎁🌟⭐★☆ ]+)/g;
                            let match;
                            while ((match = monthBlockRegex.exec(block)) !== null) {
                                let month = parseInt(match[1], 10);
                                let daysPart = match[2];
                                let daysWithSymbol = daysPart.split('/').map(s => s.trim()).filter(Boolean);
                                daysWithSymbol.forEach(ds => {
                                    let mds = ds.match(/^([0-9]{1,2})([🎈🎁🌟⭐★☆]*)$/);
                                    if (mds) {
                                        expandedDates.push(`${month}月${parseInt(mds[1],10)}日${mds[2]||''}`);
                                    }
                                });
                            }
                            // 若無月分塊，回退到舊的處理方式
                            if (expandedDates.length === 0) {
                                // 舊處理：如 7/22/29
                                let text = block.replace(/[　]+/g, ' ');
                                let parts = text.split(/[、,，\s]+/).filter(Boolean);
                                let currentMonth = null;
                                parts.forEach(part => {
                                    let mMonth = part.match(/^([0-9]{1,2})月$/);
                                    if (mMonth) {
                                        currentMonth = parseInt(mMonth[1], 10);
                                        return;
                                    }
                                    let mDay = part.match(/^([0-9]{1,2})([🎈🎁🌟⭐★☆]*)$/);
                                    if (mDay && currentMonth) {
                                        expandedDates.push(`${currentMonth}月${parseInt(mDay[1],10)}日${mDay[2]||''}`);
                                    }
                                });
                            }
                        });
                        // 去重
                        expandedDates = [...new Set(expandedDates)];
                        if (expandedDates.length > 0) {
                            outputLines.push(`9.報名日期：${expandedDates.join(',')}`);
                        }
                        i = k - 1;
                        break;
                    }
                    // 如果遇到下一個時間/上課日期/姓名等區塊，則結束
                    if (/^\d*\.?\s*(學員姓名|學員年齡|上課地點|報課課程|課程類型|師生比例|課堂收費|上課時間|上課日期|待約課堂)[:：]?/.test(nextLine)) {
                        break;
                    }
                    j++;
                }
                if (!foundBaoming) {
                    // 沒有報名區塊，原樣保留
                }
                i++;
                continue;
            }
            // 跳過原有的"報名"區塊
            if (/^\d*\.?\s*(報名)[:：]?/.test(line)) {
                // 跳過報名及其下方的日期行，直到遇到下一個區塊
                let j = i + 1;
                while (j < lines.length) {
                    let nextLine = lines[j].trim();
                    if (!nextLine) { j++; continue; }
                    if (/^\d*\.?\s*(學員姓名|學員年齡|上課地點|報課課程|課程類型|師生比例|課堂收費|上課時間|上課日期|報名|待約課堂)[:：]?/.test(nextLine)) break;
                    j++;
                }
                i = j;
                continue;
            }
            if (/^10\.?\s*待約課堂[:：]?/.test(line)) {
                let j = i + 1;
                let found = false;
                let count = '';
                let period = '';
                while (j < lines.length) {
                    let nextLine = lines[j].trim();
                    if (!nextLine) { j++; continue; }
                    // 匹配包含月份信息的待約格式，如 "7-8月 待約2堂"
                    let match = nextLine.match(/([0-9-]+月)\s*待約(\d+)堂/);
                    if (match) {
                        period = match[1];
                        count = match[2];
                        found = true;
                        j++; // 跳過這一行，避免重複輸出
                        break;
                    }
                    // 也匹配純粹的待約格式，如 "待約2堂"
                    let simpleMatch = nextLine.match(/待約(\d+)堂/);
                    if (simpleMatch) {
                        count = simpleMatch[1];
                        found = true;
                        j++; // 跳過這一行，避免重複輸出
                        break;
                    }
                    if (/^\d+\.?\s*[^\d]/.test(nextLine)) break;
                    j++;
                }
                if (found) {
                    if (period) {
                        outputLines.push(`10.待約課堂: ${period} ${count}堂`);
                    } else {
                        outputLines.push(`10.待約課堂: ${count}堂`);
                    }
                } else {
                    outputLines.push(line);
                }
                i = j;
                continue;
            }
            // 其他行原樣保留
            outputLines.push(line);
            i++;
        }
        const formattedText = outputLines.join('\n');
        document.getElementById('documentEditor').value = formattedText;
        alert('整理完成！已將所有日期標準化為"X月Y日"格式，並將每組上課時間與報名配對展開');
    } catch (error) {
        console.error('文檔整理錯誤:', error);
        alert('整理失敗：' + error.message);
    } finally {
        if (formatButton) {
            formatButton.textContent = originalText;
            formatButton.disabled = false;
        }
    }
}

// 在文件末尾添加刪除行的函數
function deleteStudentRow(btn) {
    const tr = btn.closest('tr');
    if (tr) tr.remove();
} 

// 在文件末尾添加批量刪除函數和全選函數：
function deleteSelectedStudentRows() {
    const checkboxes = document.querySelectorAll('.student-row-checkbox:checked');
    checkboxes.forEach(cb => {
        const tr = cb.closest('tr');
        if (tr) tr.remove();
    });
}
function toggleSelectAllStudentRows(checkbox) {
    const all = document.querySelectorAll('.student-row-checkbox');
    all.forEach(cb => { cb.checked = checkbox.checked; });
} 

// 新增一個標準化日期的工具函數
function standardizeDates(dateLines) {
    let results = [];
    // 逐行匹配每一行的月塊
    dateLines.forEach(line => {
        let monthBlockRegex = /([0-9]{1,2})月[ ]*([0-9\/🎈🎁🌟⭐★☆ ]+)/g;
        let match;
        while ((match = monthBlockRegex.exec(line)) !== null) {
            let month = parseInt(match[1], 10);
            let daysPart = match[2];
            let daysWithSymbol = daysPart.split('/').map(s => s.trim()).filter(Boolean);
            daysWithSymbol.forEach(ds => {
                let mds = ds.match(/^([0-9]{1,2})([🎈🎁🌟⭐★☆]*)$/);
                if (mds) {
                    results.push(`${month}月${parseInt(mds[1],10)}日${mds[2]||''}`);
                }
            });
        }
    });
    // 若沒有月分塊，或結果為空，回退到舊的處理方式
    if (results.length === 0) {
        let text = dateLines.join(' ').replace(/[　]+/g, ' ');
        let parts = text.split(/[、,，\s]+/).filter(Boolean);
    let currentMonth = null;
    parts.forEach(part => {
        let mMonth = part.match(/^([0-9]{1,2})月$/);
        if (mMonth) {
            currentMonth = parseInt(mMonth[1], 10);
            return;
        }
            let mDay = part.match(/^([0-9]{1,2})([🎈🎁🌟⭐★☆]*)$/);
            if (mDay && currentMonth) {
                results.push(`${currentMonth}月${parseInt(mDay[1],10)}日${mDay[2]||''}`);
            }
        });
    }
    // 去重
    results = [...new Set(results)];
    return results;
} 

function getWeekday(dateStr) {
    // dateStr 格式為 '2025/7/15' 或 '2025-07-15'
    let date = new Date(dateStr.replace(/-/g, '/'));
    const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    return weekdays[date.getDay()];
}

function generateDateRange(start, end) {
    const result = [];
    let cur = new Date(start);
    end = new Date(end);
    while (cur <= end) {
        result.push(`${cur.getMonth()+1}月${cur.getDate()}日`);
        cur.setDate(cur.getDate() + 1);
    }
    return result;
}

// 將中文日期格式轉換為標準格式
window.convertChineseDateToStandard = function(chineseDate) {
    // 移除特殊字符（如🎈🎁）
    let cleanDate = chineseDate.replace(/[🎈🎁]/g, '').trim();
    
    // 匹配格式：X月X日
    let match = cleanDate.match(/^(\d{1,2})月(\d{1,2})日$/);
    if (match) {
        let month = parseInt(match[1]);
        let day = parseInt(match[2]);
        let year = new Date().getFullYear(); // 使用當前年份
        
        // 格式化為YYYY-MM-DD
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    // 匹配格式：YYYY年X月X日
    let match2 = cleanDate.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (match2) {
        let year = parseInt(match2[1]);
        let month = parseInt(match2[2]);
        let day = parseInt(match2[3]);
        
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    // 如果已經是標準格式，直接返回
    if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        return cleanDate;
    }
    
    // 如果無法解析，返回原始值
    console.warn('無法解析日期格式:', chineseDate);
    return chineseDate;
}



async function saveSelectedStudents() {
    const tbody = document.getElementById('extractedTableBody');
    if (!tbody) return;
    
    let selected = [];
    for (let i = 0; i < tbody.children.length; i++) {
        const tr = tbody.children[i];
        const checkbox = tr.querySelector('.studentRowCheckbox, .student-row-checkbox');
        if (checkbox && checkbox.checked) {
            let cells = tr.children;
            let time = cells[7].textContent.trim();
            let dates = cells[8].textContent.trim();
            
            // 計算選項3的值
            let option3 = '';
            let courseType = cells[6].textContent.trim(); // 獲取課程類型
            if (dates) {
                // 將日期分割並使用第一個日期計算選項3
                let dateArray = dates.split('、').map(d => d.trim()).filter(Boolean);
                if (dateArray.length > 0) {
                    option3 = calculateOption3FromTimeDifference(time, dateArray[0], courseType);
                }
            }
            
            selected.push({
                name: cells[2].textContent.trim(),
                phone: cells[3].textContent.trim().replace(/[:：]/g, ''),
                age: cells[4].textContent.trim(),
                location: cells[5].textContent.trim(),
                type: cells[6].textContent.trim(),
                time: time,
                dates: dates,
                datesArr: dates.split('、').map(d => d.trim()).filter(Boolean), // 添加datesArr
                waitMonth: cells[10].textContent.trim(),
                wait: cells[9].textContent.trim(),
                year: cells[11].textContent.trim(),
                option3: option3
            });
        }
    }
    
    if (selected.length === 0) {
        alert('請至少勾選一位學生');
        return;
    }
    
    try {
        console.log('準備保存到雲端資料庫的學生資料:', selected);
        
        // 按地點分組學生資料
        let locationGroups = {};
        selected.forEach(stu => {
            if (!locationGroups[stu.location]) {
                locationGroups[stu.location] = [];
            }
            locationGroups[stu.location].push(stu);
        });
        
        // 為每個地點的學生資料按日期分組並保存到雲端
        let totalSaved = 0;
        let totalSkipped = 0;
        
        for (const [location, students] of Object.entries(locationGroups)) {
            console.log(`處理地點: ${location}, 學生數量: ${students.length}`);
            
            // 按日期分組學生資料
            let dateGroups = {};
            students.forEach(stu => {
                // 將日期字符串分割成數組
                let dateArray = stu.dates.split('、').map(d => d.trim()).filter(Boolean);
                
                dateArray.forEach(date => {
                    // 將中文日期格式轉換為標準格式
                    let standardDate = convertChineseDateToStandard(date);
                    
                    if (!dateGroups[standardDate]) {
                        dateGroups[standardDate] = [];
                    }
                    
                    // 🎈/🌟 檢查該日期是否包含特殊標記
                    let studentName = stu.name;
                    let hasBalloonMark = false;
                    let hasStarMark = false;
                    let remark = '';
                    
                    // 檢查原始日期數組中是否包含🎈或🌟
                    console.log(`🔍 檢查學生 ${stu.name} 的日期: ${date}, 標準格式: ${standardDate}`);
                    console.log(`📋 原始日期數組:`, stu.datesArr);
                    
                    if (stu.datesArr && stu.datesArr.length > 0) {
                        // 找到對應的原始日期（可能包含標記）
                        let matchingOriginalDate = null;
                        stu.datesArr.forEach(originalDate => {
                            console.log(`🔍 檢查原始日期: ${originalDate}`);
                            // 將中文日期轉換為標準格式進行比較（移除標記後比對）
                            let originalStandardDate = convertChineseDateToStandard(originalDate.replace('🎈', '').replace('🌟',''));
                            console.log(`📅 原始日期標準格式: ${originalStandardDate}, 當前日期: ${standardDate}`);
                            if (originalStandardDate === standardDate) {
                                matchingOriginalDate = originalDate;
                                console.log(`✅ 找到匹配的原始日期: ${originalDate}`);
                            }
                        });
                        
                        // 依標記設置布林
                        if (matchingOriginalDate) {
                            if (matchingOriginalDate.includes('🎈')) {
                                hasBalloonMark = true;
                                remark = '🎈標記學生';
                                console.log(`🎈 檢測到日期 ${standardDate} 包含🎈標記，學生 ${stu.name} 設置 hasBalloonMark=true`);
                            }
                            const starRegex = /[\u2B50\u2605\u2606\uD83C\uDF1F]/; // ⭐ ★ ☆ 🌟
                            if (starRegex.test(matchingOriginalDate)) {
                                hasStarMark = true;
                                remark = remark ? `${remark}、🌟重點學生` : '🌟重點學生';
                                console.log(`🌟 檢測到日期 ${standardDate} 含星號標記，學生 ${stu.name} 設置 hasStarMark=true`);
                            }
                            // 姓名保持原樣，不內嵌任何符號
                            studentName = stu.name;
                        } else {
                            console.log(`📅 日期 ${standardDate} 未檢出🎈/🌟標記，學生 ${stu.name} 保持原樣`);
                        }
                    } else {
                        console.log(`⚠️ 學生 ${stu.name} 沒有datesArr數據`);
                    }
                    
                    // 構建符合雲端資料庫格式的學生資料
                    let cloudStudent = {
                        name: studentName,
                        age: stu.age,
                        type: stu.type,
                        time: stu.time,
                        location: stu.location,
                        Phone_number: stu.phone,
                        待約: stu.wait,
                        待約月份: stu.waitMonth,
                        option1: '',
                        option2: '',
                        option3: stu.option3,
                        remark: remark,
                        "上課日期": standardDate,
                        hasBalloonMark: hasBalloonMark,
                        hasStarMark: hasStarMark,
                        originalDates: stu.datesArr || []
                    };
                    
                    // 檢查是否已存在相同的學生記錄（避免重複）
                    let isDuplicate = dateGroups[standardDate].some(existing => 
                        existing.name === cloudStudent.name && 
                        existing.time === cloudStudent.time && 
                        existing.type === cloudStudent.type
                    );
                    
                    if (!isDuplicate) {
                        dateGroups[standardDate].push(cloudStudent);
                    } else {
                        totalSkipped++;
                        console.log(`跳過重複記錄: ${cloudStudent.name} - ${standardDate}`);
                    }
                });
            });
            
            // 將分組後的資料轉換為雲端格式
            let groupedData = Object.keys(dateGroups).map(date => ({
                date: date,
                students: dateGroups[date]
            }));
            
            console.log(`準備上傳到雲端的資料:`, groupedData);
            
            // 上傳到雲端資料庫
            const result = await ipcRenderer.invoke('import-students-to-cloud', groupedData, true);
            
            if (result.success) {
                totalSaved += result.details.upsertedCount + result.details.modifiedCount;
                console.log(`地點 ${location} 保存成功:`, result.details);
            } else {
                console.error(`地點 ${location} 保存失敗:`, result.error);
                alert(`保存失敗: ${result.error}`);
                return;
            }
        }
        
        // 顯示保存結果
        let message = `成功保存 ${totalSaved} 條學生記錄到雲端資料庫`;
        if (totalSkipped > 0) {
            message += `，跳過 ${totalSkipped} 條重複記錄`;
        }
        alert(message);
        
        // 清空表格中的勾選狀態
        const checkboxes = tbody.querySelectorAll('.student-row-checkbox:checked');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        console.log('文檔編輯頁面保存完成');
        
    } catch (error) {
        console.error('保存到雲端資料庫失敗:', error);
        alert('保存失敗: ' + error.message);
    }
}

// 時間解析函數
function parseTimeString(timeStr) {
    if (!timeStr) return { timeStart: '', timeEnd: '' };
    
    console.log(`解析時間: ${timeStr}`);
    let timeParts = timeStr.split('-');
    if (timeParts.length !== 2) return { timeStart: '', timeEnd: '' };
    
    let startTime = timeParts[0].trim();
    let endTime = timeParts[1].trim();
    let timeStart = '', timeEnd = '';
    
    // 處理開始時間
    if (startTime.includes(':')) {
        timeStart = startTime;
    } else {
        // 如果只有數字，假設是小時，補充分鐘
        let startHour = parseInt(startTime);
        if (!isNaN(startHour)) {
            timeStart = `${String(startHour).padStart(2, '0')}:00`;
        }
    }
    
    // 處理結束時間
    if (endTime.includes(':')) {
        timeEnd = endTime;
    } else {
        // 如果只有數字，假設是小時，補充分鐘
        let endHour = parseInt(endTime);
        if (!isNaN(endHour)) {
            timeEnd = `${String(endHour).padStart(2, '0')}:00`;
        }
    }
    
    console.log(`解析結果: ${timeStart} - ${timeEnd}`);
    return { timeStart, timeEnd };
}

// 安全地獲取時間的小時和分鐘
function getTimeHour(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return '';
    let timePart = timeStr.split(':')[0] || '';
    // 移除非數字字符（如"星期四"）
    let hour = timePart.replace(/[^0-9]/g, '');
    return hour;
}

function getTimeMinute(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return '';
    let timePart = timeStr.split(':')[1] || '';
    // 移除非數字字符（如"pm"）
    let minute = timePart.replace(/[^0-9]/g, '');
    return minute;
}

// 生成時間輸入框的HTML
function generateTimeInputs(timeStart, timeEnd, studentName, classDate) {
    return `<input type="number" min="0" max="23" value="${getTimeHour(timeStart)}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${studentName}', '${classDate}')">:
            <input type="number" min="0" max="59" value="${getTimeMinute(timeStart)}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${studentName}', '${classDate}')"> -
            <input type="number" min="0" max="23" value="${getTimeHour(timeEnd)}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${studentName}', '${classDate}')">:
            <input type="number" min="0" max="59" value="${getTimeMinute(timeEnd)}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${studentName}', '${classDate}')">`;
}

// 創建待約相關函數
window.showCreateWaitModal = async function() {
    try {
        // 顯示彈窗
        const modal = document.getElementById('createWaitModal');
        modal.style.display = 'flex';
        
        // 載入待約學生資料
        await loadWaitStudents();
        
        // 設置當前日期為預設值
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('waitDateInput').value = today;
        
    } catch (error) {
        console.error('顯示創建待約彈窗失敗:', error);
        alert('載入待約學生資料失敗: ' + error.message);
    }
};

window.hideCreateWaitModal = function() {
    const modal = document.getElementById('createWaitModal');
    modal.style.display = 'none';
    
    // 清空表單
    document.getElementById('waitStudentSelect').innerHTML = '<option value="">請選擇學生</option>';
    document.getElementById('waitTimeStartHour').value = '';
    document.getElementById('waitTimeStartMin').value = '';
    document.getElementById('waitTimeEndHour').value = '';
    document.getElementById('waitTimeEndMin').value = '';
    document.getElementById('waitDateInput').value = '';
};

async function loadWaitStudents() {
    try {
        // 從雲端資料庫獲取所有學生資料
        const grouped = await ipcRenderer.invoke('fetch-students-from-cloud');
        
        // 篩選出有"待約"內容的學生，並去重（name+phone_number）
        let waitStudents = [];
        let uniqueKeys = new Set(); // 用於去重
        
        grouped.forEach(group => {
            group.students.forEach(stu => {
                if (stu.待約 && stu.待約.trim() !== '') {
                    // 創建唯一鍵：name + phone_number
                    const uniqueKey = `${stu.name}_${stu.Phone_number || ''}`;
                    
                    // 檢查是否已經添加過這個學生（基於name+phone_number）
                    if (!uniqueKeys.has(uniqueKey)) {
                        uniqueKeys.add(uniqueKey);
                        waitStudents.push({
                            name: stu.name,
                            phone: stu.Phone_number || '',
                            age: stu.age || '',
                            location: stu.location || '',
                            type: stu.type || '',
                            wait: stu.待約,
                            waitMonth: stu.待約月份 || ''
                        });
                    }
                }
            });
        });
        
        console.log('找到待約學生:', waitStudents);
        
        // 更新下拉選單
        const select = document.getElementById('waitStudentSelect');
        select.innerHTML = '<option value="">請選擇學生</option>';
        
        waitStudents.forEach(student => {
            const option = document.createElement('option');
            option.value = JSON.stringify(student);
            option.textContent = student.name; // 只顯示學生姓名
            select.appendChild(option);
        });
        
        if (waitStudents.length === 0) {
            alert('沒有找到有待約課程的學生');
            hideCreateWaitModal();
        }
        
    } catch (error) {
        console.error('載入待約學生資料失敗:', error);
        throw error;
    }
}

window.createWaitCourse = async function() {
    try {
        const studentSelect = document.getElementById('waitStudentSelect');
        const timeStartHour = document.getElementById('waitTimeStartHour');
        const timeStartMin = document.getElementById('waitTimeStartMin');
        const timeEndHour = document.getElementById('waitTimeEndHour');
        const timeEndMin = document.getElementById('waitTimeEndMin');
        const dateInput = document.getElementById('waitDateInput');
        
        // 驗證輸入
        if (!studentSelect.value) {
            alert('請選擇學生');
            return;
        }
        
        // 驗證時間輸入
        if (!timeStartHour.value || !timeStartMin.value || !timeEndHour.value || !timeEndMin.value) {
            alert('請完整填寫時間');
            return;
        }
        
        // 格式化時間
        const startHour = String(timeStartHour.value).padStart(2, '0');
        const startMin = String(timeStartMin.value).padStart(2, '0');
        const endHour = String(timeEndHour.value).padStart(2, '0');
        const endMin = String(timeEndMin.value).padStart(2, '0');
        const time = `${startHour}:${startMin}-${endHour}:${endMin}`;
        
        if (!dateInput.value) {
            alert('請選擇上課日期');
            return;
        }
        
        // 解析學生資料
        const studentData = JSON.parse(studentSelect.value);
        const date = dateInput.value;
        
        console.log('創建待約課程:', { studentData, time, date });
        
        // 構建新的學生記錄，格式與系統配置頁面相同
        const newStudentRecord = {
            name: studentData.name,
            age: studentData.age,
            type: studentData.type,
            time: time,
            location: studentData.location,
            Phone_number: studentData.phone,
            待約: '',
            待約月份: '',
            option1: '',
            option2: '',
            option3: '',
            remark: '',
            "上課日期": date
        };
        
        // 保存到雲端資料庫
        const groupedData = [{
            date: date,
            students: [newStudentRecord]
        }];
        
        const result = await ipcRenderer.invoke('import-students-to-cloud', groupedData, true);
        
        if (result.success) {
            // 更新原學生的待約數量
            await updateStudentWaitCount(studentData.name, studentData.phone, -1);
            
            alert('待約課程創建成功！');
            hideCreateWaitModal();
            
            // 重新載入雲端資料
            await loadCloudStudents();
        } else {
            alert('創建失敗: ' + result.error);
        }
        
    } catch (error) {
        console.error('創建待約課程失敗:', error);
        alert('創建失敗: ' + error.message);
    }
};

async function updateStudentWaitCount(studentName, studentPhone, change) {
    try {
        // 從雲端資料庫獲取所有學生資料
        const grouped = await ipcRenderer.invoke('fetch-students-from-cloud');
        
        // 找到要更新的學生記錄
        let updatedGroups = [];
        let updated = false;
        
        grouped.forEach(group => {
            let groupUpdated = false;
            group.students.forEach(stu => {
                if (stu.name === studentName && stu.Phone_number === studentPhone && stu.待約 && stu.待約.trim() !== '') {
                    // 更新待約數量
                    const currentWait = parseInt(stu.待約) || 0;
                    const newWait = Math.max(0, currentWait + change); // 確保不會小於0
                    stu.待約 = newWait.toString();
                    
                    // 如果待約數量為0，清空待約月份
                    if (newWait === 0) {
                        stu.待約月份 = '';
                    }
                    
                    updated = true;
                    groupUpdated = true;
                    console.log(`更新學生 ${studentName} 的待約數量: ${currentWait} -> ${newWait} (日期: ${group.date})`);
                }
            });
            
            // 只保存有更新的組
            if (groupUpdated) {
                updatedGroups.push(group);
            }
        });
        
        if (updated && updatedGroups.length > 0) {
            // 清理數據結構，移除MongoDB的_id欄位
            const cleanedGroups = updatedGroups.map(group => {
                const cleanedGroup = {
                    date: group.date,
                    students: group.students.map(student => {
                        const cleanedStudent = { ...student };
                        // 移除MongoDB的_id欄位
                        delete cleanedStudent._id;
                        return cleanedStudent;
                    })
                };
                return cleanedGroup;
            });
            
            // 只更新有變化的組
            const updatePromises = cleanedGroups.map(group => {
                return ipcRenderer.invoke('import-students-to-cloud', [group], false);
            });
            
            const results = await Promise.all(updatePromises);
            const allSuccess = results.every(result => result.success);
            
            if (allSuccess) {
                console.log(`待約數量更新成功，更新了 ${updatedGroups.length} 個日期組`);
            } else {
                console.error('部分待約數量更新失敗');
                // 詳細記錄失敗的結果
                results.forEach((result, index) => {
                    if (!result.success) {
                        console.error(`更新失敗的組 ${index}:`, result.error);
                    }
                });
            }
        } else if (!updated) {
            console.log('未找到要更新的學生記錄');
        }
        
    } catch (error) {
        console.error('更新待約數量失敗:', error);
        throw error;
    }
}

window.showStudentsByLocation = function(loc) {
    let locationMap = {};
    try {
        locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    } catch (e) {}
    let students = locationMap[loc] || [];
    let html = `<h3 style="margin:10px 0;">${loc} 學生名單</h3>`;
    html += '<button onclick="batchDeleteStudents(\'' + loc + '\')" style="margin-bottom:10px;padding:8px 16px;background:#e74c3c;color:white;border:none;border-radius:5px;cursor:pointer;">批量刪除</button>';
    html += `<button onclick="importStudentsToCloud('${loc}')" style="margin-bottom:10px;padding:8px 16px;background:#27ae60;color:white;border:none;border-radius:5px;cursor:pointer;">導入雲端</button>`;
    // 新增刷新按鈕
    html += `<button onclick="refreshStudents('${loc}')" style="margin-bottom:10px;padding:8px 16px;background:#f39c12;color:white;border:none;border-radius:5px;cursor:pointer;margin-left:10px;">刷新</button>`;
    // 搜索引擎
    html += `<div style='margin:10px 0 20px 0;'>
        <div style='display:inline-block;position:relative;'>
            <input id='searchName' autocomplete='off' placeholder='學生姓名' style='padding:4px 8px;width:120px;margin-right:8px;'>
            <div id='nameSuggest' style='position:absolute;top:28px;left:0;right:0;z-index:10;background:#fff;border:1px solid #ccc;display:none;max-height:120px;overflow-y:auto;'></div>
        </div>
        <select id='searchType' style='padding:4px 8px;margin-right:8px;'>
            <option value=''>全部課程類型</option>
            ${[...new Set(students.map(s=>s.type))].map(t=>`<option value='${t}'>${t}</option>`).join('')}
        </select>
        <input id='searchDate' type='text' style='padding:4px 8px;margin-right:4px;width:180px;' placeholder='選擇日期區間'>
        <button onclick="searchStudentsByLocation('${loc}')" style='padding:4px 12px;'>搜索</button>
        <button onclick="resetSearch('${loc}')" style='padding:4px 12px;margin-left:5px;'>重置</button>
        <button onclick="saveStudentSelects('${loc}')" style='padding:4px 12px;margin-left:5px;'>保存</button>
    </div>`;
    if (students.length === 0) {
        html += '<p style="color:#888;">暫無學生</p>';
    } else {
        html += '<div id="studentsTableArea">';
        html += renderStudentsTable(students, loc);
        html += '</div>';
    }
    document.getElementById('studentsList').innerHTML = html;

    // flatpickr初始化，区间选择
    if (window.flatpickr) {
        const searchDateInput = document.getElementById('searchDate');
        if (searchDateInput && searchDateInput._flatpickr) {
            searchDateInput._flatpickr.destroy();
        }
        flatpickr('#searchDate', {
            dateFormat: 'Y-m-d',
            locale: 'zh_tw',
            allowInput: true,
            mode: 'range',
            onReady: function(selectedDates, dateStr, instance) {
                instance._weekdayBinded = false;
                bindFlatpickrWeekdayClick(instance, loc);
            },
            onOpen: function(selectedDates, dateStr, instance) {
                instance._weekdayBinded = false;
                bindFlatpickrWeekdayClick(instance, loc);
            }
        });
    }
    // 姓名自動補全
    const nameInput = document.getElementById('searchName');
    const suggestBox = document.getElementById('nameSuggest');
    nameInput.addEventListener('input', function() {
        let val = this.value.trim();
        if (!val) { suggestBox.style.display = 'none'; return; }
        let names = [...new Set(students.map(s => s.name))];
        let matched = names.filter(n => n.includes(val));
        if (matched.length === 0) { suggestBox.style.display = 'none'; return; }
        suggestBox.innerHTML = matched.map(n => `<div style='padding:4px 8px;cursor:pointer;' onmousedown="document.getElementById('searchName').value='${n}';document.getElementById('nameSuggest').style.display='none';">${n}</div>`).join('');
        suggestBox.style.display = 'block';
    });
    nameInput.addEventListener('blur', function() { setTimeout(()=>{suggestBox.style.display='none';}, 150); });
}

window.searchStudentsByLocation = function(loc) {
    let locationMap = {};
    try {
        locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    } catch (e) {}
    let students = locationMap[loc] || [];
    let nameKey = document.getElementById('searchName').value.trim();
    let typeKey = document.getElementById('searchType').value.trim();
    let dateRange = document.getElementById('searchDate').value;
    let filtered = students.filter(stu => {
        let match = true;
        if (nameKey) match = match && stu.name.includes(nameKey);
        if (typeKey) match = match && stu.type === typeKey;
        // 日期区间查找
        if (dateRange) {
            let [start, end] = dateRange.split(' to ');
            if (!end) end = start;
            let startDate = new Date(start);
            let endDate = new Date(end);
            let stuDates = (stu.dates || '').split('、').map(s => s.trim()).filter(Boolean);
            // 只要有一个日期在区间内就显示
            let inRange = stuDates.some(dateStr => {
                // 使用通用的日期解析函數，支持多種格式
                let studentDate = parseChineseDate(dateStr);
                
                // 檢查日期是否有效（不是最小日期）
                if (studentDate.getTime() === new Date(0).getTime()) {
                    return false;
                }
                
                return studentDate >= startDate && studentDate <= endDate;
            });
            match = match && inRange;
        }
        return match;
    });
    if (filtered.length === 0) {
        showNoResultModal();
        return;
    }
    document.getElementById('studentsTableArea').innerHTML = renderStudentsTable(filtered, loc);
}

window.resetSearch = function(loc) {
    document.getElementById('searchName').value = '';
    document.getElementById('searchType').value = '';
    document.getElementById('searchDate').value = '';
    document.getElementById('searchDate').removeAttribute('data-weekday');
    // 清除header高亮
    let searchDateInput = document.getElementById('searchDate');
    if (searchDateInput && searchDateInput._flatpickr && searchDateInput._flatpickr.calendarContainer) {
        let weekdayEls = searchDateInput._flatpickr.calendarContainer.querySelectorAll('.flatpickr-weekday');
        weekdayEls.forEach(we => we.style.background = '');
    }
    searchStudentsByLocation(loc);
}

window.showNoResultModal = function() {
    let modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.3)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = `<div style='background:white;padding:30px 40px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.2);text-align:center;'>
        <div style='font-size:18px;margin-bottom:20px;'>搜索無結果</div>
        <button onclick='this.closest("div[style]").parentNode.remove()' style='padding:8px 24px;background:#27ae60;color:white;border:none;border-radius:5px;cursor:pointer;'>確認</button>
    </div>`;
    document.body.appendChild(modal);
}

window.deleteStudent = function(loc, idx) {
    let locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    if (!locationMap[loc]) return;
    locationMap[loc].splice(idx, 1);
    localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
    showStudentsByLocation(loc);
}

// 新的刪除函數，使用姓名和日期精確識別學生
window.deleteStudentByInfo = function(loc, studentName, date) {
    let locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    if (!locationMap[loc]) return;
    
    // 找到要刪除的學生索引
    let studentIndex = -1;
    locationMap[loc].forEach((stu, index) => {
        let stuDates = (stu.dates || '').split('、').map(d => d.trim()).filter(Boolean);
        if (stu.name === studentName && stuDates.includes(date)) {
            studentIndex = index;
        }
    });
    
    if (studentIndex !== -1) {
        let student = locationMap[loc][studentIndex];
        let stuDates = (student.dates || '').split('、').map(d => d.trim()).filter(Boolean);
        
        // 從日期列表中移除指定日期
        let remainingDates = stuDates.filter(d => d !== date);
        
        if (remainingDates.length === 0) {
            // 如果沒有剩餘日期，刪除整個學生記錄
            locationMap[loc].splice(studentIndex, 1);
        } else {
            // 更新學生的日期列表，只保留其他日期
            student.dates = remainingDates.join('、');
        }
        
        localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
        showStudentsByLocation(loc);
    } else {
        alert('找不到要刪除的學生資料');
    }
}

// ... existing code ...
function parseTime24(str) {
    // 解析 "HH:mm-HH:mm" 格式，返回起始分鐘數
    if (!str) return 0;
    const match = str.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    return parseInt(match[1],10)*60+parseInt(match[2],10);
}

// 工具函數：將 yyyy-mm-dd 轉為 yyyy年M月D日
function formatDateToChinese(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

// 工具函數：將中文日期轉換為Date對象進行排序
function parseChineseDate(dateStr) {
    if (!dateStr) return new Date(0);
    
    // 處理 "X月X日" 格式
    const chineseMatch = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
    if (chineseMatch) {
        const month = parseInt(chineseMatch[1], 10);
        const day = parseInt(chineseMatch[2], 10);
        const year = new Date().getFullYear();
        return new Date(year, month - 1, day);
    }
    
    // 處理 "YYYY-MM-DD" 格式
    const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10);
        const day = parseInt(isoMatch[3], 10);
        return new Date(year, month - 1, day);
    }
    
    // 處理 "MM/DD/YYYY" 格式
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const month = parseInt(slashMatch[1], 10);
        const day = parseInt(slashMatch[2], 10);
        const year = parseInt(slashMatch[3], 10);
        return new Date(year, month - 1, day);
    }
    
    // 如果都無法解析，返回最小日期
    return new Date(0);
}

// 工具函數：按日期排序
function sortDatesByChronologicalOrder(dates) {
    return dates.sort((a, b) => {
        // 如果都是標準格式 "YYYY-MM-DD"，直接按字符串排序
        if (a.match(/^\d{4}-\d{1,2}-\d{1,2}$/) && b.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            return a.localeCompare(b);
        }
        
        // 否則使用通用的日期解析
        const dateA = parseChineseDate(a);
        const dateB = parseChineseDate(b);
        return dateA - dateB;
    });
}

// 專門用於雲端資料的日期排序函數
function sortCloudDatesByChronologicalOrder(dates) {
    return dates.sort((a, b) => {
        // 如果日期格式是 "YYYY-MM-DD"，直接按字符串排序
        if (a.match(/^\d{4}-\d{1,2}-\d{1,2}$/) && b.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            return a.localeCompare(b);
        }
        
        // 否則使用通用的日期解析
        const dateA = parseChineseDate(a);
        const dateB = parseChineseDate(b);
        return dateA - dateB;
    });
}



// 更新雲端資料庫中的學生資料
async function updateCloudStudent(originalName, originalDate, newData) {
    try {
        console.log(`開始更新雲端學生資料: ${originalName} - ${originalDate} -> ${newData.date}`);
        
        // 構建完整的更新資料
        let updateData = {
            name: newData.name,
            "上課日期": newData.date || originalDate
        };
        
        // 包含所有欄位
        if (newData.age !== undefined) updateData.age = newData.age;
        if (newData.type !== undefined) updateData.type = newData.type;
        if (newData.time !== undefined) updateData.time = newData.time;
        if (newData.location !== undefined) updateData.location = newData.location;
        if (newData.option1 !== undefined) updateData.option1 = newData.option1;
        if (newData.option2 !== undefined) updateData.option2 = newData.option2;
        if (newData.option3 !== undefined) updateData.option3 = newData.option3;
        if (newData.phone !== undefined) updateData.Phone_number = newData.phone;
        if (newData.待約 !== undefined) updateData.待約 = newData.待約;
        if (newData.待約月份 !== undefined) updateData.待約月份 = newData.待約月份;
        
        console.log('更新資料:', updateData);
        
        // 如果日期有變更，需要特殊處理
        if (newData.date !== originalDate) {
            console.log(`日期變更，先刪除原記錄再添加新記錄`);
            
            // 先刪除原記錄
            const deleteResult = await ipcRenderer.invoke('delete-student-from-cloud', { 
                name: originalName, 
                date: originalDate 
            });
            
            console.log('刪除結果:', deleteResult);
            
            if (deleteResult.success) {
                // 再添加新記錄
                let groupedUpdate = [{
                    date: newData.date,
                    students: [updateData]
                }];
                
                console.log('準備添加新記錄:', groupedUpdate);
                
                const importResult = await ipcRenderer.invoke('import-students-to-cloud', groupedUpdate, false);
                console.log('添加結果:', importResult);
                
                if (importResult.success) {
                    // 重新載入雲端資料以確保數據一致性
                    await loadCloudStudents();
                    console.log('雲端學生資料編輯完成，已同步到雲端');
                } else {
                    console.error('添加新記錄失敗:', importResult.error);
                    alert('更新失敗：' + importResult.error);
                }
            } else {
                console.error('刪除原記錄失敗:', deleteResult.error);
                alert('更新失敗：' + deleteResult.error);
            }
        } else {
            // 日期沒有變更，直接更新
            let groupedUpdate = [{
                date: newData.date || originalDate,
                students: [updateData]
            }];
            
            console.log('準備更新記錄:', groupedUpdate);
            
            const updateResult = await ipcRenderer.invoke('import-students-to-cloud', groupedUpdate, false);
            console.log('更新結果:', updateResult);
            
            if (updateResult.success) {
                // 重新載入雲端資料以確保數據一致性
                await loadCloudStudents();
                console.log('雲端學生資料編輯完成，已同步到雲端');
            } else {
                console.error('更新記錄失敗:', updateResult.error);
                alert('更新失敗：' + updateResult.error);
            }
        }
    } catch (error) {
        console.error('更新雲端資料失敗:', error);
        alert('更新雲端資料失敗，請重試');
    }
}

// 雲端資料刪除函數
window.deleteCloudStudent = function(studentName, date) {
    if (!confirm(`確定要刪除學生 "${studentName}" 在 "${date}" 的資料嗎？`)) {
        return;
    }
    
    console.log(`開始刪除學生: ${studentName}, 日期: ${date}`);
    
    // 先刪除雲端資料庫
    ipcRenderer.invoke('delete-student-from-cloud', { name: studentName, date: date })
        .then(result => {
            console.log('刪除結果:', result);
            if (result.success) {
                // 本地緩存也刪除
                deleteCloudStudentFromCache(studentName, date);
            } else {
                alert('刪除雲端資料失敗：' + result.error);
            }
        })
        .catch(error => {
            console.error('刪除過程出錯:', error);
            alert('刪除失敗：' + error.message);
        });
}

// 本地緩存刪除（原本的刪除邏輯，僅刪除 window.cloudStudentsGrouped）
function deleteCloudStudentFromCache(studentName, date) {
    let grouped = window.cloudStudentsGrouped || [];
    let deleted = false;
    grouped.forEach((group, groupIndex) => {
        if (group.date === date) {
            group.students.forEach((stu, studentIndex) => {
                if (stu.name === studentName) {
                    group.students.splice(studentIndex, 1);
                    deleted = true;
                    if (group.students.length === 0) {
                        grouped.splice(groupIndex, 1);
                    }
                }
            });
        }
    });
    if (deleted) {
        alert('雲端資料刪除成功！');
        window.cloudStudentsGrouped = grouped;
        renderCloudStudentsTableFromCache();
    } else {
        alert('找不到要刪除的學生資料');
    }
}

// 實時更新選項3的函數（從時間變化觸發）
window.updateOption3FromTime = function(input) {
    updateOption3RealTime(input);
}

// 實時更新選項3的函數（從課程類型變化觸發）
window.updateOption3FromCourseType = function(input) {
    updateOption3RealTime(input);
}

// 統一的實時更新選項3函數
function updateOption3RealTime(input) {
    let tr = input.closest('tr');
    let tds = tr.querySelectorAll('td');
    
    // 第一步：獲取基本參數
    let timeInputs = tds[7].querySelectorAll('input');
    let sh = String(timeInputs[0]?.value || '').padStart(2,'0');
    let sm = String(timeInputs[1]?.value || '').padStart(2,'0');
    let eh = String(timeInputs[2]?.value || '').padStart(2,'0');
    let em = String(timeInputs[3]?.value || '').padStart(2,'0');
    
    // 構建時間字符串
    let timeStr = '';
    if (sh && sm && eh && em) {
        timeStr = `${sh}:${sm}-${eh}:${em}`;
    }
    
    // 獲取日期
    let dateInput = tds[8].querySelector('input');
    let dateStr = dateInput ? dateInput.value : '';
    
    // 獲取課程類型
    let courseTypeInput = tds[3].querySelector('input');
    let courseType = courseTypeInput ? courseTypeInput.value : '';
    
    // 第二步：檢查基本參數是否為空
    if (!timeStr || !dateStr) {
        updateOption3Field(tds, '');
        return;
    }
    
    // 第三步：檢查時間格式是否正確
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!timeMatch) {
        updateOption3Field(tds, '');
        return;
    }
    
    // 第四步：計算時間差
    const startHour = parseInt(timeMatch[1]);
    const startMinute = parseInt(timeMatch[2]);
    const endHour = parseInt(timeMatch[3]);
    const endMinute = parseInt(timeMatch[4]);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    let diffMinutes = endMinutes - startMinutes;
    
    // 處理跨日的情況
    if (diffMinutes <= 0) {
        diffMinutes += 24 * 60;
    }
    
    // 第五步：根據課程類型計算點數
    let option3Value = '';
    if (courseType && courseType.includes('指定導師高班')) {
        // 指定導師高班的計算規則
        if (diffMinutes === 90) { option3Value = '1.5'; }
        else if (diffMinutes === 120) { option3Value = '2'; }
        else if (diffMinutes === 150) { option3Value = '2.5'; }
        else if (diffMinutes === 180) { option3Value = '3'; }
        else if (diffMinutes === 210) { option3Value = '3.5'; }
        else if (diffMinutes === 240) { option3Value = '4'; }
        else if (diffMinutes === 270) { option3Value = '4.5'; }
        else if (diffMinutes === 300) { option3Value = '5'; }
    } else {
        // 默認計算規則
        if (diffMinutes === 60) { option3Value = '1.5'; }
        else if (diffMinutes === 90) { option3Value = '2'; }
        else if (diffMinutes === 120) { option3Value = '2.5'; }
        else if (diffMinutes === 150) { option3Value = '3'; }
        else if (diffMinutes === 180) { option3Value = '3.5'; }
        else if (diffMinutes === 180) { option3Value = '4'; }
        else if (diffMinutes === 210) { option3Value = '4.5'; }
    }
    
    // 更新選項3欄位
    updateOption3Field(tds, option3Value);
}

// 輔助函數：更新選項3欄位
window.updateOption3Field = function(tds, value) {
    let option3Input = tds[6].querySelector('input');
    if (option3Input) {
        option3Input.value = value;
    }
}

// 切換指定地點的所有學生選擇狀態
window.toggleSelectAllInLocation = function(location, checkbox) {
    let totalChecked = 0;
    let locationFound = false;
    let isChecked = checkbox.checked;
    
    // 找到所有地點標題
    let locationHeaders = document.querySelectorAll('div');
    
    locationHeaders.forEach(header => {
        if (header.innerHTML.includes(`📍 ${location}`)) {
            locationFound = true;
            
            // 找到該地點下的所有表格
            let currentElement = header.nextElementSibling;
            
            // 遍歷該地點下的所有元素，直到遇到下一個地點標題
            while (currentElement && !currentElement.innerHTML.includes('📍')) {
                if (currentElement.tagName === 'TABLE') {
                    // 設置該表格中所有學生的checkbox狀態
                    let checkboxes = currentElement.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(studentCheckbox => {
                        studentCheckbox.checked = isChecked;
                        if (isChecked) totalChecked++;
                    });
                }
                currentElement = currentElement.nextElementSibling;
            }
        }
    });
    
  
}

// 切換指定日期的所有學生選擇狀態
window.toggleSelectAllInDate = function(location, date, checkbox) {
    let totalChecked = 0;
    let dateFound = false;
    let isChecked = checkbox.checked;
    
    // 找到所有地點標題
    let locationHeaders = document.querySelectorAll('div');
    
    locationHeaders.forEach(header => {
        if (header.innerHTML.includes(`📍 ${location}`)) {
            // 找到該地點下的所有日期標題
            let currentElement = header.nextElementSibling;
            
            // 遍歷該地點下的所有元素，直到遇到下一個地點標題
            while (currentElement && !currentElement.innerHTML.includes('📍')) {
                // 檢查是否是日期標題且包含目標日期
                if (currentElement.innerHTML.includes(`📅 ${date}`)) {
                    dateFound = true;
                    
                    // 找到該日期標題後的下一個表格
                    let tableElement = currentElement.nextElementSibling;
                    if (tableElement && tableElement.tagName === 'TABLE') {
                        // 設置該表格中所有學生的checkbox狀態
                        let checkboxes = tableElement.querySelectorAll('input[type="checkbox"]');
                        checkboxes.forEach(studentCheckbox => {
                            studentCheckbox.checked = isChecked;
                            if (isChecked) totalChecked++;
                        });
                    }
                    break; // 找到目標日期後退出循環
                }
                currentElement = currentElement.nextElementSibling;
            }
        }
    });
    
   
}

// 保留原來的函數以向後兼容
window.selectAllStudentsInLocation = function(location) {
    // 找到對應的全選checkbox並觸發
    let checkboxId = `selectAll_${location.replace(/\s+/g, '_')}`;
    let checkbox = document.getElementById(checkboxId);
    if (checkbox) {
        checkbox.checked = true;
        toggleSelectAllInLocation(location, checkbox);
    }
}

// 計算學生堂數統計的函數
function calculateStudentStats(student, allStudents) {
    let stats = {
        totalPoints: 0,       // 已購買點數
        totalPurchased: 0,    // 已購買堂數
        waitCount: 0,         // 待約堂數
        bookedCount: 0,       // 已約堂數
        attendedCount: 0,     // 已出席堂數
        remainingCount: 0,    // 剩餘堂數
        remainingpoints: 0,   // 剩餘點數
        needMakeUpCount: 0    // 需補堂數（由請假按鈕計算）
    };
    
    // 根據姓名+電話號碼找到該學生的所有記錄
    let studentRecords = allStudents.filter(stu => 
        stu.name === student.name && 
        (stu.Phone_number || stu.phoneNumber || stu["電話號碼"] || stu.phone || '') === (student.phone || '')
    );
    
    // 計算已約堂數（統計該學生的資料格中的"上課日期"有内容的數量）
    studentRecords.forEach(record => {
        let hasDate = false;
        if (record["上課日期"] && record["上課日期"].trim() !== '') {
            hasDate = true;
        } else if (record.date && record.date.trim() !== '') {
            hasDate = true;
        } else if (record.dates && record.dates.trim() !== '') {
            hasDate = true;
        }
        
        if (hasDate) {
            stats.bookedCount++;
        }
    });
    
    // 計算待約堂數
    stats.waitCount = parseInt(student.wait || student.待約 || '0');
    
    // 計算已購買堂數（相同姓名+電話號碼的出現次數）
    stats.totalPurchased = studentRecords.length;
    
    // 計算已購買點數（option3 累計 + 待約）
    let totalOption3Points = 0;
    studentRecords.forEach(record => {
        if (record.option3 && record.option3.trim() !== '') {
            let points = parseFloat(record.option3);
            if (!isNaN(points)) totalOption3Points += points;
        }
    });
    stats.totalPoints = totalOption3Points + stats.waitCount;
    
    // 計算已出席堂數（選項1有值的筆數）
    studentRecords.forEach(record => {
        if (record.option1 && record.option1.trim() !== '') {
            stats.attendedCount++;
        }
    });
    
    // 剩餘堂數（已購買堂數 - 已出席堂數）
    stats.remainingCount = Math.max(0, stats.totalPurchased - stats.attendedCount);
    
    // 剩餘點數（已購買點數 - option3 和）
    stats.remainingpoints = Math.max(0, stats.totalPoints - totalOption3Points);
    
    // 需補堂數：彙總該學生所有已標記請假的日期對應的差額
    try {
        let leaveMap = {};
        leaveMap = JSON.parse(localStorage.getItem('leaveStatusMap') || '{}');
        let sum = 0;
        Object.keys(leaveMap).forEach(k => {
            if (!leaveMap[k]) return;
            const [n, p, d] = k.split('|');
            if (n !== (student.name || '') || p !== (student.phone || '')) return;
            // 找到該日期的紀錄
            const rec = studentRecords.find(r => {
                const rd = (r['上課日期'] || r.date || '').replace(/[🎈]/g, '').trim();
                const kd = (d || '').replace(/[🎈]/g, '').trim();
                return rd === kd;
            });
            if (!rec) return;
            sum += calculateMakeUpDelta(rec.option3, rec.option1, rec.option2);
        });
        stats.needMakeUpCount = sum;
    } catch (e) {
        stats.needMakeUpCount = 0;
    }
    
    return stats;
}

// 依規則計算一筆請假需要增加的補堂數
function calculateMakeUpDelta(optionPoints, attendanceText, makeUpText) {
    const p = parseFloat(optionPoints || '0') || 0;
    const att = (attendanceText || '').trim();
    const mk = (makeUpText || '').trim();
    // 若補/調堂有內容，視為已補，不新增需求
    if (mk) return 0;
    // 規則：當出席與點數的合計不得超過點數，這裡只計算差額
    if (p === 1.5) {
        if (att === '出席1') return 0.5;
        if (att === '缺席') return 1.5;
    }
    if (p === 2) {
        if (att === '出席1') return 1;
        if (att === '出席1.5') return 0.5;
        if (att === '缺席') return 2;
    }
    if (p === 1) {
        if (att === '缺席') return 1;
    }
    // 其他情況：若出席值可解析為數值且小於點數，則補堂為差值
    const attNum = att.replace('出席','');
    const attVal = parseFloat(attNum);
    if (!isNaN(attVal) && attVal < p) return p - attVal;
    return 0;
}

// 切換請假狀態並更新出席記錄中的需補堂數
window.toggleLeaveForStudent = function(name, phone, date, option3Points, option1Text, option2Text, btn) {
    const key = `${name}|${phone}|${date}`;
    let leaveMap = {};
    try { leaveMap = JSON.parse(localStorage.getItem('leaveStatusMap') || '{}'); } catch(e) {}
    const currentlyOn = !!leaveMap[key];
    leaveMap[key] = !currentlyOn;
    localStorage.setItem('leaveStatusMap', JSON.stringify(leaveMap));
    if (btn) {
        btn.style.background = leaveMap[key] ? '#34495e' : '#e67e22';
        btn.style.color = 'white';
    }
    // 若出席記錄頁面已載入，重新渲染以即時反映
    try {
        if (document.getElementById('attendanceTableArea')) {
            renderAttendanceTable();
        }
    } catch (e) {}
}

window.toggleSelectAllManageRows = function(checkbox) {
    document.querySelectorAll('.manageRowCheckbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

window.batchDeleteStudents = function(loc) {
    let locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    if (!locationMap[loc]) return;
    
    // 找到當前顯示的學生表格中的所有被勾選的行
    let tables = document.getElementById('studentsTableArea')?.querySelectorAll('table');
    let toDeleteItems = [];
    
    if (tables) {
        tables.forEach(table => {
            let trs = table.querySelectorAll('tr');
            trs.forEach((tr, idx) => {
                if (idx === 0) return; // 跳過表頭
                let cb = tr.querySelector('.manageRowCheckbox');
                if (cb && cb.checked) {
                    let tds = tr.querySelectorAll('td');
                    let name = tds[1]?.textContent.trim();
                    let date = tds[11]?.textContent.trim();
                    // 用姓名+上課日期作為唯一標識
                    if (name && date) {
                        toDeleteItems.push({ name, date });
                    }
                }
            });
        });
    }
    
    if (toDeleteItems.length === 0) {
        alert('請先勾選要刪除的學生');
        return;
    }
    
    // 處理每個要刪除的項目
    toDeleteItems.forEach(item => {
        let students = locationMap[loc];
        let studentIndex = -1;
        
        // 找到對應的學生記錄
        students.forEach((stu, index) => {
            let stuDates = (stu.dates || '').split('、').map(d => d.trim()).filter(Boolean);
            if (stu.name === item.name && stuDates.includes(item.date)) {
                studentIndex = index;
            }
        });
        
        if (studentIndex !== -1) {
            let student = students[studentIndex];
            let stuDates = (student.dates || '').split('、').map(d => d.trim()).filter(Boolean);
            
            // 從日期列表中移除指定日期
            let remainingDates = stuDates.filter(d => d !== item.date);
            
            if (remainingDates.length === 0) {
                // 如果沒有剩餘日期，刪除整個學生記錄
                students.splice(studentIndex, 1);
            } else {
                // 更新學生的日期列表，只保留其他日期
                student.dates = remainingDates.join('、');
            }
        }
    });
    
    localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
    showStudentsByLocation(loc);
    
    alert(`已成功刪除 ${toDeleteItems.length} 個選中的學生記錄`);
}

window.exportLocationExcel = async function(loc) {
    let locationMap = {};
    try {
        locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    } catch (e) {}
    let students = locationMap[loc] || [];
    // 只導出勾選的學生
    let table = document.getElementById('studentsTableArea')?.querySelector('table');
    let checkedIdxs = [];
    if (table) {
        let trs = table.querySelectorAll('tr[data-idx]');
        trs.forEach((tr, idx) => {
            let cb = tr.querySelector('.manageRowCheckbox');
            if (cb && cb.checked) checkedIdxs.push(idx);
        });
    }
    if (checkedIdxs.length > 0) {
        students = checkedIdxs.map(idx => students[idx]);
    }
    if (students.length === 0) {
        window.confirm('沒有勾選選項');
        return;
    }
    // 以下邏輯與文檔編輯導出一致 ...
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
    let dateInfo = {};
    let balloonDates = new Set();
    students.forEach(stu => {
        (stu.dates || '').split('、').filter(Boolean).forEach(dateStr => {
            if (dateStr.includes('🎈')) balloonDates.add(dateStr.replace('🎈', ''));
            let m = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
            if (m) {
                let month = parseInt(m[1], 10);
                let day = parseInt(m[2], 10);
                let year = stu.year || new Date().getFullYear();
                let dateObj = new Date(year, month - 1, day);
                let weekday = dateObj.getDay();
                let cleanDateStr = dateStr.replace('🎈', '');
                if (!dateInfo[cleanDateStr]) dateInfo[cleanDateStr] = [];
                dateInfo[cleanDateStr].push({
                    ...stu,
                    dateStr: cleanDateStr,
                    month,
                    day,
                    year,
                    weekday,
                    time: stu.time,
                    type: stu.type
                });
            }
        });
    });
    let monthGroups = {};
    Object.keys(dateInfo).forEach(dateStr => {
        let arr = dateInfo[dateStr];
        if (arr.length > 0) {
            let month = arr[0].month;
            let year = arr[0].year;
            let monthGroup = Math.floor((month - 1) / 2) * 2 + 1;
            let groupKey = `${year}年${monthGroup}-${monthGroup + 1}月`;
            if (!monthGroups[groupKey]) monthGroups[groupKey] = {};
            monthGroups[groupKey][dateStr] = arr;
        }
    });
    let sheets = [];
    for (const [monthGroupKey, groupDates] of Object.entries(monthGroups)) {
        let weekdaySheets = {};
        for (let i = 0; i < 7; i++) {
            weekdaySheets[i] = {};
        }
        Object.entries(groupDates).forEach(([dateStr, arr]) => {
            let weekday = arr[0].weekday;
            if (!weekdaySheets[weekday][dateStr]) weekdaySheets[weekday][dateStr] = [];
            weekdaySheets[weekday][dateStr] = arr.map(item => {
                let newName = item.name || item.rawName;
                let studentDates = (item.dates || '').split('、').filter(Boolean);
                let needBalloon = studentDates.some(studentDate =>
                    studentDate.includes('🎈') && studentDate.replace('🎈', '') === dateStr
                );
                if (needBalloon && !newName.includes('🎈')) {
                    newName += '🎈';
                }
                return { ...item, name: newName };
            });
        });
        for (let i = 0; i < 7; i++) {
            let dateArr = Object.keys(weekdaySheets[i]);
            if (dateArr.length === 0) continue;
            let headerRow = [];
            dateArr.forEach((date, idx) => {
                headerRow.push(date);
                if (idx !== dateArr.length - 1) {
                    for (let j = 0; j < 4; j++) headerRow.push('');
                }
            });
            let dataRows = [];
            let maxRowsPerDate = 0;
            let dateTimeRows = {};
            dateArr.forEach(date => {
                let timeTypeMap = {};
                (weekdaySheets[i][date] || []).forEach(item => {
                    let key = item.time + '||' + item.type;
                    if (!timeTypeMap[key]) timeTypeMap[key] = { time: item.time, type: item.type, students: [] };
                    timeTypeMap[key].students.push(item.name);
                });
                let timeTypeArr = Object.values(timeTypeMap);
                timeTypeArr.sort((a, b) => {
                    let cmp = compareTimes(a.time, b.time);
                    if (cmp !== 0) return cmp;
                    return a.type.localeCompare(b.type);
                });
                dateTimeRows[date] = [];
                timeTypeArr.forEach((tt, idx) => {
                    dateTimeRows[date].push({ type: 'time', value: tt.time + ' ' + tt.type });
                    tt.students.forEach(stuName => {
                        let studentRow = stuName;
                        let found = students.find(s => s.name === stuName.replace('🎈', '') || s.name + '🎈' === stuName);
                        if (found && found.age) {
                            studentRow += '👶🏻' + found.age;
                        }
                        dateTimeRows[date].push({ type: 'student', value: studentRow });
                    });
                    if (idx < timeTypeArr.length - 1) {
                        dateTimeRows[date].push({ type: 'spacer', value: '' });
                        dateTimeRows[date].push({ type: 'spacer', value: '' });
                    }
                });
                if (dateTimeRows[date].length > maxRowsPerDate) maxRowsPerDate = dateTimeRows[date].length;
            });
            for (let rowIdx = 0; rowIdx < maxRowsPerDate; rowIdx++) {
                let row = [];
                for (let d = 0; d < dateArr.length; d++) {
                    let arr = dateTimeRows[dateArr[d]] || [];
                    row.push(arr[rowIdx] ? arr[rowIdx].value : '');
                    if (d !== dateArr.length - 1) {
                        for (let j = 0; j < 4; j++) row.push('');
                    }
                }
                dataRows.push(row);
            }
            let sheetName = `${loc}_${monthGroupKey}（${weekdayNames[i]}）`;
            sheets.push({ name: sheetName, header: headerRow, data: dataRows });
        }
    }
    const { ipcRenderer } = require('electron');
    const path = require('path');
    const filename = path.join(loc + '.xlsx');
    const result = await ipcRenderer.invoke('export-exceljs-multisheet', {
        sheets,
        filename
    });
    if (result && result.success) {
        alert('已導出本地 Excel 文件: ' + filename);
    } else {
        alert('導出失敗：' + (result && result.error ? result.error : '未知錯誤'));
    }
}

// 在學生管理頁面導出Excel按鈕右側新增"追加資料"按鈕
function addAppendExcelButton() {
    // 找到所有包含"導出Excel"文字的按鈕
    const exportBtns = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent.includes('導出Excel'));
    exportBtns.forEach((exportBtn, idx) => {
        // 為每個按鈕生成唯一 id
        const appendBtnId = `appendExcelBtn_${idx}`;
        // 避免重複插入
        if (!exportBtn.parentNode.querySelector(`#${appendBtnId}`)) {
            const appendBtn = document.createElement('button');
            appendBtn.id = appendBtnId;
            appendBtn.textContent = '追加資料';
            appendBtn.style.marginLeft = '10px';
            appendBtn.onclick = appendDataToExcel;
            exportBtn.parentNode.insertBefore(appendBtn, exportBtn.nextSibling);
        }
    });
}

// 追加資料功能
async function appendDataToExcel(loc) {
    const { ipcRenderer } = require('electron');
    const fs = require('fs');
    const XLSX = require('xlsx');
    if (!loc) {
        const h3 = document.querySelector('#studentsList h3');
        if (h3) {
            loc = h3.textContent.replace(' 學生名單', '').trim();
        } else {
            alert('無法自動獲取地點名稱，請傳入 loc');
            return;
        }
    }
    const fileName = loc + '.xlsx';
    if (!fs.existsSync(fileName)) {
        alert('未找到現有 ' + fileName + '，請先導出一次！');
        return;
    }
    // 1. 讀取現有 Excel 的所有工作表
    const wb = XLSX.readFile(fileName);
    const existingSheetNames = wb.SheetNames;
    // 2. 收集新資料（只取被勾選的學生）
    let data = [];
    const studentsTable = document.getElementById('studentsTableArea')?.querySelector('table');
    if (!studentsTable) {
        alert('沒有可追加的學生資料');
        return;
    }
    const trs = studentsTable.querySelectorAll('tr[data-idx]');
    trs.forEach(tr => {
        const cb = tr.querySelector('.manageRowCheckbox');
        if (!cb || !cb.checked) return;
        const tds = tr.querySelectorAll('td');
        let studentName = tds[2].textContent.trim();
        let phoneNumber = tds[3].textContent.trim();
        let age = tds[4].textContent.trim();
        let type = tds[6].textContent.trim();
        let time = tds[7].textContent.trim();
        let datesWithSymbols = tds[8].textContent.trim();
        let dates = datesWithSymbols.split(/[、,，]/).map(d => d.trim()).filter(Boolean);
        data.push({ name: studentName, age, type, time, dates });
    });
    if (data.length === 0) {
        alert('請至少勾選一位學生');
        return;
    }
    // 3. 模擬所有需要的 sheetName
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
    let neededSheetNames = new Set();
    let dateSheetMap = {}; // { sheetName: { date: { timeType: [學生名單] } } }
    data.forEach(item => {
        item.dates.forEach(dateStr => {
            // 解析日期 - 支持多種格式
            let month, day, year, dateObj;
            
            // 處理標準日期格式 "YYYY-MM-DD"
            let standardMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (standardMatch) {
                year = parseInt(standardMatch[1], 10);
                month = parseInt(standardMatch[2], 10);
                day = parseInt(standardMatch[3], 10);
                dateObj = new Date(year, month - 1, day);
            } else {
                // 處理中文日期格式 "M月D日"
                let m = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
                if (!m) return;
                month = parseInt(m[1], 10);
                day = parseInt(m[2], 10);
                year = new Date().getFullYear();
                dateObj = new Date(year, month - 1, day);
            }
            
            let weekday = dateObj.getDay();
            let monthGroup = Math.floor((month - 1) / 2) * 2 + 1;
            let monthGroupKey = `${year}年${monthGroup}-${monthGroup + 1}月`;
            let sheetName = `${loc}_${monthGroupKey}（${weekdayNames[weekday]}）`;
            neededSheetNames.add(sheetName);
            if (!dateSheetMap[sheetName]) dateSheetMap[sheetName] = {};
            if (!dateSheetMap[sheetName][dateStr]) dateSheetMap[sheetName][dateStr] = {};
            const timeType = `${item.time}${item.type ? '（' + item.type + '）' : ''}`;
            if (!dateSheetMap[sheetName][dateStr][timeType]) dateSheetMap[sheetName][dateStr][timeType] = [];
            let nameToShow = item.name;
            if (item.name.includes('🎁')) {
                if (item.dates[0] === dateStr) {
                    if (!nameToShow.endsWith('🎁')) nameToShow += '🎁';
                } else {
                    nameToShow = nameToShow.replace('🎁', '');
                }
            }
            if (item.age) nameToShow += ` 👶${item.age}`;
            if (!dateSheetMap[sheetName][dateStr][timeType].includes(nameToShow)) {
                dateSheetMap[sheetName][dateStr][timeType].push(nameToShow);
            }
        });
    });
    // 4. 準備 sheets 結構
    let sheets = [];
    neededSheetNames.forEach(sheetName => {
        // 如果已存在，不新建，只追加資料
        let dateMap = {};
        if (existingSheetNames.includes(sheetName)) {
            // 讀取現有 sheet，合併資料
            const ws = wb.Sheets[sheetName];
            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 });
            let dateHeaders = aoa[0];
            for (let col = 0; col < dateHeaders.length; col++) {
                let date = dateHeaders[col];
                if (!date) continue;
                if (!dateMap[date]) dateMap[date] = {};
                let curTimeType = null;
                for (let row = 1; row < aoa.length; row++) {
                    let cell = aoa[row][col];
                    if (!cell) continue;
                    if (/\d{1,2}(:|：)\d{2}/.test(cell)) {
                        curTimeType = cell;
                        if (!dateMap[date][curTimeType]) dateMap[date][curTimeType] = [];
                    } else if (curTimeType) {
                        if (!dateMap[date][curTimeType].includes(cell)) {
                            dateMap[date][curTimeType].push(cell);
                        }
                    }
                }
            }
        }
        // 合併新資料
        let newDates = dateSheetMap[sheetName] || {};
        Object.entries(newDates).forEach(([date, timeGroups]) => {
            if (!dateMap[date]) dateMap[date] = {};
            Object.entries(timeGroups).forEach(([timeType, students]) => {
                if (!dateMap[date][timeType]) dateMap[date][timeType] = [];
                students.forEach(stuName => {
                    if (!dateMap[date][timeType].includes(stuName)) {
                        dateMap[date][timeType].push(stuName);
                    }
                });
            });
        });
        // 生成 aoa
        let dateCols = [];
        Object.entries(dateMap).forEach(([date, timeGroups]) => {
            let col = [date];
            Object.entries(timeGroups).forEach(([timeType, students]) => {
                col.push(timeType);
                students.forEach(stuName => {
                    col.push(stuName);
                });
                col.push('');
            });
            dateCols.push(col);
        });
        let maxRows = Math.max(...dateCols.map(col => col.length));
        dateCols = dateCols.map(col => {
            while (col.length < maxRows) col.push('');
            return col;
        });
        let aoa = [];
        for (let i = 0; i < maxRows; i++) {
            aoa.push(dateCols.map(col => col[i]));
        }
        sheets.push({ name: sheetName, header: aoa[0], data: aoa.slice(1) });
    });
    // 5. 傳給主進程，由 main.js 設置資料驗證
    const result = await ipcRenderer.invoke('export-exceljs-multisheet', {
        sheets,
        filename: fileName
    });
    if (result && result.success) {
        alert('資料已成功追加到 ' + fileName + '！');
    } else {
        alert('追加失敗：' + (result && result.error ? result.error : '未知錯誤'));
    }
}
// 在學生管理頁面渲染後自動插入按鈕
if (typeof window !== 'undefined') {
    setTimeout(addAppendExcelButton, 1000);
}

// ... existing code ...
window.login = login;
window.logout = logout;
window.switchTab = switchTab;
window.showChangeUnlockModal = showChangeUnlockModal;
// ... existing code ...

window.saveStudentSelects = function(loc) {
    let locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    if (!locationMap[loc]) return;
    // 遍歷當前顯示的學生表格，根據姓名+上課日期對應到 locationMap[loc] 的學生，保存下拉選單的值
    let table = document.getElementById('studentsTableArea')?.querySelectorAll('table');
    if (!table) return;
    // 由於分日期分表格，需遍歷所有表格
    table.forEach(tbl => {
        let trs = tbl.querySelectorAll('tr');
        trs.forEach(tr => {
            let cb = tr.querySelector('.manageRowCheckbox');
            let tds = tr.querySelectorAll('td');
            let name = tds[1]?.textContent.trim();
            let date = tds[11]?.textContent.trim();
            if (!name || !date) return;
            // 找到對應學生
            let stu = locationMap[loc].find(s => {
                let stuDates = (s.dates || '').split('、').map(d => d.trim()).filter(Boolean);
                return s.name === name && stuDates.includes(date);
            });
            if (!stu) return;
            // 保存三個下拉選單的值
            let select1 = tds[7]?.querySelector('select')?.value || '';
            let select2 = tds[8]?.querySelector('select')?.value || '';
            let select3 = tds[9]?.querySelector('input')?.value || '';
            stu.select1 = select1;
            stu.select2 = select2;
            stu.select3 = select3;
        });
    });
    localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
    alert('已保存所有下拉選單結果！');
}
// ... existing code ...
// 請將保存按鈕的 onclick 改為 saveStudentSelects('${loc}')

// ... existing code ...
// 綁定flatpickr日曆header點擊事件，並支持只顯示該星期幾的學生資料
function bindFlatpickrWeekdayClick(instance, loc) {
    // 防止重複綁定
    if (instance._weekdayBinded) return;
    instance._weekdayBinded = true;
    setTimeout(() => {
        const weekdayEls = instance.calendarContainer.querySelectorAll('.flatpickr-weekday');
        weekdayEls.forEach((el, idx) => {
            el.style.cursor = 'pointer';
            el.onclick = function(e) {
                // 清空日期值，設置data-weekday
                document.getElementById('searchDate').value = '';
                document.getElementById('searchDate').setAttribute('data-weekday', idx);
                // 高亮當前header
                weekdayEls.forEach(we => we.style.background = '');
                el.style.background = '#b3d4fc';
                searchStudentsByWeekday(loc, idx);
            };
        });
        // 若有data-weekday，恢復高亮
        const dataWeekday = document.getElementById('searchDate').getAttribute('data-weekday');
        if (dataWeekday !== null) {
            weekdayEls.forEach((el, idx) => {
                el.style.background = (idx == dataWeekday) ? '#b3d4fc' : '';
            });
        }
    }, 0);
}

// 只顯示該星期幾的學生資料FF
window.searchStudentsByWeekday = function(loc, weekday) {
    let locationMap = {};
    try {
        locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    } catch (e) {}
    let students = locationMap[loc] || [];
    let nameKey = document.getElementById('searchName').value.trim();
    let typeKey = document.getElementById('searchType').value.trim();
    let filtered = students.filter(stu => {
        let match = true;
        if (nameKey) match = match && stu.name.includes(nameKey);
        if (typeKey) match = match && stu.type === typeKey;
        // 只保留該星期幾的日期
        let stuDates = (stu.dates || '').split('、').map(s => s.trim()).filter(Boolean);
        let hasWeekday = false;
        let filteredDates = stuDates.filter(dateStr => {
            let m = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
            if (!m) return false;
            let y = new Date().getFullYear();
            let d = new Date(y, parseInt(m[1],10)-1, parseInt(m[2],10));
            if (d.getDay() === weekday) {
                hasWeekday = true;
                return true;
            }
            return false;
        });
        // 僅保留匹配的日期
        if (filteredDates.length > 0) {
            stu._filteredDates = filteredDates.join('、');
        } else {
            stu._filteredDates = '';
        }
        return match && hasWeekday;
    });
    // 僅顯示匹配日期
    if (filtered.length === 0) {
        showNoResultModal();
        return;
    }
    document.getElementById('studentsTableArea').innerHTML = renderStudentsTable(filtered, loc, true);
}

// 修改 renderStudentsTable 支持只顯示 _filteredDates
function renderStudentsTable(students, loc, onlyFilteredDates) {
    // 1. 按上課日期分組
    let dateGroups = {};
    students.forEach(stu => {
        let dates = onlyFilteredDates && stu._filteredDates ? stu._filteredDates.split('、').map(d => d.trim()).filter(Boolean) : (stu.dates || '').split('、').map(d => d.trim()).filter(Boolean);
        dates.forEach(date => {
            // 統一日期格式為 YYYY-MM-DD（支援：YYYY年M月D日、M月D日）
            let standardDate = date;
            const fullMatch = date.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            if (fullMatch) {
                standardDate = `${fullMatch[1]}-${String(fullMatch[2]).padStart(2,'0')}-${String(fullMatch[3]).padStart(2,'0')}`;
            } else {
                const mdMatch = date.match(/(\d{1,2})月(\d{1,2})日/);
                if (mdMatch) {
                    const y = new Date().getFullYear();
                    standardDate = `${y}-${String(mdMatch[1]).padStart(2,'0')}-${String(mdMatch[2]).padStart(2,'0')}`;
                }
            }
            if (!dateGroups[standardDate]) dateGroups[standardDate] = [];
            dateGroups[standardDate].push(stu);
        });
    });
    // 2. 生成HTML，分類格式和系統配置頁面一樣
    let html = '';
    // 按時間順序排序日期
    let sortedDates = sortDatesByChronologicalOrder(Object.keys(dateGroups));
    sortedDates.forEach(date => {
        let dateStudents = dateGroups[date];
        html += `<div style="margin-top:20px;display:flex;align-items:center;gap:10px;">
            <b style="color: #FF0000;">📅 ${date}</b> 
            <span style="font-size: 12px; color: #999;">(共 ${dateStudents.length} 名學生)</span>
        </div>`;
        html += '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">';
        html += '<tr style="background:#f5f5f5;">'
            + '<th style="border:1px solid #ddd;padding:8px;">選擇</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">姓名</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">年齡</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">課程類型</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">出席</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">補/調堂</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">上堂點數</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">時間</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">上課日期</th>'
            + '<th style="border:1px solid #ddd;padding:8px;">操作</th>'
            + '</tr>';
        // 這裡加排序：根據時間由早到晚
        dateStudents
            .sort((a, b) => compareTimes(a.time, b.time))
            .forEach((stu, idx) => {
                html += `<tr>
                    <td style="text-align:center;"><input type="checkbox" class="manageRowCheckbox"></td>
                    <td>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <input type="text" value="${stu.name}" onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'name')">
                            ${(() => {
                                try {
                                    const dateKey = typeof convertChineseDateToStandard === 'function' ? convertChineseDateToStandard((date||'').replace('🎈','').replace('🌟','')) : (date||'');
                                    const hasByFlag = (stu.hasBalloonMark === true) || (Array.isArray(stu.originalDates) && stu.originalDates.some(d => {
                                        const clean = (d||'').replace('🎈','').replace('🌟','');
                                        const std = typeof convertChineseDateToStandard === 'function' ? convertChineseDateToStandard(clean) : clean;
                                        return std === dateKey && d.includes('🎈');
                                    }));
                                    const hasStar = (stu.hasStarMark === true) || (Array.isArray(stu.originalDates) && stu.originalDates.some(d => {
                                        const clean = (d||'').replace('🎈','').replace('🌟','');
                                        const std = typeof convertChineseDateToStandard === 'function' ? convertChineseDateToStandard(clean) : clean;
                                        const starRegex = /[\u2B50\u2605\u2606\uD83C\uDF1F]/; // ⭐ ★ ☆ 🌟
                                        return std === dateKey && starRegex.test(d);
                                    }));
                                    return `${hasByFlag ? '<span title="🎈特別標記">🎈</span>' : ''}${hasStar ? '<span title="🌟特別標記" style="margin-left:2px;">🌟</span>' : ''}`;
                                } catch(e) { return '' }
                            })()}
                        </div>
                    </td>
                    <td><input type="text" value="${stu.age}" onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'age')"></td>
                    <td><input type="text" value="${stu.type}" onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'type')"></td>
                    <td><select onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'option1')" style="width: 80px;">
                        <option value="">--</option>
                        <option value="出席1" ${stu.option1==="出席1"?"selected":""}>出席1</option>
                        <option value="出席1.5" ${stu.option1==="出席1.5"?"selected":""}>出席1.5</option>
                        <option value="出席2" ${stu.option1==="出席2"?"selected":""}>出席2</option>
                        <option value="出席2.5" ${stu.option1==="出席2.5"?"selected":""}>出席2.5</option>
                        <option value="出席3" ${stu.option1==="出席3"?"selected":""}>出席3</option>
                        <option value="缺席" ${stu.option1==="缺席"?"selected":""}>缺席</option>
                    </select></td>
                    <td><select onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'option2')" style="width: 100px;">
                        <option value="">--</option>
                        <option value="🌟補0.5堂" ${stu.option2==="🌟補0.5堂"?"selected":""}>🌟補0.5堂</option>
                        <option value="🌟補1堂" ${stu.option2==="🌟補1堂"?"selected":""}>🌟補1堂</option>
                        <option value="🌟補1.5堂" ${stu.option2==="🌟補1.5堂"?"selected":""}>🌟補1.5堂</option>
                        <option value="🔁補1堂" ${stu.option2==="🔁補1堂"?"selected":""}>🔁補1堂</option>
                        <option value="🔁補1.5堂" ${stu.option2==="🔁補1.5堂"?"selected":""}>🔁補1.5堂</option>
                    </select></td>
                    <td><input type="text" value="${calculateOption3FromTimeDifference(stu.time, date, stu.type) || ''}" style="width: 60px; text-align: center;" readonly></td>
                    <td>
                        <input type="number" min="0" max="23" value="${stu.time?.split('-')[0]?.split(':')[0]||''}" style="width:40px;" onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'time')">:
                        <input type="number" min="0" max="59" value="${stu.time?.split('-')[0]?.split(':')[1]||''}" style="width:40px;" onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'time')"> -
                        <input type="number" min="0" max="23" value="${stu.time?.split('-')[1]?.split(':')[0]||''}" style="width:40px;" onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'time')">:
                        <input type="number" min="0" max="59" value="${stu.time?.split('-')[1]?.split(':')[1]||''}" style="width:40px;" onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'time')">
                    </td>
                    <td><input type="date" value="${date}" onchange="onStudentFieldChange(this, '${loc}', '${stu.name}', '${date}', 'date')"></td>
                    <td>
                        <button onclick="deleteStudentByInfo('${loc}', '${stu.name}', '${date}')" style="padding:4px 10px;background:#e74c3c;color:white;border:none;border-radius:3px;">刪除</button>
                    </td>
                </tr>`;
            });
        html += '</table>';
    });
    return html;
}

// flatpickr初始化時綁定header點擊事件

window.importStudentsToCloud = function(loc) {
    console.log('開始導入雲端，地點:', loc);
    
    let locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    let students = locationMap[loc] || [];
    console.log('本地學生數量:', students.length);
    
    // 只取勾選的學生（遍歷所有表格）
    let checkedStudents = [];
    const tables = document.getElementById('studentsTableArea')?.querySelectorAll('table');
    
    if (!tables || tables.length === 0) {
        alert('找不到學生表格，請先載入學生資料');
        return;
    }
    
    console.log('找到表格數量:', tables.length);
    
    tables.forEach((table, tableIndex) => {
        const trs = table.querySelectorAll('tr');
        console.log(`表格 ${tableIndex + 1} 有 ${trs.length} 行`);
        
        trs.forEach((tr, idx) => {
            if (idx === 0) return; // 跳過表頭
            const cb = tr.querySelector('.manageRowCheckbox');
            if (cb && cb.checked) {
                const tds = tr.querySelectorAll('td');
                console.log(`行 ${idx} 有 ${tds.length} 個欄位`);
                
                // 根據實際表格結構：勾選框(0), 姓名(1), 年齡(2), 課程類型(3), 出席(4), 補/調堂(5), 補/調堂點數(6), 時間(7), 上課日期(8), 操作(9)
                let name = tds[1]?.textContent.trim();
                let age = tds[2]?.textContent.trim().replace(/歲/g, '').trim(); // 移除"歲"字
                let type = tds[3]?.textContent.trim();
                let option1 = tds[4]?.querySelector('select')?.value || '';
                let option2 = tds[5]?.querySelector('select')?.value || '';
                let option3 = tds[6]?.querySelector('input')?.value || '';
                let time = tds[7]?.textContent.trim();
                let date = tds[8]?.textContent.trim();
                
                // 調試：輸出每個欄位的原始內容
                console.log('欄位調試:', {
                    'tds[1]': tds[1]?.textContent,
                    'tds[2]': tds[2]?.textContent,
                    'tds[3]': tds[3]?.textContent,
                    'tds[7]': tds[7]?.textContent,
                    'tds[8]': tds[8]?.textContent
                });
                
                // 調試：輸出每個欄位的原始內容
                console.log('欄位調試:', {
                    'tds[1]': tds[1]?.textContent,
                    'tds[2]': tds[2]?.textContent,
                    'tds[3]': tds[3]?.textContent,
                    'tds[7]': tds[7]?.textContent,
                    'tds[8]': tds[8]?.textContent
                });
                
                console.log('勾選學生:', { name, age, type, time, date });
                
                // 檢查日期是否為空
                if (!date || date.trim() === '') {
                    console.log('警告：學生缺少日期:', { name, date, tdsLength: tds.length });
                    return; // 跳過沒有日期的學生
                }
                
                // 根據姓名+日期找原始學生，保留下拉選單
                console.log('開始比對學生:', { name, date });
                console.log('本地學生列表:', students.map(s => ({ name: s.name, dates: s.dates })));
                
                let stu = students.find(s => {
                    // 首先檢查姓名是否匹配
                    if (s.name !== name) return false;
                    
                    // 檢查日期匹配，使用單一日期欄位
                    let stuDate = s["上課日期"] || s.date || '';
                    
                    console.log(`比對學生 ${s.name}:`, { 
                        's.name': s.name, 
                        'name': name, 
                        's["上課日期"]': s["上課日期"], 
                        's.date': s.date,
                        'stuDate': stuDate, 
                        'date': date,
                        'nameMatch': s.name === name,
                        'dateMatch': stuDate === date
                    });
                    
                    return stuDate === date;
                });
                
                if (stu) {
                    console.log('找到原始學生資料:', stu);
                    // 使用本地資料，但合併表格中的下拉選單值
                    let mergedStudent = { 
                        ...stu, 
                        date,
                        select1: option1 || stu.select1 || '',
                        select2: option2 || stu.select2 || '',
                        option3: option3 || stu.option3 || ''
                    };
                    checkedStudents.push(mergedStudent);
                } else {
                    console.log('找不到原始學生資料，使用表格資料');
                    // 如果找不到原始資料，使用表格資料
                    let tableStudent = {
                        name: name,
                        age: age,
                        type: type,
                        time: time,
                        location: loc,
                        phone: '',
                        wait: '',
                        "上課日期": date,
                        date: date,
                        select1: option1,
                        select2: option2,
                        option3: option3
                    };
                    checkedStudents.push(tableStudent);
                }
            }
        });
    });
    
    console.log('勾選的學生數量:', checkedStudents.length);
    
    if (checkedStudents.length === 0) {
        alert('請至少勾選一位學生');
        return;
    }
    
    // 分組：按日期分組
    let groupMap = {};
    checkedStudents.forEach(stu => {
        let date = stu.date || stu.dates;
        if (!date) {
            console.log('學生缺少日期:', stu);
            return;
        }
        
        if (!groupMap[date]) groupMap[date] = [];
        let stuObj = {
            name: stu.name,
            age: stu.age,
            type: stu.type,
            time: stu.time,
            location: stu.location || loc,
            Phone_number: stu.phone || '',
            待約: stu.wait || '',
            待約月份: stu.waitMonth || '',
            option1: stu.select1 || "",
            option2: stu.select2 || "",
            option3: stu.option3 || "",
            remark: stu.remark || "",
            "上課日期": date
        };
        groupMap[date].push(stuObj);
        console.log('準備上傳學生:', stuObj);
    });
    
    let grouped = Object.keys(groupMap).map(date => ({
        date: date,
        students: groupMap[date]
    }));
    
    console.log('準備上傳的資料:', grouped);
    
    ipcRenderer.invoke('import-students-to-cloud', grouped)
        .then(result => {
            console.log('上傳結果:', result);
            if (result.success) {
                alert('導入雲端成功！');
            } else {
                alert('導入失敗：' + result.error);
            }
        })
        .catch(error => {
            console.error('上傳過程出錯:', error);
            alert('導入失敗：' + error.message);
        });
}

// ... existing code ...
function filterNonEmptyFields(obj) {
    const result = {};
    for (const key in obj) {
        if (
            obj[key] !== undefined &&
            obj[key] !== null &&
            obj[key] !== ''
        ) {
            result[key] = obj[key];
        }
    }
    return result;
}


// ... existing code ...

// 新增刷新功能
window.refreshStudents = function(loc) {
    let locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    if (locationMap[loc]) {
        locationMap[loc] = [];
        localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
    }
    showStudentsByLocation(loc);
}

// ... existing code ...
// 全選功能（僅針對當前表格）
window.toggleSelectAllManageRowsTable = function(checkbox) {
    // 只影響同一個table下的checkbox
    const table = checkbox.closest('table');
    if (!table) return;
    const checkboxes = table.querySelectorAll('.manageRowCheckbox');
    checkboxes.forEach(cb => { 
        cb.checked = checkbox.checked; 
        // 觸發change事件（如有需要）
        cb.dispatchEvent(new Event('change'));
    });
}
// ... existing code ...

window.renderCloudStudentsPage = function(grouped) {
    let html = `
        <div style='margin:10px 0 20px 0;'>
            <div style='display:inline-block;position:relative;'>
                <input id='cloudSearchName' autocomplete='off' placeholder='學生姓名' style='padding:4px 8px;width:120px;margin-right:8px;'>
            </div>
            <button onclick="searchCloudStudents()" style='padding:4px 12px;'>搜索</button>
            <button onclick="resetCloudSearch()" style='padding:4px 12px;margin-left:5px;'>重置</button>
        </div>
    `;
    grouped.forEach(group => {
        html += `<div style="margin-top:20px;"><b>${group.date}</b></div>`;
        html += '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">';
        html += '<tr><th></th><th>姓名</th><th>年齡</th><th>課程類型</th><th>出席</th><th>補/調堂</th><th>補/調堂點數</th><th>時間</th><th>上課日期</th></tr>';
        (Array.isArray(group.students) ? group.students : [])
            .filter(stu => stu && stu.name)
            .forEach(stu => {
                html += `<tr>
                    <td style="text-align:center;"><input type="checkbox"></td>
                    <td>${stu.name}</td>
                    <td>${stu.age}</td>
                    <td>${stu.type}</td>
                    <td>
                        <select>
                            <option value="">--</option>
                            <option value="✅" ${stu.option1==="✅"?"selected":""}>✅</option>
                            <option value="❌" ${stu.option1==="❌"?"selected":""}>❌</option>
                            <option value="✅🎁✅" ${stu.option1==="✅🎁✅"?"selected":""}>✅🎁✅</option>
                            <option value="💪" ${stu.option1==="💪"?"selected":""}>💪</option>
                        </select>
                    </td>
                    <td>
                        <select>
                            <option value="">--</option>
                            <option value="🌟補0.5堂" ${stu.option2==="🌟補0.5堂"?"selected":""}>🌟補0.5堂</option>
                            <option value="🌟補1堂" ${stu.option2==="🌟補1堂"?"selected":""}>🌟補1堂</option>
                            <option value="🌟補1.5堂" ${stu.option2==="🌟補1.5堂"?"selected":""}>🌟補1.5堂</option>
                            <option value="🔁補1堂" ${stu.option2==="🔁補1堂"?"selected":""}>🔁補1堂</option>
                            <option value="🔁補1.5堂" ${stu.option2==="🔁補1.5堂"?"selected":""}>🔁補1.5堂</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" value="${stu.option3 || ''}" style="width: 60px; text-align: center;" readonly>
                    </td>
                    <td>${stu.time}</td>
                    <td>${group.date}</td>
                </tr>`;
            });
        html += '</table>';
    });
    document.getElementById('cloudStudentsList').innerHTML = html;
}

// 保持 deleteLocation 函數
window.deleteLocation = function(loc) {
    if (!confirm(`確定要刪除地點「${loc}」及其所有學生資料嗎？此操作不可恢復！`)) return;
    let locationMap = {};
    try {
        locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    } catch (e) {}
    delete locationMap[loc];
    localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
    loadStudentsContent();
};

// 雲端學生表格欄位變更處理函數
window.onCloudStudentFieldChange = function(input, originalName, originalDate, field) {
    let val = input.value;
    let newStudentData = {
        name: originalName,
        age: '',
        type: '',
        time: '',
        date: originalDate,
        option1: '',
        option2: '',
        option3: '',
        phone: '',
        待約: '',
        待約月份: ''
    };
    
    // 獲取當前行的所有數據
    let tr = input.closest('tr');
    let tds = tr.querySelectorAll('td');
    
    // 從表格中讀取當前值（根據實際表格結構）
    newStudentData.name = tds[1].querySelector('input')?.value || originalName;
    newStudentData.age = tds[2].querySelector('input')?.value || '';
    newStudentData.phone = tds[3].querySelector('input')?.value || '';
    newStudentData.type = tds[4].querySelector('input')?.value || '';
    newStudentData.待約 = tds[5].querySelector('input')?.value || '';
    newStudentData.待約月份 = tds[6].querySelector('input')?.value || '';
    newStudentData.option1 = tds[7].querySelector('select')?.value || '';
    newStudentData.option2 = tds[8].querySelector('select')?.value || '';
    newStudentData.option3 = tds[9].querySelector('input')?.value || '';
    
    // 從原始數據中獲取location（上課地點），因為表格中沒有顯示這個欄位
    // 需要從雲端緩存中獲取原始數據
    if (window.cloudStudentsGrouped) {
        for (let group of window.cloudStudentsGrouped) {
            for (let stu of group.students) {
                if (stu.name === originalName && stu["上課日期"] === originalDate) {
                    newStudentData.location = stu.location || '';
                    break;
                }
            }
        }
    }
    
    // 處理時間欄位
    let timeInputs = tds[10].querySelectorAll('input');
    if (timeInputs.length === 4) {
        let sh = String(timeInputs[0]?.value).padStart(2,'0');
        let sm = String(timeInputs[1]?.value).padStart(2,'0');
        let eh = String(timeInputs[2]?.value).padStart(2,'0');
        let em = String(timeInputs[3]?.value).padStart(2,'0');
        newStudentData.time = (sh && sm && eh && em) ? `${sh}:${sm}-${eh}:${em}` : '';
    }
    
    // 處理日期欄位
    if (field === 'date') {
        newStudentData.date = val;
    } else {
        newStudentData.date = tds[11].querySelector('input')?.value || originalDate;
    }
    
    // 確保日期格式正確（如果是日期選擇器的值，需要保持原格式）
    if (field === 'date' && val) {
        // 如果新日期不包含🎈符號，但原日期包含，則保留🎈符號
        if (!val.includes('🎈') && originalDate.includes('🎈')) {
            newStudentData.date = val + '🎈';
        }
    }
    
    // 重新計算選項3
    if (newStudentData.time && newStudentData.date) {
        newStudentData.option3 = calculateOption3FromTimeDifference(newStudentData.time, newStudentData.date, newStudentData.type);
        // 更新選項3顯示
        tds[9].querySelector('input').value = newStudentData.option3;
    }
    
    console.log(`雲端學生欄位變更: ${originalName} - ${originalDate} - ${field} = ${val}`);
    
    // 更新雲端資料庫（只更新本地緩存）
    updateCloudStudent(originalName, originalDate, newStudentData);
};

// 雲端學生時間欄位變更處理函數
window.onCloudStudentTimeChange = function(input, originalName, originalDate) {
    // 直接調用欄位變更函數，因為時間變更也需要更新其他欄位
    onCloudStudentFieldChange(input, originalName, originalDate, 'time');
};

// ... existing code ...
window.onStudentFieldChange = function(input, loc, name, date, field) {
    // 1. 讀取 localStorage
    let locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    let students = locationMap[loc] || [];
    // 2. 找到對應學生（根據姓名+日期）
    let stu = students.find(s => {
        let stuDates = (s.dates || '').split('、').map(d => d.trim()).filter(Boolean);
        return s.name === name && stuDates.includes(date);
    });
    if (!stu) return;
    // 3. 根據 field 更新對應欄位
    let val = input.value;
    if (field === 'time') {
        // 取同一行的4個 input 組合
        let tr = input.closest('tr');
        let nums = tr.querySelectorAll('td')[7].querySelectorAll('input');
        let sh = String(nums[0]?.value).padStart(2,'0');
        let sm = String(nums[1]?.value).padStart(2,'0');
        let eh = String(nums[2]?.value).padStart(2,'0');
        let em = String(nums[3]?.value).padStart(2,'0');
        stu.time = (sh && sm && eh && em) ? `${sh}:${sm}-${eh}:${em}` : '';
    } else if (field === 'date') {
        // 更新日期（同時更新 dates）
        let oldDates = (stu.dates || '').split('、').map(d => d.trim()).filter(Boolean);
        let idx = oldDates.indexOf(date);
        if (idx !== -1) oldDates[idx] = val;
        stu.dates = oldDates.join('、');
    } else {
        stu[field] = val;
    }
    // 4. 寫回 localStorage
    localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
    // 5. 自動上傳到雲端
    if (typeof window.importStudentsToCloud === 'function') {
        window.importStudentsToCloud(loc);
    }
};
// ... existing code ...

// 系統配置搜索功能
window.initializeConfigSearch = function() {
    // 綁定搜索事件
    document.getElementById('configNameSearch').addEventListener('input', filterConfigStudents);
    document.getElementById('configLocationSearch').addEventListener('change', filterConfigStudents);
    document.getElementById('configDateSearch').addEventListener('change', filterConfigStudents);
    
    // 初始化地點下拉選單
    updateLocationOptions();
}

function updateLocationOptions() {
    const locationSelect = document.getElementById('configLocationSearch');
    if (!locationSelect) return;
    
    // 清空現有選項（保留"全部地點"）
    locationSelect.innerHTML = '<option value="">全部地點</option>';
    
    // 從雲端數據中獲取所有地點
    if (window.cloudStudentsGrouped) {
        let locations = new Set();
        window.cloudStudentsGrouped.forEach(group => {
            group.students.forEach(student => {
                if (student.location) {
                    // 標準化地點名稱，移除表情符號和多餘空格
                    let normalizedLocation = student.location
                        .replace(/[🏊‍♂🏊♂]/g, '') // 移除游泳表情符號
                        .replace(/\s+/g, ' ') // 將多個空格替換為單個空格
                        .trim(); // 移除首尾空格
                    
                    if (normalizedLocation) {
                        locations.add(normalizedLocation);
                    }
                }
            });
        });
        
        // 添加地點選項
        Array.from(locations).sort().forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationSelect.appendChild(option);
        });
        
        console.log('📍 更新地點選項:', Array.from(locations).sort());
    }
}

function filterConfigStudents() {
    const nameSearch = document.getElementById('configNameSearch').value.trim().toLowerCase();
    const locationSearch = document.getElementById('configLocationSearch').value;
    const dateSearch = document.getElementById('configDateSearch').value;
    
    // 過濾數據
    let filteredGroups = [];
    if (window.cloudStudentsGrouped) {
        window.cloudStudentsGrouped.forEach(group => {
            let filteredStudents = group.students.filter(student => {
                // 姓名搜索
                if (nameSearch && !student.name.toLowerCase().includes(nameSearch)) {
                    return false;
                }
                
                // 地點搜索
                if (locationSearch && student.location !== locationSearch) {
                    return false;
                }
                
                // 日期搜索
                if (dateSearch) {
                    let studentDate = student['上課日期'];
                    if (studentDate) {
                        // 移除特殊字符並比較日期
                        let cleanStudentDate = studentDate.replace(/[🎈🎁]/g, '').trim();
                        let cleanSearchDate = dateSearch;
                        
                        // 如果學生日期是中文格式，轉換為標準格式
                        if (cleanStudentDate.match(/^\d{1,2}月\d{1,2}日$/)) {
                            cleanStudentDate = convertChineseDateToStandard(cleanStudentDate);
                        }
                        
                        if (cleanStudentDate !== cleanSearchDate) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
                
                return true;
            });
            
            if (filteredStudents.length > 0) {
                filteredGroups.push({
                    date: group.date,
                    students: filteredStudents
                });
            }
        });
    }
    
    // 渲染過濾後的數據
    renderFilteredCloudStudents(filteredGroups);
}

function renderFilteredCloudStudents(filteredGroups) {
    if (filteredGroups.length === 0) {
        document.getElementById('cloudStudentsList').innerHTML = '<p style="text-align:center;color:#999;padding:20px;">沒有找到符合條件的學生資料</p>';
        return;
    }
    
    // 使用現有的渲染邏輯，但傳入過濾後的數據
    let allStudents = [];
    filteredGroups.forEach(group => {
        group.students.forEach(stu => {
            allStudents.push({...stu, "上課日期": group.date});
        });
    });
    
    // 按上課地點分組
    let locationGroups = {};
    allStudents.forEach(stu => {
        let location = stu.location || '未知地點';
        if (!locationGroups[location]) {
            locationGroups[location] = [];
        }
        locationGroups[location].push(stu);
    });
    
    // 生成表格，按地點分類
    let html = '';
    Object.keys(locationGroups).sort().forEach(location => {
        let students = locationGroups[location];
        
        // 按日期分組
        let dateGroups = {};
        students.forEach(stu => {
            let date = stu["上課日期"];
            if (!dateGroups[date]) dateGroups[date] = [];
            dateGroups[date].push(stu);
        });
        
        // 為每個地點生成表格標題
        let totalStudentsInLocation = students.length;
        html += `<div style="margin-top:20px;"><b style="font-size: 16px; color: #333;">📍 ${location}</b> <span style="font-size: 12px; color: #999;">(共 ${totalStudentsInLocation} 名學生)</span></div>`;
        
        // 添加全選按鈕
        html += `<div style="margin:10px 0;">
            <input type="checkbox" id="selectAll_${location.replace(/\s+/g, '_')}" onchange="toggleSelectAllInLocation('${location}', this)" style="margin-right:8px;">
            <label for="selectAll_${location.replace(/\s+/g, '_')}" style="cursor:pointer;font-weight:bold;color:#3498db;">全選 ${location}</label>
        </div>`;
        
        // 按時間順序排序日期
        let sortedDates = sortCloudDatesByChronologicalOrder(Object.keys(dateGroups));
        sortedDates.forEach(date => {
            let dateStudents = dateGroups[date];
            html += `<div style="margin-top:10px;margin-left:20px;display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="selectAllDate_${location.replace(/\s+/g, '_')}_${date.replace(/[^a-zA-Z0-9]/g, '_')}" onchange="toggleSelectAllInDate('${location}', '${date}', this)" style="margin-right:8px;">
                <b style="color: #FF0000;">📅 ${date}</b> 
                <span style="font-size: 12px; color: #999;">(共 ${dateStudents.length} 名學生)</span>
            </div>`;
            html += '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">';
            html += '<tr style="background:#f5f5f5;"><th style="border:1px solid #ddd;padding:8px;">選擇</th><th style="border:1px solid #ddd;padding:8px;">姓名</th><th style="border:1px solid #ddd;padding:8px;">年齡</th><th style="border:1px solid #ddd;padding:8px;">電話號碼</th><th style="border:1px solid #ddd;padding:8px;">課程類型</th><th style="border:1px solid #ddd;padding:8px;">待約</th><th style="border:1px solid #ddd;padding:8px;">待約月份</th><th style="border:1px solid #ddd;padding:8px;">出席</th><th style="border:1px solid #ddd;padding:8px;">補/調堂</th><th style="border:1px solid #ddd;padding:8px;">補/調堂點數</th><th style="border:1px solid #ddd;padding:8px;">時間</th><th style="border:1px solid #ddd;padding:8px;">上課日期</th><th style="border:1px solid #ddd;padding:8px;">操作</th><th style="border:1px solid #ddd;padding:8px;">請假</th></tr>';
            
            dateStudents.forEach(stu => {
                // 解析時間格式
                let timeStart = '', timeEnd = '';
                if (stu.time) {
                    console.log(`解析時間: ${stu.time}`);
                    let timeParts = stu.time.split('-');
                    if (timeParts.length === 2) {
                        let startTime = timeParts[0].trim();
                        let endTime = timeParts[1].trim();
                        
                        // 處理開始時間
                        if (startTime.includes(':')) {
                            timeStart = startTime;
                        } else {
                            // 如果只有數字，假設是小時，補充分鐘
                            let startHour = parseInt(startTime);
                            if (!isNaN(startHour)) {
                                timeStart = `${String(startHour).padStart(2, '0')}:00`;
                            }
                        }
                        
                        // 處理結束時間
                        if (endTime.includes(':')) {
                            timeEnd = endTime;
                        } else {
                            // 如果只有數字，假設是小時，補充分鐘
                            let endHour = parseInt(endTime);
                            if (!isNaN(endHour)) {
                                timeEnd = `${String(endHour).padStart(2, '0')}:00`;
                            }
                        }
                        
                        console.log(`解析結果: ${timeStart} - ${timeEnd}`);
                    }
                }
                
                // 解析日期格式
                let dateValue = '';
                if (stu['上課日期']) {
                    // 移除特殊字符（如🎈）並提取日期部分
                    let cleanDate = stu['上課日期'].replace(/🎈/g, '').trim();
                    let dateMatch = cleanDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                    if (dateMatch) {
                        dateValue = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[3]).padStart(2,'0')}`;
                    } else {
                        // 如果標準格式不匹配，嘗試其他格式
                        let alternativeMatch = cleanDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                        if (alternativeMatch) {
                            dateValue = `${alternativeMatch[1]}-${String(alternativeMatch[2]).padStart(2,'0')}-${String(alternativeMatch[3]).padStart(2,'0')}`;
                        } else {
                            // 如果都不匹配，直接使用原始值
                            dateValue = cleanDate;
                        }
                    }
                }
                
                // 讀取請假狀態
                let leaveMap = {};
                try { leaveMap = JSON.parse(localStorage.getItem('leaveStatusMap') || '{}'); } catch(e) {}
                const key = `${stu.name}|${stu.Phone_number||stu.phone||''}|${stu['上課日期']}`;
                const leaveOn = !!leaveMap[key];
                
                html += `<tr>
                    <td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.name || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'name')" style="width: 80px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.age || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'age')" style="width: 60px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.Phone_number || stu.phone || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'phone')" style="width: 100px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.type || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'type')" style="width: 120px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.待約 || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', '待約')" style="width: 80px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="text" value="${stu.待約月份 || ''}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', '待約月份')" style="width: 80px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <select onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'option1')" style="width: 80px;">
                            <option value="">--</option>
                            <option value="出席1" ${stu.option1==="出席1"?"selected":""}>1</option>
                            <option value="出席1.5" ${stu.option1==="出席1.5"?"selected":""}>1.5</option>
                            <option value="出席2" ${stu.option1==="出席2"?"selected":""}>2</option>
                            <option value="出席2.5" ${stu.option1==="出席2.5"?"selected":""}>2.5</option>
                            <option value="出席3" ${stu.option1==="出席3"?"selected":""}>3</option>
                            <option value="缺席" ${stu.option1==="缺席"?"selected":""}>缺席</option>
                        </select>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <select onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'option2')" style="width: 100px;">
                            <option value="">--</option>
                            <option value="🌟補0.5堂" ${stu.option2==="🌟補0.5堂"?"selected":""}>🌟0.5</option>
                            <option value="🌟補1堂" ${stu.option2==="🌟補1堂"?"selected":""}>🌟1</option>
                            <option value="🌟補1.5堂" ${stu.option2==="🌟補1.5堂"?"selected":""}>🌟1.5</option>
                            <option value="🔁補1堂" ${stu.option2==="🔁補1堂"?"selected":""}>🔁1</option>
                            <option value="🔁補1.5堂" ${stu.option2==="🔁補1.5堂"?"selected":""}>🔁1.5</option>
                            <option value="🔁補1.5堂" ${stu.option2==="🔁補2堂"?"selected":""}>🔁2</option>
                            <option value="🔁補1.5堂" ${stu.option2==="🔁補2.5堂"?"selected":""}>🔁2.5</option>
                        </select>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="text" value="${stu.option3 || ''}" style="width: 60px; text-align: center;" readonly>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="number" min="0" max="23" value="${timeStart.includes(':') ? timeStart.split(':')[0] || '' : ''}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}')">:
                        <input type="number" min="0" max="59" value="${timeStart.includes(':') ? timeStart.split(':')[1] || '' : ''}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}')"> -
                        <input type="number" min="0" max="23" value="${timeEnd.includes(':') ? timeEnd.split(':')[0] || '' : ''}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}')">:
                        <input type="number" min="0" max="59" value="${timeEnd.includes(':') ? timeEnd.split(':')[1] || '' : ''}" style="width:40px;" onchange="onCloudStudentTimeChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}')">
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;"><input type="date" value="${dateValue}" onchange="onCloudStudentFieldChange(this, '${stu.name || ''}', '${stu['上課日期'] || ''}', 'date')" style="width:130px; border: none; background: transparent;"></td>
                    <td style="border:1px solid #ddd;padding:8px;text-align:center;">
                        <button onclick="deleteCloudStudent('${stu.name || ''}', '${stu['上課日期'] || ''}')" style="padding:4px 10px;background:#e74c3c;color:white;border:none;border-radius:3px;">刪除</button>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;text-align:center;">
                        <button onclick="toggleLeaveForStudent('${stu.name || ''}', '${stu.Phone_number || stu.phone || ''}', '${stu['上課日期'] || ''}', '${stu.option3 || ''}', '${stu.option1 || ''}', '${stu.option2 || ''}', this)" style="padding:4px 10px;background:${leaveOn ? '#34495e' : '#e67e22'};color:white;border:none;border-radius:3px;">請假</button>
                    </td>
                </tr>`;
            });
            html += '</table>';
        });
    });
    
    document.getElementById('cloudStudentsList').innerHTML = html;
}

function resetConfigSearch() {
    document.getElementById('configNameSearch').value = '';
    document.getElementById('configLocationSearch').value = '';
    document.getElementById('configDateSearch').value = '';
    
    // 重新渲染所有數據
    renderCloudStudentsTableFromCache();
}

// 獲取當前顯示的學生數據（考慮搜索條件）
function getCurrentDisplayedStudents() {
    const nameSearch = document.getElementById('configNameSearch').value.trim().toLowerCase();
    const locationSearch = document.getElementById('configLocationSearch').value;
    const dateSearch = document.getElementById('configDateSearch').value;
    
    let currentStudents = [];
    
    // 如果有搜索條件，使用過濾後的數據
    if (nameSearch || locationSearch || dateSearch) {
        if (window.cloudStudentsGrouped) {
            window.cloudStudentsGrouped.forEach(group => {
                let filteredStudents = group.students.filter(student => {
                    // 姓名搜索
                    if (nameSearch && !student.name.toLowerCase().includes(nameSearch)) {
                        return false;
                    }
                    
                    // 地點搜索
                    if (locationSearch) {
                        // 標準化學生地點名稱
                        let normalizedStudentLocation = student.location
                            .replace(/[🏊‍♂🏊♂]/g, '') // 移除游泳表情符號
                            .replace(/\s+/g, ' ') // 將多個空格替換為單個空格
                            .trim(); // 移除首尾空格
                        
                        if (normalizedStudentLocation !== locationSearch) {
                            return false;
                        }
                    }
                    
                    // 日期搜索
                    if (dateSearch) {
                        let studentDate = student['上課日期'];
                        if (studentDate) {
                            // 移除特殊字符並比較日期
                            let cleanStudentDate = studentDate.replace(/[🎈🎁]/g, '').trim();
                            let cleanSearchDate = dateSearch;
                            
                            // 如果學生日期是中文格式，轉換為標準格式
                            if (cleanStudentDate.match(/^\d{1,2}月\d{1,2}日$/)) {
                                cleanStudentDate = convertChineseDateToStandard(cleanStudentDate);
                            }
                            
                            if (cleanStudentDate !== cleanSearchDate) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    }
                    
                    return true;
                });
                
                filteredStudents.forEach(stu => {
                    currentStudents.push({...stu, "上課日期": group.date});
                });
            });
        }
    } else {
        // 如果沒有搜索條件，使用所有數據
        if (window.cloudStudentsGrouped) {
            window.cloudStudentsGrouped.forEach(group => {
                group.students.forEach(stu => {
                    currentStudents.push({...stu, "上課日期": group.date});
                });
            });
        }
    }
    
    return currentStudents;
}

// 新增：查詢「待約」學生（去重：姓名+電話）
window.filterWaitStudents = function() {
    if (!window.cloudStudentsGrouped || window.cloudStudentsGrouped.length === 0) {
        alert('尚未載入雲端學生資料');
        return;
    }
    // 收集所有學生並附帶日期
    let all = [];
    window.cloudStudentsGrouped.forEach(group => {
        (group.students || []).forEach(stu => {
            all.push({...stu, "上課日期": group.date});
        });
    });
    // 過濾「待約」欄有內容
    let waitList = all.filter(s => {
        const waitVal = (s.待約 || s.wait || '').toString().trim();
        return waitVal.length > 0;
    });
    // 以 姓名+電話 去重
    const seen = new Set();
    const deduped = [];
    waitList.forEach(s => {
        const name = (s.name || '').trim();
        const phone = (s.Phone_number || s.phone || '').toString().trim();
        const key = `${name}__${phone}`;
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(s);
        }
    });
    // 轉回渲染所需的分組格式：按日期分組
    const groupsMap = {};
    deduped.forEach(s => {
        const date = s['上課日期'];
        if (!groupsMap[date]) groupsMap[date] = [];
        groupsMap[date].push(s);
    });
    const groups = Object.keys(groupsMap).sort((a,b)=> new Date(a)-new Date(b)).map(date => ({ date, students: groupsMap[date] }));
    // 渲染
    renderFilteredCloudStudents(groups);
}

// 生成課表功能
window.generateTimetable = function() {
    // 獲取當前顯示的學生數據（考慮搜索條件）
    let currentStudents = getCurrentDisplayedStudents();
    
    // 按日期和地點分組
    let timetableData = {};
    currentStudents.forEach(student => {
        let date = student['上課日期'];
        let location = student.location || '未知地點';
        
        if (!timetableData[date]) {
            timetableData[date] = {};
        }
        if (!timetableData[date][location]) {
            timetableData[date][location] = []; 
        }
        
        timetableData[date][location].push(student);
    });
    
    // 生成課表文本
    let timetableText = '';
    let sortedDates = Object.keys(timetableData).sort((a, b) => new Date(a) - new Date(b));
    
    sortedDates.forEach(date => {
        // 解析日期格式
        let dateObj;
        let cleanDate = date.replace(/🎈/g, '').trim();
        let dateMatch = cleanDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        
        if (dateMatch) {
            dateObj = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
        } else {
            // 嘗試其他日期格式
            let alternativeMatch = cleanDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            if (alternativeMatch) {
                dateObj = new Date(alternativeMatch[1], alternativeMatch[2] - 1, alternativeMatch[3]);
            } else {
                dateObj = new Date(date);
            }
        }
        
        let weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][dateObj.getDay()];
        let month = dateObj.getMonth() + 1;
        let day = dateObj.getDate();
        
        // 添加日期標題（按照樣本格式）
        timetableText += `${month}/${day}\n`;
        timetableText += `${weekday}\n`;
        
        // 按地點排序
        let sortedLocations = Object.keys(timetableData[date]).sort();
        
        sortedLocations.forEach(location => {
            timetableText += `${location}\n\n`;
            
            // 按時間分組
            let timeGroups = {};
            timetableData[date][location].forEach(student => {
                let time = student.time || '';
                if (!timeGroups[time]) {
                    timeGroups[time] = [];
                }
                timeGroups[time].push(student);
            });
            
            // 按時間順序排列（使用時間比較函數）
            let sortedTimes = Object.keys(timeGroups).sort((a, b) => {
                return compareTimes(a, b);
            });
            
            sortedTimes.forEach(time => {
                let students = timeGroups[time];
                
                // 生成時間段標題（按照樣本格式）
                let timeTitle = time;
                let courseType = '';
                
                // 檢查是否有課程類型
                if (students.length > 0) {
                    // 收集所有課程類型
                    let types = [...new Set(students.map(s => s.type).filter(t => t))];
                    if (types.length > 0) {
                        courseType = types.join(' ');
                    }
                }
                
                if (courseType) {
                    timeTitle += `(${courseType})`;
                }
                
                // 檢查是否有特殊標記（如🌟）
                let hasSpecialMark = students.some(student => 
                    (student.option1 && student.option1.includes('🌟')) ||
                    (student.option2 && student.option2.includes('🌟')) ||
                    (student.option1 && student.option1.includes('1:1'))
                );
                
                if (hasSpecialMark) {
                    timeTitle = `🌟${timeTitle}🌟`;
                }
                
                timetableText += `${timeTitle}\n`;
                
                // 按課程類型分組學生
                let typeGroups = {};
                students.forEach(student => {
                    let type = student.type || '';
                    if (!typeGroups[type]) {
                        typeGroups[type] = [];
                    }
                    typeGroups[type].push(student);
                });
                
                // 按課程類型排序並顯示學生
                Object.keys(typeGroups).sort().forEach(type => {
                    let typeStudents = typeGroups[type];
                    
                    // 對每個課程類型內的學生按時間排序
                    typeStudents.sort((a, b) => {
                        return compareTimes(a.time, b.time);
                    });
                    
                    typeStudents.forEach(student => {
                        let studentInfo = '';
                        
                        // 添加課程類型標記（按照樣本格式）
                        if (student.type) {
                            studentInfo += `（${student.type}）`;
                        }
                        
                        // 添加學生姓名
                        studentInfo += student.name;
                        
                        // 添加年齡（如果有）
                        if (student.age) {
                            studentInfo += `👶🏻${student.age}`;
                        }
                        
                        // 添加特殊標記（如🎈）
                        if (student.option1 && student.option1.includes('🎈')) {
                            let match = student.option1.match(/🎈([^🎈]*)/);
                            if (match) {
                                studentInfo += `🎈${match[1]}`;
                            }
                        }
                        
                        // 添加補堂信息
                        if (student.option2 && student.option2.includes('補')) {
                            studentInfo += ` 🌟${student.option2}`;
                        }
                        
                        timetableText += `${studentInfo}\n`;
                    });
                });
                
                timetableText += '\n';
            });
        });
        
        // 添加統計信息
        let stats = calculateStatsForDate(timetableData[date]);
        if (stats.length > 0) {
            stats.forEach(stat => {
                timetableText += `${stat}\n`;
            });
        }
        
        timetableText += '\n';
    });
    
    // 如果沒有數據，顯示提示信息
    if (!timetableText.trim()) {
        timetableText = '暫無課表數據';
    }
    
    // 顯示課表
    document.getElementById('timetableContent').value = timetableText;
    document.getElementById('timetableModal').style.display = 'flex';
}

// 計算統計信息
function calculateStatsForDate(dateData) {
    let stats = [];
    let instructorStats = {};
    
    // 統計每個教練的課程數量
    Object.keys(dateData).forEach(location => {
        dateData[location].forEach(student => {
            if (student.type) {
                let instructor = student.type;
                if (!instructorStats[instructor]) {
                    instructorStats[instructor] = 0;
                }
                instructorStats[instructor]++;
            }
        });
    });
    
    // 生成統計信息（按照樣本格式）
    Object.keys(instructorStats).forEach(instructor => {
        let count = instructorStats[instructor];
        // 檢查是否有教練姓名
        if (instructor.includes('：')) {
            stats.push(`${instructor}${count}`);
        } else {
            stats.push(`${instructor}：${count}`);
        }
    });
    
    return stats;
}

window.hideTimetableModal = function() {
    document.getElementById('timetableModal').style.display = 'none';
}

window.copyTimetable = function() {
    const textarea = document.getElementById('timetableContent');
    textarea.select();
    document.execCommand('copy');
    alert('課表已複製到剪貼板！');
}

// 教練工時相關功能
window.loadCoachContent = function() {
    // 初始化教練選擇器
    initializeCoachSelector();
    // 初始化月份選擇器
    initializeMonthSelector();
    // 初始化地點選擇器
    initializeLocationSelector();
    // 初始化泳會選擇器
    initializeClubSelector();
    // 初始化更表月份下拉
    initializeRosterMonthSelector();
    
    // 設置自動刷新機制，每30秒檢查一次工時記錄更新
    if (window.coachAutoRefreshInterval) {
        clearInterval(window.coachAutoRefreshInterval);
    }
    
    window.coachAutoRefreshInterval = setInterval(() => {
        // 只有在教練頁面可見且有完整選擇時才自動刷新
        const coachTab = document.getElementById('coachTab');
        if (coachTab && coachTab.style.display !== 'none') {
            const coachSelector = document.getElementById('coachSelector');
            const monthSelect = document.getElementById('coachMonthSelect');
            const locationSelect = document.getElementById('coachLocationSelect');
            const clubSelect = document.getElementById('coachClubSelect');
            
            if (coachSelector.value && monthSelect.value && locationSelect.value && clubSelect.value) {
                // 靜默刷新，不顯示載入提示
                silentRefreshCoachWorkHours();
            }
        }
    }, 30000); // 30秒刷新一次
}

// 顯示新增教練彈窗
window.showAddCoachModal = function() {
    document.getElementById('addCoachModal').style.display = 'flex';
    document.getElementById('addCoachName').value = '';
    document.getElementById('addCoachPhone').value = '';
    document.getElementById('addCoachPassword').value = '';
    document.getElementById('addCoachError').textContent = '';
}

// 隱藏新增教練彈窗
window.hideAddCoachModal = function() {
    document.getElementById('addCoachModal').style.display = 'none';
}

// 創建新教練
window.createCoach = async function() {
    const name = document.getElementById('addCoachName').value.trim();
    const phone = document.getElementById('addCoachPhone').value.trim();
    const password = document.getElementById('addCoachPassword').value.trim();
    
    if (!name || !phone || !password) {
        document.getElementById('addCoachError').textContent = '請填寫所有必填欄位';
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('create-coach', { name, phone, password });
        if (result.success) {
            alert('教練創建成功');
            hideAddCoachModal();
            // 重新載入教練列表
            initializeCoachSelector();
        } else {
            document.getElementById('addCoachError').textContent = result.error || '創建失敗';
        }
    } catch (error) {
        console.error('創建教練失敗:', error);
        document.getElementById('addCoachError').textContent = '創建失敗';
    }
}

// 初始化教練選擇器
async function initializeCoachSelector() {
    try {
        const coaches = await ipcRenderer.invoke('fetch-all-coaches');
        const coachSelector = document.getElementById('coachSelector');
        coachSelector.innerHTML = '<option value="">請選擇教練</option>';
        
        coaches.forEach(coach => {
            const option = document.createElement('option');
            option.value = coach.phone;
            option.textContent = coach.studentName || coach.name;
            coachSelector.appendChild(option);
        });
        
        // 添加change事件監聽器
        coachSelector.addEventListener('change', function() {
            const selectedCoach = coaches.find(c => c.phone === this.value);
            if (selectedCoach) {
                document.getElementById('coachName').textContent = selectedCoach.studentName || selectedCoach.name;
                document.getElementById('coachPhone').textContent = selectedCoach.phone;
                // 自動載入當前月份的工時記錄（需要所有選擇都完成）
                const monthSelect = document.getElementById('coachMonthSelect');
                const locationSelect = document.getElementById('coachLocationSelect');
                const clubSelect = document.getElementById('coachClubSelect');
                if (monthSelect.value && locationSelect.value && clubSelect.value) {
                    loadCoachWorkHours();
                }
            } else {
                document.getElementById('coachName').textContent = '請選擇教練';
                document.getElementById('coachPhone').textContent = '請選擇教練';
            }
        });
    } catch (error) {
        console.error('載入教練列表失敗:', error);
    }
}

// 初始化月份選擇器
function initializeMonthSelector() {
    const monthSelect = document.getElementById('coachMonthSelect');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    monthSelect.innerHTML = '<option value="">選擇月份</option>';
    
    // 生成過去4個月、當月、未來4個月的選項
    for (let i = -4; i <= 4; i++) {
        const date = new Date(currentYear, currentMonth - 1 + i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const option = document.createElement('option');
        option.value = `${year}-${month.toString().padStart(2, '0')}`;
        option.textContent = `${year}年${month}月`;
        
        // 如果是當月，設置為選中狀態
        if (i === 0) {
            option.selected = true;
        }
        
        monthSelect.appendChild(option);
    }
    
    // 添加change事件監聽器，當選擇月份時自動載入工時記錄
    monthSelect.addEventListener('change', function() {
        const coachSelector = document.getElementById('coachSelector');
        const locationSelect = document.getElementById('coachLocationSelect');
        const clubSelect = document.getElementById('coachClubSelect');
        if (coachSelector.value && this.value && locationSelect.value && clubSelect.value) {
            loadCoachWorkHours();
        }
    });
}

// 初始化地點選擇器
function initializeLocationSelector() {
    const locationSelect = document.getElementById('coachLocationSelect');
    locationSelect.innerHTML = '<option value="">選擇地點</option>';
    ipcRenderer.invoke('fetch-locations').then(res => {
        const locations = (res && res.success) ? res.locations : [];
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationSelect.appendChild(option);
        });
    }).catch(() => {});
    
    locationSelect.addEventListener('change', async function() {
        // 當地點改變時，重新載入泳會選單
        await initializeClubSelector();
        if (this.value && document.getElementById('coachSelector').value && 
            document.getElementById('coachMonthSelect').value && 
            document.getElementById('coachClubSelect').value) {
            loadCoachWorkHours();
        }
    });
}

// 初始化泳會選擇器（依賴已選地點）
function initializeClubSelector() {
    const clubSelect = document.getElementById('coachClubSelect');
    const locationSelect = document.getElementById('coachLocationSelect');
    const location = locationSelect.value || '';
    
    // 清除舊的事件監聽器
    const newClubSelect = clubSelect.cloneNode(true);
    clubSelect.parentNode.replaceChild(newClubSelect, clubSelect);
    
    newClubSelect.innerHTML = '<option value="">選擇泳會</option>';
    if (location) {
        ipcRenderer.invoke('fetch-clubs-by-location', location).then(res => {
            const clubs = (res && res.success) ? res.clubs : [];
            const seen = new Set();
            clubs.forEach(club => {
                if (club && !seen.has(club)) {
                    seen.add(club);
                    const option = document.createElement('option');
                    option.value = club;
                    option.textContent = club;
                    newClubSelect.appendChild(option);
                }
            });
        }).catch(() => {});
    }
    
    // 添加新的事件監聽器
    newClubSelect.addEventListener('change', function() {
        if (this.value && document.getElementById('coachSelector').value && 
            document.getElementById('coachMonthSelect').value && 
            document.getElementById('coachLocationSelect').value) {
            loadCoachWorkHours();
        }
    });
}

// 初始化更表月份下拉
function initializeRosterMonthSelector() {
    const monthSelect = document.getElementById('rosterMonthSelect');
    if (!monthSelect) return;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    monthSelect.innerHTML = '<option value="">選擇月份</option>';
    for (let i = -4; i <= 4; i++) {
        const d = new Date(currentYear, currentMonth - 1 + i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const option = document.createElement('option');
        option.value = `${y}-${m.toString().padStart(2, '0')}`;
        option.textContent = `${y}年${m}月`;
        if (i === 0) option.selected = true;
        monthSelect.appendChild(option);
    }
}

// 靜默刷新教練工時（不顯示提示）
async function silentRefreshCoachWorkHours() {
    const coachSelector = document.getElementById('coachSelector');
    const monthSelect = document.getElementById('coachMonthSelect');
    const locationSelect = document.getElementById('coachLocationSelect');
    const clubSelect = document.getElementById('coachClubSelect');
    
    if (!coachSelector.value || !monthSelect.value || !locationSelect.value || !clubSelect.value) {
        return;
    }
    
    try {
        const [year, month] = monthSelect.value.split('-');
        const workHours = await ipcRenderer.invoke('fetch-coach-work-hours', { 
            phone: coachSelector.value, 
            year: parseInt(year), 
            month: parseInt(month),
            location: locationSelect.value,
            club: clubSelect.value
        });
        renderCoachCalendar(workHours, parseInt(year), parseInt(month));
        updateCoachStats(workHours);
    } catch (error) {
        console.error('靜默刷新工時失敗:', error);
    }
}

// 手動刷新教練工時
window.refreshCoachWorkHours = async function() {
    const coachSelector = document.getElementById('coachSelector');
    const monthSelect = document.getElementById('coachMonthSelect');
    const locationSelect = document.getElementById('coachLocationSelect');
    const clubSelect = document.getElementById('coachClubSelect');
    
    if (!coachSelector.value) { alert('請先選擇教練'); return; }
    if (!monthSelect.value) { alert('請先選擇月份'); return; }
    if (!locationSelect.value) { alert('請先選擇地點'); return; }
    if (!clubSelect.value) { alert('請先選擇泳會'); return; }
    
    try {
        // 顯示同步中提示
        const syncButton = event.target;
        const originalText = syncButton.textContent;
        syncButton.textContent = '🔄 同步中...';
        syncButton.disabled = true;
        
        const [year, month] = monthSelect.value.split('-');
        const workHours = await ipcRenderer.invoke('fetch-coach-work-hours', { 
            phone: coachSelector.value, 
            year: parseInt(year), 
            month: parseInt(month),
            location: locationSelect.value,
            club: clubSelect.value
        });
        renderCoachCalendar(workHours, parseInt(year), parseInt(month));
        updateCoachStats(workHours);
        
        // 恢復按鈕狀態
        syncButton.textContent = originalText;
        syncButton.disabled = false;
        
        // 顯示同步成功提示
        const successMsg = document.createElement('div');
        successMsg.textContent = '✅ 同步成功';
        successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 10px 15px; border-radius: 5px; z-index: 1000;';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 2000);
        
    } catch (error) {
        console.error('同步工時失敗:', error);
        alert('同步工時失敗');
        
        // 恢復按鈕狀態
        const syncButton = event.target;
        syncButton.textContent = '🔄 同步';
        syncButton.disabled = false;
    }
}

// 載入教練工時
window.loadCoachWorkHours = async function() {
    const coachSelector = document.getElementById('coachSelector');
    const monthSelect = document.getElementById('coachMonthSelect');
    const locationSelect = document.getElementById('coachLocationSelect');
    const clubSelect = document.getElementById('coachClubSelect');
    
    if (!coachSelector.value) { alert('請先選擇教練'); return; }
    if (!monthSelect.value) { alert('請先選擇月份'); return; }
    if (!locationSelect.value) { alert('請先選擇地點'); return; }
    if (!clubSelect.value) { alert('請先選擇泳會'); return; }
    try {
        const [year, month] = monthSelect.value.split('-');
        const workHours = await ipcRenderer.invoke('fetch-coach-work-hours', { 
            phone: coachSelector.value, 
            year: parseInt(year), 
            month: parseInt(month),
            location: locationSelect.value,
            club: clubSelect.value
        });
        renderCoachCalendar(workHours, parseInt(year), parseInt(month));
        updateCoachStats(workHours);
    } catch (error) {
        console.error('載入工時失敗:', error);
        alert('載入工時失敗');
    }
}

// 渲染教練日曆（改進版本，支持週統計）
function renderCoachCalendar(workHours, year, month) {
    const calendarContainer = document.getElementById('calendarContainer');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    let calendarHTML = `
        <div style="display: flex; gap: 20px;">
            <div style="flex: 1;">
                <div class="coach-calendar">
                    <div class="calendar-header">星期日</div>
                    <div class="calendar-header">星期一</div>
                    <div class="calendar-header">星期二</div>
                    <div class="calendar-header">星期三</div>
                    <div class="calendar-header">星期四</div>
                    <div class="calendar-header">星期五</div>
                    <div class="calendar-header">星期六</div>
    `;
    
    const today = new Date();
    let currentDate = new Date(startDate);
    let weekTotals = [];
    let currentWeekTotal = 0;
    let weekCount = 0;
    
    for (let week = 0; week < 6; week++) {
        currentWeekTotal = 0;
        for (let day = 0; day < 7; day++) {
            const isCurrentMonth = currentDate.getMonth() === month - 1;
            const isToday = currentDate.toDateString() === today.toDateString();
            const dayNumber = currentDate.getDate();
            const dateKey = `${year}-${month.toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;
            const hours = workHours[dateKey] || '';
            
            if (hours && hours > 0) {
                currentWeekTotal += parseFloat(hours);
            }
            
            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (!isCurrentMonth) dayClass += ' other-month';
            
            calendarHTML += `
                <div class="${dayClass}">
                    <div style="font-size: 12px; color: #666; margin-bottom: 2px;">${dayNumber}</div>
                    <input type="number" 
                           step="0.5" 
                           min="0" 
                           max="24" 
                           value="${hours}" 
                           data-date="${dateKey}"
                           placeholder="0"
                           onchange="validateAndUpdateHours(this)"
                           oninput="validateNumberInput(this)"
                           style="width: 100%; padding: 2px; text-align: center; border: 1px solid #ccc; border-radius: 3px; font-size: 12px;">
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        weekTotals.push(currentWeekTotal);
    }
    
    calendarHTML += '</div></div>';
    
    // 添加週統計區域
    calendarHTML += `
        <div style="flex: 0 0 200px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                <h4 style="margin: 0 0 15px 0; color: #333;">週統計</h4>
                <div id="weekTotals">
    `;
    
    weekTotals.forEach((total, index) => {
        calendarHTML += `
            <div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 3px; border: 1px solid #ddd;">
                <div style="font-size: 12px; color: #666;">第${index + 1}週</div>
                <div style="font-size: 16px; font-weight: bold; color: #007bff;" id="weekTotal${index}">${total.toFixed(1)}</div>
            </div>
        `;
    });
    
    calendarHTML += `
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                    <div style="font-size: 14px; font-weight: bold; color: #333;">總計</div>
                    <div style="font-size: 18px; font-weight: bold; color: #28a745;" id="totalWorkedHours">${weekTotals.reduce((sum, total) => sum + total, 0).toFixed(1)}</div>
                </div>
            </div>
        </div>
    `;
    
    calendarHTML += '</div>';
    calendarContainer.innerHTML = calendarHTML;
}

// 驗證數字輸入（只允許小數或整數）
window.validateNumberInput = function(input) {
    let value = input.value;
    
    // 移除非數字字符（除了小數點）
    value = value.replace(/[^0-9.]/g, '');
    
    // 確保只有一個小數點
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // 限制小數位數為1位
    if (parts.length === 2 && parts[1].length > 1) {
        value = parts[0] + '.' + parts[1].substring(0, 1);
    }
    
    // 檢查是否為有效數字
    const numValue = parseFloat(value);
    if (isNaN(numValue) && value !== '' && value !== '.') {
        value = '';
    }
    
    // 限制最大值為24
    if (numValue > 24) {
        value = '24';
    }
    
    // 限制最小值為0
    if (numValue < 0) {
        value = '0';
    }
    
    input.value = value;
}

// 驗證並更新工時
window.validateAndUpdateHours = function(input) {
    let value = parseFloat(input.value) || 0;
    
    // 確保值在有效範圍內
    if (value < 0) {
        value = 0;
        input.value = '0';
    } else if (value > 24) {
        value = 24;
        input.value = '24';
    }
    
    // 格式化為最多一位小數
    if (value % 1 !== 0) {
        input.value = value.toFixed(1);
    } else {
        input.value = value.toString();
    }
    
    // 更新週統計
    updateWeekTotals();
}

// 更新週統計
window.updateWeekTotals = function() {
    const inputs = document.querySelectorAll('#calendarContainer input[data-date]');
    const weekTotals = [0, 0, 0, 0, 0, 0];
    let totalWorkedHours = 0;
    
    inputs.forEach((input, index) => {
        const weekIndex = Math.floor(index / 7);
        const hours = parseFloat(input.value) || 0;
        if (weekIndex < 6) {
            weekTotals[weekIndex] += hours;
        }
        totalWorkedHours += hours;
    });
    
    // 更新週統計顯示
    weekTotals.forEach((total, index) => {
        const weekTotalElement = document.getElementById(`weekTotal${index}`);
        if (weekTotalElement) {
            weekTotalElement.textContent = total.toFixed(1);
        }
    });
    
    // 更新總計
    const totalElement = document.getElementById('totalWorkedHours');
    if (totalElement) {
        totalElement.textContent = totalWorkedHours.toFixed(1);
    }
    
    // 更新統計信息
    updateCoachStatsFromInputs();
}

// 從輸入框更新統計信息
function updateCoachStatsFromInputs() {
    const inputs = document.querySelectorAll('#calendarContainer input[data-date]');
    let totalHours = 0;
    let workDays = 0;
    
    inputs.forEach(input => {
        const hours = parseFloat(input.value) || 0;
        if (hours > 0) {
            totalHours += hours;
            workDays++;
        }
    });
    
    const avgHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : 0;
    
    document.getElementById('totalHours').textContent = totalHours.toFixed(1);
    document.getElementById('workDays').textContent = workDays;
    document.getElementById('avgHours').textContent = avgHours;
}

// 更新教練統計信息
function updateCoachStats(workHours) {
    let totalHours = 0;
    let workDays = 0;
    
    Object.values(workHours).forEach(hours => {
        if (hours && hours > 0) {
            totalHours += parseFloat(hours);
            workDays++;
        }
    });
    
    const avgHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : 0;
    
    document.getElementById('totalHours').textContent = totalHours.toFixed(1);
    document.getElementById('workDays').textContent = workDays;
    document.getElementById('avgHours').textContent = avgHours;
}

// 載入更表
window.loadCoachRoster = async function() {
    const coachSelector = document.getElementById('coachSelector');
    const rosterMonthSelect = document.getElementById('rosterMonthSelect');
    if (!coachSelector.value) { alert('請先選擇教練'); return; }
    if (!rosterMonthSelect.value) { alert('請先選擇月份'); return; }
    const [year, month] = rosterMonthSelect.value.split('-');
    const coachName = coachSelector.options[coachSelector.selectedIndex].text;
    try {
        const res = await ipcRenderer.invoke('fetch-coach-roster', { phone: coachSelector.value, name: coachName, year: parseInt(year), month: parseInt(month) });
        const data = (res && res.success) ? res.data : {};
        renderRosterCalendar(parseInt(year), parseInt(month), data);
    } catch (e) {
        console.error('載入更表失敗:', e);
        alert('載入更表失敗');
    }
}

// 渲染更表日曆（與工時一致布局）
function renderRosterCalendar(year, month, dataMap) {
    const container = document.getElementById('rosterCalendarContainer');
    const first = new Date(year, month - 1, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    let html = '';
    html += '<div class="coach-calendar">';
    const headers = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    headers.forEach(h => { html += `<div class="calendar-header">${h}</div>`; });
    const today = new Date();
    let cur = new Date(start);
    for (let w = 0; w < 6; w++) {
        for (let d = 0; d < 7; d++) {
            const inMonth = cur.getMonth() === month - 1;
            const isToday = cur.toDateString() === today.toDateString();
            const day = cur.getDate();
            // 使用實際日期生成唯一鍵，避免前後月的日期與當月重複
            const cellYear = cur.getFullYear();
            const cellMonthStr = (cur.getMonth() + 1).toString().padStart(2, '0');
            const cellDayStr = day.toString().padStart(2, '0');
            const dateKey = `${cellYear}-${cellMonthStr}-${cellDayStr}`;
            const entry = inMonth ? (dataMap[dateKey] || { time: '', location: '' }) : { time: '', location: '' };
            let dayClass = 'calendar-day';
            if (!inMonth) dayClass += ' other-month';
            if (isToday) dayClass += ' today';
            html += `<div class="${dayClass}">
                <div style="font-size:12px;color:#666;margin-bottom:2px;">${day}</div>
                ${inMonth ? `
                <input type=\"text\" placeholder=\"hh:mm-hh:mm\" value=\"${entry.time || ''}\" data-rdate=\"${dateKey}\" class=\"roster-time-input\" style=\"width:100%;padding:2px;text-align:center;border:1px solid #ccc;border-radius:3px;font-size:12px;\" />
                <select data-ldate=\"${dateKey}\" class=\"roster-location-select\" style=\"width:100%;margin-top:4px;padding:2px;border:1px solid #ccc;border-radius:3px;font-size:12px;\"><option value=\"\">選擇地點</option></select>
                ` : `
                <div style=\"height:52px\"></div>
                <div style=\"height:26px\"></div>
                `}
            </div>`;
            cur.setDate(cur.getDate() + 1);
        }
    }
    html += '</div>';
    container.innerHTML = html;
    // 填充每格的地點下拉
    populateRosterLocations(dataMap);
}

async function populateRosterLocations(dataMap) {
    console.log('🏊‍♂️ 開始填充更表地點選擇器...');
    
    let locations = [];
    try {
        const res = await ipcRenderer.invoke('fetch-locations');
        locations = (res && res.success) ? res.locations : [];
        console.log(`📍 獲取到 ${locations.length} 個地點:`, locations);
    } catch (e) {
        console.error('❌ 獲取地點失敗:', e);
    }
    
    const selectors = document.querySelectorAll('#rosterCalendarContainer select.roster-location-select');
    console.log(`🎯 找到 ${selectors.length} 個地點選擇器`);
    
    selectors.forEach((sel, index) => {
        const dateKey = sel.getAttribute('data-ldate');
        const current = (dataMap[dateKey] && dataMap[dateKey].location) || '';
        
        console.log(`📅 處理第 ${index + 1} 個選擇器:`);
        console.log(`   日期: ${dateKey}`);
        console.log(`   當前值: "${current}"`);
        
        const options = '<option value="">選擇地點</option>' + 
                       locations.map(l => `<option value="${l}" ${l===current?'selected':''}>${l}</option>`).join('');
        
        sel.innerHTML = options;
        
        console.log(`   ✅ 填充完成，選項數: ${sel.options.length}`);
        
        // 驗證是否正確設置了選中值
        if (current && sel.value !== current) {
            console.warn(`⚠️  警告: 預期選中值 "${current}"，實際值 "${sel.value}"`);
        }
    });
    
    console.log('✅ 地點選擇器填充完成');
}

// 保存更表
window.saveCoachRoster = async function() {
    const coachSelector = document.getElementById('coachSelector');
    const rosterMonthSelect = document.getElementById('rosterMonthSelect');
    if (!coachSelector.value) { alert('請先選擇教練'); return; }
    if (!rosterMonthSelect.value) { alert('請先選擇月份'); return; }
    const coachName = coachSelector.options[coachSelector.selectedIndex].text;
    const roster = {};
    
    console.log('🔍 開始收集更表數據...');
    
    // 收集所有時間輸入框的數據
    const timeInputs = document.querySelectorAll('#rosterCalendarContainer .roster-time-input');
    console.log(`📝 找到 ${timeInputs.length} 個時間輸入框`);
    
    timeInputs.forEach((inp, index) => {
        const dateKey = inp.getAttribute('data-rdate');
        const time = (inp.value || '').trim();
        const locSel = document.querySelector(`#rosterCalendarContainer select.roster-location-select[data-ldate="${dateKey}"]`);
        const location = locSel ? (locSel.value || '').trim() : '';
        
        console.log(`📅 處理第 ${index + 1} 個輸入框:`);
        console.log(`   日期: ${dateKey}`);
        console.log(`   時間: "${time}"`);
        console.log(`   地點選擇器存在: ${!!locSel}`);
        console.log(`   地點值: "${location}"`);
        
        if (!locSel) {
            console.warn(`⚠️  警告: 日期 ${dateKey} 的地點選擇器不存在`);
        }
        
        // 改進的邏輯：只要有時間或地點就保存，即使其中一個為空
        if (time || location) {
            roster[dateKey] = { time, location };
            console.log(`   ✅ 加入更表: ${JSON.stringify(roster[dateKey])}`);
        } else {
            console.log(`   ❌ 跳過: 時間和地點都為空`);
        }
        
        // 額外檢查：如果UI顯示有地點但收集到的是空值，記錄警告
        if (locSel && locSel.selectedIndex > 0 && !location) {
            console.warn(`⚠️  異常: 日期 ${dateKey} 的選擇器有選中項但值為空`);
            console.warn(`   選擇器選中索引: ${locSel.selectedIndex}`);
            console.warn(`   選擇器選中文本: "${locSel.options[locSel.selectedIndex]?.text}"`);
            console.warn(`   選擇器值: "${locSel.value}"`);
        }
    });
    
    console.log('📊 最終收集的更表數據:');
    console.log(JSON.stringify(roster, null, 2));
    
    // 額外檢查：驗證所有地點選擇器的狀態
    console.log('\n🔍 驗證地點選擇器狀態:');
    const allLocationSelectors = document.querySelectorAll('#rosterCalendarContainer select.roster-location-select');
    allLocationSelectors.forEach((sel, index) => {
        const dateKey = sel.getAttribute('data-ldate');
        const selectedIndex = sel.selectedIndex;
        const selectedText = sel.options[selectedIndex]?.text || '';
        const selectedValue = sel.value || '';
        
        console.log(`選擇器 ${index + 1} (${dateKey}):`);
        console.log(`   選中索引: ${selectedIndex}`);
        console.log(`   選中文本: "${selectedText}"`);
        console.log(`   選中值: "${selectedValue}"`);
        console.log(`   總選項數: ${sel.options.length}`);
        
        // 檢查是否有選中但值為空的情況
        if (selectedIndex > 0 && !selectedValue) {
            console.error(`❌ 異常: 日期 ${dateKey} 有選中項但值為空!`);
        }
    });
    
    try {
        const saveData = { phone: coachSelector.value, name: coachName, roster };
        console.log('💾 準備保存數據:', JSON.stringify(saveData, null, 2));
        
        await ipcRenderer.invoke('save-coach-roster', saveData);
        alert('更表保存成功');
        console.log('✅ 更表保存成功');
    } catch (e) {
        console.error('❌ 保存更表失敗:', e);
        alert('保存更表失敗: ' + e.message);
    }
}

// 保存教練工時
window.saveCoachWorkHours = async function() {
    const coachSelector = document.getElementById('coachSelector');
    const monthSelect = document.getElementById('coachMonthSelect');
    const locationSelect = document.getElementById('coachLocationSelect');
    const clubSelect = document.getElementById('coachClubSelect');
    
    if (!coachSelector.value) { alert('請先選擇教練'); return; }
    if (!monthSelect.value) { alert('請先選擇月份'); return; }
    if (!locationSelect.value) { alert('請先選擇地點'); return; }
    if (!clubSelect.value) { alert('請先選擇泳會'); return; }
    try {
        const workHours = {};
        const inputs = document.querySelectorAll('#calendarContainer input[data-date]');
        inputs.forEach(input => {
            const date = input.dataset.date;
            const hours = parseFloat(input.value) || 0;
            if (hours > 0) workHours[date] = hours;
        });
        await ipcRenderer.invoke('save-coach-work-hours', { 
            phone: coachSelector.value, 
            workHours,
            location: locationSelect.value,
            club: clubSelect.value
        });
        alert('工時保存成功');
        
        // 保存成功後重新載入工時數據以確保同步
        await loadCoachWorkHours();
    } catch (error) {
        console.error('保存工時失敗:', error);
        alert('保存工時失敗');
    }
}

// 導出教練工時報表
window.exportCoachWorkHours = async function() {
    const coachSelector = document.getElementById('coachSelector');
    const monthSelect = document.getElementById('coachMonthSelect');
    const exportPath = document.getElementById('exportPath').value;
    const locationSelect = document.getElementById('coachLocationSelect');
    const clubSelect = document.getElementById('coachClubSelect');
    
    if (!coachSelector.value) { alert('請先選擇教練'); return; }
    if (!monthSelect.value) { alert('請先選擇月份'); return; }
    if (!exportPath) { alert('請先選擇保存路徑'); return; }
    if (!locationSelect.value) { alert('請先選擇地點'); return; }
    if (!clubSelect.value) { alert('請先選擇泳會'); return; }
    try {
        const [year, month] = monthSelect.value.split('-');
        const coachName = coachSelector.options[coachSelector.selectedIndex].text;
        await ipcRenderer.invoke('export-coach-work-hours', { 
            phone: coachSelector.value, 
            year: parseInt(year), 
            month: parseInt(month), 
            coachName,
            exportPath,
            location: locationSelect.value,
            club: clubSelect.value
        });
        alert('報表導出成功');
    } catch (error) {
        console.error('導出報表失敗:', error);
        alert('導出報表失敗');
    }
}

// 選擇導出路徑
window.selectExportPath = async function() {
    try {
        const result = await ipcRenderer.invoke('select-export-directory');
        if (result.success) {
            document.getElementById('exportPath').value = result.path;
        }
    } catch (error) {
        console.error('選擇路徑失敗:', error);
        alert('選擇路徑失敗');
    }
}

// 導出雲端資料Excel功能
window.exportCloudExcel = async function() {
    // 獲取雲端資料
    let grouped = window.cloudStudentsGrouped || [];
    if (grouped.length === 0) {
        alert('暫無雲端資料可導出');
        return;
    }

    // 將所有學生攤平成一個陣列，並添加日期信息
    let allStudents = [];
    grouped.forEach(group => {
        (group.students || []).forEach(stu => {
            allStudents.push({
                ...stu,
                dateStr: group.date,
                dates: group.date // 為了兼容現有邏輯
            });
        });
    });

    if (allStudents.length === 0) {
        alert('暫無學生資料可導出');
        return;
    }

    // 檢查是否有勾選的學生
    let checkedStudents = [];
    const tables = document.querySelectorAll('#cloudStudentsList table');
    let hasCheckedStudents = false;

    tables.forEach(table => {
        const trs = table.querySelectorAll('tr');
        trs.forEach((tr, idx) => {
            if (idx === 0) return; // 跳過表頭
            const cb = tr.querySelector('input[type="checkbox"]');
            if (cb && cb.checked) {
                hasCheckedStudents = true;
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 13) { // 系統配置頁面表格有13列
                    const name = tds[1]?.querySelector('input')?.value?.trim() || tds[1]?.textContent?.trim();
                    const date = tds[11]?.querySelector('input')?.value?.trim() || tds[11]?.textContent?.trim();
                    if (name && date) {
                        // 找到對應的學生資料
                        const student = allStudents.find(s => {
                            // 匹配姓名和日期
                            const studentName = s.name || s.rawName;
                            const studentDate = s.dateStr || s.dates || s['上課日期'];
                            return studentName === name && studentDate === date;
                        });
                        if (student) {
                            checkedStudents.push(student);
                        }
                    }
                }
            }
        });
    });

    // 如果沒有勾選學生，導出所有學生
    if (!hasCheckedStudents) {
        checkedStudents = allStudents;
    }

    if (checkedStudents.length === 0) {
        alert('請至少勾選一位學生或確保有學生資料');
        return;
    }

    // 按地點分組學生
    let locationGroups = {};
    checkedStudents.forEach(stu => {
        let location = stu.location || '未知地點';
        if (!locationGroups[location]) {
            locationGroups[location] = [];
        }
        locationGroups[location].push(stu);
    });

    // 為每個地點生成Excel
    const { ipcRenderer } = require('electron');
    const path = require('path');
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

    for (const [location, students] of Object.entries(locationGroups)) {
        // 按日期分組
        let dateInfo = {};
        let balloonDates = new Set();
        
        students.forEach(stu => {
            let dateStr = stu.dateStr || stu.dates || stu['上課日期'];
            if (!dateStr) return;
            
            if (dateStr.includes('🎈')) {
                balloonDates.add(dateStr.replace('🎈', ''));
            }
            
            // 解析日期格式
            let month, day, year, dateObj;
            
            // 處理標準日期格式 "YYYY-MM-DD"
            let standardMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (standardMatch) {
                year = parseInt(standardMatch[1], 10);
                month = parseInt(standardMatch[2], 10);
                day = parseInt(standardMatch[3], 10);
                dateObj = new Date(year, month - 1, day);
            } else {
                // 處理中文日期格式 "M月D日"
                let m = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
                if (!m) return;
                month = parseInt(m[1], 10);
                day = parseInt(m[2], 10);
                year = new Date().getFullYear();
                dateObj = new Date(year, month - 1, day);
            }
            
            let weekday = dateObj.getDay();
            let cleanDateStr = dateStr.replace('🎈', '');
            if (!dateInfo[cleanDateStr]) dateInfo[cleanDateStr] = [];
            dateInfo[cleanDateStr].push({
                ...stu,
                dateStr: cleanDateStr,
                month,
                day,
                year,
                weekday,
                time: stu.time,
                type: stu.type
            });
        });

        // 按月份分組
        let monthGroups = {};
        Object.keys(dateInfo).forEach(dateStr => {
            let arr = dateInfo[dateStr];
            if (arr.length > 0) {
                let month = arr[0].month;
                let year = arr[0].year;
                let monthGroup = Math.floor((month - 1) / 2) * 2 + 1;
                let groupKey = `${year}年${monthGroup}-${monthGroup + 1}月`;
                if (!monthGroups[groupKey]) monthGroups[groupKey] = {};
                monthGroups[groupKey][dateStr] = arr;
            }
        });

        // 生成工作表
        let sheets = [];
        for (const [monthGroupKey, groupDates] of Object.entries(monthGroups)) {
            let weekdaySheets = {};
            for (let i = 0; i < 7; i++) {
                weekdaySheets[i] = {};
            }
            
            Object.entries(groupDates).forEach(([dateStr, arr]) => {
                let weekday = arr[0].weekday;
                if (!weekdaySheets[weekday][dateStr]) weekdaySheets[weekday][dateStr] = [];
                weekdaySheets[weekday][dateStr] = arr.map(item => {
                    let newName = item.name || item.rawName;
                    let studentDates = (item.dates || '').split('、').filter(Boolean);
                    let needBalloon = studentDates.some(studentDate =>
                        studentDate.includes('🎈') && studentDate.replace('🎈', '') === dateStr
                    );
                    if (needBalloon && !newName.includes('🎈')) {
                        newName += '🎈';
                    }
                    return { ...item, name: newName };
                });
            });

            for (let i = 0; i < 7; i++) {
                let dateArr = Object.keys(weekdaySheets[i]);
                if (dateArr.length === 0) continue;
                
                let headerRow = [];
                dateArr.forEach((date, idx) => {
                    headerRow.push(date);
                    if (idx !== dateArr.length - 1) {
                        for (let j = 0; j < 4; j++) headerRow.push('');
                    }
                });
                
                let dataRows = [];
                let maxRowsPerDate = 0;
                let dateTimeRows = {};
                
                dateArr.forEach(date => {
                    let timeTypeMap = {};
                    (weekdaySheets[i][date] || []).forEach(item => {
                        let key = item.time + '||' + item.type;
                        if (!timeTypeMap[key]) timeTypeMap[key] = { time: item.time, type: item.type, students: [] };
                        timeTypeMap[key].students.push(item.name);
                    });
                    
                    let timeTypeArr = Object.values(timeTypeMap);
                    timeTypeArr.sort((a, b) => {
                        let cmp = compareTimes(a.time, b.time);
                        if (cmp !== 0) return cmp;
                        return a.type.localeCompare(b.type);
                    });
                    
                    dateTimeRows[date] = [];
                    timeTypeArr.forEach((tt, idx) => {
                        dateTimeRows[date].push({ type: 'time', value: tt.time + ' ' + tt.type });
                        tt.students.forEach(stuName => {
                            let studentRow = stuName;
                            let found = students.find(s => s.name === stuName.replace('🎈', '') || s.name + '🎈' === stuName);
                            if (found && found.age) {
                                studentRow += '👶🏻' + found.age;
                            }
                            dateTimeRows[date].push({ type: 'student', value: studentRow });
                        });
                        if (idx < timeTypeArr.length - 1) {
                            dateTimeRows[date].push({ type: 'spacer', value: '' });
                            dateTimeRows[date].push({ type: 'spacer', value: '' });
                        }
                    });
                    if (dateTimeRows[date].length > maxRowsPerDate) maxRowsPerDate = dateTimeRows[date].length;
                });

                for (let rowIdx = 0; rowIdx < maxRowsPerDate; rowIdx++) {
                    let row = [];
                    for (let d = 0; d < dateArr.length; d++) {
                        let arr = dateTimeRows[dateArr[d]] || [];
                        row.push(arr[rowIdx] ? arr[rowIdx].value : '');
                        if (d !== dateArr.length - 1) {
                            for (let j = 0; j < 4; j++) row.push('');
                        }
                    }
                    dataRows.push(row);
                }
                
                let sheetName = `${location}_${monthGroupKey}（${weekdayNames[i]}）`;
                sheets.push({ name: sheetName, header: headerRow, data: dataRows });
            }
        }

        // 導出Excel文件
        const exportPath = document.getElementById('configExportPath').value;
        let filename;
        
        if (exportPath) {
            // 使用選擇的路徑
            filename = path.join(exportPath, location + '_雲端資料.xlsx');
        } else {
            // 使用默認路徑
            filename = path.join(location + '_雲端資料.xlsx');
        }
        
        const result = await ipcRenderer.invoke('export-exceljs-multisheet', {
            sheets,
            filename
        });
        
        if (result && result.success) {
            alert(`已導出 ${location} 的雲端資料到: ${filename}`);
        } else {
            alert(`導出 ${location} 失敗：` + (result && result.error ? result.error : '未知錯誤'));
        }
    }
}

// 選擇系統配置頁面的導出路徑
window.selectConfigExportPath = async function() {
    try {
        const result = await ipcRenderer.invoke('select-export-directory');
        if (result.success) {
            document.getElementById('configExportPath').value = result.path;
        }
    } catch (error) {
        console.error('選擇路徑失敗:', error);
        alert('選擇路徑失敗');
    }
}

// 出席記錄搜索功能
window.searchAttendanceRecords = function() {
    const nameSearch = document.getElementById('attendanceNameSearch').value.trim().toLowerCase();
    const phoneSearch = document.getElementById('attendancePhoneSearch').value.trim();
    
    // 獲取所有表格行
    const tables = document.querySelectorAll('#attendanceTableArea table');
    
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index === 0) return; // 跳過表頭
            
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
                const name = cells[0].textContent.trim().toLowerCase();
                const phone = cells[2].textContent.trim();
                
                let shouldShow = true;
                
                // 姓名搜索 - 精確匹配
                if (nameSearch && name !== nameSearch) {
                    shouldShow = false;
                }
                
                // 電話搜索 - 精確匹配
                if (phoneSearch && phone !== phoneSearch) {
                    shouldShow = false;
                }
                
                // 顯示或隱藏行
                row.style.display = shouldShow ? '' : 'none';
            }
        });
    });
    
    // 顯示搜索結果統計
    let visibleCount = 0;
    let totalCount = 0;
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index === 0) return; // 跳過表頭
            totalCount++;
            if (row.style.display !== 'none') {
                visibleCount++;
            }
        });
    });
    
    // 更新搜索結果提示
    let searchInfo = document.getElementById('searchResultInfo');
    if (!searchInfo) {
        searchInfo = document.createElement('div');
        searchInfo.id = 'searchResultInfo';
        searchInfo.style.marginTop = '10px';
        searchInfo.style.fontSize = '14px';
        searchInfo.style.color = '#666';
        document.querySelector('#attendanceTableArea .search-section').appendChild(searchInfo);
    }
    
    if (nameSearch || phoneSearch) {
        searchInfo.textContent = `搜索結果：顯示 ${visibleCount} / ${totalCount} 條記錄`;
        searchInfo.style.display = 'block';
    } else {
        searchInfo.style.display = 'none';
    }
}

// 重置出席記錄搜索
window.resetAttendanceSearch = function() {
    // 清空搜索輸入框
    document.getElementById('attendanceNameSearch').value = '';
    document.getElementById('attendancePhoneSearch').value = '';
    
    // 顯示所有行
    const tables = document.querySelectorAll('#attendanceTableArea table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            row.style.display = '';
        });
    });
    
    // 隱藏搜索結果提示
    const searchInfo = document.getElementById('searchResultInfo');
    if (searchInfo) {
        searchInfo.style.display = 'none';
    }
}

// 添加學生功能相關函數
window.showAddStudentModal = function() {
    const modal = document.getElementById('addStudentModal');
    modal.style.display = 'flex';
    
    // 初始化地點選項
    initializeLocationOptions();
    
    // 清空表單
    document.getElementById('addStudentName').value = '';
    document.getElementById('addStudentPhone').value = '';
    document.getElementById('addStudentAge').value = '';
    
    // 重置課程信息
    resetCourseInfo();
    
    // 添加鍵盤事件監聽器
    document.addEventListener('keydown', handleAddStudentKeydown);
}

window.hideAddStudentModal = function() {
    const modal = document.getElementById('addStudentModal');
    modal.style.display = 'none';
    
    // 移除鍵盤事件監聽器
    document.removeEventListener('keydown', handleAddStudentKeydown);
}

// 處理添加學生模態窗口的鍵盤事件
function handleAddStudentKeydown(event) {
    // 檢查是否在添加地點或課程類別的模態窗口中
    const locationModal = document.getElementById('addLocationModal');
    const courseTypeModal = document.getElementById('addCourseTypeModal');
    
    if (locationModal.style.display === 'flex') {
        if (event.key === 'Enter') {
            confirmAddLocation();
        } else if (event.key === 'Escape') {
            cancelAddLocation();
        }
    } else if (courseTypeModal.style.display === 'flex') {
        if (event.key === 'Enter') {
            confirmAddCourseType();
        } else if (event.key === 'Escape') {
            cancelAddCourseType();
        }
    }
}

// 初始化地點選項
function initializeLocationOptions() {
    // 從現有資料中獲取地點
    let locations = new Set();
    const grouped = window.cloudStudentsGrouped || [];
    
    grouped.forEach(group => {
        group.students.forEach(stu => {
            if (stu.location) {
                locations.add(stu.location);
            }
        });
    });
    
    // 更新所有地點下拉選單
    const locationSelects = document.querySelectorAll('[id^="addStudentLocation"]');
    locationSelects.forEach(select => {
        select.innerHTML = '<option value="">請選擇上課地點</option>';
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            select.appendChild(option);
        });
    });
}

// 重置課程信息
function resetCourseInfo() {
    const container = document.getElementById('courseInfoContainer');
    container.innerHTML = `
        <div class="course-info" data-course-index="0">
            <div style="margin-top:20px;padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #3498db;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <h4 style="margin:0;color:#333;">課程信息 #1</h4>
                    <button type="button" onclick="removeCourseInfo(this)" style="padding:5px 10px;background:#e74c3c;color:white;border:none;border-radius:3px;cursor:pointer;font-size:12px;">×</button>
                </div>
                
                <div class="input-group">
                    <label for="addStudentLocation0">上課地點</label>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <select id="addStudentLocation0" onchange="onLocationChange(0)" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;">
                            <option value="">請選擇上課地點</option>
                        </select>
                        <button type="button" onclick="addNewLocation(0)" style="padding:8px 12px;background:#27ae60;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">添加新地點</button>
                    </div>
                </div>
                
                <div class="input-group" id="courseTypeGroup0" style="display:none;">
                    <label for="addStudentCourseType0">課程類別</label>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <select id="addStudentCourseType0" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;">
                            <option value="">請選擇課程類別</option>
                        </select>
                        <button type="button" onclick="addNewCourseType(0)" style="padding:8px 12px;background:#f39c12;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">添加新類別</button>
                    </div>
                </div>
                
                <div class="input-group" id="courseTimeGroup0" style="display:none;">
                    <label for="addStudentTime0">上課時間</label>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <div style="display:flex;align-items:center;gap:2px;">
                            <input type="number" id="addStudentTimeStartHour0" min="0" max="23" placeholder="時" style="width:50px;padding:8px;border:1px solid #ddd;border-radius:4px;text-align:center;" onchange="updateTimeFormat(0)">
                            <span style="font-weight:bold;">:</span>
                            <input type="number" id="addStudentTimeStartMin0" min="0" max="59" placeholder="分" style="width:50px;padding:8px;border:1px solid #ddd;border-radius:4px;text-align:center;" onchange="updateTimeFormat(0)">
                        </div>
                        <span style="font-weight:bold;">-</span>
                        <div style="display:flex;align-items:center;gap:2px;">
                            <input type="number" id="addStudentTimeEndHour0" min="0" max="23" placeholder="時" style="width:50px;padding:8px;border:1px solid #ddd;border-radius:4px;text-align:center;" onchange="updateTimeFormat(0)">
                            <span style="font-weight:bold;">:</span>
                            <input type="number" id="addStudentTimeEndMin0" min="0" max="59" placeholder="分" style="width:50px;padding:8px;border:1px solid #ddd;border-radius:4px;text-align:center;" onchange="updateTimeFormat(0)">
                        </div>
                    </div>
                    <input type="text" id="addStudentTime0" placeholder="格式：09:00-10:00" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-top:5px;background:#f8f9fa;" readonly>
                </div>
                
                <div class="input-group" id="courseDateGroup0" style="display:none;">
                    <label for="addStudentDate0">上課日期</label>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="addStudentDate0" placeholder="選擇日期" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;" readonly>
                        <button type="button" onclick="showDatePicker(0)" style="padding:8px 12px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">📅</button>
                    </div>
                </div>
                
                <div class="input-group" id="courseWaitGroup0" style="display:none;">
                    <label for="addStudentWait0">待約</label>
                    <input type="number" id="addStudentWait0" placeholder="請輸入待約數量" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
            </div>
        </div>
    `;
    
    // 重新初始化地點選項
    initializeLocationOptions();
}

// 地點變更處理
window.onLocationChange = function(index) {
    const locationSelect = document.getElementById(`addStudentLocation${index}`);
    const courseTypeGroup = document.getElementById(`courseTypeGroup${index}`);
    const courseTimeGroup = document.getElementById(`courseTimeGroup${index}`);
    const courseDateGroup = document.getElementById(`courseDateGroup${index}`);
    const courseWaitGroup = document.getElementById(`courseWaitGroup${index}`);
    
    if (locationSelect.value) {
        // 顯示相關欄位
        courseTypeGroup.style.display = 'block';
        courseTimeGroup.style.display = 'block';
        courseDateGroup.style.display = 'block';
        courseWaitGroup.style.display = 'block';
        
        // 初始化課程類別選項
        initializeCourseTypeOptions(index);
    } else {
        // 隱藏相關欄位
        courseTypeGroup.style.display = 'none';
        courseTimeGroup.style.display = 'none';
        courseDateGroup.style.display = 'none';
        courseWaitGroup.style.display = 'none';
    }
}

// 初始化課程類別選項
function initializeCourseTypeOptions(index) {
    const courseTypeSelect = document.getElementById(`addStudentCourseType${index}`);
    courseTypeSelect.innerHTML = '<option value="">請選擇課程類別</option>';
    
    // 從現有資料中獲取課程類別
    let courseTypes = new Set();
    const grouped = window.cloudStudentsGrouped || [];
    
    grouped.forEach(group => {
        group.students.forEach(stu => {
            if (stu.type) {
                courseTypes.add(stu.type);
            }
        });
    });
    
    courseTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        courseTypeSelect.appendChild(option);
    });
}

// 添加新地點
window.addNewLocation = function(index) {
    // 保存當前索引到全局變量
    window.currentLocationIndex = index;
    
    // 顯示模態窗口
    const modal = document.getElementById('addLocationModal');
    modal.style.display = 'flex';
    
    // 清空輸入框和錯誤信息
    document.getElementById('newLocationInput').value = '';
    document.getElementById('addLocationError').textContent = '';
    
    // 聚焦到輸入框
    setTimeout(() => {
        document.getElementById('newLocationInput').focus();
    }, 100);
}

// 取消添加地點
window.cancelAddLocation = function() {
    const modal = document.getElementById('addLocationModal');
    modal.style.display = 'none';
}

// 確認添加地點
window.confirmAddLocation = function() {
    const newLocation = document.getElementById('newLocationInput').value.trim();
    const errorElement = document.getElementById('addLocationError');
    
    if (!newLocation) {
        errorElement.textContent = '請輸入地點名稱';
        return;
    }
    
    // 檢查是否已存在
    const existingLocations = Array.from(document.querySelectorAll('[id^="addStudentLocation"] option')).map(opt => opt.value);
    if (existingLocations.includes(newLocation)) {
        errorElement.textContent = '該地點已存在';
        return;
    }
    
    // 添加到所有地點下拉選單
    const locationSelects = document.querySelectorAll('[id^="addStudentLocation"]');
    locationSelects.forEach(select => {
        const option = document.createElement('option');
        option.value = newLocation;
        option.textContent = newLocation;
        select.appendChild(option);
    });
    
    // 設置當前選中的下拉選單的值
    const currentIndex = window.currentLocationIndex;
    const locationSelect = document.getElementById(`addStudentLocation${currentIndex}`);
    locationSelect.value = newLocation;
    
    // 觸發地點變更
    onLocationChange(currentIndex);
    
    // 關閉模態窗口
    const modal = document.getElementById('addLocationModal');
    modal.style.display = 'none';
}

// 添加新課程類別
window.addNewCourseType = function(index) {
    // 保存當前索引到全局變量
    window.currentCourseTypeIndex = index;
    
    // 顯示模態窗口
    const modal = document.getElementById('addCourseTypeModal');
    modal.style.display = 'flex';
    
    // 清空輸入框和錯誤信息
    document.getElementById('newCourseTypeInput').value = '';
    document.getElementById('addCourseTypeError').textContent = '';
    
    // 聚焦到輸入框
    setTimeout(() => {
        document.getElementById('newCourseTypeInput').focus();
    }, 100);
}

// 取消添加課程類別
window.cancelAddCourseType = function() {
    const modal = document.getElementById('addCourseTypeModal');
    modal.style.display = 'none';
}

// 確認添加課程類別
window.confirmAddCourseType = function() {
    const newType = document.getElementById('newCourseTypeInput').value.trim();
    const errorElement = document.getElementById('addCourseTypeError');
    
    if (!newType) {
        errorElement.textContent = '請輸入課程類別名稱';
        return;
    }
    
    // 檢查是否已存在
    const currentIndex = window.currentCourseTypeIndex;
    const courseTypeSelect = document.getElementById(`addStudentCourseType${currentIndex}`);
    const existingTypes = Array.from(courseTypeSelect.options).map(opt => opt.value);
    if (existingTypes.includes(newType)) {
        errorElement.textContent = '該課程類別已存在';
        return;
    }
    
    // 添加到當前下拉選單
    const option = document.createElement('option');
    option.value = newType;
    option.textContent = newType;
    courseTypeSelect.appendChild(option);
    courseTypeSelect.value = newType;
    
    // 關閉模態窗口
    const modal = document.getElementById('addCourseTypeModal');
    modal.style.display = 'none';
}

// 顯示日期選擇器
window.showDatePicker = function(index) {
    const dateInput = document.getElementById(`addStudentDate${index}`);
    
    // 使用 flatpickr 創建日期選擇器
    const picker = flatpickr(dateInput, {
        mode: 'multiple',
        dateFormat: 'Y-m-d',
        locale: 'zh_tw',
        allowInput: true,
        placeholder: '選擇多個日期',
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                const formattedDates = selectedDates.map(date => 
                    date.toISOString().split('T')[0]
                ).join(', ');
                dateInput.value = formattedDates;
            }
        }
    });
    
    picker.open();
}

// 添加新課程信息
window.addNewCourseInfo = function() {
    const container = document.getElementById('courseInfoContainer');
    const courseCount = container.children.length;
    const newIndex = courseCount;
    
    const newCourseHtml = `
        <div class="course-info" data-course-index="${newIndex}">
            <div style="margin-top:20px;padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #3498db;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <h4 style="margin:0;color:#333;">課程信息 #${newIndex + 1}</h4>
                    <button type="button" onclick="removeCourseInfo(this)" style="padding:5px 10px;background:#e74c3c;color:white;border:none;border-radius:3px;cursor:pointer;font-size:12px;">×</button>
                </div>
                
                <div class="input-group">
                    <label for="addStudentLocation${newIndex}">上課地點</label>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <select id="addStudentLocation${newIndex}" onchange="onLocationChange(${newIndex})" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;">
                            <option value="">請選擇上課地點</option>
                        </select>
                        <button type="button" onclick="addNewLocation(${newIndex})" style="padding:8px 12px;background:#27ae60;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">添加新地點</button>
                    </div>
                </div>
                
                <div class="input-group" id="courseTypeGroup${newIndex}" style="display:none;">
                    <label for="addStudentCourseType${newIndex}">課程類別</label>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <select id="addStudentCourseType${newIndex}" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;">
                            <option value="">請選擇課程類別</option>
                        </select>
                        <button type="button" onclick="addNewCourseType(${newIndex})" style="padding:8px 12px;background:#f39c12;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">添加新類別</button>
                    </div>
                </div>
                
                <div class="input-group" id="courseTimeGroup${newIndex}" style="display:none;">
                    <label for="addStudentTime${newIndex}">上課時間</label>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <div style="display:flex;align-items:center;gap:2px;">
                            <input type="number" id="addStudentTimeStartHour${newIndex}" min="0" max="23" placeholder="時" style="width:50px;padding:8px;border:1px solid #ddd;border-radius:4px;text-align:center;" onchange="updateTimeFormat(${newIndex})">
                            <span style="font-weight:bold;">:</span>
                            <input type="number" id="addStudentTimeStartMin${newIndex}" min="0" max="59" placeholder="分" style="width:50px;padding:8px;border:1px solid #ddd;border-radius:4px;text-align:center;" onchange="updateTimeFormat(${newIndex})">
                        </div>
                        <span style="font-weight:bold;">-</span>
                        <div style="display:flex;align-items:center;gap:2px;">
                            <input type="number" id="addStudentTimeEndHour${newIndex}" min="0" max="23" placeholder="時" style="width:50px;padding:8px;border:1px solid #ddd;border-radius:4px;text-align:center;" onchange="updateTimeFormat(${newIndex})">
                            <span style="font-weight:bold;">:</span>
                            <input type="number" id="addStudentTimeEndMin${newIndex}" min="0" max="59" placeholder="分" style="width:50px;padding:8px;border:1px solid #ddd;border-radius:4px;text-align:center;" onchange="updateTimeFormat(${newIndex})">
                        </div>
                    </div>
                    <input type="text" id="addStudentTime${newIndex}" placeholder="格式：09:00-10:00" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-top:5px;background:#f8f9fa;" readonly>
                </div>
                
                <div class="input-group" id="courseDateGroup${newIndex}" style="display:none;">
                    <label for="addStudentDate${newIndex}">上課日期</label>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="addStudentDate${newIndex}" placeholder="選擇日期" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;" readonly>
                        <button type="button" onclick="showDatePicker(${newIndex})" style="padding:8px 12px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">📅</button>
                    </div>
                </div>
                
                <div class="input-group" id="courseWaitGroup${newIndex}" style="display:none;">
                    <label for="addStudentWait${newIndex}">待約</label>
                    <input type="number" id="addStudentWait${newIndex}" placeholder="請輸入待約數量" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', newCourseHtml);
    
    // 初始化新課程的地點選項
    const newLocationSelect = document.getElementById(`addStudentLocation${newIndex}`);
    const existingLocationSelect = document.getElementById('addStudentLocation0');
    newLocationSelect.innerHTML = existingLocationSelect.innerHTML;
}

// 刪除課程信息
window.removeCourseInfo = function(button) {
    const courseInfo = button.closest('.course-info');
    const container = document.getElementById('courseInfoContainer');
    
    if (container.children.length > 1) {
        courseInfo.remove();
        
        // 重新編號
        const courseInfos = container.querySelectorAll('.course-info');
        courseInfos.forEach((info, index) => {
            info.setAttribute('data-course-index', index);
            const title = info.querySelector('h4');
            title.textContent = `課程信息 #${index + 1}`;
            
            // 更新所有相關元素的ID
            const locationSelect = info.querySelector('[id^="addStudentLocation"]');
            const courseTypeSelect = info.querySelector('[id^="addStudentCourseType"]');
            const timeInput = info.querySelector('[id^="addStudentTime"]');
            const dateInput = info.querySelector('[id^="addStudentDate"]');
            const waitInput = info.querySelector('[id^="addStudentWait"]');
            
            if (locationSelect) {
                locationSelect.id = `addStudentLocation${index}`;
                locationSelect.onchange = () => onLocationChange(index);
                locationSelect.querySelector('button').onclick = () => addNewLocation(index);
            }
            
            if (courseTypeSelect) {
                courseTypeSelect.id = `addStudentCourseType${index}`;
                courseTypeSelect.nextElementSibling.querySelector('button').onclick = () => addNewCourseType(index);
            }
            
            if (timeInput) {
                timeInput.id = `addStudentTime${index}`;
                // 更新時間輸入框的ID
                const timeContainer = info.querySelector('[id^="courseTimeGroup"]');
                if (timeContainer) {
                    const startHourInput = timeContainer.querySelector('[id^="addStudentTimeStartHour"]');
                    const startMinInput = timeContainer.querySelector('[id^="addStudentTimeStartMin"]');
                    const endHourInput = timeContainer.querySelector('[id^="addStudentTimeEndHour"]');
                    const endMinInput = timeContainer.querySelector('[id^="addStudentTimeEndMin"]');
                    
                    if (startHourInput) {
                        startHourInput.id = `addStudentTimeStartHour${index}`;
                        startHourInput.onchange = () => updateTimeFormat(index);
                    }
                    if (startMinInput) {
                        startMinInput.id = `addStudentTimeStartMin${index}`;
                        startMinInput.onchange = () => updateTimeFormat(index);
                    }
                    if (endHourInput) {
                        endHourInput.id = `addStudentTimeEndHour${index}`;
                        endHourInput.onchange = () => updateTimeFormat(index);
                    }
                    if (endMinInput) {
                        endMinInput.id = `addStudentTimeEndMin${index}`;
                        endMinInput.onchange = () => updateTimeFormat(index);
                    }
                }
            }
            if (dateInput) {
                dateInput.id = `addStudentDate${index}`;
                dateInput.nextElementSibling.onclick = () => showDatePicker(index);
            }
            if (waitInput) waitInput.id = `addStudentWait${index}`;
            
            // 更新相關的div ID
            const courseTypeGroup = info.querySelector('[id^="courseTypeGroup"]');
            const courseTimeGroup = info.querySelector('[id^="courseTimeGroup"]');
            const courseDateGroup = info.querySelector('[id^="courseDateGroup"]');
            const courseWaitGroup = info.querySelector('[id^="courseWaitGroup"]');
            
            if (courseTypeGroup) courseTypeGroup.id = `courseTypeGroup${index}`;
            if (courseTimeGroup) courseTimeGroup.id = `courseTimeGroup${index}`;
            if (courseDateGroup) courseDateGroup.id = `courseDateGroup${index}`;
            if (courseWaitGroup) courseWaitGroup.id = `courseWaitGroup${index}`;
        });
    } else {
        alert('至少需要保留一個課程信息');
    }
}

// 創建學生
window.createStudent = async function() {
    try {
        // 驗證基本信息
        const name = document.getElementById('addStudentName').value.trim();
        const phone = document.getElementById('addStudentPhone').value.trim();
        const age = document.getElementById('addStudentAge').value.trim();
        
        if (!name || !phone) {
            alert('請填寫學生姓名和電話號碼');
            return;
        }
        
        // 收集所有課程信息
        const courseInfos = document.querySelectorAll('.course-info');
        const allStudents = [];
        
        for (let i = 0; i < courseInfos.length; i++) {
            const index = courseInfos[i].getAttribute('data-course-index');
            const location = document.getElementById(`addStudentLocation${index}`).value;
            const courseType = document.getElementById(`addStudentCourseType${index}`).value;
            const time = document.getElementById(`addStudentTime${index}`).value;
            const dates = document.getElementById(`addStudentDate${index}`).value;
            const wait = document.getElementById(`addStudentWait${index}`).value;
            
            if (!location) {
                alert(`請選擇課程信息 #${parseInt(index) + 1} 的上課地點`);
                return;
            }
            
            if (dates) {
                // 處理多個日期
                const dateArray = dates.split(',').map(d => d.trim());
                
                dateArray.forEach(date => {
                    const studentRecord = {
                        name: name,
                        age: age,
                        Phone_number: phone,
                        location: location,
                        type: courseType,
                        time: time,
                        待約: wait || '',
                        待約月份: '',
                        option1: '',
                        option2: '',
                        option3: '',
                        remark: '',
                        "上課日期": date
                    };
                    allStudents.push(studentRecord);
                });
            }
        }
        
        if (allStudents.length === 0) {
            alert('請至少選擇一個上課日期');
            return;
        }
        
        // 按日期分組
        const groupedData = {};
        allStudents.forEach(student => {
            const date = student["上課日期"];
            if (!groupedData[date]) {
                groupedData[date] = [];
            }
            groupedData[date].push(student);
        });
        
        // 轉換為數組格式
        const finalData = Object.keys(groupedData).map(date => ({
            date: date,
            students: groupedData[date]
        }));
        
        // 保存到雲端資料庫
        const result = await ipcRenderer.invoke('import-students-to-cloud', finalData, true);
        
        if (result.success) {
            alert('學生資料創建成功！');
            hideAddStudentModal();
            
            // 重新載入雲端資料
            await loadCloudStudents();
        } else {
            alert('創建失敗: ' + result.error);
        }
        
    } catch (error) {
        console.error('創建學生失敗:', error);
        alert('創建學生失敗: ' + error.message);
    }
}

// 更新時間格式
window.updateTimeFormat = function(index) {
    const startHour = document.getElementById(`addStudentTimeStartHour${index}`).value;
    const startMin = document.getElementById(`addStudentTimeStartMin${index}`).value;
    const endHour = document.getElementById(`addStudentTimeEndHour${index}`).value;
    const endMin = document.getElementById(`addStudentTimeEndMin${index}`).value;
    
    // 格式化時間，確保兩位數
    const formatTime = (hour, min) => {
        if (hour === '' || min === '') return '';
        const h = String(hour).padStart(2, '0');
        const m = String(min).padStart(2, '0');
        return `${h}:${m}`;
    };
    
    const startTime = formatTime(startHour, startMin);
    const endTime = formatTime(endHour, endMin);
    
    // 組合最終格式
    let finalFormat = '';
    if (startTime && endTime) {
        finalFormat = `${startTime}-${endTime}`;
    } else if (startTime) {
        finalFormat = startTime;
    } else if (endTime) {
        finalFormat = endTime;
    }
    
    // 更新顯示框
    document.getElementById(`addStudentTime${index}`).value = finalFormat;
}


