const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
  eventId: { type: Number, required: true, unique: true },  // 自增ID
  email: { type: String, required: true },//创建者email
  title: { type: String, required: true },
  startdate: { type: String, required: true },  //日期
  enddate: { type: String, required: true },  //日期
  startTime: { type: String, required: true },  // 开始时间
  endTime: { type: String, required: true },  // 结束时间
  location: { type: String, required: true },
  capacity: { type: Number, default: '' },
  level: { type: String, default: ''},
  isFree: { type: Boolean, required: true },
  reserve: { type: Boolean, default: false },//是否需要预约
  repeat: { type: Boolean, default: false },  //是否每周重复字段
  organizer: { type: String,default: ''},//一般为church名称
  weekday: { type: String,default: ''},//如果每周重复，则根据登录时的日期设置每周的周几重复
  description: { type: String }, // Save text description
  category: { type: Number,required: true },//english learning or other events
  likes: { type: Number, default: 0 },  // Number of likes for the event
  likedBy: [{ type: String }],  // Array of users (could be user IDs or emails) who liked the event
});

const Event = mongoose.model('Event', eventSchema);

// 导出模型
module.exports = Event;
