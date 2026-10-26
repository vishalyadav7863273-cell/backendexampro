/* ================================================================
   ExamPro — api.js
   Backend (Node.js + Express + MongoDB) se baat karne wala chhota client.
   Pehle yahan IndexedDB ke db* functions the — ab sab kuch REST API se hota hai.
================================================================ */

// Backend usi server se serve hota hai (http://localhost:5000). Agar frontend ko Live Server (5500) se
// khol rahe ho to API ka address yahan se milega.
const API_BASE = (location.protocol === 'file:' || location.port === '5500') ? 'http://localhost:5000' : '';
const TOKEN_KEY = 'examProToken';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  let res;
  try {
    res = await fetch(API_BASE + '/api' + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new Error('Server se connect nahi ho paa raha. Backend chal raha hai? (terminal mein: npm start)');
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }

  if (!res.ok) {
    const err = new Error((data && data.message) || 'Request failed (' + res.status + ')');
    err.status = res.status;
    err.code = data && data.code;
    if (err.code === 'ACCESS_REQUIRED' && typeof window.onAccessRequired === 'function') window.onAccessRequired();
    throw err;
  }
  return data;
}

// Chhote helpers (app.js mein isi naam se use hote hain)
const getExams       = () => api('GET', '/exams');             // sab exams ("correct" jawab ke bina)
const getExam        = (id) => api('GET', '/exams/' + id);      // ek exam (login zaroori)
const getMyAttempts  = () => api('GET', '/attempts/mine');      // student ke apne attempts
const getAllAttempts = () => api('GET', '/attempts');           // admin: sabke attempts
const getStudents    = () => api('GET', '/users');              // admin: sab students
