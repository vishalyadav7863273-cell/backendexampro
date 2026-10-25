const jwt = require('jsonwebtoken');
const User = require('../models/User');
const wrap = require('../utils/wrap');

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET .env mein set nahi hai — development wala default use ho raha hai. Production se pehle zaroor set karo.');
}

const signToken = (user, opts = {}) =>
  jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: opts.expiresIn || process.env.JWT_EXPIRES_IN || '7d' });

async function loadUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.purpose) return null;           // password-reset token se login nahi hoga
    return await User.findOne({ id: payload.id }).select('-_id -__v -password').lean();
  } catch (e) {
    return null;
  }
}

// Login ho to req.user set karo, na ho to bhi aage jaane do
const optionalAuth = wrap(async (req, res, next) => { req.user = await loadUser(req); next(); });

const requireAuth = wrap(async (req, res, next) => {
  const user = await loadUser(req);
  if (!user) return res.status(401).json({ message: 'Please login first.' });
  req.user = user;
  next();
});

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access required.' });
};

module.exports = { SECRET, signToken, optionalAuth, requireAuth, requireAdmin };
