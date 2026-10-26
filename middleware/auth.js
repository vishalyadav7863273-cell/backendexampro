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
    return await User.findOne({ id: payload.id }).select('-_id -__v -password -examPasswordHash -examPwFailCount -examPwLockedUntil').lean();
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

// Student ko exam dene se pehle admin ka access password dalna zaroori hai (requireAuth ke baad lagao)
const requireAccess = (req, res, next) => {
  if (req.user && req.user.role === 'student' && req.user.accessGranted === false)
    return res.status(403).json({ code: 'ACCESS_REQUIRED', message: 'Pehle admin ka diya hua access password enter karo.' });
  next();
};

<<<<<<< HEAD
module.exports = { SECRET, signToken, optionalAuth, requireAuth, requireAdmin, requireAccess };
=======
// Student ko exam dene ke liye admin ka diya hua password enter karna zaroori hai
const requireExamAccess = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.examUnlocked)) return next();
  return res.status(403).json({ code: 'EXAM_LOCKED', message: 'Exam dene ke liye admin ka diya hua exam password enter karo.' });
};

module.exports = { SECRET, signToken, optionalAuth, requireAuth, requireAdmin, requireExamAccess };
>>>>>>> 8b2218d74f1d898568ce1134e38262946b2fb285
