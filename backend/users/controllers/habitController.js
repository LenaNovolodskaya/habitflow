const HabitModel = require('../models/habitModel');
const axios = require('axios');

const STATS_SERVICE_URL = process.env.STATS_SERVICE_URL || 'http://stats-service:8003';

class HabitController {
  // Создание новой привычки
  static async create(req, res) {
    try {
      const userId = req.user.id;
      const { title, description, targetValue, unit, frequency, lifeSphere } = req.body;

      // Обрабатываем targetValue - конвертируем строку в число если возможно
      let processedTargetValue = null
      if (targetValue !== null && targetValue !== undefined && targetValue !== '') {
        const numValue = parseFloat(targetValue)
        processedTargetValue = isNaN(numValue) ? null : numValue
      }

      const habit = await HabitModel.create({
        userId,
        title,
        description,
        targetValue: processedTargetValue,
        unit: unit || null,
        frequency: frequency || 'daily',
        lifeSphere: lifeSphere || 'all'
      });

      res.status(201).json({
        success: true,
        message: 'Привычка успешно создана',
        data: { habit }
      });
    } catch (error) {
      console.error('Ошибка создания привычки:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при создании привычки'
      });
    }
  }

  // Получение всех привычек пользователя
  static async getAll(req, res) {
    try {
      const userId = req.user.id;
      const includeInactive = req.query.includeInactive === 'true';

      const habits = await HabitModel.findByUserId(userId, includeInactive);

      res.json({
        success: true,
        data: { habits }
      });
    } catch (error) {
      console.error('Ошибка получения привычек:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении привычек'
      });
    }
  }

  // Получение привычки по ID
  static async getById(req, res) {
    try {
      const userId = req.user.id;
      const habitId = parseInt(req.params.id);

      const habit = await HabitModel.findByIdAndUserId(habitId, userId);
      
      if (!habit) {
        return res.status(404).json({
          success: false,
          message: 'Привычка не найдена'
        });
      }

      res.json({
        success: true,
        data: { habit }
      });
    } catch (error) {
      console.error('Ошибка получения привычки:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении привычки'
      });
    }
  }

  // Обновление привычки
  static async update(req, res) {
    try {
      const userId = req.user.id;
      const habitId = parseInt(req.params.id);

      // Проверка существования и принадлежности привычки
      const existingHabit = await HabitModel.findByIdAndUserId(habitId, userId);
      if (!existingHabit) {
        return res.status(404).json({
          success: false,
          message: 'Привычка не найдена'
        });
      }

      const habit = await HabitModel.update(habitId, userId, req.body);

      res.json({
        success: true,
        message: 'Привычка успешно обновлена',
        data: { habit }
      });
    } catch (error) {
      console.error('Ошибка обновления привычки:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении привычки'
      });
    }
  }

  // Удаление привычки
  static async delete(req, res) {
    try {
      const userId = req.user.id;
      const habitId = parseInt(req.params.id);

      // Проверка существования и принадлежности привычки
      const existingHabit = await HabitModel.findByIdAndUserId(habitId, userId);
      if (!existingHabit) {
        return res.status(404).json({
          success: false,
          message: 'Привычка не найдена'
        });
      }

      await HabitModel.delete(habitId, userId);

      // Уведомляем Stats Service об удалении привычки (асинхронно, не блокируем ответ)
      axios.post(`${STATS_SERVICE_URL}/api/stats/recalculate`, 
        { userId },
        { timeout: 2000 }
      ).catch(err => {
        // Не критично, если Stats Service недоступен
        console.log('Stats Service недоступен для уведомления об удалении:', err.message);
      });

      res.json({
        success: true,
        message: 'Привычка успешно удалена'
      });
    } catch (error) {
      console.error('Ошибка удаления привычки:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при удалении привычки'
      });
    }
  }
}

module.exports = HabitController;

