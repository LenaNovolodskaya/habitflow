<template>
  <div class="stats-page">
    <div v-if="loading" class="stats-loading">
      <div class="stats-cards">
        <div v-for="n in 4" :key="n" class="stat-card-skeleton">
          <div class="skeleton-stat-icon"></div>
          <div class="skeleton-stat-content">
            <div class="skeleton-stat-line title"></div>
            <div class="skeleton-stat-line value"></div>
            <div class="skeleton-stat-line label"></div>
          </div>
        </div>
      </div>
      <div class="stats-section-skeleton">
        <div class="skeleton-section-title"></div>
        <div v-for="n in 3" :key="n" class="skeleton-streak-item"></div>
      </div>
    </div>
    
    <div v-else class="stats-container">
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-fire"></i>
          </div>
          <div class="stat-content">
            <h3>Текущая серия</h3>
            <p class="stat-value">{{ currentStreak || 0 }}</p>
            <p class="stat-label">дней подряд</p>
            <p v-if="currentStreakHabit" class="stat-habit-name">{{ currentStreakHabit }}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-trophy"></i>
          </div>
          <div class="stat-content">
            <h3>Лучшая серия</h3>
            <p class="stat-value">{{ longestStreak || 0 }}</p>
            <p class="stat-label">дней</p>
            <p v-if="longestStreakHabit" class="stat-habit-name">{{ longestStreakHabit }}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-content">
            <h3>Выполнено сегодня</h3>
            <p class="stat-value">{{ todayCompleted || 0 }}</p>
            <p class="stat-label">из {{ totalHabits || 0 }}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-percentage"></i>
          </div>
          <div class="stat-content">
            <h3>Процент выполнения</h3>
            <p class="stat-value">{{ completionPercentage || 0 }}%</p>
            <p class="stat-label">за эту неделю</p>
          </div>
        </div>
      </div>
      
      <div class="stats-section">
        <h2>Привычки с лучшими сериями</h2>
        <div v-if="habitsWithStreaks.length === 0" class="empty-state">
          <p>Пока нет данных о сериях выполнения</p>
        </div>
        <div v-else class="streaks-list">
          <div 
            v-for="item in habitsWithStreaks" 
            :key="item.habit_id"
            class="streak-item"
          >
            <div class="streak-info">
              <h4>{{ item.habit_title }}</h4>
              <p class="streak-days">
                <i class="fas fa-fire"></i>
                {{ item.current_streak || 0 }} дней подряд
              </p>
            </div>
            <div class="streak-badge">
              <span>Лучшая: {{ item.longest_streak || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import api from '../../services/users/api'
import statsApi from '../../services/stats/statsApi'
import { useAuthStore } from '../../stores/auth'

export default {
  name: 'Stats',
  setup() {
    const loading = ref(true)
    const currentStreak = ref(0)
    const currentStreakHabit = ref(null)
    const longestStreak = ref(0)
    const longestStreakHabit = ref(null)
    const todayCompleted = ref(0)
    const totalHabits = ref(0)
    const completionPercentage = ref(0)
    const habitsWithStreaks = ref([])
    
    const { state: authState } = useAuthStore()
    
    const fetchStats = async () => {
      try {
        loading.value = true
        
        const user = authState.user
        const userId = user?.id || user?.user_id
        
        if (!userId) {
          loading.value = false
          return
        }
        
        // Загружаем привычки с streaks из Stats Service
        try {
          const habitsResponse = await statsApi.get(`/stats/habits?userId=${userId}`)
          if (habitsResponse?.data?.success && habitsResponse.data.data?.habits) {
            habitsWithStreaks.value = habitsResponse.data.data.habits
            totalHabits.value = habitsWithStreaks.value.length
            
            // Вычисляем статистику на основе привычек
            if (habitsWithStreaks.value.length > 0) {
              const allCurrentStreaks = habitsWithStreaks.value.map(h => h.current_streak).filter(s => s > 0)
              const allLongestStreaks = habitsWithStreaks.value.map(h => h.longest_streak).filter(s => s > 0)
              
              currentStreak.value = allCurrentStreaks.length > 0 ? Math.max(...allCurrentStreaks) : 0
              longestStreak.value = allLongestStreaks.length > 0 ? Math.max(...allLongestStreaks) : 0
            }
          }
        } catch (error) {
          // Если Stats Service недоступен, загружаем из User Service как fallback
          console.warn('Stats Service недоступен, используем User Service:', error)
          const habitsResponse = await api.get('/habits')
          if (habitsResponse.data.success) {
            const habits = habitsResponse.data.data.habits
            totalHabits.value = habits.length
            habitsWithStreaks.value = habits.map(habit => ({
              habit_id: habit.id,
              habit_title: habit.title,
              current_streak: habit.streak?.current_streak || 0,
              longest_streak: habit.streak?.longest_streak || 0
            }))
          }
        }
        
        // Загружаем общую статистику из Stats Service
        statsApi.get(`/stats?userId=${userId}`).then(statsResponse => {
          if (statsResponse?.data?.success) {
            const stats = statsResponse.data.data
            if (stats.best_current_streak !== undefined) {
              currentStreak.value = stats.best_current_streak
              currentStreakHabit.value = stats.best_current_streak_habit_title || null
            }
            if (stats.best_longest_streak !== undefined) {
              longestStreak.value = stats.best_longest_streak
              longestStreakHabit.value = stats.best_longest_streak_habit_title || null
            }
            if (stats.today_completion_percentage !== undefined) completionPercentage.value = stats.today_completion_percentage
            if (stats.completed_today !== undefined) todayCompleted.value = stats.completed_today
          }
        }).catch(() => {
          // Игнорируем ошибки statsApi
        })
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error)
      } finally {
        loading.value = false
      }
    }
    
    onMounted(() => {
      fetchStats()
    })
    
    return {
      loading,
      currentStreak,
      currentStreakHabit,
      longestStreak,
      longestStreakHabit,
      todayCompleted,
      totalHabits,
      completionPercentage,
      habitsWithStreaks
    }
  }
}
</script>

