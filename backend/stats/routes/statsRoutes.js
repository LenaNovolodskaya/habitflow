const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticateToken } = require('../middleware/auth');

// GET /api/stats - Получить общую статистику пользователя
router.get('/', authenticateToken, statsController.getGeneralStats);

// GET /api/stats/weekly - Статистика за неделю
router.get('/weekly', authenticateToken, statsController.getWeeklyStats);

// GET /api/stats/monthly - Статистика за месяц
router.get('/monthly', authenticateToken, statsController.getMonthlyStats);

// GET /api/stats/habits - Получить привычки с их streaks
router.get('/habits', authenticateToken, statsController.getHabitsWithStreaks);

// POST /api/stats/recalculate - Пересчитать статистику (вызывается Tracking Service)
// Этот endpoint может вызываться без аутентификации (внутренний вызов от Tracking Service)
router.post('/recalculate', statsController.recalculateStats);

module.exports = router;

