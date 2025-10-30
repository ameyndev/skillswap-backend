const mongoose = require("mongoose");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const SkillRequest = require("../models/SkillRequest");

// Create a new quiz
const createQuiz = async (req, res) => {
	try {
		const { title, description, skillName, questions } = req.body;
		const userId = req.user.id;

		// Validate questions
		if (!questions || questions.length < 1 || questions.length > 10) {
			return res
				.status(400)
				.json({ error: "Quiz must have between 1 and 10 questions" });
		}

		// Validate each question has exactly one correct answer
		for (let i = 0; i < questions.length; i++) {
			const question = questions[i];
			if (!question.options || question.options.length !== 4) {
				return res
					.status(400)
					.json({ error: `Question ${i + 1} must have exactly 4 options` });
			}

			const correctAnswers = question.options.filter(
				(option) => option.isCorrect
			).length;
			if (correctAnswers !== 1) {
				return res
					.status(400)
					.json({
						error: `Question ${i + 1} must have exactly one correct answer`,
					});
			}
		}

		const quiz = new Quiz({
			title,
			description,
			skillName,
			questions,
			createdBy: userId,
		});

		await quiz.save();
		await quiz.populate("createdBy", "username fullName");

		res.status(201).json(quiz);
	} catch (error) {
		console.error("Error creating quiz:", error);
		res.status(500).json({ error: "Failed to create quiz" });
	}
};

// Get all quizzes created by the user
const getUserQuizzes = async (req, res) => {
	try {
		const userId = req.user.id;
		const quizzes = await Quiz.find({ createdBy: userId })
			.populate("createdBy", "username fullName")
			.populate("sentTo", "username fullName")
			.populate("completedBy", "username fullName")
			.sort({ createdAt: -1 });

		res.json(quizzes);
	} catch (error) {
		console.error("Error fetching user quizzes:", error);
		res.status(500).json({ error: "Failed to fetch quizzes" });
	}
};

// Get quizzes sent to the user
const getReceivedQuizzes = async (req, res) => {
	try {
		const userId = req.user.id;
		const quizzes = await Quiz.find({ sentTo: userId })
			.populate("createdBy", "username fullName")
			.populate("sentTo", "username fullName")
			.sort({ createdAt: -1 });

		res.json(quizzes);
	} catch (error) {
		console.error("Error fetching received quizzes:", error);
		res.status(500).json({ error: "Failed to fetch received quizzes" });
	}
};

// Send quiz to another user
const sendQuiz = async (req, res) => {
	try {
		const { quizId, toUserId, skillRequestId } = req.body;
		const userId = req.user.id;

		// Validate ObjectId format for toUserId
		if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
			return res
				.status(400)
				.json({ error: "Invalid toUserId format. Must be a valid ObjectId." });
		}

		// Validate ObjectId format for quizId
		if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
			return res
				.status(400)
				.json({ error: "Invalid quizId format. Must be a valid ObjectId." });
		}

		// Validate ObjectId format for skillRequestId if provided
		if (skillRequestId && !mongoose.Types.ObjectId.isValid(skillRequestId)) {
			return res
				.status(400)
				.json({
					error: "Invalid skillRequestId format. Must be a valid ObjectId.",
				});
		}

		const quiz = await Quiz.findById(quizId);
		if (!quiz) {
			return res.status(404).json({ error: "Quiz not found" });
		}

		if (quiz.createdBy.toString() !== userId) {
			return res
				.status(403)
				.json({ error: "You can only send quizzes you created" });
		}

		// Verify the skill request exists and is associated with the correct users
		if (skillRequestId) {
			const skillRequest = await SkillRequest.findById(skillRequestId);
			if (!skillRequest) {
				return res.status(404).json({ error: "Skill request not found" });
			}

			if (
				skillRequest.fromUser.toString() !== userId ||
				skillRequest.toUser.toString() !== toUserId
			) {
				return res
					.status(403)
					.json({ error: "Invalid skill request association" });
			}
		}

		quiz.sentTo = toUserId;
		quiz.skillRequestId = skillRequestId;
		quiz.status = "sent";

		await quiz.save();
		await quiz.populate("sentTo", "username fullName");

		res.json(quiz);
	} catch (error) {
		console.error("Error sending quiz:", error);
		res.status(500).json({ error: "Failed to send quiz" });
	}
};

// Submit quiz answers
const submitQuiz = async (req, res) => {
	try {
		const { quizId, answers } = req.body;
		const userId = req.user.id;

		const quiz = await Quiz.findById(quizId);
		if (!quiz) {
			return res.status(404).json({ error: "Quiz not found" });
		}

		if (quiz.sentTo.toString() !== userId) {
			return res
				.status(403)
				.json({ error: "You can only submit quizzes sent to you" });
		}

		if (quiz.status === "completed") {
			return res.status(400).json({ error: "Quiz has already been completed" });
		}

		// Calculate score
		let score = 0;
		const results = [];

		for (let i = 0; i < quiz.questions.length; i++) {
			const question = quiz.questions[i];
			const userAnswer = answers[i];

			if (userAnswer !== undefined) {
				const isCorrect = question.options[userAnswer].isCorrect;
				if (isCorrect) {
					score++;
				}
				results.push({
					questionIndex: i,
					userAnswer,
					isCorrect,
					correctAnswer: question.options.findIndex((opt) => opt.isCorrect),
				});
			}
		}

		// Update quiz
		quiz.status = "completed";
		quiz.completedBy = userId;
		quiz.score = score;
		quiz.completedAt = new Date();

		await quiz.save();

		// Update user's points and level (5 points per correct answer)
		const pointsEarned = score * 5;
		const updatedUser = await updateUserPoints(
			userId,
			pointsEarned,
			quiz.skillName
		);

		res.json({
			quiz,
			score,
			totalQuestions: quiz.questions.length,
			percentage: Math.round((score / quiz.questions.length) * 100),
			pointsEarned,
			totalPoints: updatedUser.totalPoints,
			level: updatedUser.level,
			levelProgress: updatedUser.getPointsForNextLevel(),
			results,
		});
	} catch (error) {
		console.error("Error submitting quiz:", error);
		res.status(500).json({ error: "Failed to submit quiz" });
	}
};

// Helper function to update user points and level
const updateUserPoints = async (userId, pointsToAdd, skillName) => {
	try {
		const user = await User.findById(userId);
		if (!user) throw new Error("User not found");

		// Add points
		user.totalPoints += pointsToAdd;

		// Calculate and update level
		user.level = user.calculateLevel();

		// Also update skill-specific level
		if (skillName) {
			const existingSkill = user.skills.find(
				(skill) => skill.name.toLowerCase() === skillName.toLowerCase()
			);

			if (existingSkill) {
				existingSkill.level += pointsToAdd;
			} else {
				user.skills.push({
					name: skillName,
					level: pointsToAdd,
					description: `Skill gained through quiz completion`,
				});
			}
		}

		await user.save();
		return user;
	} catch (error) {
		console.error("Error updating user points:", error);
		throw error;
	}
};

// Legacy function - keep for backward compatibility
const updateUserSkillPoints = async (
	userId,
	skillName,
	correctAnswers,
	totalQuestions
) => {
	try {
		const user = await User.findById(userId);
		if (!user) return;

		// Calculate points based on percentage (e.g., 80%+ = 10 points, 60-79% = 5 points, etc.)
		const percentage = (correctAnswers / totalQuestions) * 100;
		let pointsToAdd = 0;

		if (percentage >= 80) {
			pointsToAdd = 10;
		} else if (percentage >= 60) {
			pointsToAdd = 5;
		} else if (percentage >= 40) {
			pointsToAdd = 2;
		}

		if (pointsToAdd > 0) {
			// Find existing skill or create new one
			const existingSkill = user.skills.find(
				(skill) => skill.name.toLowerCase() === skillName.toLowerCase()
			);

			if (existingSkill) {
				existingSkill.level += pointsToAdd;
			} else {
				user.skills.push({
					name: skillName,
					level: pointsToAdd,
					description: `Skill gained through quiz completion`,
				});
			}

			await user.save();
		}
	} catch (error) {
		console.error("Error updating user skill points:", error);
	}
};

// Get quiz by ID
const getQuizById = async (req, res) => {
	try {
		const { id } = req.params;
		const quiz = await Quiz.findById(id)
			.populate("createdBy", "username fullName")
			.populate("sentTo", "username fullName")
			.populate("completedBy", "username fullName");

		if (!quiz) {
			return res.status(404).json({ error: "Quiz not found" });
		}

		res.json(quiz);
	} catch (error) {
		console.error("Error fetching quiz:", error);
		res.status(500).json({ error: "Failed to fetch quiz" });
	}
};

// Delete quiz
const deleteQuiz = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;

		const quiz = await Quiz.findById(id);
		if (!quiz) {
			return res.status(404).json({ error: "Quiz not found" });
		}

		if (quiz.createdBy.toString() !== userId) {
			return res
				.status(403)
				.json({ error: "You can only delete quizzes you created" });
		}

		await Quiz.findByIdAndDelete(id);
		res.json({ message: "Quiz deleted successfully" });
	} catch (error) {
		console.error("Error deleting quiz:", error);
		res.status(500).json({ error: "Failed to delete quiz" });
	}
};

module.exports = {
	createQuiz,
	getUserQuizzes,
	getReceivedQuizzes,
	sendQuiz,
	submitQuiz,
	getQuizById,
	deleteQuiz,
};
