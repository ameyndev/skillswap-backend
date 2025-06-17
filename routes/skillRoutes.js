const express = require('express');
const router = express.Router();
const { createSkill, updateSkill, deleteSkill } = require('../controllers/skillController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, createSkill);
router.put('/:id', authMiddleware, updateSkill);
router.delete('/id', authMiddleware, deleteSkill);

module.exports = router;