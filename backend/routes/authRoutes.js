const express = require('express');
const router = express.Router();
const { register, login, resetPin, updateUpiId, saveFcmToken, saveLanguage, getProfile, getLeaders } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.get('/leaders', getLeaders);
router.post('/register', register);
router.post('/login', login);
router.post('/reset-pin', resetPin);
router.get('/profile', protect, getProfile);
router.put('/upi-id', protect, updateUpiId);
router.put('/update-upi', protect, updateUpiId);
router.post('/fcm-token', protect, saveFcmToken);
router.post('/language', protect, saveLanguage);

module.exports = router;
