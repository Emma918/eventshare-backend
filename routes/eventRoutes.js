const express = require('express');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');  // 引入 S3Client
const multerS3 = require('multer-s3');
const router = express.Router();
const eventController = require('../controllers/eventController');

// 获取所有活动
router.get('/events', eventController.getAllEvents);
// 根据Email获取该用户创建的活动
router.get('/events/email/:email', eventController.getAllEventsByEmail);
// 获取单个活动的详情
router.get('/events/:eventId', eventController.getEventByID);
// 获取活动的所有有效日期
router.get('/:eventId/weekdays', eventController.getAllgetNextWeekdays);
// 获取当前活动当前日期的预约总人数
router.get('/:eventId/reservnum', eventController.getReservNumByEvent);
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 使用 multerS3 作为存储配置
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, Date.now().toString() + '-' + file.originalname); // 设置文件名
    },
  }),
});
// 创建新活动
router.post('/events', upload.array('images', 5), eventController.createEvent);

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

//event like
router.post('/events/:id/like',eventController.eventLike);
module.exports = router;
