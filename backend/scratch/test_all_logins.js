const http = require('http');
const fs = require('fs');
const path = require('path');

function request(data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5001,
      path: '/api/auth/login',
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

async function testAll() {
  const dbPath = path.join(__dirname, '..', 'shempower.db.json');
  const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const users = dbContent.users || [];

  console.log(`Testing logins for ${users.length} registered users in shempower.db.json...\n`);

  for (const user of users) {
    const mobile = user.mobile_number;
    // Try pin 1234 first
    const res1234 = await request({ mobile_number: mobile, pin: '1234' });
    console.log(`User: ${user.full_name} | Mobile: ${mobile} | PIN: 1234 => Status: ${res1234.status}, Success: ${res1234.body?.success}`);
  }
}

testAll();
