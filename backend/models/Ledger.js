const db = require('../config/db');

class Ledger {
  static async findByUserId(userId) {
    const rows = await db.query(
      'SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY transaction_date DESC, id DESC',
      [userId]
    );
    return rows || [];
  }

  static async findAll() {
    const rows = await db.query(
      'SELECT * FROM ledger_entries ORDER BY transaction_date DESC, id DESC'
    );
    return rows || [];
  }

  static async create(userId, transactionType, asalAmount, vattiAmount, totalPaid, remainingBalance, transactionDate = null, paymentRef = null, paymentStatus = 'SUCCESSFUL', paymentMethod = 'UPI') {
    const date = transactionDate || new Date().toISOString();
    const ref = paymentRef || `UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const result = await db.query(
      'INSERT INTO ledger_entries (user_id, transaction_type, asal_amount, vatti_amount, total_paid, remaining_balance, transaction_date, payment_ref, payment_status, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, transactionType, asalAmount, vattiAmount, totalPaid, remainingBalance, date, ref, paymentStatus, paymentMethod]
    );
    const insertId = result && result[0] ? result[0].insertId : null;
    return {
      id: insertId,
      user_id: userId,
      transaction_type: transactionType,
      asal_amount: asalAmount,
      vatti_amount: vattiAmount,
      total_paid: totalPaid,
      remaining_balance: remainingBalance,
      transaction_date: date,
      payment_ref: ref,
      payment_status: paymentStatus,
      payment_method: paymentMethod
    };
  }
}

module.exports = Ledger;
