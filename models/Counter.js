const mongoose = require('mongoose');

// Har collection ke liye ek auto-increment counter (1, 2, 3 ...).
// Isse frontend ke purane numeric ids (onclick="startExam(3)") jaise ke taise kaam karte hain.
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

async function nextId(name) {
  const c = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return c.seq;
}

module.exports = Counter;
module.exports.nextId = nextId;
