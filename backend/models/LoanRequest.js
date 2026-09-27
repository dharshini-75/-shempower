const db = require('../config/db');

class LoanRequest {
  static async create(userId, amountRequested, reasonCategory, description, tenureMonths, status = 'pending', requestedDate = null) {
    const date = requestedDate || new Date().toISOString();
    const result = await db.query(
      'INSERT INTO loan_requests (user_id, amount_requested, reason_category, description, tenure_months, status, requested_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, amountRequested, reasonCategory, description, tenureMonths, status, date]
    );
    const insertId = result && result[0] ? result[0].insertId : null;
    return {
      id: insertId,
      user_id: userId,
      amount_requested: amountRequested,
      reason_category: reasonCategory,
      description,
      tenure_months: tenureMonths,
      status,
      requested_date: date
    };
  }

  static async findByUserId(userId) {
    const rows = await db.query('SELECT * FROM loan_requests WHERE user_id = ?', [userId]);
    return rows || [];
  }

  static async findById(id) {
    const rows = await db.query('SELECT * FROM loan_requests WHERE id = ?', [id]);
    if (rows && rows.length > 0) {
      return rows[0];
    }
    return null;
  }

  static async findAll() {
    const rows = await db.query('SELECT * FROM loan_requests');
    return rows || [];
  }

  static async updateStatus(id, status) {
    const result = await db.query('UPDATE loan_requests SET status = ? WHERE id = ?', [status, id]);
    return result && result[0] ? result[0].affectedRows > 0 : false;
  }
}

module.exports = LoanRequest;
