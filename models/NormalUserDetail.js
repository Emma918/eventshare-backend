const mongoose = require('mongoose');

const NormalUserDetailSchema = new mongoose.Schema({
  email: String,//关联User email
  name: String,
  gender: String,
  phone: String,
  email: String,
  nationality: String,
  firstLanguage: String, 
});

module.exports = mongoose.model('NormalUserDetail', NormalUserDetailSchema);
