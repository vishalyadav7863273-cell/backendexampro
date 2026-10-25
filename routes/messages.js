const router = require('express').Router();
const Message = require('../models/Message');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const wrap = require('../utils/wrap');

// POST /api/messages — contact form (guest bhi bhej sakta hai)
router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim(), email = String(b.email || '').trim();
  const subj = String(b.subj || '').trim(), msg = String(b.msg || '').trim();
  if (!name || !email || !subj || !msg) return res.status(400).json({ message: 'Please fill all required fields.' });
  if (msg.length > 5000) return res.status(400).json({ message: 'Message is too long.' });
  await Message.create({ name, email, subj, msg, date: Date.now() });
  res.status(201).json({ message: 'Message sent.' });
}));

// GET /api/messages — admin: saare contact messages
router.get('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  const list = await Message.find().sort({ date: -1 }).lean();
  res.json(list.map(({ _id, __v, ...m }) => ({ id: String(_id), ...m })));
}));

module.exports = router;
