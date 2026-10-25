const mongoose = require('mongoose');

// Ek student ka ek live exam session — exam ke dauraan screen chhodne (desktop/tab/window switch) ka record.
const eventSchema = new mongoose.Schema({
  kind:        { type: String, enum: ['left', 'returned'], required: true },
  reason:      { type: String, default: '' },     // tab_hidden | window_blur
  at:          { type: Number, default: () => Date.now() },
  durationSec: { type: Number, default: 0 }       // 'returned' event par: kitni der bahar raha
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  userId:      { type: Number, required: true, index: true },
  examId:      { type: Number, required: true, index: true },
  status:      { type: String, enum: ['active', 'submitted', 'abandoned'], default: 'active', index: true },
  startedAt:   { type: Number, default: () => Date.now() },
  endedAt:     { type: Number, default: 0 },
  lastSeen:    { type: Number, default: () => Date.now() },   // aakhri heartbeat/event
  awaySince:   { type: Number, default: 0 },                  // 0 = abhi exam screen par hai
  violations:  { type: Number, default: 0 },                  // kitni baar screen chhodi
  totalAwaySec:{ type: Number, default: 0 },
  events:      { type: [eventSchema], default: [] }
}, { minimize: false });

module.exports = mongoose.model('ExamSession', sessionSchema);
