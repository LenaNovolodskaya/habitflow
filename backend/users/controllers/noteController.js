const NoteModel = require('../models/noteModel');

class NoteController {
  // Создание новой заметки
  static async create(req, res) {
    try {
      const userId = req.user.id;
      const { title, content } = req.body;

      const note = await NoteModel.create({
        userId,
        title,
        content
      });

      res.status(201).json({
        success: true,
        message: 'Заметка успешно создана',
        data: { note }
      });
    } catch (error) {
      console.error('Ошибка создания заметки:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при создании заметки'
      });
    }
  }

  // Получение всех заметок пользователя
  static async getAll(req, res) {
    try {
      const userId = req.user.id;
      const notes = await NoteModel.findByUserId(userId);

      res.json({
        success: true,
        data: { notes }
      });
    } catch (error) {
      console.error('Ошибка получения заметок:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении заметок'
      });
    }
  }

  // Обновление заметки
  static async update(req, res) {
    try {
      const userId = req.user.id;
      const noteId = parseInt(req.params.id);

      // Проверка существования и принадлежности заметки
      const existingNote = await NoteModel.findById(noteId, userId);
      if (!existingNote) {
        return res.status(404).json({
          success: false,
          message: 'Заметка не найдена'
        });
      }

      const note = await NoteModel.update(noteId, userId, req.body);

      res.json({
        success: true,
        message: 'Заметка успешно обновлена',
        data: { note }
      });
    } catch (error) {
      console.error('Ошибка обновления заметки:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении заметки'
      });
    }
  }

  // Удаление заметки
  static async delete(req, res) {
    try {
      const userId = req.user.id;
      const noteId = parseInt(req.params.id);

      // Проверка существования и принадлежности заметки
      const existingNote = await NoteModel.findById(noteId, userId);
      if (!existingNote) {
        return res.status(404).json({
          success: false,
          message: 'Заметка не найдена'
        });
      }

      await NoteModel.delete(noteId, userId);

      res.json({
        success: true,
        message: 'Заметка успешно удалена'
      });
    } catch (error) {
      console.error('Ошибка удаления заметки:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при удалении заметки'
      });
    }
  }
}

module.exports = NoteController;

