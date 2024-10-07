const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();
//register
router.post('/register', authController.register);
//email verify
router.get('/verify-email',authController.verifyemail);
//login
router.post('/login', authController.login);
//change password
router.post('/change-password', authController.changepassword);
// Handle password reset
router.post('/request-password-reset', authController.sendPasswordResetEmail);
//reset password
router.post('/reset-password', authController.resetPassword);
router.get('/reset-password',authController.getPasswordReset);
module.exports = router;
