const pool = require('../config/database');

/**
 * Создать отметку выполнения привычки
 */
const createCompletion = async ({ habitId, userId, completionDate, notes }) => {
  const query = `
    INSERT INTO habit_completions (habit_id, user_id, completion_date, notes)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const result = await pool.query(query, [habitId, userId, completionDate, notes || null]);
  return result.rows[0];
};

/**
 * Получить отметки выполнения с фильтрами
 */
const getCompletions = async ({ userId, habitId, startDate, endDate }) => {
  let query = 'SELECT * FROM habit_completions WHERE 1=1';
  const params = [];
  let paramCount = 1;

  if (userId) {
    query += ` AND user_id = $${paramCount++}`;
    params.push(userId);
  }

  if (habitId) {
    query += ` AND habit_id = $${paramCount++}`;
    params.push(habitId);
  }

  if (startDate) {
    query += ` AND completion_date >= $${paramCount++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND completion_date <= $${paramCount++}`;
    params.push(endDate);
  }

  query += ' ORDER BY completion_date DESC';

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Получить текущий streak для привычки
 */
const getStreak = async (habitId, userId) => {
  // Получаем информацию о streak из таблицы habit_streaks
  const streakQuery = `
    SELECT * FROM habit_streaks
    WHERE habit_id = $1 AND user_id = $2
  `;
  
  const streakResult = await pool.query(streakQuery, [habitId, userId]);
  
  if (streakResult.rows.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_completion_date: null
    };
  }

  return streakResult.rows[0];
};

/**
 * Обновить streak для привычки
 */
const updateStreak = async (habitId, userId) => {
  try {
    // Получаем все отметки для привычки, отсортированные по дате (от новых к старым)
    const completionsQuery = `
      SELECT completion_date 
      FROM habit_completions 
      WHERE habit_id = $1 AND user_id = $2 
      ORDER BY completion_date DESC
    `;
    
    const completionsResult = await pool.query(completionsQuery, [habitId, userId]);
    const completions = completionsResult.rows;

    if (completions.length === 0) {
      // Если нет отметок, сбрасываем streak
      await pool.query(`
        INSERT INTO habit_streaks (habit_id, user_id, current_streak, longest_streak, last_completion_date)
        VALUES ($1, $2, 0, 0, NULL)
        ON CONFLICT (habit_id, user_id) 
        DO UPDATE SET 
          current_streak = 0,
          last_completion_date = NULL,
          updated_at = CURRENT_TIMESTAMP
      `, [habitId, userId]);
      return;
    }

    // Получаем текущий longest_streak из БД ПЕРЕД вычислением
    // Это важно, чтобы сохранить лучший результат даже при сбросе current_streak
    const existingStreakQuery = `
      SELECT longest_streak FROM habit_streaks 
      WHERE habit_id = $1 AND user_id = $2
    `;
    const existingResult = await pool.query(existingStreakQuery, [habitId, userId]);
    const existingLongestStreak = existingResult.rows.length > 0 
      ? (existingResult.rows[0].longest_streak || 0) 
      : 0;

    // Вычисляем текущий streak
    let currentStreak = 0;
    let calculatedLongestStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Начинаем с самой последней отметки
    let expectedDate = new Date(completions[0].completion_date);
    expectedDate.setHours(0, 0, 0, 0);
    
    // Проверяем, что последняя отметка не в будущем
    if (expectedDate > today) {
      expectedDate = today;
    }

    // Проверяем, не пропущен ли день
    // Если последняя отметка была более чем 1 день назад (не сегодня и не вчера), streak прерывается
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const daysDiff = Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Если последняя отметка была более чем 1 день назад, streak прерывается
    if (daysDiff > 1) {
      // Streak прерван, current_streak будет 0
      currentStreak = 0;
    } else {
      // Подсчитываем последовательные дни
      for (let i = 0; i < completions.length; i++) {
        const completionDate = new Date(completions[i].completion_date);
        completionDate.setHours(0, 0, 0, 0);
        
        // Если дата совпадает с ожидаемой, увеличиваем streak
        if (completionDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
          calculatedLongestStreak = Math.max(calculatedLongestStreak, currentStreak);
          
          // Переходим к предыдущему дню
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else if (completionDate < expectedDate) {
          // Если пропущен день, streak прерывается
          break;
        }
        // Если completionDate > expectedDate, пропускаем эту отметку (она уже учтена)
      }
    }

    // longest_streak должен быть максимальным из:
    // 1. Текущего вычисленного longestStreak (из последовательных дней)
    // 2. Текущего currentStreak (если он больше)
    // 3. Существующего longest_streak в БД (самое важное - сохраняем лучший результат)
    const finalLongestStreak = Math.max(
      calculatedLongestStreak,
      currentStreak,
      existingLongestStreak
    );

    // Обновляем или создаем запись streak
    const lastCompletionDate = completions[0].completion_date;
    
    await pool.query(`
      INSERT INTO habit_streaks (habit_id, user_id, current_streak, longest_streak, last_completion_date)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (habit_id, user_id) 
      DO UPDATE SET 
        current_streak = $3,
        longest_streak = $4,
        last_completion_date = $5,
        updated_at = CURRENT_TIMESTAMP
    `, [habitId, userId, currentStreak, finalLongestStreak, lastCompletionDate]);

  } catch (error) {
    console.error('Ошибка обновления streak:', error);
    throw error;
  }
};

module.exports = {
  createCompletion,
  getCompletions,
  getStreak,
  updateStreak
};

