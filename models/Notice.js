const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  id:     { type: Number, required: true, unique: true },
  type:   { type: String, enum: ['urgent', 'info', 'success', 'warning'], default: 'info' },
  title:  { type: String, required: true, trim: true },
  body:   { type: String, required: true },
  author: { type: String, default: 'Admin' },
  date:   { type: Number, default: () => Date.now() },
  views:  { type: Number, default: 0 }
});

noticeSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret._id; delete ret.__v; return ret; }
});

module.exports = mongoose.model('Notice', noticeSchema);
