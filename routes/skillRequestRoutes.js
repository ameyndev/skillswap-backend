const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  sendRequest,
  respondToRequest,
  getUserRequests
} = require('../controllers/skillRequestController');

router.post('/send', authMiddleware, sendRequest);
router.post('/:requestId/respond', authMiddleware, respondToRequest);
router.get('/my-requests', authMiddleware, getUserRequests);

module.exports = router;
