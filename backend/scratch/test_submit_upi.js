const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testSubmitUpi() {
  console.log('--- 1. Login as Member Sharmila (mobile: 9876543212, pin: 1234) ---');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { mobile_number: '9876543212', pin: '1234' });

  console.log('Login Status:', loginRes.status);
  console.log('Login Result:', loginRes.data);

  if (!loginRes.data || !loginRes.data.token) {
    console.error('Login failed!');
    process.exit(1);
  }

  const token = loginRes.data.token;

  console.log('\n--- 2. Submit UPI Payment with large screenshot payload ---');
  // Generate ~500KB base64 string simulating a real phone screenshot
  const fakeScreenshotBase64 = 'data:image/png;base64,' + 'A'.repeat(500000);
  
  const submitRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/ledger/submit-upi',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    amount: 300,
    payment_purpose: 'SAVINGS',
    payment_ref: `TEST-REF-${Date.now()}`,
    screenshot: fakeScreenshotBase64
  });

  console.log('Submit Status:', submitRes.status);
  console.log('Submit Result:', submitRes.data);

  console.log('\n--- 3. Fetch My UPI Payments ---');
  const myUpiRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/ledger/my-upi',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('My UPI Payments Status:', myUpiRes.status);
  console.log('My UPI Payments count:', myUpiRes.data.payments?.length);
  console.log('Latest Submitted Payment Status:', myUpiRes.data.payments?.[0]?.payment_status);

  console.log('\n--- 4. Login as Leader Hema (mobile: 9876543210, pin: 1234) ---');
  const leaderLoginRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { mobile_number: '9876543210', pin: '1234' });

  const leaderToken = leaderLoginRes.data.token;

  console.log('\n--- 5. Fetch Pending UPI Payments for Leader ---');
  const pendingRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/ledger/pending-upi',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${leaderToken}`
    }
  });
  console.log('Pending Payments for Leader Status:', pendingRes.status);
  console.log('Leader sees pending payments count:', pendingRes.data.payments?.length);
  console.log('Pending Payment Member Name:', pendingRes.data.payments?.[0]?.member_name);
}

testSubmitUpi().catch(console.error);
