const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const eventController = require('../controllers/eventController');

// 获取所有活动
router.get('/events', eventController.getAllEvents);
// 获取单个活动的详情
router.get('/events/:eventId', eventController.getEventByID);
// 获取活动的所有有效日期
router.get('/:eventId/weekdays', eventController.getAllgetNextWeekdays);
// 获取当前活动当前日期的预约总人数
router.get('/:eventId/reservnum', eventController.getReservNumByEvent);

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);  // Use the 'uploads' directory for storing images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Generate a unique filename
  }
});
const upload = multer({ storage });
// 创建新活动
router.post('/events', upload.array('images', 5), eventController.createEvent);

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 删除活动及关联预约
router.delete('/events/:eventId', eventController.deleteEvent);
// 删除活动相关图片
router.delete('/eventImage/:eventId', eventController.deleteImageByEventIdAndPath);

// 更新活动
router.put('/events/:eventId',upload.array('images', 5), eventController.updateEvent);

// 获取某活动的预约信息
router.get('/events/:eventId/reservations', eventController.getReservationsByEvent);

// 添加活动预约
router.post('/events/reservations/:eventId', eventController.addReservation);

// 获取某用户的所有预约活动
router.get('/user/reserved-events/:email', eventController.getUserReservedEvents);

//用户取消活动预约
router.delete('/events/reserve/:eventId', eventController.cancelReservation);
module.exports = router;
