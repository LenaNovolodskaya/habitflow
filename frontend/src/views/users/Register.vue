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
            v-model="loginEmail" 
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
            v-model="loginPassword" 
            required 
            placeholder="••••••••"
            class="form-input"
          />
        </div>
        
        <div v-if="loginError && activeTab === 'login'" class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          {{ loginError }}
        </div>
        
        <button type="submit" :disabled="loginLoading" class="btn btn-primary btn-block">
          <i class="fas fa-sign-in-alt" v-if="!loginLoading"></i>
          <i class="fas fa-spinner fa-spin" v-else></i>
          {{ loginLoading ? 'Вход...' : 'Войти' }}
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
              v-model="username" 
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
              v-model="email" 
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
            v-model="password" 
            required 
            placeholder="••••••••"
            minlength="6"
            class="form-input"
          />
        </div>
        
        <div v-if="error && activeTab === 'register'" class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          {{ error }}
        </div>
        
        <button type="submit" :disabled="loading" class="btn btn-primary btn-block">
          <i class="fas fa-user-plus" v-if="!loading"></i>
          <i class="fas fa-spinner fa-spin" v-else></i>
          {{ loading ? 'Регистрация...' : 'Зарегистрироваться' }}
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
  name: 'Register',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()
    
    const activeTab = ref('register')
    
    // Данные для регистрации
    const username = ref('')
    const email = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)
    
    // Данные для входа
    const loginEmail = ref('')
    const loginPassword = ref('')
    const loginError = ref('')
    const loginLoading = ref(false)
    
    const switchTab = (tab) => {
      activeTab.value = tab
      error.value = ''
      loginError.value = ''
      if (tab === 'register') {
        router.replace('/register')
      } else {
        router.replace('/login')
      }
    }
    
    const handleRegister = async () => {
      error.value = ''
      loading.value = true
      
      try {
        const result = await authStore.register({
          username: username.value,
          email: email.value,
          password: password.value
        })
        
        if (result.success) {
          router.push('/habits')
        } else {
          error.value = result.message
        }
      } catch (err) {
        console.error('Ошибка регистрации:', err)
        error.value = 'Ошибка подключения к серверу.'
      } finally {
        loading.value = false
      }
    }
    
    const handleLogin = async () => {
      loginError.value = ''
      loginLoading.value = true
      
      try {
        const result = await authStore.login(loginEmail.value, loginPassword.value)
        
        if (result.success) {
          await new Promise(resolve => setTimeout(resolve, 100))
          router.push('/habits')
        } else {
          loginError.value = result.message || 'Ошибка при входе. Проверьте email и пароль.'
        }
      } catch (err) {
        console.error('Ошибка входа:', err)
        loginError.value = 'Ошибка подключения к серверу.'
      } finally {
        loginLoading.value = false
      }
    }
    
    onMounted(() => {
      if (route.path === '/login') {
        activeTab.value = 'login'
      }
    })
    
    return {
      activeTab,
      username,
      email,
      password,
      error,
      loading,
      handleRegister,
      loginEmail,
      loginPassword,
      loginError,
      loginLoading,
      handleLogin,
      switchTab
    }
  }
}
</script>

