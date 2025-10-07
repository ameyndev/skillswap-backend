const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getCallParticipants,
  startCall,
  endCall,
  sendCallInvitation
} = require('../controllers/callController');

// Get call participants for a skill request
router.get('/participants/:skillRequestId', authMiddleware, getCallParticipants);

// Start a call
router.post('/start/:skillRequestId', authMiddleware, startCall);

// End a call
router.post('/end/:skillRequestId', authMiddleware, endCall);

// Send call invitation
router.post('/invite/:skillRequestId', authMiddleware, sendCallInvitation);

module.exports = router;
