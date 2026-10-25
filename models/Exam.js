const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text:    { type: String, required: true },
  image:   { type: String, default: '' },          // optional diagram/figure (data URL)
  options: { type: [String], validate: v => v.length >= 2 },
  correct: { type: Number, required: true }
}, { _id: false });

const examSchema = new mongoose.Schema({
  id:           { type: Number, required: true, unique: true },
  title:        { type: String, required: true, trim: true },
  subject:      { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  duration:     { type: Number, required: true },   // minutes
  passingScore: { type: Number, default: 60 },      // percent
  totalMarks:   { type: Number, default: 0 },
  status:       { type: String, enum: ['active', 'paused'], default: 'active' },
  createdAt:    { type: Number, default: () => Date.now() },
  questions:    { type: [questionSchema], default: [] }
});

examSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret._id; delete ret.__v; return ret; }
});

module.exports = mongoose.model('Exam', examSchema);
