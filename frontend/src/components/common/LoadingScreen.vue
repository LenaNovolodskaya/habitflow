<template>
  <Transition name="loading-screen">
    <div v-if="show" class="loading-screen">
      <div class="loading-content">
        <img 
          src="/2cbb5e95b97aa2b496f6eaec84b9240d.gif" 
          alt="Loading" 
          class="loading-gif"
        />
        <div class="loading-text">HabitFlow</div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

export default {
  name: 'LoadingScreen',
  props: {
    isAuthenticated: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const route = useRoute()
    const show = ref(false)
    let timeoutId = null
    
    const checkAndShow = () => {
      try {
        // Проверяем, видел ли пользователь уже загрузочный экран
        const hasSeenLoading = localStorage.getItem('habitflow_has_seen_loading')
        const routeName = route?.name || ''
        const isAuthPage = routeName === 'Login' || routeName === 'Register' || !routeName
        
        // Показываем только если:
        // 1. Пользователь авторизован
        // 2. Мы НЕ на странице авторизации
        // 3. Пользователь еще не видел этот экран
        if (props.isAuthenticated && !isAuthPage && !hasSeenLoading && !show.value) {
          show.value = true
          localStorage.setItem('habitflow_has_seen_loading', 'true')
          
          // Очищаем предыдущий таймер если есть
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          
          // Скрываем через 2.5 секунды
          timeoutId = setTimeout(() => {
            show.value = false
          }, 2500)
        }
      } catch (error) {
        console.error('Ошибка в checkAndShow:', error)
      }
    }
    
    onMounted(() => {
      // Проверяем после монтирования с небольшой задержкой
      nextTick(() => {
        setTimeout(() => {
          checkAndShow()
        }, 500)
      })
    })
    
    watch(() => props.isAuthenticated, (newVal) => {
      if (newVal) {
        // Небольшая задержка, чтобы роутер успел переключиться
        nextTick(() => {
          setTimeout(() => {
            checkAndShow()
          }, 500)
        })
      }
    })
    
    watch(() => route?.name, () => {
      if (props.isAuthenticated) {
        nextTick(() => {
          setTimeout(() => {
            checkAndShow()
          }, 400)
        })
      }
    }, { immediate: true })
    
    onUnmounted(() => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    })
    
    return {
      show
    }
  }
}
</script>
