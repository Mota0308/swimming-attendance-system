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
    } else {
        // 第二步：檢查日期是否包含🎈符號
        if (!dateStr.includes('🎈')) {
            return '';
        } else {
            // 第三步：檢查時間格式是否正確
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
            if (!timeMatch) {
                return '';
            } else {
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
                    diffMinutes += 24 * 60; // 加上24小時
                }
                
                // 第五步：根據課程類型計算點數
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
        }
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
function login() {
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
function logout() {
    isLoggedIn = false;
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('unlockCode').value = '';
    document.getElementById('errorMessage').textContent = '';
}

// 切換標籤頁
function switchTab(tabName, event) {
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
function loadTabContent(tabName) {
    switch(tabName) {
        case 'attendance':
            loadAttendanceContent();
            break;
        case 'students':
            loadStudentsContent();
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
function loadAttendanceContent() {
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
function renderAttendanceTable() {
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
        if (!locationGroups[location]) {
            locationGroups[location] = [];
        }
        locationGroups[location].push(stu);
    });
    
    // 生成表格，按地點分類
    let html = '';
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
        <button id="exportCloudBtn" style="padding:10px 20px;margin-bottom:20px;">導出雲端資料</button>
        <button id="uploadCloudBtn" style="padding:10px 20px;margin-bottom:20px;margin-left:10px;">上傳資料</button>
        <div id="cloudStudentsList"></div>
    `;
    document.getElementById('exportCloudBtn').onclick = loadCloudStudents;
    document.getElementById('uploadCloudBtn').onclick = uploadAllStudentsToCloud;
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
                <input type="checkbox" style="color:  id="selectAllDate_${location.replace(/\s+/g, '_')}_${date.replace(/[^a-zA-Z0-9]/g, '_')}" onchange="toggleSelectAllInDate('${location}', '${date}', this)" style="margin-right:8px;">
                <b style="color: #FF0000;">📅 ${date}</b> 
                <span style="font-size: 12px; color: #999;">(共 ${dateStudents.length} 名學生)</span>
            </div>`;
            html += '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">';
            html += '<tr style="background:#f5f5f5;"><th style="border:1px solid #ddd;padding:8px;">選擇</th><th style="border:1px solid #ddd;padding:8px;">姓名</th><th style="border:1px solid #ddd;padding:8px;">年齡</th><th style="border:1px solid #ddd;padding:8px;">課程類型</th><th style="border:1px solid #ddd;padding:8px;">出席</th><th style="border:1px solid #ddd;padding:8px;">補/調堂</th><th style="border:1px solid #ddd;padding:8px;">總共點數</th><th style="border:1px solid #ddd;padding:8px;">時間</th><th style="border:1px solid #ddd;padding:8px;">上課日期</th><th style="border:1px solid #ddd;padding:8px;">待約</th><th style="border:1px solid #ddd;padding:8px;">操作</th></tr>';
            
            dateStudents.forEach(stu => {
                html += `<tr>
                    <td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox"></td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="text" value="${stu.name || ''}" style="width: 100px;" data-field="name" data-original-name="${stu.name || ''}" data-original-date="${stu['上課日期'] || ''}" onchange="updateCloudStudentFieldByElement(this)">
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="text" value="${stu.age || ''}" style="width: 60px;" data-field="age" data-original-name="${stu.name || ''}" data-original-date="${stu['上課日期'] || ''}" onchange="updateCloudStudentFieldByElement(this)">
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="text" value="${stu.type || ''}" style="width: 120px;" data-field="type" data-original-name="${stu.name || ''}" data-original-date="${stu['上課日期'] || ''}" onchange="updateCloudStudentFieldByElement(this)">
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <select style="width: 80px;" data-field="option1" data-original-name="${stu.name || ''}" data-original-date="${stu['上課日期'] || ''}" onchange="updateCloudStudentFieldByElement(this)">
                            <option value="">--</option>
                            <option value="出席1" ${stu.option1==="出席1"?"selected":""}>出席1</option>
                            <option value="出席1.5" ${stu.option1==="出席1.5"?"selected":""}>出席1.5</option>
                            <option value="出席2" ${stu.option1==="出席2"?"selected":""}>出席2</option>
                            <option value="出席2.5" ${stu.option1==="出席2.5"?"selected":""}>出席2.5</option>
                            <option value="出席3" ${stu.option1==="出席3"?"selected":""}>出席3</option>
                            <option value="缺席" ${stu.option1==="缺席"?"selected":""}>缺席</option>
                        </select>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <select style="width: 100px;" data-field="option2" data-original-name="${stu.name || ''}" data-original-date="${stu['上課日期'] || ''}" onchange="updateCloudStudentFieldByElement(this)">
                            <option value="">--</option>
                            <option value="🌟補0.5堂" ${stu.option2==="🌟補0.5堂"?"selected":""}>🌟補0.5堂</option>
                            <option value="🌟補1堂" ${stu.option2==="🌟補1堂"?"selected":""}>🌟補1堂</option>
                            <option value="🌟補1.5堂" ${stu.option2==="🌟補1.5堂"?"selected":""}>🌟補1.5堂</option>
                            <option value="🌟補2堂" ${stu.option2==="🌟補2堂"?"selected":""}>🌟補2堂</option>
                            <option value="🔁補1堂" ${stu.option2==="🔁補1堂"?"selected":""}>🔁補1堂</option>
                            <option value="🔁補1.5堂" ${stu.option2==="🔁補1.5堂"?"selected":""}>🔁補1.5堂</option>
                            <option value="🔁補2堂" ${stu.option2==="🔁補2堂"?"selected":""}>🔁補2堂</option>
                            <option value="🔁補2.5堂" ${stu.option2==="🔁補2.5堂"?"selected":""}>🔁補2.5堂</option>
                            <option value="🔁補3堂" ${stu.option2==="🔁補3堂"?"selected":""}>🔁補3堂</option>
                        </select>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="text" value="${calculateOption3FromTimeDifference(stu.time || '', stu['上課日期'] || '', stu.type || '') || stu.option3 || ''}" style="width: 60px; text-align: center;" readonly>
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="number" value="${stu.time || ''}" style="width: 120px;" min="0" max="23" step="0.5" placeholder="0-23" data-field="time" data-original-name="${stu.name || ''}" data-original-date="${stu['上課日期'] || ''}" onchange="updateCloudStudentFieldByElement(this)">
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="text" value="${stu['上課日期'] || ''}" style="width: 100px;" class="date-picker" data-field="date" data-original-name="${stu.name || ''}" data-original-date="${stu['上課日期'] || ''}" onchange="updateCloudStudentFieldByElement(this)">
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;">
                        <input type="text" value="${stu.待約 || ''}" style="width: 60px;" data-field="wait" data-original-name="${stu.name || ''}" data-original-date="${stu['上課日期'] || ''}" onchange="updateCloudStudentFieldByElement(this)">
                    </td>
                    <td style="border:1px solid #ddd;padding:8px;text-align:center;">
                        <button onclick="deleteCloudStudent('${stu.name || ''}', '${stu['上課日期'] || ''}')" style="padding:4px 10px;background:#e74c3c;color:white;border:none;border-radius:3px;">刪除</button>
                    </td>
                </tr>`;
            });
            html += '</table>';
        });
    });
    
    document.getElementById('cloudStudentsList').innerHTML = html;
    
    // 初始化日期選擇器
    initializeDatePickers();
}

// 修改 loadCloudStudents 讓刷新後自動渲染
window.loadCloudStudents = function() {
    ipcRenderer.invoke('fetch-students-from-cloud').then(grouped => {
        window.cloudStudentsGrouped = grouped;
        renderCloudStudentsTableFromCache();
    });
};

// 新增：處理雲端學生欄位更新
window.updateCloudStudentField = function(studentName, date, fieldName, newValue) {
    console.log('更新雲端學生欄位:', { studentName, date, fieldName, newValue });
    
    // 找到對應的學生記錄
    let grouped = window.cloudStudentsGrouped || [];
    let foundStudent = null;
    let foundGroup = null;
    
    for (let group of grouped) {
        for (let student of group.students) {
            if (student.name === studentName && (student.date === date || student['上課日期'] === date)) {
                foundStudent = student;
                foundGroup = group;
                break;
            }
        }
        if (foundStudent) break;
    }
    
    if (foundStudent) {
        // 如果是日期變更，需要檢查重複學生
        if (fieldName === 'date') {
            const phone = foundStudent.phone || foundStudent.phoneNumber || foundStudent.Phone_number || '';
            // 支援異步檢查
            Promise.resolve(checkDuplicateStudent(studentName, phone, newValue, date)).then(isDup => {
                if (isDup) {
                    showDuplicateStudentModal();
                    return;
                }
                // 僅同步更新日期，其他欄位保持不變，並在 GUI 移動到新日期分組
                handleDateChange(studentName, date, newValue, foundStudent);
            }).catch(err => {
                console.error('檢查重複學生失敗:', err);
            });
            return;
        }
        
        // 構建更新資料
        let updateData = {
            name: foundStudent.name,
            age: foundStudent.age,
            type: foundStudent.type,
            time: foundStudent.time,
            option1: foundStudent.option1,
            option2: foundStudent.option2,
            option3: foundStudent.option3,
            date: date
        };
        
        // 更新對應的欄位
        updateData[fieldName] = newValue;
        
        // 如果是姓名變更，需要特殊處理
        if (fieldName === 'name') {
            updateData.name = newValue;
        }
        
        // 如果是日期變更，需要特殊處理
        if (fieldName === 'date') {
            updateData.date = newValue;
            updateData['上課日期'] = newValue;
        }
        
        // 使用現有的更新函數
        updateCloudStudent(studentName, date, updateData);
    } else {
        console.error('找不到對應的學生記錄:', { studentName, date });
        alert('找不到對應的學生記錄');
    }
};

// 保留舊的函數以兼容其他地方的調用
window.updateCloudStudentOption = function(studentName, date, optionType, newValue) {
    updateCloudStudentField(studentName, date, optionType, newValue);
};

// 修改 uploadAllStudentsToCloud 讓上傳後自動渲染
function uploadAllStudentsToCloud() {
    // 只取勾選的學生（遍歷所有表格）
    let checkedStudents = [];
    const tables = document.getElementById('cloudStudentsList')?.querySelectorAll('table');
    if (tables) {
        tables.forEach(table => {
            const trs = table.querySelectorAll('tr');
            trs.forEach((tr, idx) => {
                if (idx === 0) return; // 跳過表頭
                const cb = tr.querySelector('input[type="checkbox"]');
                if (cb && cb.checked) {
                    const tds = tr.querySelectorAll('td');
                    let name = tds[1]?.textContent.trim();
                    let age = tds[2]?.textContent.trim();
                    let phone = tds[3]?.textContent.trim();
                    let type = tds[4]?.textContent.trim();
                    let option1 = tds[5]?.querySelector('select')?.value || '';
                    let option2 = tds[6]?.querySelector('select')?.value || '';
                    let option3 = tds[7]?.querySelector('input')?.value || '';
                    let time = tds[8]?.textContent.trim();
                    let date = tds[9]?.textContent.trim();
                    let wait = tds[10]?.textContent.trim();
                    
                    // 從雲端緩存中找到原始資料進行比對
                    let originalStudent = null;
                    if (window.cloudStudentsGrouped) {
                        for (let group of window.cloudStudentsGrouped) {
                            for (let stu of group.students) {
                                if (stu.name === name && group.date === date) {
                                    originalStudent = { ...stu, "上課日期": group.date };
                                    break;
                                }
                            }
                            if (originalStudent) break;
                        }
                    }
                    
                    // 構建學生物件，只包含有變動的欄位
                    let stuObj = { name, "上課日期": date }; // 主鍵必須包含
                    
                    // 比對每個欄位，只包含有變動的
                    if (originalStudent) {
                        if (age !== originalStudent.age) stuObj.age = age;
                        if (phone !== originalStudent.Phone_number) stuObj.Phone_number = phone;
                        if (type !== originalStudent.type) stuObj.type = type;
                        if (option1 !== originalStudent.option1) stuObj.option1 = option1;
                        if (option2 !== originalStudent.option2) stuObj.option2 = option2;
                        if (option3 !== originalStudent.option3) stuObj.option3 = option3;
                        if (time !== originalStudent.time) stuObj.time = time;
                        if (wait !== originalStudent.待約) stuObj.待約 = wait;
                    } else {
                        // 如果找不到原始資料，包含所有非空欄位
                        if (age) stuObj.age = age;
                        if (phone) stuObj.Phone_number = phone;
                        if (type) stuObj.type = type;
                        if (option1) stuObj.option1 = option1;
                        if (option2) stuObj.option2 = option2;
                        if (option3) stuObj.option3 = option3;
                        if (time) stuObj.time = time;
                        if (wait) stuObj.待約 = wait;
                    }
                    
                    checkedStudents.push(stuObj);
                }
            });
        });
    }
    if (checkedStudents.length === 0) {
        alert('請至少勾選一位學生');
        return;
    }
    // 分組：按日期分組
    let groupMap = {};
    checkedStudents.forEach(stu => {
        let date = stu["上課日期"];
        if (!date || date.trim() === '') {
            console.log('跳過缺少日期的學生:', stu);
            return;
        }
        if (!groupMap[date]) groupMap[date] = [];
        groupMap[date].push(stu);
    });
    let grouped = Object.keys(groupMap).map(date => ({
        date: date,
        students: groupMap[date]
    }));
    ipcRenderer.invoke('import-students-to-cloud', grouped, false) // 系統配置頁面：不允許創建新文檔
        .then(result => {
            if (result.success) {
                alert('上傳雲端成功！');
                loadCloudStudents(); // 重新載入雲端資料並自動渲染
            } else {
                alert('上傳失敗：' + result.error);
            }
        });
}

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

function showChangeUnlockModal() {
    document.getElementById('changeUnlockModal').style.display = 'flex';
    document.getElementById('absolutePassword').value = '';
    document.getElementById('newUnlockCode').value = '';
    document.getElementById('changeUnlockError').textContent = '';
}

function hideChangeUnlockModal() {
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
                    const studentData = { ...currentStudentBase, time, weekday, dates: dateArr.join('、'), datesArr: dateArr };
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
                    <td style='border:1px solid #ddd;padding:8px;'>
                        <select style="width: 80px;">
                            <option value="">--</option>
                            <option value="出席1">出席1</option>
                            <option value="出席1.5">出席1.5</option>
                            <option value="出席2">出席2</option>
                            <option value="出席2.5">出席2.5</option>
                            <option value="出席3">出席3</option>
                            <option value="缺席">缺席</option>
                        </select>
                    </td>
                    <td style='border:1px solid #ddd;padding:8px;'>
                        <select style="width: 100px;">
                            <option value="">--</option>
                            <option value="🌟補0.5堂">🌟補0.5堂</option>
                            <option value="🌟補1堂">🌟補1堂</option>
                            <option value="🌟補1.5堂">🌟補1.5堂</option>
                            <option value="🌟補2堂">🌟補2堂</option>
                            <option value="🔁補1堂">🔁補1堂</option>
                            <option value="🔁補1.5堂">🔁補1.5堂</option>
                            <option value="🔁補2堂">🔁補2堂</option>
                            <option value="🔁補2.5堂">🔁補2.5堂</option>
                            <option value="🔁補3堂">🔁補3堂</option>
                        </select>
                    </td>
                    <td style='border:1px solid #ddd;padding:8px;'>
                        <input type="text" value="${calculateOption3FromTimeDifference(stu.time || '', datesArr.join('、') || '', stu.type || '')}" style="width: 60px; text-align: center;" readonly>
                    </td>
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
                            let monthBlockRegex = /([0-9]{1,2})月[ ]*([0-9\/🎈🎁 ]+)/g;
                            let match;
                            while ((match = monthBlockRegex.exec(block)) !== null) {
                                let month = parseInt(match[1], 10);
                                let daysPart = match[2];
                                let daysWithSymbol = daysPart.split('/').map(s => s.trim()).filter(Boolean);
                                daysWithSymbol.forEach(ds => {
                                    let mds = ds.match(/^([0-9]{1,2})([🎈🎁]*)$/);
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
                                    let mDay = part.match(/^([0-9]{1,2})([🎈🎁]*)$/);
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
        let monthBlockRegex = /([0-9]{1,2})月[ ]*([0-9\/🎈🎁 ]+)/g;
        let match;
        while ((match = monthBlockRegex.exec(line)) !== null) {
            let month = parseInt(match[1], 10);
            let daysPart = match[2];
            let daysWithSymbol = daysPart.split('/').map(s => s.trim()).filter(Boolean);
            daysWithSymbol.forEach(ds => {
                let mds = ds.match(/^([0-9]{1,2})([🎈🎁]*)$/);
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
            let mDay = part.match(/^([0-9]{1,2})([🎈🎁]*)$/);
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



function saveSelectedStudents() {
    const tbody = document.getElementById('extractedTableBody');
    if (!tbody) return;
    let selected = [];
    for (let i = 0; i < tbody.children.length; i++) {
        const tr = tbody.children[i];
        const checkbox = tr.querySelector('.studentRowCheckbox, .student-row-checkbox');
        if (checkbox && checkbox.checked) {
            let cells = tr.children;
            
            // 檢查是否有足夠的欄位
            if (cells.length < 15) {
                console.warn('表格行欄位不足:', cells.length);
                continue;
            }
            
            let time = cells[10]?.textContent?.trim() || '';
            let dates = cells[11]?.textContent?.trim() || '';
            
            // 讀取新增的三個欄位值
            let option1 = cells[7]?.querySelector('select')?.value || '';
            let option2 = cells[8]?.querySelector('select')?.value || '';
            let option3 = cells[9]?.querySelector('input')?.value || '';
            
            // 驗證必要欄位
            let name = cells[2]?.textContent?.trim() || '';
            let location = cells[5]?.textContent?.trim() || '';
            let type = cells[6]?.textContent?.trim() || '';
            
            if (!name || !location || !type) {
                console.warn('跳過缺少必要欄位的學生資料:', { name, location, type });
                continue;
            }
            
            selected.push({
                name: name,
                phone: cells[3]?.textContent?.trim().replace(/[:：]/g, '') || '',
                age: cells[4]?.textContent?.trim() || '',
                location: location,
                type: type,
                option1: option1,
                option2: option2,
                option3: option3,
                time: time,
                dates: dates,
                waitMonth: cells[13]?.textContent?.trim() || '',
                wait: cells[12]?.textContent?.trim() || '',
                year: cells[14]?.textContent?.trim() || '',
            });
        }
    }
    // 讀取現有資料
    let locationMap = {};
    try {
        locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
    } catch (e) {}
    // 疊加新資料
    selected.forEach(stu => {
        // 確保 stu.location 存在且有效
        if (!stu.location || typeof stu.location !== 'string' || stu.location.trim() === '') {
            console.warn('跳過無效地點的學生資料:', stu);
            return; // 跳過這個學生
        }
        
        if (!locationMap[stu.location]) locationMap[stu.location] = [];
        // 避免重複（根據姓名、時間、課程類型、日期）
        let isDup = locationMap[stu.location].some(s =>
            s.name === stu.name && s.time === stu.time && s.type === stu.type && s.dates === stu.dates
        );
        if (!isDup) locationMap[stu.location].push(stu);
    });
    localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
    // === 新增：同步上傳到雲端 ===
    if (selected.length > 0) {
        // 按地點和日期分組
        let groupMap = {};
        selected.forEach(stu => {
            // 確保學生資料完整
            if (!stu.location || !stu.dates || !stu.name) {
                console.warn('跳過不完整的學生資料:', stu);
                return;
            }
            
            // 將日期字符串分割成數組
            let dateArr = stu.dates.split(/[、,，]/).map(d => d.trim()).filter(Boolean);
            if (dateArr.length === 0) {
                console.warn('學生沒有有效日期:', stu);
                return;
            }
            
            dateArr.forEach(dateStr => {
                // 轉換中文日期為ISO格式
                function chineseDateToISO(str) {
                    const match = str.match(/(\d{1,2})月(\d{1,2})日/);
                    if (match) {
                        const month = parseInt(match[1], 10);
                        const day = parseInt(match[2], 10);
                        const now = new Date();
                        let year = now.getFullYear();
                        const thisYearDate = new Date(year, month - 1, day);
                        if (thisYearDate < now) year += 1;
                        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    }
                    return str;
                }
                let stdDate = chineseDateToISO(dateStr);
                if (!stdDate || stdDate === dateStr) {
                    console.warn('無法解析日期:', dateStr, '學生:', stu.name);
                    return;
                }
                
                let key = `${stu.location}||${stdDate}`;
                if (!groupMap[key]) groupMap[key] = { date: stdDate, students: [] };
                groupMap[key].students.push({
                    name: stu.name,
                    phone: stu.phone,
                    age: stu.age,
                    location: stu.location,
                    type: stu.type,
                    option1: stu.option1,
                    option2: stu.option2,
                    option3: stu.option3,
                    time: stu.time,
                    date: stdDate,
                    wait: stu.wait,
                    waitMonth: stu.waitMonth,
                });
            });
        });
        const grouped = Object.values(groupMap);
        const { ipcRenderer } = require('electron');
        ipcRenderer.invoke('import-students-to-cloud', grouped, true).then(result => {
            if (result && result.success) {
                alert('已保存並同步雲端成功！');
            } else {
                alert('本地已保存，但同步雲端失敗：' + (result && result.error ? result.error : '未知錯誤'));
            }
        });
    } else {
        alert('已保存勾選的學生資料！');
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
            
            // 確保 stu.dates 存在且有效
            if (!stu.dates || typeof stu.dates !== 'string' || stu.dates.trim() === '') {
                match = false; // 如果沒有日期資料，不匹配
            } else {
                let stuDates = stu.dates.split('、').map(s => s.trim()).filter(Boolean);
                // 確保 stuDates 是有效的數組
                if (Array.isArray(stuDates) && stuDates.length > 0) {
                    // 只要有一个日期在区间内就显示
                    let inRange = stuDates.some(dateStr => {
                        let m = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
                        if (!m) return false;
                        let y = new Date().getFullYear();
                        let d = new Date(y, parseInt(m[1],10)-1, parseInt(m[2],10));
                        return d >= startDate && d <= endDate;
                    });
                    match = match && inRange;
                } else {
                    match = false; // 如果沒有有效的日期，不匹配
                }
            }
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
        // 確保 stu.dates 存在且有效
        if (stu.dates && typeof stu.dates === 'string' && stu.dates.trim() !== '') {
            let stuDates = stu.dates.split('、').map(d => d.trim()).filter(Boolean);
            if (stu.name === studentName && stuDates.includes(date)) {
                studentIndex = index;
            }
        }
    });
    
    if (studentIndex !== -1) {
        let student = locationMap[loc][studentIndex];
        // 確保 student.dates 存在且有效
        if (student.dates && typeof student.dates === 'string' && student.dates.trim() !== '') {
            let stuDates = student.dates.split('、').map(d => d.trim()).filter(Boolean);
            
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

// 雲端資料編輯函數
window.editCloudStudent = function(studentName, originalDate, btn) {
    let tr = btn.closest('tr');
    let tds = tr.querySelectorAll('td');
    
    if (btn.textContent === '編輯') {
        // 進入編輯模式
        tds.forEach((td, i) => {
            if (i >= 1 && i <= 8) { // 跳過選擇框，編輯姓名到上課日期
                const val = td.textContent.trim();
                td.setAttribute('data-old', val);
                
                if (i === 1) { // 姓名
                    td.innerHTML = `<input type="text" style="width: 80px;" value="${val}">`;
                } else if (i === 2) { // 年齡
                    td.innerHTML = `<input type="text" style="width: 60px;" value="${val}">`;
                } else if (i === 3) { // 課程類型
                    td.innerHTML = `<input type="text" style="width: 120px;" value="${val}" onchange="updateOption3FromCourseType(this)">`;
                } else if (i === 4) { // 選項1 - 保持select
                    // 不轉換為input，保持select下拉選單
                } else if (i === 5) { // 選項2 - 保持select
                    // 不轉換為input，保持select下拉選單
                } else if (i === 6) { // 選項3 - 保持readonly input
                    // 不轉換，保持readonly
                } else if (i === 7) { // 時間
                    let [start, end] = val.split('-');
                    let [sh, sm] = start ? start.split(':') : ['',''];
                    let [eh, em] = end ? end.split(':') : ['',''];
                    td.innerHTML = `<input type="number" min="0" max="23" style="width:40px;" value="${sh||''}" onchange="updateOption3FromTime(this)">:<input type="number" min="0" max="59" style="width:40px;" value="${sm||''}" onchange="updateOption3FromTime(this)"> - <input type="number" min="0" max="23" style="width:40px;" value="${eh||''}" onchange="updateOption3FromTime(this)">:<input type="number" min="0" max="59" style="width:40px;" value="${em||''}" onchange="updateOption3FromTime(this)">`;
                } else if (i === 8) { // 上課日期
                    let match = val.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                    let dateVal = '';
                    if (match) {
                        dateVal = `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
                    }
                    // 使用文本輸入框，允許用戶手動添加🎈符號
                    td.innerHTML = `<input type="text" style="width:130px;" value="${val}" onchange="updateOption3FromDate(this)" placeholder="YYYY-MM-DD🎈">`;
                }
                
                td.style.background = '#fffbe6';
            }
        });
        btn.textContent = '保存';
    } else {
        // 保存編輯
        let newStudentData = {
            name: '',
            age: '',
            type: '',
            time: '',
            date: '',
            option1: '',
            option2: '',
            option3: ''
        };
        
        // 獲取編輯後的數據
        tds.forEach((td, i) => {
            if (i >= 1 && i <= 8) {
                let input = td.querySelector('input');
                let oldVal = td.getAttribute('data-old') || '';
                let newVal = input ? input.value.trim() : oldVal;
                
                if (i === 1) { // 姓名
                    newStudentData.name = newVal;
                    td.textContent = newVal;
                } else if (i === 2) { // 年齡
                    newStudentData.age = newVal;
                    td.textContent = newVal;
                } else if (i === 3) { // 課程類型
                    newStudentData.type = newVal;
                    td.textContent = newVal;
                } else if (i === 4) { // 選項1
                    let select = td.querySelector('select');
                    newStudentData.option1 = select ? select.value : oldVal;
                } else if (i === 5) { // 選項2
                    let select = td.querySelector('select');
                    newStudentData.option2 = select ? select.value : oldVal;
                } else if (i === 6) { // 選項3
                    let input = td.querySelector('input');
                    newStudentData.option3 = input ? input.value : oldVal;
                } else if (i === 7) { // 時間
                    let nums = td.querySelectorAll('input');
                    let sh = String(nums[0]?.value).padStart(2,'0');
                    let sm = String(nums[1]?.value).padStart(2,'0');
                    let eh = String(nums[2]?.value).padStart(2,'0');
                    let em = String(nums[3]?.value).padStart(2,'0');
                    newVal = (sh && sm && eh && em) ? `${sh}:${sm}-${eh}:${em}` : '';
                    newStudentData.time = newVal;
                    td.textContent = newVal;
                } else if (i === 8) { // 上課日期
                    if (input && input.value) {
                        newStudentData.date = input.value;
                        td.textContent = input.value;
                    } else {
                        td.textContent = oldVal;
                        newStudentData.date = oldVal;
                    }
                }
                
                td.style.background = '';
                td.removeAttribute('data-old');
            }
        });
        
        // 重新計算選項3
        let finalTimeStr = newStudentData.time;
        let finalDateStr = newStudentData.date;
        let finalCourseType = newStudentData.type;
        if (finalTimeStr && finalDateStr && finalDateStr.includes('🎈')) {
            newStudentData.option3 = calculateOption3FromTimeDifference(finalTimeStr, finalDateStr, finalCourseType);
        }
        
        // 更新雲端資料庫
        updateCloudStudent(studentName, originalDate, newStudentData);
        btn.textContent = '編輯';
    }
}

// 更新雲端資料庫中的學生資料
async function updateCloudStudent(originalName, originalDate, newData) {
    try {
        console.log('updateCloudStudent 開始:', { originalName, originalDate, newData });
        // 獲取當前雲端資料
        let grouped = window.cloudStudentsGrouped || [];
        
        // 找到並更新對應的學生記錄
        let updated = false;
        grouped.forEach(group => {
            group.students.forEach((stu, index) => {
                if (stu.name === originalName && (stu.date === originalDate || stu['上課日期'] === originalDate || group.date === originalDate)) {
                    // 更新學生資料
                    stu.name = newData.name;
                    stu.age = newData.age;
                    stu.type = newData.type;
                    stu.time = newData.time;
                    stu.option1 = newData.option1;
                    stu.option2 = newData.option2;
                    stu.option3 = newData.option3;
                    
                    // 僅更新學生的日期欄位，不移動學生資料
                    if (newData.date !== undefined && newData.date !== originalDate) {
                        stu.date = newData.date;
                        stu['上課日期'] = newData.date;
                    }
                    
                    updated = true;
                }
            });
        });
        
        if (updated) {
            // 找到原始學生記錄以獲取正確的雲端日期字段
            let originalStudentRecord = null;
            grouped.forEach(group => {
                group.students.forEach(stu => {
                    if (stu.name === originalName && (stu.date === originalDate || stu['上課日期'] === originalDate || group.date === originalDate)) {
                        originalStudentRecord = stu;
                    }
                });
            });
            
            // 構建只包含變動的欄位的資料
            let updateData = {
                name: originalStudentRecord ? originalStudentRecord.name : originalName,
                "上課日期": originalStudentRecord ? (originalStudentRecord['上課日期'] || originalStudentRecord.date || originalDate) : originalDate
            };
            
            if (newData.age !== undefined && newData.age !== null && newData.age !== '') updateData.age = newData.age;
            if (newData.type !== undefined && newData.type !== null && newData.type !== '') updateData.type = newData.type;
            if (newData.time !== undefined && newData.time !== null && newData.time !== '') updateData.time = newData.time;
            if (newData.option1 !== undefined && newData.option1 !== null && newData.option1 !== '') updateData.option1 = newData.option1;
            if (newData.option2 !== undefined && newData.option2 !== null && newData.option2 !== '') updateData.option2 = newData.option2;
            if (newData.option3 !== undefined && newData.option3 !== null && newData.option3 !== '') updateData.option3 = newData.option3;
            if (newData.date !== undefined && newData.date !== null && newData.date !== '') {
                updateData.date = newData.date;
                updateData['上課日期'] = newData.date;
            }
            
            let groupedUpdate = [{
                date: newData.date || originalDate,
                students: [updateData]
            }];
            
            console.log('準備更新雲端資料:', updateData);
            const result = await ipcRenderer.invoke('import-students-to-cloud', groupedUpdate, false);
            console.log('雲端更新結果:', result);
            
            window.cloudStudentsGrouped = grouped;
            renderCloudStudentsTableFromCache();
        } else {
            alert('找不到要更新的學生資料');
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

// 實時更新選項3的函數（從日期變化觸發）
window.updateOption3FromDate = function(input) {
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
    } else {
        // 第三步：檢查日期是否包含🎈符號
        if (!dateStr.includes('🎈')) {
            updateOption3Field(tds, '');
            return;
        } else {
            // 第四步：檢查時間格式是否正確
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
            if (!timeMatch) {
                updateOption3Field(tds, '');
                return;
            } else {
                // 第五步：計算時間差
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
                
                // 第六步：根據課程類型計算點數
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
                    else if (diffMinutes === 210) { option3Value = '4'; }
                    else if (diffMinutes === 240) { option3Value = '4.5'; }
                }
                
                // 更新選項3欄位
                updateOption3Field(tds, option3Value);
            }
        }
    }
}

// 輔助函數：更新選項3欄位
function updateOption3Field(tds, value) {
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
        remainingCount: 0,     // 剩餘堂數
        remainingpoints: 0    // 剩餘點數
    };
    
    // 根據姓名+電話號碼找到該學生的所有記錄
    let studentRecords = allStudents.filter(stu => 
        stu.name === student.name && 
        (stu.Phone_number || stu.phoneNumber || stu["電話號碼"] || stu.phone || '') === (student.phone || '')
    );
    
    // 計算已約堂數（統計該學生的資料格中的"上課日期"有内容的數量）
    studentRecords.forEach(record => {
        // 檢查多種可能的日期欄位
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
    
    // 計算待約堂數（從雲端資料的"待約"欄位獲取）
    stats.waitCount = parseInt(student.wait || student.待約 || '0');
    
    // 計算已購買堂數（查看雲端中同一學生出現的資料格數量，判斷條件是相同姓名+電話號碼）
    stats.totalPurchased = studentRecords.length;
    
    // 計算已購買點數（該學生資料格中的option3的數字和"待約"的數字的總和）
    let totalOption3Points = 0;
    studentRecords.forEach(record => {
        if (record.option3 && record.option3.trim() !== '') {
            let points = parseFloat(record.option3);
            if (!isNaN(points)) {
                totalOption3Points += points;
            }
        }
    });
    stats.totalPoints = totalOption3Points + stats.waitCount;
    
    // 計算已出席堂數（同一名學生中"選項1"有顯示文字的資料格數量）
    studentRecords.forEach(record => {
        if (record.option1 && record.option1.trim() !== '') {
            stats.attendedCount++;
        }
    });
    
    // 計算剩餘堂數（已購買堂數 - 已出席堂數）
    stats.remainingCount = Math.max(0, stats.totalPurchased - stats.attendedCount);
    
    // 計算剩餘點數（已購買點數減去該學生的所有資料庫中的該學生所有的"option3"的數字的總和）
    stats.remainingpoints = Math.max(0, stats.totalPoints - totalOption3Points);
    
    return stats;
}

window.editStudent = async function(loc, idx, btn) {
    let tr = btn.closest('tr');
    let tds = tr.querySelectorAll('.editable');
    if (btn.textContent === '編輯') {
        tds.forEach((td, i) => {
            const val = td.textContent.trim();
            td.setAttribute('data-old', val);
            if (i === 3) { // 時間
                let [start, end] = val.split('-');
                let [sh, sm] = start ? start.split(':') : ['',''];
                let [eh, em] = end ? end.split(':') : ['',''];
                td.innerHTML = `<input type="number" min="0" max="23" style="width:40px;" value="${sh||''}">:<input type="number" min="0" max="59" style="width:40px;" value="${sm||''}"> - <input type="number" min="0" max="23" style="width:40px;" value="${eh||''}">:<input type="number" min="0" max="59" style="width:40px;" value="${em||''}">`;
            } else if (i === 4) { // 上課日期+年份合併
                let match = val.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                let dateVal = '';
                if (match) {
                    dateVal = `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
                }
                td.innerHTML = `<input type="date" style="width:130px;" value="${dateVal}">`;
            } else {
                td.innerHTML = `<input type="text" style="width: 80px;" value="${val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}">`;
            }
            td.style.background = '#fffbe6';
        });
        btn.textContent = '保存';
    } else {
        let locationMap = JSON.parse(localStorage.getItem('savedStudentsByLocation')) || {};
        let students = locationMap[loc] || [];
        
        // 獲取當前行的所有數據
        let tds = tr.querySelectorAll('td');
        let currentName = tds[1]?.textContent.trim();
        let currentDate = tds[8]?.textContent.trim();
        
        // 創建新的學生對象或更新現有對象
        let editableTds = tr.querySelectorAll('.editable');
        let newStudentData = {
            name: '',
            age: '',
            type: '',
            time: '',
            date: '',
            year: '',
            location: loc,
            phone: '',
            wait: '',
            waitMonth: '',
            option3: ''
        };
        
        let newDate = '';
        let oldDate = currentDate;
        
        editableTds.forEach((td, i) => {
            let input = td.querySelector('input');
            let oldVal = td.getAttribute('data-old') || '';
            let newVal = input ? input.value.trim() : oldVal;
            
            if (i === 0) { // 姓名
                newStudentData.name = newVal;
                td.textContent = newVal;
            } else if (i === 1) { // 年齡
                newStudentData.age = newVal;
                td.textContent = newVal;
            } else if (i === 2) { // 課程類型
                newStudentData.type = newVal;
                td.textContent = newVal;
            } else if (i === 3) { // 時間
                let nums = td.querySelectorAll('input');
                let sh = String(nums[0]?.value).padStart(2,'0');
                let sm = String(nums[1]?.value).padStart(2,'0');
                let eh = String(nums[2]?.value).padStart(2,'0');
                let em = String(nums[3]?.value).padStart(2,'0');
                newVal = (sh && sm && eh && em) ? `${sh}:${sm}-${eh}:${em}` : '';
                newStudentData.time = newVal;
                td.textContent = newVal;
            } else if (i === 4) { // 上課日期
                if (input && input.value) {
                    newDate = input.value;
                    let formattedDate = formatDateToChinese(newDate);
                    newStudentData.date = formattedDate;
                    newStudentData.year = newDate.split('-')[0];
                    td.textContent = formattedDate;
                } else {
                    td.textContent = oldVal;
                    newStudentData.date = oldVal;
                }
            }
            
            td.style.background = '';
            td.removeAttribute('data-old');
        });
        
        // 嘗試找到現有的學生記錄進行更新
        let existingStudentIndex = -1;
        students.forEach((stu, index) => {
            let stuDate = stu["上課日期"] || stu.date || '';
            if (stu.name === currentName && stuDate === currentDate) {
                existingStudentIndex = index;
            }
        });
        
        if (existingStudentIndex !== -1) {
            // 更新現有學生記錄
            let existingStudent = students[existingStudentIndex];
            existingStudent.name = newStudentData.name;
            existingStudent.age = newStudentData.age;
            existingStudent.type = newStudentData.type;
            existingStudent.time = newStudentData.time;
            
            // 如果日期有變動，需要重新組織數據
            if (newDate && newStudentData.date !== oldDate) {
                // 從原分組移除
                students.splice(existingStudentIndex, 1);
                // 創建新的學生記錄
                let newStudent = {
                    ...existingStudent,
                    date: newStudentData.date,
                    year: newStudentData.year,
                    "上課日期": newStudentData.date // 更新上課日期字段
                };
                students.push(newStudent);
            } else {
                existingStudent.date = newStudentData.date;
                existingStudent.year = newStudentData.year;
            }
        } else {
            // 創建新的學生記錄
            let newStudent = {
                ...newStudentData,
                "上課日期": newStudentData.date,
                phone: '',
                wait: '',
                waitMonth: ''
            };
            students.push(newStudent);
        }
        
        localStorage.setItem('savedStudentsByLocation', JSON.stringify(locationMap));
        btn.textContent = '編輯';
        
        // 重新渲染以顯示更新後的數據
        showStudentsByLocation(loc);
        
        // 自動上傳到雲端（僅更新模式，不創建新資料）
        try {
            let updateData = {
                name: newStudentData.name,
                age: newStudentData.age,
                type: newStudentData.type,
                time: newStudentData.time,
                "上課日期": newStudentData.date,
                location: loc
            };
            
            let groupedUpdate = [{
                date: newStudentData.date,
                students: [updateData]
            }];
            
            // 使用更新模式，不允許創建新文檔
            await ipcRenderer.invoke('import-students-to-cloud', groupedUpdate, false);
            console.log('編輯的學生資料已自動上傳到雲端');
        } catch (error) {
            console.error('自動上傳到雲端失敗:', error);
            // 不顯示錯誤給用戶，因為本地保存已成功
        }
    }
}

// renderStudentsTable 只顯示合併後的日期欄位，選項1/2/3保持下拉清單

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
                    let date = tds[8]?.textContent.trim();
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
            // 解析日期
            let m = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
            if (!m) return;
            let month = parseInt(m[1], 10);
            let day = parseInt(m[2], 10);
            let year = new Date().getFullYear();
            let dateObj = new Date(year, month - 1, day);
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
            let date = tds[8]?.textContent.trim();
            if (!name || !date) return;
            // 找到對應學生
            let stu = locationMap[loc].find(s => {
                let stuDates = (s.dates || '').split('、').map(d => d.trim()).filter(Boolean);
                return s.name === name && stuDates.includes(date);
            });
            if (!stu) return;
            // 保存三個下拉選單的值
            let select1 = tds[4]?.querySelector('select')?.value || '';
            let select2 = tds[5]?.querySelector('select')?.value || '';
            let select3 = tds[6]?.querySelector('input')?.value || '';
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
        // 使用單一日期欄位，不再使用 dates
        let date = stu["上課日期"] || stu.date || '';
        if (date && date.trim() !== '') {
            if (!dateGroups[date]) dateGroups[date] = [];
            dateGroups[date].push(stu);
        }
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
        html += `<tr style="background:#f5f5f5;">
            <th style="text-align:center;"><input type='checkbox' class='selectAllManageRows' onclick='toggleSelectAllManageRowsTable(this)' /></th>
            <th style="padding-left:25px;">姓名</th>
            <th style="padding-left:50px;">年齡</th>
            <th style="padding-right:50px;">課程類型</th>
            <th>出席</th>
            <th>補/調堂</th>
            <th>補/調堂點數</th>
            <th>時間</th>
            <th>上課日期</th>
            <th>操作</th>
        </tr>`;
        // 這裡加排序：根據時間由早到晚
        dateStudents
            .sort((a, b) => compareTimes(a.time, b.time))
            .forEach((stu, idx) => {
                html += `<tr>
                    <td style="text-align:center;"><input type="checkbox" class="manageRowCheckbox"></td>
                    <td class="editable" style="padding-left:50px;">${stu.name}</td>
                    <td class="editable" style="padding-left:50px;">${stu.age}</td>
                    <td class="editable" style="padding-left:50px;">${stu.type}</td>
                    <td>
                        <select style="width: 80px;">
                            <option value="">--</option>
                            <option value="出席1">出席1</option>
                            <option value="出席1.5">出席1.5</option>
                            <option value="出席2">出席2</option>
                            <option value="出席2.5">出席2.5</option>
                            <option value="出席3">出席3</option>
                            <option value="缺席">缺席</option>
                        </select>
                    </td>
                    <td>
                        <select style="width: 100px;">
                            <option value="">--</option>
                            <option value="🌟補0.5堂">🌟補0.5堂</option>
                            <option value="🌟補1堂">🌟補1堂</option>
                            <option value="🌟補1.5堂">🌟補1.5堂</option>
                            <option value="🌟補2堂">🌟補2堂</option>
                            <option value="🔁補1堂">🔁補1堂</option>
                            <option value="🔁補1.5堂">🔁補1.5堂</option>
                            <option value="🔁補2堂">🔁補2堂</option>
                            <option value="🔁補2.5堂">🔁補2.5堂</option>
                            <option value="🔁補3堂">🔁補3堂</option>
                        </select>
                    </td>
                    <td><input type="text" value="${stu.option3 || ''}" style="width: 60px; text-align: center;" readonly></td>
                    <td class="editable">${stu.time}</td>
                    <td class="editable">${date}</td>
                    <td>
                        <button onclick="editStudent('${loc}', ${idx}, this)" style="margin-right:5px;padding:4px 10px;">編輯</button>
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

// 新增：檢查重複學生函數
function checkDuplicateStudent(studentName, phone, newDate, originalDate) {
    const grouped = window.cloudStudentsGrouped || [];
    
    // 遍歷所有學生，檢查是否有相同的姓名+電話號碼在新日期中
    for (let group of grouped) {
        if (group.date === newDate) {
            for (let student of group.students) {
                if (student.name === studentName && 
                    (student.phone === phone || student.phoneNumber === phone || student.Phone_number === phone)) {
                    return true; // 找到重複
                }
            }
        }
    }
    return false; // 沒有重複
}

// 新增：顯示重複學生提示框
function showDuplicateStudentModal() {
    // 創建提示框
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        max-width: 400px;
    `;
    
    content.innerHTML = `
        <h3 style="color: #e74c3c; margin-bottom: 15px;">⚠️ 存在相同學生</h3>
        <p style="margin-bottom: 20px;">該日期中已存在相同姓名和電話號碼的學生記錄</p>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="padding: 8px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
            確定
        </button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// 新增：初始化日期選擇器
function initializeDatePickers() {
    if (window.flatpickr) {
        const datePickers = document.querySelectorAll('.date-picker');
        datePickers.forEach(input => {
            // 如果已經初始化過，先銷毀
            if (input._flatpickr) {
                input._flatpickr.destroy();
            }
            
            // 初始化 flatpickr
            const instance = flatpickr(input, {
                locale: 'zh_tw',
                dateFormat: 'Y-m-d',
                allowInput: true,
                clickOpens: true,
                onChange: function(selectedDates, dateStr, instance) {
                    const studentName = input.getAttribute('data-student-name');
                    const originalDate = input.getAttribute('data-original-date');
                    
                    // 檢查重複學生
                    const phone = getStudentPhone(studentName, originalDate);
                    if (checkDuplicateStudent(studentName, phone, dateStr, originalDate)) {
                        showDuplicateStudentModal();
                        // 還原日期
                        input.value = originalDate;
                        return;
                    }
                    
                    // 更新資料
                    // 創建一個模擬的元素來使用 updateCloudStudentFieldByElement
                    const mockElement = {
                        getAttribute: (attr) => {
                            if (attr === 'data-field') return 'date';
                            if (attr === 'data-original-name') return studentName;
                            if (attr === 'data-original-date') return originalDate;
                            return null;
                        },
                        value: dateStr
                    };
                    updateCloudStudentFieldByElement(mockElement);
                }
            });
        });
    }
}

// 新增：獲取學生電話號碼的輔助函數
function getStudentPhone(studentName, date) {
    const grouped = window.cloudStudentsGrouped || [];
    for (let group of grouped) {
        for (let student of group.students) {
            if (student.name === studentName && (student.date === date || student['上課日期'] === date)) {
                return student.phone || student.phoneNumber || student.Phone_number || '';
            }
        }
    }
    return '';
}
