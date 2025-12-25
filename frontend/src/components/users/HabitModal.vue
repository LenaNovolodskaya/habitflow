<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
      <div class="modal-header">
        <h2>{{ habit ? 'Редактировать привычку' : 'Новая привычка' }}</h2>
        <button @click="$emit('close')" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="modal-body">
        <div class="form-group">
          <label>
            <i class="fas fa-heading"></i>
            Название *
          </label>
          <input 
            type="text" 
            v-model="formData.title" 
            required 
            placeholder="Например: Пить 2 литра воды"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>
            <i class="fas fa-align-left"></i>
            Описание
          </label>
          <textarea 
            v-model="formData.description" 
            placeholder="Описание вашей привычки"
            class="form-input"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>
            <i class="fas fa-layer-group"></i>
            Сфера жизни *
          </label>
          <div class="select-wrapper">
            <select v-model="formData.lifeSphere" class="form-select" required>
              <option value="" disabled>Выберите сферу жизни</option>
              <option value="health">💪 Здоровье</option>
              <option value="work">💼 Работа/Карьера</option>
              <option value="relationships">❤️ Отношения</option>
              <option value="finance">💰 Финансы</option>
              <option value="education">📚 Образование</option>
              <option value="hobby">🎨 Хобби</option>
              <option value="spirituality">🧘 Духовность</option>
            </select>
            <i class="fas fa-chevron-down select-arrow"></i>
          </div>
        </div>
        
        <div class="form-group">
          <label>
            <i class="fas fa-bullseye"></i>
            Цель
          </label>
          <input 
            type="text" 
            v-model="formData.targetValue" 
            placeholder="Например: 2 литра, 30 минут, 2024-12-31 или просто текст"
            class="form-input"
          />
          <small class="form-hint">Можно указать число, дату или текст</small>
        </div>
        
        <div class="form-group">
          <label>
            <i class="fas fa-calendar"></i>
            Частота *
          </label>
          <div class="select-wrapper">
            <select v-model="formData.frequency" class="form-select" required>
              <option value="daily">Ежедневно</option>
              <option value="weekly">Еженедельно</option>
              <option value="monthly">Ежемесячно</option>
            </select>
            <i class="fas fa-chevron-down select-arrow"></i>
          </div>
        </div>
        
        <div v-if="habit" class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="formData.isActive"
            />
            <span>Активна</span>
          </label>
        </div>
        
        <div class="modal-footer">
          <button type="button" @click="$emit('close')" class="btn btn-secondary">
            Отмена
          </button>
          <button type="submit" :disabled="loading" class="btn btn-primary">
            <i class="fas fa-spinner fa-spin" v-if="loading"></i>
            <i class="fas fa-save" v-else></i>
            {{ loading ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </div>
      </form>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, onMounted } from 'vue'
import api from '../../services/users/api'
import { useToast } from '../../composables/useToast'

export default {
  name: 'HabitModal',
  props: {
    habit: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const loading = ref(false)
    const { success, error } = useToast()
    const formData = ref({
      title: '',
      description: '',
      targetValue: '',
      frequency: 'daily',
      lifeSphere: '',
      isActive: true
    })
    
    onMounted(() => {
      if (props.habit) {
        // Если есть target_value и unit, объединяем их
        let targetValue = ''
        if (props.habit.target_value && props.habit.unit) {
          targetValue = `${props.habit.target_value} ${props.habit.unit}`
        } else if (props.habit.target_value) {
          targetValue = String(props.habit.target_value)
        } else if (props.habit.unit) {
          targetValue = props.habit.unit
        }
        
        formData.value = {
          title: props.habit.title,
          description: props.habit.description || '',
          targetValue: targetValue,
          frequency: props.habit.frequency || 'daily',
          lifeSphere: props.habit.life_sphere && props.habit.life_sphere !== 'all' ? props.habit.life_sphere : '',
          isActive: props.habit.is_active !== false
        }
      }
    })
    
    const handleSubmit = async () => {
      loading.value = true
      
      try {
        const data = {
          title: formData.value.title,
          description: formData.value.description || null,
          targetValue: formData.value.targetValue || null,
          unit: null, // Единица измерения больше не используется
          frequency: formData.value.frequency,
          lifeSphere: formData.value.lifeSphere || 'all',
          isActive: props.habit ? formData.value.isActive : undefined
        }
        
        if (props.habit) {
          await api.put(`/habits/${props.habit.id}`, data)
          success(`Привычка "${formData.value.title}" успешно отредактирована`)
        } else {
          await api.post('/habits', data)
          success(`Привычка "${formData.value.title}" успешно создана! 🎉`)
        }
        
        emit('save')
      } catch (err) {
        error(err.response?.data?.message || 'Ошибка при сохранении привычки')
      } finally {
        loading.value = false
      }
    }
    
    return {
      formData,
      loading,
      handleSubmit
    }
  }
}
</script>

