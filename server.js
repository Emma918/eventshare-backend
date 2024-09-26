// 使用 dotenv 来加载环境变量
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const normalUserRoutes = require('./routes/userDetailRoutes');
const columnRoutes = require('./routes/columnRoutes');
const contactRoutes = require('./routes/contactRoutes');
const app = express();

const allowedOrigins = ['https://eventshare-front-zhennan-yangs-projects.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json()); 

// 路由等设置
app.use('/auth', authRoutes);
app.use('/api', eventRoutes);
app.use('/api', normalUserRoutes);
app.use('/api', columnRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api', contactRoutes);

// 使用环境变量连接 MongoDB
mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('Database connected'))
.catch(err => console.log('Database connection error:', err));

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
