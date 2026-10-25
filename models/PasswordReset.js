const mongoose = require('mongoose');

// Forgot-password OTP (hash karke store hota hai, 10 min baad MongoDB khud delete kar deta hai)
const resetSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true },
  codeHash:  { type: String, required: true },
  attempts:  { type: Number, default: 0 },
  expiresAt: { type: Date, required: true }
});

// expiresAt time aate hi MongoDB document ko khud delete kar deta hai (TTL index)
resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', resetSchema);
