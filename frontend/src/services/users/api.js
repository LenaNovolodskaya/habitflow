import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 секунд таймаут
})

// НЕ загружаем токен здесь - только через интерцептор запросов
// Это предотвращает установку невалидного токена до проверки

// Интерцептор запросов - добавляем токен из localStorage
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  response => response,
  error => {
    // Не делаем редирект здесь - пусть роутер сам обрабатывает
    // Просто удаляем токен при 401
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Обновляем заголовки
      delete api.defaults.headers.common['Authorization']
    }
    return Promise.reject(error)
  }
)

export default api

