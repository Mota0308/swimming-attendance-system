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

  function buildSchedulerSkeleton(container) {
    container.innerHTML = `
      <div class="scheduler-light-container">
        <div class="scheduler-header">
          <h3 class="scheduler-title">
            <i class="fas fa-calendar-alt"></i>
            課程編排系統
          </h3>
          <div class="scheduler-actions">
            <button id="schAddSlot" class="scheduler-btn scheduler-btn-primary">
              <i class="fas fa-plus"></i>
              新增時段
            </button>
            <button id="schAddStudent" class="scheduler-btn scheduler-btn-secondary">
              <i class="fas fa-user-plus"></i>
              新增學生
            </button>
            <button id="schSave" class="scheduler-btn scheduler-btn-success">
              <i class="fas fa-save"></i>
              保存
            </button>
          </div>
        </div>
        
        <div class="scheduler-controls">
          <div class="control-group">
            <label>日期</label>
            <input type="date" id="schDate" class="control-input"/>
          </div>
          <div class="control-group">
            <label>星期</label>
            <select id="schDay" class="control-select">
              <option value="">（依日期）</option>
              <option value="一">星期一</option>
              <option value="二">星期二</option>
              <option value="三">星期三</option>
              <option value="四">星期四</option>
              <option value="五">星期五</option>
              <option value="六">星期六</option>
              <option value="日">星期日</option>
            </select>
          </div>
          <div class="control-group">
            <label>地點</label>
            <select id="schLoc" class="control-select">
              <option value="">（請選擇）</option>
            </select>
          </div>
        </div>
        
        <div id="schSlots" class="time-slots-container"></div>
        
        <div class="teacher-hours-section">
          <h4 class="teacher-hours-title">
            <i class="fas fa-chart-bar"></i>
            教師時數統計
          </h4>
          <div id="schTeacherHours" class="teacher-hours-grid"></div>
        </div>
      </div>`;
  }

  // 取得學生名單
  async function fetchStudentsRaw() {
    try {
      const resp = await fetch(`${databaseConnector.apiConfig.baseURL}/api/students`, { headers: API_HEADERS });
      if (!resp.ok) return [];
      const arr = await resp.json();
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('無法取得學生名單', e);
      return [];
    }
  }

  function normalizeStudent(row) {
    const get = (...keys) => { for (const k of keys) { if (row && row[k] != null) return String(row[k]); } return ''; };
    const name = (get('Student_name','studentName','name','fullname')).trim() || '未命名';
    const phone = (get('Phone_number','phone','studentPhone')).trim();
    const location = (get('location','Location','place')).trim();
    const time = (get('time','timeslot','course_time','lessonTime')).trim();
    const type = (get('type','courseType','lessonType','classType')).trim();
    let day = (get('day','weekday','weekDay')).trim();
    const dayMap = { 'monday':'一','tuesday':'二','wednesday':'三','thursday':'四','friday':'五','saturday':'六','sunday':'日','mon':'一','tue':'二','wed':'三','thu':'四','fri':'五','sat':'六','sun':'日' };
    const low = day.toLowerCase();
    if (dayMap[low]) day = dayMap[low];
    if (/^星期[一二三四五六日]$/.test(day)) day = day.replace('星期','');
    return { id: generateId('s'), name, phone, location, time, type, day };
  }

  function parseStartMinutes(timeStr) {
    if (!timeStr) return 24*60;
    const m = timeStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) return 24*60;
    const h = parseInt(m[1],10); const mi = parseInt(m[2],10);
    return h*60+mi;
  }

  function to24hRange(range, ampmHint='') {
    // 接受 "2:10-3:10pm" 或 "2:10pm-3:10pm" 或 "14:10-15:10"，輸出 "HH:MM-HH:MM"
    if (!range) return '';
    let r = range.trim();
    // 抽離 am/pm（若只出現於末尾，套用到兩端；若各自帶，逐一處理）
    const tail = r.match(/(am|pm)$/i);
    if (tail) { ampmHint = tail[1].toLowerCase(); r = r.replace(/(am|pm)$/i,''); }
    const parts = r.split('-').map(s => s.trim());
    if (parts.length !== 2) return r;
    const conv = (s, hint) => {
      let mm = s.match(/^(\d{1,2}):(\d{2})(am|pm)?$/i);
      if (!mm) return s;
      let h = parseInt(mm[1],10), m = parseInt(mm[2],10);
      const ap = (mm[3]||hint||'').toLowerCase();
      if (ap==='pm' && h<12) h+=12; if (ap==='am' && h===12) h=0;
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    };
    const left = conv(parts[0], ampmHint); const right = conv(parts[1], ampmHint);
    return `${left}-${right}`;
  }

  function extractDayAndTime(rawTime) {
    if (!rawTime) return { day:'', time:'' };
    const m = rawTime.match(/(星期[一二三四五六日])\s*(.*)$/);
    if (m) {
      const day = m[1].replace('星期','');
      const time = to24hRange(m[2]);
      return { day, time };
    }
    return { day:'', time: to24hRange(rawTime) };
  }

  function eqLocation(a,b){ return (a||'').trim().toLowerCase() === (b||'').trim().toLowerCase(); }

  function groupByTimeAndType(students, currentLocation) {
    const map = new Map();
    students.forEach(s => {
      const key = `${s.time||''}__${s.type||''}`;
      if (!map.has(key)) map.set(key, { time: s.time||'未設定', type: s.type||'未設定', students: [] });
      map.get(key).students.push(s);
    });
    const slots = [];
    for (const [key, g] of map.entries()) {
      const id = generateId('t');
      slots.push({ id, time: g.time, type: g.type, teachers: [], location: currentLocation||'', students: g.students.map(x => ({ id: generateId('s'), name: x.name, status: null, notes: '', phone: x.phone })) });
    }
    slots.sort((a,b) => parseStartMinutes(a.time) - parseStartMinutes(b.time));
    return slots;
  }

  async function buildFromStudents(filters) {
    if (!allStudentsCache.length) {
      const raw = await fetchStudentsRaw();
      allStudentsCache = raw.map(normalizeStudent);
      populateLocationOptions(allStudentsCache);
    }
    const { date, day, location } = filters;
    let wantDay = (day||'').trim();
    if (date) {
      try { const d = new Date(date); const map = ['日','一','二','三','四','五','六']; wantDay = wantDay || map[d.getDay()]; } catch(_){}
    }
    
    // 🔄 遞進篩選：層層縮小範圍
    let filtered = allStudentsCache;
    
    // 步驟1：數據預處理（標準化時間和星期）
    filtered = filtered.map(s => {
      // 若 time 字段中帶有星期，抽離覆蓋
      if (s.time && /星期[一二三四五六日]/.test(s.time)) {
        const t = extractDayAndTime(s.time);
        if (t.day) s.day = t.day; 
        if (t.time) s.time = t.time;
      } else {
        // 僅時間段，統一 24h
        s.time = to24hRange(s.time);
      }
      return s;
    });
    
    // 步驟2：按地點篩選（第一層縮小）
    if (location) {
      const beforeLocation = filtered.length;
      filtered = filtered.filter(s => eqLocation(s.location, location));
      console.log(`📍 地點篩選：${beforeLocation} → ${filtered.length} (縮小範圍)`);
    }
    
    // 步驟3：按星期篩選（第二層縮小）
    if (wantDay) {
      const beforeDay = filtered.length;
      filtered = filtered.filter(s => s.day === wantDay);
      console.log(`📅 星期篩選：${beforeDay} → ${filtered.length} (進一步縮小範圍)`);
    }
    
    // 步驟4：如果沒有結果，提供智能回退
    if (!filtered.length) {
      if (location && wantDay) {
        // 如果同時選擇了地點和星期但沒有結果，先回退到只按地點篩選
        filtered = allStudentsCache.filter(s => eqLocation(s.location, location));
        toast(`⚠️ 在${location}的${wantDay}沒有學生，已顯示該地點所有時段的學生`);
        console.log(`🔄 智能回退：顯示${location}所有時段的學生 (${filtered.length}人)`);
      } else if (location) {
        // 如果只選擇了地點但沒有結果，顯示該地點所有學生
        filtered = allStudentsCache.filter(s => eqLocation(s.location, location));
        toast(`⚠️ 在${location}沒有找到學生資料`);
        console.log(`🔄 地點回退：顯示${location}所有學生 (${filtered.length}人)`);
      } else if (wantDay) {
        // 如果只選擇了星期但沒有結果，顯示該星期所有學生
        filtered = allStudentsCache.filter(s => s.day === wantDay);
        toast(`⚠️ 在${wantDay}沒有找到學生資料`);
        console.log(`🔄 星期回退：顯示${wantDay}所有學生 (${filtered.length}人)`);
      }
    }
    
    // 步驟5：數據去重
    const uniq = new Map();
    filtered.forEach(s => {
      const key = `${(s.phone||'').trim()}|${s.name}`;
      if (!uniq.has(key)) uniq.set(key, s);
    });
    filtered = Array.from(uniq.values());
    
    console.log(`✅ 最終篩選結果：${filtered.length}名學生`);
    
    scheduleData.timeSlots = groupByTimeAndType(filtered, location);
  }

  function populateLocationOptions(students) {
    const locSet = new Set(); students.forEach(s => { if (s.location) locSet.add(s.location); });
    const options = Array.from(locSet).sort();
    const sel = document.getElementById('schLoc'); const sel2 = document.getElementById('attendanceLocation');
    const fill = (elSel) => {
      if (!elSel) return;
      const cur = elSel.value;
      elSel.innerHTML = '<option value="">請選擇地點</option>' + options.map(l => `<option value="${l}">${l}</option>`).join('');
      if (cur && options.includes(cur)) elSel.value = cur;
    };
    fill(sel); fill(sel2);
  }

  function makeDroppable(containerEl, slot) {
    containerEl.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; containerEl.classList.add('drop-target'); });
    containerEl.addEventListener('dragleave', () => containerEl.classList.remove('drop-target'));
    containerEl.addEventListener('drop', async (e) => {
      e.preventDefault(); containerEl.classList.remove('drop-target');
      const droppedId = e.dataTransfer && e.dataTransfer.getData ? e.dataTransfer.getData('text/plain') : null;
      if (!dragging && !droppedId) return;
      const from = scheduleData.timeSlots.find(s => s.id === (dragging?.fromSlotId));
      const to = scheduleData.timeSlots.find(s => s.id === slot.id);
      if (!to) return;
      if (from && from.id === to.id) { dragging = null; return; }
      // 找出被拖動的學生
      let moving;
      if (from) {
        const idx = from.students.findIndex(st => st.id === (dragging?.student?.id));
        if (idx !== -1) { moving = from.students.splice(idx,1)[0]; }
      }
      if (!moving && droppedId) {
        // 後備：若 dragging 失敗，透過 id 從所有時段尋找
        const pack = (() => {
          for (const s of scheduleData.timeSlots) {
            const i = s.students.findIndex(x => x.id === droppedId);
            if (i !== -1) return { from: s, idx: i };
          }
          return null;
        })();
        if (pack) { moving = pack.from.students.splice(pack.idx,1)[0]; }
      }
      if (!moving) return;
      to.students.push(moving);
      renderAll();
      try {
        if (moving.phone) {
          await databaseConnector.updateStudentLesson({
            phone: moving.phone,
            name: moving.name,
            date: document.getElementById('schDate')?.value || '',
            location: to.location || document.getElementById('schLoc')?.value || '',
            time: to.time,
            type: to.type
          });
          toast('已更新課程時間/類型');
        }
      } catch (e) {
        console.warn('更新後端失敗', e);
        toast('已移動，但後端更新失敗');
      }
      dragging = null;
    });
  }

  function createStudentCard(stu, slotId) {
    const card = el(`<div class="student-card" draggable="true"></div>`);
    card.dataset.id = stu.id; card.dataset.slot = slotId;
    card.addEventListener('dragstart', (e) => { try { e.dataTransfer.setData('text/plain', stu.id); e.dataTransfer.effectAllowed='move'; } catch(_){} dragging = { student: stu, fromSlotId: slotId }; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); setTimeout(() => { dragging=null; }, 50); });

    const left = el(`<div class="student-left"></div>`);
    const btn = el(`<button class="status-btn" title="點擊切換出席狀態"></button>`);
    
    // 設置出席狀態樣式
    if (stu.status === true) { 
      btn.classList.add('present'); 
      btn.textContent='✓'; 
    }
    else if (stu.status === false) { 
      btn.classList.add('absent'); 
      btn.textContent='✗'; 
    }
    else { 
      btn.classList.add('unknown'); 
      btn.textContent=''; 
    }
    btn.onclick = () => { toggleStudentStatus(stu.id, slotId); };

    const name = el(`<span class="student-name"></span>`); 
    name.textContent = stu.name; 
    
    // 隱藏詳細信息，只顯示簡潔的學生卡片
    // 備註信息只在有內容時顯示
    if (stu.notes && stu.notes.trim()) {
      const notes = el(`<span class="student-notes"></span>`); 
      notes.textContent = stu.notes; 
      left.append(btn, name, notes);
    } else {
      left.append(btn, name);
    }

    const actions = el(`<div class="student-actions"></div>`);
    
    // 添加編輯按鈕（顯示學生詳細信息）
    const edit = el(`<button class="action-btn" title="查看學生詳細信息">
      <i class="fas fa-eye"></i>
    </button>`);
    edit.onclick = () => showStudentDetails(stu);
    actions.appendChild(edit);
    
    // 刪除按鈕
    const del = el(`<button class="action-btn" title="刪除學生">
      <i class="fas fa-trash"></i>
    </button>`);
    del.onclick = () => deleteStudent(stu.id, slotId);
    actions.appendChild(del);

    card.append(left, actions);
    return card;
  }

  function toggleStudentStatus(studentId, slotId) {
    const slot = scheduleData.timeSlots.find(s => s.id === slotId); if (!slot) return;
    const stu = slot.students.find(s => s.id === studentId); if (!stu) return;
    if (stu.status === null) stu.status = true; else if (stu.status === true) stu.status = false; else stu.status = null;
    renderAll();
  }

  function deleteStudent(studentId, slotId) {
    const slot = scheduleData.timeSlots.find(s => s.id === slotId); if (!slot) return;
    slot.students = slot.students.filter(s => s.id !== studentId);
    renderAll();
  }

  // 顯示新增學生對話框
  function showAddStudentDialog() {
    // 移除現有的對話框
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
              <label class="block text-sm font-medium text-gray-700 mb-1">學生姓名 *</label>
              <input type="text" id="studentName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">電話號碼</label>
              <input type="tel" id="studentPhone" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">年齡</label>
              <input type="text" id="studentAge" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="歲">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">課程類型</label>
              <select id="studentType" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">請選擇課程類型</option>
                <option value="指定導師高班">指定導師高班</option>
                <option value="指定導師中班">指定導師中班</option>
                <option value="指定導師初班">指定導師初班</option>
                <option value="主管導師">主管導師</option>
                <option value="一般課程">一般課程</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">上課日期 *</label>
              <input type="date" id="studentDate" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">上課時間</label>
              <input type="text" id="studentTime" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例：逢星期日 11:00-13:00">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">地點</label>
              <select id="studentLocation" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">請選擇地點</option>
                <option value="荔枝角公園游泳池">荔枝角公園游泳池</option>
                <option value="維多利亞公園游泳池">維多利亞公園游泳池</option>
                <option value="其他">其他</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">備註</label>
              <textarea id="studentNotes" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2" placeholder="其他備註信息"></textarea>
            </div>
            
            <div class="flex gap-3 pt-4">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                新增學生
              </button>
              <button type="button" class="close-dialog flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none">
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    `);

    // 設置默認日期為今天
    const today = new Date().toISOString().split('T')[0];
    dialog.querySelector('#studentDate').value = today;

    // 綁定關閉事件
    dialog.querySelectorAll('.close-dialog').forEach(btn => {
      btn.addEventListener('click', () => dialog.remove());
    });

    // 綁定表單提交事件
    dialog.querySelector('#addStudentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      addNewStudent();
    });

    // 點擊背景關閉對話框
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.remove();
    });

    document.body.appendChild(dialog);
    
    // 自動聚焦到姓名輸入框
    dialog.querySelector('#studentName').focus();
  }

  // 新增學生到系統
  function addNewStudent() {
    const name = document.getElementById('studentName').value.trim();
    const phone = document.getElementById('studentPhone').value.trim();
    const age = document.getElementById('studentAge').value.trim();
    const type = document.getElementById('studentType').value;
    const date = document.getElementById('studentDate').value;
    const time = document.getElementById('studentTime').value.trim();
    const location = document.getElementById('studentLocation').value;
    const notes = document.getElementById('studentNotes').value.trim();

    if (!name) {
      toast('請輸入學生姓名');
      return;
    }

    if (!date) {
      toast('請選擇上課日期');
      return;
    }

    // 創建新學生對象
    const newStudent = {
      id: generateId('s'),
      name: name,
      phone: phone,
      age: age,
      type: type,
      date: date,
      time: time,
      location: location,
      notes: notes,
      status: null,
      createdDate: new Date().toISOString()
    };

    // 添加到第一個時段（如果沒有時段則創建一個）
    if (!scheduleData.timeSlots.length) {
      const slotId = generateId('t');
      scheduleData.timeSlots.push({ 
        id: slotId, 
        time: '18:00-18:40', 
        type: '指小', 
        teachers: [], 
        students: [], 
        location: location || ''
      });
    }

    // 添加學生到第一個時段
    scheduleData.timeSlots[0].students.push(newStudent);
    
    // 關閉對話框
    const dialog = document.querySelector('.add-student-dialog');
    if (dialog) {
      dialog.remove();
    }
    
    // 重新渲染
    renderAll();
    
    // 顯示成功消息
    toast(`已成功新增學生：${name}`);
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
              <label class="block text-sm font-medium text-gray-700">學生姓名</label>
              <div class="text-gray-900 py-2">${student.name || '未設置'}</div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">電話號碼</label>
              <div class="text-gray-900 py-2">${student.phone || '未設置'}</div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">年齡</label>
              <div class="text-gray-900 py-2">${student.age || '未設置'}</div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">課程類型</label>
              <div class="text-gray-900 py-2">${student.type || '未設置'}</div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">上課時間</label>
              <div class="text-gray-900 py-2">${student.time || '未設置'}</div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">地點</label>
              <div class="text-gray-900 py-2">${student.location || '未設置'}</div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">備註</label>
              <div class="text-gray-900 py-2">${student.notes || '無備註'}</div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">創建日期</label>
              <div class="text-gray-900 py-2">${student.createdDate ? new Date(student.createdDate).toLocaleDateString('zh-TW') : '未知'}</div>
            </div>
          </div>
          
          <div class="flex justify-end pt-4">
            <button class="close-dialog bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none">
              關閉
            </button>
          </div>
        </div>
      </div>
    `);

    // 綁定關閉事件
    dialog.querySelectorAll('.close-dialog').forEach(btn => {
      btn.addEventListener('click', () => dialog.remove());
    });

    // 點擊背景關閉對話框
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.remove();
    });

    document.body.appendChild(dialog);
  }

  function renderAll() {
    const wrap = document.getElementById('schedulerContainer');
    const slotsBox = wrap.querySelector('#schSlots');
    slotsBox.innerHTML='';
    
    (scheduleData.timeSlots||[]).forEach(slot => {
      const block = el(`<div class="time-slot-block"></div>`);
      
      const head = el(`<div class="time-slot-header"></div>`);
      const timeInfo = el(`<div class="time-info"></div>`);
      timeInfo.append(el(`<span class="time-display">${slot.time}</span>`));
      timeInfo.append(el(`<span class="class-type-badge">${slot.type}</span>`));
      
      const teacherInfo = el(`<div class="teacher-info"></div>`);
      teacherInfo.append(el(`<span class="teacher-label">教師:</span>`));
      const names = el(`<div class="teacher-names"></div>`);
      (slot.teachers||[]).forEach(t => names.append(el(`<span class="teacher-tag">${t}</span>`)));
      teacherInfo.append(names);
      
      head.append(timeInfo, teacherInfo);

      const list = el(`<div class="students-container"></div>`);
      list.dataset.slotId = slot.id; 
      list.dataset.time = slot.time; 
      list.dataset.type = slot.type; 
      list.dataset.location = slot.location||'';
      
      makeDroppable(list, slot);
      (slot.students||[]).forEach(st => list.append(createStudentCard(st, slot.id)));

      block.append(head, list);
      slotsBox.appendChild(block);
    });
    renderTeacherHours(wrap);
  }

  function renderTeacherHours(container) {
    const box = container.querySelector('#schTeacherHours'); 
    box.innerHTML = '';
    
    (scheduleData.teacherHours || []).forEach(t => {
      const card = el(`<div class="teacher-hour-card">
        <div class="teacher-name">${t.name}</div>
        <div class="teacher-hours-info">
          <div class="hours-display">${t.hours}<span class="hours-unit">小時</span></div>
          <div class="teacher-notes">${t.notes||''}</div>
        </div>
      </div>`);
      box.appendChild(card);
    });
  }

  function bindHeader(container) {
    const dateEl = container.querySelector('#schDate');
    const dayEl = container.querySelector('#schDay');
    const locEl = container.querySelector('#schLoc');

    const today = new Date();
    dateEl.value = today.toISOString().slice(0,10);

    const onFilterChange = async () => { await buildFromStudents({ date: dateEl.value, day: dayEl.value, location: locEl.value }); renderAll(); };
    dateEl.addEventListener('change', onFilterChange);
    dayEl.addEventListener('change', onFilterChange);
    locEl.addEventListener('change', onFilterChange);

    container.querySelector('#schSave').addEventListener('click', () => {
      try { localStorage.setItem('scheduleData', JSON.stringify(scheduleData)); toast('保存成功'); } catch(e){ toast('保存失敗'); }
    });

    container.querySelector('#schAddSlot').addEventListener('click', () => {
      const id = generateId('t');
      scheduleData.timeSlots.push({ id, time: '18:00-18:40', type: '指小', teachers: [], students: [], location: locEl.value||'' });
      renderAll();
    });

    container.querySelector('#schAddStudent').addEventListener('click', async () => {
      if (!scheduleData.timeSlots.length) { toast('請先新增時段'); return; }
      showAddStudentDialog();
    });
  }

  async function initData(container) {
    try { const saved = localStorage.getItem('scheduleData'); if (saved) { scheduleData = JSON.parse(saved); } } catch(_) {}
    const date = container.querySelector('#schDate').value; const day = container.querySelector('#schDay').value; const loc = container.querySelector('#schLoc').value;
    await buildFromStudents({ date, day, location: loc });
  }

  window.initSchedulerLight = async function(containerId) {
    const container = document.getElementById(containerId); if (!container) return;
    buildSchedulerSkeleton(container);
    bindHeader(container);
    await initData(container);
    renderAll();
  }
})(); 