const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { nextId } = require('../models/Counter');
const { SECRET, signToken, requireAuth } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const wrap = require('../utils/wrap');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const isProd = process.env.NODE_ENV === 'production';

// ---------- REGISTER ----------
router.post('/register', wrap(async (req, res) => {
  const b = req.body || {};
  const firstName = str(b.firstName), lastName = str(b.lastName);
  const email = str(b.email).toLowerCase();
  const rollNumber = str(b.rollNumber), course = str(b.course);
  const password = typeof b.password === 'string' ? b.password : '';

  if (!firstName || !lastName || !email || !rollNumber || !course || !password)
    return res.status(400).json({ message: 'Please fill in all fields.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  if (await User.exists({ email })) return res.status(409).json({ message: 'Email already registered.' });

  const user = await User.create({
    id: await nextId('users'),
    email, firstName, lastName, rollNumber, course,
    password: await bcrypt.hash(password, 10),
    role: 'student',                       // register se hamesha student hi banega
    createdAt: Date.now()
  });
  res.status(201).json({ token: signToken(user), user: user.toJSON() });
}));

// ---------- LOGIN ----------
router.post('/login', wrap(async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  const role = req.body && req.body.role;
  if (!email || !password) return res.status(400).json({ message: 'Please fill in all fields.' });

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: 'Invalid email or password.' });
  if (role === 'admin' && user.role !== 'admin')
    return res.status(403).json({ message: 'This account is not an admin account.' });
  if (role === 'student' && user.role === 'admin')
    return res.status(403).json({ message: 'Please use the Admin tab to login.' });

  res.json({ token: signToken(user), user: user.toJSON() });
}));

// ---------- CURRENT USER (page refresh par session restore) ----------
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// ---------- PROFILE UPDATE ----------
router.put('/profile', requireAuth, wrap(async (req, res) => {
  const firstName = str(req.body.firstName), lastName = str(req.body.lastName);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!firstName || !lastName) return res.status(400).json({ message: 'Name fields cannot be empty.' });

  const update = { firstName, lastName };
  if (password) {
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    update.password = await bcrypt.hash(password, 10);
  }
  const user = await User.findOneAndUpdate({ id: req.user.id }, update, { new: true });
  res.json({ user: user.toJSON() });
}));

// ---------- FORGOT PASSWORD (3 steps) ----------
// 1) OTP bhejo
router.post('/forgot/send-otp', wrap(async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();
  if (!email) return res.status(400).json({ message: 'Please enter your email address.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'No account found with this email address.' });
  if (user.role === 'admin') return res.status(403).json({ message: 'Admin accounts cannot use password recovery here.' });

  const code = String(crypto.randomInt(100000, 1000000));
  await PasswordReset.findOneAndUpdate(
    { email },
    { codeHash: await bcrypt.hash(code, 8), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    { upsert: true, new: true }
  );

  let emailed = false;
  try {
    emailed = await sendMail({
      to: email,
      subject: 'ExamPro — Password reset OTP',
      text: `Aapka ExamPro OTP hai: ${code}\nYeh 10 minute tak valid hai. Agar aapne request nahi ki, to ise ignore karein.`
    });
  } catch (e) {
    console.error('Mail error:', e.message);
  }

  if (!emailed) console.log(`🔐 OTP for ${email}: ${code}   (SMTP configured nahi hai, isliye console mein dikha diya)`);
  // Development mein (SMTP ke bina) OTP response mein bhi bhejte hain taaki screen par dikh sake
  res.json({ message: 'OTP sent.', devOtp: (!emailed && !isProd) ? code : undefined });
}));

// 2) OTP verify karo -> chhota reset token milega
router.post('/forgot/verify-otp', wrap(async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();
  const otp = str(req.body && req.body.otp);
  const rec = await PasswordReset.findOne({ email });
  if (!rec || rec.expiresAt < new Date())
    return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
  if (rec.attempts >= 5)
    return res.status(429).json({ message: 'Too many wrong attempts. Please request a new OTP.' });
  if (!(await bcrypt.compare(otp, rec.codeHash))) {
    rec.attempts += 1;
    await rec.save();
    return res.status(400).json({ message: 'Incorrect OTP. Please check and try again.' });
  }
  await rec.deleteOne();
  const resetToken = jwt.sign({ email, purpose: 'pwd-reset' }, SECRET, { expiresIn: '10m' });
  res.json({ resetToken });
}));

// 3) Naya password set karo
router.post('/forgot/reset', wrap(async (req, res) => {
  const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
  if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

  let payload;
  try { payload = jwt.verify(String(req.body.resetToken || ''), SECRET); }
  catch (e) { return res.status(400).json({ message: 'Reset session expired. Please start again.' }); }
  if (payload.purpose !== 'pwd-reset') return res.status(400).json({ message: 'Invalid reset token.' });

  const user = await User.findOne({ email: payload.email });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password reset successfully.' });
}));

module.exports = router;
