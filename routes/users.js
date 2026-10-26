const router = require('express').Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const wrap = require('../utils/wrap');

// GET /api/users — admin: saare students (password kabhi nahi jaata)
router.get('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  const users = await User.find({ role: 'student' }).select('-_id -__v -password').sort({ id: 1 }).lean();
  res.json(users.map((u) => ({ ...u, accessGranted: u.accessGranted !== false })));
}));

// PATCH /api/users/:id/access — admin kisi ek student ko unlock / lock kare
router.patch('/:id/access', requireAuth, requireAdmin, wrap(async (req, res) => {
  const granted = !!(req.body && req.body.granted);
  const u = await User.findOneAndUpdate({ id: Number(req.params.id), role: 'student' }, { accessGranted: granted }, { new: true });
  if (!u) return res.status(404).json({ message: 'Student not found.' });
  res.json({ id: u.id, accessGranted: u.accessGranted });
}));

module.exports = router;
