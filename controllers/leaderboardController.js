const User = require("../models/User");

// Get global leaderboard
const getLeaderboard = async (req, res) => {
	try {
		const { limit = 10, skill } = req.query;

		let leaderboard;

		if (skill) {
			// Get leaderboard for a specific skill
			leaderboard = await User.find({
				"skills.name": { $regex: new RegExp(skill, "i") },
			})
				.select("username fullName profilePicture totalPoints level skills")
				.lean();

			// Calculate skill-specific points and sort
			leaderboard = leaderboard
				.map((user) => {
					const userSkill = user.skills.find(
						(s) => s.name.toLowerCase() === skill.toLowerCase()
					);
					return {
						_id: user._id,
						username: user.username,
						fullName: user.fullName,
						profilePicture: user.profilePicture,
						totalPoints: user.totalPoints,
						level: user.level,
						skillPoints: userSkill ? userSkill.level : 0,
						skillName: skill,
					};
				})
				.sort((a, b) => b.skillPoints - a.skillPoints)
				.slice(0, parseInt(limit));
		} else {
			// Get global leaderboard
			leaderboard = await User.find()
				.select("username fullName profilePicture totalPoints level skills")
				.sort({ totalPoints: -1, level: -1 })
				.limit(parseInt(limit))
				.lean();

			// Add rank and level progress
			leaderboard = leaderboard.map((user, index) => {
				const userDoc = new User(user);
				const levelProgress = userDoc.getPointsForNextLevel();

				return {
					rank: index + 1,
					_id: user._id,
					username: user.username,
					fullName: user.fullName,
					profilePicture: user.profilePicture,
					totalPoints: user.totalPoints,
					level: user.level,
					levelProgress,
					topSkills: user.skills
						.sort((a, b) => b.level - a.level)
						.slice(0, 3)
						.map((s) => ({ name: s.name, points: s.level })),
				};
			});
		}

		res.json(leaderboard);
	} catch (error) {
		console.error("Error fetching leaderboard:", error);
		res.status(500).json({ error: "Failed to fetch leaderboard" });
	}
};

// Get user's rank
const getUserRank = async (req, res) => {
	try {
		const userId = req.user.id;

		const user = await User.findById(userId).select(
			"username fullName profilePicture totalPoints level skills"
		);

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		// Count users with higher points
		const rank =
			(await User.countDocuments({
				totalPoints: { $gt: user.totalPoints },
			})) + 1;

		// Get level progress
		const levelProgress = user.getPointsForNextLevel();

		// Get top skills
		const topSkills = user.skills
			.sort((a, b) => b.level - a.level)
			.slice(0, 5)
			.map((s) => ({ name: s.name, points: s.level }));

		res.json({
			rank,
			user: {
				_id: user._id,
				username: user.username,
				fullName: user.fullName,
				profilePicture: user.profilePicture,
				totalPoints: user.totalPoints,
				level: user.level,
				levelProgress,
				topSkills,
			},
		});
	} catch (error) {
		console.error("Error fetching user rank:", error);
		res.status(500).json({ error: "Failed to fetch user rank" });
	}
};

// Get leaderboard stats
const getLeaderboardStats = async (req, res) => {
	try {
		const totalUsers = await User.countDocuments();
		const totalPoints = await User.aggregate([
			{ $group: { _id: null, total: { $sum: "$totalPoints" } } },
		]);

		const topUser = await User.findOne()
			.select("username fullName totalPoints level")
			.sort({ totalPoints: -1 })
			.lean();

		const averageLevel = await User.aggregate([
			{ $group: { _id: null, avg: { $avg: "$level" } } },
		]);

		// Get most popular skills
		const skillStats = await User.aggregate([
			{ $unwind: "$skills" },
			{
				$group: {
					_id: "$skills.name",
					totalPoints: { $sum: "$skills.level" },
					userCount: { $sum: 1 },
				},
			},
			{ $sort: { totalPoints: -1 } },
			{ $limit: 5 },
		]);

		res.json({
			totalUsers,
			totalPoints: totalPoints[0]?.total || 0,
			averageLevel: Math.round(averageLevel[0]?.avg || 1),
			topUser,
			topSkills: skillStats.map((s) => ({
				name: s._id,
				totalPoints: s.totalPoints,
				userCount: s.userCount,
			})),
		});
	} catch (error) {
		console.error("Error fetching leaderboard stats:", error);
		res.status(500).json({ error: "Failed to fetch leaderboard stats" });
	}
};

module.exports = {
	getLeaderboard,
	getUserRank,
	getLeaderboardStats,
};
