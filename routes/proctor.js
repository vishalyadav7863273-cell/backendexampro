
const mongoose = require('mongoose');
const router = require('express').Router();

const ExamSession = require('../models/ExamSession');
const User = require('../models/User');
const Exam = require('../models/Exam');
const { requireAuth, requireAdmin, requireAccess } = require('../middleware/auth');

const {
  requireAuth,
  requireAdmin,
  requireExamAccess
} = require('../middleware/auth');

const wrap = require('../utils/wrap');

const REASONS = ['tab_hidden', 'window_blur'];
const MAX_EVENTS = 200;
const NO_SIGNAL_MS = 90 * 1000;

async function mySession(req) {
  const id = req.body && req.body.sessionId;

  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return ExamSession.findOne({
    _id: id,
    userId: req.user.id,
    status: 'active'
  });
}

// POST /api/proctor/start — student exam shuru karta hai
router.post('/start', requireAuth, requireAccess, wrap(async (req, res) => {
  if (req.user.role === 'admin') return res.json({ sessionId: null })}));
// Student exam start
router.post('/start', requireAuth, requireExamAccess, wrap(async (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({ sessionId: null });
  }

  const examId = Number(req.body && req.body.examId);

  if (!(await Exam.exists({ id: examId }))) {
    return res.status(404).json({
      message: 'Exam not found.'
    });
  }

  const now = Date.now();

  await ExamSession.updateMany(
    {
      userId: req.user.id,
      status: 'active'
    },
    {
      status: 'abandoned',
      endedAt: now,
      awaySince: 0
    }
  );

  const session = await ExamSession.create({
    userId: req.user.id,
    examId,
    startedAt: now,
    lastSeen: now
  });

  return res.status(201).json({
    sessionId: String(session._id)
  });
}));

// Student leaves/returns
router.post('/event', requireAuth, wrap(async (req, res) => {
  const session = await mySession(req);

  if (!session) {
    return res.status(404).json({
      message: 'No active session.'
    });
  }

  const { type, reason } = req.body || {};
  const now = Date.now();

  if (type === 'left' && !session.awaySince) {
    session.awaySince = now;
    session.violations += 1;

    if (session.events.length < MAX_EVENTS) {
      session.events.push({
        kind: 'left',
        reason: REASONS.includes(reason)
          ? reason
          : 'window_blur',
        at: now
      });
    }
  } else if (type === 'returned' && session.awaySince) {
    const duration = Math.max(
      0,
      Math.round((now - session.awaySince) / 1000)
    );

    session.totalAwaySec += duration;
    session.awaySince = 0;

    if (session.events.length < MAX_EVENTS) {
      session.events.push({
        kind: 'returned',
        at: now,
        durationSec: duration
      });
    }
  }

  session.lastSeen = now;
  await session.save();

  return res.json({
    violations: session.violations
  });
}));

// Heartbeat
router.post('/heartbeat', requireAuth, wrap(async (req, res) => {
  const session = await mySession(req);

  if (!session) {
    return res.status(404).json({
      message: 'No active session.'
    });
  }

  session.lastSeen = Date.now();
  await session.save();

  return res.json({ ok: true });
}));

// Exam end
router.post('/end', requireAuth, wrap(async (req, res) => {
  const session = await mySession(req);

  if (session) {
    const now = Date.now();

    if (session.awaySince) {
      session.totalAwaySec += Math.round(
        (now - session.awaySince) / 1000
      );
      session.awaySince = 0;
    }

    session.status = 'submitted';
    session.endedAt = now;
    session.lastSeen = now;

    await session.save();
  }

  return res.json({ ok: true });
}));

// Admin live monitor
router.get('/live', requireAuth, requireAdmin, wrap(async (req, res) => {
  const now = Date.now();

  const sessions = await ExamSession.find({
    $or: [
      {
        status: 'active',
        lastSeen: {
          $gt: now - 15 * 60 * 1000
        }
      },
      {
        violations: {
          $gt: 0
        },
        startedAt: {
          $gt: now - 24 * 60 * 60 * 1000
        }
      }
    ]
  })
    .sort({ startedAt: -1 })
    .limit(300)
    .lean();

  const users = await User.find({
    id: {
      $in: [...new Set(sessions.map(s => s.userId))]
    }
  })
    .select('-_id id firstName lastName rollNumber course email')
    .lean();

  const exams = await Exam.find({
    id: {
      $in: [...new Set(sessions.map(s => s.examId))]
    }
  })
    .select('-_id id title subject')
    .lean();

  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const examMap = Object.fromEntries(exams.map(e => [e.id, e]));

  return res.json({
    now,
    sessions: sessions.map(s => {
      const user = userMap[s.userId] || {};
      const exam = examMap[s.examId] || {};

      let state;

      if (s.status !== 'active') {
        state = s.status;
      } else if (s.awaySince) {
        state = 'away';
      } else if (now - s.lastSeen > NO_SIGNAL_MS) {
        state = 'no_signal';
      } else {
        state = 'ok';
      }

      return {
        id: String(s._id),
        state,
        student: {
          id: s.userId,
          name: ((user.firstName || 'Unknown') + ' ' + (user.lastName || '')).trim(),
          rollNumber: user.rollNumber || '-',
          course: user.course || '',
          email: user.email || ''
        },
        exam: {
          id: s.examId,
          title: exam.title || 'Deleted exam',
          subject: exam.subject || ''
        },
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        lastSeen: s.lastSeen,
        awaySince: s.awaySince,
        violations: s.violations,
        totalAwaySec:
          s.totalAwaySec +
          (s.awaySince
            ? Math.round((now - s.awaySince) / 1000)
            : 0),
        events: s.events
      };
    })
  });
}));

module.exports = router;
