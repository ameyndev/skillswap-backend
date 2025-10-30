const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
	username: { type: String, unique: true },
	fullName: String,
	email: { type: String, unique: true },
	passwordHash: String,
	bio: String,
	profilePicture: String,
	location: String,
	// Onboarding fields
	onboarded: { type: Boolean, default: false },
	skills: [
		{
			name: { type: String, required: true },
			description: { type: String },
			level: { type: Number, default: 0, min: 0 },
		},
	],
	// Leaderboard and point system
	totalPoints: { type: Number, default: 0, min: 0 },
	level: { type: Number, default: 1, min: 1 },
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	createdAt: { type: Date, default: Date.now },
});

// Calculate level based on points with 50% difficulty increase per level
userSchema.methods.calculateLevel = function () {
	let points = this.totalPoints;
	let level = 1;
	let pointsNeeded = 100; // Points needed for level 1

	while (points >= pointsNeeded) {
		points -= pointsNeeded;
		level++;
		pointsNeeded = Math.floor(pointsNeeded * 1.5); // 50% increase
	}

	return level;
};

// Get points needed for next level
userSchema.methods.getPointsForNextLevel = function () {
	let points = this.totalPoints;
	let level = 1;
	let pointsNeeded = 100;
	let currentLevelPoints = 0;

	while (points >= pointsNeeded) {
		points -= pointsNeeded;
		currentLevelPoints = pointsNeeded;
		level++;
		pointsNeeded = Math.floor(pointsNeeded * 1.5);
	}

	return {
		currentLevel: level,
		pointsInCurrentLevel: points,
		pointsNeededForNextLevel: pointsNeeded,
		progressPercentage: Math.round((points / pointsNeeded) * 100),
	};
};

module.exports = mongoose.model("User", userSchema);
