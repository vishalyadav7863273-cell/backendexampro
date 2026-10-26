const router = require('express').Router();
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const { nextId } = require('../models/Counter');
const { requireAuth, requireAdmin, requireAccess } = require('../middleware/auth');
const wrap = require('../utils/wrap');

const LIST_FIELDS = '-_id -__v -answers';   // list mein answers nahi bhejte (halka rehta hai)

// POST /api/attempts — exam submit. Grading SERVER par hoti hai (student score ke saath chhed-chhad nahi kar sakta)
router.post('/', requireAuth, requireAccess, wrap(async (req, res) => {
  const { examId, answers, timeTaken } = req.body || {};
  const exam = await Exam.findOne({ id: Number(examId) }).select('-_id -__v').lean();
  if (!exam) return res.status(404).json({ message: 'Exam not found.' });
  if (exam.status !== 'active' && req.user.role !== 'admin')
    return res.status(403).json({ message: 'This exam is not active.' });

  const qs = exam.questions;
  const total = qs.length;
  if (!total) return res.status(400).json({ message: 'This exam has no questions.' });

  // sirf valid { questionIndex: optionIndex } rakho
  const clean = {};
  Object.entries(answers && typeof answers === 'object' ? answers : {}).forEach(([k, v]) => {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 0 && i < total && Number.isInteger(v) && v >= 0 && v < qs[i].options.length) clean[i] = v;
  });

  const answered = Object.keys(clean).length;
  const correct = Object.keys(clean).filter((i) => clean[i] === qs[i].correct).length;
  const wrong = answered - correct;
  const skipped = total - answered;
  const percentage = Math.round((correct / total) * 100);
  const passed = percentage >= exam.passingScore;
  const maxSecs = exam.duration * 60;

  const attempt = await Attempt.create({
    id: await nextId('attempts'),
    userId: req.user.id,
    examId: exam.id,
    answers: clean,
    correct, wrong, skipped, total, percentage, passed,
    submittedAt: Date.now(),
    timeTaken: Math.max(0, Math.min(Math.round(Number(timeTaken) || 0), maxSecs))
  });

  // Submit ke baad sahi jawab dikhane ke liye poora exam (correct ke saath) wapas bhejte hain
  res.status(201).json({ attempt: attempt.toJSON(), exam });
}));

// GET /api/attempts/mine — logged-in student ke apne attempts
router.get('/mine', requireAuth, wrap(async (req, res) => {
  res.json(await Attempt.find({ userId: req.user.id }).select(LIST_FIELDS).sort({ submittedAt: -1 }).lean());
}));

// GET /api/attempts — admin: sabke attempts
router.get('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json(await Attempt.find().select(LIST_FIELDS).sort({ submittedAt: -1 }).lean());
}));

// GET /api/attempts/:id — ek attempt + exam (review ke liye). Sirf owner ya admin.
router.get('/:id', requireAuth, wrap(async (req, res) => {
  const attempt = await Attempt.findOne({ id: Number(req.params.id) }).select('-_id -__v').lean();
  if (!attempt) return res.status(404).json({ message: 'Attempt not found.' });
  if (attempt.userId !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Not allowed.' });
  const exam = await Exam.findOne({ id: attempt.examId }).select('-_id -__v').lean();
  if (!exam) return res.status(404).json({ message: 'This exam was deleted.' });
  res.json({ attempt, exam });
}));

module.exports = router;
