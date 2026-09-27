const express = require('express');
const router = express.Router();
const { 
  requestLoan, 
  getQueue, 
  reviewLoan, 
  getMyLoans,
  getMyNotifications,
  markNotificationRead,
  getMemberDirectory, 
  getMemberDetails,
  getChatMessages,
  sendChatMessage,
  deleteChatMessage,
  getNoticesList,
  createNotice,
  getPrivateChatMessages,
  sendPrivateChatMessage,
  deletePrivateChatMessage
} = require('../controllers/loanController');
const { protect, leaderOnly } = require('../middleware/authMiddleware');

// Loan requests
router.post('/request', protect, requestLoan);
router.get('/queue', protect, leaderOnly, getQueue);
router.post('/review/:id', protect, leaderOnly, reviewLoan);
router.get('/my-loans', protect, getMyLoans);

// Member personal notifications
router.get('/notifications/my', protect, getMyNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);

// Members directory
router.get('/members', protect, getMemberDirectory);
router.get('/members/:id', protect, getMemberDetails);

// Group Chat
router.get('/chat', protect, getChatMessages);
router.post('/chat', protect, sendChatMessage);
router.delete('/chat/:id', protect, deleteChatMessage);

// Private Member↔Leader Chat
router.get('/private-chat', protect, getPrivateChatMessages);
router.post('/private-chat', protect, sendPrivateChatMessage);
router.delete('/private-chat/:id', protect, deletePrivateChatMessage);

// Broadcast notices
router.get('/notices', protect, getNoticesList);
router.post('/notices', protect, leaderOnly, createNotice);

module.exports = router;
