const db = require('../config/db');

class User {
  static async findByMobile(mobileNumber) {
    const rows = await db.query('SELECT * FROM users WHERE mobile_number = ?', [mobileNumber]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findById(id) {
    const rows = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async create(fullName, mobileNumber, pinHash, role, leaderId = null, upiId = null) {
    const result = await db.query(
      'INSERT INTO users (full_name, mobile_number, pin_hash, role, leader_id, upi_id, status, preferred_language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [fullName, mobileNumber, pinHash, role, leaderId ? Number(leaderId) : null, upiId || null, 'active', 'ta']
    );
    const insertId = result && result[0] ? result[0].insertId : null;
    return { id: insertId, full_name: fullName, mobile_number: mobileNumber, role, leader_id: leaderId ? Number(leaderId) : null, upi_id: upiId || null, preferred_language: 'ta' };
  }

  static async updatePin(mobileNumber, newPinHash) {
    const result = await db.query('UPDATE users SET pin_hash = ? WHERE mobile_number = ?', [newPinHash, mobileNumber]);
    return result && result[0] ? result[0].affectedRows > 0 : false;
  }

  static async updateUpiId(userId, upiId) {
    const result = await db.query('UPDATE users SET upi_id = ? WHERE id = ?', [upiId, Number(userId)]);
    return result && result[0] ? result[0].affectedRows > 0 : false;
  }

  static async updateFcmToken(userId, fcmToken, language = null) {
    const fields = ['fcm_token = ?'];
    const params = [fcmToken];
    if (language) {
      fields.push('preferred_language = ?');
      params.push(language);
    }
    params.push(Number(userId));
    const result = await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    return result && result[0] ? result[0].affectedRows > 0 : false;
  }

  static async updateLanguage(userId, language) {
    const result = await db.query('UPDATE users SET preferred_language = ? WHERE id = ?', [language, Number(userId)]);
    return result && result[0] ? result[0].affectedRows > 0 : false;
  }

  static async findAll() {
    const rows = await db.query('SELECT * FROM users ORDER BY id');
    return rows || [];
  }

  static async findLeaders() {
    const rows = await db.query("SELECT id, full_name, mobile_number, upi_id, role, preferred_language FROM users WHERE role = 'leader' AND status = 'active' ORDER BY full_name");
    return rows || [];
  }

  static async findMembersByLeaderId(leaderId) {
    const rows = await db.query("SELECT * FROM users WHERE role = 'member' AND leader_id = ? ORDER BY id", [Number(leaderId)]);
    return rows || [];
  }
}

module.exports = User;
