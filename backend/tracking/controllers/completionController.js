const completionModel = require('../models/completionModel');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://users-service:8001';
const STATS_SERVICE_URL = process.env.STATS_SERVICE_URL || 'http://stats-service:8003';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Получить userId из токена
 */
const getUserIdFromToken = (authHeader) => {
  try {
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.id;
  } catch (error) {
    return null;
  }
};

/**
 * Проверить существование пользователя через User Service или БД
 */
const checkUserExists = async (userId, authToken = null) => {
  try {
    // Если есть токен, пытаемся проверить через API
    if (authToken) {
      try {
        const response = await axios.get(`${USERS_SERVICE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          timeout: 2000,
          validateStatus: () => true
        });
        
        if (response.status === 200 && response.data.success) {
          return response.data.data.user.id === parseInt(userId);
        }
      } catch (apiError) {
        // Если API недоступен, проверяем через БД
        console.log('User Service API недоступен, проверяем через БД');
      }
    }
    
    // Проверяем напрямую через БД
    const pool = require('../config/database');
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Ошибка проверки пользователя:', error);
    return false;
  }
};

/**
 * Проверить существование привычки через User Service или БД
 */
const checkHabitExists = async (habitId, userId, authToken = null) => {
  try {
    // Пытаемся получить привычку через API (если есть токен)
    if (authToken) {
      try {
        const response = await axios.get(`${USERS_SERVICE_URL}/api/habits/${habitId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          timeout: 2000,
          validateStatus: () => true
        });
        
        if (response.status === 200 && response.data.success) {
          const habit = response.data.data.habit;
          return habit.user_id === parseInt(userId) && habit.is_active;
        }
      } catch (apiError) {
        // Если API недоступен, проверяем через БД
        console.log('User Service API недоступен, проверяем через БД');
      }
    }
    
    // Проверяем напрямую через БД
    const pool = require('../config/database');
    const result = await pool.query(
      'SELECT id, user_id, is_active FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, userId]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return result.rows[0].is_active;
  } catch (error) {
    console.error('Ошибка проверки привычки:', error);
    return false;
  }
};

/**
 * Уведомить Stats Service об обновлении
 */
const notifyStatsService = async (userId) => {
  try {
    await axios.post(`${STATS_SERVICE_URL}/api/stats/recalculate`, 
      { userId },
      { timeout: 2000 } // Таймаут 2 секунды, чтобы не блокировать основной запрос
    );
  } catch (error) {
    // Не критично, если Stats Service недоступен
    console.log('Stats Service недоступен для уведомления:', error.message);
  }
};

/**
 * Создать отметку выполнения привычки
 * POST /api/completions
 */
const createCompletion = async (req, res) => {
  try {
    const { habitId, userId: userIdFromBody, completionDate, date, notes } = req.body;

    // Получаем userId из токена или из body
    const userIdFromToken = getUserIdFromToken(req.headers.authorization);
    const userId = userIdFromToken || userIdFromBody;

    // Валидация обязательных полей
    if (!habitId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим habitId'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим userId (из токена или body)'
      });
    }

    // Используем date или completionDate
    const completionDateValue = date || completionDate;
    if (!completionDateValue) {
      return res.status(400).json({
        success: false,
        message: 'Необходима дата (date или completionDate)'
      });
    }

    // Валидация типов
    if (isNaN(parseInt(habitId)) || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'habitId и userId должны быть числами'
      });
    }

    // Валидация формата даты
    const dateObj = new Date(completionDateValue);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Дата должна быть валидной (формат: YYYY-MM-DD)'
      });
    }

    // Получаем токен из заголовков (если есть)
    const authToken = req.headers.authorization?.split(' ')[1] || null;

    // Проверка существования пользователя
    const userExists = await checkUserExists(userId, authToken);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверка существования привычки
    const habitExists = await checkHabitExists(habitId, userId, authToken);
    if (!habitExists) {
      return res.status(404).json({
        success: false,
        message: 'Привычка не найдена или неактивна'
      });
    }
    
    // Форматируем дату (оставляем только YYYY-MM-DD)
    const formattedDate = completionDateValue.split('T')[0];

    // Создать отметку
    const completion = await completionModel.createCompletion({
      habitId: parseInt(habitId),
      userId: parseInt(userId),
      completionDate: formattedDate,
      notes: notes || null
    });

    // Обновить streak
    await completionModel.updateStreak(habitId, userId);

    // Уведомить Stats Service об обновлении (асинхронно, не блокируем ответ)
    notifyStatsService(userId).catch(err => {
      console.log('Не удалось уведомить Stats Service:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Отметка выполнения создана',
      data: completion
    });
  } catch (error) {
    console.error('Ошибка создания отметки:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        message: 'Привычка уже отмечена на эту дату'
      });
    }

    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        message: 'Неверный habitId или userId'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при создании отметки',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Получить отметки выполнения
 * GET /api/completions?userId=1&habitId=2&startDate=2024-01-01&endDate=2024-01-31&date=2024-12-24
 */
const getCompletions = async (req, res) => {
  try {
    const { userId: userIdFromQuery, habitId, startDate, endDate, date } = req.query;

    // Получаем userId из токена или из query
    const userIdFromToken = getUserIdFromToken(req.headers.authorization);
    const userId = userIdFromToken || userIdFromQuery;

    // Валидация userId (обязателен, если нет в токене)
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим userId (из токена или query параметра)'
      });
    }

    // Если указана конкретная дата, используем её как startDate и endDate
    let finalStartDate = startDate;
    let finalEndDate = endDate;
    
    if (date) {
      finalStartDate = date;
      finalEndDate = date;
    }

    if (isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'userId должен быть числом'
      });
    }

    // Валидация дат, если указаны
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'startDate должен быть валидной датой (формат: YYYY-MM-DD)'
      });
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'endDate должен быть валидной датой (формат: YYYY-MM-DD)'
      });
    }

    // Проверка, что startDate <= endDate
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'startDate не может быть позже endDate'
      });
    }

    const completions = await completionModel.getCompletions({
      userId: parseInt(userId),
      habitId: habitId ? parseInt(habitId) : null,
      startDate: finalStartDate || null,
      endDate: finalEndDate || null
    });

    res.json({
      success: true,
      count: completions.length,
      data: completions
    });
  } catch (error) {
    console.error('Ошибка получения отметок:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении отметок',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Получить streak для привычки
 * GET /api/completions/streak/:habitId?userId=1
 */
const getStreak = async (req, res) => {
  try {
    const { habitId } = req.params;
    const { userId } = req.query;

    // Валидация
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим userId'
      });
    }

    if (!habitId || isNaN(parseInt(habitId))) {
      return res.status(400).json({
        success: false,
        message: 'Неверный habitId'
      });
    }

    if (isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'userId должен быть числом'
      });
    }

    const streak = await completionModel.getStreak(parseInt(habitId), parseInt(userId));

    res.json({
      success: true,
      data: streak
    });
  } catch (error) {
    console.error('Ошибка получения streak:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении streak',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createCompletion,
  getCompletions,
  getStreak
};

