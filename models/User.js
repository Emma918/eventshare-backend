const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,  // 'admin' or 'normal'
  resetToken: String, // Store reset token
  resetTokenExpires: Date, // Store token expiration time
});

module.exports = mongoose.model('User', UserSchema);
