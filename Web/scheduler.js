// 課程編排模組（可嵌入現有頁面）
// 用法：在頁面載入後調用 initSchedulerInAttendance('schedulerContainer')

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
    const node = el(`<div class="fixed bottom-4 right-4 bg-[#5D5CDE] text-white px-4 py-2 rounded-md shadow-lg z-[9999]">${message}</div>`);
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
      <div class="container mx-auto px-4 py-4 max-w-4xl">
        <div class="mb-4 flex items-start sm:items-center justify-between">
          <h3 class="text-xl font-bold text-[#5D5CDE]">課程編排系統</h3>
          <div class="flex gap-2">
            <button id="schAddSlot" class="bg-[#5D5CDE] text-white px-3 py-1 rounded-md text-sm">新增時段</button>
            <button id="schAddStudent" class="bg-[#5D5CDE] text-white px-3 py-1 rounded-md text-sm">新增學生</button>
            <button id="schSave" class="bg-green-600 text-white px-3 py-1 rounded-md text-sm">保存</button>
          </div>
        </div>
        <div class="flex flex-wrap gap-3 mb-4">
          <div class="flex items-center gap-2">
            <label class="text-sm">日期</label>
            <input type="date" id="schDate" class="border rounded px-2 py-1 text-sm"/>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm">地點</label>
            <select id="schLoc" class="border rounded px-2 py-1 text-sm"><option value="">（請選擇）</option></select>
          </div>
        </div>
        <div id="schSlots" class="space-y-4"></div>
        <div class="mt-6 pt-4 border-t">
          <h4 class="font-semibold mb-2">教師時數統計</h4>
          <div id="schTeacherHours" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"></div>
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
          date: x.date || g.date
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
      populateLocationOptions(allStudentsCache);
    }
    const { date, location } = filters;
    
    // 先過濾
    let filtered = allStudentsCache.map(s => {
      // 若 time 字段中帶有星期，抽離覆蓋
      if (s.time && /星期[一二三四五六日]/.test(s.time)) {
        const t = extractDayAndTime(s.time);
        if (t.time) s.time = t.time;
      } else {
        // 僅時間段，統一 24h
        s.time = to24hRange(s.time);
      }
      return s;
    }).filter(s => {
      const okLoc = location ? eqLocation(s.location, location) : true;
      return okLoc;
    });
    
    // 依「phone+name」在同一日期去重
    const uniq = new Map();
    filtered.forEach(s => {
      const key = `${(s.phone||'').trim()}|${s.name}`;
      if (!uniq.has(key)) uniq.set(key, s);
    });
    filtered = Array.from(uniq.values());

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
    const card = el(`<div class="student-card bg-white border rounded-md p-3 flex items-center justify-between shadow-sm" draggable="true"></div>`);
    card.dataset.id = stu.id; card.dataset.slot = slotId;
    card.addEventListener('dragstart', (e) => { try { e.dataTransfer.setData('text/plain', stu.id); e.dataTransfer.effectAllowed='move'; } catch(_){} dragging = { student: stu, fromSlotId: slotId }; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); setTimeout(() => { dragging=null; }, 50); });

    const left = el(`<div class="flex items-center"></div>`);
    const btn = el(`<button class="w-6 h-6 rounded-full border flex items-center justify-center mr-2 text-xs"></button>`);
    if (stu.status === true) { btn.classList.add('bg-green-500','text-white'); btn.textContent='✓'; }
    else if (stu.status === false) { btn.classList.add('bg-red-500','text-white'); btn.textContent='✗'; }
    else { btn.classList.add('border-gray-300'); btn.textContent=''; }
    btn.onclick = () => { toggleStudentStatus(stu.id, slotId); };

    const name = el(`<span class="font-medium"></span>`); name.textContent = stu.name;
    const notes = el(`<span class="ml-2 text-sm text-gray-600"></span>`); notes.textContent = stu.notes||'';
    left.append(btn, name, notes);

    const actions = el(`<div class="flex gap-1"></div>`);
    const del = el(`<button class="text-gray-500 hover:text-red-500" title="刪除">🗑️</button>`);
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

  function renderAll() {
    const wrap = document.getElementById('schedulerContainer');
    const slotsBox = wrap.querySelector('#schSlots');
    slotsBox.innerHTML='';
    (scheduleData.timeSlots||[]).forEach(slot => {
      const block = el(`<div class="time-slot border rounded-lg overflow-hidden"></div>`);
      const head = el(`<div class="bg-gray-100 px-4 py-3 flex flex-wrap items-center justify-between"></div>`);
      const timeInfo = el(`<div class="flex items-center"></div>`);
      timeInfo.append(el(`<span class="font-semibold">${slot.time}</span>`));
      timeInfo.append(el(`<span class="ml-3 text-sm px-2 py-0.5 bg-[#5D5CDE] bg-opacity-20 text-[#5D5CDE] rounded">${slot.type}</span>`));
      const teacherInfo = el(`<div class="flex items-center mt-2 sm:mt-0"></div>`);
      teacherInfo.append(el(`<span class="text-sm text-gray-600 mr-2">教師:</span>`));
      const names = el(`<div class="flex gap-1"></div>`);
      (slot.teachers||[]).forEach(t => names.append(el(`<span class="text-sm px-2 py-0.5 bg-gray-200 rounded">${t}</span>`)));
      teacherInfo.append(names);
      head.append(timeInfo, teacherInfo);

      const list = el(`<div class="students-container p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"></div>`);
      list.dataset.slotId = slot.id; list.dataset.time = slot.time; list.dataset.type = slot.type; list.dataset.location = slot.location||'';
      makeDroppable(list, slot);
      (slot.students||[]).forEach(st => list.append(createStudentCard(st, slot.id)));

      block.append(head, list);
      slotsBox.appendChild(block);
    });
    renderTeacherHours(wrap);
  }

  function renderTeacherHours(container) {
    const box = container.querySelector('#schTeacherHours'); box.innerHTML = '';
    (scheduleData.teacherHours || []).forEach(t => {
      const card = el(`<div class="border rounded-md p-3 flex justify-between items-center"><div class="font-medium">${t.name}</div><div class="text-[#5D5CDE] font-semibold">${t.hours}<span class="text-gray-500 text-xs ml-1">小時</span><span class="text-xs text-gray-500 ml-1">${t.notes||''}</span></div></div>`);
      box.appendChild(card);
    });
  }

  function bindHeader(container) {
    const dateEl = container.querySelector('#schDate');
    const locEl = container.querySelector('#schLoc');

    const today = new Date();
    dateEl.value = today.toISOString().slice(0,10);

    const onFilterChange = async () => { await buildFromStudents({ date: dateEl.value, location: locEl.value }); renderAll(); };
    dateEl.addEventListener('change', onFilterChange);
    locEl.addEventListener('change', onFilterChange);

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
      const s = { id: generateId('s'), name: '新學生', status: null, notes: '' };
      scheduleData.timeSlots[0].students.push(s);
      renderAll();
      toast('已加入一位學生');
    });
  }

  async function initData(container) {
    try { const saved = localStorage.getItem('scheduleData'); if (saved) { scheduleData = JSON.parse(saved); } } catch(_) {}
    const date = container.querySelector('#schDate').value; const loc = container.querySelector('#schLoc').value;
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
            status: student.status
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

  window.initSchedulerInAttendance = async function(containerId) {
    const container = document.getElementById(containerId); if (!container) return;
    buildSchedulerSkeleton(container);
    bindHeader(container);
    await initData(container);
    renderAll();
  }
})(); 