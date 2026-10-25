const mongoose = require('mongoose');
const router = require('express').Router();
const ExamSession = require('../models/ExamSession');
const User = require('../models/User');
const Exam = require('../models/Exam');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const wrap = require('../utils/wrap');

const REASONS = ['tab_hidden', 'window_blur'];
const MAX_EVENTS = 200;             // ek session mein itne events se zyada nahi rakhte
const NO_SIGNAL_MS = 90 * 1000;     // itni der heartbeat na aaye to "No signal" (tab band / net gaya)

async function mySession(req) {
  const id = req.body && req.body.sessionId;
  if (!mongoose.isValidObjectId(id)) return null;
  return ExamSession.findOne({ _id: id, userId: req.user.id, status: 'active' });
}

// POST /api/proctor/start — student exam shuru karta hai
router.post('/start', requireAuth, wrap(async (req, res) => {
  if (req.user.role === 'admin') return res.json({ sessionId: null });
  const examId = Number(req.body && req.body.examId);
  if (!(await Exam.exists({ id: examId }))) return res.status(404).json({ message: 'Exam not found.' });
  const now = Date.now();
  // pichla adhura session (page reload etc.) band kar do
  await ExamSession.updateMany({ userId: req.user.id, status: 'active' }, { status: 'abandoned', endedAt: now, awaySince: 0 });
  const s = await ExamSession.create({ userId: req.user.id, examId, startedAt: now, lastSeen: now });
  res.status(201).json({ sessionId: String(s._id) });
}));

// POST /api/proctor/event — { sessionId, type: 'left'|'returned', reason }
router.post('/event', requireAuth, wrap(async (req, res) => {
  const s = await mySession(req);
  if (!s) return res.status(404).json({ message: 'No active session.' });
  const { type, reason } = req.body;
  const now = Date.now();                      // time hamesha server ka — client fake nahi kar sakta
  if (type === 'left' && !s.awaySince) {
    s.awaySince = now;
    s.violations += 1;
    if (s.events.length < MAX_EVENTS) s.events.push({ kind: 'left', reason: REASONS.includes(reason) ? reason : 'window_blur', at: now });
  } else if (type === 'returned' && s.awaySince) {
    const dur = Math.max(0, Math.round((now - s.awaySince) / 1000));
    s.totalAwaySec += dur;
    s.awaySince = 0;
    if (s.events.length < MAX_EVENTS) s.events.push({ kind: 'returned', at: now, durationSec: dur });
  }
  s.lastSeen = now;
  await s.save();
  res.json({ violations: s.violations });
}));

// POST /api/proctor/heartbeat — "main abhi yahin hoon"
router.post('/heartbeat', requireAuth, wrap(async (req, res) => {
  const s = await mySession(req);
  if (!s) return res.status(404).json({ message: 'No active session.' });
  s.lastSeen = Date.now();
  await s.save();
  res.json({ ok: true });
}));

// POST /api/proctor/end — exam submit hone par
router.post('/end', requireAuth, wrap(async (req, res) => {
  const s = await mySession(req);
  if (s) {
    const now = Date.now();
    if (s.awaySince) { s.totalAwaySec += Math.round((now - s.awaySince) / 1000); s.awaySince = 0; }
    s.status = 'submitted'; s.endedAt = now; s.lastSeen = now;
    await s.save();
  }
  res.json({ ok: true });
}));

// GET /api/proctor/live — admin: abhi chal rahe sessions + pichle 24 ghante ke violations wale sessions
router.get('/live', requireAuth, requireAdmin, wrap(async (req, res) => {
  const now = Date.now();
  const sessions = await ExamSession.find({
    $or: [
      { status: 'active', lastSeen: { $gt: now - 15 * 60 * 1000 } },
      { violations: { $gt: 0 }, startedAt: { $gt: now - 24 * 60 * 60 * 1000 } }
    ]
  }).sort({ startedAt: -1 }).limit(300).lean();

  const users = await User.find({ id: { $in: [...new Set(sessions.map(s => s.userId))] } }).select('-_id id firstName lastName rollNumber course email').lean();
  const exams = await Exam.find({ id: { $in: [...new Set(sessions.map(s => s.examId))] } }).select('-_id id title subject').lean();
  const uMap = Object.fromEntries(users.map(u => [u.id, u]));
  const eMap = Object.fromEntries(exams.map(e => [e.id, e]));

  res.json({
    now,
    sessions: sessions.map(s => {
      const u = uMap[s.userId] || {};
      const e = eMap[s.examId] || {};
      let state;
      if (s.status !== 'active') state = s.status;                 // submitted | abandoned
      else if (s.awaySince) state = 'away';                        // ABHI screen se bahar
      else if (now - s.lastSeen > NO_SIGNAL_MS) state = 'no_signal';
      else state = 'ok';
      return {
        id: String(s._id), state,
        student: { id: s.userId, name: ((u.firstName || 'Unknown') + ' ' + (u.lastName || '')).trim(), rollNumber: u.rollNumber || '-', course: u.course || '', email: u.email || '' },
        exam: { id: s.examId, title: e.title || 'Deleted exam', subject: e.subject || '' },
        startedAt: s.startedAt, endedAt: s.endedAt, lastSeen: s.lastSeen,
        awaySince: s.awaySince, violations: s.violations,
        totalAwaySec: s.totalAwaySec + (s.awaySince ? Math.round((now - s.awaySince) / 1000) : 0),
        events: s.events
      };
    })
  });
}));

module.exports = router;
