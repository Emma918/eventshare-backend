const mongoose = require('mongoose');

const AdminUserDetailSchema = new mongoose.Schema({
  email: String,//关联User email
  adminName: String,
  address: String,
  adminPhone: String,
});

module.exports = mongoose.model('AdminUserDetail', AdminUserDetailSchema);
