const Event = require('../models/Event.js');
const Image = require('../models/Image.js');
const Column = require('../models/Column.js');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const Reservation = require('../models/Reservation.js');
const Counter = require('../models/Counter.js'); 
const { getDayOfWeek, getCurrentDate,getWeekdayNumber,formatDate}  = require('../routes/dateUtils.js'); 
// 获取所有活动
exports.getAllEvents = async (req, res) => {
  const currentDate = getCurrentDate();  // Get current date in YYYY-MM-DD format
  try {
    const events = await Event.find({
      $or: [
        { enddate: { $gte: currentDate } },  // Date is greater than or equal to today
        { repeat: true }             // Or, repeat is true
      ]
    });
    const eventsWithImages = await Promise.all(events.map(async (event) => {//查找对应的图片信息
      const images = await Image.find({ eventId: event.eventId });
      const column= await Column.findOne({  
        $and: [{columnName:'English Level'}, { columnSeq:event.level }]
      });
      const levelname= column.columnDetail;
      return {
        ...event.toObject(),
        levelname,
        images: images.map(image => ({
          imagePath: image.imagePath,
        }))
      };
    }));
    res.json(eventsWithImages);
  } catch (err) {
    console.error('Error finding events:', err);
  }
};
exports.getAllEventsByEmail = async (req, res) => {
  const {email} = req.params;
  const currentDate = getCurrentDate();  // Get current date in YYYY-MM-DD format
  try {
    const events = await Event.find({
     email: email ,
     $or: [
        { enddate: { $gte: currentDate } },  // Date is greater than or equal to today
        { repeat: true }            // Or, repeat is true
      ]
    });
    const eventsWithImages = await Promise.all(events.map(async (event) => {//查找对应的图片信息
      const images = await Image.find({ eventId: event.eventId });
      const column= await Column.findOne({  
        $and: [{columnName:'English Level'}, { columnSeq:event.level }]
      });
      const levelname= column.columnDetail;
      return {
        ...event.toObject(),
        levelname,
        images: images.map(image => ({
          imagePath: image.imagePath,
        }))
      };
    }));
    res.json(eventsWithImages);
  } catch (err) {
    console.error('Error finding events:', err);
  }
};
//获取单个活动的详情
exports.getEventByID = async (req, res) => {
  const {eventId} = req.params;
  try {
    const event = await Event.findOne({ eventId: eventId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const images = await Image.find({ eventId: eventId});
    const column= await Column.findOne({  
      $and: [{columnName:'English Level'}, { columnSeq:event.level }]
    });
    const levelname= column.columnDetail;
    const eventWithImages =  {
        ...event.toObject(),
        levelname,
        images: images.map(image => ({
          imagePath: image.imagePath,
        }))
      };
    res.json(eventWithImages);
  } catch (err) {
    console.error('Error finding events:', err);
  }
};

const getReservationCount = async (eventId, date) => {
  try {
    const count = await Reservation.countDocuments({
      eventId: eventId,
      date: date
    });
    return count;
  } catch (err) {
    throw new Error(`Error counting reservations: ${err.message}`);
  }
};

// 获取下一个指定 weekday 的日期
exports.getAllgetNextWeekdays = async (req, res) => {
  const {eventId} = req.params;
  const {weekday,capacity} = req.query;
  const event = await Event.findOne({ eventId: eventId });
  const repeat= event.repeat;
  const startdate= event.startdate;
  const enddate= event.enddate;
  const weekdays = [];
  
  if(repeat){
  // Map weekday name to number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const weekdayNumber = getWeekdayNumber(weekday);
  
  if (weekdayNumber === undefined) {
    return res.status(400).json({ message: 'Invalid weekday name' });
  }

  const today = new Date(getCurrentDate()); 
  const nextWeekday = new Date(today);
  // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = today.getDay();
  // Calculate the number of days until the next occurrence of the given weekday
  let daysUntilNextWeekday = (weekdayNumber + 7 - dayOfWeek) % 7;
  if (daysUntilNextWeekday === 0) daysUntilNextWeekday = 7; // Skip current day if it matches

  nextWeekday.setDate(today.getDate() + daysUntilNextWeekday);

  // Find all occurrences within the next 30 days
  while (weekdays.length < 4 && (nextWeekday - today) <= 30 * 24 * 60 * 60 * 1000) {
    
   const newworkday=formatDate(new Date(nextWeekday));
   if(newworkday<=enddate){
    if(capacity===undefined){
      weekdays.push(newworkday);
    }else{
      const count= await getReservationCount(eventId,newworkday);
      if (count < capacity){
        weekdays.push(newworkday);
      }
}
}

    nextWeekday.setDate(nextWeekday.getDate() + 7); // Move to the next week
  }
}else{
  if(startdate!=enddate){
    let newdate=new Date(startdate);
    while(newdate<=new Date(enddate)){
      weekdays.push(formatDate(newdate));
      newdate.setDate(newdate.getDate() + 1);
    }
  }
}
  res.json(weekdays);
};
// 获取下一个ID
const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },  // 自增计数器
    { new: true, upsert: true }  // 如果计数器不存在则创建
  );
  return counter.seq;
};

// 创建新活动
exports.createEvent = async (req, res) => {
    const {email, title, startdate,enddate, startTime, endTime, location, capacity, level, isFree,reserve, repeat, organizer,description,category} = req.body;
    console.log( req.body);
    // 检查必填字段
    if (!email || !title || !startdate ||!enddate|| !startTime || !endTime || !location) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    let day='';
    if(repeat){
      day=getDayOfWeek(startdate);
      
    }
 // 获取自增的活动ID
    const eventIdnew = await getNextSequence('eventId');
    console.log('Next eventId:', eventIdnew);
    const event = new Event({
        eventId: eventIdnew,
        email,
        title,
        startdate,          // 保存日期
        enddate,
        startTime,     // 保存开始时间
        endTime,       // 保存结束时间
        location,
        capacity,
        level,
        isFree,
        reserve,
        repeat,   // 保存是否每周重复
        organizer,
        weekday: day,
        description,
        category,
      });

  try {
    console.log('event',event);
    const newEvent = await event.save();
    if (req.files && req.files.length > 0) {
      const imageRecords = req.files.map(file => ({
        eventId: newEvent.eventId,
        imagePath: file.location,
      }));
      await Image.insertMany(imageRecords);
    }
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 更新活动
exports.updateEvent = async (req, res) => {
  const { eventId } = req.params;
  const {email, title, startdate,enddate, startTime, endTime, location, capacity, level, isFree,reserve, repeat,organizer,description,category} = req.body;
  // 检查必填字段
  if (!title || !startdate||!enddate || !startTime || !endTime || !location || capacity === undefined || !level) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  let day='';
  if(repeat){
    day=getDayOfWeek(startdate);
  }
  try {
    // 查找并更新活动
    const event = await Event.findOneAndUpdate(
      { eventId },
      { email,
        title,
        startdate,          // 更新日期
        enddate,
        startTime,     // 更新开始时间
        endTime,       // 更新结束时间
        location,
        capacity,
        level,
        isFree,
        reserve,
        repeat,   // 是否每周重复
        organizer,
        weekday: day,
        description,
        category,
      },
      { new: true }  // 返回更新后的文档
    );
    if (req.files && req.files.length > 0) {
      const imageRecords = req.files.map(file => ({
        eventId: eventId,
        imagePath: file.location,
      }));
      await Image.insertMany(imageRecords);
    }

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 获取某个活动的预约信息
exports.getReservationsByEvent = async (req, res) => {
  const { eventId } = req.params;
  const { date } = req.query;
  try {
    if(date){
    const reservations = await Reservation.find({  eventId: eventId,
      date: date });
    res.json(reservations);
  }else{
    const reservations = await Reservation.find({  eventId: eventId,});
    res.json(reservations);
  }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//根据活动ID和日期获得当前预约总人数
exports.getReservNumByEvent = async (req, res) => {
  const { eventId } = req.params;
  const { date } = req.query;
  try {
    const count= await getReservationCount(eventId,date);
    res.json(count);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 添加预约
exports.addReservation = async (req, res) => {
  const {eventId} = req.params;
  const {date,name, gender, phone, email, nationality, firstLanguage } = req.body;
  const event = await Event.findOne({ eventId: eventId });
   // 检查是否已存在相同的预约
   const existingReservation = await Reservation.findOne({
    eventId: eventId,
    date: event.repeat?date:event.startdate,
    email: email,  // 假设通过用户的 email 确认唯一性
  });

  if (existingReservation) {
    return res.status(409).json({ message: 'You have already reserved this event for this date.' });
  }
  const count = await Reservation.countDocuments({
    eventId: eventId,
    date: date
  });
  const reservation = new Reservation({
    eventId, date: event.repeat?date:event.startdate,name, gender, phone, email, nationality, firstLanguage,  num: count+1,
    staus:1,
  });
  try {
    const newReservation = await reservation.save();
    res.status(201).json(newReservation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 删除活动及其关联的预约
exports.deleteEvent = async (req, res) => {
  const {eventId} = req.params;
  try {
    const event = await Event.findOneAndDelete({ eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await Image.deleteMany({ eventId: eventId });//删除关联的图片信息
    await Reservation.deleteMany({ eventId: eventId });  // 删除关联的预约信息
    res.json({ message: 'Event and associated reservations deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

  // 获取某用户的所有预约活动
exports.getUserReservedEvents = async (req, res) => {
  const { email } = req.params;
  
  try {
    // 查找所有包含该用户邮箱的预约活动
    const reservations = await Reservation.find({ email }).sort({ date: 1 });;

    if (reservations.length === 0) {
      return res.status(404).json({ message: 'No reservations found for this user' });
    }

    // 查找预约活动对应的详细信息
    const reservedEvents = await Promise.all(reservations.map(async reservation => {
      const event = await Event.findOne({eventId:reservation.eventId});
      return {
        event,
        reservationDetails: reservation,
      };
    }));

    res.status(200).json(reservedEvents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reservations', error });
  }
};
//取消预约
exports.cancelReservation = async (req, res) => {
  const { eventId } = req.params;
  const { email} = req.body;

  try {
    // Find and delete the reservation based on eventId, email, and date
    const result = await Reservation.findOneAndDelete({
      eventId,
      email
    });

    if (!result) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.status(200).json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ message: 'Error cancelling reservation', error });
  }
};
// 创建 S3 客户端
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.deleteImageByEventIdAndPath = async (req, res) => {
  const { eventId } = req.params;
  const { imagePath } = req.query;

  if (!imagePath) {
    return res.status(400).json({ message: 'Invalid image path' });
  }

  try {
    // 从数据库中删除图片记录
    const imageRecord = await Image.findOneAndDelete({ eventId: eventId, imagePath: imagePath });
    if (!imageRecord) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // 创建 S3 删除命令
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: imagePath,  // S3 中的文件路径
    };

    const command = new DeleteObjectCommand(params);

    // 执行 S3 删除操作
    await s3.send(command);
    res.status(200).json({ message: 'Image deleted successfully from S3' });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ message: err.message });
  }
};