const mongoose = require('mongoose');
const { Schema } = mongoose;

// 预约详细表模型
const reservationSchema = new Schema({
  eventId: { type: Number, required: true },  // 关联Event的ID
  date: String,//预约日期
  name: String,
  gender: String,
  phone: String,
  email: String,
  nationality: String,
  firstLanguage: String,
  num: Number,//预约顺序 
  staus:String,//预约状态 0 取消 1 预约 2 finish
});

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = Reservation;
