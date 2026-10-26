/* ================================================================
   ExamPro — Advanced Online Examination System
   app.js  |  All JavaScript extracted from OnlineExamSystem.html
================================================================ */

// ===== DATABASE =====
// Ab local IndexedDB nahi hai — data MongoDB mein hai aur js/api.js ke through Node.js/Express API se aata hai.

// ===== APP STATE =====
let currentUser = null;
let currentExam = null;
let currentQuestion = 0;
let answers = {};
let flagged = new Set();
let visitedQuestions = new Set();   // tracks which questions student has seen
let timerInterval = null;
let timeLeft = 0;
let examStartId = null;

// ===== INIT =====
// ===== FLOATING PARTICLES =====
function initParticles() {
  const c = document.getElementById('heroParticles');
  if (!c) return;
  const sizes  = [6,8,10,12,14,16,20,24];
  const delays = [0,1,2,3,4,5,6,7,8,9,10,12,14];
  const durs   = [8,10,12,14,16,18,20];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('span');
    const sz = sizes[i % sizes.length];
    s.style.cssText = `
      width:${sz}px;height:${sz}px;
      left:${Math.random()*100}%;
      bottom:-${sz}px;
      animation-duration:${durs[i%durs.length]}s;
      animation-delay:${delays[i%delays.length]}s;
      opacity:${0.1 + Math.random()*0.25};
      background:${i%3===0?'rgba(0,188,212,0.25)':i%3===1?'rgba(124,77,255,0.18)':'rgba(255,255,255,0.1)'};
    `;
    c.appendChild(s);
  }
}
initParticles();

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  // If IntersectionObserver not supported, show everything immediately
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin:'0px 0px 0px 0px' });
  els.forEach(el => io.observe(el));
  // Safety fallback: force all visible after 2.5s
  setTimeout(() => els.forEach(el => el.classList.add('visible')), 2500);
}
// run on DOM ready
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initScrollReveal);
else initScrollReveal();
// re-run when home page shown
const _origShowPage = window.showPage;

// ===== QUOTE ROTATOR =====
const quotes = [
  { text: 'Education is the most powerful weapon you can use to change the world. Online exams make that education accessible to everyone.', author: '— Nelson Mandela (adapted)' },
  { text: 'The beautiful thing about learning is that no one can take it away from you. Every exam you take makes you stronger.', author: '— B.B. King (adapted)' },
  { text: 'An investment in knowledge pays the best interest. Prepare well, attempt confidently, succeed brilliantly.', author: '— Benjamin Franklin (adapted)' },
];
let qIdx = 0, qTimer;
function changeQuote(i) {
  qIdx = i;
  document.getElementById('quoteText').textContent = quotes[i].text;
  document.getElementById('quoteAuthor').textContent = quotes[i].author;
  document.querySelectorAll('.hp-qdot').forEach((d,j) => d.classList.toggle('active', j===i));
  clearInterval(qTimer); qTimer = setInterval(autoQuote, 5000);
}
function autoQuote() { changeQuote((qIdx+1) % quotes.length); }
qTimer = setInterval(autoQuote, 5000);

// ===== APP START: JWT token se session restore =====
setTimeout(async () => {
  if (getToken()) {
    try {
      const { user } = await api('GET', '/auth/me');
      currentUser = user;
      setNavForUser(currentUser.role);
      if (currentUser.role === 'admin') { showPage('adminPanel'); showAdminTab('overview'); }
      else if (currentUser.accessGranted === false) { showPage('accessGate'); }
      else { showPage('studentDash'); refreshStudentDash(); }
    } catch (e) {
      if (e.status === 401) setToken(null);   // token expire ya invalid
    }
  }
  updateHomeStats();
}, 0);

// (Admin account, sample exams aur default notices ab server start par MongoDB mein seed hote hain — seed/ folder dekho)
function renderAdminResults() { return renderAllResults(); }

// ===== NAVIGATION =====
const GATED_PAGES = ['studentDash', 'availableExams', 'myResults', 'studentProfile', 'takingExam', 'result'];
function isLocked() { return !!(currentUser && currentUser.role === 'student' && currentUser.accessGranted === false); }
window.onAccessRequired = function () { if (currentUser) currentUser.accessGranted = false; showPage('accessGate'); };

function showPage(page) {
  if (isLocked() && GATED_PAGES.includes(page)) page = 'accessGate';   // access password ke bina exam wale pages band
  if (page === 'accessGate') { const g = document.getElementById('gateAlert'); if (g) g.className = 'hidden'; const gp = document.getElementById('gatePass'); if (gp) gp.value = ''; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
  if (page === 'availableExams') loadAvailableExams();
  if (page === 'myResults') loadMyResults();
  if (page === 'studentDash') refreshStudentDash();
  if (page === 'studentProfile') loadProfile();
  if (page === 'home') { updateHomeStats(); setTimeout(initScrollReveal, 80); }
}
function setNavForUser(role) {
  document.getElementById('guestNav').classList.add('hidden');
  document.getElementById('studentNav').classList.add('hidden');
  document.getElementById('adminNav').classList.add('hidden');
  if (role === 'admin') document.getElementById('adminNav').classList.remove('hidden');
  else document.getElementById('studentNav').classList.remove('hidden');
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ===== TOAST =====
function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  const d = document.createElement('div');
  d.className = 'toast-item ' + type;
  d.textContent = msg;
  t.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}

// ===== AUTH =====
let loginRole = 'student';
function setLoginRole(r) {
  loginRole = r;
  document.getElementById('tabStudent').classList.toggle('active', r === 'student');
  document.getElementById('tabAdmin').classList.toggle('active', r === 'admin');
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const alertEl = document.getElementById('loginAlert');
  alertEl.className = 'hidden';
  if (!email || !pass) { showAlert('loginAlert', 'Please fill in all fields.', 'error'); return; }
  try {
    const { token, user } = await api('POST', '/auth/login', { email, password: pass, role: loginRole });
    setToken(token);
    currentUser = user;
    setNavForUser(user.role);
    toast('Welcome back, ' + user.firstName + '! 👋', 'success');
    if (user.role === 'admin') { showPage('adminPanel'); showAdminTab('overview'); }
    else if (user.accessGranted === false) { showPage('accessGate'); }
    else { showPage('studentDash'); refreshStudentDash(); }
  } catch(e) { showAlert('loginAlert', e.message || 'Login error. Please try again.', 'error'); }
}

async function doRegister() {
  const first = document.getElementById('regFirst').value.trim();
  const last = document.getElementById('regLast').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const roll = document.getElementById('regRoll').value.trim();
  const phone = document.getElementById('regPhone').value.replace(/\D/g, '');
  const course = document.getElementById('regCourse').value;
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  if (!first || !last || !email || !roll || !course || !pass || !phone) { showAlert('regAlert', 'Please fill in all fields.', 'error'); return; }
  if (!/^[6-9]\d{9}$/.test(phone)) { showAlert('regAlert', 'Please enter a valid 10-digit mobile number.', 'error'); return; }
  if (pass.length < 6) { showAlert('regAlert', 'Password must be at least 6 characters.', 'error'); return; }
  if (pass !== pass2) { showAlert('regAlert', 'Passwords do not match.', 'error'); return; }
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailReg.test(email)) { showAlert('regAlert', 'Please enter a valid email.', 'error'); return; }
  try {
    const { token, user: newUser } = await api('POST', '/auth/register', { email, password: pass, firstName: first, lastName: last, rollNumber: roll, course, phone });
    setToken(token);
    currentUser = newUser;
    setNavForUser('student');
    toast('Account created! Ab admin ka diya access password daalo. 🔑', 'success');
    showPage('accessGate');
    toast('Account created! Exam dene ke liye admin se exam password lo. 🎉', 'success');
    showPage('studentDash'); refreshStudentDash();
  } catch(e) { showAlert('regAlert', e.message || 'Registration failed. Please try again.', 'error'); }
}

async function submitAccessPassword() {
  const pw = document.getElementById('gatePass').value;
  const el = document.getElementById('gateAlert');
  if (!pw.trim()) { el.className = 'fp-alert err'; el.textContent = '⚠️ Access password enter karo.'; return; }
  try {
    const { user } = await api('POST', '/auth/verify-access', { password: pw });
    currentUser = user;
    toast('Access unlock ho gaya! Aapki profile khul rahi hai ✅', 'success');
    showPage('studentProfile');
  } catch (e) {
    el.className = 'fp-alert err'; el.textContent = '⚠️ ' + (e.message || 'Password galat hai.');
  }
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  el.className = 'alert alert-' + type;
  el.textContent = msg;
}

function logout() {
  Proctor.stop(); Monitor.stop();
  currentUser = null;
  setToken(null);
  document.getElementById('guestNav').classList.remove('hidden');
  document.getElementById('studentNav').classList.add('hidden');
  document.getElementById('adminNav').classList.add('hidden');
  toast('Logged out successfully.', 'info');
  showPage('home');
}

// ===== HOME STATS =====
async function updateHomeStats() {
  try {
    const st = await api('GET', '/public/stats');
    document.getElementById('statStudents').textContent = st.students;
    document.getElementById('statExams').textContent = st.exams;
    document.getElementById('statAttempts').textContent = st.attempts;
    const passEl = document.getElementById('statPass');
    if (passEl) passEl.innerHTML = (st.attempts ? Math.round(st.passed / st.attempts * 100) : 0) + '<span>%</span>';
  } catch(e) {}
}

// ===== STUDENT DASHBOARD =====
async function refreshStudentDash() {
  if (!currentUser) return;
  document.getElementById('examLockBanner').classList.toggle('hidden', !!currentUser.examUnlocked);
  document.getElementById('sdWelcome').textContent = 'Welcome back, ' + currentUser.firstName + '! 👋';
  document.getElementById('sdSubtitle').textContent = 'Roll: ' + currentUser.rollNumber + ' | ' + currentUser.course;
  const allExams = (await getExams()).filter(e => e.status === 'active');
  const myAttempts = await getMyAttempts();
  const passed = myAttempts.filter(a => a.passed);
  const avgScore = myAttempts.length ? Math.round(myAttempts.reduce((s, a) => s + a.percentage, 0) / myAttempts.length) : 0;
  document.getElementById('sdTotalExams').textContent = allExams.length;
  document.getElementById('sdAttempted').textContent = myAttempts.length;
  document.getElementById('sdPassed').textContent = passed.length;
  document.getElementById('sdAvgScore').textContent = avgScore + '%';
  // Recent attempts table
  const recentEl = document.getElementById('sdRecentAttempts');
  if (myAttempts.length === 0) {
    recentEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>No attempts yet</h3><p>Take your first exam to see results here</p></div>';
  } else {
    const sorted = myAttempts.sort((a,b) => b.submittedAt - a.submittedAt).slice(0, 5);
    let rows = sorted.map(a => {
      const exam = allExams.find(e => e.id === a.examId) || { title: 'Deleted Exam', subject: '-' };
      return `<tr>
        <td><strong>${exam.title}</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">${exam.subject}</span></td>
        <td>${a.correct}/${a.total}</td>
        <td><strong>${a.percentage}%</strong><div class="progress-bar" style="width:80px;"><div class="progress-fill ${a.passed?'success':'danger'}" style="width:${a.percentage}%"></div></div></td>
        <td><span class="badge ${a.passed?'badge-success':'badge-danger'}">${a.passed?'✅ Passed':'❌ Failed'}</span></td>
        <td>${new Date(a.submittedAt).toLocaleDateString()}</td>
      </tr>`;
    }).join('');
    recentEl.innerHTML = `<table><thead><tr><th>Exam</th><th>Score</th><th>Percentage</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  // Upcoming exams
  const upEl = document.getElementById('sdUpcomingExams');
  const attemptedIds = new Set(myAttempts.map(a => a.examId));
  const pending = allExams.filter(e => !attemptedIds.has(e.id));
  if (pending.length === 0) {
    upEl.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><h3>All caught up!</h3><p>You have attempted all available exams</p></div>';
  } else {
    const rows2 = pending.slice(0, 5).map(e => `<tr>
      <td><strong>${e.title}</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">${e.subject}</span></td>
      <td>${e.questions.length} Questions</td>
      <td>⏱️ ${e.duration} min</td>
      <td><span class="badge badge-primary">Pass: ${e.passingScore}%</span></td>
      <td><button class="btn btn-blue btn-sm" onclick="openStartModal(${e.id})">Start →</button></td>
    </tr>`).join('');
    upEl.innerHTML = `<table><thead><tr><th>Exam</th><th>Questions</th><th>Duration</th><th>Passing</th><th>Action</th></tr></thead><tbody>${rows2}</tbody></table>`;
  }
}

// ===== AVAILABLE EXAMS =====
async function loadAvailableExams() {
  const allExams = (await getExams()).filter(e => e.status === 'active');
  const subjects = [...new Set(allExams.map(e => e.subject))];
  const filterEl = document.getElementById('examSubjectFilter');
  filterEl.innerHTML = '<option value="">All Subjects</option>' + subjects.map(s => `<option>${s}</option>`).join('');
  renderExamCards(allExams);
}

async function filterExams() {
  const search = document.getElementById('examSearch').value.toLowerCase();
  const subject = document.getElementById('examSubjectFilter').value;
  let exams = (await getExams()).filter(e => e.status === 'active');
  if (subject) exams = exams.filter(e => e.subject === subject);
  if (search) exams = exams.filter(e => e.title.toLowerCase().includes(search) || e.subject.toLowerCase().includes(search));
  renderExamCards(exams);
}

async function renderExamCards(exams) {
  const grid = document.getElementById('examGrid');
  let myAttempts = currentUser ? await getMyAttempts() : [];
  const attemptedIds = new Set(myAttempts.map(a => a.examId));
  if (exams.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📋</div><h3>No exams found</h3><p>Try adjusting your search filters</p></div>';
    return;
  }
  grid.innerHTML = exams.map(e => {
    const attempted = attemptedIds.has(e.id);
    const attempt = myAttempts.find(a => a.examId === e.id);
    return `<div class="exam-card">
      <div class="exam-card-top">
        <div class="exam-card-subject">${e.subject}</div>
        <div class="exam-card-title">${e.title}</div>
        <div class="exam-card-desc">${e.description}</div>
        <div class="exam-card-meta">
          <div class="meta-item">📝 ${e.questions.length} Qs</div>
          <div class="meta-item">⏱️ ${e.duration} min</div>
          <div class="meta-item">🎯 Pass: ${e.passingScore}%</div>
        </div>
      </div>
      <div class="exam-card-bottom">
        ${attempted
          ? `<span class="badge ${attempt.passed?'badge-success':'badge-danger'}">${attempt.passed?'✅ Passed':'❌ Failed'} • ${attempt.percentage}%</span>`
          : '<span class="badge badge-info">📋 Not Attempted</span>'
        }
        ${currentUser
          ? (attempted
              ? `<button class="btn btn-sm" style="background:white;border:1.5px solid var(--border);" onclick="viewAttemptResult(${attempt.id})">View Result</button>`
              : `<button class="btn btn-blue btn-sm" onclick="openStartModal(${e.id})">Start →</button>`)
          : `<button class="btn btn-blue btn-sm" onclick="showPage('login')">Login to Attempt</button>`
        }
      </div>
    </div>`;
  }).join('');
}

// ===== EXAM START MODAL =====
let pendingExamId = null;
async function openStartModal(examId) {
  if (currentUser && currentUser.role !== 'admin' && !currentUser.examUnlocked) { openUnlockModal(); return; }
  let exam;
  try { exam = await getExam(examId); }
  catch (e) {
    if (e.status === 403) { if (currentUser) currentUser.examUnlocked = false; openUnlockModal(); }
    else toast(e.message, 'error');
    return;
  }
  if (!exam) return;
  pendingExamId = examId;
  document.getElementById('startExamTitle').textContent = '📝 ' + exam.title;
  document.getElementById('startExamDesc').textContent = 'Please read the exam details carefully before starting.';
  document.getElementById('startExamInfo').innerHTML = `
    <strong>Subject:</strong> ${exam.subject}<br>
    <strong>Total Questions:</strong> ${exam.questions.length}<br>
    <strong>Duration:</strong> ${exam.duration} minutes<br>
    <strong>Total Marks:</strong> ${exam.totalMarks}<br>
    <strong>Passing Score:</strong> ${exam.passingScore}%<br>
    <strong>Instructions:</strong> Read each question carefully. You can navigate between questions. Flag questions to review later. Once submitted, you cannot change answers.
  `;
  document.getElementById('startExamModal').classList.remove('hidden');
}
async function beginExam() {
  closeModal('startExamModal');
  if (!pendingExamId) return;
  const exam = await getExam(pendingExamId);
  // 🎤 Voice welcome before starting
  speakWelcome(exam, () => startExam(exam));
}

// ===== 🎤 VOICE INSTRUCTIONS =====
let voiceActive = false;
let voiceSynth = window.speechSynthesis;

function speakWelcome(exam, onDone) {
  if (!voiceSynth) { onDone(); return; }
  voiceSynth.cancel();

  // Show voice overlay
  showVoiceOverlay(exam, onDone);
}

function showVoiceOverlay(exam, onDone) {
  const overlay = document.createElement('div');
  overlay.id = 'voiceOverlay';
  overlay.innerHTML = `
    <div class="vo-box">
      <div class="vo-wave-ring"></div>
      <div class="vo-icon">🎤</div>
      <h2 class="vo-title">Voice Instructions</h2>
      <p class="vo-subtitle" id="voSubtitle">Preparing...</p>
      <div class="vo-progress-wrap">
        <div class="vo-progress-bar"><div class="vo-progress-fill" id="voFill"></div></div>
        <span class="vo-progress-label" id="voLabel">Loading...</span>
      </div>
      <div class="vo-wave" id="voWave">
        ${Array.from({length:12},(_,i)=>`<div class="vo-bar" style="animation-delay:${i*0.1}s"></div>`).join('')}
      </div>
      <div class="vo-btns">
        <button class="vo-btn-skip" onclick="skipVoice()">⏭ Skip Voice</button>
        <button class="vo-btn-mute" id="voMuteBtn" onclick="toggleVoiceMute()">🔇 Mute</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  // Build script
  const studentName = currentUser ? currentUser.firstName : 'Student';
  const scripts = [
    { text: `Welcome, ${studentName}! I am ExamPro, your digital examination assistant.`, label: 'Welcome', pct: 0 },
    { text: `You are about to begin the exam: ${exam.title}.`, label: 'Exam Name', pct: 20 },
    { text: `This exam is on the subject of ${exam.subject}.`, label: 'Subject', pct: 30 },
    { text: `There are ${exam.questions.length} questions in total. Each question carries one mark.`, label: 'Questions', pct: 42 },
    { text: `You have ${exam.duration} minutes to complete the exam. Please manage your time wisely.`, label: 'Duration', pct: 54 },
    { text: `The passing score is ${exam.passingScore} percent. You need to score at least ${Math.ceil(exam.questions.length * exam.passingScore / 100)} correct answers to pass.`, label: 'Passing Score', pct: 65 },
    { text: `You can navigate between questions using the Previous and Next buttons. Use the Question Navigator on the right to jump to any question.`, label: 'Navigation', pct: 75 },
    { text: `If you are unsure about a question, click the Flag button to mark it for review later.`, label: 'Flagging', pct: 83 },
    { text: `Once you submit the exam, you cannot change your answers. Please review before submitting.`, label: 'Submission', pct: 90 },
    { text: `All the best, ${studentName}! Take a deep breath, stay focused, and do your best. Your exam begins now!`, label: 'Good Luck!', pct: 100 },
  ];

  let idx = 0;
  let muted = false;
  window._voMuted = false;
  window._voSkip  = false;
  window._voOnDone = () => { overlay.classList.remove('visible'); setTimeout(()=>{ overlay.remove(); onDone(); }, 400); };

  function speakNext() {
    if (window._voSkip || idx >= scripts.length) { window._voOnDone(); return; }
    const s = scripts[idx];
    document.getElementById('voSubtitle').textContent = s.text;
    document.getElementById('voLabel').textContent = s.label;
    document.getElementById('voFill').style.width = s.pct + '%';

    if (!window._voMuted && voiceSynth) {
      const utt = new SpeechSynthesisUtterance(s.text);
      utt.rate  = 0.92;
      utt.pitch = 1.05;
      utt.volume= 1;
      // prefer a clear English voice
      const voices = voiceSynth.getVoices();
      const pref = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')))
                || voices.find(v => v.lang.startsWith('en'));
      if (pref) utt.voice = pref;
      utt.onend = () => { idx++; speakNext(); };
      utt.onerror = () => { idx++; speakNext(); };
      voiceSynth.speak(utt);
    } else {
      // muted — just advance with delay
      setTimeout(() => { idx++; speakNext(); }, 1200);
    }
    idx++;
    // don't increment here — onend handles it
    if (window._voMuted) return; // muted path handles increment above
  }

  // Fix double-increment — rebuild properly
  idx = 0;
  function playScript() {
    if (window._voSkip || idx >= scripts.length) { window._voOnDone(); return; }
    const s = scripts[idx];
    document.getElementById('voSubtitle').textContent = s.text;
    document.getElementById('voLabel').textContent = s.label;
    document.getElementById('voFill').style.width = s.pct + '%';

    if (!window._voMuted) {
      const utt = new SpeechSynthesisUtterance(s.text);
      utt.rate = 0.92; utt.pitch = 1.05; utt.volume = 1;
      const voices = voiceSynth ? voiceSynth.getVoices() : [];
      const pref = voices.find(v=>v.lang.startsWith('en')&&(v.name.includes('Google')||v.name.includes('Natural')))||voices.find(v=>v.lang.startsWith('en'));
      if (pref && utt) utt.voice = pref;
      utt.onend = () => { idx++; playScript(); };
      utt.onerror= () => { idx++; playScript(); };
      if(voiceSynth) voiceSynth.speak(utt);
    } else {
      setTimeout(() => { idx++; playScript(); }, 900);
    }
  }

  window.skipVoice = () => { window._voSkip = true; if(voiceSynth) voiceSynth.cancel(); window._voOnDone(); };
  window.toggleVoiceMute = () => {
    window._voMuted = !window._voMuted;
    const btn = document.getElementById('voMuteBtn');
    if (btn) btn.textContent = window._voMuted ? '🔊 Unmute' : '🔇 Mute';
    if (window._voMuted && voiceSynth) voiceSynth.cancel();
    if (!window._voMuted) playScript();
  };

  // Voices may load async
  if (voiceSynth && voiceSynth.getVoices().length === 0) {
    voiceSynth.onvoiceschanged = () => playScript();
  } else {
    setTimeout(playScript, 400);
  }
}

// ===== EXAM LOGIC =====
function startExam(exam) {
  currentExam = exam;
  currentQuestion = 0;
  answers = {};
  flagged = new Set();
  visitedQuestions = new Set();      // ← track visited
  timeLeft = exam.duration * 60;
  showPage('takingExam');
  document.getElementById('examTitle').textContent = exam.title;
  document.getElementById('examSubInfo').textContent = exam.subject + ' • ' + exam.questions.length + ' Questions • ' + exam.duration + ' min';
  renderQuestion();
  buildQGrid();
  updateExamSummary();
  clearInterval(timerInterval);
  timerInterval = setInterval(tickTimer, 1000);
  Proctor.start(exam.id);     // screen/desktop switch tracking shuru
}

function tickTimer() {
  timeLeft--;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  document.getElementById('timerDisplay').textContent = m + ':' + String(s).padStart(2, '0');
  const box = document.getElementById('timerBox');
  if (timeLeft <= 60) { box.className = 'timer-box danger'; }
  else if (timeLeft <= 300) { box.className = 'timer-box warning'; }
  if (timeLeft <= 0) { clearInterval(timerInterval); submitExam(); }
}

function renderQuestion() {
  // mark current as visited
  visitedQuestions.add(currentQuestion);

  const q = currentExam.questions[currentQuestion];
  const area = document.getElementById('questionArea');
  const opts = q.options.map((o, i) => {
    const sel = answers[currentQuestion] === i ? 'selected' : '';
    const labels = ['A','B','C','D','E','F'];
    return `<div class="option-item ${sel}" onclick="selectOption(${i})">
      <div class="option-circle">${labels[i]}</div>
      <div class="option-text">${o}</div>
    </div>`;
  }).join('');
  area.innerHTML = `<div class="question-panel">
    <div class="q-info">
      <span class="badge badge-primary">Q ${currentQuestion + 1} / ${currentExam.questions.length}</span>
      <span style="font-size:0.8rem;color:var(--text-muted);">1 Mark${flagged.has(currentQuestion) ? ' | <span style="color:var(--warning);">🚩 Flagged</span>' : ''}</span>
    </div>
    <div class="q-text">${q.text}</div>
    ${q.image ? `<div class="q-image"><img src="${q.image}" alt="Question diagram" onclick="zoomQImage(this.src)" title="Click to zoom"></div>` : ''}
    <div class="options-list">${opts}</div>
  </div>`;
  document.getElementById('prevBtn').disabled = currentQuestion === 0;
  document.getElementById('nextBtn').textContent = currentQuestion === currentExam.questions.length - 1 ? 'Last Question' : 'Next →';
  buildQGrid();
  updateSubmitBtn();   // ← check submit eligibility
}

function selectOption(i) {
  answers[currentQuestion] = i;
  renderQuestion();
  updateExamSummary();
}

function nextQuestion() { if (currentQuestion < currentExam.questions.length - 1) { currentQuestion++; renderQuestion(); } }
function prevQuestion() { if (currentQuestion > 0) { currentQuestion--; renderQuestion(); } }
function flagQuestion() {
  if (flagged.has(currentQuestion)) flagged.delete(currentQuestion);
  else flagged.add(currentQuestion);
  renderQuestion();
  updateExamSummary();
  buildQGrid();
}

function buildQGrid() {
  const grid = document.getElementById('qGrid');
  grid.innerHTML = currentExam.questions.map((_, i) => {
    let cls = '';
    if (visitedQuestions.has(i)) cls = 'visited';
    if (answers[i] !== undefined) cls = 'answered';
    if (flagged.has(i)) cls = 'flagged';
    if (i === currentQuestion) cls += ' current';
    return `<div class="q-dot ${cls}" onclick="goToQ(${i})">${i + 1}</div>`;
  }).join('');
}

function goToQ(i) { currentQuestion = i; renderQuestion(); }

function updateExamSummary() {
  const total   = currentExam.questions.length;
  const visited = visitedQuestions.size;
  const answered= Object.keys(answers).length;
  document.getElementById('sumTotal').textContent     = total;
  document.getElementById('sumAnswered').textContent  = answered;
  document.getElementById('sumUnanswered').textContent= total - answered;
  document.getElementById('sumFlagged').textContent   = flagged.size;
  // visited counter
  const visEl = document.getElementById('sumVisited');
  if (visEl) visEl.textContent = visited + '/' + total;
}

// ── Submit button enable/disable ──────────────────────────────
function allVisited() {
  return currentExam && visitedQuestions.size >= currentExam.questions.length;
}

function updateSubmitBtn() {
  const btn    = document.getElementById('submitBtn');
  const notice = document.getElementById('submitNotice');
  if (!btn) return;

  if (allVisited()) {
    // unlock
    btn.disabled = false;
    btn.style.opacity   = '1';
    btn.style.cursor    = 'pointer';
    btn.style.filter    = 'none';
    btn.title = '';
    if (notice) notice.classList.add('hidden');
  } else {
    // lock
    const remaining = currentExam.questions.length - visitedQuestions.size;
    btn.disabled = true;
    btn.style.opacity   = '0.45';
    btn.style.cursor    = 'not-allowed';
    btn.style.filter    = 'grayscale(40%)';
    btn.title = `Pehle sare ${remaining} question(s) visit karo`;
    if (notice) {
      notice.classList.remove('hidden');
      notice.textContent = `🔒 Submit unlock hoga jab sare questions visit ho jayenge — ${remaining} remaining`;
    }
  }
}

function confirmSubmit() {
  // extra safety guard — should not reach here if disabled
  if (!allVisited()) {
    const rem = currentExam.questions.length - visitedQuestions.size;
    toast(`Pehle baaki ${rem} question(s) dekho, phir submit karo!`, 'error');
    return;
  }
  const total     = currentExam.questions.length;
  const answered  = Object.keys(answers).length;
  const unanswered= total - answered;
  document.getElementById('submitModalMsg').textContent =
    `Aapne ${answered} out of ${total} questions answer kiye hain. ` +
    (unanswered > 0 ? `${unanswered} question(s) unanswered hain.` : 'Sare questions answer ho gaye!') +
    ` Ab submit karein?`;
  document.getElementById('submitModal').classList.remove('hidden');
}

async function submitExam() {
  closeModal('submitModal');
  clearInterval(timerInterval);
  try {
    // Grading server par hoti hai — browser sirf answers bhejta hai
    const { attempt, exam } = await api('POST', '/attempts', {
      examId: currentExam.id,
      answers: { ...answers },
      timeTaken: currentExam.duration * 60 - timeLeft
    });
    Proctor.end();              // tracking band
    toast(attempt.passed ? '🎉 Congratulations! You Passed!' : '📚 Exam Submitted. Keep Practicing!', attempt.passed ? 'success' : 'info');
    showResult(attempt, exam);
  } catch (e) {
    toast('Submit nahi ho paaya: ' + e.message, 'error');
    document.getElementById('submitModal').classList.remove('hidden');   // dobara try karne do
  }
}

function showResult(attempt, exam) {
  const { correct, wrong, skipped, total, percentage, passed } = attempt;
  let grade, gradeLabel;
  if (percentage >= 90) { grade = 'A+'; gradeLabel = '🌟 Outstanding!'; }
  else if (percentage >= 80) { grade = 'A'; gradeLabel = '🏆 Excellent!'; }
  else if (percentage >= 70) { grade = 'B'; gradeLabel = '👍 Good Job!'; }
  else if (percentage >= 60) { grade = 'C'; gradeLabel = '✅ Passed'; }
  else if (percentage >= 50) { grade = 'D'; gradeLabel = '📚 Below Average'; }
  else { grade = 'F'; gradeLabel = '❌ Failed'; }
  document.getElementById('rPercent').textContent = percentage + '%';
  document.getElementById('rGrade').textContent = grade;
  document.getElementById('rGradeLabel').textContent = gradeLabel;
  document.getElementById('rExamName').textContent = exam.title + ' • ' + exam.subject;
  document.getElementById('rCorrect').textContent = correct;
  document.getElementById('rWrong').textContent = wrong;
  document.getElementById('rSkipped').textContent = skipped;
  const reviewEl = document.getElementById('reviewSection');
  reviewEl.innerHTML = '<div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid var(--border);"><strong style="color:var(--primary);">Detailed Review</strong></div>';
  exam.questions.forEach((q, i) => {
    const userAns = attempt.answers[i];
    const isCorrect = userAns === q.correct;
    const isSkipped = userAns === undefined;
    const div = document.createElement('div');
    div.className = 'review-q';
    div.innerHTML = `<div class="q-text">Q${i+1}. ${q.text}</div>
      ${q.image ? `<div class="q-image"><img src="${q.image}" alt="Question diagram" onclick="zoomQImage(this.src)"></div>` : ''}
      ${!isSkipped ? `<div class="review-answer ${isCorrect?'correct':'wrong'}">
        ${isCorrect ? '✅' : '❌'} Your answer: <strong>${q.options[userAns]}</strong>
      </div>` : '<div class="review-answer" style="color:var(--warning);">⏭️ Skipped</div>'}
      ${!isCorrect ? `<div class="review-answer correct">✅ Correct answer: <strong>${q.options[q.correct]}</strong></div>` : ''}`;
    reviewEl.appendChild(div);
  });
  showPage('result');
}

async function viewAttemptResult(attemptId) {
  try {
    const { attempt, exam } = await api('GET', '/attempts/' + attemptId);
    showResult(attempt, exam);
  } catch (e) { toast(e.message, 'error'); }
}

// ===== MY RESULTS =====
async function loadMyResults() {
  if (!currentUser) return;
  const myAttempts = await getMyAttempts();
  const allExams = await getExams();
  const el = document.getElementById('myResultsTable');
  if (myAttempts.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><h3>No results yet</h3><p>Complete an exam to see your results here</p></div>';
    return;
  }
  const sorted = myAttempts.sort((a,b) => b.submittedAt - a.submittedAt);
  const rows = sorted.map(a => {
    const exam = allExams.find(e => e.id === a.examId) || { title: 'Deleted Exam', subject: '-' };
    const mins = Math.floor(a.timeTaken / 60);
    const secs = a.timeTaken % 60;
    return `<tr>
      <td><strong>${exam.title}</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">${exam.subject}</span></td>
      <td>${a.correct}/${a.total}</td>
      <td><strong>${a.percentage}%</strong></td>
      <td><span class="badge ${a.passed?'badge-success':'badge-danger'}">${a.passed?'✅ Passed':'❌ Failed'}</span></td>
      <td>${mins}m ${secs}s</td>
      <td>${new Date(a.submittedAt).toLocaleDateString()}</td>
      <td><button class="btn btn-sm btn-blue" onclick="viewAttemptResult(${a.id})">Review</button></td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table><thead><tr><th>Exam</th><th>Score</th><th>Percentage</th><th>Status</th><th>Time Taken</th><th>Date</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ===== PROFILE =====
function loadProfile() {
  if (!currentUser) return;
  document.getElementById('profAvatar').textContent = currentUser.firstName[0] + currentUser.lastName[0];
  document.getElementById('profName').textContent = currentUser.firstName + ' ' + currentUser.lastName;
  document.getElementById('profEmail').textContent = currentUser.email;
  document.getElementById('profCourse').textContent = currentUser.course;
  document.getElementById('editFirst').value = currentUser.firstName;
  document.getElementById('editLast').value = currentUser.lastName;
  document.getElementById('editRoll').value = currentUser.rollNumber;
  document.getElementById('editCourse').value = currentUser.course;
  const ep = document.getElementById('editPhone'); if (ep) ep.value = currentUser.phone || '';
}

async function saveProfile() {
  const first = document.getElementById('editFirst').value.trim();
  const last = document.getElementById('editLast').value.trim();
  const pass = document.getElementById('editPass').value;
  const phone = (document.getElementById('editPhone').value || '').replace(/\D/g, '');
  if (phone && !/^[6-9]\d{9}$/.test(phone)) { toast('Please enter a valid 10-digit mobile number.', 'error'); return; }
  if (!first || !last) { toast('Name fields cannot be empty.', 'error'); return; }
  if (pass && pass.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
  try {
    const { user } = await api('PUT', '/auth/profile', { firstName: first, lastName: last, password: pass || undefined, phone: phone || undefined });
    currentUser = user;
  } catch (e) { toast(e.message, 'error'); return; }
  loadProfile();
  toast('Profile updated successfully! ✅', 'success');
}

// ===== EXAM PASSWORD (student side) =====
function openUnlockModal() {
  const inp = document.getElementById('examUnlockInput');
  inp.value = '';
  document.getElementById('examUnlockAlert').className = 'hidden';
  document.getElementById('examUnlockModal').classList.remove('hidden');
  setTimeout(() => inp.focus(), 50);
}
async function submitExamUnlock() {
  const pw = document.getElementById('examUnlockInput').value.trim();
  if (!pw) { showAlert('examUnlockAlert', 'Please enter the exam password.', 'error'); return; }
  try {
    const { user } = await api('POST', '/auth/exam-unlock', { password: pw });
    currentUser = user;
    closeModal('examUnlockModal');
    toast('✅ Exams unlock ho gaye! Ab aap exam de sakte ho.', 'success');
    const lb = document.getElementById('examLockBanner'); if (lb) lb.classList.add('hidden');
    if (typeof refreshStudentDash === 'function') refreshStudentDash();
  } catch (e) { showAlert('examUnlockAlert', e.message || 'Could not unlock. Try again.', 'error'); }
}

// ===== EXAM PASSWORD (admin side) =====
let lastExamPw = '';
async function adminGenExamPw(uid, name) {
  if (!confirm('Generate a new exam password for ' + name + '?')) return;
  try {
    const r = await api('POST', '/users/' + uid + '/exam-password');
    lastExamPw = r.password;
    document.getElementById('examPwShowFor').textContent = 'Student: ' + name + ' (' + r.student.email + ')';
    document.getElementById('examPwShowValue').textContent = r.password;
    document.getElementById('examPwShowModal').classList.remove('hidden');
    allStudentsCache = []; showAdminTab('manageStudents');
  } catch (e) { toast(e.message, 'error'); }
}
async function adminRevokeExamAccess(uid, name) {
  if (!confirm('Revoke exam access for ' + name + '?')) return;
  try { await api('DELETE', '/users/' + uid + '/exam-access'); toast('Access revoked.', 'info'); allStudentsCache = []; showAdminTab('manageStudents'); }
  catch (e) { toast(e.message, 'error'); }
}
function copyExamPw() {
  if (navigator.clipboard) navigator.clipboard.writeText(lastExamPw).then(() => toast('Password copied 📋', 'success'));
}

// ===== ADMIN PANEL =====
function showAdminTab(tab) {
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  const sideMap = { overview: 'sideOverview', manageExams: 'sideExams', createExam: 'sideCreateExam', manageStudents: 'sideStudents', manageResults: 'sideResults', liveMonitor: 'sideMonitor' };
  if (sideMap[tab]) { const el = document.getElementById(sideMap[tab]); if (el) el.classList.add('active'); }
  showPage('adminPanel');
  const content = document.getElementById('adminContent');
  if (tab === 'overview') renderAdminOverview();
  else if (tab === 'manageExams') renderManageExams();
  else if (tab === 'createExam') renderCreateExam();
  else if (tab === 'manageStudents') renderManageStudents();
  else if (tab === 'manageResults') renderAdminResults();
  else if (tab === 'liveMonitor') Monitor.renderTab();
  Monitor.start();      // admin ke liye live alerts chalu
}

async function renderAdminOverview() {
  const users = (await getStudents()).filter(u => u.role !== 'admin');
  const exams = await getExams();
  const attempts = await getAllAttempts();
  const passed = attempts.filter(a => a.passed);
  const content = document.getElementById('adminContent');
  content.innerHTML = `
    <div class="admin-content-header"><h2>📊 Dashboard Overview</h2><span class="text-muted">Welcome, ${currentUser.firstName}!</span></div>
    <div class="dash-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px;">
      <div class="dash-card blue"><div class="dash-card-value">${users.length}</div><div class="dash-card-label">👥 Total Students</div></div>
      <div class="dash-card cyan"><div class="dash-card-value">${exams.length}</div><div class="dash-card-label">📝 Total Exams</div></div>
      <div class="dash-card green"><div class="dash-card-value">${attempts.length}</div><div class="dash-card-label">📋 Total Attempts</div></div>
      <div class="dash-card orange"><div class="dash-card-value">${attempts.length ? Math.round(passed.length/attempts.length*100)+'%' : '0%'}</div><div class="dash-card-label">🏆 Pass Rate</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="table-card">
        <div class="table-head"><h3>📝 Recent Exams</h3><button class="btn btn-sm btn-blue" onclick="showAdminTab('manageExams')">View All</button></div>
        <table><thead><tr><th>Title</th><th>Subject</th><th>Questions</th><th>Status</th></tr></thead><tbody>
          ${exams.slice(-5).reverse().map(e => `<tr>
            <td><strong>${e.title}</strong></td>
            <td>${e.subject}</td>
            <td>${e.questions.length}</td>
            <td><span class="badge ${e.status==='active'?'badge-success':'badge-warning'}">${e.status}</span></td>
          </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No exams yet</td></tr>'}
        </tbody></table>
      </div>
      <div class="table-card">
        <div class="table-head"><h3>👥 Recent Students</h3><button class="btn btn-sm btn-blue" onclick="showAdminTab('manageStudents')">View All</button></div>
        <table><thead><tr><th>Name</th><th>Roll No</th><th>Attempts</th></tr></thead><tbody>
          ${users.slice(-5).reverse().map(u => {
            const uAttempts = attempts.filter(a => a.userId === u.id).length;
            return `<tr><td><strong>${u.firstName} ${u.lastName}</strong></td><td><span class="chip">${u.rollNumber}</span></td><td>${uAttempts}</td></tr>`;
          }).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">No students yet</td></tr>'}
        </tbody></table>
      </div>
    </div>`;
}

async function renderManageExams() {
  const exams = await getExams();
  const attempts = await getAllAttempts();
  const content = document.getElementById('adminContent');
  content.innerHTML = `
    <div class="admin-content-header">
      <h2>📝 Manage Exams</h2>
      <button class="btn btn-blue btn-sm" onclick="showAdminTab('createExam')">➕ Create New Exam</button>
    </div>
    <div class="table-card">
      <table><thead><tr><th>Title</th><th>Subject</th><th>Questions</th><th>Duration</th><th>Attempts</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${exams.map(e => {
        const att = attempts.filter(a => a.examId === e.id).length;
        return `<tr>
          <td><strong>${e.title}</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">${e.description?.substring(0,50)}...</span></td>
          <td><span class="chip">${e.subject}</span></td>
          <td>${e.questions.length}</td>
          <td>⏱️ ${e.duration} min</td>
          <td>${att}</td>
          <td><span class="badge ${e.status==='active'?'badge-success':'badge-warning'}">${e.status}</span></td>
          <td>
            <button class="btn btn-sm" onclick="toggleExamStatus(${e.id})" style="background:white;border:1.5px solid var(--border);">
              ${e.status==='active'?'⏸️ Pause':'▶️ Activate'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="openDeleteExam(${e.id})" style="margin-left:4px;">🗑️</button>
          </td>
        </tr>`;
      }).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No exams created yet</td></tr>'}</tbody></table>
    </div>`;
}

let deleteExamId = null;
function openDeleteExam(id) { deleteExamId = id; document.getElementById('deleteExamModal').classList.remove('hidden'); }
async function confirmDeleteExam() {
  closeModal('deleteExamModal');
  try { await api('DELETE', '/exams/' + deleteExamId); toast('Exam deleted.', 'info'); }
  catch (e) { toast(e.message, 'error'); }
  showAdminTab('manageExams');
}
async function toggleExamStatus(id) {
  try {
    const exam = await api('PATCH', '/exams/' + id + '/status');
    toast(`Exam ${exam.status === 'active' ? 'activated' : 'paused'}.`, 'success');
  } catch (e) { toast(e.message, 'error'); }
  showAdminTab('manageExams');
}

// ===== CREATE EXAM =====
let newExamQuestions = [];
function renderCreateExam() {
  newExamQuestions = [{ text: '', image: '', options: ['', '', '', ''], correct: 0 }];
  const content = document.getElementById('adminContent');
  content.innerHTML = `
    <div class="admin-content-header">
      <h2>➕ Create New Exam</h2>
      <button class="btn btn-sm" onclick="showAdminTab('manageExams')" style="background:white;border:1.5px solid var(--border);">← Back</button>
    </div>

    <!-- AI GENERATOR PANEL -->
    <div class="ai-gen-panel">
      <div class="ai-gen-header">
        <div class="ai-gen-icon">🤖</div>
        <div>
          <div class="ai-gen-title">AI Question Generator</div>
          <div class="ai-gen-sub">Topic likhiye — AI automatically MCQ questions generate karega</div>
        </div>
        <div class="ai-gen-badge">Powered by exampro</div>
      </div>
      <div class="ai-gen-body">
        <div class="ai-gen-row">
          <div class="ai-input-wrap">
            <span class="ai-input-icon">📚</span>
            <input class="ai-input" id="aiTopic" placeholder="Topic likhiye... e.g. Data Structures, SQL Joins, OS Scheduling, Python Basics" onkeydown="if(event.key==='Enter')runAIGen()">
          </div>
          <select class="ai-select" id="aiCount">
            <option value="5">5 Questions</option>
            <option value="10" selected>10 Questions</option>
            <option value="15">15 Questions</option>
            <option value="20">20 Questions</option>
          </select>
          <select class="ai-select" id="aiDifficulty">
            <option value="easy">🟢 Easy</option>
            <option value="medium" selected>🟡 Medium</option>
            <option value="hard">🔴 Hard</option>
          </select>
          <button class="ai-gen-btn" onclick="runAIGen()" id="aiGenBtn">
            <span id="aiGenBtnText">⚡ Generate</span>
          </button>
        </div>
        <!-- JSON Import row -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
          <button onclick="document.getElementById('jsonImportInput').click()" style="padding:9px 18px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.2);border-radius:10px;color:white;font-size:0.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.18)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
            📂 Import from JSON
          </button>
          <button onclick="window.open('pages/generate_questions.html','_blank')" style="padding:9px 18px;background:rgba(6,182,212,0.2);border:1.5px solid rgba(6,182,212,0.35);border-radius:10px;color:#22d3ee;font-size:0.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all 0.2s;" onmouseover="this.style.background='rgba(6,182,212,0.3)'" onmouseout="this.style.background='rgba(6,182,212,0.2)'">
            🛠️ Open Question Studio
          </button>
          <input type="file" id="jsonImportInput" accept=".json" style="display:none" onchange="importJSONExam(event)">
          <span style="font-size:0.76rem;color:rgba(255,255,255,0.45);">questions.json file import karke questions load karo</span>
        </div>
        <div class="ai-chips">
          <span class="ai-chip" onclick="quickTopic('Data Structures and Algorithms')">Data Structures</span>
          <span class="ai-chip" onclick="quickTopic('Database Management Systems SQL')">DBMS & SQL</span>
          <span class="ai-chip" onclick="quickTopic('Operating Systems Process Management')">Operating Systems</span>
          <span class="ai-chip" onclick="quickTopic('Python Programming Basics')">Python</span>
          <span class="ai-chip" onclick="quickTopic('Computer Networks TCP IP')">Networks</span>
          <span class="ai-chip" onclick="quickTopic('Object Oriented Programming Java')">OOP Java</span>
          <span class="ai-chip" onclick="quickTopic('Web Development HTML CSS JavaScript')">Web Dev</span>
          <span class="ai-chip" onclick="quickTopic('Software Engineering SDLC')">Software Engg</span>
        </div>
        <div id="aiStatus" class="hidden"></div>
      </div>
    </div>

    <div class="create-exam-form">
      <h3 style="font-size:1.05rem;font-weight:700;color:var(--primary);margin-bottom:18px;">📋 Exam Details</h3>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Exam Title *</label><input class="form-input" id="ceTitle" placeholder="e.g. Data Structures Midterm"></div>
        <div class="form-group"><label class="form-label">Subject *</label><input class="form-input" id="ceSubject" placeholder="e.g. Computer Science"></div>
      </div>
      <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="ceDesc" placeholder="Brief description of the exam..."></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Duration (minutes) *</label><input class="form-input" id="ceDuration" type="number" value="30" min="5" max="180"></div>
        <div class="form-group"><label class="form-label">Passing Score (%) *</label><input class="form-input" id="cePassing" type="number" value="60" min="0" max="100"></div>
      </div>
    </div>
    <div id="questionsContainer"></div>
    <div style="display:flex;gap:10px;margin-bottom:24px;">
      <button class="btn btn-sm" onclick="addQuestion()" style="background:white;border:1.5px dashed var(--border);color:var(--text-muted);">➕ Add Question</button>
      <button class="btn btn-blue btn-sm" onclick="saveExam()">💾 Save Exam</button>
    </div>`;
  renderQuestions();
}

function quickTopic(t) {
  document.getElementById('aiTopic').value = t;
  runAIGen();
}

async function runAIGen() {
  const topic = document.getElementById('aiTopic').value.trim();
  const count = document.getElementById('aiCount').value;
  const diff  = document.getElementById('aiDifficulty').value;
  if (!topic) { toast('Topic likhiye pehle!', 'error'); document.getElementById('aiTopic').focus(); return; }

  const btn = document.getElementById('aiGenBtn');
  const btnText = document.getElementById('aiGenBtnText');
  const statusEl = document.getElementById('aiStatus');
  btn.disabled = true;
  btnText.innerHTML = '<span class="ai-spinner"></span> Generating...';
  statusEl.className = 'ai-status-box';
  statusEl.innerHTML = '🤖 AI soch raha hai... <em>' + topic + '</em> ke liye ' + count + ' ' + diff + ' questions generate ho rahe hain...';

  const diffLabel = { easy:'simple and straightforward', medium:'moderate difficulty with some conceptual depth', hard:'challenging, requiring deep understanding' };
  const prompt = `Generate exactly ${count} multiple choice questions about "${topic}" for a computer science exam.
Difficulty level: ${diffLabel[diff]}.
Return ONLY valid JSON array, no markdown, no explanation, just raw JSON.
Format:
[
  {
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0
  }
]
Rules:
- "correct" is the 0-based index of the correct option
- Each question must have exactly 4 options
- Questions must be clear and educational
- No duplicate questions
- Make sure the correct answer index matches the correct option`;

  try {
    // API key server (.env) par rehti hai — browser se seedha Anthropic ko call nahi hota
    const data = await api('POST', '/ai/generate', { prompt });
    const raw = data.text.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Invalid response format');

    // merge into exam
    newExamQuestions = [...newExamQuestions.filter(q => q.text.trim()), ...questions];
    if (newExamQuestions.length === 0) newExamQuestions = questions;

    // auto-fill title & subject if empty
    const titleEl = document.getElementById('ceTitle');
    const subjEl  = document.getElementById('ceSubject');
    if (titleEl && !titleEl.value) titleEl.value = topic + ' — ' + diff.charAt(0).toUpperCase()+diff.slice(1) + ' Level Exam';
    if (subjEl  && !subjEl.value)  subjEl.value  = topic.split(' ')[0];

    renderQuestions();
    statusEl.className = 'ai-status-box success';
    statusEl.innerHTML = '✅ <strong>' + questions.length + ' questions generated</strong> for "' + topic + '" — Check karo aur zarurat ho to edit karo!';
    toast('🤖 AI ne ' + questions.length + ' questions generate kiye! 🎉', 'success');
    document.getElementById('questionsContainer').scrollIntoView({ behavior:'smooth', block:'start' });
  } catch(e) {
    console.error('AI Gen error:', e);
    statusEl.className = 'ai-status-box error';
    statusEl.innerHTML = '❌ Generation failed: ' + (e.message || 'Network error') + '. Check karo ki API connected hai.';
    toast('AI generation fail. Check console.', 'error');
  } finally {
    btn.disabled = false;
    btnText.innerHTML = '⚡ Generate';
  }
}

function renderQuestions() {
  const c = document.getElementById('questionsContainer');
  c.innerHTML = newExamQuestions.map((q, qi) => `
    <div class="question-card">
      <div class="q-num">${qi + 1}</div>
      <div class="question-body">
        <div class="form-group">
          <label class="form-label">Question Text *</label>
          <input class="form-input" value="${q.text}" oninput="newExamQuestions[${qi}].text=this.value" placeholder="Enter your question here...">
        </div>
        <div class="form-group">
          <label class="form-label">Diagram / Image (optional)</label>
          ${q.image ? `<div class="q-image"><img src="${q.image}" alt="preview"></div>
            <button class="btn btn-sm btn-danger" onclick="removeQImage(${qi})">🗑️ Remove image</button>`
          : `<label class="q-img-drop" tabindex="0" data-qi="${qi}">
              📷 Image choose karo, ya screenshot copy karke yahan click karke <b>Ctrl+V</b> dabao
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" onchange="onQImageFile(${qi}, this.files[0])">
            </label>`}
        </div>
        <label class="form-label" style="margin-bottom:8px;">Options (select correct answer with radio button) *</label>
        ${q.options.map((o, oi) => `
          <div class="option-row">
            <input type="radio" name="correct_${qi}" ${q.correct === oi ? 'checked' : ''} onchange="newExamQuestions[${qi}].correct=${oi}">
            <input type="text" value="${o}" oninput="newExamQuestions[${qi}].options[${oi}]=this.value" placeholder="Option ${String.fromCharCode(65+oi)}..." class="form-input" style="flex:1;">
            ${oi > 1 ? `<button onclick="removeOption(${qi},${oi})" style="background:transparent;border:none;color:var(--danger);cursor:pointer;font-size:1.1rem;">×</button>` : ''}
          </div>`).join('')}
        ${q.options.length < 6 ? `<button class="add-option-btn" onclick="addOption(${qi})">+ Add Option</button>` : ''}
        ${newExamQuestions.length > 1 ? `<button class="btn btn-sm btn-danger" onclick="removeQuestion(${qi})" style="margin-top:12px;">🗑️ Remove Question</button>` : ''}
      </div>
    </div>`).join('');
}

// ===== Question diagram/image =====
const Q_IMG_MAX_W = 1000;   // itni chaudai tak chhota karke save (page halka rahe)
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return reject(new Error('Sirf PNG, JPG, WEBP ya GIF image chalegi.'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Image read nahi ho paayi.'));
    fr.onload = () => {
      if (file.type === 'image/gif') return resolve(fr.result);       // GIF as-is
      const img = new Image();
      img.onerror = () => reject(new Error('Image kharab hai.'));
      img.onload = () => {
        const scale = Math.min(1, Q_IMG_MAX_W / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);  // transparent PNG ko white background
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function onQImageFile(qi, file) {
  if (!file) return;
  try {
    const url = await fileToDataUrl(file);
    if (url.length > 2.8 * 1024 * 1024) { toast('Image bahut badi hai (max ~2 MB). Chhoti image lo.', 'error'); return; }
    newExamQuestions[qi].image = url;
    renderQuestions();
  } catch (e) { toast(e.message, 'error'); }
}
function removeQImage(qi) { newExamQuestions[qi].image = ''; renderQuestions(); }
// Ctrl+V se screenshot paste: jis question ka drop-box focus mein ho usme lagega
document.addEventListener('paste', (ev) => {
  const box = document.activeElement && document.activeElement.closest && document.activeElement.closest('.q-img-drop');
  if (!box) return;
  const item = [...(ev.clipboardData ? ev.clipboardData.items : [])].find(i => i.type.startsWith('image/'));
  if (item) { ev.preventDefault(); onQImageFile(Number(box.dataset.qi), item.getAsFile()); }
});
function zoomQImage(src) {
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;';
  o.onclick = () => o.remove();
  const im = document.createElement('img'); im.src = src; im.style.cssText = 'max-width:100%;max-height:100%;background:#fff;border-radius:8px;';
  o.appendChild(im); document.body.appendChild(o);
}

function addQuestion() {
  newExamQuestions.push({ text: '', image: '', options: ['', '', '', ''], correct: 0 });
  renderQuestions();
}
function removeQuestion(i) { newExamQuestions.splice(i, 1); renderQuestions(); }
function addOption(qi) { newExamQuestions[qi].options.push(''); renderQuestions(); }
function removeOption(qi, oi) { newExamQuestions[qi].options.splice(oi, 1); if (newExamQuestions[qi].correct >= oi) newExamQuestions[qi].correct = Math.max(0, newExamQuestions[qi].correct - 1); renderQuestions(); }

async function saveExam() {
  const title = document.getElementById('ceTitle').value.trim();
  const subject = document.getElementById('ceSubject').value.trim();
  const desc = document.getElementById('ceDesc').value.trim();
  const duration = parseInt(document.getElementById('ceDuration').value);
  const passing = parseInt(document.getElementById('cePassing').value);
  if (!title || !subject) { toast('Exam title and subject are required.', 'error'); return; }
  if (isNaN(duration) || duration < 5) { toast('Duration must be at least 5 minutes.', 'error'); return; }
  for (let i = 0; i < newExamQuestions.length; i++) {
    const q = newExamQuestions[i];
    if (!q.text.trim()) { toast(`Question ${i+1} text is empty.`, 'error'); return; }
    const filledOpts = q.options.filter(o => o.trim());
    if (filledOpts.length < 2) { toast(`Question ${i+1} needs at least 2 options.`, 'error'); return; }
  }
  const exam = { title, subject, description: desc, duration, passingScore: passing, totalMarks: newExamQuestions.length, questions: newExamQuestions, status: 'active', createdAt: Date.now() };
  try { await api('POST', '/exams', exam); }
  catch (e) { toast(e.message, 'error'); return; }
  toast('Exam "' + title + '" created successfully! 🎉', 'success');
  showAdminTab('manageExams');
}

async function renderManageStudents() {
  const users = (await getStudents()).filter(u => u.role !== 'admin');
  const attempts = await getAllAttempts();
  const content = document.getElementById('adminContent');
  content.innerHTML = `
    <div class="admin-content-header"><h2>👥 Students</h2><span class="text-muted">${users.length} registered students</span></div>
    <div class="table-card" style="padding:18px 20px;margin-bottom:16px;">
      <h3 style="margin-bottom:6px;">🔑 Student Access Password</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;">Yeh password sabhi students ko do. Register karne ke baad student jab tak yeh password na daale, exam nahi de sakta.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="search-input" id="accessPwInput" style="max-width:260px;" placeholder="Access password">
        <button class="btn btn-blue btn-sm" onclick="saveAccessPassword()">💾 Save Password</button>
        <label style="font-size:0.82rem;display:flex;gap:6px;align-items:center;"><input type="checkbox" id="accessRelock"> Sabhi students ko dobara lock karo</label>
      </div>
    </div>
    <div class="search-bar" style="margin-bottom:16px;">
      <input class="search-input" id="studentSearch" placeholder="🔍 Search by name or roll number..." oninput="filterStudents()">
    </div>
    <div class="table-card" id="studentsTableWrap">
<table><thead><tr><th>Student</th><th>Roll No</th><th>Course</th><th>Mobile</th><th>Attempts</th><th>Avg Score</th><th>Exam Access</th><th>Registered</th></tr></thead>
      <tbody id="studentsTableBody">${renderStudentRows(users, attempts)}</tbody></table>
    </div>`;
  allStudentsCache = []; allAttemptsCache = [];
  try { document.getElementById('accessPwInput').value = (await api('GET', '/settings/access-password')).password || ''; } catch (e) {}
}

async function saveAccessPassword() {
  const password = document.getElementById('accessPwInput').value.trim();
  const relock = document.getElementById('accessRelock').checked;
  try {
    const r = await api('PUT', '/settings/access-password', { password, relock });
    toast('Access password save ho gaya ✅' + (r.relocked ? ' (' + r.relocked + ' students lock hue)' : ''), 'success');
    if (relock) renderManageStudents();
  } catch (e) { toast(e.message || 'Save nahi hua', 'error'); }
}

async function toggleStudentAccess(id, granted) {
  try { await api('PATCH', '/users/' + id + '/access', { granted }); renderManageStudents(); }
  catch (e) { toast(e.message || 'Update nahi hua', 'error'); }
}

function renderStudentRows(users, attempts) {
  if (users.length === 0) return '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No students registered yet</td></tr>';
  if (users.length === 0) return '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No students registered yet</td></tr>';
  return users.map(u => {
    const uAttempts = attempts.filter(a => a.userId === u.id);
    const avg = uAttempts.length ? Math.round(uAttempts.reduce((s,a)=>s+a.percentage,0)/uAttempts.length) : 0;
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px;">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">${u.firstName[0]}${u.lastName[0]}</div>
        <div><strong>${u.firstName} ${u.lastName}</strong><br><span style="font-size:0.75rem;color:var(--text-muted);">${u.email}</span></div>
      </div></td>
      <td><span class="chip">${u.rollNumber}</span></td>
      <td style="font-size:0.82rem;">${u.course}</td>
      <td style="font-size:0.82rem;">${u.phone || '—'}</td>
      <td>${uAttempts.length}</td>
      <td><strong style="color:${avg>=60?'var(--success)':'var(--danger)'};">${avg}%</strong></td>
      <td>${u.examUnlocked
          ? `<span class="badge badge-success">✅ Unlocked</span><br><button class="btn btn-sm" style="margin-top:6px;background:white;border:1.5px solid var(--border);" onclick="adminRevokeExamAccess(${u.id}, '${(u.firstName+' '+u.lastName).replace(/'/g,'')}')">Revoke</button>`
          : `<span class="badge badge-danger">🔒 ${u.examPasswordIssued ? 'Password issued' : 'Locked'}</span><br><button class="btn btn-blue btn-sm" style="margin-top:6px;" onclick="adminGenExamPw(${u.id}, '${(u.firstName+' '+u.lastName).replace(/'/g,'')}')">🔑 ${u.examPasswordIssued ? 'New Password' : 'Give Password'}</button>`}</td>
      <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      <td>${u.accessGranted
        ? `<span style="color:var(--success);font-weight:700;">✅ Unlocked</span> <button class="btn btn-sm" style="margin-left:6px;" onclick="toggleStudentAccess(${u.id}, false)">Lock</button>`
        : `<span style="color:var(--danger);font-weight:700;">🔒 Locked</span> <button class="btn btn-blue btn-sm" style="margin-left:6px;" onclick="toggleStudentAccess(${u.id}, true)">Unlock</button>`}</td>
    </tr>`;
  }).join('');
}

let allStudentsCache = [], allAttemptsCache = [];
async function filterStudents() {
  if (!allStudentsCache.length) {
    allStudentsCache = (await getStudents()).filter(u => u.role !== 'admin');
    allAttemptsCache = await getAllAttempts();
  }
  const q = document.getElementById('studentSearch').value.toLowerCase();
  const filtered = allStudentsCache.filter(u =>
    (u.firstName+' '+u.lastName).toLowerCase().includes(q) ||
    u.rollNumber.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
  document.getElementById('studentsTableBody').innerHTML = renderStudentRows(filtered, allAttemptsCache);
}

// ===== FEATURE INFO MODAL =====
const featureData = {
  timer: {
    icon: '⏱️', bg: '#e8eaf6',
    title: 'Timed Examinations',
    subtitle: 'Control exam duration with precision',
    points: [
      { icon: '🕐', head: 'Custom Time Limits', body: 'Admin can set any duration from 5 to 180 minutes per exam — complete flexibility for short quizzes or long final exams.' },
      { icon: '🟡', head: 'Live Countdown Timer', body: 'Students see a real-time countdown timer in the exam panel. Timer turns yellow when less than 5 minutes remain, and red with a pulse animation when under 1 minute.' },
      { icon: '⚡', head: 'Auto-Submit on Time Up', body: 'When the timer reaches zero, the exam is automatically submitted — no extra action needed from the student. All answered questions are saved.' },
      { icon: '📊', head: 'Time Tracking in Results', body: 'Time taken to complete the exam is recorded and shown in the result history, helping analyze exam performance patterns.' },
    ]
  },
  grading: {
    icon: '🤖', bg: '#e0f7fa',
    title: 'Auto-Grading System',
    subtitle: 'Instant, accurate, zero effort grading',
    points: [
      { icon: '✅', head: 'Instant Score Calculation', body: 'As soon as the exam is submitted, the system automatically checks each answer against the correct answer and calculates the total score in milliseconds.' },
      { icon: '🏅', head: 'Grade Assignment (A+ to F)', body: 'Grades are assigned automatically — A+ (90%+), A (80%+), B (70%+), C (60%+), D (50%+), F (below 50%). No manual grading needed.' },
      { icon: '🔍', head: 'Detailed Answer Review', body: 'Students see a full review after submission — each question shows their answer, whether it was right or wrong, and the correct answer highlighted in green.' },
      { icon: '📁', head: 'Permanent Record Keeping', body: 'All results are permanently saved in the MongoDB database. Students can access their complete attempt history anytime, from any device.' },
    ]
  },
  analytics: {
    icon: '📊', bg: '#e8f5e9',
    title: 'Analytics Dashboard',
    subtitle: 'Data-driven insights for administrators',
    points: [
      { icon: '📈', head: 'Overview Statistics', body: 'Admin dashboard shows total students, total exams, total attempts, and overall pass rate — all updated in real-time as data changes.' },
      { icon: '👥', head: 'Per-Student Performance', body: 'View each student\'s exam attempts, average score, and pass/fail status. Quickly identify students who need extra support.' },
      { icon: '📝', head: 'Exam-wise Analytics', body: 'See how many students attempted each exam, their average scores, and attempt counts — useful for assessing exam difficulty.' },
      { icon: '🏆', head: 'Results Management', body: 'Admin can view all student results in a single table — filtered by exam, student, date, or status — with complete attempt details.' },
    ]
  },
  security: {
    icon: '🔒', bg: '#fff8e1',
    title: 'Secure & Reliable System',
    subtitle: 'Safe, role-based, locally-stored data',
    points: [
      { icon: '👤', head: 'Role-Based Access Control', body: 'Two distinct roles — Admin and Student. Admin can create/manage exams and view all results. Students can only view and attempt exams they are eligible for.' },
      { icon: '🔐', head: 'Password-Protected Accounts', body: 'Every user account is protected with a password. Passwords are stored as bcrypt hashes in MongoDB (never as plain text). Login validation is strict with clear error messages.' },
      { icon: '💾', head: 'MongoDB Database Storage', body: 'All data (users, exams, attempts, results, notices) is stored in MongoDB through a Node.js + Express API, so it is available from any device.' },
      { icon: '🛡️', head: 'Session Management', body: 'Login sessions use secure JWT tokens. Users stay logged in even after closing the browser tab, with a clean logout option.' },
    ]
  },
  responsive: {
    icon: '📱', bg: '#fce4ec',
    title: 'Responsive Design',
    subtitle: 'Works perfectly on every screen size',
    points: [
      { icon: '🖥️', head: 'Desktop Optimized', body: 'Full-width multi-column layouts on desktop — admin panel with sidebar, 3-column exam grids, and wide dashboard cards for comfortable management.' },
      { icon: '📱', head: 'Mobile Friendly', body: 'All grids collapse to single-column on mobile screens. Buttons and inputs are touch-friendly with appropriate sizing for phone users.' },
      { icon: '🎨', head: 'Modern UI Design', body: 'Clean card-based interface with smooth hover effects, color-coded badges, progress bars, and consistent spacing — designed for a professional look.' },
      { icon: '⚙️', head: 'No Installation Required', body: 'This is a single HTML file — no server, no framework, no installation needed. Just open in any modern browser (Chrome, Firefox, Edge) and it works instantly.' },
    ]
  },
  questions: {
    icon: '🗂️', bg: '#f3e5f5',
    title: 'Question Management',
    subtitle: 'Create and organize exam questions easily',
    points: [
      { icon: '➕', head: 'Dynamic Question Builder', body: 'Admin can add unlimited questions to any exam using the dynamic question builder. Each question can have 2 to 6 answer options.' },
      { icon: '✔️', head: 'Correct Answer Selector', body: 'For each question, admin selects the correct answer using a radio button next to the option — simple, visual, and error-proof.' },
      { icon: '🧭', head: 'Question Navigator', body: 'During the exam, students get a grid navigator showing all question numbers. Answered questions turn blue, flagged turn orange — easy to track progress.' },
      { icon: '🚩', head: 'Flag & Review System', body: 'Students can flag any question for later review without losing their answer. Flagged questions appear highlighted in the navigator panel.' },
    ]
  },
};

function openFeatureModal(key) {
  const d = featureData[key];
  if (!d) return;
  document.getElementById('fmIcon').style.background = d.bg;
  document.getElementById('fmIcon').textContent = d.icon;
  document.getElementById('fmTitle').textContent = d.title;
  document.getElementById('fmSubtitle').textContent = d.subtitle;
  document.getElementById('fmBody').innerHTML = d.points.map(p => `
    <div style="display:flex;gap:14px;margin-bottom:18px;align-items:flex-start;">
      <div style="width:40px;height:40px;border-radius:10px;background:${d.bg};display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${p.icon}</div>
      <div>
        <div style="font-size:0.92rem;font-weight:700;color:var(--primary);margin-bottom:4px;">${p.head}</div>
        <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.65;">${p.body}</div>
      </div>
    </div>`).join('');
  document.getElementById('featureModal').classList.add('open');
}
function closeFeatureModal(e) {
  if (e.target === document.getElementById('featureModal')) document.getElementById('featureModal').classList.remove('open');
}

// ===== AUTH PAGE HELPERS =====
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
}

function checkPwStrength(val) {
  const bars = ['pb1','pb2','pb3','pb4'];
  const labelEl = document.getElementById('pwLabel');
  bars.forEach(b => { const el=document.getElementById(b); if(el){el.className='pw-bar';} });
  if (!val) { if(labelEl) labelEl.textContent=''; return; }
  let score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val) || /[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const cls = score <= 1 ? 'weak' : score === 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
  const lbl = score <= 1 ? '🔴 Too weak' : score === 2 ? '🟠 Fair' : score === 3 ? '🟡 Good' : '🟢 Strong';
  for (let i = 0; i < score; i++) { const el=document.getElementById(bars[i]); if(el) el.classList.add(cls); }
  if(labelEl) labelEl.textContent = lbl;
}

// Override showAlert to use new afb-alert style
function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'afb-alert ' + (type === 'error' ? 'err' : 'ok');
  el.innerHTML = (type === 'error' ? '⚠️ ' : '✅ ') + msg;
}

// Show admin hint when admin tab selected
const _origSetLoginRole = window.setLoginRole;
function setLoginRole(r) {
  loginRole = r;
  document.getElementById('tabStudent').classList.toggle('active', r === 'student');
  document.getElementById('tabAdmin').classList.toggle('active', r === 'admin');
  const hint = document.getElementById('adminHint');
  if (hint) hint.classList.toggle('hidden', r !== 'admin');
}

// re-trigger card animation when switching pages
function triggerFormAnim() {
  const box = document.querySelector('#page-login .auth-form-box, #page-register .auth-form-box');
  if (box) { box.style.animation='none'; requestAnimationFrame(()=>{ box.style.animation=''; }); }
}

// ── JSON Import into Create Exam ─────────────────────────────
function importJSONExam(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      let qs = [], meta = {};

      // Support flat array, {questions:[]}, or ExamPro {exams:[]} format
      if (Array.isArray(obj)) {
        qs = obj;
      } else if (obj.questions) {
        qs   = obj.questions;
        meta = obj;
      } else if (obj.exams && obj.exams[0]) {
        qs   = obj.exams[0].questions || [];
        meta = obj.exams[0];
      }

      if (!qs.length) throw new Error('JSON mein koi questions nahi mile');

      // Validate
      const valid = qs.filter(q =>
        q.text && Array.isArray(q.options) && q.options.length >= 2 &&
        typeof q.correct === 'number' && q.correct < q.options.length
      );
      if (!valid.length) throw new Error('Valid questions nahi mile — format check karo');

      // Merge with existing
      newExamQuestions = [...newExamQuestions.filter(q => q.text.trim()), ...valid];

      // Auto-fill meta fields if empty
      const titleEl   = document.getElementById('ceTitle');
      const subjectEl = document.getElementById('ceSubject');
      const descEl    = document.getElementById('ceDesc');
      const durEl     = document.getElementById('ceDuration');
      const passEl    = document.getElementById('cePassing');
      if (titleEl   && !titleEl.value   && meta.title)        titleEl.value        = meta.title;
      if (subjectEl && !subjectEl.value && meta.subject)      subjectEl.value      = meta.subject;
      if (descEl    && !descEl.value    && meta.description)  descEl.value         = meta.description;
      if (durEl     && meta.duration)                         durEl.value          = meta.duration;
      if (passEl    && meta.passingScore)                     passEl.value         = meta.passingScore;

      renderQuestions();
      const statusEl = document.getElementById('aiStatus');
      statusEl.className = 'ai-status-box success';
      statusEl.textContent = `✅ ${valid.length} questions JSON se import ho gaye! Total: ${newExamQuestions.length}`;
      toast(`📂 ${valid.length} questions import ho gaye!`, 'success');
    } catch(err) {
      toast('JSON import error: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
async function renderAllResults(){
  const attempts = await getAllAttempts();
  const allExams = await getExams();
  const allUsers = await getStudents();
  const content = document.getElementById('adminContent');
  const sorted = attempts.sort((a,b) => b.submittedAt - a.submittedAt);
  content.innerHTML = `
    <div class="admin-content-header"><h2>📈 All Exam Results</h2><span class="text-muted">${attempts.length} total attempts</span></div>
    <div class="dash-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px;">
      <div class="dash-card blue"><div class="dash-card-value">${attempts.length}</div><div class="dash-card-label">Total Attempts</div></div>
      <div class="dash-card green"><div class="dash-card-value">${attempts.filter(a=>a.passed).length}</div><div class="dash-card-label">Passed</div></div>
      <div class="dash-card orange"><div class="dash-card-value">${attempts.filter(a=>!a.passed).length}</div><div class="dash-card-label">Failed</div></div>
      <div class="dash-card cyan"><div class="dash-card-value">${attempts.length ? Math.round(attempts.reduce((s,a)=>s+a.percentage,0)/attempts.length)+'%' : '0%'}</div><div class="dash-card-label">Avg Score</div></div>
    </div>
    <div class="table-card">
      <table><thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Percentage</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${sorted.map(a => {
        const exam = allExams.find(e => e.id === a.examId) || { title: 'Deleted', subject: '-' };
        const user = allUsers.find(u => u.id === a.userId) || { firstName: 'Unknown', lastName: '', rollNumber: '-' };
        return `<tr>
          <td><strong>${user.firstName} ${user.lastName}</strong><br><span style="font-size:0.75rem;color:var(--text-muted);">${user.rollNumber}</span></td>
          <td>${exam.title}<br><span style="font-size:0.75rem;color:var(--text-muted);">${exam.subject}</span></td>
          <td>${a.correct}/${a.total}</td>
          <td><strong>${a.percentage}%</strong></td>
          <td><span class="badge ${a.passed?'badge-success':'badge-danger'}">${a.passed?'✅ Passed':'❌ Failed'}</span></td>
          <td>${new Date(a.submittedAt).toLocaleDateString()}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">No attempts yet</td></tr>'}</tbody></table>
    </div>`;
}

// ================================================================
// NAVBAR — add new links
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  // add extra nav buttons to guest nav
  const gNav = document.getElementById('guestNav');
  if (gNav) {
    const extraBtns = `
      <button class="nav-btn" onclick="showPage('about')">About</button>
      <button class="nav-btn" onclick="showPage('notices')">📋 Notices</button>
      <button class="nav-btn" onclick="showPage('leaderboard')">🏆 Ranks</button>
      <button class="nav-btn" onclick="showPage('contact')">Contact</button>`;
    gNav.insertAdjacentHTML('afterbegin', extraBtns);
  }
  const sNav = document.getElementById('studentNav');
  if (sNav) {
    sNav.insertAdjacentHTML('afterbegin',
      `<button class="nav-btn" onclick="showPage('leaderboard')">🏆</button>
       <button class="nav-btn" onclick="showPage('notices')">📋 Notices</button>`);
  }
  setTimeout(initScrollReveal, 100);
});

// also trigger reveal when new pages open
const _sp2 = showPage;
window.showPage = function(page) {
  _sp2(page);
  if (['about','contact','leaderboard','notices'].includes(page)) {
    setTimeout(initScrollReveal, 80);
  }
  if (page === 'about') loadAboutStats();
  if (page === 'leaderboard') loadLeaderboard();
  if (page === 'notices') loadNotices();
};

// ================================================================
// ABOUT — live stats
// ================================================================
async function loadAboutStats() {
  try {
    const st = await api('GET', '/public/stats');
    document.getElementById('abStudents').textContent = st.students;
    document.getElementById('abExams').textContent    = st.exams;
    document.getElementById('abAttempts').textContent = st.attempts;
  } catch(e){}
}

// ================================================================
// CONTACT FORM
// ================================================================
async function submitContact() {
  const name = document.getElementById('cfName').value.trim();
  const email= document.getElementById('cfEmail').value.trim();
  const subj = document.getElementById('cfSubject').value;
  const msg  = document.getElementById('cfMsg').value.trim();
  if (!name||!email||!subj||!msg) { toast('Please fill all required fields.','error'); return; }
  try { await api('POST', '/messages', { name, email, subj, msg }); }
  catch (e) { toast(e.message, 'error'); return; }
  document.getElementById('contactSuccess').classList.remove('hidden');
  document.getElementById('cfName').value='';
  document.getElementById('cfEmail').value='';
  document.getElementById('cfSubject').value='';
  document.getElementById('cfMsg').value='';
  toast('Message sent! ✅', 'success');
}

// ================================================================
// LEADERBOARD
// ================================================================
let lbFilterExam = 'all';
async function loadLeaderboard() {
  const { users, exams, attempts } = await api('GET', '/public/leaderboard');

  // filter buttons
  const filtersEl = document.getElementById('lbFilters');
  filtersEl.innerHTML = '<button class="lb-filter-btn active" onclick="filterLeaderboard(\'all\',this)">🌐 All Exams</button>' +
    exams.map(e=>`<button class="lb-filter-btn" onclick="filterLeaderboard(${e.id},this)">📝 ${e.title}</button>`).join('');

  renderLeaderboard(users, exams, attempts, lbFilterExam);
}

function filterLeaderboard(examId, btn) {
  lbFilterExam = examId;
  document.querySelectorAll('.lb-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  api('GET', '/public/leaderboard').then(({ users, exams, attempts }) => renderLeaderboard(users, exams, attempts, examId));
}

function renderLeaderboard(users, exams, attempts, filterExam) {
  let filtered = filterExam === 'all' ? attempts : attempts.filter(a=>a.examId == filterExam);

  // aggregate per user
  const map = {};
  filtered.forEach(a => {
    if (!map[a.userId]) map[a.userId] = { total:0, sum:0, passed:0, attempts:0 };
    map[a.userId].sum += a.percentage;
    map[a.userId].attempts++;
    if (a.passed) map[a.userId].passed++;
  });

  const ranked = Object.entries(map).map(([uid, d]) => {
    const user = users.find(u=>u.id==uid) || { firstName:'Unknown', lastName:'', rollNumber:'-', course:'-' };
    return { user, avg: Math.round(d.sum/d.attempts), passed: d.passed, attempts: d.attempts };
  }).sort((a,b)=>b.avg-a.avg);

  // PODIUM
  const podEl = document.getElementById('lbPodium');
  if (ranked.length === 0) {
    podEl.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:40px;font-size:0.9rem;">No attempts yet — be the first!</div>';
    document.getElementById('lbTable').innerHTML = '<div style="padding:32px;text-align:center;color:#9ca3af;font-size:0.9rem;">No data available</div>';
    return;
  }

  const top3 = ranked.slice(0,3);
  const bgColors = ['linear-gradient(135deg,#5b21b6,#7c3aed)','linear-gradient(135deg,#0c4a6e,#0e7490)','linear-gradient(135deg,#5b21b6,#7c3aed)'];

  const podHTML = (top3.length >= 2 ? `
    <div class="lb-pod lb-pod-2">
      ${ranked[1]?`<div class="lb-pod-avatar">${ranked[1].user.firstName[0]}</div>
      <div class="lb-pod-name">${ranked[1].user.firstName} ${ranked[1].user.lastName}</div>
      <div class="lb-pod-score">${ranked[1].avg}% avg</div>`:''}
    </div>` : '') +
    `<div class="lb-pod lb-pod-1">
      <div class="lb-crown">👑</div>
      <div class="lb-pod-avatar">${ranked[0].user.firstName[0]}</div>
      <div class="lb-pod-name">${ranked[0].user.firstName} ${ranked[0].user.lastName}</div>
      <div class="lb-pod-score">${ranked[0].avg}% avg</div>
    </div>` +
    (top3.length >= 3 ? `<div class="lb-pod lb-pod-3">
      ${ranked[2]?`<div class="lb-pod-avatar">${ranked[2].user.firstName[0]}</div>
      <div class="lb-pod-name">${ranked[2].user.firstName} ${ranked[2].user.lastName}</div>
      <div class="lb-pod-score">${ranked[2].avg}% avg</div>`:''}
    </div>` : '');
  podEl.innerHTML = podHTML;

  // TABLE
  const medals = ['🥇','🥈','🥉'];
  const rankClass = ['gold','silver','bronze'];
  const tableRows = ranked.map((r,i) => `
    <div class="lb-row">
      <div class="lb-rank ${i<3?rankClass[i]:'other'}">${i<3?medals[i]:i+1}</div>
      <div class="lb-avatar-sm" style="background:${bgColors[i%3]};">${r.user.firstName[0]}</div>
      <div class="lb-info">
        <strong>${r.user.firstName} ${r.user.lastName} ${i===0?'<span class="lb-badge-top">TOP</span>':''}</strong>
        <span>${r.user.rollNumber} · ${r.user.course.split(' - ')[0]}</span>
      </div>
      <div style="text-align:center;min-width:60px;">
        <strong style="font-size:0.88rem;color:#374151;">${r.attempts}</strong>
        <div style="font-size:0.72rem;color:#9ca3af;">attempts</div>
      </div>
      <div style="text-align:center;min-width:60px;">
        <strong style="font-size:0.88rem;color:#059669;">${r.passed}</strong>
        <div style="font-size:0.72rem;color:#9ca3af;">passed</div>
      </div>
      <div class="lb-score">
        <strong>${r.avg}%</strong>
        <span>avg score</span>
      </div>
    </div>`).join('');

  document.getElementById('lbTable').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:#f8faff;border-bottom:1px solid #e8eaf6;">
      <strong style="font-size:0.85rem;color:#374151;">Rank</strong>
      <div style="display:flex;gap:60px;">
        <strong style="font-size:0.85rem;color:#374151;">Attempts</strong>
        <strong style="font-size:0.85rem;color:#374151;">Passed</strong>
        <strong style="font-size:0.85rem;color:#374151;">Avg Score</strong>
      </div>
    </div>
    ${tableRows}`;
}

// ================================================================
// NOTICES
// ================================================================
let noticeFilter = 'all';
let noticesCache = [];

async function loadNotices() {
  try { noticesCache = await api('GET', '/notices'); }
  catch (e) { noticesCache = []; toast(e.message, 'error'); }
  // show admin form if admin logged in
  const adminForm = document.getElementById('adminNoticeForm');
  if (adminForm) adminForm.classList.toggle('hidden', !(currentUser && currentUser.role === 'admin'));
  renderNotices();
  loadSidebarExams();
}

function getNotices() {
  return noticesCache;
}

function renderNotices() {
  const notices = getNotices();
  const search = (document.getElementById('noticeSearch')||{value:''}).value.toLowerCase();
  let filtered = noticeFilter === 'all' ? notices : notices.filter(n=>n.type===noticeFilter);
  if (search) filtered = filtered.filter(n=>n.title.toLowerCase().includes(search)||n.body.toLowerCase().includes(search));

  // update counts
  ['all','urgent','info','success','warning'].forEach(t => {
    const el = document.getElementById('cat'+t.charAt(0).toUpperCase()+t.slice(1));
    if (el) el.textContent = t==='all' ? notices.length : notices.filter(n=>n.type===t).length;
  });

  const listEl = document.getElementById('noticesList');
  if (!filtered.length) { listEl.innerHTML='<div style="text-align:center;padding:40px;color:#9ca3af;">No notices found.</div>'; return; }

  const typeLabels = { urgent:'🚨 Urgent', info:'ℹ️ Info', success:'✅ Good News', warning:'⚠️ Warning' };
  listEl.innerHTML = filtered.sort((a,b)=>b.date-a.date).map(n => `
    <div class="notice-card ${n.type} reveal">
      <div class="nc-top">
        <span class="nc-badge ${n.type}">${typeLabels[n.type]||n.type}</span>
        <span class="nc-date">${new Date(n.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
      </div>
      <div class="nc-title">${n.title}</div>
      <div class="nc-body">${n.body}</div>
      <div class="nc-footer">
        <span class="nc-author">📌 ${n.author}</span>
        <span class="nc-views">👁️ ${n.views||0} views</span>
      </div>
    </div>`).join('');
  setTimeout(initScrollReveal, 50);
}

function filterNotices(type, btn) {
  noticeFilter = type;
  document.querySelectorAll('.nb-cat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderNotices();
}

async function postNotice() {
  const title  = document.getElementById('ntTitle').value.trim();
  const type   = document.getElementById('ntType').value;
  const body   = document.getElementById('ntBody').value.trim();
  const author = document.getElementById('ntAuthor').value.trim() || 'Admin';
  if (!title||!body) { toast('Title and content are required.','error'); return; }
  try {
    const notice = await api('POST', '/notices', { type, title, body, author });
    noticesCache.unshift(notice);
  } catch (e) { toast(e.message, 'error'); return; }
  document.getElementById('ntTitle').value='';
  document.getElementById('ntBody').value='';
  document.getElementById('ntAuthor').value='';
  toast('Notice posted! 📌','success');
  renderNotices();
}

async function loadSidebarExams() {
  const exams = (await getExams()).filter(e=>e.status==='active').slice(0,4);
  const el = document.getElementById('sidebarExams');
  if (!el) return;
  if (!exams.length) { el.innerHTML='<div style="font-size:0.82rem;color:#9ca3af;">No active exams</div>'; return; }
  el.innerHTML = exams.map(e=>`
    <div class="nb-mini-item" onclick="currentUser?openStartModal(${e.id}):showPage('login')">
      <div class="nb-mini-icon" style="background:#e8eaf6;">📝</div>
      <div><div class="nb-mini-text">${e.title}</div><div class="nb-mini-sub">${e.subject} · ${e.duration} min</div></div>
    </div>`).join('');
}

// ===== DARK MODE =====
let isDark = localStorage.getItem('ep_darkmode') === 'true';

function applyDarkMode(on) {
  document.body.classList.toggle('dark-mode', on);
  const btn = document.getElementById('dmToggle');
  if (btn) btn.textContent = on ? '☀️' : '🌙';
  localStorage.setItem('ep_darkmode', on);
}
function toggleDarkMode() { isDark = !isDark; applyDarkMode(isDark); }

// Apply on load
applyDarkMode(isDark);

// ===== FORGOT PASSWORD LOGIC =====
let fpCurrentStep = 1;
let fpUserEmail = '';
let fpResetToken = '';
let fpResendTimer = null;
let fpDevNote = '';

function goFpStep(step) {
  // hide all panels
  for (let i = 1; i <= 4; i++) {
    const p = document.getElementById('fpStep'+i);
    if (p) p.classList.remove('active');
  }
  // show target
  const target = document.getElementById('fpStep'+step);
  if (target) target.classList.add('active');
  fpCurrentStep = step;

  // update step bar
  const circles = [1,2,3];
  circles.forEach(i => {
    const c = document.getElementById('fpCircle'+i);
    if (!c) return;
    c.classList.remove('active','done');
    if (i < step) c.classList.add('done'), c.textContent = '✓';
    else if (i === step) c.classList.add('active'), c.textContent = i;
    else c.textContent = i;
  });
  [1,2].forEach(i => {
    const l = document.getElementById('fpLine'+i);
    if (l) l.classList.toggle('done', i < step);
  });

  clearFpAlert();
}

function clearFpAlert() {
  const a = document.getElementById('fpAlert');
  if (a) { a.className='hidden'; a.innerHTML=''; }
}
function showFpAlert(msg, type) {
  const a = document.getElementById('fpAlert');
  if (!a) return;
  a.className = 'fp-alert ' + (type==='error'?'err':'ok');
  a.innerHTML = (type==='error'?'⚠️ ':'✅ ') + msg;
}

async function sendOTP() {
  const email = document.getElementById('fpEmail').value.trim();
  if (!email) { showFpAlert('Please enter your email address.','error'); return; }
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailReg.test(email)) { showFpAlert('Please enter a valid email address.','error'); return; }

  try {
    const r = await api('POST', '/auth/forgot/send-otp', { email });
    fpUserEmail = email;
    if (r.devOtp) { fpDevNote = 'Email set nahi hai, isliye test OTP yahin hai: <b>' + r.devOtp + '</b>' + (r.mailError ? '<br><small>Mail error: ' + r.mailError + '</small>' : ''); }
    else { fpDevNote = ''; toast('📧 OTP aapke Gmail par bhej diya gaya hai — phone ka Gmail app bhi check karo.', 'success'); }
    if (r.devOtp) toast('📧 OTP Sent! Your OTP is: ' + r.devOtp + ' (SMTP set nahi hai, isliye yahin dikha rahe hain)', 'success');
    else toast('📧 OTP bhej diya gaya hai' + (r.smsSent ? ' (email + SMS)' : ' (email)') + '.', 'success');

    // Kahan bheja gaya wo dikhao (masked)
    const via = [];
    if (r.emailSent) via.push('✉️ ' + r.maskedEmail);
    if (r.smsSent) via.push('📱 +91 ' + r.maskedPhone);
    document.getElementById('fpEmailDisplay').textContent = via.length ? via.join('   |   ') : r.maskedEmail;

    goFpStep(2);
    if (fpDevNote) { const a = document.getElementById('fpAlert'); a.className = 'fp-alert ok'; a.innerHTML = '⚠️ ' + fpDevNote; }
    document.getElementById('otp0').focus();
    startResendTimer();
  } catch(e) { showFpAlert(e.message || 'Something went wrong. Please try again.','error'); }
}

function otpInput(i) {
  const el = document.getElementById('otp'+i);
  const val = el.value.replace(/\D/g,'');
  el.value = val;
  if (val) { el.classList.add('filled'); if (i < 5) document.getElementById('otp'+(i+1)).focus(); }
  else el.classList.remove('filled');
  // auto-verify if all 6 filled
  const code = Array.from({length:6}, (_,j) => document.getElementById('otp'+j).value).join('');
  if (code.length === 6) verifyOTP();
}

function otpKey(e, i) {
  if (e.key === 'Backspace' && !document.getElementById('otp'+i).value && i > 0) {
    document.getElementById('otp'+(i-1)).focus();
  }
}

let fpVerifying = false;
async function verifyOTP() {
  const entered = Array.from({length:6}, (_,i) => document.getElementById('otp'+i).value).join('');
  if (entered.length < 6) { showFpAlert('Please enter all 6 digits of the OTP.','error'); return; }
  if (fpVerifying) return;
  fpVerifying = true;
  try {
    const r = await api('POST', '/auth/forgot/verify-otp', { email: fpUserEmail, otp: entered });
    fpResetToken = r.resetToken;
  } catch (e) {
    showFpAlert(e.message || 'Incorrect OTP. Please check and try again.','error');
    // shake the OTP boxes
    document.getElementById('otpRow').style.animation='none';
    document.getElementById('otpRow').style.transition='none';
    document.getElementById('otpRow').style.transform='translateX(8px)';
    setTimeout(()=>{ document.getElementById('otpRow').style.transform='translateX(-8px)'; }, 80);
    setTimeout(()=>{ document.getElementById('otpRow').style.transform='none'; }, 160);
    return;
  } finally {
    fpVerifying = false;
  }
  clearInterval(fpResendTimer);
  goFpStep(3);
  document.getElementById('fpNewPass').focus();
}

async function resendOTP() {
  try {
    const r = await api('POST', '/auth/forgot/send-otp', { email: fpUserEmail });
    if (r.devOtp) { const a = document.getElementById('fpAlert'); a.className = 'fp-alert ok'; a.innerHTML = '⚠️ Email set nahi hai, naya test OTP: <b>' + r.devOtp + '</b>'; }
    else toast('📧 Naya OTP Gmail par bhej diya gaya.', 'info');
  } catch (e) { showFpAlert(e.message || 'Could not resend OTP.', 'error'); return; }
  // clear boxes
  for (let i=0;i<6;i++) { const el=document.getElementById('otp'+i); el.value=''; el.classList.remove('filled'); }
  document.getElementById('otp0').focus();
  startResendTimer();
}

function startResendTimer() {
  let secs = 30;
  const link = document.getElementById('resendLink');
  const timer = document.getElementById('resendTimer');
  if (!link||!timer) return;
  link.style.display='none'; timer.classList.remove('hidden');
  timer.textContent = '(Resend in '+secs+'s)';
  clearInterval(fpResendTimer);
  fpResendTimer = setInterval(() => {
    secs--;
    timer.textContent = '(Resend in '+secs+'s)';
    if (secs <= 0) {
      clearInterval(fpResendTimer);
      link.style.display=''; timer.classList.add('hidden');
    }
  }, 1000);
}

async function resetPassword() {
  const newPass  = document.getElementById('fpNewPass').value;
  const confPass = document.getElementById('fpConfPass').value;
  if (!newPass || newPass.length < 6) { showFpAlert('Password must be at least 6 characters.','error'); return; }
  if (newPass !== confPass) { showFpAlert('Passwords do not match.','error'); return; }

  try {
    await api('POST', '/auth/forgot/reset', { resetToken: fpResetToken, newPassword: newPass });
    goFpStep(4);
    toast('🎉 Password reset successfully!', 'success');
  } catch(e) { showFpAlert(e.message || 'Failed to reset password. Please try again.','error'); }
}

// Reset forgot password state when page is shown
const _sp3 = window.showPage;
window.showPage = function(page) {
  if (page === 'forgotPassword') {
    fpCurrentStep = 1; fpUserEmail = ''; fpResetToken = '';
    clearInterval(fpResendTimer);
    for (let i=0;i<6;i++) { const el=document.getElementById('otp'+i); if(el){el.value='';el.classList.remove('filled');} }
    const fpEm = document.getElementById('fpEmail'); if(fpEm) fpEm.value='';
    const fpNP = document.getElementById('fpNewPass'); if(fpNP) fpNP.value='';
    const fpCP = document.getElementById('fpConfPass'); if(fpCP) fpCP.value='';
    setTimeout(()=>goFpStep(1), 10);
  }
  _sp3(page);
};

// ================================================================
// COURSES PANEL — Semester toggle + auto-select course
// ================================================================
function toggleSem(headEl) {
  const subjects = headEl.nextElementSibling;
  const arrow    = headEl.querySelector('.rcp-sem-arrow');
  const isOpen   = subjects.classList.contains('open');
  subjects.classList.toggle('open', !isOpen);
  if (arrow) arrow.classList.toggle('open', !isOpen);
}

function selectCourseSubject(courseName, subjectHint) {
  // Set course dropdown
  const sel = document.getElementById('regCourse');
  if (sel) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === courseName || sel.options[i].text === courseName) {
        sel.selectedIndex = i; break;
      }
    }
  }
  // Scroll form into view & highlight dropdown
  if (sel) {
    sel.style.borderColor = '#7c3aed';
    sel.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.2)';
    sel.scrollIntoView({ behavior:'smooth', block:'nearest' });
    setTimeout(() => { sel.style.borderColor = ''; sel.style.boxShadow = ''; }, 1800);
  }
  toast('📚 Course selected: ' + courseName, 'success');
}

// ================================================================
// COURSES PAGE
// ================================================================
const facultyData = [
  { initials:'RS', name:'Prof. Rajesh Sharma',    role:'HOD & Senior Faculty',          qual:'M.Tech (CS), 12 yrs',          grad:'linear-gradient(135deg,#3b0764,#7c3aed)', subs:['Intro to CS','Project Guide'] },
  { initials:'PV', name:'Prof. Priya Verma',      role:'Mathematics Faculty',            qual:'M.Sc (Math), 9 yrs',           grad:'linear-gradient(135deg,#065f46,#059669)', subs:['Maths-I','Maths-II','Statistics'] },
  { initials:'AK', name:'Prof. Amit Kumar',       role:'Programming Faculty',            qual:'MCA, 15 yrs',                  grad:'linear-gradient(135deg,#0c4a6e,#06b6d4)', subs:['C Programming','C Lab'] },
  { initials:'SG', name:'Prof. Sunita Gupta',     role:'Communication Skills',           qual:'MA (English), B.Ed, 10 yrs',  grad:'linear-gradient(135deg,#7c2d12,#ea580c)', subs:['English Comm.'] },
  { initials:'NK', name:'Prof. Neeraj Kumar',     role:'Electronics & Graphics',         qual:'M.Tech (ECE), 8 yrs',          grad:'linear-gradient(135deg,#4c0519,#be185d)', subs:['Digital Elec.','Comp. Graphics'] },
  { initials:'MS', name:'Prof. Meena Singh',      role:'Data Structures & Algorithms',   qual:'MCA, PhD Pursuing, 11 yrs',    grad:'linear-gradient(135deg,#1e1b4b,#4338ca)', subs:['Data Structures','DAA'] },
  { initials:'RP', name:'Prof. Rohit Pandey',     role:'Database Faculty',               qual:'M.Tech (IT), 13 yrs',          grad:'linear-gradient(135deg,#3b0764,#7c3aed)', subs:['DBMS','DBMS Lab','NoSQL'] },
  { initials:'DT', name:'Prof. Deepak Tripathi',  role:'Systems Faculty',                qual:'MCA, M.Phil (CS), 14 yrs',     grad:'linear-gradient(135deg,#065f46,#059669)', subs:['OS','Compiler Design'] },
  { initials:'SC', name:'Prof. Sneha Chaudhary',  role:'Web Development Faculty',        qual:'MCA, Web Dev Cert., 7 yrs',    grad:'linear-gradient(135deg,#0c4a6e,#06b6d4)', subs:['Web Tech-I','Web Tech-II','Full Stack'] },
  { initials:'VY', name:'Prof. Vijay Yadav',      role:'OOP & Mobile Dev Faculty',       qual:'MCA, Oracle Cert., 10 yrs',    grad:'linear-gradient(135deg,#7c2d12,#ea580c)', subs:['Java OOP','Java Lab','Android'] },
  { initials:'RJ', name:'Prof. Ravi Joshi',       role:'AI/ML & Python Faculty',         qual:'M.Tech AI/ML, 8 yrs',          grad:'linear-gradient(135deg,#4c0519,#be185d)', subs:['Python','AI','Data Science','ML Lab'] },
  { initials:'KS', name:'Prof. Kamal Srivastava', role:'Networks & Cloud Faculty',       qual:'M.Tech, CCNA, AWS Cert., 12 yrs', grad:'linear-gradient(135deg,#1e1b4b,#4338ca)', subs:['Comp. Networks','Cloud Computing'] },
  { initials:'BM', name:'Prof. Bharat Mishra',    role:'Cyber Security Faculty',         qual:'M.Tech, CEH Certified, 11 yrs',grad:'linear-gradient(135deg,#3b0764,#06b6d4)', subs:['Info. Security','Cryptography'] },
  { initials:'AT', name:'Prof. Anjali Tiwari',    role:'SE & Management Faculty',        qual:'MCA, PMP, MBA, 9 yrs',         grad:'linear-gradient(135deg,#065f46,#7c3aed)', subs:['Software Engg.','Entrepreneurship','Internship'] },
  { initials:'LG', name:'Prof. Lata Gupta',       role:'Business & Finance Faculty',     qual:'MBA (Finance), CA Inter, 10 yrs',grad:'linear-gradient(135deg,#7c2d12,#be185d)', subs:['Accounting','E-Commerce','Digital Mktg'] },
];

function renderFacultyGrid() {
  const g = document.getElementById('facultyGrid');
  if (!g) return;
  g.innerHTML = facultyData.map(f => `
    <div class="faculty-card reveal">
      <div class="faculty-big-avatar" style="background:${f.grad};">${f.initials}</div>
      <div class="faculty-name">${f.name}</div>
      <div class="faculty-role">${f.role}</div>
      <div class="faculty-qual">${f.qual}</div>
      <div class="faculty-subs">${f.subs.map(s=>`<span class="faculty-sub">${s}</span>`).join('')}</div>
    </div>`).join('');
  setTimeout(initScrollReveal, 80);
}

function showSem(n, btn) {
  document.querySelectorAll('.crs-sem').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.crs-tab').forEach(b => b.classList.remove('active'));
  const sem = document.getElementById('sem'+n);
  if (sem) sem.classList.add('active');
  btn.classList.add('active');
  setTimeout(initScrollReveal, 60);
}

// Patch showPage to load courses
const _spCourses = window.showPage;
window.showPage = function(page) {
  _spCourses(page);
  if (page === 'courses') {
    // reset to sem1
    document.querySelectorAll('.crs-sem').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.crs-tab').forEach(b=>b.classList.remove('active'));
    const s1 = document.getElementById('sem1'); if(s1) s1.classList.add('active');
    const tabs = document.querySelectorAll('.crs-tab'); if(tabs[0]) tabs[0].classList.add('active');
    renderFacultyGrid();
    setTimeout(initScrollReveal, 80);
  }
};
