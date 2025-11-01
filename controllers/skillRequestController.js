const SkillRequest = require('../models/SkillRequest');
const User = require('../models/User');

// Send a request
exports.sendRequest = async (req, res) => {
  const { skillId, description, skillName, toUserId } = req.body;
  const fromUser = req.user.userId;

  try {
    // Find the user who has this skill
    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: 'User not found' });

    // Verify the user has the skill
    const hasSkill = toUser.skills.some(skill => 
      skill.name.toLowerCase() === skillName.toLowerCase()
    );
    
    if (!hasSkill) {
      return res.status(404).json({ message: 'Skill not found for this user' });
    }

    const request = new SkillRequest({
      fromUser,
      toUser: toUserId,
      skill: skillId, // This will be the generated ID from search
      skillName: skillName, // Store the skill name for display
      description
    });

    await request.save();
    res.status(201).json({ message: 'Skill request sent', request });
  } catch (err) {
    res.status(500).json({ error: 'Could not send request', detail: err.message });
  }
};

// Accept or reject a request
exports.respondToRequest = async (req, res) => {
  const { requestId } = req.params;
  const { action } = req.body; // 'accept' or 'reject'
  const userId = req.user.userId;

  try {
    const request = await SkillRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to respond to this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already responded to' });
    }

    if (action === 'accept') {
      request.status = 'accepted';
    } else if (action === 'reject') {
      request.status = 'rejected';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await request.save();
    res.status(200).json({ message: `Request ${request.status}`, request });
  } catch (err) {
    res.status(500).json({ error: 'Could not update request', detail: err.message });
  }
};

// View sent or received requests
exports.getUserRequests = async (req, res) => {
  const userId = req.user.userId;

  try {
    const sent = await SkillRequest.find({ fromUser: userId })
      .populate('toUser', 'username')
      .lean();

    const received = await SkillRequest.find({ toUser: userId })
      .populate('fromUser', 'username')
      .lean();

    // Use the stored skill name for display, with fallback for older requests
    const processedSent = sent.map(request => ({
      ...request,
      skill: { name: request.skillName || 'Legacy Skill Request' }
    }));

    const processedReceived = received.map(request => ({
      ...request,
      skill: { name: request.skillName || 'Legacy Skill Request' }
    }));

    res.status(200).json({ sent: processedSent, received: processedReceived });
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve requests', detail: err.message });
  }
};

// Get users connected through skill requests
exports.getConnectedUsers = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Get all skill requests where current user is involved (sent or received)
    // Only include accepted requests as "connected" users
    const skillRequests = await SkillRequest.find({
      $or: [
        { fromUser: userId },
        { toUser: userId }
      ],
      status: 'accepted'
    })
      .populate('fromUser', 'username fullName _id')
      .populate('toUser', 'username fullName _id')
      .lean();

    // Extract unique connected users and include skill request info
    const connectedUsersMap = new Map();

    skillRequests.forEach(request => {
      // Compare user IDs - with .lean(), _id is already an ObjectId
      const fromUserIdStr = request.fromUser._id.toString();
      const toUserIdStr = request.toUser._id.toString();
      const currentUserIdStr = userId.toString();
      
      const otherUser = fromUserIdStr === currentUserIdStr 
        ? request.toUser 
        : request.fromUser;

      // Skip if user info is missing
      if (!otherUser || !otherUser.username || !otherUser.fullName) {
        return;
      }

      const userIdStr = otherUser._id.toString();
      
      if (!connectedUsersMap.has(userIdStr)) {
        connectedUsersMap.set(userIdStr, {
          _id: otherUser._id,
          username: otherUser.username,
          fullName: otherUser.fullName,
          skillRequests: []
        });
      }

      // Add skill request info
      connectedUsersMap.get(userIdStr).skillRequests.push({
        _id: request._id,
        skillName: request.skillName || 'Unknown Skill',
        description: request.description,
        createdAt: request.createdAt
      });
    });

    const connectedUsers = Array.from(connectedUsersMap.values());

    res.status(200).json(connectedUsers);
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve connected users', detail: err.message });
  }
};