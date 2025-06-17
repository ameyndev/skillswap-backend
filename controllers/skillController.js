const UserSkill = require('../models/UserSkill');

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
