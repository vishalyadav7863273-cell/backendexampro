
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id:         { type: Number, required: true, unique: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true }, // bcrypt hash
  role:       { type: String, enum: ['student', 'admin'], default: 'student' },
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, default: '', trim: true },
  rollNumber: { type: String, default: '', trim: true },
  course:     { type: String, default: '' },

  // Legacy users ke liye default true
  accessGranted: { type: Boolean, default: true },
  phone:      { type: String, default: '', trim: true },
  createdAt:  { type: Number, default: () => Date.now() },

  // Exam access (admin approval)
  examUnlocked:      { type: Boolean, default: false },
  examPasswordHash:  { type: String, default: '' },
  examPasswordSetAt: { type: Number, default: 0 },
  examPwFailCount:   { type: Number, default: 0 },
  examPwLockedUntil: { type: Number, default: 0 }
});

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    delete ret.examPasswordHash;
    delete ret.examPwFailCount;
    delete ret.examPwLockedUntil;

    // Admin ke liye hamesha unlocked dikhao
    if (ret.role === 'admin') ret.examUnlocked = true;

    // Admin ko students list mein password status dikhane ke liye
    ret.examPasswordIssued = !!doc.examPasswordHash;

    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
