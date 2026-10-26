
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { nextId } = require('../models/Counter');
const { SECRET, signToken, requireAuth } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const Setting = require('../models/Setting');
const { sendSms, smsEnabled } = require('../utils/sms');
const wrap = require('../utils/wrap');

// ---------- HELPERS ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const isProd = process.env.NODE_ENV === 'production';

const str = (v) => typeof v === 'string' ? v.trim() : '';

const cleanPhone = (v) =>
  String(v || '')
    .replace(/[\s\-()]/g, '')
    .replace(/^(?:\+91|91|0)(?=\d{10}$)/, '');

const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return name.slice(0, 2) + '****' + name.slice(-1) + '@' + domain;
};

const maskPhone = (phone) =>
  phone.slice(0, 2) + '******' + phone.slice(-2);

// ---------- REGISTER ----------

router.post('/register', wrap(async (req, res) => {
  const b = req.body || {};

  const firstName = str(b.firstName);
  const lastName = str(b.lastName);
  const email = str(b.email).toLowerCase();
  const rollNumber = str(b.rollNumber);
  const course = str(b.course);
  const password = typeof b.password === 'string' ? b.password : '';
  const phone = cleanPhone(b.phone);

  if (!firstName || !lastName || !email || !rollNumber ||
      !course || !password || !phone) {
    return res.status(400).json({
      message: 'Please fill in all fields.'
    });
  }

  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({
      message: 'Please enter a valid 10-digit mobile number.'
    });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({
      message: 'Please enter a valid email.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters.'
    });
  }

  if (await User.exists({ email })) {
    return res.status(409).json({
      message: 'Email already registered.'
    });
  }

  const user = await User.create({
    id: await nextId('users'),
    email,
    firstName,
    lastName,
    rollNumber,
    course,
    phone,
    examUnlocked: false,
    password: await bcrypt.hash(password, 10),
    role: 'student',                       // register se hamesha student hi banega
    accessGranted: false,                  // admin ka access password dalne tak exam nahi de sakta
    role: 'student',
    accessGranted: false,
    createdAt: Date.now()
  });

  return res.status(201).json({
    token: signToken(user),
    user: user.toJSON()
  });
}));

// ---------- VERIFY ACCESS PASSWORD ----------

const sha = (value) => {
  return crypto.createHash('sha256').update(String(value)).digest();
};

const failMap = new Map();
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

router.post('/verify-access', requireAuth, wrap(async (req, res) => {
  if (req.user.role === 'admin' ||
      req.user.accessGranted !== false) {
    return res.json({ user: req.user });
  }

  const f = failMap.get(req.user.id);

  if (f && f.until > Date.now()) {
    return res.status(429).json({
      message: 'Bahut zyada galat koshish. 15 minute baad try karo.'
    });
  }

  const entered = str(req.body && req.body.password);
  const real = (await Setting.get('accessPassword')) || '';

  if (!entered) {
    return res.status(400).json({
      message: 'Access password enter karo.'
    });
  }

  if (!real || !crypto.timingSafeEqual(sha(entered), sha(real))) {
    const expired = f && f.until && f.until <= Date.now();
    const n = (f && !expired ? f.n : 0) + 1;

    failMap.set(req.user.id, {
      n,
      until: n >= MAX_FAILS ? Date.now() + LOCK_MS : 0
    });

    return res.status(401).json({
      message: 'Galat access password. Admin se sahi password lo.'
    });
  }

  failMap.delete(req.user.id);

  const user = await User.findOneAndUpdate(
    { id: req.user.id },
    { accessGranted: true },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({ user: user.toJSON() });
}));

// ---------- LOGIN ----------

router.post('/login', wrap(async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();
  const password = req.body &&
    typeof req.body.password === 'string'
    ? req.body.password : '';
  const role = req.body && req.body.role;

  if (!email || !password) {
    return res.status(400).json({
      message: 'Please fill in all fields.'
    });
  }

  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      message: 'Invalid email or password.'
    });
  }

  if (role === 'admin' && user.role !== 'admin') {
    return res.status(403).json({
      message: 'This account is not an admin account.'
    });
  }

  if (role === 'student' && user.role === 'admin') {
    return res.status(403).json({
      message: 'Please use the Admin tab to login.'
    });
  }

  return res.json({
    token: signToken(user),
    user: user.toJSON()
  });
}));

// ---------- CURRENT USER ----------

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});
// ---------- PROFILE UPDATE ----------

router.put('/profile', requireAuth, wrap(async (req, res) => {
  const firstName = str(req.body.firstName);
  const lastName = str(req.body.lastName);
  const password = typeof req.body.password === 'string'
    ? req.body.password : '';

  if (!firstName || !lastName) {
    return res.status(400).json({
      message: 'Name fields cannot be empty.'
    });
  }

  const update = { firstName, lastName };

  if (
    req.body.phone !== undefined &&
    String(req.body.phone).trim() !== ''
  ) {
    const phone = cleanPhone(req.body.phone);

    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({
        message: 'Please enter a valid 10-digit mobile number.'
      });
    }

    update.phone = phone;
  }

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters.'
      });
    }

    update.password = await bcrypt.hash(password, 10);
  }

  const user = await User.findOneAndUpdate(
    { id: req.user.id },
    update,
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      message: 'User not found.'
    });
  }

  return res.json({ user: user.toJSON() });
}));
// ---------- FORGOT PASSWORD: SEND OTP ----------

router.post('/forgot/send-otp', wrap(async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();

  if (!email) {
    return res.status(400).json({
      message: 'Please enter your email address.'
    });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({
      message: 'Please enter a valid email address.'
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      message: 'No account found with this email address.'
    });
  }

  if (user.role === 'admin') {
    return res.status(403).json({
      message: 'Admin accounts cannot use password recovery here.'
    });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const message =
    `Aapka ExamPro OTP hai: ${code}. ` +
    'Yeh 10 minute tak valid hai. Kisi ko share na karein.';

  let emailed = false;
  let texted = false;

  // Try email delivery.
  try {
    emailed = !!(await sendMail({
      to: email,
      subject: 'ExamPro - Password Reset OTP',
      text: message +
        '\nAgar aapne request nahi ki, to ise ignore karein.'
    }));
  } catch (e) {
    mailErr = e.message;
    console.error('❌ OTP email nahi gayi:', e.message);
  }

  if (!emailed) console.log(`🔐 OTP for ${email}: ${code}   (email nahi gayi — .env mein Gmail SMTP set karo)`);
  // Production mein email fail ho to saaf error do (OTP kabhi screen par nahi dikhta)
  if (!emailed && isProd) {
    await PasswordReset.deleteOne({ email });
    return res.status(502).json({ message: 'OTP email nahi bhej paaye. Admin se kaho .env mein Gmail SMTP check kare.' });
  }
  // Development mein (SMTP ke bina) OTP response mein bhi bhejte hain taaki screen par dikh sake
  res.json({ message: 'OTP sent.', emailed, mailError: mailErr || undefined, devOtp: !emailed ? code : undefined });
  // Try SMS if configured.
  if (user.phone && smsEnabled()) {
    try {
      texted = !!(await sendSms(user.phone, message));
    } catch (e) {
      console.error('SMS error:', e.message);
    }
  }

  const delivered = emailed || texted;

  // Never claim successful delivery in production if both channels fail.
  if (!delivered && isProd) {
    return res.status(503).json({
      message: 'OTP deliver nahi hua. Email/SMS configuration check karein.'
    });
  }

  await PasswordReset.findOneAndUpdate(
    { email },
    {
      codeHash: await bcrypt.hash(code, 8),
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    },
    { upsert: true, new: true }
  );

  // Development-only fallback for local testing.
  if (!delivered && !isProd) {
    console.log(`Development OTP for ${email}: ${code}`);
  }

  return res.json({
    message: 'OTP request processed.',
    emailSent: emailed,
    smsSent: texted,
    maskedEmail: maskEmail(email),
    maskedPhone: texted && user.phone
      ? maskPhone(user.phone) : undefined,
    devOtp: (!delivered && !isProd) ? code : undefined
  });
}));

// ---------- VERIFY OTP ----------

router.post('/forgot/verify-otp', wrap(async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();
  const otp = str(req.body && req.body.otp);

  if (!email || !otp) {
    return res.status(400).json({
      message: 'Email and OTP are required.'
    });
  }

  const rec = await PasswordReset.findOne({ email });

  if (!rec || rec.expiresAt < new Date()) {
    return res.status(400).json({
      message: 'OTP expired. Please request a new one.'
    });
  }

  if (rec.attempts >= 5) {
    return res.status(429).json({
      message: 'Too many wrong attempts. Please request a new OTP.'
    });
  }

  if (!(await bcrypt.compare(otp, rec.codeHash))) {
    rec.attempts += 1;
    await rec.save();

    return res.status(400).json({
      message: 'Incorrect OTP. Please check and try again.'
    });
  }

  await rec.deleteOne();

  const resetToken = jwt.sign(
    { email, purpose: 'pwd-reset' },
    SECRET,
    { expiresIn: '10m' }
  );

  return res.json({ resetToken });
}));

// ---------- RESET PASSWORD ----------

router.post('/forgot/reset', wrap(async (req, res) => {
  const newPassword = typeof req.body.newPassword === 'string'
    ? req.body.newPassword : '';

  if (newPassword.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters.'
    });
  }

  let payload;

  try {
    payload = jwt.verify(
      String(req.body.resetToken || ''),
      SECRET
    );
  } catch (e) {
    return res.status(400).json({
      message: 'Reset session expired. Please start again.'
    });
  }

  if (payload.purpose !== 'pwd-reset') {
    return res.status(400).json({
      message: 'Invalid reset token.'
    });
  }

  const user = await User.findOne({ email: payload.email });

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.role === 'admin') {
    return res.status(403).json({
      message: 'Admin password cannot be reset through this route.'
    });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.json({ message: 'Password reset successfully.' });
}));

// ---------- EXAM UNLOCK ----------

router.post('/exam-unlock', requireAuth, wrap(async (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({
      user: { ...req.user, examUnlocked: true }
    });
  }

  const pw = typeof (req.body && req.body.password) === 'string'
    ? req.body.password.trim() : '';

  if (!pw) {
    return res.status(400).json({
      message: 'Please enter the exam password given by your admin.'
    });
  }

  const user = await User.findOne({ id: req.user.id });

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.examUnlocked) {
    return res.json({ user: user.toJSON() });
  }

  if (user.examPwLockedUntil &&
      user.examPwLockedUntil > Date.now()) {
    const mins = Math.ceil(
      (user.examPwLockedUntil - Date.now()) / 60000
    );

    return res.status(429).json({
      message: `Too many wrong attempts. Try again in ${mins} minute(s).`
    });
  }

  if (!user.examPasswordHash) {
    return res.status(403).json({
      message: 'Admin ne abhi aapko exam password nahi diya. Admin se sampark karein.'
    });
  }

  if (!(await bcrypt.compare(
    pw.toUpperCase(),
    user.examPasswordHash
  ))) {
    user.examPwFailCount = (user.examPwFailCount || 0) + 1;

    if (user.examPwFailCount >= 5) {
      user.examPwLockedUntil = Date.now() + 15 * 60 * 1000;
      user.examPwFailCount = 0;
    }

    await user.save();

    return res.status(400).json({
      message: 'Incorrect exam password.'
    });
  }

  // Correct password: unlock exam and consume the password.
  user.examUnlocked = true;
  user.examPasswordHash = '';
  user.examPwFailCount = 0;
  user.examPwLockedUntil = 0;

  await user.save();

  return res.json({ user: user.toJSON() });
}));

module.exports = router;
