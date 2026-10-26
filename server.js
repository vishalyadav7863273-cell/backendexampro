require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const seed = require('./seed/seed');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());                        // Live Server (port 5500) se bhi chalne dega
app.use(express.json({ limit: '30mb' }) )   // questions ke saath diagram images (base64) bhi aate hain);

// ---------- API ----------
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/exams',    require('./routes/exams'));
app.use('/api/attempts', require('./routes/attempts'));
app.use('/api/notices',  require('./routes/notices'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/public',   require('./routes/public'));
app.use('/api/ai',       require('./routes/ai'));
app.use('/api/proctor',  require('./routes/proctor'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

// ---------- Frontend (public/ folder) ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  if (err && err.code === 11000) return res.status(409).json({ message: 'Already exists (duplicate value).' });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  console.error('❌', err);
  res.status(err.status || 500).json({ message: 'Server error. Please try again.' });
});

(async () => {
  try {
    await connectDB();
    await seed();
    const m = await require('./utils/mailer').verifyMailer();
    if (!m.configured) console.warn('⚠️  Email (Gmail) set nahi hai — forgot-password OTP email nahi jayega. .env mein GMAIL_USER aur GMAIL_APP_PASSWORD bharo.');
    else if (!m.ok) console.warn('⚠️  Gmail login fail:', m.error, '\n   App Password sahi hai? (normal Gmail password kaam nahi karta)');
    else console.log('📧 Email (Gmail) ready — OTP email jayega.');
    app.listen(PORT, () => console.log(`🚀 ExamPro chal raha hai → http://localhost:${PORT}`));
  } catch (err) {
    console.error('\n❌ Server start nahi ho paaya:', err.message);
    console.error('   MongoDB chal raha hai? .env mein MONGO_URI sahi hai? (README dekho)\n');
    process.exit(1);
  }
})();
