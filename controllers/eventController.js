const Event = require('../models/Event.js');
const Column = require('../models/Column.js');
const { S3Client, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const Reservation = require('../models/Reservation.js');
const { getDayOfWeek, getCurrentDate, getWeekdayNumber, formatDate } = require('../utils/dateUtils.js');
// 获取所有活动
exports.getAllEvents = async (req, res) => {
  const currentDate = getCurrentDate();  // Get current date in YYYY-MM-DD format
  const userId = req.query.userId;
  try {
    const events = await Event.find({
      $or: [
        { enddate: { $gte: currentDate } },  // Date is greater than or equal to today
        { repeat: true }             // Or, repeat is true
      ]
    }).sort({ startdate: 1 }, { startTime: 1 });
    const eventsWithImages = await Promise.all(events.map(async (event) => {//查找对应的图片信息
      const column = await Column.findOne({
        $and: [{ columnName: 'English Level' }, { columnSeq: event.level }]
      });
      const levelname =  column?.columnDetail || '';
      return {
        ...event.toObject(),
        levelname,
        liked: event.likedBy.includes(userId)
      };
    }));
    res.json(eventsWithImages);

  } catch (err) {
    console.error('Error finding events:', err);
  }
};
exports.getAllEventsByEmail = async (req, res) => {
  const { email } = req.params;
  const currentDate = getCurrentDate();  // Get current date in YYYY-MM-DD format
  try {
    const events = await Event.find({
      email: email,
      $or: [
        { enddate: { $gte: currentDate } },  // Date is greater than or equal to today
        { repeat: true }            // Or, repeat is true
      ]
    });
    const eventsWithImages = await Promise.all(events.map(async (event) => {//查找对应的图片信息
      const column = await Column.findOne({
        $and: [{ columnName: 'English Level' }, { columnSeq: event.level }]
      });
      const levelname =  column?.columnDetail || '';
      return {
        ...event.toObject(),
        levelname,
      };
    }));
    res.json(eventsWithImages);
  } catch (err) {
    console.error('Error finding events:', err);
  }
};
//获取单个活动的详情
exports.getEventByID = async (req, res) => {
  const { eventId } = req.params;
  const userId = req.query.userId;
  try {
    const event = await Event.findOne({ eventId: eventId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const column = await Column.findOne({
      $and: [{ columnName: 'English Level' }, { columnSeq: event.level }]
    });
    const levelname = column?.columnDetail || '';
    const eventWithImages = {
      ...event.toObject(),
      levelname,
      liked: event.likedBy.includes(userId)
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
  const { eventId } = req.params;
  const { weekday, capacity } = req.query;
  const event = await Event.findOne({ eventId: eventId });
  const repeat = event.repeat;
  const startdate = event.startdate;
  const enddate = event.enddate;
  const weekdays = [];

  if (repeat) {
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

      const newworkday = formatDate(new Date(nextWeekday));
      if (newworkday <= enddate) {
        if (capacity === undefined) {
          weekdays.push(newworkday);
        } else {
          const count = await getReservationCount(eventId, newworkday);
          if (count < capacity) {
            weekdays.push(newworkday);
          }
        }
      }

      nextWeekday.setDate(nextWeekday.getDate() + 7); // Move to the next week
    }
  } else {
    if (startdate != enddate) {
      let newdate = new Date(startdate);
      while (newdate <= new Date(enddate)) {
        weekdays.push(formatDate(newdate));
        newdate.setDate(newdate.getDate() + 1);
      }
    }
  }
  res.json(weekdays);
};
// 获取下一个ID
const getNextSequence = async () => {
  const latestEvent = await Event.findOne().sort({ eventId: -1 });
  return latestEvent ? latestEvent.eventId + 1 : currentEventId;
};

// 创建新活动
exports.createEvent = async (req, res) => {
  const { email, title, startdate, enddate, startTime, endTime, location, capacity, level, isFree, reserve, repeat, organizer, description, category } = req.body;
  // 检查必填字段
  if (!email || !title || !startdate || !enddate || !startTime || !endTime || !location) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  let day = '';
  if (repeat) {
    day = getDayOfWeek(startdate);

  }
  // 获取自增的活动ID
  const eventIdnew = await getNextSequence('eventId');
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
    images: [],
  });

  try {
    if (req.files && req.files.length > 0) {
      const imagePaths = req.files.map(file => file.location);  // 转换为字符串数组
      event.images.push(...imagePaths);
    }
    const newEvent = await event.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 更新活动
exports.updateEvent = async (req, res) => {
  const { eventId } = req.params;
  const {
    email, title, startdate, enddate, startTime, endTime,
    location, capacity, level, isFree, reserve, repeat,
    organizer, description, category
  } = req.body;

  // 检查必填字段
  if (!title || !startdate || !enddate || !startTime || !endTime || !location || capacity === undefined || !level) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let day = '';
  if (repeat) {
    day = getDayOfWeek(startdate);  // 获取星期几
  }

  try {
    // 查找现有的活动及其图片
    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const existingImages = event.images || []; // 现有图片路径数组
    const newImagePaths = req.files.map(file => file.location); // 上传的新图片路径数组

    // 找到需要删除的旧图片
    const imagesToDelete = existingImages.filter(image => !newImagePaths.includes(image));

    // 删除不再需要的旧图片文件（从 S3 中删除）
    if (imagesToDelete.length > 0) {
      await deleteImagesFromS3(imagesToDelete);
    }

    // 更新图片数组，保留旧图片并添加新图片
    const updatedImages = [
      ...existingImages.filter(image => newImagePaths.includes(image)), // 保留未变化的图片
      ...newImagePaths.filter(image => !existingImages.includes(image)) // 添加新的图片
    ];

    // 更新活动的图片及其他信息
    event.images = updatedImages;
    event.email = email;
    event.title = title;
    event.startdate = startdate;
    event.enddate = enddate;
    event.startTime = startTime;
    event.endTime = endTime;
    event.location = location;
    event.capacity = capacity;
    event.level = level;
    event.isFree = isFree;
    event.reserve = reserve;
    event.repeat = repeat;
    event.organizer = organizer;
    event.weekday = day;
    event.description = description;
    event.category = category;

    // 保存更新后的活动
    await event.save();

    res.json(event);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ message: err.message });
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
// 删除不再需要的旧图片（从 AWS S3）
const deleteImagesFromS3 = async (images) => {
  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Delete: {
      Objects: images.map(imagePath => ({
        Key: imagePath.replace(/^https:\/\/.*?\/(.*)$/, '$1'), // 提取 S3 中的 Key
      })),
    },
  };

  try {
    const response = await s3.send(new DeleteObjectsCommand(deleteParams));
  } catch (err) {
    console.error('Error deleting images from S3:', err);
    throw new Error('Failed to delete images from S3'); // 抛出错误供调用方捕获
  }
};

// 获取某个活动的预约信息
exports.getReservationsByEvent = async (req, res) => {
  const { eventId } = req.params;
  const { date } = req.query;
  try {
    if (date) {
      const reservations = await Reservation.find({
        eventId: eventId,
        date: date
      });
      res.json(reservations);
    } else {
      const reservations = await Reservation.find({ eventId: eventId, });
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
    const count = await getReservationCount(eventId, date);
    res.json(count);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 添加预约
exports.addReservation = async (req, res) => {
  const { eventId } = req.params;
  const { date, name, gender, phone, email, nationality, firstLanguage } = req.body;
  const event = await Event.findOne({ eventId: eventId });
  // 检查是否已存在相同的预约
  const existingReservation = await Reservation.findOne({
    eventId: eventId,
    date: date,
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
    eventId, date: event.repeat ? date : event.startdate, name, gender, phone, email, nationality, firstLanguage, num: count + 1,
    staus: 1,
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
  const { eventId } = req.params;
  try {
    const event = await Event.findOneAndDelete({ eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await Reservation.deleteMany({ eventId: eventId });  // 删除关联的预约信息
    // 删除 AWS S3 中的图片
    if (event.images && event.images.length > 0) {
      await deleteImagesFromS3(event.images);
    }
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
      const event = await Event.findOne({ eventId: reservation.eventId });
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
  const { email } = req.body;

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
exports.eventLike = async (req, res) => {
  const eventId = req.params.id;
  const userId = req.body.userId;  // Assuming the user ID is sent in the request body

  try {
    const event = await Event.findOne({ eventId });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if the user has already liked the event
    if (event.likedBy.includes(userId)) {
      // User is unliking the event
      event.likes -= 1;
      event.likedBy = event.likedBy.filter(id => id !== userId);
    } else {
      // User is liking the event
      event.likes += 1;
      event.likedBy.push(userId);
    }

    await event.save();
    res.json({ likes: event.likes, liked: event.likedBy.includes(userId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};