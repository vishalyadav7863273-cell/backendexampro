let transporter = null;

// Gmail ke liye: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false,
// SMTP_USER=aapka@gmail.com, SMTP_PASS=<16-letter Google "App Password"> (normal Gmail password NAHI chalega)
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!transporter) {
    const nodemailer = require('nodemailer');
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

const mailEnabled = () => !!getTransporter();

// true = email chali gayi, false = SMTP configured nahi hai. Error aaye to throw hota hai.
async function sendMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
  return true;
}

module.exports = { sendMail, mailEnabled };
