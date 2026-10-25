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
  createdAt:  { type: Number, default: () => Date.now() }
});

userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret._id; delete ret.__v; delete ret.password; return ret; }
});

module.exports = mongoose.model('User', userSchema);
