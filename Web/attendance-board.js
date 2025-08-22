(function(){
  const BOARD_ID = 'attendanceBoard';

  function h(html){
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function byPhoneNameKey(s){
    return `${(s.Phone_number||s.phone||'').trim()}__${(s.name||s.studentName||s.Student_name||'').trim()}`;
  }

  function normalizeStudent(row){
    return {
      id: row._id || crypto.randomUUID(),
      name: row.name || row.studentName || row.Student_name || '',
      phone: row.Phone_number || row.phone || '',
      location: row.Location || row.location || '',
      time: row.time || row.Time || row.Lesson_time || '',
      type: row.type || row.Type || row.Lesson_type || '',
      day: row.day || row.Day || '',
    };
  }

  function startMinutes(range){
    const m = (range||'').match(/(\d{1,2}):(\d{2})/);
    if(!m) return 0; const hh=parseInt(m[1],10), mm=parseInt(m[2],10); return hh*60+mm;
  }

  function groupByTimeType(students){
    const map = new Map();
    for(const s of students){
      const key = `${s.time}__${s.type}`;
      if(!map.has(key)) map.set(key, { time: s.time||'', type: s.type||'', items: [] });
      map.get(key).items.push(s);
    }
    return Array.from(map.values()).sort((a,b)=> startMinutes(a.time)-startMinutes(b.time));
  }

  function card(stu){
    return h(`<div class="ab-card" draggable="true" data-id="${stu.id}">
      <div class="ab-card-name">${stu.name}</div>
      <div class="ab-card-sub">${stu.phone}</div>
    </div>`);
  }

  function laneHeader(group){
    return h(`<div class="ab-lane-header"><span class="ab-time">${group.time||'-'}</span><span class="ab-type">${group.type||''}</span></div>`);
  }

  function lane(group){
    return h(`<div class="ab-lane" data-time="${group.time}" data-type="${group.type}"></div>`);
  }

  function buildBoard(container, groups){
    const board = h(`<div id="${BOARD_ID}" class="ab-board"></div>`);
    for(const g of groups){
      const col = h('<div class="ab-column"></div>');
      col.appendChild(laneHeader(g));
      const ln = lane(g);
      for(const s of g.items){ ln.appendChild(card(s)); }
      col.appendChild(ln);
      board.appendChild(col);
    }
    container.innerHTML='';
    container.appendChild(board);

    // DnD (visual only; persistence由 scheduler.js 已處理，可後續串接)
    let draggingId=null;
    board.addEventListener('dragstart', e=>{
      const el = e.target.closest('.ab-card'); if(!el) return;
      draggingId = el.dataset.id; e.dataTransfer.setData('text/plain', draggingId);
      e.dataTransfer.effectAllowed='move';
    });
    board.addEventListener('dragend', ()=>{ draggingId=null; document.querySelectorAll('.ab-lane').forEach(l=>l.classList.remove('drop')); });
    board.addEventListener('dragover', e=>{ if(e.target.closest('.ab-lane')){ e.preventDefault(); e.dataTransfer.dropEffect='move'; e.target.closest('.ab-lane').classList.add('drop'); }});
    board.addEventListener('dragleave', e=>{ const ln=e.target.closest('.ab-lane'); if(ln) ln.classList.remove('drop'); });
    board.addEventListener('drop', e=>{
      const ln = e.target.closest('.ab-lane'); if(!ln) return;
      e.preventDefault(); ln.classList.remove('drop');
      const id = e.dataTransfer.getData('text/plain') || draggingId; if(!id) return;
      const cardEl = board.querySelector(`.ab-card[data-id="${id}"]`); if(!cardEl) return;
      ln.appendChild(cardEl);
      // 後續如需寫回 backend，可調用 window.databaseConnector.updateStudentLesson
    });
  }

  async function loadBoardData(){
    try{
      const raw = await window.databaseConnector.fetchStudentsRaw();
      const normalized = raw.map(normalizeStudent);
      // 去重：phone+name
      const seen = new Set();
      const unique = [];
      for(const s of normalized){
        const k = `${s.phone}__${s.name}`;
        if(!seen.has(k)){ seen.add(k); unique.push(s); }
      }
      // 只顯示當前地點（若頁面有下拉選）
      const locSel = document.getElementById('attendanceLocation');
      const currentLoc = locSel && locSel.value ? locSel.value : '';
      const filtered = currentLoc ? unique.filter(s => (s.location||'').trim() === currentLoc.trim()) : unique;
      return groupByTimeType(filtered);
    }catch(err){ console.error('AttendanceBoard load error', err); return []; }
  }

  window.initAttendanceBoard = async function(containerId){
    const container = document.getElementById(containerId);
    if(!container) return;
    container.classList.add('ab-container');
    const groups = await loadBoardData();
    buildBoard(container, groups);
  }
})(); 