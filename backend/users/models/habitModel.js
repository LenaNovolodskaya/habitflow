const pool = require('../config/database');

class HabitModel {
  // Создание новой привычки
  static async create(habitData) {
    const { userId, title, description, targetValue, unit, frequency, lifeSphere } = habitData;
    const query = `
      INSERT INTO habits (user_id, title, description, target_value, unit, frequency, life_sphere)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      title,
      description,
      targetValue,
      unit,
      frequency || 'daily',
      lifeSphere || 'all'
    ]);
    
    // Создаем запись streak для новой привычки
    await this.createStreak(result.rows[0].id, userId);
    
    return result.rows[0];
  }

  // Получение всех привычек пользователя
  static async findByUserId(userId, includeInactive = false) {
    let query = 'SELECT * FROM habits WHERE user_id = $1';
    const params = [userId];
    
    if (!includeInactive) {
      query += ' AND is_active = TRUE';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // Получение привычки по ID
  static async findById(id) {
    const query = 'SELECT * FROM habits WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Получение привычки по ID с проверкой владельца
  static async findByIdAndUserId(id, userId) {
    const query = 'SELECT * FROM habits WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Обновление привычки
  static async update(id, userId, habitData) {
    const { title, description, targetValue, unit, frequency, lifeSphere, isActive } = habitData;
    const query = `
      UPDATE habits 
      SET title = $1, description = $2, target_value = $3, 
          unit = $4, frequency = $5, life_sphere = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `;
    const result = await pool.query(query, [
      title,
      description,
      targetValue,
      unit,
      frequency,
      lifeSphere !== undefined ? lifeSphere : 'all',
      isActive !== undefined ? isActive : true,
      id,
      userId
    ]);
    return result.rows[0];
  }

  // Удаление привычки (мягкое удаление через is_active)
  static async delete(id, userId) {
    const query = `
      UPDATE habits 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Полное удаление привычки
  static async hardDelete(id, userId) {
    const query = 'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Создание записи streak для привычки
  static async createStreak(habitId, userId) {
    const query = `
      INSERT INTO habit_streaks (habit_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (habit_id, user_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [habitId, userId]);
    return result.rows[0];
  }

  // Проверка существования привычки
  static async exists(id) {
    const query = 'SELECT EXISTS(SELECT 1 FROM habits WHERE id = $1)';
    const result = await pool.query(query, [id]);
    return result.rows[0].exists;
  }
}

module.exports = HabitModel;

