let transporter = null;

<<<<<<< HEAD
// Gmail ke liye .env mein sirf do cheezein chahiye:
//   GMAIL_USER=tumhara@gmail.com
//   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (Google Account → Security → 2-Step Verification → App passwords)
// Doosre provider ke liye SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS use hote hain.
function getTransporter() {
  if (transporter) return transporter;
  const nodemailer = require('nodemailer');
  const gUser = (process.env.GMAIL_USER || '').trim();
  const gPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (gUser && gPass) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gUser, pass: gPass }
    });
  } else if (process.env.SMTP_HOST) {
=======
// Gmail ke liye: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false,
// SMTP_USER=aapka@gmail.com, SMTP_PASS=<16-letter Google "App Password"> (normal Gmail password NAHI chalega)
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!transporter) {
    const nodemailer = require('nodemailer');
>>>>>>> 75966ee4314126e517bcf2a4a7585d8f18421d52
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      // Google App Password spaces ke saath dikhta hai ("abcd efgh ijkl mnop") — spaces hata do
      auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS).replace(/\s+/g, '') }
    });
  }
  return transporter;
}

<<<<<<< HEAD
function fromAddress() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
  const u = process.env.GMAIL_USER || process.env.SMTP_USER;
  return u ? `ExamPro <${u}>` : undefined;
}

// true = email chali gayi, false = email configured nahi hai. Error aaye to throw hota hai.
async function sendMail({ to, subject, text, html }) {
=======
const mailEnabled = () => !!getTransporter();

// true = email chali gayi, false = SMTP configured nahi hai. Error aaye to throw hota hai.
async function sendMail({ to, subject, text }) {
>>>>>>> 75966ee4314126e517bcf2a4a7585d8f18421d52
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({ from: fromAddress(), to, subject, text, html });
  return true;
}

<<<<<<< HEAD
// Server start par ek baar check karo ki login sahi hai ya nahi
async function verifyMailer() {
  const t = getTransporter();
  if (!t) return { configured: false };
  try { await t.verify(); return { configured: true, ok: true }; }
  catch (e) { return { configured: true, ok: false, error: e.message }; }
}

module.exports = { sendMail, verifyMailer };
=======
module.exports = { sendMail, mailEnabled };
>>>>>>> 75966ee4314126e517bcf2a4a7585d8f18421d52
