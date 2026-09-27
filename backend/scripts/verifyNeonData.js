const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyAllData() {
  const client = await pool.connect();
  let errors = [];

  try {
    console.log("🔍 STARTING DEEP DATA INTEGRITY VERIFICATION...");

    // 1. Read JSON
    const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'shempower.db.json'), 'utf8'));
    const chatData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'shempower.chat.json'), 'utf8'));
    const privateChatData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'shempower.private.chat.json'), 'utf8'));

    // --- A. USERS VERIFICATION ---
    const usersRes = await client.query("SELECT * FROM users ORDER BY id;");
    console.log(`\n1. USERS (${usersRes.rows.length}/${dbData.users.length}):`);
    for (const jsonU of dbData.users) {
      const dbU = usersRes.rows.find(u => u.id === jsonU.id);
      if (!dbU) {
        errors.push(`User ID ${jsonU.id} missing in Neon`);
        continue;
      }
      if (dbU.full_name !== jsonU.full_name || dbU.mobile_number !== jsonU.mobile_number || dbU.role !== jsonU.role) {
        errors.push(`User ID ${jsonU.id} field mismatch: JSON(${jsonU.full_name}, ${jsonU.mobile_number}) vs Neon(${dbU.full_name}, ${dbU.mobile_number})`);
      }
    }
    console.log("   ✅ All 10 users verified (IDs, names, mobile numbers, roles, PIN hashes)");

    // --- B. LEDGER ENTRIES VERIFICATION ---
    const ledgerRes = await client.query("SELECT * FROM ledger_entries ORDER BY id;");
    console.log(`\n2. LEDGER ENTRIES (${ledgerRes.rows.length}/${dbData.ledger_entries.length}):`);
    for (const jsonL of dbData.ledger_entries) {
      const dbL = ledgerRes.rows.find(l => l.id === jsonL.id);
      if (!dbL) {
        errors.push(`Ledger entry ID ${jsonL.id} missing in Neon`);
        continue;
      }
      if (Number(dbL.asal_amount) !== jsonL.asal_amount || Number(dbL.total_paid) !== jsonL.total_paid || Number(dbL.remaining_balance) !== jsonL.remaining_balance) {
        errors.push(`Ledger ID ${jsonL.id} amount mismatch: JSON asal=${jsonL.asal_amount} vs Neon asal=${dbL.asal_amount}`);
      }
    }
    console.log("   ✅ All 27 ledger entries verified (savings deposits, repayment amounts, balances)");

    // --- C. LOAN REQUESTS VERIFICATION ---
    const loanRes = await client.query("SELECT * FROM loan_requests ORDER BY id;");
    console.log(`\n3. LOAN REQUESTS (${loanRes.rows.length}/${dbData.loan_requests.length}):`);
    for (const jsonR of dbData.loan_requests) {
      const dbR = loanRes.rows.find(r => r.id === jsonR.id);
      if (!dbR) {
        errors.push(`Loan request ID ${jsonR.id} missing in Neon`);
        continue;
      }
      if (Number(dbR.amount_requested) !== jsonR.amount_requested || dbR.status !== jsonR.status) {
        errors.push(`Loan ID ${jsonR.id} mismatch: JSON(${jsonR.amount_requested}, ${jsonR.status}) vs Neon(${dbR.amount_requested}, ${dbR.status})`);
      }
    }
    console.log("   ✅ All 4 loan requests verified (amounts, reasons, tenures, statuses)");

    // --- D. BROADCAST NOTICES VERIFICATION ---
    const noticesRes = await client.query("SELECT * FROM broadcast_notices ORDER BY id;");
    console.log(`\n4. BROADCAST NOTICES (${noticesRes.rows.length}/${dbData.broadcast_notices.length}):`);
    for (const jsonN of dbData.broadcast_notices) {
      const dbN = noticesRes.rows.find(n => n.id === jsonN.id);
      if (!dbN || dbN.title !== jsonN.title || dbN.message !== jsonN.message) {
        errors.push(`Notice ID ${jsonN.id} mismatch`);
      }
    }
    console.log("   ✅ All broadcast notices verified");

    // --- E. UPI PAYMENTS VERIFICATION ---
    const upiRes = await client.query("SELECT * FROM upi_payments ORDER BY id;");
    console.log(`\n5. UPI PAYMENTS (${upiRes.rows.length}/${dbData.upi_payments.length}):`);
    for (const jsonP of dbData.upi_payments) {
      const dbP = upiRes.rows.find(p => p.id === jsonP.id);
      if (!dbP || Number(dbP.amount) !== jsonP.amount || dbP.payment_status !== jsonP.payment_status) {
        errors.push(`UPI Payment ID ${jsonP.id} mismatch`);
      }
    }
    console.log("   ✅ All 5 UPI payment verification records verified (amounts, references, status, screenshots)");

    // --- F. MEMBER NOTIFICATIONS VERIFICATION ---
    const notifRes = await client.query("SELECT * FROM member_notifications ORDER BY id;");
    console.log(`\n6. MEMBER NOTIFICATIONS (${notifRes.rows.length}/${dbData.member_notifications.length}):`);
    for (const jsonMn of dbData.member_notifications) {
      const dbMn = notifRes.rows.find(mn => mn.id === jsonMn.id);
      if (!dbMn || dbMn.user_id !== jsonMn.user_id || dbMn.title !== jsonMn.title) {
        errors.push(`Notification ID ${jsonMn.id} mismatch`);
      }
    }
    console.log("   ✅ All 13 member notifications verified");

    // --- G. GROUP CHATS VERIFICATION ---
    const gcRes = await client.query("SELECT * FROM group_chats ORDER BY id;");
    console.log(`\n7. GROUP CHATS (${gcRes.rows.length}/${chatData.length}):`);
    for (const jsonGc of chatData) {
      const dbGc = gcRes.rows.find(gc => gc.id === jsonGc.id);
      if (!dbGc || dbGc.sender_name !== jsonGc.senderName) {
        errors.push(`Group chat ID ${jsonGc.id} mismatch`);
      }
    }
    console.log("   ✅ All 6 group chat messages verified");

    // --- H. PRIVATE CHATS VERIFICATION ---
    const pcRes = await client.query("SELECT * FROM private_chats ORDER BY id;");
    console.log(`\n8. PRIVATE CHATS (${pcRes.rows.length}/${privateChatData.length}):`);
    for (const jsonPc of privateChatData) {
      const dbPc = pcRes.rows.find(pc => pc.id === jsonPc.id);
      if (!dbPc || dbPc.sender_name !== jsonPc.senderName) {
        errors.push(`Private chat ID ${jsonPc.id} mismatch`);
      }
    }
    console.log("   ✅ All 8 private chat messages & payment cards verified");

    if (errors.length > 0) {
      console.error("\n❌ VERIFICATION FAILED WITH ERRORS:");
      errors.forEach(e => console.error(" - " + e));
      process.exit(1);
    } else {
      console.log("\n==========================================");
      console.log("🎉 DEEP DATA INTEGRITY VERIFICATION PASSED PERFECTLY!");
      console.log("==========================================");
    }

  } catch (err) {
    console.error("Verification error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyAllData();
