// routes/userDetailRoutes.js
const express = require('express');
const router = express.Router();
const NormalUserDetail = require('../models/NormalUserDetail');
const AdminUserDetail = require('../models/AdminUserDetail');
//普通用户
// 根据普通用户邮箱获取详细信息
router.get('/normal-user-details/:email', async (req, res) => {
  try {
    const userDetails = await NormalUserDetail.findOne({ email: req.params.email });
    if (!userDetails) {
        return res.status(200).json({});  // 返回空对象
    }
    res.json(userDetails);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details' });
  }
});
// 更新或创建普通用户详细信息
router.post('/normal-user-details/update/:email', async (req, res) => {
    const { email } = req.params;
    const { name, gender, phone, nationality, firstLanguage } = req.body;
  
    try {
      // 使用 upsert 更新或追加用户详细信息
      const userDetail = await NormalUserDetail.findOneAndUpdate(
        { email }, // 根据 email 查找用户详细信息
        { name, gender, phone, nationality, firstLanguage }, // 更新或插入的数据
        { new: true, upsert: true, setDefaultsOnInsert: true } // upsert 选项，如果找不到则插入新数据
      );
      
      res.status(200).json({ message: 'User detail updated successfully', userDetail });
    } catch (error) {
      res.status(500).json({ message: 'Error updating user details', error });
    }
  });
//管理员用户
  // 根据管理员用户邮箱获取详细信息
router.get('/admin-user-details/:email', async (req, res) => {
  try {
    const userDetails = await AdminUserDetail.findOne({ email: req.params.email });
    if (!userDetails) {
        return res.status(200).json({});  // 返回空对象
    }
    res.json(userDetails);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details' });
  }
});
// 更新或创建管理员用户详细信息
router.post('/admin-user-details/update/:email', async (req, res) => {
    const { email } = req.params;
    const { adminName, address, adminPhone} = req.body;
    try {
      // 使用 upsert 更新或追加用户详细信息
      const userDetail = await AdminUserDetail.findOneAndUpdate(
        { email }, // 根据 email 查找用户详细信息
        { adminName, address, adminPhone}, // 更新或插入的数据
        { new: true, upsert: true, setDefaultsOnInsert: true } // upsert 选项，如果找不到则插入新数据
      );
      
      res.status(200).json({ message: 'User detail updated successfully', userDetail });
    } catch (error) {
      res.status(500).json({ message: 'Error updating user details', error });
    }
  });
  
module.exports = router;
