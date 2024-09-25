const express = require('express');
const registerRoute = require('./register');  // 引入注册路由
const authController = require('../controllers/authController');
const router = express.Router();

router.use('/', registerRoute);  // 确保此处挂载正确
//login
router.post('/login', authController.login);
//change password
router.post('/change-password', authController.changepassword);
// Handle password reset
router.post('/request-password-reset', authController.sendPasswordResetEmail);
//reset password
router.post('/reset-password', authController.resetPassword);
router.get('/reset-password',authController.getPasswordReset);
router.post('/google-login', authController.googleLogin);
module.exports = router;
