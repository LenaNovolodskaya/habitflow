const pool = require('../config/database');

class UserModel {
  // Создание нового пользователя
  static async create(userData) {
    const { username, email, passwordHash, fullName } = userData;
    const query = `
      INSERT INTO users (username, email, password_hash, full_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, full_name, created_at
    `;
    const result = await pool.query(query, [username, email, passwordHash, fullName]);
    return result.rows[0];
  }

  // Поиск пользователя по email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Поиск пользователя по username
  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  // Поиск пользователя по ID
  static async findById(id) {
    const query = 'SELECT id, username, email, full_name, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Обновление профиля пользователя
  static async update(id, userData) {
    const { username, email, fullName } = userData;
    const query = `
      UPDATE users 
      SET username = $1, email = $2, full_name = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, username, email, full_name, updated_at
    `;
    const result = await pool.query(query, [username, email, fullName, id]);
    return result.rows[0];
  }

  // Проверка существования пользователя
  static async exists(id) {
    const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)';
    const result = await pool.query(query, [id]);
    return result.rows[0].exists;
  }
}

module.exports = UserModel;

