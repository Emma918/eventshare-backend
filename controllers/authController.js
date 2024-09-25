const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const sendResetEmail = async (email, resetToken) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

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
    console.log('token',token);
    console.log('newPassword',password);
    console.log('Date.now()',Date.now());
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
  exports.login = async (req, res) => {
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
  };
  exports.getPasswordReset = async (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('Invalid or missing token');
    }
  
    res.render('reset-password', { token });
  };

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);  
exports.googleLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name } = payload;

    // 检查用户是否已经存在或创建新的用户
    let user = await User.findOne({ googleId: sub });
    if (!user) {
      user = new User({
        googleId: sub,
        email: email,
        name: name,
        role: 'normal', // 默认角色
      });
      await user.save();
    }

    res.json({ email: user.email, role: user.role });
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};