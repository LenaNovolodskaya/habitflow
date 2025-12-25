const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../utils/validation');

// Регистрация
router.post('/register', validate(registerSchema), AuthController.register);

// Вход
router.post('/login', validate(loginSchema), AuthController.login);

// Получение информации о текущем пользователе
router.get('/me', authenticateToken, AuthController.getMe);

module.exports = router;

