const pool = require('../config/database');

/**
 * Рассчитать общую статистику пользователя
 */
const calculateGeneralStats = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Получаем общее количество привычек
  const habitsQuery = `
    SELECT 
      COUNT(DISTINCT h.id) as total_habits,
      COUNT(DISTINCT CASE WHEN h.is_active THEN h.id END) as active_habits
    FROM habits h
    WHERE h.user_id = $1
  `;
  
  const habitsResult = await pool.query(habitsQuery, [userId]);
  const totalHabits = parseInt(habitsResult.rows[0].total_habits) || 0;
  const activeHabits = parseInt(habitsResult.rows[0].active_habits) || 0;
  
  // Получаем количество выполненных АКТИВНЫХ привычек сегодня
  // Важно: учитываем только активные привычки, чтобы процент не превышал 100%
  const todayCompletionsQuery = `
    SELECT COUNT(DISTINCT hc.habit_id) as completed_today
    FROM habit_completions hc
    INNER JOIN habits h ON hc.habit_id = h.id AND hc.user_id = h.user_id
    WHERE hc.user_id = $1 
      AND hc.completion_date = $2
      AND h.is_active = TRUE
  `;
  
  const todayResult = await pool.query(todayCompletionsQuery, [userId, today]);
  const completedToday = parseInt(todayResult.rows[0].completed_today) || 0;
  
  // Рассчитываем процент выполнения за сегодня
  const todayCompletionPercentage = activeHabits > 0 
    ? Math.round((completedToday / activeHabits) * 100 * 100) / 100 
    : 0;
  
  // Получаем текущие streaks с информацией о привычках
  const streaksQuery = `
    SELECT 
      COUNT(*) as total_streaks,
      SUM(current_streak) as total_current_streak
    FROM habit_streaks
    WHERE user_id = $1
  `;
  
  const streaksResult = await pool.query(streaksQuery, [userId]);
  const streaks = streaksResult.rows[0] || {};
  
  // Получаем привычку с лучшей текущей серией
  const bestCurrentStreakQuery = `
    SELECT 
      hs.current_streak as best_current_streak,
      h.title as best_current_streak_habit_title
    FROM habit_streaks hs
    INNER JOIN habits h ON hs.habit_id = h.id AND hs.user_id = h.user_id
    WHERE hs.user_id = $1 AND h.is_active = TRUE
    ORDER BY hs.current_streak DESC, hs.longest_streak DESC
    LIMIT 1
  `;
  
  const bestCurrentResult = await pool.query(bestCurrentStreakQuery, [userId]);
  const bestCurrent = bestCurrentResult.rows[0] || {};
  
  // Получаем привычку с лучшей общей серией
  const bestLongestStreakQuery = `
    SELECT 
      hs.longest_streak as best_longest_streak,
      h.title as best_longest_streak_habit_title
    FROM habit_streaks hs
    INNER JOIN habits h ON hs.habit_id = h.id AND hs.user_id = h.user_id
    WHERE hs.user_id = $1 AND h.is_active = TRUE
    ORDER BY hs.longest_streak DESC, hs.current_streak DESC
    LIMIT 1
  `;
  
  const bestLongestResult = await pool.query(bestLongestStreakQuery, [userId]);
  const bestLongest = bestLongestResult.rows[0] || {};
  
  // Получаем общее количество выполненных привычек за все время
  const totalCompletionsQuery = `
    SELECT COUNT(*) as total_completions
    FROM habit_completions
    WHERE user_id = $1
  `;
  
  const totalCompletionsResult = await pool.query(totalCompletionsQuery, [userId]);
  const totalCompletions = parseInt(totalCompletionsResult.rows[0]?.total_completions) || 0;
  
  return {
    total_habits: totalHabits,
    active_habits: activeHabits,
    completed_today: completedToday,
    today_completion_percentage: todayCompletionPercentage,
    total_streaks: parseInt(streaks.total_streaks) || 0,
    best_current_streak: parseInt(bestCurrent.best_current_streak) || 0,
    best_current_streak_habit_title: bestCurrent.best_current_streak_habit_title || null,
    best_longest_streak: parseInt(bestLongest.best_longest_streak) || 0,
    best_longest_streak_habit_title: bestLongest.best_longest_streak_habit_title || null,
    total_completions: totalCompletions
  };
};

/**
 * Рассчитать статистику за неделю
 */
const calculateWeeklyStats = async (userId, weekStart) => {
  if (!weekStart) {
    // Если weekStart не указан, использовать текущую неделю
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStartDate = new Date(today);
    weekStartDate.setDate(diff);
    weekStart = weekStartDate.toISOString().split('T')[0];
  }

  // Вычисляем конец недели (воскресенье)
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekEnd = weekEndDate.toISOString().split('T')[0];

  // Проверяем, есть ли кэшированная статистика
  const cachedQuery = `
    SELECT * FROM weekly_stats
    WHERE user_id = $1 AND week_start = $2
  `;
  
  const cachedResult = await pool.query(cachedQuery, [userId, weekStart]);
  
  if (cachedResult.rows.length > 0) {
    return cachedResult.rows[0];
  }

  // Рассчитываем на лету
  // Получаем активные привычки пользователя
  const habitsQuery = `
    SELECT COUNT(*) as total_habits
    FROM habits
    WHERE user_id = $1 AND is_active = true
  `;
  
  const habitsResult = await pool.query(habitsQuery, [userId]);
  const totalHabits = parseInt(habitsResult.rows[0].total_habits) || 0;
  
  if (totalHabits === 0) {
    return {
      week_start: weekStart,
      week_end: weekEnd,
      total_habits: 0,
      completed_habits: 0,
      completion_percentage: 0,
      best_streak: 0
    };
  }
  
  // Получаем количество уникальных дней, когда были выполнены АКТИВНЫЕ привычки
  const completionsQuery = `
    SELECT COUNT(DISTINCT hc.completion_date) as completed_days
    FROM habit_completions hc
    INNER JOIN habits h ON hc.habit_id = h.id AND hc.user_id = h.user_id
    WHERE hc.user_id = $1 
      AND hc.completion_date >= $2 
      AND hc.completion_date <= $3
      AND h.is_active = TRUE
  `;
  
  const completionsResult = await pool.query(completionsQuery, [userId, weekStart, weekEnd]);
  const completedDays = parseInt(completionsResult.rows[0].completed_days) || 0;
  
  // Максимальное количество возможных выполнений (7 дней * количество привычек)
  const maxPossibleCompletions = totalHabits * 7;
  
  // Получаем общее количество выполнений АКТИВНЫХ привычек за неделю
  const totalCompletionsQuery = `
    SELECT COUNT(*) as total_completions
    FROM habit_completions hc
    INNER JOIN habits h ON hc.habit_id = h.id AND hc.user_id = h.user_id
    WHERE hc.user_id = $1 
      AND hc.completion_date >= $2 
      AND hc.completion_date <= $3
      AND h.is_active = TRUE
  `;
  
  const totalCompletionsResult = await pool.query(totalCompletionsQuery, [userId, weekStart, weekEnd]);
  const totalCompletions = parseInt(totalCompletionsResult.rows[0].total_completions) || 0;
  
  // Рассчитываем процент выполнения
  const completionPercentage = maxPossibleCompletions > 0
    ? Math.round((totalCompletions / maxPossibleCompletions) * 100 * 100) / 100
    : 0;
  
  // Получаем лучший streak за неделю
  const bestStreakQuery = `
    SELECT MAX(current_streak) as best_streak
    FROM habit_streaks
    WHERE user_id = $1
  `;
  
  const bestStreakResult = await pool.query(bestStreakQuery, [userId]);
  const bestStreak = parseInt(bestStreakResult.rows[0].best_streak) || 0;
  
  const stats = {
    week_start: weekStart,
    week_end: weekEnd,
    total_habits: totalHabits,
    completed_habits: totalCompletions,
    completion_percentage: completionPercentage,
    best_streak: bestStreak,
    completed_days: completedDays
  };
  
  // Сохраняем в кэш для будущих запросов
  try {
    await pool.query(`
      INSERT INTO weekly_stats (user_id, week_start, week_end, total_habits, completed_habits, completion_percentage, best_streak)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, week_start) 
      DO UPDATE SET 
        total_habits = $4,
        completed_habits = $5,
        completion_percentage = $6,
        best_streak = $7
    `, [userId, weekStart, weekEnd, totalHabits, totalCompletions, completionPercentage, bestStreak]);
  } catch (error) {
    console.error('Ошибка сохранения недельной статистики:', error);
  }
  
  return stats;
};

/**
 * Рассчитать статистику за месяц
 */
const calculateMonthlyStats = async (userId, monthYear) => {
  if (!monthYear) {
    // Если monthYear не указан, использовать текущий месяц
    const today = new Date();
    monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  // Вычисляем начало и конец месяца
  const [year, month] = monthYear.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];
  const daysInMonth = new Date(year, month, 0).getDate();

  // Проверяем, есть ли кэшированная статистика
  const cachedQuery = `
    SELECT * FROM monthly_stats
    WHERE user_id = $1 AND month_year = $2
  `;
  
  const cachedResult = await pool.query(cachedQuery, [userId, monthYear]);
  
  if (cachedResult.rows.length > 0) {
    return cachedResult.rows[0];
  }

  // Рассчитываем на лету
  // Получаем активные привычки пользователя
  const habitsQuery = `
    SELECT COUNT(*) as total_habits
    FROM habits
    WHERE user_id = $1 AND is_active = true
  `;
  
  const habitsResult = await pool.query(habitsQuery, [userId]);
  const totalHabits = parseInt(habitsResult.rows[0].total_habits) || 0;
  
  if (totalHabits === 0) {
    return {
      month_year: monthYear,
      total_habits: 0,
      completed_habits: 0,
      completion_percentage: 0,
      best_day_completed: 0
    };
  }
  
  // Получаем общее количество выполнений АКТИВНЫХ привычек за месяц
  const totalCompletionsQuery = `
    SELECT COUNT(*) as total_completions
    FROM habit_completions hc
    INNER JOIN habits h ON hc.habit_id = h.id AND hc.user_id = h.user_id
    WHERE hc.user_id = $1 
      AND hc.completion_date >= $2 
      AND hc.completion_date <= $3
      AND h.is_active = TRUE
  `;
  
  const totalCompletionsResult = await pool.query(totalCompletionsQuery, [userId, monthStart, monthEnd]);
  const totalCompletions = parseInt(totalCompletionsResult.rows[0].total_completions) || 0;
  
  // Максимальное количество возможных выполнений (дни в месяце * количество привычек)
  const maxPossibleCompletions = totalHabits * daysInMonth;
  
  // Рассчитываем процент выполнения
  const completionPercentage = maxPossibleCompletions > 0
    ? Math.round((totalCompletions / maxPossibleCompletions) * 100 * 100) / 100
    : 0;
  
  // Получаем день с максимальным количеством выполнений АКТИВНЫХ привычек
  const bestDayQuery = `
    SELECT hc.completion_date, COUNT(*) as completions_count
    FROM habit_completions hc
    INNER JOIN habits h ON hc.habit_id = h.id AND hc.user_id = h.user_id
    WHERE hc.user_id = $1 
      AND hc.completion_date >= $2 
      AND hc.completion_date <= $3
      AND h.is_active = TRUE
    GROUP BY hc.completion_date
    ORDER BY completions_count DESC
    LIMIT 1
  `;
  
  const bestDayResult = await pool.query(bestDayQuery, [userId, monthStart, monthEnd]);
  const bestDayCompleted = bestDayResult.rows.length > 0 
    ? parseInt(bestDayResult.rows[0].completions_count) || 0 
    : 0;
  
  const stats = {
    month_year: monthYear,
    total_habits: totalHabits,
    completed_habits: totalCompletions,
    completion_percentage: completionPercentage,
    best_day_completed: bestDayCompleted
  };
  
  // Сохраняем в кэш для будущих запросов
  try {
    await pool.query(`
      INSERT INTO monthly_stats (user_id, month_year, total_habits, completed_habits, completion_percentage, best_day_completed)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, month_year) 
      DO UPDATE SET 
        total_habits = $3,
        completed_habits = $4,
        completion_percentage = $5,
        best_day_completed = $6
    `, [userId, monthYear, totalHabits, totalCompletions, completionPercentage, bestDayCompleted]);
  } catch (error) {
    console.error('Ошибка сохранения месячной статистики:', error);
  }
  
  return stats;
};

/**
 * Обновить ежедневную статистику
 */
const updateDailyStats = async (userId, date) => {
  try {
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }
    
    // Получаем активные привычки
    const habitsQuery = `
      SELECT COUNT(*) as total_habits
      FROM habits
      WHERE user_id = $1 AND is_active = true
    `;
    
    const habitsResult = await pool.query(habitsQuery, [userId]);
    const totalHabits = parseInt(habitsResult.rows[0].total_habits) || 0;
    
    // Получаем количество выполненных АКТИВНЫХ привычек за день
    // Важно: учитываем только активные привычки, чтобы процент не превышал 100%
    const completionsQuery = `
      SELECT COUNT(DISTINCT hc.habit_id) as completed_habits
      FROM habit_completions hc
      INNER JOIN habits h ON hc.habit_id = h.id AND hc.user_id = h.user_id
      WHERE hc.user_id = $1 
        AND hc.completion_date = $2
        AND h.is_active = TRUE
    `;
    
    const completionsResult = await pool.query(completionsQuery, [userId, date]);
    const completedHabits = parseInt(completionsResult.rows[0].completed_habits) || 0;
    
    // Рассчитываем процент выполнения
    const completionPercentage = totalHabits > 0
      ? Math.round((completedHabits / totalHabits) * 100 * 100) / 100
      : 0;
    
    // Сохраняем или обновляем ежедневную статистику
    await pool.query(`
      INSERT INTO daily_stats (user_id, stat_date, total_habits, completed_habits, completion_percentage)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, stat_date) 
      DO UPDATE SET 
        total_habits = $3,
        completed_habits = $4,
        completion_percentage = $5
    `, [userId, date, totalHabits, completedHabits, completionPercentage]);
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка обновления ежедневной статистики:', error);
    throw error;
  }
};

/**
 * Пересчитать всю статистику для пользователя
 */
const recalculateAllStats = async (userId) => {
  try {
    const today = new Date();
    
    // Обновляем ежедневную статистику
    await updateDailyStats(userId, today.toISOString().split('T')[0]);
    
    // Обновляем недельную статистику
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStartDate = new Date(today);
    weekStartDate.setDate(diff);
    const weekStart = weekStartDate.toISOString().split('T')[0];
    await calculateWeeklyStats(userId, weekStart);
    
    // Обновляем месячную статистику
    const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    await calculateMonthlyStats(userId, monthYear);
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка пересчета статистики:', error);
    throw error;
  }
};

/**
 * Получить привычки пользователя с их streaks
 */
const getHabitsWithStreaks = async (userId) => {
  try {
    const query = `
      SELECT 
        h.id as habit_id,
        h.title as habit_title,
        h.description,
        h.is_active,
        COALESCE(s.current_streak, 0) as current_streak,
        COALESCE(s.longest_streak, 0) as longest_streak,
        s.last_completion_date
      FROM habits h
      LEFT JOIN habit_streaks s ON h.id = s.habit_id AND h.user_id = s.user_id
      WHERE h.user_id = $1 AND h.is_active = TRUE
      ORDER BY COALESCE(s.longest_streak, 0) DESC, COALESCE(s.current_streak, 0) DESC, h.title ASC
    `;
    
    const result = await pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      habit_id: row.habit_id,
      habit_title: row.habit_title,
      current_streak: parseInt(row.current_streak) || 0,
      longest_streak: parseInt(row.longest_streak) || 0
    }));
  } catch (error) {
    console.error('Ошибка получения привычек с streaks:', error);
    throw error;
  }
};

module.exports = {
  calculateGeneralStats,
  calculateWeeklyStats,
  calculateMonthlyStats,
  updateDailyStats,
  recalculateAllStats,
  getHabitsWithStreaks
};

