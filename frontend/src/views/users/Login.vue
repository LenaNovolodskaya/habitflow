<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <i class="fas fa-fire"></i>
        <h1>HabitFlow</h1>
      </div>
      
      <div class="auth-tabs" :class="{ 'register-active': activeTab === 'register' }">
        <button 
          class="auth-tab" 
          :class="{ active: activeTab === 'login' }"
          @click="switchTab('login')"
        >
          Вход
        </button>
        <button 
          class="auth-tab" 
          :class="{ active: activeTab === 'register' }"
          @click="switchTab('register')"
        >
          Регистрация
        </button>
      </div>
      
      <!-- Форма входа -->
      <form 
        v-show="activeTab === 'login'"
        @submit.prevent="handleLogin" 
        class="auth-form"
        :class="{ active: activeTab === 'login' }"
      >
        <div class="form-group">
          <label>
            <i class="fas fa-envelope"></i>
            Email
          </label>
          <input 
            type="email" 
            v-model="email" 
            required 
            placeholder="your@email.com"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>
            <i class="fas fa-lock"></i>
            Пароль
          </label>
          <input 
            type="password" 
            v-model="password" 
            required 
            placeholder="••••••••"
            class="form-input"
          />
        </div>
        
        <div v-if="error && activeTab === 'login'" class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          {{ error }}
        </div>
        
        <button type="submit" :disabled="loading" class="btn btn-primary btn-block">
          <i class="fas fa-sign-in-alt" v-if="!loading"></i>
          <i class="fas fa-spinner fa-spin" v-else></i>
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
      
      <!-- Форма регистрации -->
      <form 
        v-show="activeTab === 'register'"
        @submit.prevent="handleRegister" 
        class="auth-form"
        :class="{ active: activeTab === 'register' }"
      >
        <div class="form-row">
          <div class="form-group">
            <label>
              <i class="fas fa-user"></i>
              Имя пользователя
            </label>
            <input 
              type="text" 
              v-model="registerUsername" 
              required 
              placeholder="johndoe"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>
              <i class="fas fa-envelope"></i>
              Email
            </label>
            <input 
              type="email" 
              v-model="registerEmail" 
              required 
              placeholder="your@email.com"
              class="form-input"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label>
            <i class="fas fa-lock"></i>
            Пароль
          </label>
          <input 
            type="password" 
            v-model="registerPassword" 
            required 
            placeholder="••••••••"
            minlength="6"
            class="form-input"
          />
        </div>
        
        <div v-if="registerError && activeTab === 'register'" class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          {{ registerError }}
        </div>
        
        <button type="submit" :disabled="registerLoading" class="btn btn-primary btn-block">
          <i class="fas fa-user-plus" v-if="!registerLoading"></i>
          <i class="fas fa-spinner fa-spin" v-else></i>
          {{ registerLoading ? 'Регистрация...' : 'Зарегистрироваться' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()
    
    const activeTab = ref('login')
    
    // Данные для входа
    const email = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)
    
    // Данные для регистрации
    const registerUsername = ref('')
    const registerEmail = ref('')
    const registerPassword = ref('')
    const registerError = ref('')
    const registerLoading = ref(false)
    
    const switchTab = (tab) => {
      activeTab.value = tab
      error.value = ''
      registerError.value = ''
      if (tab === 'register') {
        router.replace('/register')
      } else {
        router.replace('/login')
      }
    }
    
    const handleLogin = async () => {
      error.value = ''
      loading.value = true
      
      try {
        const result = await authStore.login(email.value, password.value)
        
        if (result.success) {
          await new Promise(resolve => setTimeout(resolve, 100))
          router.push('/habits')
        } else {
          error.value = result.message || 'Ошибка при входе. Проверьте email и пароль.'
        }
      } catch (err) {
        console.error('Ошибка входа:', err)
        error.value = 'Ошибка подключения к серверу. Проверьте, что User Service запущен.'
      } finally {
        loading.value = false
      }
    }
    
    const handleRegister = async () => {
      registerError.value = ''
      registerLoading.value = true
      
      try {
        const result = await authStore.register({
          username: registerUsername.value,
          email: registerEmail.value,
          password: registerPassword.value
        })
        
        if (result.success) {
          router.push('/habits')
        } else {
          registerError.value = result.message
        }
      } catch (err) {
        console.error('Ошибка регистрации:', err)
        registerError.value = 'Ошибка подключения к серверу.'
      } finally {
        registerLoading.value = false
      }
    }
    
    onMounted(() => {
      if (route.path === '/register') {
        activeTab.value = 'register'
      }
    })
    
    return {
      activeTab,
      email,
      password,
      error,
      loading,
      handleLogin,
      registerUsername,
      registerEmail,
      registerPassword,
      registerError,
      registerLoading,
      handleRegister,
      switchTab
    }
  }
}
</script>

