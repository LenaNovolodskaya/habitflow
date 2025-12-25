const express = require('express');
const router = express.Router();
const NoteController = require('../controllers/noteController');
const { authenticateToken } = require('../middleware/auth');
const { validate, createNoteSchema, updateNoteSchema } = require('../utils/validation');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Создание заметки
router.post('/', validate(createNoteSchema), NoteController.create);

// Получение всех заметок пользователя
router.get('/', NoteController.getAll);

// Обновление заметки
router.put('/:id', validate(updateNoteSchema), NoteController.update);

// Удаление заметки
router.delete('/:id', NoteController.delete);

module.exports = router;

