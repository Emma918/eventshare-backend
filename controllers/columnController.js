const Column = require('../models/Column.js');
//获取columns
exports.getColumnByName = async (req, res) => {
  const {columnName} = req.params;
  try {
    const columns = await Column.find({ columnName: columnName });
    res.json(columns);
  } catch (err) {
    console.error('Error finding columns:', err);
  }
};