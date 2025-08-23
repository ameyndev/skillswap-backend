const SkillRequest = require('../models/SkillRequest');
const UserSkill = require('../models/UserSkill');

// 📤 Send a request
exports.sendRequest = async (req, res) => {
  const { skillId, description } = req.body;
  const fromUser = req.user.userId;

  try {
    const skill = await UserSkill.findById(skillId);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });

    const request = new SkillRequest({
      fromUser,
      toUser: skill.createdBy,
      skill: skillId,
      description
    });

    await request.save();
    res.status(201).json({ message: 'Skill request sent', request });
  } catch (err) {
    res.status(500).json({ error: 'Could not send request', detail: err.message });
  }
};

// ✅ Accept or reject a request
exports.respondToRequest = async (req, res) => {
  const { requestId } = req.params;
  const { action } = req.body; // 'accept' or 'reject'
  const userId = req.user.userId;

  try {
    const request = await SkillRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.toUser.toString() !== userId)
      return res.status(403).json({ message: 'You are not authorized to respond to this request' });

    if (request.status !== 'pending')
      return res.status(400).json({ message: 'Request already responded to' });

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

// 📄 View sent or received requests
exports.getUserRequests = async (req, res) => {
  const userId = req.user.userId;

  try {
    const sent = await SkillRequest.find({ fromUser: userId })
      .populate('skill')
      .populate('toUser', 'username');

    const received = await SkillRequest.find({ toUser: userId })
      .populate('skill')
      .populate('fromUser', 'username');

    res.status(200).json({ sent, received });
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve requests', detail: err.message });
  }
};
