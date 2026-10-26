const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const wrap = require('../utils/wrap');

// GET /api/users — admin: saare students (password kabhi nahi jaata)
router.get('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  const users = await User.find({ role: 'student' }).sort({ id: 1 });
  res.json(users.map((u) => u.toJSON()));
}));

// Padhne mein confusing characters (0/O, 1/I/L) nahi rakhte
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makePassword = () => Array.from({ length: 8 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

// POST /api/users/:id/exam-password — admin student ke liye naya exam password banata hai.
// Plain password sirf isi response mein milta hai (DB mein sirf hash) — admin ise student ko de.
router.post('/:id/exam-password', requireAuth, requireAdmin, wrap(async (req, res) => {
  const user = await User.findOne({ id: Number(req.params.id), role: 'student' });
  if (!user) return res.status(404).json({ message: 'Student not found.' });
  const password = makePassword();
  user.examPasswordHash = await bcrypt.hash(password, 10);
  user.examPasswordSetAt = Date.now();
  user.examUnlocked = false;            // naya password -> student ko dobara enter karna hoga
  user.examPwFailCount = 0;
  user.examPwLockedUntil = 0;
  await user.save();
  res.json({ password, student: user.toJSON() });
}));

// DELETE /api/users/:id/exam-access — admin access wapas le leta hai (password + unlock dono hat jaate hain)
router.delete('/:id/exam-access', requireAuth, requireAdmin, wrap(async (req, res) => {
  const user = await User.findOne({ id: Number(req.params.id), role: 'student' });
  if (!user) return res.status(404).json({ message: 'Student not found.' });
  user.examUnlocked = false;
  user.examPasswordHash = '';
  await user.save();
  res.json({ student: user.toJSON() });
}));

module.exports = router;
