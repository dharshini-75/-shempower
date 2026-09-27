const express = require('express');
const router = express.Router();
const {
  getPassbook,
  getMathPreview,
  addTransaction,
  getFinancialSummary,
  submitUpiPayment,
  getPendingUpiPayments,
  verifyUpiPayment,
  getMyUpiPayments
} = require('../controllers/ledgerController');
const { protect, leaderOnly } = require('../middleware/authMiddleware');

router.get('/passbook', protect, getPassbook);
router.get('/math-preview', protect, getMathPreview);
router.post('/entry', protect, addTransaction);
router.get('/summary', protect, getFinancialSummary);

// UPI Payment endpoints (Free P2P Manual Transfer + Verification)
router.post('/submit-upi', protect, submitUpiPayment);
router.get('/pending-upi', protect, leaderOnly, getPendingUpiPayments);
router.post('/verify-upi', protect, leaderOnly, verifyUpiPayment);
router.get('/my-upi', protect, getMyUpiPayments);

module.exports = router;
