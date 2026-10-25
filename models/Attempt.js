const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  id:          { type: Number, required: true, unique: true },
  userId:      { type: Number, required: true, index: true },
  examId:      { type: Number, required: true, index: true },
  answers:     { type: mongoose.Schema.Types.Mixed, default: {} },   // { questionIndex: optionIndex }
  correct:     Number,
  wrong:       Number,
  skipped:     Number,
  total:       Number,
  percentage:  Number,
  passed:      Boolean,
  submittedAt: { type: Number, default: () => Date.now() },
  timeTaken:   { type: Number, default: 0 }                          // seconds
}, { minimize: false });   // empty answers {} ko bhi save rakho

attemptSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret._id; delete ret.__v; return ret; }
});

module.exports = mongoose.model('Attempt', attemptSchema);
