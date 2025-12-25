import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/login' // Временно редиректим на логин, beforeEach обработает правильно
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/users/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/users/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/habits',
    name: 'Habits',
    component: () => import('../views/users/Habits.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('../views/stats/Stats.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/users/Profile.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Флаг для предотвращения бесконечных редиректов
let isInitializing = false
let initPromise = null

router.beforeEach(async (to, from, next) => {
  console.log('🚦 Router guard START:', { to: to.path, from: from.path })
  
  const authStore = useAuthStore()
  
  // Инициализируем только если не инициализирован и нет активной инициализации
  // НО: если isInitialized = true, но нет токена и пользователя - это значит logout, пропускаем init
  const needsInit = !authStore.state.isInitialized && !isInitializing
  const isLoggedOut = authStore.state.isInitialized && !authStore.state.token && !authStore.state._explicitAuth
  
  if (needsInit && !isLoggedOut) {
    console.log('⏳ Начинаем инициализацию...')
    isInitializing = true
    initPromise = authStore.init()
    await initPromise
    isInitializing = false
    console.log('✅ Инициализация завершена')
  } else if (initPromise && !isLoggedOut) {
    console.log('⏳ Ждем завершения инициализации...')
    await initPromise
  } else if (isLoggedOut) {
    console.log('✅ Пользователь вышел, пропускаем инициализацию')
  }
  
  // Получаем актуальное состояние после инициализации
  const isAuthenticated = authStore.isAuthenticated
  
  console.log('🔐 Router guard STATE:', {
    to: to.path,
    from: from.path,
    isAuthenticated,
    _explicitAuth: authStore.state._explicitAuth,
    hasToken: !!authStore.state.token,
    hasUser: !!authStore.state.user,
    initialized: authStore.state.isInitialized,
    state: JSON.parse(JSON.stringify(authStore.state)) // Полная копия состояния
  })
  
  // Если идет на главную, редиректим в зависимости от авторизации
  if (to.path === '/') {
    const target = isAuthenticated ? '/habits' : '/login'
    console.log('📍 Редирект с / на', target, '(isAuthenticated:', isAuthenticated, ')')
    if (target !== to.path) {
      next(target)
      return
    }
  }
  
  // Защита маршрутов - предотвращаем редирект на ту же страницу
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('🚫 Требуется авторизация для', to.path)
    if (to.path !== '/login' && to.path !== '/register') {
      console.log('➡️ Редирект на /login')
      next('/login')
      return
    }
  }
  
  // КРИТИЧЕСКИ ВАЖНО: если пользователь авторизован и идет на страницу для гостей
  if (to.meta.requiresGuest) {
    // Дополнительная проверка напрямую из state (не через computed)
    const directCheck = !!(authStore.state._explicitAuth && authStore.state.token && authStore.state.user && authStore.state.isInitialized)
    
    console.log('🔍 Проверка для requiresGuest:', {
      isAuthenticated,
      directCheck,
      _explicitAuth: authStore.state._explicitAuth,
      hasToken: !!authStore.state.token,
      hasUser: !!authStore.state.user,
      isInit: authStore.state.isInitialized
    })
    
    if (directCheck) {
      console.log('✅ Пользователь авторизован, редирект с', to.path, 'на /habits')
      next('/habits')
      return
    } else {
      console.log('✅ Пользователь НЕ авторизован, разрешаем доступ к', to.path)
      // НЕ делаем редирект, если пользователь не авторизован
      next()
      return
    }
  }
  
  console.log('✅ Разрешен доступ к', to.path)
  next()
})

export default router

