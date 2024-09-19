const mongoose = require('mongoose');
const { Schema } = mongoose;

const columnSchema = new Schema({
  columnName: { type: String, required: true},   
  columnSeq: { type: Number, required: true },
  columnDetail: { type: String, required: true },
});

const Column = mongoose.model('Column', columnSchema);

// 导出模型
module.exports = Column;
