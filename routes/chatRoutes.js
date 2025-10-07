const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getOrCreateChat,
  sendMessage,
  getUserChats,
  markAsRead
} = require('../controllers/chatController');

// Get or create chat for a skill request
router.get('/skill-request/:skillRequestId', authMiddleware, getOrCreateChat);

// Send a message
router.post('/:chatId/messages', authMiddleware, sendMessage);

// Get user's chats
router.get('/my-chats', authMiddleware, getUserChats);

// Mark messages as read
router.put('/:chatId/read', authMiddleware, markAsRead);

module.exports = router;
