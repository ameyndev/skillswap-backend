const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  fullName: String,
  email: { type: String, unique: true },
  passwordHash: String,
  bio: String,
  profilePicture: String,
  location: String,
  // Onboarding fields
  onboarded: { type: Boolean, default: false },
  skills: [
    {
      name: { type: String, required: true },
      description: { type: String },
      level: { type: Number, default: 0, min: 0 }
    }
  ],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
