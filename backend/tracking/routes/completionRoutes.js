const express = require('express');
const router = express.Router();
const completionController = require('../controllers/completionController');

// POST /api/completions - Создать отметку выполнения
router.post('/', completionController.createCompletion);

// GET /api/completions - Получить отметки (с фильтрами)
router.get('/', completionController.getCompletions);

// GET /api/completions/streak/:habitId - Получить streak для привычки
router.get('/streak/:habitId', completionController.getStreak);

module.exports = router;

