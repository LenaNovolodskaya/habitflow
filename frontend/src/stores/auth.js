import { reactive, computed } from 'vue'
import api from '../services/users/api'

const state = reactive({
  user: null,
  token: null,
  isInitialized: false,
  _explicitAuth: false // Явный флаг авторизации
})

// НЕ инициализируем токен здесь - только при вызове init()
// Это предотвращает ложное определение авторизации до проверки токена

export function useAuthStore() {
  const isAuthenticated = computed(() => {
    // КРИТИЧЕСКИ ВАЖНО: проверяем ВСЕ условия
    // Токен должен быть установлен ТОЛЬКО после успешной проверки
    // _explicitAuth гарантирует, что авторизация была явно подтверждена
    const hasExplicitAuth = !!state._explicitAuth
    const hasToken = !!state.token
    const hasUser = !!state.user
    const isInit = !!state.isInitialized
    
    const result = !!(hasExplicitAuth && hasToken && hasUser && isInit)
    
    // Логируем только если результат неожиданный
    if (result && (!hasExplicitAuth || !hasToken || !hasUser || !isInit)) {
      console.error('⚠️ isAuthenticated = true, но условия не выполнены:', {
        _explicitAuth: hasExplicitAuth,
        hasToken,
        hasUser,
        isInit,
        result
      })
    }
    
    return result
  })
  
  const login = async (email, password) => {
    try {
      console.log('Попытка входа:', email)
      const response = await api.post('/auth/login', { email, password })
      console.log('Ответ сервера:', response.data)
      
      if (response.data.success) {
        state.token = response.data.data.token
        state.user = response.data.data.user
        state.isInitialized = true
        state._explicitAuth = true // Явно помечаем как авторизованного
        localStorage.setItem('token', state.token)
        api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        console.log('Вход успешен')
        return { success: true }
      }
      return { success: false, message: response.data.message || 'Ошибка при входе' }
    } catch (error) {
      console.error('Ошибка входа:', error)
      console.error('Детали ошибки:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Ошибка подключения к серверу' 
      }
    }
  }
  
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      if (response.data.success) {
        state.token = response.data.data.token
        state.user = response.data.data.user
        state.isInitialized = true
        state._explicitAuth = true // Явно помечаем как авторизованного
        localStorage.setItem('token', state.token)
        api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        return { success: true }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Ошибка регистрации:', error)
      console.error('Детали ошибки:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Обработка ошибок валидации
      if (error.response?.status === 400 && error.response?.data?.errors) {
        // Если есть массив ошибок валидации, объединяем их в одно сообщение
        const validationErrors = error.response.data.errors
          .map(err => `${err.field}: ${err.message}`)
          .join('; ')
        return { 
          success: false, 
          message: validationErrors || error.response.data.message || 'Ошибка валидации'
        }
      }
      
      return { 
        success: false, 
        message: error.response?.data?.message || 'Ошибка при регистрации' 
      }
    }
  }
  
  const logout = () => {
    console.log('🚪 Logout: очищаем состояние')
    state.token = null
    state.user = null
    state._explicitAuth = false // Сбрасываем явный флаг
    state.isInitialized = true // Устанавливаем true, чтобы роутер знал, что состояние проверено
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    console.log('🚪 Logout: состояние очищено', {
      hasToken: !!state.token,
      hasUser: !!state.user,
      _explicitAuth: state._explicitAuth,
      isInitialized: state.isInitialized
    })
  }
  
  const init = async () => {
    console.log('🔍 Auth init START, isInitialized:', state.isInitialized)
    
    // Если уже инициализирован, не проверяем снова
    if (state.isInitialized) {
      console.log('⏭️ Уже инициализирован, пропускаем')
      return
    }
    
    // ВАЖНО: НЕ устанавливаем токен в state до проверки!
    // Сначала проверяем, есть ли токен в localStorage
    const savedToken = localStorage.getItem('token')
    console.log('🔑 Токен в localStorage:', savedToken ? 'есть' : 'нет')
    
    // Если нет токена, просто помечаем как инициализированный
    if (!savedToken) {
      state.token = null
      state.user = null
      state._explicitAuth = false
      state.isInitialized = true
      console.log('❌ Токен отсутствует, пользователь НЕ авторизован')
      return
    }
    
    // НЕ устанавливаем state.token здесь! Только для запроса
    // Устанавливаем токен только в заголовки API для проверки
    api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
    console.log('🔑 Токен установлен в заголовки, проверяем валидность...')
    
    // Проверяем валидность токена через API
    try {
      console.log('📡 Запрос к /auth/me...')
      const response = await api.get('/auth/me')
      console.log('📡 Ответ от /auth/me:', response.status, response.data)
      
      if (response.data.success && response.data.data.user) {
        // ТОЛЬКО ТЕПЕРЬ устанавливаем токен и пользователя в state
        state.token = savedToken
        state.user = response.data.data.user
        state.isInitialized = true
        state._explicitAuth = true // Явно помечаем как авторизованного
        console.log('✅ Токен валидный, пользователь авторизован:', state.user.username)
      } else {
        // Токен невалидный - удаляем
        console.log('❌ Токен невалидный (ответ не success), удаляем')
        state.token = null
        state.user = null
        state._explicitAuth = false
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
        state.isInitialized = true
      }
    } catch (error) {
      // Токен невалидный или ошибка сети
      console.log('❌ Ошибка проверки токена:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url
      })
      
      // НЕ устанавливаем токен в state при любой ошибке
      state.token = null
      state.user = null
      state._explicitAuth = false // Явно помечаем как НЕ авторизованного
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Удаляем токен при ошибке авторизации
        console.log('❌ Токен невалидный (401/403), удаляем из localStorage')
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
      } else {
        // При ошибке сети не удаляем токен из localStorage, но не авторизуем
        console.log('⚠️ Ошибка сети, токен остается в localStorage, но НЕ авторизуем')
        delete api.defaults.headers.common['Authorization']
      }
      // Помечаем как инициализированный в любом случае
      state.isInitialized = true
    }
    
    console.log('🔍 Auth init END:', {
      hasToken: !!state.token,
      hasUser: !!state.user,
      isInitialized: state.isInitialized
    })
  }
  
  return {
    state,
    isAuthenticated,
    login,
    register,
    logout,
    init
  }
}

