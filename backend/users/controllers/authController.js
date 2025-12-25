const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const { generateToken } = require('../middleware/auth');

class AuthController {
  // Регистрация пользователя
  static async register(req, res) {
    try {
      const { username, email, password, fullName } = req.body;

      // Проверка существования пользователя
      const existingUserByEmail = await UserModel.findByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует'
        });
      }

      const existingUserByUsername = await UserModel.findByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким именем уже существует'
        });
      }

      // Хеширование пароля
      const passwordHash = await bcrypt.hash(password, 10);

      // Создание пользователя
      const user = await UserModel.create({
        username,
        email,
        passwordHash,
        fullName: fullName || null
      });

      // Генерация токена
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: 'Пользователь успешно зарегистрирован',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name
          },
          token
        }
      });
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при регистрации пользователя'
      });
    }
  }

  // Вход пользователя
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Поиск пользователя
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Неверный email или пароль'
        });
      }

      // Проверка пароля
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Неверный email или пароль'
        });
      }

      // Генерация токена
      const token = generateToken(user);

      res.json({
        success: true,
        message: 'Вход выполнен успешно',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name
          },
          token
        }
      });
    } catch (error) {
      console.error('Ошибка входа:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при входе'
      });
    }
  }

  // Получение информации о текущем пользователе
  static async getMe(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Ошибка получения профиля:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении профиля'
      });
    }
  }
}

module.exports = AuthController;

