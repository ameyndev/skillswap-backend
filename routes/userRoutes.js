const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { isValidSkill } = require("../constants/predefinedSkills");

// Protected route for User Profile
router.get("/profile", authMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).select("-passwordHash");
		res.status(200).json(user);
	} catch (err) {
		res.status(500).json({ error: "Failed to fetch user profile" });
	}
});

// Protected route for Onboarding - add initial skill and mark onboarded
router.post("/onboard", authMiddleware, async (req, res) => {
	try {
		const { name, description } = req.body;

		if (!name || typeof name !== "string") {
			return res.status(400).json({ message: "Skill name is required" });
		}

		// Validate skill against predefined list
		if (!isValidSkill(name)) {
			return res
				.status(400)
				.json({
					message:
						"Invalid skill. Please select from the predefined skills list.",
				});
		}

		const user = await User.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// If user already onboarded, avoid duplicate onboarding
		if (user.onboarded) {
			return res.status(400).json({ message: "User already onboarded" });
		}

		user.skills = user.skills || [];
		user.skills.push({ name, description: description || "", level: 0 });
		user.onboarded = true;
		await user.save();

		const safeUser = await User.findById(user._id).select("-passwordHash");
		return res
			.status(200)
			.json({ message: "Onboarding complete", user: safeUser });
	} catch (err) {
		return res.status(500).json({ error: "Failed to complete onboarding" });
	}
});

// Protected route to add additional skills after onboarding
router.post("/skills", authMiddleware, async (req, res) => {
	try {
		const { name, description, level } = req.body;

		if (!name || typeof name !== "string") {
			return res.status(400).json({ message: "Skill name is required" });
		}

		// Validate skill against predefined list
		if (!isValidSkill(name)) {
			return res
				.status(400)
				.json({
					message:
						"Invalid skill. Please select from the predefined skills list.",
				});
		}

		const user = await User.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		user.skills = Array.isArray(user.skills) ? user.skills : [];
		user.skills.push({
			name: name.trim(),
			description: (description || "").trim(),
			level: Number(level) || 0,
		});
		// If user adds a skill here and wasn't onboarded, mark onboarded
		if (!user.onboarded) {
			user.onboarded = true;
		}
		await user.save();

		const safeUser = await User.findById(user._id).select("-passwordHash");
		return res.status(200).json({ message: "Skill added", user: safeUser });
	} catch (err) {
		return res.status(500).json({ error: "Failed to add skill" });
	}
});

// Protected route to delete a skill from user's profile
router.delete("/skills/:skillId", authMiddleware, async (req, res) => {
	try {
		const { skillId } = req.params;
		const user = await User.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const before = Array.isArray(user.skills) ? user.skills.length : 0;
		user.skills = (user.skills || []).filter(
			(s) => String(s._id) !== String(skillId)
		);
		const after = user.skills.length;

		if (before === after) {
			return res.status(404).json({ message: "Skill not found" });
		}

		await user.save();
		const safeUser = await User.findById(user._id).select("-passwordHash");
		return res.status(200).json({ message: "Skill deleted", user: safeUser });
	} catch (err) {
		return res.status(500).json({ error: "Failed to delete skill" });
	}
});

// GET all users
router.get("/", async (req, res) => {
	try {
		const users = await User.find();
		res.json(users);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// GET user by ID
router.get("/:id", async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) return res.status(404).json({ message: "User not found" });
		res.json(user);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// CREATE a new user
router.post("/", async (req, res) => {
	try {
		const newUser = new User(req.body);
		await newUser.save();
		res.status(201).json(newUser);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

// UPDATE user by ID
router.put("/:id", async (req, res) => {
	try {
		const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});
		if (!updatedUser)
			return res.status(404).json({ message: "User not found" });
		res.json(updatedUser);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

// DELETE user by ID
router.delete("/:id", async (req, res) => {
	try {
		const deletedUser = await User.findByIdAndDelete(req.params.id);
		if (!deletedUser)
			return res.status(404).json({ message: "User not found" });
		res.json({ message: "User deleted successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
