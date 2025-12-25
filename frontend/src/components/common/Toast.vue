<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
          @click="removeToast(toast.id)"
        >
          <div class="toast-icon">
            <i :class="getIcon(toast.type)"></i>
          </div>
          <div class="toast-content">
            <p class="toast-message">{{ toast.message }}</p>
          </div>
          <button @click.stop="removeToast(toast.id)" class="toast-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script>
import { useToast } from '../../composables/useToast'

export default {
  name: 'Toast',
  setup() {
    const { toasts, removeToast } = useToast()
    
    const getIcon = (type) => {
      const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        delete: 'fas fa-trash-alt'
      }
      return icons[type] || icons.success
    }
    
    return {
      toasts,
      removeToast,
      getIcon
    }
  }
}
</script>

