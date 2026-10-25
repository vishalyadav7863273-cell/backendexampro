const router = require('express').Router();
const User = require('../models/User');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const wrap = require('../utils/wrap');

// GET /api/public/stats — home / about page ke counters (login ki zarurat nahi)
router.get('/stats', wrap(async (req, res) => {
  const [students, exams, attempts, passed] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Exam.countDocuments(),
    Attempt.countDocuments(),
    Attempt.countDocuments({ passed: true })
  ]);
  res.json({ students, exams, attempts, passed });
}));

// GET /api/public/leaderboard — sirf naam/roll/score (email, password kuch nahi)
router.get('/leaderboard', wrap(async (req, res) => {
  const [users, exams, attempts] = await Promise.all([
    User.find({ role: 'student' }).select('-_id id firstName lastName rollNumber course').lean(),
    Exam.find().select('-_id id title').lean(),
    Attempt.find().select('-_id userId examId percentage passed').lean()
  ]);
  res.json({ users, exams, attempts });
}));

module.exports = router;
