let transporter = null;

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
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  }
  return transporter;
}

function fromAddress() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
  const u = process.env.GMAIL_USER || process.env.SMTP_USER;
  return u ? `ExamPro <${u}>` : undefined;
}

// true = email chali gayi, false = email configured nahi hai. Error aaye to throw hota hai.
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({ from: fromAddress(), to, subject, text, html });
  return true;
}

// Server start par ek baar check karo ki login sahi hai ya nahi
async function verifyMailer() {
  const t = getTransporter();
  if (!t) return { configured: false };
  try { await t.verify(); return { configured: true, ok: true }; }
  catch (e) { return { configured: true, ok: false, error: e.message }; }
}

module.exports = { sendMail, verifyMailer };
