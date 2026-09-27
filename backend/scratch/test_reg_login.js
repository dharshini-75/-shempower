const http = require('http');

function request(path, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function testRegLogin() {
  const testMobile = '9123456789';
  const testPin = '9876';

  console.log('--- 1. Register new member with mobile:', testMobile, 'pin:', testPin, '---');
  const regRes = await request('/api/auth/register', {
    full_name: 'Test Custom Pin Member',
    mobile_number: testMobile,
    pin: testPin,
    role: 'member',
    leader_id: 1
  });
  console.log('Reg Status:', regRes.status, regRes.body);

  console.log('\n--- 2. Login with registered PIN (9876) ---');
  const loginRes = await request('/api/auth/login', {
    mobile_number: testMobile,
    pin: testPin
  });
  console.log('Login Status:', loginRes.status, loginRes.body);
}

testRegLogin();
