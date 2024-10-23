// 根据日期返回星期几的函数
function getDayOfWeek(dateString) {
  const date = new Date(dateString);  // 将日期字符串转换为 Date 对象
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const dayIndex = date.getDay();  // getDay() 返回 0-6，表示星期天到星期六
  return daysOfWeek[dayIndex];  // 返回对应的星期几
}

// 获取当前日期的函数
const getCurrentDate = () => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(currentDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`; // 返回 YYYY-MM-DD 格式的日期
};
const getDate = (dateString) => {

// 分解日期字符串
const [day, monthStr, year] = dateString.split(' ');
const month = new Date(`${monthStr} 1`).getMonth(); // 将月字符串转换为月份数字

// 创建 Date 对象，并确保时分秒为 0，时区为 UTC
return new Date(Date.UTC(parseInt(year), month, parseInt(day)));
};
const getWeekdayNumber = (weekdayName) => {
  const daysOfWeek = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  };

  return daysOfWeek[weekdayName];
};
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`; // Returns in YYYY-MM-DD format
}
// 导出所有函数
module.exports = {
  getDayOfWeek,
  getCurrentDate,
  getWeekdayNumber,
  formatDate,
  getDate,
};
