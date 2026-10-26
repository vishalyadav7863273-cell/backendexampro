const mongoose = require('mongoose');

// Chhoti key-value settings (jaise: admin ka "exam access password")
const settingSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: String, default: '' }
});

settingSchema.statics.get = async function (key) {
  const s = await this.findOne({ key }).lean();
  return s ? s.value : '';
};
settingSchema.statics.set = async function (key, value) {
  await this.findOneAndUpdate({ key }, { value }, { upsert: true });
};

module.exports = mongoose.model('Setting', settingSchema);
