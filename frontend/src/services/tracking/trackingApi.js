import axios from 'axios'

const trackingApi = axios.create({
  baseURL: import.meta.env.VITE_TRACKING_API_URL || 'http://localhost:8002/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 2000 // Таймаут 2 секунды
})

// Интерцептор запросов - добавляем токен из localStorage
trackingApi.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Интерцептор ответов - подавляем ошибки подключения для недоступных сервисов
trackingApi.interceptors.response.use(
  response => response,
  error => {
    // Игнорируем ошибки подключения (сервис недоступен)
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.message?.includes('Connection refused') || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      // Возвращаем resolved promise с пустым ответом, чтобы не ломать цепочку
      return Promise.resolve({ 
        data: { 
          success: false, 
          data: { completions: [] },
          message: 'Tracking service unavailable' 
        } 
      })
    }
    return Promise.reject(error)
  }
)

export default trackingApi

