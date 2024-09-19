const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true },  // 计数器名称
  seq: { type: Number, default: 0 }  // 当前计数值
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
