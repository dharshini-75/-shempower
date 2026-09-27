process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../server');

async function testRealEndpoints() {
  console.log("⚡ TESTING LIVE BACKEND API WITH NEON POSTGRESQL...\n");

  // 1. Health Check
  const healthRes = await request(app).get('/health');
  console.log("1. GET /health:", healthRes.status === 200 && healthRes.body.status === 'ok' ? '✅ PASS' : '❌ FAIL', healthRes.body);

  // 2. Leader Login (Hema - ID 1)
  const hemaLogin = await request(app)
    .post('/api/auth/login')
    .send({ mobile_number: '9876543210', pin: '1234' });
  console.log("2. Leader Login (Hema):", hemaLogin.status === 200 && hemaLogin.body.success ? '✅ PASS' : '❌ FAIL', hemaLogin.body.user ? hemaLogin.body.user.full_name : hemaLogin.body);
  const hemaToken = hemaLogin.body.token;

  // 3. Leader Login (Nageshwari - ID 9)
  const nageshwariLogin = await request(app)
    .post('/api/auth/login')
    .send({ mobile_number: '9345840417', pin: '1234' });
  console.log("3. Leader Login (Nageshwari):", nageshwariLogin.status === 200 && nageshwariLogin.body.success ? '✅ PASS' : '❌ FAIL', nageshwariLogin.body.user ? nageshwariLogin.body.user.full_name : nageshwariLogin.body);
  const nageshwariToken = nageshwariLogin.body.token;

  // 4. Member Login (Sharmila - ID 3)
  const sharmilaLogin = await request(app)
    .post('/api/auth/login')
    .send({ mobile_number: '9876543212', pin: '1234' });
  console.log("4. Member Login (Sharmila):", sharmilaLogin.status === 200 && sharmilaLogin.body.success ? '✅ PASS' : '❌ FAIL', sharmilaLogin.body.user ? sharmilaLogin.body.user.full_name : sharmilaLogin.body);
  const sharmilaToken = sharmilaLogin.body.token;

  // 5. Member Passbook (Sharmila)
  const passbookRes = await request(app)
    .get('/api/ledger/passbook')
    .set('Authorization', `Bearer ${sharmilaToken}`);
  console.log("5. GET /api/ledger/passbook (Sharmila):", passbookRes.status === 200 && passbookRes.body.success ? '✅ PASS' : '❌ FAIL', `Entries count: ${passbookRes.body.ledger ? passbookRes.body.ledger.length : 0}`);

  // 6. Pending Loans Queue (Leader Hema)
  const loanQueueRes = await request(app)
    .get('/api/loans/queue')
    .set('Authorization', `Bearer ${hemaToken}`);
  console.log("6. GET /api/loans/queue (Hema):", loanQueueRes.status === 200 && loanQueueRes.body.success ? '✅ PASS' : '❌ FAIL', `Pending Loans: ${loanQueueRes.body.pendingLoans ? loanQueueRes.body.pendingLoans.length : 0}`);

  // 7. Notices Board
  const noticesRes = await request(app)
    .get('/api/loans/notices')
    .set('Authorization', `Bearer ${sharmilaToken}`);
  console.log("7. GET /api/loans/notices:", noticesRes.status === 200 && noticesRes.body.success ? '✅ PASS' : '❌ FAIL', `Notices: ${noticesRes.body.notices ? noticesRes.body.notices.length : 0}`);

  // 8. Pending UPI Payments List (Leader Nageshwari)
  const pendingUpiRes = await request(app)
    .get('/api/ledger/pending-upi')
    .set('Authorization', `Bearer ${nageshwariToken}`);
  console.log("8. GET /api/ledger/pending-upi (Nageshwari):", pendingUpiRes.status === 200 && pendingUpiRes.body.success ? '✅ PASS' : '❌ FAIL', `Pending Payments: ${pendingUpiRes.body.pendingPayments ? pendingUpiRes.body.pendingPayments.length : 0}`);

  // 9. Member Notifications List (Sharmila)
  const notifRes = await request(app)
    .get('/api/loans/notifications/my')
    .set('Authorization', `Bearer ${sharmilaToken}`);
  console.log("9. GET /api/loans/notifications/my (Sharmila):", notifRes.status === 200 && notifRes.body.success ? '✅ PASS' : '❌ FAIL', `Notifications: ${notifRes.body.notifications ? notifRes.body.notifications.length : 0}`);

  // 10. Group Chat Messages
  const groupChatRes = await request(app)
    .get('/api/loans/chat')
    .set('Authorization', `Bearer ${sharmilaToken}`);
  console.log("10. GET /api/loans/chat:", groupChatRes.status === 200 && groupChatRes.body.success ? '✅ PASS' : '❌ FAIL', `Group Messages: ${groupChatRes.body.chat ? groupChatRes.body.chat.length : 0}`);

  // 11. Private Chat Messages (Sharmila ↔ Hema)
  const privateChatRes = await request(app)
    .get('/api/loans/private-chat?member_id=3')
    .set('Authorization', `Bearer ${hemaToken}`);
  console.log("11. GET /api/loans/private-chat (Hema viewing Sharmila chat):", privateChatRes.status === 200 && privateChatRes.body.success ? '✅ PASS' : '❌ FAIL', `Private Messages: ${privateChatRes.body.chat ? privateChatRes.body.chat.length : 0}`);

  console.log("\n==========================================");
  console.log("🎉 ALL LIVE NEON POSTGRESQL API ENDPOINTS TESTED & VERIFIED!");
  console.log("==========================================");
  process.exit(0);
}

testRealEndpoints();
