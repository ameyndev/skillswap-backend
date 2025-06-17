const mongoose = require('mongoose');

const userSkillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  availability: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserSkill', userSkillSchema);
