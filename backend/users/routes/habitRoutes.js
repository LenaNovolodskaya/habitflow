const express = require('express');
const router = express.Router();
const HabitController = require('../controllers/habitController');
const { authenticateToken } = require('../middleware/auth');
const { validate, createHabitSchema, updateHabitSchema } = require('../utils/validation');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Создание привычки
router.post('/', validate(createHabitSchema), HabitController.create);

// Получение всех привычек пользователя
router.get('/', HabitController.getAll);

// Получение привычки по ID
router.get('/:id', HabitController.getById);

// Обновление привычки
router.put('/:id', validate(updateHabitSchema), HabitController.update);

// Удаление привычки
router.delete('/:id', HabitController.delete);

module.exports = router;

