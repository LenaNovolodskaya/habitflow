import { ref } from 'vue'

// Глобальное состояние для всех уведомлений
const toasts = ref([])
let toastId = 0

export const useToast = () => {
  const showToast = (message, type = 'success', duration = 3000) => {
    const id = toastId++
    const toast = {
      id,
      message,
      type, // 'success', 'error', 'info'
      duration
    }
    
    toasts.value.push(toast)
    
    // Автоматически удаляем уведомление после duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }
  
  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const success = (message, duration = 3000) => showToast(message, 'success', duration)
  const error = (message, duration = 4000) => showToast(message, 'error', duration)
  const info = (message, duration = 3000) => showToast(message, 'info', duration)
  const deleteToast = (message, duration = 3000) => showToast(message, 'delete', duration)
  
  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    delete: deleteToast
  }
}

