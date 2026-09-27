const db = require('../config/db');

class UpiPayment {
  static async findByRef(paymentRef) {
    const cleanRef = String(paymentRef || '').trim().toLowerCase();
    if (!cleanRef) return null;
    const all = await this.findAll();
    return all.find(p => String(p.payment_ref || '').trim().toLowerCase() === cleanRef) || null;
  }

  static async findById(id) {
    const all = await this.findAll();
    return all.find(p => Number(p.id) === Number(id)) || null;
  }

  static async findPendingByLeaderId(leaderId) {
    const all = await this.findAll();
    return all.filter(p => Number(p.leader_id) === Number(leaderId) && p.payment_status === 'PENDING_VERIFICATION');
  }

  static async findByMemberId(memberId) {
    const all = await this.findAll();
    return all.filter(p => Number(p.member_id) === Number(memberId));
  }

  static async findByLeaderId(leaderId) {
    const all = await this.findAll();
    return all.filter(p => Number(p.leader_id) === Number(leaderId));
  }

  static async create(memberId, leaderId, amount, paymentPurpose, paymentRef, screenshot = null, memberName = '') {
    const cleanRef = String(paymentRef).trim();
    const date = new Date().toISOString();

    if (db.isMock()) {
      const mockDb = typeof db.getMockDb === 'function' ? db.getMockDb() : db.mockDb;
      if (!mockDb.upi_payments) mockDb.upi_payments = [];
      const newId = mockDb.upi_payments.length > 0 ? Math.max(...mockDb.upi_payments.map(p => p.id)) + 1 : 1;
      const record = {
        id: newId,
        member_id: Number(memberId),
        leader_id: Number(leaderId),
        member_name: memberName || '',
        amount: Number(amount),
        payment_purpose: paymentPurpose,
        payment_method: 'UPI',
        payment_ref: cleanRef,
        payment_status: 'PENDING_VERIFICATION',
        screenshot: screenshot || null,
        created_at: date,
        verified_at: null,
        verified_by: null
      };
      mockDb.upi_payments.unshift(record);
      db.saveMockDatabase();
      return record;
    }

    const result = await db.query(
      'INSERT INTO upi_payments (member_id, leader_id, member_name, amount, payment_purpose, payment_method, payment_ref, payment_status, screenshot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [Number(memberId), Number(leaderId), memberName || '', Number(amount), paymentPurpose, 'UPI', cleanRef, 'PENDING_VERIFICATION', screenshot || null, date]
    );
    const insertId = result && result[0] ? result[0].insertId : null;
    return {
      id: insertId,
      member_id: Number(memberId),
      leader_id: Number(leaderId),
      member_name: memberName || '',
      amount: Number(amount),
      payment_purpose: paymentPurpose,
      payment_method: 'UPI',
      payment_ref: cleanRef,
      payment_status: 'PENDING_VERIFICATION',
      screenshot: screenshot || null,
      created_at: date,
      verified_at: null,
      verified_by: null
    };
  }

  static async updateStatus(id, newStatus, verifiedByLeaderId) {
    const verifiedAt = new Date().toISOString();
    if (db.isMock()) {
      const mockDb = typeof db.getMockDb === 'function' ? db.getMockDb() : db.mockDb;
      if (!mockDb.upi_payments) mockDb.upi_payments = [];
      const record = mockDb.upi_payments.find(p => Number(p.id) === Number(id));
      if (record) {
        record.payment_status = newStatus;
        record.verified_at = verifiedAt;
        record.verified_by = Number(verifiedByLeaderId);
        db.saveMockDatabase();
        return true;
      }
      return false;
    }

    const result = await db.query(
      'UPDATE upi_payments SET payment_status = ?, verified_at = ?, verified_by = ? WHERE id = ?',
      [newStatus, verifiedAt, Number(verifiedByLeaderId), Number(id)]
    );
    return result && result[0] ? result[0].affectedRows > 0 : false;
  }

  static async findAll() {
    if (db.isMock()) {
      const mockDb = typeof db.getMockDb === 'function' ? db.getMockDb() : db.mockDb;
      return mockDb.upi_payments || [];
    }
    const rows = await db.query('SELECT * FROM upi_payments ORDER BY created_at DESC, id DESC');
    return rows || [];
  }
}

module.exports = UpiPayment;
