
const router = require('express').Router();
const Exam = require('../models/Exam');
const { nextId } = require('../models/Counter');
const { optionalAuth, requireAuth, requireAdmin, requireAccess } = require('../middleware/auth');
const {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireExamAccess
} = require('../middleware/auth');
const wrap = require('../utils/wrap');

const HIDE = '-_id -__v';

// Allow only safe image data URLs.
const IMG_RE =
  /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i;

const MAX_IMG_CHARS = 2.8 * 1024 * 1024;

// Hide correct answers from students.
const stripCorrect = (exam) => ({
  ...exam,
  questions: (exam.questions || []).map(
    ({ text, options, image }) => ({
      text,
      options,
      image: image || ''
    })
  )
});

// GET /api/exams
// Guests can view the exam list, but not question text.
router.get('/', optionalAuth, wrap(async (req, res) => {
  const exams = await Exam.find().select(HIDE).sort({ id: 1 }).lean();
  // list mein images nahi bhejte (page halka rahe) — exam kholte waqt GET /:id se milti hain
  // Sawal ka text list mein sirf admin ko jaata hai; baaki sabko sirf count (length) ke liye khali placeholders
  const isAdmin = req.user && req.user.role === 'admin';
  res.json(exams.map((e) => isAdmin
    ? stripCorrect({ ...e, questions: (e.questions || []).map(({ image, ...q }) => q) })
    : { ...e, questions: (e.questions || []).map(() => ({})) }));
}));

// GET /api/exams/:id — ek exam. Admin ko "correct" bhi milta hai, student ko nahi.
router.get('/:id', requireAuth, requireAccess, wrap(async (req, res) => {
  const exam = await Exam.findOne({ id: Number(req.params.id) }).select(HIDE).lean();
  if (!exam) return res.status(404).json({ message: 'Exam not found.' });
  res.json(req.user.role === 'admin' ? exam : stripCorrect(exam));
}));
  const exams = await Exam.find()
    .select(HIDE)
    .sort({ id: 1 })
    .lean();

  const isAdmin = req.user && req.user.role === 'admin';

  return res.json(exams.map((exam) => {
    if (isAdmin) {
      return {
        ...exam,
        questions: (exam.questions || []).map(
          ({ image, ...question }) => question
        )
      };
    }

    return {
      ...exam,
      questions: (exam.questions || []).map(() => ({}))
    };
  }));


// GET /api/exams/:id
// Admin can view correct answers; students cannot.
router.get(
  '/:id',
  requireAuth,
  requireExamAccess,
  wrap(async (req, res) => {
    const exam = await Exam.findOne({
      id: Number(req.params.id)
    }).select(HIDE).lean();

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found.'
      });
    }

    if (req.user.role === 'admin') {
      return res.json(exam);
    }

    return res.json(stripCorrect(exam));
  })
);

// POST /api/exams
// Admin creates a new exam.
router.post('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  const b = req.body || {};

  const title = String(b.title || '').trim();
  const subject = String(b.subject || '').trim();
  const description = String(b.description || '').trim();
  const duration = parseInt(b.duration, 10);

  const parsedPassingScore = parseInt(b.passingScore, 10);
  const passingScore = Number.isFinite(parsedPassingScore)
    ? parsedPassingScore
    : 60;

  if (!title || !subject) {
    return res.status(400).json({
      message: 'Exam title and subject are required.'
    });
  }

  if (!Number.isFinite(duration) || duration < 5) {
    return res.status(400).json({
      message: 'Duration must be at least 5 minutes.'
    });
  }

  if (passingScore < 0 || passingScore > 100) {
    return res.status(400).json({
      message: 'Passing score must be between 0 and 100.'
    });
  }

  if (!Array.isArray(b.questions) || b.questions.length === 0) {
    return res.status(400).json({
      message: 'Add at least 1 question.'
    });
  }

  const questions = [];

  for (let i = 0; i < b.questions.length; i++) {
    const q = b.questions[i] || {};
    const text = String(q.text || '').trim();
    const options = Array.isArray(q.options)
      ? q.options.map((option) => String(option))
      : [];
    const correct = Number(q.correct);

    if (!text) {
      return res.status(400).json({
        message: `Question ${i + 1} text is empty.`
      });
    }

    if (options.filter((option) => option.trim()).length < 2) {
      return res.status(400).json({
        message: `Question ${i + 1} needs at least 2 options.`
      });
    }

    if (
      !Number.isInteger(correct) ||
      correct < 0 ||
      correct >= options.length
    ) {
      return res.status(400).json({
        message: `Question ${i + 1} has an invalid correct answer.`
      });
    }

    let image = '';

    if (q.image) {
      image = String(q.image);

      if (!IMG_RE.test(image)) {
        return res.status(400).json({
          message:
            `Question ${i + 1}: image must be PNG, JPG, WEBP or GIF.`
        });
      }

      if (image.length > MAX_IMG_CHARS) {
        return res.status(400).json({
          message: `Question ${i + 1}: image is too large (max about 2 MB).`
        });
      }
    }

    questions.push({ text, options, correct, image });
  }

  const exam = await Exam.create({
    id: await nextId('exams'),
    title,
    subject,
    description,
    duration,
    passingScore,
    totalMarks: questions.length,
    status: 'active',
    createdAt: Date.now(),
    questions
  });

  return res.status(201).json(exam.toJSON());
}));

// PATCH /api/exams/:id/status
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const exam = await Exam.findOne({
      id: Number(req.params.id)
    });

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found.'
      });
    }

    exam.status = exam.status === 'active' ? 'paused' : 'active';
    await exam.save();

    return res.json({
      id: exam.id,
      status: exam.status
    });
  })
);

// DELETE /api/exams/:id
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const result = await Exam.deleteOne({
      id: Number(req.params.id)
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        message: 'Exam not found.'
      });
    }

    return res.json({
      message: 'Exam deleted.'
    });
  })
);

module.exports = router;
