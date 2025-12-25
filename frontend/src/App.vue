<template>
  <div id="app">
    <LoadingScreen :isAuthenticated="isAuthenticated && isInitialized" />
    <nav class="navbar" v-if="isAuthenticated && isInitialized">
      <div class="nav-container">
        <router-link to="/habits" class="nav-logo">
          <i class="fas fa-fire"></i>
          <span>HabitFlow</span>
        </router-link>
        <div class="nav-menu">
          <router-link to="/habits" class="nav-link">
            <i class="fas fa-list"></i>
            <span>Привычки</span>
          </router-link>
          <router-link to="/stats" class="nav-link">
            <i class="fas fa-chart-line"></i>
            <span>Статистика</span>
          </router-link>
          <router-link to="/profile" class="nav-link">
            <i class="fas fa-user"></i>
            <span>Профиль</span>
          </router-link>
          <button @click="logout" class="nav-link logout-btn">
            <i class="fas fa-sign-out-alt"></i>
            <span>Выход</span>
          </button>
        </div>
      </div>
    </nav>
    <main class="main-content" :class="{ 'has-stars': currentRoute === 'Stats' || currentRoute === 'Profile' }">
      <router-view />
    </main>
    <Toast />
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import Toast from './components/common/Toast.vue'
import LoadingScreen from './components/common/LoadingScreen.vue'

export default {
  name: 'App',
  components: {
    Toast,
    LoadingScreen
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()
    
    const currentRoute = computed(() => route.name)
    
    const isAuthenticated = computed(() => {
      // Показываем навигацию только если:
      // 1. Пользователь авторизован (isAuthenticated = true)
      // 2. Инициализация завершена
      // 3. Есть явный флаг авторизации
      const auth = authStore.isAuthenticated
      const init = authStore.state.isInitialized
      const explicit = authStore.state._explicitAuth
      
      return auth && init && explicit
    })
    const isInitialized = computed(() => authStore.state.isInitialized)
    
    const logout = () => {
      console.log('🚪 App: начинаем выход')
      authStore.logout()
      // Используем replace вместо push, чтобы не было истории назад
      router.replace('/login').then(() => {
        console.log('🚪 App: перенаправление на /login выполнено')
      })
    }
    
    return {
      isAuthenticated,
      isInitialized,
      logout,
      currentRoute
    }
  }
}
</script>

