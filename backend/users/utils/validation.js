const Joi = require('joi');

// Валидация регистрации
const registerSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Zа-яА-ЯёЁ0-9_]+$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.pattern.base': 'Имя пользователя должно содержать только буквы (латиница/кириллица), цифры и подчеркивание',
      'string.min': 'Имя пользователя должно содержать минимум 3 символа',
      'string.max': 'Имя пользователя должно содержать максимум 50 символов',
      'any.required': 'Имя пользователя обязательно'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Некорректный email адрес',
      'any.required': 'Email обязателен'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Пароль должен содержать минимум 6 символов',
      'any.required': 'Пароль обязателен'
    }),
  fullName: Joi.string()
    .max(100)
    .allow('', null)
    .optional()
});

// Валидация входа
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Некорректный email адрес',
      'any.required': 'Email обязателен'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Пароль обязателен'
    })
});

// Валидация создания привычки
const createHabitSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Название привычки не может быть пустым',
      'string.max': 'Название привычки должно содержать максимум 200 символов',
      'any.required': 'Название привычки обязательно'
    }),
  description: Joi.string()
    .max(1000)
    .allow('', null)
    .optional(),
  targetValue: Joi.alternatives()
    .try(
      Joi.number().positive(),
      Joi.number().allow(0),
      Joi.string().allow(''),
      Joi.valid(null)
    )
    .optional(),
  unit: Joi.string()
    .max(50)
    .allow('', null)
    .optional(),
  frequency: Joi.string()
    .valid('daily', 'weekly', 'monthly')
    .default('daily')
    .optional(),
  lifeSphere: Joi.string()
    .valid('all', 'health', 'work', 'relationships', 'finance', 'education', 'hobby', 'spirituality')
    .default('all')
    .optional()
});

// Валидация обновления привычки
const updateHabitSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional(),
  description: Joi.string()
    .max(1000)
    .allow('', null)
    .optional(),
  targetValue: Joi.alternatives()
    .try(
      Joi.number().positive(),
      Joi.number().allow(0),
      Joi.string().allow(''),
      Joi.valid(null)
    )
    .optional(),
  unit: Joi.string()
    .max(50)
    .allow('', null)
    .optional(),
  frequency: Joi.string()
    .valid('daily', 'weekly', 'monthly')
    .optional(),
  lifeSphere: Joi.string()
    .valid('all', 'health', 'work', 'relationships', 'finance', 'education', 'hobby', 'spirituality')
    .optional(),
  isActive: Joi.boolean()
    .optional()
});

// Middleware для валидации
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации',
        errors
      });
    }
    
    req.body = value; // Заменяем body на валидированные данные
    next();
  };
};

// Валидация создания заметки
const createNoteSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Заголовок заметки не может быть пустым',
      'string.max': 'Заголовок заметки должен содержать максимум 200 символов',
      'any.required': 'Заголовок заметки обязателен'
    }),
  content: Joi.string()
    .max(5000)
    .allow('', null)
    .optional()
});

// Валидация обновления заметки
const updateNoteSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional(),
  content: Joi.string()
    .max(5000)
    .allow('', null)
    .optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  createHabitSchema,
  updateHabitSchema,
  createNoteSchema,
  updateNoteSchema,
  validate
};

