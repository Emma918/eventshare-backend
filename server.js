const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const normalUserRoutes = require('./routes/userDetailRoutes');
const columnRoutes = require('./routes/columnRoutes');
const app = express();
app.use(cors());
app.use(express.json()); 

// 路由等设置 
app.use('/auth', authRoutes);
app.use('/api', eventRoutes);
app.use('/api', normalUserRoutes);
app.use('/api', columnRoutes);
app.use('/uploads', express.static('uploads'))
mongoose.connect('mongodb://localhost/EventShare', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database connected'))
  .catch(err => console.log(err));

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
