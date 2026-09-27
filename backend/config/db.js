const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let pgPool = null;
let useMock = false;

const mockFilePath = path.join(__dirname, '..', 'shempower.db.json');

// In-Memory Database Structure
let mockDb = {
  users: [],
  ledger_entries: [],
  loan_requests: [],
  broadcast_notices: [],
  upi_payments: [],
  member_notifications: [],
  group_chats: [],
  private_chats: []
};

function loadMockDatabase() {
  if (fs.existsSync(mockFilePath)) {
    try {
      mockDb = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
    } catch (e) {
      console.error("Error loading mock database: ", e);
    }
  }
}

function saveMockDatabase() {
  fs.writeFileSync(mockFilePath, JSON.stringify(mockDb, null, 2), 'utf8');
}

loadMockDatabase();

// Initialize Database Connection
async function connectDb() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    console.log(`Connecting to Neon PostgreSQL Database via DATABASE_URL...`);
    try {
      const { Pool } = require('pg');
      pgPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });

      const client = await pgPool.connect();
      console.log('✅ Neon PostgreSQL Database Connected Successfully!');
      client.release();
      useMock = false;
      return;
    } catch (error) {
      console.warn(`⚠️ PostgreSQL connection error: ${error.message}`);
      console.warn('Falling back to local JSON simulator.');
      useMock = true;
    }
  } else {
    console.log('ℹ️ DATABASE_URL not found. Using local JSON Database simulator (shempower.db.json).');
    useMock = true;
  }
}

// SQL Query executor supporting both PostgreSQL and JSON Simulator
async function query(sql, params = []) {
  if (!useMock && pgPool) {
    try {
      // Convert MySQL style ? placeholders to PostgreSQL $1, $2...
      let paramIndex = 1;
      let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

      // Handle INSERT returning ID for Postgres
      const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
      if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }

      const res = await pgPool.query(pgSql, params);

      if (isInsert) {
        const insertId = res.rows.length > 0 && res.rows[0].id ? res.rows[0].id : null;
        return [{ insertId, affectedRows: res.rowCount }];
      } else if (pgSql.trim().toUpperCase().startsWith('UPDATE') || pgSql.trim().toUpperCase().startsWith('DELETE')) {
        return [{ affectedRows: res.rowCount }];
      } else {
        return res.rows;
      }
    } catch (e) {
      console.error(`PostgreSQL query error: ${e.message}`, { sql, params });
      throw e;
    }
  } else {
    return await querySimulated(sql, params);
  }
}

// SQL Query simulator mapping SQL queries to JSON DB operations
async function querySimulated(sql, params = []) {
  const normSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. SELECT * FROM users WHERE mobile_number = ?
  if (normSql.includes('select * from users') && normSql.includes('mobile_number =')) {
    const mobile = String(params[0] || '').trim();
    const match = mockDb.users.filter(u => String(u.mobile_number || '').trim() === mobile);
    return match;
  }

  // 2. SELECT * FROM users WHERE id = ?
  if (normSql.includes('select * from users') && normSql.includes('where id =')) {
    const id = params[0];
    const match = mockDb.users.filter(u => u.id === Number(id));
    return match;
  }

  // 3. SELECT * FROM users
  if (normSql.includes("from users where role = 'leader'") || normSql.includes("role = 'leader'")) {
    return mockDb.users.filter(u => u.role === 'leader' && u.status === 'active');
  }

  if (normSql.includes("from users where role = 'member' and leader_id =") || normSql.includes('leader_id =')) {
    const leaderId = params[0];
    return mockDb.users.filter(u => u.role === 'member' && Number(u.leader_id) === Number(leaderId));
  }

  if (normSql === 'select * from users' || normSql === 'select * from users order by id') {
    return mockDb.users;
  }

  // 4. INSERT INTO users
  if (normSql.startsWith('insert into users')) {
    const [full_name, mobile_number, pin_hash, role, leader_id, upi_id, status, preferred_language] = params;
    const newId = mockDb.users.length > 0 ? Math.max(...mockDb.users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: newId,
      full_name,
      mobile_number,
      pin_hash,
      role,
      leader_id: leader_id ? Number(leader_id) : null,
      upi_id: upi_id || null,
      status: status || 'active',
      preferred_language: preferred_language || 'ta',
      created_at: new Date().toISOString()
    };
    mockDb.users.push(newUser);
    saveMockDatabase();
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 5. UPDATE users PIN
  if (normSql.startsWith('update users set pin_hash')) {
    const [pin_hash, mobile_number] = params;
    const userIndex = mockDb.users.findIndex(u => u.mobile_number === mobile_number);
    if (userIndex !== -1) {
      mockDb.users[userIndex].pin_hash = pin_hash;
      saveMockDatabase();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 6. SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY ...
  if (normSql.includes('select * from ledger_entries') && normSql.includes('user_id =')) {
    const userId = params[0];
    const matches = mockDb.ledger_entries
      .filter(l => l.user_id === Number(userId))
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date) || b.id - a.id);
    return matches;
  }

  // 7. SELECT * FROM ledger_entries ORDER BY ...
  if (normSql.includes('select * from ledger_entries') && !normSql.includes('user_id =')) {
    const matches = [...mockDb.ledger_entries].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date) || b.id - a.id);
    return matches;
  }

  // 8. INSERT INTO ledger_entries
  if (normSql.startsWith('insert into ledger_entries')) {
    const [user_id, transaction_type, asal_amount, vatti_amount, total_paid, remaining_balance, transaction_date, payment_ref, payment_status, payment_method] = params;
    const newId = mockDb.ledger_entries.length > 0 ? Math.max(...mockDb.ledger_entries.map(l => l.id)) + 1 : 1;
    const newEntry = {
      id: newId,
      user_id: Number(user_id),
      transaction_type,
      asal_amount: Number(asal_amount || 0),
      vatti_amount: Number(vatti_amount || 0),
      total_paid: Number(total_paid || 0),
      remaining_balance: Number(remaining_balance || 0),
      transaction_date: transaction_date || new Date().toISOString(),
      payment_ref: payment_ref || `UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      payment_status: payment_status || 'SUCCESSFUL',
      payment_method: payment_method || 'UPI'
    };
    mockDb.ledger_entries.push(newEntry);
    saveMockDatabase();
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 9. SELECT * FROM loan_requests WHERE user_id = ?
  if (normSql.includes('select * from loan_requests') && normSql.includes('user_id =')) {
    const userId = params[0];
    const matches = mockDb.loan_requests.filter(l => l.user_id === Number(userId));
    return matches;
  }

  // 10. SELECT * FROM loan_requests WHERE id = ?
  if (normSql.includes('select * from loan_requests') && normSql.includes('where id =')) {
    const id = params[0];
    const matches = mockDb.loan_requests.filter(l => l.id === Number(id));
    return matches;
  }

  // 11. SELECT * FROM loan_requests
  if (normSql.includes('select * from loan_requests') && !normSql.includes('user_id =') && !normSql.includes('where id =')) {
    return mockDb.loan_requests;
  }

  // 12. INSERT INTO loan_requests
  if (normSql.startsWith('insert into loan_requests')) {
    const [user_id, amount_requested, reason_category, description, tenure_months, status, requested_date] = params;
    const newId = mockDb.loan_requests.length > 0 ? Math.max(...mockDb.loan_requests.map(l => l.id)) + 1 : 1;
    const newLoan = {
      id: newId,
      user_id: Number(user_id),
      amount_requested: Number(amount_requested),
      reason_category,
      description,
      tenure_months: Number(tenure_months),
      status: status || 'pending',
      requested_date: requested_date || new Date().toISOString()
    };
    mockDb.loan_requests.push(newLoan);
    saveMockDatabase();
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 13. UPDATE loan_requests SET status = ? WHERE id = ?
  if (normSql.startsWith('update loan_requests set status =')) {
    const [status, id] = params;
    const loanIndex = mockDb.loan_requests.findIndex(l => l.id === Number(id));
    if (loanIndex !== -1) {
      mockDb.loan_requests[loanIndex].status = status;
      saveMockDatabase();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 14. SELECT * FROM broadcast_notices
  if (normSql.includes('select * from broadcast_notices')) {
    const matches = [...mockDb.broadcast_notices].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
    return matches;
  }

  // 15. INSERT INTO broadcast_notices
  if (normSql.startsWith('insert into broadcast_notices')) {
    const [title, message, meeting_datetime, created_at] = params;
    const newId = mockDb.broadcast_notices.length > 0 ? Math.max(...mockDb.broadcast_notices.map(n => n.id)) + 1 : 1;
    const newNotice = {
      id: newId,
      title,
      message,
      meeting_datetime,
      created_at: created_at || new Date().toISOString()
    };
    mockDb.broadcast_notices.push(newNotice);
    saveMockDatabase();
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 16. SELECT * FROM member_notifications WHERE user_id = ?
  if (normSql.includes('select * from member_notifications') && normSql.includes('user_id =')) {
    const userId = params[0];
    if (!mockDb.member_notifications) mockDb.member_notifications = [];
    const matches = mockDb.member_notifications
      .filter(n => n.user_id === Number(userId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
    return matches;
  }

  // 17. INSERT INTO member_notifications
  if (normSql.startsWith('insert into member_notifications')) {
    const [user_id, loan_request_id, title, message, amount, status, is_read, created_at] = params;
    if (!mockDb.member_notifications) mockDb.member_notifications = [];
    const newId = mockDb.member_notifications.length > 0 ? Math.max(...mockDb.member_notifications.map(n => n.id)) + 1 : 1;
    const newNotif = {
      id: newId,
      user_id: Number(user_id),
      loan_request_id: Number(loan_request_id),
      title,
      message,
      amount: Number(amount),
      status,
      is_read: Number(is_read || 0),
      created_at: created_at || new Date().toISOString()
    };
    mockDb.member_notifications.push(newNotif);
    saveMockDatabase();
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 18. UPDATE member_notifications SET is_read = 1 WHERE id = ? AND user_id = ?
  if (normSql.startsWith('update member_notifications set is_read = 1') && normSql.includes('id =')) {
    const [id, user_id] = params;
    if (!mockDb.member_notifications) mockDb.member_notifications = [];
    const idx = mockDb.member_notifications.findIndex(n => n.id === Number(id) && n.user_id === Number(user_id));
    if (idx !== -1) {
      mockDb.member_notifications[idx].is_read = 1;
      saveMockDatabase();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 19. UPDATE member_notifications SET is_read = 1 WHERE user_id = ?
  if (normSql.startsWith('update member_notifications set is_read = 1') && !normSql.includes('id =')) {
    const userId = params[0];
    if (!mockDb.member_notifications) mockDb.member_notifications = [];
    let updatedCount = 0;
    mockDb.member_notifications.forEach(n => {
      if (n.user_id === Number(userId)) {
        n.is_read = 1;
        updatedCount++;
      }
    });
    saveMockDatabase();
    return [{ affectedRows: updatedCount }];
  }

  // 20. UPDATE users SET upi_id = ? WHERE id = ?
  if (normSql.startsWith('update users set upi_id =') && normSql.includes('where id =')) {
    const [upi_id, id] = params;
    const user = mockDb.users.find(u => u.id === Number(id));
    if (user) {
      user.upi_id = upi_id;
      saveMockDatabase();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 21. SELECT * FROM upi_payments
  if (normSql.includes('select * from upi_payments')) {
    if (!mockDb.upi_payments) mockDb.upi_payments = [];
    const matches = [...mockDb.upi_payments].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || b.id - a.id);
    return matches;
  }

  // 22. INSERT INTO upi_payments
  if (normSql.startsWith('insert into upi_payments')) {
    const [member_id, leader_id, member_name, amount, payment_purpose, payment_method, payment_ref, payment_status, screenshot, created_at] = params;
    if (!mockDb.upi_payments) mockDb.upi_payments = [];
    const newId = mockDb.upi_payments.length > 0 ? Math.max(...mockDb.upi_payments.map(p => p.id)) + 1 : 1;
    const newRecord = {
      id: newId,
      member_id: Number(member_id),
      leader_id: Number(leader_id),
      member_name: member_name || '',
      amount: Number(amount),
      payment_purpose,
      payment_method: payment_method || 'UPI',
      payment_ref,
      payment_status: payment_status || 'PENDING_VERIFICATION',
      screenshot: screenshot || null,
      created_at: created_at || new Date().toISOString(),
      verified_at: null,
      verified_by: null
    };
    mockDb.upi_payments.unshift(newRecord);
    saveMockDatabase();
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 23. UPDATE upi_payments SET payment_status = ?
  if (normSql.startsWith('update upi_payments set payment_status =')) {
    const [payment_status, verified_at, verified_by, id] = params;
    if (!mockDb.upi_payments) mockDb.upi_payments = [];
    const record = mockDb.upi_payments.find(p => Number(p.id) === Number(id));
    if (record) {
      record.payment_status = payment_status;
      record.verified_at = verified_at;
      record.verified_by = Number(verified_by);
      saveMockDatabase();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  throw new Error(`JSON SQL Simulator: Unimplemented query pattern: ${sql}`);
}

connectDb();

module.exports = {
  query,
  isMock: () => useMock,
  mockDb,
  getMockDb: () => mockDb,
  saveMockDatabase,
  seedMockDatabase: () => {}
};
