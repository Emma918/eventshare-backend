const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'Gmail', 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const sendResetEmail = async (email, resetToken) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    text: `You requested a password reset. Please use the following link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
  };

  await transporter.sendMail(mailOptions);
};
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex'); // Generates a 64-character hexadecimal string
};
exports.register = async (req, res) => { 
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
    const savedUser = await newUser.save();
     // Generate a token for email verification
     const token = jwt.sign({ id: savedUser._id }, 'secret', { expiresIn: '1h' });

     // Send verification email
     const verificationUrl = `${process.env.BASE_URL}/auth/verify-email?token=${token}`;
     await transporter.sendMail({
       to: email,
       subject: 'Email Verification',
       html: `<p>Click the link below to verify your email:</p>
              <a href="${verificationUrl}">${verificationUrl}</a>`
     });
 
    res.status(201).json({ message: 'Registration successful! Please verify your email.' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
  };
exports.login = async (req, res) => {
  const { email, password} = req.body;  // 接收前端的角色信息

  // 检查是否提供了所有字段
  if (!email || !password) {
    return res.status(400).json({ msg: 'Please fill in all fields' });
  }

  try {
    // 查找用户，确保邮箱匹配
    const user = await User.findOne({ email});
    if (!user) return res.status(400).json({ msg: 'User not found.' });
    // Check if the user's email is verified
    if (!user.verified) {
      return res.status(400).json({ message: 'Please verify your email before logging in.' });
   }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials.' });

    // 生成 JWT 令牌
    const token = jwt.sign({ id: user._id, role: user.role }, 'secret', { expiresIn: '1h' });

    res.json({ token,role: user.role,userId:user._id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ msg: 'Login failed. Please try again.' });
  }
};
exports.sendPasswordResetEmail = async (req, res) => {
    const { email } = req.body;
    try {
      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(404).json({ message: 'User not found.' });
      }

      // Generate a password reset token and save it to the user's document
      const resetToken = generateResetToken();
      user.resetToken = resetToken;
      user.resetTokenExpires = Date.now() + 3600000; // Token valid for 1 hour
      await user.save();

      // Send email to user with the reset link (use a mailer library like nodemailer)
      await sendResetEmail(email, resetToken);
  
      res.status(200).json({ message: 'Password reset link sent to your email.' });
    } catch (error) {
      res.status(500).json({ message: 'Error sending reset email.' });
    }
  };
  exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
      // Find the user by reset token and check if token has expired
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: Date.now() },
      });
  
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
  
      // 哈希新密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      // Update user's password
      user.password = hashedPassword;

      user.resetToken = undefined; // Clear the reset token
      user.resetTokenExpires = undefined; // Clear the token expiration
      await user.save();
  
      res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error resetting password' });
    }
  };  
  exports.changepassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
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
  };
  exports.getPasswordReset = async (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('Invalid or missing token');
    }
  
    res.render('reset-password', { token });
  };
  //verify email
  exports.verifyemail = async (req, res) => {
    const { token } = req.query;
  
    try {
      // Verify the token
      const decoded = jwt.verify(token, 'secret');
      const userId = decoded.id;
  
      // Mark the user as verified
      const user = await User.findByIdAndUpdate(userId, { verified: true });
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
      console.error('Error verifying email:', error);
      res.status(400).json({ message: 'Invalid or expired token.' });
    }
  };