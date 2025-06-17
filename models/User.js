const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  fullName: String,
  email: { type: String, unique: true },
  passwordHash: String,
  bio: String,
  profilePicture: String,
  location: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
