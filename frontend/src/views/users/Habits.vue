<template>
  <div class="habits-page">
    <!-- Боковое меню сферами жизни -->
    <div class="sidebar-overlay" v-if="showSidebar" @click="showSidebar = false"></div>
    <div class="sidebar" :class="{ 'sidebar-open': showSidebar }">
      <div class="sidebar-header">
        <h3>Сферы жизни</h3>
        <button @click="showSidebar = false" class="btn-close-sidebar">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="sidebar-content">
        <button
          v-for="sphere in lifeSpheres"
          :key="sphere.id"
          @click="selectSphere(sphere.id)"
          class="sphere-item"
          :class="{ 'active': selectedSphere === sphere.id }"
        >
          <span class="sphere-icon">{{ sphere.icon }}</span>
          <span class="sphere-name">{{ sphere.name }}</span>
        </button>
      </div>
    </div>

    <div class="page-header">
      <h1 @click="showSidebar = true" class="page-title-clickable">
        <i class="fas fa-list"></i>
        Мои привычки
      </h1>
      <button @click="showAddModal = true" class="btn btn-primary">
        <i class="fas fa-plus"></i>
        Добавить привычку
      </button>
    </div>
    
    <div v-if="loading" class="habits-loading">
      <div v-for="n in 6" :key="n" class="habit-skeleton">
        <div class="skeleton-header">
          <div class="skeleton-line title"></div>
          <div class="skeleton-actions">
            <div class="skeleton-circle"></div>
            <div class="skeleton-circle"></div>
          </div>
        </div>
        <div class="skeleton-line description"></div>
        <div class="skeleton-meta">
          <div class="skeleton-badge"></div>
          <div class="skeleton-badge"></div>
        </div>
        <div class="skeleton-streak"></div>
        <div class="skeleton-button"></div>
      </div>
    </div>
    
    <div v-else-if="filteredHabits.length === 0" class="empty-state">
      <div class="gif-wrapper">
        <img src="/hobby-empty-state.gif" alt="Empty state" class="empty-icon slow-gif" />
      </div>
      <h2>У вас пока нет привычек</h2>
      <p v-if="selectedSphere !== 'all'">В этой сфере жизни пока нет привычек</p>
      <p v-else>Создайте свою первую привычку, чтобы начать отслеживать прогресс!</p>
    </div>
    
    <div v-else class="habits-grid">
      <div 
        v-for="habit in filteredHabits" 
        :key="habit.id" 
        class="habit-card"
        :class="{ 
          'inactive': !habit.is_active,
          'completed': isCompletedToday(habit.id)
        }"
      >
        <div class="habit-header">
          <h3>{{ habit.title }}</h3>
          <div class="habit-actions">
            <button @click="editHabit(habit)" class="btn-icon" title="Редактировать">
              <i class="fas fa-edit"></i>
            </button>
            <button @click="deleteHabit(habit.id)" class="btn-icon btn-danger" title="Удалить">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <p v-if="habit.description" class="habit-description">{{ habit.description }}</p>
        
        <div class="habit-meta">
          <span v-if="habit.target_value" class="habit-target">
            <i class="fas fa-bullseye"></i>
            Цель: {{ habit.target_value }}{{ habit.unit ? ' ' + habit.unit : '' }}
          </span>
          <span class="habit-frequency">
            <i class="fas fa-calendar"></i>
            {{ getFrequencyText(habit.frequency) }}
          </span>
        </div>
        
        <div class="habit-streak" v-if="habit.streak">
          <i class="fas fa-fire"></i>
          <span class="streak-count">{{ habit.streak.current_streak || 0 }}</span>
          <span class="streak-label">дней подряд</span>
        </div>
        
        <div class="habit-complete">
          <button 
            @click="completeHabit(habit.id)" 
            class="btn btn-success btn-block"
            :disabled="isCompletedToday(habit.id)"
            :class="{ 'btn-completed': isCompletedToday(habit.id) }"
          >
            <i :class="isCompletedToday(habit.id) ? 'fas fa-check-circle' : 'fas fa-check'"></i>
            {{ isCompletedToday(habit.id) ? '✓ Выполнено сегодня' : 'Отметить выполнение' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно добавления/редактирования -->
    <HabitModal 
      v-if="showAddModal || editingHabit"
      :habit="editingHabit"
      @close="closeModal"
      @save="handleSaveHabit"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/users/api'
import trackingApi from '../../services/tracking/trackingApi'
import HabitModal from '../../components/users/HabitModal.vue'
import { useToast } from '../../composables/useToast'

export default {
  name: 'Habits',
  components: {
    HabitModal
  },
  setup() {
    const habits = ref([])
    const loading = ref(true)
    const showAddModal = ref(false)
    const editingHabit = ref(null)
    const completedToday = ref(new Set())
    const showSidebar = ref(false)
    const selectedSphere = ref('all')
    const { success, error, delete: deleteToast } = useToast()
    
    const lifeSpheres = [
      { id: 'all', name: 'Все привычки', icon: '🌟' },
      { id: 'health', name: 'Здоровье', icon: '💪' },
      { id: 'work', name: 'Работа/Карьера', icon: '💼' },
      { id: 'relationships', name: 'Отношения', icon: '❤️' },
      { id: 'finance', name: 'Финансы', icon: '💰' },
      { id: 'education', name: 'Образование', icon: '📚' },
      { id: 'hobby', name: 'Хобби', icon: '🎨' },
      { id: 'spirituality', name: 'Духовность', icon: '🧘' }
    ]
    
    const filteredHabits = computed(() => {
      if (selectedSphere.value === 'all') {
        return habits.value
      }
      return habits.value.filter(habit => habit.life_sphere === selectedSphere.value)
    })
    
    const selectSphere = (sphereId) => {
      selectedSphere.value = sphereId
      showSidebar.value = false
    }
    
    const fetchHabits = async () => {
      try {
        loading.value = true
        
        // Проверяем наличие токена
        const token = localStorage.getItem('token')
        if (!token) {
          console.error('Токен отсутствует, редирект на логин')
          window.location.href = '/login'
          return
        }
        
        console.log('Загрузка привычек, токен:', token.substring(0, 20) + '...')
        const response = await api.get('/habits')
        
        if (response.data.success) {
          habits.value = response.data.data.habits || []
          // Отключаем loading сразу после загрузки привычек
          loading.value = false
          // Загружаем информацию о выполнении сегодня в фоне (не блокируем UI)
          loadTodayCompletions().catch(() => {
            // Игнорируем ошибки загрузки completions
          })
        }
      } catch (error) {
        console.error('Ошибка загрузки привычек:', error)
        habits.value = []
        
        // Если 401, редирект на логин
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('Токен невалидный, редирект на логин')
          localStorage.removeItem('token')
          window.location.href = '/login'
          return
        }
      } finally {
        loading.value = false
      }
    }
    
    const loadTodayCompletions = async () => {
      if (habits.value.length === 0) return
      
      const today = new Date().toISOString().split('T')[0]
      
      // Создаем все промисы сразу для параллельной загрузки
      const promises = habits.value.map(habit =>
        trackingApi.get(`/completions?habitId=${habit.id}&date=${today}`)
          .then(response => {
            // Проверяем формат ответа
            // Может быть response.data.data (массив) или response.data.data.completions (массив)
            let completions = []
            
            if (Array.isArray(response?.data?.data)) {
              completions = response.data.data
            } else if (Array.isArray(response?.data?.data?.completions)) {
              completions = response.data.data.completions
            }
            
            // Если есть хотя бы одна отметка, значит привычка выполнена сегодня
            if (completions.length > 0) {
              completedToday.value.add(habit.id)
            }
          })
          .catch(() => {
            // Игнорируем ошибки тихо (уже обработано в interceptor)
          })
      )
      
      // Используем Promise.allSettled для параллельной загрузки всех запросов
      await Promise.allSettled(promises)
    }
    
    const completeHabit = async (habitId) => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const habit = habits.value.find(h => h.id === habitId)
        
        const response = await trackingApi.post('/completions', {
          habitId,
          date: today
        })
        
        if (response.data.success) {
          // Сразу добавляем в Set для мгновенного обновления UI
          completedToday.value.add(habitId)
          
          // Обновляем streak (но не перезагружаем все привычки, чтобы не сбросить completedToday)
          await fetchHabits()
          
          // Убеждаемся, что привычка осталась в completedToday после перезагрузки
          completedToday.value.add(habitId)
          
          success(`Привычка "${habit?.title || ''}" отмечена как выполненная! 🎉`)
        }
      } catch (err) {
        error(err.response?.data?.message || 'Ошибка при отметке выполнения')
      }
    }
    
    const editHabit = (habit) => {
      editingHabit.value = { ...habit }
      showAddModal.value = true
    }
    
    const deleteHabit = async (id) => {
      const habit = habits.value.find(h => h.id === id)
      if (!confirm('Вы уверены, что хотите удалить эту привычку?')) return
      
      try {
        await api.delete(`/habits/${id}`)
        await fetchHabits()
        deleteToast(`Привычка "${habit?.title || ''}" успешно удалена`)
      } catch (err) {
        error('Ошибка при удалении привычки')
      }
    }
    
    const handleSaveHabit = async () => {
      await fetchHabits()
      closeModal()
    }
    
    const closeModal = () => {
      showAddModal.value = false
      editingHabit.value = null
    }
    
    const isCompletedToday = (habitId) => {
      return completedToday.value.has(habitId)
    }
    
    const getFrequencyText = (frequency) => {
      const map = {
        daily: 'Ежедневно',
        weekly: 'Еженедельно',
        monthly: 'Ежемесячно'
      }
      return map[frequency] || frequency
    }
    
    onMounted(() => {
      fetchHabits()
    })
    
    return {
      habits,
      loading,
      showAddModal,
      editingHabit,
      completeHabit,
      editHabit,
      deleteHabit,
      handleSaveHabit,
      closeModal,
      isCompletedToday,
      getFrequencyText,
      showSidebar,
      selectedSphere,
      lifeSpheres,
      filteredHabits,
      selectSphere
    }
  }
}
</script>

