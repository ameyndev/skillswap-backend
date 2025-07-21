const mongoose = require('mongoose');

const skillRequestSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who sent
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // who receives
  skill: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSkill', required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SkillRequest', skillRequestSchema);
