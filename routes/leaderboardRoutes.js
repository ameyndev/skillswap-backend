const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderboardController");
const authMiddleware = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Leaderboard routes
router.get("/", leaderboardController.getLeaderboard);
router.get("/my-rank", leaderboardController.getUserRank);
router.get("/stats", leaderboardController.getLeaderboardStats);

module.exports = router;
