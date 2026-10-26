const router = require('express').Router();
const Exam = require('../models/Exam');
const { nextId } = require('../models/Counter');
const { optionalAuth, requireAuth, requireAdmin, requireExamAccess } = require('../middleware/auth');
const wrap = require('../utils/wrap');

const HIDE = '-_id -__v';
const IMG_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;   // sirf safe image data-URLs
const MAX_IMG_CHARS = 2.8 * 1024 * 1024;                                         // ~2 MB image (base64)
// Sahi jawab (correct) students ko exam dete waqt nahi bhejte
const stripCorrect = (exam) => ({
  ...exam,
  questions: (exam.questions || []).map(({ text, options, image }) => ({ text, options, image: image || '' }))
});

// GET /api/exams  — sab exams (questions ke bina "correct" ke). Guest bhi dekh sakta hai.
router.get('/', optionalAuth, wrap(async (req, res) => {
  const exams = await Exam.find().select(HIDE).sort({ id: 1 }).lean();
  // list mein images nahi bhejte (page halka rahe) — exam kholte waqt GET /:id se milti hain
  res.json(exams.map((e) => stripCorrect({ ...e, questions: (e.questions || []).map(({ image, ...q }) => q) })));
}));

// GET /api/exams/:id — ek exam. Admin ko "correct" bhi milta hai, student ko nahi.
router.get('/:id', requireAuth, requireExamAccess, wrap(async (req, res) => {
  const exam = await Exam.findOne({ id: Number(req.params.id) }).select(HIDE).lean();
  if (!exam) return res.status(404).json({ message: 'Exam not found.' });
  res.json(req.user.role === 'admin' ? exam : stripCorrect(exam));
}));

// POST /api/exams — admin naya exam banaye
router.post('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  const b = req.body || {};
  const title = String(b.title || '').trim();
  const subject = String(b.subject || '').trim();
  const description = String(b.description || '').trim();
  const duration = parseInt(b.duration, 10);
  const passingScore = Number.isFinite(parseInt(b.passingScore, 10)) ? parseInt(b.passingScore, 10) : 60;

  if (!title || !subject) return res.status(400).json({ message: 'Exam title and subject are required.' });
  if (!Number.isFinite(duration) || duration < 5) return res.status(400).json({ message: 'Duration must be at least 5 minutes.' });
  if (passingScore < 0 || passingScore > 100) return res.status(400).json({ message: 'Passing score must be between 0 and 100.' });
  if (!Array.isArray(b.questions) || b.questions.length === 0)
    return res.status(400).json({ message: 'Add at least 1 question.' });

  const questions = [];
  for (let i = 0; i < b.questions.length; i++) {
    const q = b.questions[i] || {};
    const text = String(q.text || '').trim();
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
    const correct = Number(q.correct);
    if (!text) return res.status(400).json({ message: `Question ${i + 1} text is empty.` });
    if (options.filter((o) => o.trim()).length < 2)
      return res.status(400).json({ message: `Question ${i + 1} needs at least 2 options.` });
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length)
      return res.status(400).json({ message: `Question ${i + 1} has an invalid correct answer.` });
    let image = '';
    if (q.image) {
      image = String(q.image);
      if (!IMG_RE.test(image)) return res.status(400).json({ message: `Question ${i + 1}: image must be PNG, JPG, WEBP or GIF.` });
      if (image.length > MAX_IMG_CHARS) return res.status(400).json({ message: `Question ${i + 1}: image is too large (max ~2 MB).` });
    }
    questions.push({ text, options, correct, image });
  }

  const exam = await Exam.create({
    id: await nextId('exams'),
    title, subject, description, duration, passingScore,
    totalMarks: questions.length,
    status: 'active',
    createdAt: Date.now(),
    questions
  });
  res.status(201).json(exam.toJSON());
}));

// PATCH /api/exams/:id/status — active <-> paused
router.patch('/:id/status', requireAuth, requireAdmin, wrap(async (req, res) => {
  const exam = await Exam.findOne({ id: Number(req.params.id) });
  if (!exam) return res.status(404).json({ message: 'Exam not found.' });
  exam.status = exam.status === 'active' ? 'paused' : 'active';
  await exam.save();
  res.json({ id: exam.id, status: exam.status });
}));

// DELETE /api/exams/:id
router.delete('/:id', requireAuth, requireAdmin, wrap(async (req, res) => {
  const r = await Exam.deleteOne({ id: Number(req.params.id) });
  if (!r.deletedCount) return res.status(404).json({ message: 'Exam not found.' });
  res.json({ message: 'Exam deleted.' });
}));

module.exports = router;
