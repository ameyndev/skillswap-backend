const UserSkill = require('../models/UserSkill');
const User = require('../models/User');

// Search Skills
exports.searchSkills = async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    // Search through User.skills instead of UserSkill collection
    const users = await User.find({
      'skills.name': { $regex: query, $options: 'i' },
      onboarded: true // Only search users who have completed onboarding
    })
    .select('username fullName email skills')
    .lean();

    // Transform the data to match the expected format
    const skills = [];
    users.forEach(user => {
      user.skills.forEach(skill => {
        if (skill.name.toLowerCase().includes(query.toLowerCase())) {
          skills.push({
            _id: skill._id || `${user._id}-${skill.name}`, // Create a unique ID
            name: skill.name,
            description: skill.description || '',
            category: '', // Not available in User.skills
            availability: [], // Not available in User.skills
            createdBy: {
              _id: user._id,
              username: user.username,
              email: user.email
            },
            createdAt: new Date() // Use current date as fallback
          });
        }
      });
    });

    // Sort by skill name
    skills.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({ skills });
  } catch (error) {
    res.status(500).json({ message: 'Failed to search skills', error: error.message });
  }
};

// Create Skill
exports.createSkill = async (req, res) => {
  const { name, category, description, availability } = req.body;

  try {
    const skill = new UserSkill({
      name,
      category,
      description,
      availability,
      createdBy: req.user.userId
    });

    const savedSkill = await skill.save();
    res.status(201).json({ message: 'Skill created successfully', skill: savedSkill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create skill', error: error.message });
  }
};

// Update Skill
exports.updateSkill = async (req, res) => {
  const skillId = req.params.id;
  const userId = req.user.userId;
  const { name, category, description, availability } = req.body;

  try {
    const skill = await UserSkill.findById(skillId);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });

    if (skill.createdBy.toString() !== userId)
      return res.status(403).json({ message: 'Unauthorized to update this skill' });

    // Update
    if (name) skill.name = name;
    if (category) skill.category = category;
    if (description) skill.description = description;
    if (availability) skill.availability = availability;

    await skill.save();
    res.status(200).json({ message: 'Skill updated successfully', skill });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update skill', detail: err.message });
  }
};

// Delete Skill
exports.deleteSkill = async (req, res) => {
  const skillId = req.params.id;
  const userId = req.user.userId;

  try {
    const skill = await UserSkill.findById(skillId);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });

    if (skill.createdBy.toString() !== userId)
      return res.status(403).json({ message: 'Unauthorized to delete this skill' });

    await skill.deleteOne();
    res.status(200).json({ message: 'Skill deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete skill', detail: err.message });
  }
};
