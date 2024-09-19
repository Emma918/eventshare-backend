// image.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const imageSchema = new Schema({
  eventId: { type: Number ,required: true },
  imagePath: { type: String, required: true },
});

const Image = mongoose.model('Image', imageSchema);
module.exports = Image;
