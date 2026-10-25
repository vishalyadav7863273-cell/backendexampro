const mongoose = require('mongoose');

// Contact form se aaye messages
const messageSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  subj:  { type: String, required: true },
  msg:   { type: String, required: true },
  date:  { type: Number, default: () => Date.now() }
});

messageSchema.set('toJSON', {
  transform: (doc, ret) => { ret.id = String(ret._id); delete ret._id; delete ret.__v; return ret; }
});

module.exports = mongoose.model('Message', messageSchema);
