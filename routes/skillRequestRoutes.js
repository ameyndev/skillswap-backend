const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  sendRequest,
  respondToRequest,
  getUserRequests,
  getConnectedUsers
} = require('../controllers/skillRequestController');

router.post('/send', authMiddleware, sendRequest);
router.post('/:requestId/respond', authMiddleware, respondToRequest);
router.get('/my-requests', authMiddleware, getUserRequests);
router.get('/connected-users', authMiddleware, getConnectedUsers);

module.exports = router;
