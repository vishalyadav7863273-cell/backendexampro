const router = require('express').Router();
const User = require('../models/User');
const Setting = require('../models/Setting');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const wrap = require('../utils/wrap');

// GET /api/settings/access-password — admin dekh sakta hai ki abhi kaunsa password chal raha hai
router.get('/access-password', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json({ password: await Setting.get('accessPassword') });
}));

// PUT /api/settings/access-password — { password, relock? } relock=true => sab students dobara lock
router.put('/access-password', requireAuth, requireAdmin, wrap(async (req, res) => {
  const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
  if (password.length < 4) return res.status(400).json({ message: 'Access password kam se kam 4 characters ka rakho.' });
  await Setting.set('accessPassword', password);
  let relocked = 0;
  if (req.body.relock) relocked = (await User.updateMany({ role: 'student' }, { accessGranted: false })).modifiedCount;
  res.json({ password, relocked });
}));

module.exports = router;
