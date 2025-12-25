const pool = require('../config/database');

class NoteModel {
  // Создание новой заметки
  static async create(noteData) {
    const { userId, title, content } = noteData;
    const query = `
      INSERT INTO user_notes (user_id, title, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, title, content]);
    return result.rows[0];
  }

  // Получение всех заметок пользователя
  static async findByUserId(userId) {
    const query = `
      SELECT * FROM user_notes 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Получение заметки по ID
  static async findById(id, userId) {
    const query = `
      SELECT * FROM user_notes 
      WHERE id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Обновление заметки
  static async update(id, userId, noteData) {
    const { title, content } = noteData;
    const query = `
      UPDATE user_notes
      SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [title, content, id, userId]);
    return result.rows[0];
  }

  // Удаление заметки
  static async delete(id, userId) {
    const query = `
      DELETE FROM user_notes
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = NoteModel;

