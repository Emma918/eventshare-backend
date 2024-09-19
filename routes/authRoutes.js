const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const registerRoute = require('./register');  // 引入注册路由
const router = express.Router();

router.use('/', registerRoute);  // 确保此处挂载正确

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;  // 接收前端的角色信息

  // 检查是否提供了所有字段
  if (!email || !password || !role) {
    return res.status(400).json({ msg: 'Please fill in all fields' });
  }

  try {
    // 查找用户，确保邮箱和身份匹配
    const user = await User.findOne({ email, role });
    if (!user) return res.status(400).json({ msg: 'User not found or role mismatch.' });

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials.' });

    // 生成 JWT 令牌
    const token = jwt.sign({ id: user._id, role: user.role }, 'secret', { expiresIn: '1h' });

    res.json({ token, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ msg: 'Login failed. Please try again.' });
  }
});
//change password
router.post('/change-password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  console.log('okokokkok',req.body);
  // 检查是否提供了所有必要的字段
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ msg: 'Please provide all fields.' });
  }

  try {
    // 查找用户
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found.' });

    // 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Old password is incorrect.' });

    // 哈希新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 更新用户密码
    user.password = hashedPassword;
    await user.save();

    res.json({ msg: 'Password changed successfully.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ msg: 'Server error. Please try again later.' });
  }
});

module.exports = router;
