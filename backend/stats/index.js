const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8003;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://frontend:8080'],
  credentials: true
}));
app.use(express.json());

// Проверка подключения к БД
const pool = require('./config/database');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err);
  } else {
    console.log('✅ База данных подключена:', res.rows[0].now);
  }
});

// Маршруты
const statsRoutes = require('./routes/statsRoutes');

// Простой маршрут для проверки
app.get('/', (req, res) => {
  res.json({ 
    message: 'Сервис статистики работает!',
    service: 'Stats Service',
    version: '1.0.0',
    endpoints: {
      stats: '/api/stats',
      weekly: '/api/stats/weekly',
      monthly: '/api/stats/monthly'
    }
  });
});

// Подключение маршрутов
app.use('/api/stats', statsRoutes);

// Обработка 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  console.error('Stack trace:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервис статистики запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу: http://localhost:${PORT}`);
});

