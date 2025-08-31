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
            <input type="date" id="schDate" class="control-input">
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

    // 優先從多個鍵提取日期
    const rawDate = (get('date','Student_date','studentDate','上課日期','classDate')).trim();
    let dateKey = rawDate ? parseDateToKey(rawDate) : '';

    // 可能還有陣列/字串日期集合
    const originalDates = Array.isArray(row?.originalDates) ? row.originalDates.slice() : [];
    const datesStr = get('dates');
    if (!originalDates.length && datesStr) {
      datesStr.split('、').map(s=>s.trim()).forEach(x => originalDates.push(x));
    }

    // 特殊標記（從欄位或日期字串推斷）
    const coerceBool = (v) => {
      if (typeof v === 'boolean') return v; if (v == null) return false; const s = String(v).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on' || s === 't';
    };
    let hasBalloonMark = coerceBool(row?.hasBalloonMark || row?.balloonMark || row?.has_balloon_mark || row?.hasBalloon || row?.balloon);
    let hasStarMark = coerceBool(row?.hasStarMark || row?.star || row?.has_star || row?.hasStar || row?.starMark);
    const starRegex = /[\u2B50\u2605\u2606\uD83C\uDF1F]/; // ⭐ ★ ☆ 🌟
    if (!hasBalloonMark && (rawDate.includes('🎈') || originalDates.some(d => String(d).includes('🎈')))) hasBalloonMark = true;
    if (!hasStarMark && (starRegex.test(rawDate) || originalDates.some(d => starRegex.test(String(d))))) hasStarMark = true;

    return { id: generateId('s'), name, phone, location, time, type, day, date: rawDate, dateKey, originalDates, hasBalloonMark, hasStarMark };
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
      // 🔄 智能分类：按日期、时间、课程类型分类
      const date = s.date || '';
      const time = s.time || '';
      const type = s.type || '';
      
      // 分类键：日期_时间_课程类型
      const key = `${date}__${time}__${type}`;
      
      if (!map.has(key)) {
        map.set(key, { 
          date: date || '未設定日期',
          time: time || '未設定時間', 
          type: type || '未設定類型',
          students: [] 
        });
      }
      map.get(key).students.push(s);
    });
    const slots = [];
    for (const [key, g] of map.entries()) {
      const id = generateId('t');
      slots.push({ 
        id, 
        date: g.date,
        time: g.time, 
        type: g.type, 
        teachers: [], 
        location: currentLocation || '', 
        students: g.students.map(x => ({ 
          id: generateId('s'), 
          name: x.name, 
          status: null, 
          notes: '', 
          phone: x.phone,
          date: x.date || g.date,
          hasBalloonMark: x.hasBalloonMark === true,
          hasStarMark: x.hasStarMark === true
        })) 
      });
    }
    // 排序：先按日期，再按时间
    slots.sort((a, b) => {
      // 日期排序
      if (a.date !== b.date) {
        if (a.date === '未設定日期') return 1;
        if (b.date === '未設定日期') return -1;
        return new Date(a.date) - new Date(b.date);
      }
      // 时间排序
      return parseStartMinutes(a.time) - parseStartMinutes(b.time);
    });
    return slots;
  }

  async function buildFromStudents(filters) {
    if (!allStudentsCache.length) {
      const raw = await fetchStudentsRaw();
      allStudentsCache = raw.map(normalizeStudent);
      await populateLocationOptions(allStudentsCache);
    }
    
    const { date, location } = filters;

    // 1) 標準化來源資料
    let filtered = allStudentsCache.map(s => {
      const copy = { ...s };
      if (copy.time && /星期[一二三四五六日]/.test(copy.time)) {
        const t = extractDayAndTime(copy.time); if (t.time) copy.time = t.time;
      } else {
        copy.time = to24hRange(copy.time);
      }
      copy.dateKey = copy.dateKey || (copy.date ? parseDateToKey(copy.date) : '');
      return copy;
    });

    // 2) 嚴格 AND：日期 → 地點
    if (date && String(date).trim() !== '') {
      const wantKey = parseDateToKey(date);
      // 若使用者輸入了無法解析的日期，直接返回空
      if (!wantKey) {
        scheduleData.timeSlots = [];
        return;
      }
      filtered = filtered.filter(s => {
        if (s.dateKey) return s.dateKey === wantKey;
        if (Array.isArray(s.originalDates) && s.originalDates.length) {
          return s.originalDates.some(d => {
            const clean = String(d).replace(/[\u{1F300}-\u{1FAFF}]/gu,'').replace(/\s+/g,'');
            return parseDateToKey(clean) === wantKey;
          });
        }
        return false;
      });
      // 日期後若沒有結果，直接結束（不允許後續條件放寬）
      if (!filtered.length) { scheduleData.timeSlots = []; return; }
    }

    if (location && String(location).trim() !== '') {
      filtered = filtered.filter(s => eqLocation(s.location, location));
      if (!filtered.length) { scheduleData.timeSlots = []; return; }
    }

    // 3) 去重並轉為時段
    const uniq = new Map();
    filtered.forEach(s => { const key = `${(s.phone || '').trim()}|${s.name}`; if (!uniq.has(key)) uniq.set(key, s); });
    filtered = Array.from(uniq.values());

    scheduleData.timeSlots = filtered.length ? groupByTimeAndType(filtered, location) : [];
  }

  async function populateLocationOptions(students) {
    const locSet = new Set();
    try {
      (students || []).forEach(s => { if (s && s.location) locSet.add((s.location||'').trim()); });
    } catch(_) {}
    let options = Array.from(locSet).filter(Boolean).sort();

    // 後備：DatabaseConnector.fetchLocations()
    const dc = (window && window.databaseConnector) ? window.databaseConnector : (typeof databaseConnector !== 'undefined' ? databaseConnector : null);
    if (!options.length && dc && typeof dc.fetchLocations === 'function') {
      try {
        const apiLocs = await dc.fetchLocations();
        if (Array.isArray(apiLocs)) {
          const names = apiLocs.map(l => (l?.name || l?.locationName || l?.title || l?.Location || l?.place || '').trim()).filter(Boolean);
          options = Array.from(new Set(names)).sort();
        }
      } catch(e) {
        console.warn('取得地點清單失敗，嘗試直接呼叫 API', e);
      }
    }

    // 最後後備：直接調用 /api/locations
    if (!options.length) {
      try {
        const base = dc?.apiConfig?.baseURL || window.location.origin;
        const resp = await fetch(`${base}/api/locations`, { headers: API_HEADERS });
        if (resp.ok) {
          const arr = await resp.json();
          if (Array.isArray(arr)) {
            const names = arr.map(l => (l?.name || l?.locationName || l?.title || l?.Location || l?.place || '').trim()).filter(Boolean);
            options = Array.from(new Set(names)).sort();
          }
        }
      } catch (e) {
        console.warn('直接呼叫 /api/locations 也失敗', e);
      }
    }

    const sel = document.getElementById('schLoc'); const sel2 = document.getElementById('attendanceLocation');
    const fill = (elSel) => {
      if (!elSel) return;
      const cur = elSel.value;
      const opts = options.length ? options : [];
      elSel.innerHTML = '<option value="">請選擇地點</option>' + opts.map(l => `<option value="${l}">${l}</option>`).join('');
      if (cur && opts.includes(cur)) elSel.value = cur;
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
    card.dataset.id = stu.id; 
    card.dataset.slot = slotId;
    
    // 拖拽事件
    card.addEventListener('dragstart', (e) => { 
      try { 
        e.dataTransfer.setData('text/plain', stu.id); 
        e.dataTransfer.effectAllowed = 'move'; 
      } catch(_){} 
      dragging = { student: stu, fromSlotId: slotId }; 
      card.classList.add('dragging'); 
    });
    
    card.addEventListener('dragend', () => { 
      card.classList.remove('dragging'); 
      setTimeout(() => { dragging = null; }, 50); 
    });

    // 學生信息區域
    const studentInfo = el(`<div class="student-info"></div>`);
    
    // 學生頭像（使用姓名首字母）
    const avatar = el(`<div class="student-avatar"></div>`);
    avatar.textContent = stu.name ? stu.name.charAt(0) : '?';
    
    // 學生詳細信息
    const studentDetails = el(`<div class="student-details"></div>`);
    const name = el(`<h4 class="student-name"></h4>`); 
    name.textContent = stu.name || '未命名學生';
    
    // 在姓名旁顯示特殊標記（🎈/🌟）
    const coerceBool = (v) => {
      if (typeof v === 'boolean') return v; if (v == null) return false;
      const s = String(v).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on' || s === 't';
    };
    const hasBalloon = coerceBool(stu.hasBalloonMark ?? stu.balloonMark ?? stu.has_balloon_mark ?? stu.hasBalloon ?? stu.balloon);
    const hasStar = coerceBool(stu.hasStarMark ?? stu.star ?? stu.has_star ?? stu.hasStar ?? stu.starMark);
    if (hasBalloon || hasStar) {
      const marksWrap = el(`<span class="student-marks" style="margin-left:6px; display:inline-flex; gap:4px;"></span>`);
      if (hasStar) marksWrap.append(el(`<span title="重點學生">🌟</span>`));
      if (hasBalloon) marksWrap.append(el(`<span title="氣球標記">🎈</span>`));
      const nameWrap = el(`<div style="display:flex;align-items:center;"></div>`);
      nameWrap.append(el(`<span></span>`));
      nameWrap.firstChild.textContent = name.textContent;
      name.textContent = '';
      name.append(nameWrap);
      name.append(marksWrap);
    }
    
    // 顯示學生電話或年齡信息
    let infoText = '';
    if (stu.phone) {
      infoText = `電話: ${stu.phone}`;
    } else if (stu.age) {
      infoText = `年齡: ${stu.age}歲`;
    } else {
      infoText = '信息不完整';
    }
    
    const info = el(`<p class="student-info-text"></p>`);
    info.textContent = infoText;
    
    // 出席/補調堂選項
    const selectsWrap = el(`<div class="student-extra-selects" style="display:flex; gap:8px; margin-top:6px;"></div>`);
    const option1Sel = el(`<select class="student-select option1" title="出席" style="border:1px solid #ddd;border-radius:6px;padding:4px 6px;">
      <option value="">--</option>
      <option value="出席1">1</option>
      <option value="出席1.5">1.5</option>
      <option value="出席2">2</option>
      <option value="出席2.5">2.5</option>
      <option value="出席3">3</option>
      <option value="缺席">缺席</option>
    </select>`);
    const option2Sel = el(`<select class="student-select option2" title="補/調堂" style="border:1px solid #ddd;border-radius:6px;padding:4px 6px;">
      <option value="">--</option>
      <option value="🌟補0.5堂">0.5</option>
      <option value="🌟補1堂">1</option>
      <option value="🌟補1.5堂">1.5</option>
     
    </select>`);
    // 預設值
    if (stu.option1) option1Sel.value = stu.option1;
    if (stu.option2) option2Sel.value = stu.option2;
    option1Sel.addEventListener('change', async () => { 
      stu.option1 = option1Sel.value; 
      localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
      
      // 自動同步到後端
      try {
        await syncScheduleDataToBackend(scheduleData);
        toast('出席選項已同步到數據庫');
      } catch(e) {
        console.warn('同步出席選項到後端失敗', e);
        toast('本地已保存，但同步失敗');
      }
    });
    option2Sel.addEventListener('change', async () => { 
      stu.option2 = option2Sel.value; 
      localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
      
      // 自動同步到後端
      try {
        await syncScheduleDataToBackend(scheduleData);
        toast('補/調堂選項已同步到數據庫');
      } catch(e) {
        console.warn('同步補/調堂選項到後端失敗', e);
        toast('本地已保存，但同步失敗');
      }
    });
    selectsWrap.append(option1Sel, option2Sel);
    
    studentDetails.append(name, info, selectsWrap);
    studentInfo.append(avatar, studentDetails);

    // 學生操作按鈕
    const studentActions = el(`<div class="student-actions"></div>`);
    
    // 查看按鈕
    const viewBtn = el(`<button class="student-btn student-btn-view" title="查看學生詳細信息">
      <i class="fas fa-eye"></i>
    </button>`);
    viewBtn.onclick = () => showStudentDetails(stu);
    
    // 刪除按鈕
    const delBtn = el(`<button class="student-btn student-btn-delete" title="從此時段移除學生">
      <i class="fas fa-trash"></i>
    </button>`);
    delBtn.onclick = () => deleteStudent(stu.id, slotId);
    
    studentActions.append(viewBtn, delBtn);

    card.append(studentInfo, studentActions);
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

    // 🔄 智能分类：按日期、时间、课程类型分类到正确位置
    let targetSlot = null;
    
    // 查找匹配的时段
    for (const slot of scheduleData.timeSlots) {
      if (slot.date === date && slot.time === time && slot.type === type) {
        targetSlot = slot;
        break;
      }
    }
    
    // 如果没有找到匹配的时段，创建新的
    if (!targetSlot) {
      const slotId = generateId('t');
      targetSlot = { 
        id: slotId, 
        date: date,
        time: time, 
        type: type, 
        teachers: [], 
        students: [], 
        location: location || ''
      };
      scheduleData.timeSlots.push(targetSlot);

      // 重新排序时段
      scheduleData.timeSlots.sort((a, b) => {
        // 日期排序
        if (a.date !== b.date) {
          if (a.date === '未設定日期') return 1;
          if (b.date === '未設定日期') return -1;
          return new Date(a.date) - new Date(b.date);
        }
        // 时间排序
        return parseStartMinutes(a.time) - parseStartMinutes(b.time);
      });
    }
    
    // 添加學生到正確的時段
    targetSlot.students.push(newStudent);
    
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

    document.body.appendChild(dialog);
  }

  function renderAll() {
    const wrap = document.getElementById('schedulerContainer');
    const slotsBox = wrap.querySelector('#schSlots');
    slotsBox.innerHTML = '';
    
    if (!scheduleData.timeSlots || scheduleData.timeSlots.length === 0) {
      // 顯示空狀態
      slotsBox.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-calendar-plus"></i>
          <h3>還沒有時段安排</h3>
          <p>點擊「新增時段」按鈕開始安排課程</p>
        </div>
      `;
      return;
    }
    
    (scheduleData.timeSlots || []).forEach(slot => {
      const block = el(`<div class="time-slot"></div>`);
      
      const head = el(`<div class="time-slot-header"></div>`);
      const timeInfo = el(`<div class="time-slot-info"></div>`);
      timeInfo.append(el(`<span class="time-display">${slot.time}</span>`));
      timeInfo.append(el(`<span class="course-type">${slot.type}</span>`));
      
      const teacherInfo = el(`<div class="teacher-info"></div>`);
      teacherInfo.append(el(`<span class="teacher-label">教師:</span>`));
      const names = el(`<div class="teacher-names"></div>`);
      (slot.teachers || []).forEach(t => names.append(el(`<span class="teacher-tag">${t}</span>`)));
      teacherInfo.append(names);
      
      const actions = el(`<div class="time-slot-actions"></div>`);
      actions.append(el(`<button class="slot-btn slot-btn-edit" onclick="editTimeSlot('${slot.id}')"><i class="fas fa-edit"></i> 編輯</button>`));
      actions.append(el(`<button class="slot-btn slot-btn-delete" onclick="deleteTimeSlot('${slot.id}')"><i class="fas fa-trash"></i> 刪除</button>`));
      
      head.append(timeInfo, teacherInfo, actions);

      const list = el(`<div class="students-grid"></div>`);
      list.dataset.slotId = slot.id; 
      list.dataset.time = slot.time; 
      list.dataset.type = slot.type; 
      list.dataset.location = slot.location || '';
      
      makeDroppable(list, slot);
      
      if (slot.students && slot.students.length > 0) {
        slot.students.forEach(st => list.append(createStudentCard(st, slot.id)));
      } else {
        // 顯示空狀態
        list.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-user-plus"></i>
            <h3>還沒有學生</h3>
            <p>點擊「新增學生」按鈕添加學生到此時段</p>
          </div>
        `;
      }

      block.append(head, list);
      slotsBox.appendChild(block);
    });
    
    renderTeacherHours(wrap);
  }

  function renderTeacherHours(container) {
    const box = container.querySelector('#schTeacherHours'); 
    box.innerHTML = '';
    
    if (!scheduleData.teacherHours || scheduleData.teacherHours.length === 0) {
      // 顯示空狀態
      box.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-chart-bar"></i>
          <h3>還沒有教師時數統計</h3>
          <p>添加時段和學生後將顯示教師時數統計</p>
        </div>
      `;
      return;
    }
    
    (scheduleData.teacherHours || []).forEach(t => {
      const card = el(`<div class="teacher-hour-card">
        <div class="teacher-name">${t.name || '未命名教師'}</div>
        <div class="teacher-hours">${t.hours || 0}</div>
        <div class="teacher-hours-label">小時</div>
        ${t.notes ? `<div class="teacher-notes">${t.notes}</div>` : ''}
      </div>`);
      box.appendChild(card);
    });
  }

  function bindHeader(container) {
    const dateEl = container.querySelector('#schDate');
    const locEl = container.querySelector('#schLoc');

    const today = new Date();
    dateEl.value = today.toISOString().slice(0,10);

    const onFilterChange = async () => { 
      await buildFromStudents({ date: dateEl.value, location: locEl.value }); 
      renderAll(); 
    };
    dateEl.addEventListener('change', onFilterChange);
    locEl.addEventListener('change', onFilterChange);

    // 添加篩選狀態顯示區域
    addFilterStatusDisplay(container);

    container.querySelector('#schSave').addEventListener('click', async () => {
      try { 
        // 先保存到本地
        localStorage.setItem('scheduleData', JSON.stringify(scheduleData)); 
        
        // 同步到后端数据库
        await syncScheduleDataToBackend(scheduleData);
        
        toast('保存成功，已同步到数据库');
      } catch(e){ 
        console.error('保存失败:', e);
        toast('保存失败: ' + e.message);
      }
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

  // 添加篩選狀態顯示區域
  function addFilterStatusDisplay(container) {
    const statusDiv = el(`<div id="filterStatus" class="filter-status-display"></div>`);
    const ref = container.querySelector('.scheduler-controls');
    if (ref && ref.parentNode === container) {
      container.insertBefore(statusDiv, ref);
    } else {
      // 如果找不到直接子節點，則將狀態列放在容器開頭
      if (typeof container.prepend === 'function') {
        container.prepend(statusDiv);
      } else {
        container.appendChild(statusDiv);
      }
    }
  }

  // 顯示篩選狀態
  function showFilterStatus(filters) {
    const statusDiv = document.getElementById('filterStatus');
    if (!statusDiv) return;

    const { date, location } = filters;
    let statusText = '🔍 篩選條件：';
    let conditions = [];

    if (date) {
      const dateObj = new Date(date);
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      const dayName = dayNames[dateObj.getDay()];
      conditions.push(`📅 ${date} (星期${dayName})`);
    }
    
    if (location) {
      conditions.push(`📍 ${location}`);
    }

    if (conditions.length === 0) {
      statusText += '無篩選條件';
    } else {
      statusText += conditions.join(' | ');
    }

    statusDiv.innerHTML = `
      <div class="filter-status-content">
        <span>${statusText}</span>
        <span class="filter-status-count" id="filterResultCount"></span>
      </div>
    `;
  }

  // 顯示篩選結果摘要
  function showFilterSummary() {
    const countSpan = document.getElementById('filterResultCount');
    if (!countSpan) return;

    const totalStudents = scheduleData.timeSlots.reduce((total, slot) => total + (slot.students?.length || 0), 0);
    const totalSlots = scheduleData.timeSlots.length;

    if (totalSlots === 0) {
      countSpan.innerHTML = '<span class="filter-no-results">❌ 沒有找到匹配的時段</span>';
    } else {
      countSpan.innerHTML = `
        <span class="filter-results">
          ✅ 找到 ${totalSlots} 個時段，共 ${totalStudents} 名學生
        </span>
      `;
    }
  }

  async function initData(container) {
    try { 
      const saved = localStorage.getItem('scheduleData'); 
      if (saved) { 
        scheduleData = JSON.parse(saved); 
      } 
    } catch(_) {}
    
    const date = container.querySelector('#schDate').value; 
    const loc = container.querySelector('#schLoc').value;
    await buildFromStudents({ date, location: loc });
  }

  // 同步课程编排数据到后端数据库
  async function syncScheduleDataToBackend(scheduleData) {
    try {
      console.log('🔄 开始同步课程编排数据到后端...');
      
      // 获取当前用户信息
      const currentUserPhone = localStorage.getItem('current_user_phone');
      if (!currentUserPhone) {
        throw new Error('用户未登录，无法保存数据');
      }
      
      // 准备同步的数据
      const syncData = {
        coachPhone: currentUserPhone,
        timestamp: new Date().toISOString(),
        timeSlots: scheduleData.timeSlots.map(slot => ({
          id: slot.id,
          date: slot.date,
          time: slot.time,
          type: slot.type,
          location: slot.location,
          teachers: slot.teachers || [],
          students: slot.students.map(student => ({
            id: student.id,
            name: student.name,
            phone: student.phone,
            age: student.age,
            type: student.type,
            date: student.date,
            time: student.time,
            location: student.location,
            notes: student.notes,
            status: student.status,
            option1: student.option1 || '',
            option2: student.option2 || '',
            hasBalloonMark: student.hasBalloonMark,
            hasStarMark: student.hasStarMark
          }))
        }))
      };
      
      console.log('📋 准备同步的数据:', syncData);
      
      // 调用后端API保存数据
      const response = await fetch(`${databaseConnector.apiConfig.baseURL}/api/schedule/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Public-Key': 'ttdrcccy',
          'X-API-Private-Key': '2b207365-cbf0-4e42-a3bf-f932c84557c4'
        },
        body: JSON.stringify(syncData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 课程编排数据同步成功:', result);
        return result;
      } else {
        throw new Error(result.message || '同步失败');
      }
      
    } catch (error) {
      console.error('❌ 同步课程编排数据失败:', error);
      throw error;
    }
  }

  window.initSchedulerLight = async function(containerId) {
    const container = document.getElementById(containerId); if (!container) return;
    buildSchedulerSkeleton(container);
    bindHeader(container);
    await initData(container);
    renderAll();
  }

  // 添加缺失的輔助函數
  function editTimeSlot(slotId) {
    const slot = scheduleData.timeSlots.find(s => s.id === slotId);
    if (!slot) return;
    
    // 顯示編輯對話框
    showEditTimeSlotDialog(slot);
  }

  function deleteTimeSlot(slotId) {
    if (confirm('確定要刪除這個時段嗎？')) {
      scheduleData.timeSlots = scheduleData.timeSlots.filter(s => s.id !== slotId);
      renderAll();
      toast('時段已刪除');
    }
  }

  function showEditTimeSlotDialog(slot) {
    // 移除現有的對話框
    const existingDialog = document.querySelector('.edit-timeslot-dialog');
    if (existingDialog) existingDialog.remove();

    const dialog = el(`
      <div class="edit-timeslot-dialog fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">編輯時段</h3>
            <button class="close-dialog text-gray-500 hover:text-gray-700 text-xl">&times;</button>
          </div>
          
          <form id="editTimeSlotForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">時間 *</label>
              <input type="text" id="editTime" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${slot.time}" required>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">課程類型 *</label>
              <input type="text" id="editType" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${slot.type}" required>
            </div>
            
            <div class="flex gap-3 pt-4">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                保存
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
    dialog.querySelector('#editTimeSlotForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newTime = dialog.querySelector('#editTime').value;
      const newType = dialog.querySelector('#editType').value;
      
      if (newTime && newType) {
        slot.time = newTime;
        slot.type = newType;
        renderAll();
        dialog.remove();
        toast('時段已更新');
      }
    });

    document.body.appendChild(dialog);
  }

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
})(); 