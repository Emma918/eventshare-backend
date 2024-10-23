const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: [{ type: String }],  // 'admin' or 'normal' 用户可以有多种权限
  resetToken: String, // Store reset token
  resetTokenExpires: Date, // Store token expiration time
  verified: { type: Boolean, default: false } , // Add a verified field
});

module.exports = mongoose.model('User', UserSchema);
