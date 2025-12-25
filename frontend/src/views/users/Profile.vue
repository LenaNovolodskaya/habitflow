<template>
  <div class="profile-page">
    <div v-if="loading" class="profile-loading">
      <div class="profile-loading-header">
        <div class="loading-avatar"></div>
        <div class="loading-header-text">
          <div class="loading-line title"></div>
          <div class="loading-line email"></div>
          <div class="loading-badge"></div>
        </div>
      </div>
      <div class="profile-loading-content">
        <div class="loading-info-item"></div>
        <div class="loading-info-item"></div>
        <div class="loading-info-item"></div>
      </div>
    </div>
    
    <div v-else class="profile-card">
      <div class="profile-header">
        <div class="profile-avatar-wrapper">
          <div class="profile-avatar">
            <span class="avatar-initial">{{ getInitial(user) }}</span>
          </div>
          <div class="avatar-ring"></div>
        </div>
        <h2>{{ user?.username || 'Пользователь' }}</h2>
        <p class="profile-email">{{ user?.email }}</p>
        <div class="profile-badge">
          <i class="fas fa-star"></i>
          <span>Активный пользователь</span>
        </div>
      </div>
      
      <div class="profile-content">
        <div class="profile-info-compact">
          <div class="info-item-compact">
            <div class="info-icon-compact">
              <i class="fas fa-envelope"></i>
            </div>
            <div class="info-content-compact">
              <label>Email</label>
              <p>{{ user?.email }}</p>
            </div>
          </div>
          
          <div class="info-item-compact">
            <div class="info-icon-compact">
              <i class="fas fa-calendar"></i>
            </div>
            <div class="info-content-compact">
              <label>Дата регистрации</label>
              <p>{{ formatDate(user?.created_at) }}</p>
            </div>
          </div>
          
          <div class="info-item-compact">
            <div class="info-icon-compact">
              <i class="fas fa-fire"></i>
            </div>
            <div class="info-content-compact">
              <label>Дней с нами</label>
              <p>{{ getDaysSinceRegistration(user?.created_at) }} дней</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Секция заметок -->
      <div class="notes-section">
        <div class="notes-header">
          <h3>Мои заметки</h3>
          <button @click="showNoteModal = true" class="btn btn-primary">
            <i class="fas fa-plus"></i>
            Добавить заметку
          </button>
        </div>
        
        <div v-if="notes.length === 0" class="empty-notes">
          <p>У вас пока нет заметок</p>
        </div>
        
        <div v-else class="notes-grid">
          <div v-for="note in notes" :key="note.id" class="note-card">
            <div class="note-header">
              <h4>{{ note.title }}</h4>
              <div class="note-actions">
                <button @click="editNote(note)" class="btn-icon" title="Редактировать">
                  <i class="fas fa-edit"></i>
                </button>
                <button @click="deleteNote(note.id)" class="btn-icon btn-danger" title="Удалить">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div class="note-content">{{ note.content }}</div>
            <div class="note-date">{{ formatDate(note.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно заметки -->
    <div v-if="showNoteModal" class="modal-overlay" @click.self="closeNoteModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingNote ? 'Редактировать заметку' : 'Новая заметка' }}</h2>
          <button @click="closeNoteModal" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>
              <i class="fas fa-heading"></i>
              Заголовок
            </label>
            <input 
              type="text" 
              v-model="noteForm.title" 
              placeholder="Введите заголовок"
              class="form-input"
              required
            />
          </div>
          <div class="form-group">
            <label>
              <i class="fas fa-align-left"></i>
              Содержание
            </label>
            <textarea 
              v-model="noteForm.content" 
              placeholder="Введите текст заметки"
              class="form-input"
              rows="5"
              required
            ></textarea>
          </div>
          <div class="modal-actions">
            <button @click="closeNoteModal" class="btn btn-secondary">Отмена</button>
            <button @click="saveNote" class="btn btn-primary">
              {{ editingNote ? 'Сохранить' : 'Создать' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import api from '../../services/users/api'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

export default {
  name: 'Profile',
  setup() {
    const loading = ref(true)
    const user = ref(null)
    const { success, error, delete: deleteToast } = useToast()
    const notes = ref([])
    const showNoteModal = ref(false)
    const editingNote = ref(null)
    const noteForm = ref({
      title: '',
      content: ''
    })
    const authStore = useAuthStore()
    
    const fetchProfile = async () => {
      try {
        loading.value = true
        const response = await api.get('/auth/me')
        if (response.data.success) {
          user.value = response.data.data.user
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error)
      } finally {
        loading.value = false
      }
    }
    
    const fetchNotes = async () => {
      try {
        const response = await api.get('/notes')
        if (response.data.success) {
          notes.value = response.data.data.notes || []
        }
      } catch (error) {
        console.error('Ошибка загрузки заметок:', error)
      }
    }
    
    const addNote = () => {
      editingNote.value = null
      noteForm.value = { title: '', content: '' }
      showNoteModal.value = true
    }
    
    const editNote = (note) => {
      editingNote.value = note
      noteForm.value = {
        title: note.title || '',
        content: note.content || ''
      }
      showNoteModal.value = true
    }
    
    const deleteNote = async (id) => {
      const note = notes.value.find(n => n.id === id)
      if (!confirm('Вы уверены, что хотите удалить эту заметку?')) return
      
      try {
        await api.delete(`/notes/${id}`)
        await fetchNotes()
        deleteToast(`Заметка "${note?.title || ''}" успешно удалена`)
      } catch (err) {
        error('Ошибка при удалении заметки')
      }
    }
    
    const saveNote = async () => {
      try {
        if (editingNote.value) {
          await api.put(`/notes/${editingNote.value.id}`, noteForm.value)
          success(`Заметка "${noteForm.value.title}" успешно отредактирована`)
        } else {
          await api.post('/notes', noteForm.value)
          success(`Заметка "${noteForm.value.title}" успешно создана! 📝`)
        }
        await fetchNotes()
        closeNoteModal()
      } catch (err) {
        error(err.response?.data?.message || 'Ошибка при сохранении заметки')
      }
    }
    
    const closeNoteModal = () => {
      showNoteModal.value = false
      editingNote.value = null
      noteForm.value = { title: '', content: '' }
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return 'Не указано'
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    const getInitial = (user) => {
      if (!user) return '?'
      const name = user.username || ''
      return name.charAt(0).toUpperCase()
    }
    
    const getDaysSinceRegistration = (dateString) => {
      if (!dateString) return '0'
      const regDate = new Date(dateString)
      const today = new Date()
      const diffTime = Math.abs(today - regDate)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }
    
    onMounted(() => {
      fetchProfile()
      fetchNotes()
    })
    
    return {
      loading,
      user,
      notes,
      showNoteModal,
      editingNote,
      noteForm,
      formatDate,
      getInitial,
      getDaysSinceRegistration,
      addNote,
      editNote,
      deleteNote,
      saveNote,
      closeNoteModal
    }
  }
}
</script>

