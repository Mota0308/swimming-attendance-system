// 課程編排系統 - 淺色主題版本
// 用法：在頁面載入後調用 initSchedulerLight('schedulerContainer')

(function() {
  const API_HEADERS = {
    'X-API-Public-Key': 'ttdrcccy',
    'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4',
    'Accept': 'application/json'
  };

  let scheduleData = {
    date: '',
    day: '一',
    location: '',
    timeSlots: [],
    teacherHours: []
  };

  let allStudentsCache = [];
  let dragging = null; // { student, fromSlotId }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function toast(message) {
    const node = el(`<div class="fixed bottom-4 right-4 bg-[#1a73e8] text-white px-4 py-2 rounded-md shadow-lg z-[9999]">${message}</div>`);
    document.body.appendChild(node);
    setTimeout(() => {
      node.style.transition = 'opacity .5s';
      node.style.opacity = '0';
      setTimeout(() => node.remove(), 1800);
    }, 1800);
  }

  function generateId(prefix) {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  // 取得學生名單
  async function fetchStudentsRaw() {
    try {
      // 優先使用 databaseConnector
      if (window.databaseConnector && typeof window.databaseConnector.fetchStudents === 'function') {
        console.log('🔄 使用 databaseConnector.fetchStudents 獲取學生數據');
        const students = await window.databaseConnector.fetchStudents();
        console.log('📋 從 databaseConnector 獲取的學生數據:', students);
        return Array.isArray(students) ? students : [];
      }
      
      // 備用方案：直接從 API 獲取
      const response = await fetch('/api/students', {
        headers: API_HEADERS
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const students = Array.isArray(data) ? data : (data.students || []);
      console.log('📋 從 API 獲取的學生數據:', students);
      return students;
    } catch (error) {
      console.error('❌ 獲取學生數據失敗:', error);
      return [];
    }
  }

  // 標準化學生數據
  function normalizeStudent(student) {
    if (!student) return null;
    
    // 處理 hasReschedule 字段
    let hasReschedule = false;
    if (student.hasReschedule !== undefined) {
      hasReschedule = Boolean(student.hasReschedule);
    } else if (student.has_reschedule !== undefined) {
      hasReschedule = Boolean(student.has_reschedule);
    } else if (student.reschedule !== undefined) {
      hasReschedule = Boolean(student.reschedule);
    }
    
    return {
      id: student.id || student._id || generateId('stu'),
      name: student.name || student.Name || '',
      phone: student.phone || student.Phone || student.phone_number || '',
      age: student.age || student.Age || '',
      type: student.type || student.Type || student.course_type || '',
      notes: student.notes || student.Notes || student.remark || '',
      hasReschedule: hasReschedule,
      location: student.location || student.Location || '',
      club: student.club || student.Club || ''
    };
  }

  // 從學生數據構建時間時段
  function buildFromStudents(students) {
    if (!Array.isArray(students) || students.length === 0) {
      console.log('📝 沒有學生數據，創建默認時段');
      return [{
        id: generateId('slot'),
        time: '02:10-03:10',
        type: '指定導師小組班 主管導師(恩)',
        students: []
      }];
    }

    // 按時間和類型分組
    const grouped = groupByTimeAndType(students);
    const timeSlots = [];

    for (const [key, groupStudents] of Object.entries(grouped)) {
      const [time, type] = key.split('|');
      timeSlots.push({
        id: generateId('slot'),
        time: time || '02:10-03:10',
        type: type || '指定導師小組班 主管導師(恩)',
        students: groupStudents
      });
    }

    return timeSlots;
  }

  // 按時間和類型分組學生
  function groupByTimeAndType(students) {
    const grouped = {};
    
    students.forEach(student => {
      const time = student.time || '02:10-03:10';
      const type = student.type || '指定導師小組班 主管導師(恩)';
      const key = `${time}|${type}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(student);
    });

    return grouped;
  }

  // 創建學生卡片
  function createStudentCard(stu, slotId) {
    const card = el(`
      <div class="student-card bg-white border rounded-md p-3 flex items-center justify-between shadow-sm" 
           data-id="${stu.id}" data-slot="${slotId}">
        <div class="flex items-center">
          <span class="font-medium">${stu.name}</span>
          ${stu.hasReschedule ? '<span title="補/調堂" style="margin-left: 4px; color: #ff6b6b; font-size: 14px; display: inline-block; vertical-align: middle;">🔁</span>' : ''}
          <p class="ml-2 text-sm text-gray-600">${stu.phone ? `電話: ${stu.phone}` : ''}</p>
        </div>
        <div class="flex gap-1">
          <button class="text-gray-500 hover:text-red-500" title="刪除">🗑️</button>
        </div>
      </div>
    `);

    // 綁定事件
    card.querySelector('button').addEventListener('click', () => deleteStudent(stu.id, slotId));
    card.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        showStudentDetails(stu);
      }
    });

    return card;
  }

  // 渲染所有內容
  function renderAll() {
    const container = document.querySelector('.scheduler-light-container');
    if (!container) return;

    const slotsContainer = container.querySelector('#schSlots');
    if (!slotsContainer) return;

    slotsContainer.innerHTML = '';

    scheduleData.timeSlots.forEach(slot => {
      const slotElement = el(`
        <div class="time-slot border rounded-lg overflow-hidden mb-4" data-slot-id="${slot.id}">
          <div class="bg-gray-100 px-4 py-3 flex flex-wrap items-center justify-between">
            <div class="flex items-center">
              <span class="font-semibold">${slot.time}</span>
              <span class="ml-3 text-sm px-2 py-0.5 bg-blue-500 bg-opacity-20 text-blue-500 rounded">${slot.type}</span>
            </div>
            <div class="flex gap-2">
              <button class="text-blue-600 hover:text-blue-800" title="編輯" onclick="editTimeSlot('${slot.id}')">✏️</button>
              <button class="text-red-600 hover:text-red-800" title="刪除" onclick="deleteTimeSlot('${slot.id}')">🗑️</button>
            </div>
          </div>
          <div class="students-container p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          </div>
        </div>
      `);

      const studentsContainer = slotElement.querySelector('.students-container');
      
      slot.students.forEach(student => {
        const studentCard = createStudentCard(student, slot.id);
        studentsContainer.appendChild(studentCard);
      });

      makeDroppable(studentsContainer, slot.id);
      slotsContainer.appendChild(slotElement);
    });

    renderTeacherHours();
  }

  // 使容器可拖放
  function makeDroppable(container, slotId) {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('bg-blue-50');
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('bg-blue-50');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('bg-blue-50');
      
      if (dragging) {
        const student = dragging.student;
        const fromSlotId = dragging.fromSlotId;
        
        // 從原時段移除
        if (fromSlotId) {
          const fromSlot = scheduleData.timeSlots.find(s => s.id === fromSlotId);
          if (fromSlot) {
            fromSlot.students = fromSlot.students.filter(s => s.id !== student.id);
          }
        }
        
        // 添加到新時段
        const toSlot = scheduleData.timeSlots.find(s => s.id === slotId);
        if (toSlot && !toSlot.students.find(s => s.id === student.id)) {
          toSlot.students.push(student);
        }
        
        dragging = null;
        renderAll();
        toast('學生已移動');
      }
    });
  }

  // 切換學生狀態
  function toggleStudentStatus(studentId, slotId) {
    const slot = scheduleData.timeSlots.find(s => s.id === slotId);
    if (!slot) return;

    const student = slot.students.find(s => s.id === studentId);
    if (!student) return;

    student.status = student.status === 'present' ? 'absent' : 'present';
    renderAll();
    toast(`學生 ${student.name} 狀態已更新`);
  }

  // 刪除學生
  function deleteStudent(studentId, slotId) {
    if (!confirm('確定要刪除這個學生嗎？')) return;

    const slot = scheduleData.timeSlots.find(s => s.id === slotId);
    if (!slot) return;

    slot.students = slot.students.filter(s => s.id !== studentId);
    renderAll();
    toast('學生已刪除');
  }

  // 渲染教師時數
  function renderTeacherHours() {
    const container = document.querySelector('#schTeacherHours');
    if (!container) return;

    const teacherHours = {};
    
    scheduleData.timeSlots.forEach(slot => {
      slot.students.forEach(student => {
        if (!teacherHours[student.teacher]) {
          teacherHours[student.teacher] = 0;
        }
        teacherHours[student.teacher] += 1;
      });
    });

    container.innerHTML = Object.entries(teacherHours)
      .map(([teacher, hours]) => `
        <div class="teacher-hour-item bg-gray-50 p-3 rounded">
          <div class="font-medium">${teacher}</div>
          <div class="text-2xl font-bold text-blue-600">${hours}</div>
          <div class="text-sm text-gray-500">小時</div>
        </div>
      `).join('');
  }

  // 顯示新增學生對話框
  function showAddStudentDialog(slotId) {
    const existingDialog = document.querySelector('.add-student-dialog');
    if (existingDialog) existingDialog.remove();

    const dialog = el(`
      <div class="add-student-dialog fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">新增學生</h3>
            <button class="close-dialog text-gray-500 hover:text-gray-700 text-xl">&times;</button>
          </div>
          
          <form id="addStudentForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
              <input type="text" id="studentName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">電話</label>
              <input type="tel" id="studentPhone" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div class="flex gap-3 pt-4">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                新增
              </button>
              <button type="button" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors close-dialog">
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    `);

    // 關閉對話框事件
    dialog.querySelectorAll('.close-dialog').forEach(btn => {
      btn.addEventListener('click', () => dialog.remove());
    });

    // 表單提交事件
    dialog.querySelector('#addStudentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = dialog.querySelector('#studentName').value;
      const phone = dialog.querySelector('#studentPhone').value;
      
      if (name) {
        const newStudent = {
          id: generateId('stu'),
          name: name,
          phone: phone,
          hasReschedule: false
        };
        
        const slot = scheduleData.timeSlots.find(s => s.id === slotId);
        if (slot) {
          slot.students.push(newStudent);
          renderAll();
          dialog.remove();
          toast('學生已新增');
        }
      }
    });

    document.body.appendChild(dialog);
  }

  // 顯示學生詳細信息
  function showStudentDetails(student) {
    // 移除現有的對話框
    const existingDialog = document.querySelector('.student-details-dialog');
    if (existingDialog) existingDialog.remove();

    const dialog = el(`
      <div class="student-details-dialog fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">學生詳細信息</h3>
            <button class="close-dialog text-gray-500 hover:text-gray-700 text-xl">&times;</button>
          </div>
          
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700">姓名</label>
              <p class="text-gray-900">${student.name || '未提供'}</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">電話</label>
              <p class="text-gray-900">${student.phone || '未提供'}</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">年齡</label>
              <p class="text-gray-900">${student.age ? student.age + '歲' : '未提供'}</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">課程類型</label>
              <p class="text-gray-900">${student.type || '未提供'}</p>
            </div>
            
            ${student.notes ? `
            <div>
              <label class="block text-sm font-medium text-gray-700">備註</label>
              <p class="text-gray-900">${student.notes}</p>
            </div>
            ` : ''}
          </div>
          
          <div class="pt-4">
            <button class="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors close-dialog">
              關閉
            </button>
          </div>
        </div>
      </div>
    `);

    // 關閉對話框事件
    dialog.querySelectorAll('.close-dialog').forEach(btn => {
      btn.addEventListener('click', () => dialog.remove());
    });

    document.body.appendChild(dialog);
  }

  // 通用日期解析：輸入可能為 YYYY-MM-DD、DD/MM/YYYY、DD-MM-YYYY、MM/DD/YYYY，輸出標準 YYYY-MM-DD
  function parseDateToKey(input) {
    if (!input) return '';
    const s = String(input).trim();
    // Already ISO like 2025-08-28
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
    // DD/MM/YYYY
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const d = m[1].padStart(2,'0');
      const mo = m[2].padStart(2,'0');
      return `${m[3]}-${mo}-${d}`;
    }
    // DD-MM-YYYY
    m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
      const d = m[1].padStart(2,'0');
      const mo = m[2].padStart(2,'0');
      return `${m[3]}-${mo}-${d}`;
    }
    // MM/DD/YYYY (fallback - ambiguous, assume US if looks like this and first part > 12 not)
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const mo = m[1].padStart(2,'0');
      const d = m[2].padStart(2,'0');
      return `${m[3]}-${mo}-${d}`;
    }
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const yyyy = String(d.getFullYear());
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const dd = String(d.getDate()).padStart(2,'0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch(_) {}
    return '';
  }

  // 导出所有关键函数到全局作用域
  window.buildFromStudents = buildFromStudents;
  window.renderAll = renderAll;
  window.createStudentCard = createStudentCard;
  window.buildSchedulerSkeleton = buildSchedulerSkeleton;
  window.bindHeader = bindHeader;
  window.initData = initData;
  window.fetchStudentsRaw = fetchStudentsRaw;
  window.normalizeStudent = normalizeStudent;
  window.groupByTimeAndType = groupByTimeAndType;
  window.makeDroppable = makeDroppable;
  window.toggleStudentStatus = toggleStudentStatus;
  window.deleteStudent = deleteStudent;
  window.renderTeacherHours = renderTeacherHours;
  window.showAddStudentDialog = showAddStudentDialog;
  window.showStudentDetails = showStudentDetails;
  window.parseDateToKey = parseDateToKey;
  window.toast = toast;
  window.generateId = generateId;
  window.el = el;

  // 导出全局变量
  window.scheduleData = scheduleData;
  window.allStudentsCache = allStudentsCache;
  window.dragging = dragging;

  console.log('✅ scheduler-light.js 所有函数已导出到全局作用域');
})(); 