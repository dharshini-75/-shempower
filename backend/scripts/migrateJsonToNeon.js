const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL environment variable is missing!");
  console.error("Please add DATABASE_URL=<your_neon_connection_string> to backend/.env file.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🚀 Starting SHEmpower JSON to Neon PostgreSQL Migration...");

    // 1. Load JSON Data
    const dbPath = path.join(__dirname, '..', 'shempower.db.json');
    const chatPath = path.join(__dirname, '..', 'shempower.chat.json');
    const privateChatPath = path.join(__dirname, '..', 'shempower.private.chat.json');

    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const chatData = JSON.parse(fs.readFileSync(chatPath, 'utf8'));
    const privateChatData = JSON.parse(fs.readFileSync(privateChatPath, 'utf8'));

    const users = dbData.users || [];
    const ledgerEntries = dbData.ledger_entries || [];
    const loanRequests = dbData.loan_requests || [];
    const broadcastNotices = dbData.broadcast_notices || [];
    const upiPayments = dbData.upi_payments || [];
    const memberNotifications = dbData.member_notifications || [];
    const groupChats = chatData || [];
    const privateChats = privateChatData || [];

    console.log("\n--- SOURCE JSON RECORD COUNTS ---");
    console.log(`- users: ${users.length}`);
    console.log(`- ledger_entries: ${ledgerEntries.length}`);
    console.log(`- loan_requests: ${loanRequests.length}`);
    console.log(`- broadcast_notices: ${broadcastNotices.length}`);
    console.log(`- upi_payments: ${upiPayments.length}`);
    console.log(`- member_notifications: ${memberNotifications.length}`);
    console.log(`- group_chats: ${groupChats.length}`);
    console.log(`- private_chats: ${privateChats.length}`);

    await client.query('BEGIN');

    // 2. Create Schema
    console.log("\n📦 Creating PostgreSQL Tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(15) UNIQUE NOT NULL,
        pin_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        upi_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        preferred_language VARCHAR(10) DEFAULT 'ta',
        fcm_token TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        asal_amount NUMERIC(10,2) DEFAULT 0.00,
        vatti_amount NUMERIC(10,2) DEFAULT 0.00,
        total_paid NUMERIC(10,2) DEFAULT 0.00,
        remaining_balance NUMERIC(10,2) DEFAULT 0.00,
        transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        payment_ref VARCHAR(255),
        payment_status VARCHAR(50) DEFAULT 'SUCCESSFUL',
        payment_method VARCHAR(50) DEFAULT 'UPI'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS loan_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_requested NUMERIC(10,2) NOT NULL,
        reason_category VARCHAR(100) NOT NULL,
        description TEXT,
        tenure_months INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        requested_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcast_notices (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        meeting_datetime TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS upi_payments (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_name VARCHAR(255),
        amount NUMERIC(10,2) NOT NULL,
        payment_purpose VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'UPI',
        payment_ref VARCHAR(255) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',
        screenshot TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMPTZ,
        verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS member_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        loan_request_id INTEGER,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        amount NUMERIC(10,2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'pending',
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS group_chats (
        id SERIAL PRIMARY KEY,
        group_id INTEGER DEFAULT 1,
        sender_id INTEGER NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        message TEXT,
        audio_url TEXT,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS private_chats (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        message TEXT,
        message_type VARCHAR(50) DEFAULT 'text',
        payment_data JSONB,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Migrate Users (First leaders, then members to satisfy FKs)
    console.log("\n📥 Migrating Users...");
    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, full_name, mobile_number, pin_hash, role, leader_id, upi_id, status, preferred_language, fcm_token, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          mobile_number = EXCLUDED.mobile_number,
          pin_hash = EXCLUDED.pin_hash,
          role = EXCLUDED.role,
          leader_id = EXCLUDED.leader_id,
          upi_id = EXCLUDED.upi_id,
          status = EXCLUDED.status,
          preferred_language = EXCLUDED.preferred_language,
          fcm_token = EXCLUDED.fcm_token,
          created_at = EXCLUDED.created_at;
      `, [
        u.id,
        u.full_name,
        u.mobile_number,
        u.pin_hash,
        u.role,
        u.leader_id || null,
        u.upi_id || null,
        u.status || 'active',
        u.preferred_language || 'ta',
        u.fcm_token || null,
        u.created_at || new Date().toISOString()
      ]);
    }

    // 4. Migrate Ledger Entries
    console.log("📥 Migrating Ledger Entries...");
    for (const l of ledgerEntries) {
      await client.query(`
        INSERT INTO ledger_entries (id, user_id, transaction_type, asal_amount, vatti_amount, total_paid, remaining_balance, transaction_date, payment_ref, payment_status, payment_method)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          transaction_type = EXCLUDED.transaction_type,
          asal_amount = EXCLUDED.asal_amount,
          vatti_amount = EXCLUDED.vatti_amount,
          total_paid = EXCLUDED.total_paid,
          remaining_balance = EXCLUDED.remaining_balance,
          transaction_date = EXCLUDED.transaction_date,
          payment_ref = EXCLUDED.payment_ref,
          payment_status = EXCLUDED.payment_status,
          payment_method = EXCLUDED.payment_method;
      `, [
        l.id,
        l.user_id,
        l.transaction_type,
        l.asal_amount || 0,
        l.vatti_amount || 0,
        l.total_paid || 0,
        l.remaining_balance || 0,
        l.transaction_date || new Date().toISOString(),
        l.payment_ref || null,
        l.payment_status || 'SUCCESSFUL',
        l.payment_method || 'UPI'
      ]);
    }

    // 5. Migrate Loan Requests
    console.log("📥 Migrating Loan Requests...");
    for (const r of loanRequests) {
      await client.query(`
        INSERT INTO loan_requests (id, user_id, amount_requested, reason_category, description, tenure_months, status, requested_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          amount_requested = EXCLUDED.amount_requested,
          reason_category = EXCLUDED.reason_category,
          description = EXCLUDED.description,
          tenure_months = EXCLUDED.tenure_months,
          status = EXCLUDED.status,
          requested_date = EXCLUDED.requested_date;
      `, [
        r.id,
        r.user_id,
        r.amount_requested,
        r.reason_category,
        r.description || '',
        r.tenure_months,
        r.status || 'pending',
        r.requested_date || new Date().toISOString()
      ]);
    }

    // 6. Migrate Broadcast Notices
    console.log("📥 Migrating Broadcast Notices...");
    for (const n of broadcastNotices) {
      await client.query(`
        INSERT INTO broadcast_notices (id, title, message, meeting_datetime, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          meeting_datetime = EXCLUDED.meeting_datetime,
          created_at = EXCLUDED.created_at;
      `, [
        n.id,
        n.title,
        n.message,
        n.meeting_datetime || null,
        n.created_at || new Date().toISOString()
      ]);
    }

    // 7. Migrate UPI Payments
    console.log("📥 Migrating UPI Payments...");
    for (const p of upiPayments) {
      await client.query(`
        INSERT INTO upi_payments (id, member_id, leader_id, member_name, amount, payment_purpose, payment_method, payment_ref, payment_status, screenshot, created_at, verified_at, verified_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          member_id = EXCLUDED.member_id,
          leader_id = EXCLUDED.leader_id,
          member_name = EXCLUDED.member_name,
          amount = EXCLUDED.amount,
          payment_purpose = EXCLUDED.payment_purpose,
          payment_method = EXCLUDED.payment_method,
          payment_ref = EXCLUDED.payment_ref,
          payment_status = EXCLUDED.payment_status,
          screenshot = EXCLUDED.screenshot,
          created_at = EXCLUDED.created_at,
          verified_at = EXCLUDED.verified_at,
          verified_by = EXCLUDED.verified_by;
      `, [
        p.id,
        p.member_id,
        p.leader_id,
        p.member_name || '',
        p.amount,
        p.payment_purpose,
        p.payment_method || 'UPI',
        p.payment_ref,
        p.payment_status || 'PENDING_VERIFICATION',
        p.screenshot || null,
        p.created_at || new Date().toISOString(),
        p.verified_at || null,
        p.verified_by || null
      ]);
    }

    // 8. Migrate Member Notifications
    console.log("📥 Migrating Member Notifications...");
    for (const mn of memberNotifications) {
      await client.query(`
        INSERT INTO member_notifications (id, user_id, loan_request_id, title, message, amount, status, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          loan_request_id = EXCLUDED.loan_request_id,
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          is_read = EXCLUDED.is_read,
          created_at = EXCLUDED.created_at;
      `, [
        mn.id,
        mn.user_id,
        mn.loan_request_id || null,
        mn.title,
        mn.message,
        mn.amount || 0,
        mn.status || 'pending',
        mn.is_read || 0,
        mn.created_at || new Date().toISOString()
      ]);
    }

    // 9. Migrate Group Chats
    console.log("📥 Migrating Group Chats...");
    for (const gc of groupChats) {
      await client.query(`
        INSERT INTO group_chats (id, group_id, sender_id, sender_name, sender_role, message, audio_url, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          group_id = EXCLUDED.group_id,
          sender_id = EXCLUDED.sender_id,
          sender_name = EXCLUDED.sender_name,
          sender_role = EXCLUDED.sender_role,
          message = EXCLUDED.message,
          audio_url = EXCLUDED.audio_url,
          timestamp = EXCLUDED.timestamp;
      `, [
        gc.id,
        gc.group_id || 1,
        gc.senderId,
        gc.senderName,
        gc.senderRole,
        gc.message || null,
        gc.audioUrl || null,
        gc.timestamp || new Date().toISOString()
      ]);
    }

    // 10. Migrate Private Chats
    console.log("📥 Migrating Private Chats...");
    for (const pc of privateChats) {
      await client.query(`
        INSERT INTO private_chats (id, member_id, leader_id, sender_id, sender_name, sender_role, message, message_type, payment_data, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          member_id = EXCLUDED.member_id,
          leader_id = EXCLUDED.leader_id,
          sender_id = EXCLUDED.sender_id,
          sender_name = EXCLUDED.sender_name,
          sender_role = EXCLUDED.sender_role,
          message = EXCLUDED.message,
          message_type = EXCLUDED.message_type,
          payment_data = EXCLUDED.payment_data,
          timestamp = EXCLUDED.timestamp;
      `, [
        pc.id,
        pc.member_id,
        pc.leader_id,
        pc.senderId,
        pc.senderName,
        pc.senderRole,
        pc.message || null,
        pc.messageType || 'text',
        pc.paymentData ? JSON.stringify(pc.paymentData) : null,
        pc.timestamp || new Date().toISOString()
      ]);
    }

    // 11. Reset Auto-Increment Sequences
    console.log("\n🔄 Updating Sequence Counters...");
    const tables = ['users', 'ledger_entries', 'loan_requests', 'broadcast_notices', 'upi_payments', 'member_notifications', 'group_chats', 'private_chats'];
    for (const tbl of tables) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${tbl}', 'id'), COALESCE(MAX(id), 1)) FROM ${tbl};`);
    }

    await client.query('COMMIT');
    console.log("\n✅ Migration Transaction COMMITTED Successfully!");

    // 12. Verification & Record Count Check
    console.log("\n==========================================");
    console.log("🔍 MIGRATION VERIFICATION RESULTS");
    console.log("==========================================");

    let allMatched = true;
    const checks = [
      { name: 'users', expected: users.length },
      { name: 'ledger_entries', expected: ledgerEntries.length },
      { name: 'loan_requests', expected: loanRequests.length },
      { name: 'broadcast_notices', expected: broadcastNotices.length },
      { name: 'upi_payments', expected: upiPayments.length },
      { name: 'member_notifications', expected: memberNotifications.length },
      { name: 'group_chats', expected: groupChats.length },
      { name: 'private_chats', expected: privateChats.length }
    ];

    for (const check of checks) {
      const res = await client.query(`SELECT COUNT(*)::int AS count FROM ${check.name};`);
      const actual = res.rows[0].count;
      const status = actual === check.expected ? "✅ MATCH" : "❌ MISMATCH";
      console.log(`Table '${check.name}': JSON = ${check.expected} | Neon = ${actual} -> ${status}`);
      if (actual !== check.expected) allMatched = false;
    }

    if (!allMatched) {
      console.error("\n❌ MIGRATION FAILED VERIFICATION: Record count mismatch detected!");
      process.exit(1);
    }

    console.log("\n🎉 ALL 8 ENTITIES VERIFIED SUCCESSFULLY IN NEON POSTGRESQL!");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("\n💥 ERROR DURING MIGRATION, TRANSACTION ROLLED BACK:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
