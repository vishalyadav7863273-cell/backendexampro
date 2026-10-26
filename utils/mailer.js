
let transporter = null;

// Gmail ke liye .env mein:
// GMAIL_USER=your@gmail.com
// GMAIL_APP_PASSWORD=your-16-character-app-password
//
// Ya doosre SMTP provider ke liye:
// SMTP_HOST=...
// SMTP_PORT=587
// SMTP_SECURE=false
// SMTP_USER=...
// SMTP_PASS=...

function getTransporter() {
  if (transporter) return transporter;

  const nodemailer = require('nodemailer');

  const gUser = (process.env.GMAIL_USER || '').trim();
  const gPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (gUser && gPass) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gUser,
        pass: gPass
      }
    });
  } else if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: String(process.env.SMTP_PASS).replace(/\s+/g, '')
      }
    });
  }

  return transporter;
}

function fromAddress() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;

  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();

  return user ? `ExamPro <${user}>` : undefined;
}

// Email configured nahi hai to false return hoga.
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();

  if (!t) return false;

  await t.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html
  });

  return true;
}

// Server start par email configuration verify karne ke liye.
async function verifyMailer() {
  const t = getTransporter();

  if (!t) return { configured: false };

  try {
    await t.verify();
    return { configured: true, ok: true };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      error: e.message
    };
  }
}

module.exports = { sendMail, verifyMailer };
