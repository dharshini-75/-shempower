const db = require('../config/db');

class MemberNotification {
  static async create(userId, loanRequestId, title, message, amount, status) {
    const createdAt = new Date().toISOString();
    const result = await db.query(
      'INSERT INTO member_notifications (user_id, loan_request_id, title, message, amount, status, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, loanRequestId, title, message, amount, status, 0, createdAt]
    );
    const insertId = result && result[0] ? result[0].insertId : Date.now();
    return {
      id: insertId,
      user_id: Number(userId),
      loan_request_id: Number(loanRequestId),
      title,
      message,
      amount: Number(amount),
      status,
      is_read: 0,
      created_at: createdAt
    };
  }

  static async findByUserId(userId) {
    const rows = await db.query('SELECT * FROM member_notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return rows || [];
  }

  static async markAsRead(id, userId) {
    const result = await db.query('UPDATE member_notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    return result && result[0] ? result[0].affectedRows > 0 : false;
  }

  static async markAllAsRead(userId) {
    const result = await db.query('UPDATE member_notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    return result && result[0] ? result[0].affectedRows > 0 : false;
  }
}

module.exports = MemberNotification;
