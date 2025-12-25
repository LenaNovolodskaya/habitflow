const statsService = require('../services/calculationService');

/**
 * Получить общую статистику пользователя
 * GET /api/stats?userId=1
 */
const getGeneralStats = async (req, res) => {
  try {
    // Получаем userId из токена или из query параметра (для обратной совместимости)
    const userId = req.user?.id || req.query.userId;

    // Валидация
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим userId'
      });
    }

    if (isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'userId должен быть числом'
      });
    }

    const stats = await statsService.calculateGeneralStats(parseInt(userId));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Ошибка получения общей статистики:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Получить статистику за неделю
 * GET /api/stats/weekly?userId=1&weekStart=2024-01-01
 */
const getWeeklyStats = async (req, res) => {
  try {
    // Получаем userId из токена или из query параметра (для обратной совместимости)
    const userId = req.user?.id || req.query.userId;
    const { weekStart } = req.query;

    // Валидация
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим userId'
      });
    }

    if (isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'userId должен быть числом'
      });
    }

    // Валидация weekStart, если указан
    if (weekStart && isNaN(new Date(weekStart).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'weekStart должен быть валидной датой (формат: YYYY-MM-DD)'
      });
    }

    const stats = await statsService.calculateWeeklyStats(parseInt(userId), weekStart);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Ошибка получения недельной статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении недельной статистики',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Получить статистику за месяц
 * GET /api/stats/monthly?userId=1&monthYear=2024-01
 */
const getMonthlyStats = async (req, res) => {
  try {
    // Получаем userId из токена или из query параметра (для обратной совместимости)
    const userId = req.user?.id || req.query.userId;
    const { monthYear } = req.query;

    // Валидация
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим userId'
      });
    }

    if (isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'userId должен быть числом'
      });
    }

    // Валидация monthYear, если указан
    if (monthYear && !/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({
        success: false,
        message: 'monthYear должен быть в формате YYYY-MM (например, 2024-01)'
      });
    }

    const stats = await statsService.calculateMonthlyStats(parseInt(userId), monthYear);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Ошибка получения месячной статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении месячной статистики',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Пересчитать статистику для пользователя
 * POST /api/stats/recalculate
 * Вызывается Tracking Service при создании отметки
 */
const recalculateStats = async (req, res) => {
  try {
    const { userId } = req.body;

    // Валидация
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим userId'
      });
    }

    if (isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'userId должен быть числом'
      });
    }

    // Пересчитываем статистику асинхронно (не блокируем ответ)
    statsService.recalculateAllStats(parseInt(userId))
      .then(() => {
        console.log(`Статистика пересчитана для пользователя ${userId}`);
      })
      .catch((error) => {
        console.error(`Ошибка пересчета статистики для пользователя ${userId}:`, error);
      });

    // Сразу возвращаем ответ, не ждем завершения пересчета
    res.json({
      success: true,
      message: 'Запрос на пересчет статистики принят'
    });
  } catch (error) {
    console.error('Ошибка пересчета статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при пересчете статистики'
    });
  }
};

/**
 * Получить привычки с их streaks
 * GET /api/stats/habits?userId=1
 */
const getHabitsWithStreaks = async (req, res) => {
  try {
    // Получаем userId из токена или из query параметра (для обратной совместимости)
    const userId = req.user?.id || req.query.userId;

    // Валидация
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Необходим userId'
      });
    }

    if (isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'userId должен быть числом'
      });
    }

    const habits = await statsService.getHabitsWithStreaks(parseInt(userId));

    res.json({
      success: true,
      data: { habits }
    });
  } catch (error) {
    console.error('Ошибка получения привычек с streaks:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении привычек с streaks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getGeneralStats,
  getWeeklyStats,
  getMonthlyStats,
  recalculateStats,
  getHabitsWithStreaks
};

