const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id:         { type: Number, required: true, unique: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true },            // bcrypt hash
  role:       { type: String, enum: ['student', 'admin'], default: 'student' },
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, default: '', trim: true },
  rollNumber: { type: String, default: '' , trim: true },
  course:     { type: String, default: '' },
  // Admin ka diya hua access password dalne ke baad true. Purane (legacy) users ke liye default true,
  // naye register hone wale students ke liye register route ise false set karta hai.
  accessGranted: { type: Boolean, default: true },
  createdAt:  { type: Number, default: () => Date.now() },
  phone:      { type: String, default: '', trim: true },   // 10-digit mobile (OTP SMS yahin aayega)
  createdAt:  { type: Number, default: () => Date.now() },

  // ---- Exam access (admin approval) ----
  // Register karne ke baad student exam nahi de sakta. Admin ek "exam password" generate karta hai,
  // student ise enter karta hai -> examUnlocked = true. (admin role ko hamesha access hai)
  examUnlocked:        { type: Boolean, default: false },
  examPasswordHash:    { type: String, default: '' },      // bcrypt hash (plain password kahin store nahi hota)
  examPasswordSetAt:   { type: Number, default: 0 },
  examPwFailCount:     { type: Number, default: 0 },       // galat password ki ginti
  examPwLockedUntil:   { type: Number, default: 0 }        // zyada galat try par thodi der ke liye lock
});

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id; delete ret.__v; delete ret.password;
    delete ret.examPasswordHash; delete ret.examPwFailCount; delete ret.examPwLockedUntil;
    // Admin ke liye hamesha unlocked dikhao
    if (ret.role === 'admin') ret.examUnlocked = true;
    // Admin ko students list mein "password pending hai ya nahi" dikhane ke liye
    ret.examPasswordIssued = !!doc.examPasswordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
