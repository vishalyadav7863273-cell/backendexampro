const router = require('express').Router();
const Notice = require('../models/Notice');
const { nextId } = require('../models/Counter');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const wrap = require('../utils/wrap');

const TYPES = ['urgent', 'info', 'success', 'warning'];

// GET /api/notices — sab dekh sakte hain
router.get('/', wrap(async (req, res) => {
  res.json(await Notice.find().select('-_id -__v').sort({ date: -1 }).lean());
}));

// POST /api/notices — sirf admin
router.post('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  const b = req.body || {};
  const title = String(b.title || '').trim();
  const body = String(b.body || '').trim();
  const author = String(b.author || '').trim() || 'Admin';
  const type = TYPES.includes(b.type) ? b.type : 'info';
  if (!title || !body) return res.status(400).json({ message: 'Title and content are required.' });

  const notice = await Notice.create({ id: await nextId('notices'), type, title, body, author, date: Date.now(), views: 0 });
  res.status(201).json(notice.toJSON());
}));

// DELETE /api/notices/:id — sirf admin
router.delete('/:id', requireAuth, requireAdmin, wrap(async (req, res) => {
  const r = await Notice.deleteOne({ id: Number(req.params.id) });
  if (!r.deletedCount) return res.status(404).json({ message: 'Notice not found.' });
  res.json({ message: 'Notice deleted.' });
}));

module.exports = router;
