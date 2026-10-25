const router = require('express').Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const wrap = require('../utils/wrap');

// GET /api/users — admin: saare students (password kabhi nahi jaata)
router.get('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json(await User.find({ role: 'student' }).select('-_id -__v -password').sort({ id: 1 }).lean());
}));

module.exports = router;
