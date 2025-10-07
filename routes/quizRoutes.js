const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Quiz CRUD operations
router.post('/', quizController.createQuiz);
router.get('/my-quizzes', quizController.getUserQuizzes);
router.get('/received', quizController.getReceivedQuizzes);
router.get('/:id', quizController.getQuizById);
router.delete('/:id', quizController.deleteQuiz);

// Quiz actions
router.post('/send', quizController.sendQuiz);
router.post('/submit', quizController.submitQuiz);

module.exports = router;

