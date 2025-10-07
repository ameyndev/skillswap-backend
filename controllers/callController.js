const SkillRequest = require('../models/SkillRequest');
const User = require('../models/User');

// Get call participants for a skill request
exports.getCallParticipants = async (req, res) => {
  const { skillRequestId } = req.params;
  const userId = req.user.userId;

  try {
    const skillRequest = await SkillRequest.findById(skillRequestId);
    if (!skillRequest) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    // Check if user is a participant
    if (skillRequest.fromUser.toString() !== userId && skillRequest.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to access this call' });
    }

    // Check if skill request is accepted
    if (skillRequest.status !== 'accepted') {
      return res.status(400).json({ message: 'Call is only available for accepted skill requests' });
    }

    // Get the other participant
    const otherUserId = skillRequest.fromUser.toString() === userId 
      ? skillRequest.toUser 
      : skillRequest.fromUser;

    const otherUser = await User.findById(otherUserId).select('username fullName profilePicture');

    res.status(200).json({ 
      otherParticipant: otherUser,
      skillRequest: {
        id: skillRequest._id,
        skillName: skillRequest.skillName
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get call participants', error: error.message });
  }
};

// Start a call (optional - for call logging)
exports.startCall = async (req, res) => {
  const { skillRequestId } = req.params;
  const userId = req.user.userId;

  try {
    const skillRequest = await SkillRequest.findById(skillRequestId);
    if (!skillRequest) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    // Check if user is a participant
    if (skillRequest.fromUser.toString() !== userId && skillRequest.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to start this call' });
    }

    // Check if skill request is accepted
    if (skillRequest.status !== 'accepted') {
      return res.status(400).json({ message: 'Call is only available for accepted skill requests' });
    }

    // Here you could log the call start time, duration, etc.
    // For now, just return success
    res.status(200).json({ message: 'Call started successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to start call', error: error.message });
  }
};

// End a call (optional - for call logging)
exports.endCall = async (req, res) => {
  const { skillRequestId } = req.params;
  const userId = req.user.userId;

  try {
    const skillRequest = await SkillRequest.findById(skillRequestId);
    if (!skillRequest) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    // Check if user is a participant
    if (skillRequest.fromUser.toString() !== userId && skillRequest.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to end this call' });
    }

    // Here you could log the call end time, calculate duration, etc.
    // For now, just return success
    res.status(200).json({ message: 'Call ended successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to end call', error: error.message });
  }
};

// Send call invitation
exports.sendCallInvitation = async (req, res) => {
  const { skillRequestId } = req.params;
  const userId = req.user.userId;

  try {
    const skillRequest = await SkillRequest.findById(skillRequestId);
    if (!skillRequest) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    // Check if user is a participant
    if (skillRequest.fromUser.toString() !== userId && skillRequest.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to send call invitation' });
    }

    // Check if skill request is accepted
    if (skillRequest.status !== 'accepted') {
      return res.status(400).json({ message: 'Call invitation is only available for accepted skill requests' });
    }

    // Get caller info
    const caller = await User.findById(userId).select('username fullName profilePicture');
    
    // Get the other participant
    const otherUserId = skillRequest.fromUser.toString() === userId 
      ? skillRequest.toUser 
      : skillRequest.fromUser;

    const otherUser = await User.findById(otherUserId).select('username fullName profilePicture');

    console.log('=== CALL INVITATION DEBUG ===');
    console.log('Skill request:', skillRequest);
    console.log('Skill name from request:', skillRequest.skillName);

    res.status(200).json({ 
      caller,
      otherParticipant: otherUser,
      skillRequest: {
        id: skillRequest._id,
        skillName: skillRequest.skillName || 'Unknown Skill'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send call invitation', error: error.message });
  }
};
