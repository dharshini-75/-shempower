const db = require('../config/db');

class Notice {
  static async create(title, message, meetingDatetime, createdAt = null) {
    const date = createdAt || new Date().toISOString();
    const result = await db.query(
      'INSERT INTO broadcast_notices (title, message, meeting_datetime, created_at) VALUES (?, ?, ?, ?)',
      [title, message, meetingDatetime, date]
    );
    const insertId = result && result[0] ? result[0].insertId : null;
    return {
      id: insertId,
      title,
      message,
      meeting_datetime: meetingDatetime,
      created_at: date
    };
  }

  static async findAll() {
    const rows = await db.query('SELECT * FROM broadcast_notices ORDER BY created_at DESC');
    return rows || [];
  }
}

module.exports = Notice;
