/* ================================================================
   ExamPro — proctor.js
   1) Student side : exam ke dauraan screen/desktop/tab chhodne par server ko turant batata hai.
   2) Admin side   : "Live Monitor" tab + alert (kaun sa student bahar gaya, kitni baar, kitni der).
   Detection: document.visibilitychange + window blur/focus
   (dusre desktop par jaana, Alt+Tab, tab badalna, window minimize — sab par ye fire hote hain).
================================================================ */

// ---------------------------------------------------------------
// STUDENT SIDE
// ---------------------------------------------------------------
const Proctor = (() => {
  let sessionId = null, away = false, awayAt = 0, hbTimer = null, count = 0, attached = false;
  let queue = Promise.resolve();            // events order mein jaayein (left -> returned)

  const send = (type, reason) => {
    const sid = sessionId;
    if (!sid) return;
    queue = queue.then(() => api('POST', '/proctor/event', { sessionId: sid, type, reason }).catch(() => {}));
  };

  function goAway(reason) {
    if (!sessionId || away) return;
    away = true; awayAt = Date.now(); count++;
    send('left', reason);
  }
  function comeBack() {
    if (!sessionId || !away) return;
    away = false;
    const secs = Math.round((Date.now() - awayAt) / 1000);
    send('returned');
    showWarning(secs);
  }

  const onVis   = () => (document.hidden ? goAway('tab_hidden') : (document.hasFocus() ? comeBack() : null));
  const onBlur  = () => goAway('window_blur');
  const onFocus = () => { if (!document.hidden) comeBack(); };

  function showWarning(secs) {
    let el = document.getElementById('proctorWarn');
    if (!el) {
      el = document.createElement('div');
      el.id = 'proctorWarn';
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,10,30,.85);display:flex;align-items:center;justify-content:center;padding:20px;';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div style="background:#fff;color:#1e1b2e;max-width:430px;width:100%;border-radius:16px;padding:28px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">
      <div style="font-size:2.6rem;">⚠️</div>
      <h2 style="margin:8px 0;color:#dc2626;">Exam screen chhodi gayi!</h2>
      <p style="margin:0 0 6px;">Aap <strong>${secs} sec</strong> ke liye exam window se bahar gaye.</p>
      <p style="margin:0 0 14px;">Ye activity <strong>admin ko bhej di gayi hai</strong> (naam, roll no, time ke saath). Warning #${count}.</p>
      <button class="btn btn-blue" onclick="document.getElementById('proctorWarn').remove()">Samajh gaya, exam jaari rakho</button>
    </div>`;
  }

  return {
    async start(examId) {
      this.stop();
      try { sessionId = (await api('POST', '/proctor/start', { examId })).sessionId; } catch (e) { sessionId = null; }
      if (!sessionId) return;
      count = 0; away = false;
      if (!attached) {
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        attached = true;
      }
      hbTimer = setInterval(() => { if (sessionId) api('POST', '/proctor/heartbeat', { sessionId }).catch(() => {}); }, 5000);
    },
    async end() {                              // exam submit hone par
      const sid = sessionId;
      this.stop();
      if (sid) { try { await queue; await api('POST', '/proctor/end', { sessionId: sid }); } catch (e) {} }
    },
    stop() {
      clearInterval(hbTimer); hbTimer = null;
      sessionId = null; away = false;
      if (attached) {
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
        attached = false;
      }
      const w = document.getElementById('proctorWarn'); if (w) w.remove();
    }
  };
})();

// ---------------------------------------------------------------
// ADMIN SIDE
// ---------------------------------------------------------------
const Monitor = (() => {
  let timer = null, lastSeenViolations = null, lastData = null, filter = 'all', openId = null;
  const POLL_MS = 4000;

  const fmtDur = (s) => { s = Math.max(0, Math.round(s)); return s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's'; };
  const fmtTime = (t) => new Date(t).toLocaleTimeString();
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATE = {
    away:      ['🚨 AWAY — screen chhodi', 'badge-danger'],
    ok:        ['🟢 Exam de raha hai', 'badge-success'],
    no_signal: ['⚪ No signal', 'badge-warning'],
    submitted: ['✅ Submitted', 'badge-success'],
    abandoned: ['⛔ Adhura chhoda', 'badge-warning']
  };

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.08;
      o.start(); o.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  async function poll() {
    if (!currentUser || currentUser.role !== 'admin') return stop();
    let data;
    try { data = await api('GET', '/proctor/live'); } catch (e) { return; }
    lastData = data;

    // naya violation aaya? -> alert (kisi bhi admin tab par)
    const cur = {};
    data.sessions.forEach(s => { cur[s.id] = s.violations; });
    if (lastSeenViolations) {
      data.sessions.forEach(s => {
        if (s.violations > (lastSeenViolations[s.id] || 0) && s.state === 'away') {
          toast(`🚨 ${s.student.name} (${s.student.rollNumber}) ne "${s.exam.title}" ki screen chhodi!`, 'error');
          beep();
        }
      });
    }
    lastSeenViolations = cur;
    updateBadge(data);
    if (document.getElementById('monitorBody')) render();
  }

  function updateBadge(data) {
    const n = data.sessions.filter(s => s.state === 'away').length;
    const el = document.getElementById('sideMonitor');
    if (!el) return;
    let b = el.querySelector('.mon-badge');
    if (!b) { b = document.createElement('span'); b.className = 'mon-badge'; b.style.cssText = 'margin-left:auto;background:#dc2626;color:#fff;border-radius:10px;padding:1px 8px;font-size:.72rem;font-weight:700;'; el.appendChild(b); }
    b.textContent = n; b.style.display = n ? '' : 'none';
  }

  function render() {
    const body = document.getElementById('monitorBody');
    if (!body || !lastData) return;
    const all = lastData.sessions;
    const live = all.filter(s => s.state === 'ok' || s.state === 'away' || s.state === 'no_signal');
    const list = all.filter(s => filter === 'all' ? true : filter === 'live' ? live.includes(s) : s.violations > 0);

    document.getElementById('monStats').innerHTML = `
      <div class="dash-card blue"><div class="dash-card-value">${live.length}</div><div class="dash-card-label">🖥️ Abhi exam de rahe</div></div>
      <div class="dash-card orange"><div class="dash-card-value">${all.filter(s => s.state === 'away').length}</div><div class="dash-card-label">🚨 Abhi screen se bahar</div></div>
      <div class="dash-card cyan"><div class="dash-card-value">${all.filter(s => s.violations > 0).length}</div><div class="dash-card-label">⚠️ Violations wale (24h)</div></div>
      <div class="dash-card green"><div class="dash-card-value">${all.reduce((a, s) => a + s.violations, 0)}</div><div class="dash-card-label">Total screen-leave events</div></div>`;

    body.innerHTML = list.map(s => {
      const [label, cls] = STATE[s.state] || ['-', ''];
      const awayNow = s.state === 'away' ? `<br><span style="font-size:.75rem;color:var(--danger);">bahar hai ${fmtDur((lastData.now - s.awaySince) / 1000)} se (${fmtTime(s.awaySince)})</span>` : '';
      const rowBg = s.state === 'away' ? 'background:rgba(220,38,38,.08);' : '';
      const detail = openId === s.id ? `<tr><td colspan="6" style="background:rgba(0,0,0,.03);">
          <strong>Timeline — ${esc(s.student.name)} · ${esc(s.exam.title)}</strong>
          <div style="margin-top:8px;font-size:.84rem;line-height:1.7;">${s.events.length ? s.events.map(ev => ev.kind === 'left'
            ? `🔴 ${fmtTime(ev.at)} — exam screen chhodi <span class="text-muted">(${ev.reason === 'tab_hidden' ? 'dusra desktop/tab' : 'window focus gaya'})</span>`
            : `🟢 ${fmtTime(ev.at)} — wapas aaya <span class="text-muted">(${fmtDur(ev.durationSec)} bahar raha)</span>`).join('<br>') : 'Koi violation nahi.'}</div>
        </td></tr>` : '';
      return `<tr style="${rowBg}cursor:pointer;" onclick="Monitor.toggle('${s.id}')">
        <td><strong>${esc(s.student.name)}</strong><br><span style="font-size:.75rem;color:var(--text-muted);">${esc(s.student.email)}</span></td>
        <td><span class="chip">${esc(s.student.rollNumber)}</span><br><span style="font-size:.75rem;color:var(--text-muted);">${esc(s.student.course)}</span></td>
        <td>${esc(s.exam.title)}<br><span style="font-size:.75rem;color:var(--text-muted);">${esc(s.exam.subject)} · start ${fmtTime(s.startedAt)}</span></td>
        <td><span class="badge ${cls}">${label}</span>${awayNow}</td>
        <td><strong style="color:${s.violations ? 'var(--danger)' : 'var(--success)'};">${s.violations}</strong></td>
        <td>${fmtDur(s.totalAwaySec)}</td>
      </tr>${detail}`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">Abhi koi student exam nahi de raha / koi violation nahi.</td></tr>';
  }

  function start() { if (!timer) { timer = setInterval(poll, POLL_MS); poll(); } }
  function stop()  { clearInterval(timer); timer = null; lastSeenViolations = null; lastData = null; }

  return {
    start, stop,
    toggle(id) { openId = openId === id ? null : id; render(); },
    setFilter(f) { filter = f; document.querySelectorAll('#monFilters button').forEach(b => b.classList.toggle('btn-blue', b.dataset.f === f)); render(); },
    renderTab() {
      document.getElementById('adminContent').innerHTML = `
        <div class="admin-content-header"><h2>🛰️ Live Exam Monitor</h2><span class="text-muted">Har 4 sec mein auto-refresh · row par click karo = timeline</span></div>
        <div class="dash-grid" id="monStats" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px;"></div>
        <div id="monFilters" style="display:flex;gap:8px;margin-bottom:14px;">
          <button class="btn btn-sm btn-blue" data-f="all" onclick="Monitor.setFilter('all')">Sab</button>
          <button class="btn btn-sm" data-f="live" onclick="Monitor.setFilter('live')">Abhi live</button>
          <button class="btn btn-sm" data-f="viol" onclick="Monitor.setFilter('viol')">Sirf violations</button>
        </div>
        <div class="table-card"><table><thead><tr><th>Student</th><th>Roll No / Course</th><th>Exam</th><th>Status</th><th>Screen left (baar)</th><th>Total bahar</th></tr></thead>
        <tbody id="monitorBody"></tbody></table></div>`;
      filter = 'all'; openId = null;
      lastData ? render() : poll();
    }
  };
})();
