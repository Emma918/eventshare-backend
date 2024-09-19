const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');  // 引入 User 模型
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  try {
    // 检查用户是否存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const newUser = new User({
      email,
      password: hashedPassword,
      role
    });

    // 保存用户
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

module.exports = router;
