const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

describe('SHEmpower REST API Integration Tests', () => {
  let leaderToken = '';
  let savitriToken = '';
  let anjaliToken = '';
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    db.seedMockDatabase();
  });

  describe('Authentication Endpoints (No OTP)', () => {
    test('POST /api/auth/register - Register new member with 10-digit mobile & 4-digit PIN', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Test New Member',
          mobile_number: '9998887770',
          pin: '5678',
          role: 'member',
          leader_id: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.mobile_number).toBe('9998887770');
      
      anjaliToken = res.body.token;
    });

    test('POST /api/auth/login - Direct login with Mobile & PIN (Leader Hema)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          mobile_number: '9876543210', // Hema (Leader)
          pin: '1234'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('leader');
      expect(res.body.user.full_name).toBe('Hema');

      leaderToken = res.body.token;
    });

    test('POST /api/auth/login - Direct login with Mobile & PIN (Member Harsha)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          mobile_number: '9876543211', // Harsha (Member)
          pin: '1234'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.full_name).toBe('Harsha');
      expect(res.body.user.assigned_leader_name).toBe('Hema');
      expect(res.body.user.assigned_leader_upi_id).toBeNull();

      savitriToken = res.body.token;
    });

    test('POST /api/auth/login - Direct login with Mobile & PIN (Member JGD assigned to Nageshwari)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          mobile_number: '6380048447', // JGD (Member)
          pin: '1234'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.full_name).toBe('JGD');
      expect(res.body.user.assigned_leader_name).toBe('Nageshwari');
      expect(res.body.user.assigned_leader_mobile).toBe('9345840417');
      expect(res.body.user.assigned_leader_upi_id).toBe('guruviji2019-1@okicici');
    });

    test('POST /api/auth/login - Direct login for Sharmila', async () => {
      const res = await request(app).post('/api/auth/login').send({ mobile_number: '9876543212', pin: '1234' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.full_name).toBe('Sharmila');
    });

    test('POST /api/auth/login - Direct login for Kavitha', async () => {
      const res = await request(app).post('/api/auth/login').send({ mobile_number: '9876543213', pin: '1234' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.full_name).toBe('Kavitha');
    });

    test('POST /api/auth/login - Direct login for Vaishnavi', async () => {
      const res = await request(app).post('/api/auth/login').send({ mobile_number: '9876543214', pin: '1234' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.full_name).toBe('Vaishnavi');
    });

    test('POST /api/auth/login - Direct login for Dharshini', async () => {
      const res = await request(app).post('/api/auth/login').send({ mobile_number: '9876543215', pin: '1234' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.full_name).toBe('Dharshini');
    });

    test('PUT /api/auth/upi-id - Leader updates UPI payment account ID', async () => {
      const res = await request(app)
        .put('/api/auth/upi-id')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ upi_id: 'hema.new@upi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.upi_id).toBe('hema.new@upi');
    });

    test('PUT /api/auth/upi-id - Member cannot update leader UPI account (Security Block)', async () => {
      const res = await request(app)
        .put('/api/auth/upi-id')
        .set('Authorization', `Bearer ${savitriToken}`)
        .send({ upi_id: 'hacker@upi' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('POST /api/auth/reset-pin - Update security PIN directly', async () => {
      const res = await request(app)
        .post('/api/auth/reset-pin')
        .send({
          mobile_number: '9998887770',
          new_pin: '1111'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Micro-Loan & Financial Ledger Dues (2% reducing balance)', () => {
    test('POST /api/loans/request - Member submits loan request', async () => {
      const res = await request(app)
        .post('/api/loans/request')
        .set('Authorization', `Bearer ${anjaliToken}`)
        .send({
          amount_requested: 3000,
          reason_category: 'Medical',
          description: 'Emergency medicine requirements',
          tenure_months: 6
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.loan.status).toBe('pending');
    });

    test('GET /api/loans/queue - Leader views pending loan queue', async () => {
      const res = await request(app)
        .get('/api/loans/queue')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.queue.length).toBeGreaterThan(0);
    });

    test('GET /api/ledger/math-preview - Live reducing balance math check', async () => {
      const res = await request(app)
        .get('/api/ledger/math-preview?userId=2&amount=600')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currentBalance).toBe(3000);
      expect(res.body.vattiPaid).toBe(60.00);
      expect(res.body.asalPaid).toBe(540.00);
      expect(res.body.newBalance).toBe(2460.00);
    });

    test('POST /api/ledger/entry - Member Harsha makes successful UPI loan repayment', async () => {
      const res = await request(app)
        .post('/api/ledger/entry')
        .set('Authorization', `Bearer ${savitriToken}`)
        .send({
          user_id: 2,
          transaction_type: 'repayment',
          amount: 600,
          payment_ref: 'UPI-TEST-12345',
          payment_status: 'SUCCESSFUL',
          payment_method: 'UPI'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.entry.remaining_balance).toBe(2460.00);
      expect(res.body.entry.asal_amount).toBe(540.00);
      expect(res.body.entry.vatti_amount).toBe(60.00);
      expect(res.body.entry.payment_ref).toBe('UPI-TEST-12345');
    });

    test('POST /api/ledger/entry - Member Harsha makes successful UPI savings deposit', async () => {
      const res = await request(app)
        .post('/api/ledger/entry')
        .set('Authorization', `Bearer ${savitriToken}`)
        .send({
          user_id: 2,
          transaction_type: 'deposit',
          amount: 300,
          payment_ref: 'UPI-SAVINGS-999',
          payment_status: 'SUCCESSFUL',
          payment_method: 'UPI'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.entry.total_paid).toBe(300.00);
      expect(res.body.entry.payment_ref).toBe('UPI-SAVINGS-999');
    });

    test('GET /api/ledger/passbook - Fetch transaction logs', async () => {
      const res = await request(app)
        .get('/api/ledger/passbook')
        .set('Authorization', `Bearer ${savitriToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.ledger)).toBe(true);
    });
  });
});
