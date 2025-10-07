const Chat = require('../models/Chat');
const SkillRequest = require('../models/SkillRequest');
const User = require('../models/User');

// Get or create a chat for a skill request
exports.getOrCreateChat = async (req, res) => {
  const { skillRequestId } = req.params;
  const userId = req.user.userId;

  try {
    // Verify the skill request exists and user is a participant
    const skillRequest = await SkillRequest.findById(skillRequestId);
    if (!skillRequest) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    // Check if user is either the sender or receiver
    if (skillRequest.fromUser.toString() !== userId && skillRequest.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to access this chat' });
    }

    // Check if skill request is accepted
    if (skillRequest.status !== 'accepted') {
      return res.status(400).json({ message: 'Chat is only available for accepted skill requests' });
    }

    // Find existing chat or create new one
    let chat = await Chat.findOne({ skillRequest: skillRequestId })
      .populate('participants', 'username fullName profilePicture')
      .populate('messages.sender', 'username fullName profilePicture');

    if (!chat) {
      chat = new Chat({
        participants: [skillRequest.fromUser, skillRequest.toUser],
        skillRequest: skillRequestId,
        messages: []
      });
      await chat.save();
      
      // Populate the newly created chat
      chat = await Chat.findById(chat._id)
        .populate('participants', 'username fullName profilePicture')
        .populate('messages.sender', 'username fullName profilePicture');
    }

    res.status(200).json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chat', error: error.message });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;
  const userId = req.user.userId;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is a participant
    const isParticipant = chat.participants.some(participant => 
      participant.toString() === userId
    );
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not authorized to send messages to this chat' });
    }

    // Add message to chat
    const message = {
      sender: userId,
      content,
      timestamp: new Date()
    };

    chat.messages.push(message);
    chat.lastMessage = content;
    chat.lastMessageTime = new Date();
    
    await chat.save();

    // Populate the sender info for the response
    const populatedChat = await Chat.findById(chatId)
      .populate('participants', 'username fullName profilePicture')
      .populate('messages.sender', 'username fullName profilePicture');

    const newMessage = populatedChat.messages[populatedChat.messages.length - 1];

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('message-received', newMessage);
    }

    res.status(201).json({ message: newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// Get user's chats
exports.getUserChats = async (req, res) => {
  const userId = req.user.userId;

  try {
    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'username fullName profilePicture')
    .populate('skillRequest', 'skillName status')
    .sort({ lastMessageTime: -1 });

    res.status(200).json({ chats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chats', error: error.message });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.userId;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Mark all messages from other participants as read
    chat.messages.forEach(message => {
      if (message.sender.toString() !== userId) {
        message.read = true;
      }
    });

    await chat.save();
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark messages as read', error: error.message });
  }
};
