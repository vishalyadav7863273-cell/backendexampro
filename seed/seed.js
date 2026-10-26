const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Notice = require('../models/Notice');
const Counter = require('../models/Counter');
const Setting = require('../models/Setting');
const crypto = require('crypto');
const { nextId } = require('../models/Counter');
const sampleExams = require('./sampleExams');
const defaultNotices = require('./defaultNotices');

// Server start hone par chalta hai. Jo pehle se hai use dobara nahi banata.
module.exports = async function seed() {
  // 1) Admin account
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@exam.com').toLowerCase();
  if (!(await User.exists({ email: adminEmail }))) {
    await User.create({
      id: await nextId('users'),
      email: adminEmail,
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      rollNumber: 'ADMIN001',
      course: 'Administration',
      createdAt: Date.now()
    });
    console.log(`👤 Admin account bana diya → ${adminEmail}`);
  }

  // 1b) Access password — admin sabhi students ko yahi dega. .env mein ACCESS_PASSWORD de sakte ho,
  //     nahi diya to random ban jaata hai aur yahin console mein dikhta hai (admin panel > Students se badal sakte ho).
  if (!(await Setting.get('accessPassword'))) {
    const pw = (process.env.ACCESS_PASSWORD || '').trim() || crypto.randomBytes(4).toString('hex');
    await Setting.set('accessPassword', pw);
    console.log(`🔑 Student Access Password: ${pw}   (admin panel → Students mein dikhega aur badal sakte ho)`);
  }

  // 2) Sample exams — sirf pehli baar (counter na ho tab). Admin ne sab delete kar diye to dobara nahi aayenge.
  if (!(await Counter.exists({ _id: 'exams' }))) {
    for (const e of sampleExams) {
      await Exam.create({ ...e, id: await nextId('exams') });
    }
    console.log(`📝 ${sampleExams.length} sample exams seed hue`);
  }

  // 3) Default notices — sirf pehli baar
  if (!(await Counter.exists({ _id: 'notices' }))) {
    for (const n of defaultNotices) {
      const { id, ...rest } = n;
      await Notice.create({ ...rest, id: await nextId('notices') });
    }
    console.log(`📋 ${defaultNotices.length} default notices seed hue`);
  }
};
