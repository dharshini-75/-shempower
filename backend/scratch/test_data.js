const http = require('http');

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log("==================================================");
  console.log("LEADER DASHBOARD DATA (Hema - token-1)");
  console.log("==================================================");
  const leaderSummary = await makeRequest('/api/ledger/summary', 'token-1');
  console.log("Leader Financial Summary:\n", JSON.stringify(leaderSummary, null, 2));

  const loanRequestsQueue = await makeRequest('/api/loans/queue', 'token-1');
  console.log("\nPending Loan Requests Queue:\n", JSON.stringify(loanRequestsQueue, null, 2));

  console.log("\n==================================================");
  console.log("MEMBER DASHBOARDS (IDs 2, 3, 4, 5, 6)");
  console.log("==================================================");
  for (const id of [2, 3, 4, 5, 6]) {
    const profile = await makeRequest('/api/auth/profile', `token-${id}`);
    const passbook = await makeRequest('/api/ledger/passbook', `token-${id}`);
    const myLoans = await makeRequest('/api/loans/my-loans', `token-${id}`);
    
    const entries = passbook.ledger || [];
    const deposits = entries.filter(p => p.transaction_type === 'deposit');
    const repayments = entries.filter(p => p.transaction_type === 'repayment');
    const totalSavings = deposits.reduce((s, x) => s + Number(x.asal_amount), 0);
    
    console.log(`\nUser ID ${id} (${profile.user ? profile.user.full_name : 'Member'} - Mobile: ${profile.user ? profile.user.mobile_number : 'N/A'}):`);
    console.log(`  - 6 Months Savings Entries: ${deposits.length} entries present`);
    console.log(`  - Total Savings Amount: ₹${totalSavings}`);
    console.log(`  - Repayments Entries Count: ${repayments.length}`);
    if (repayments.length > 0) {
      console.log(`  - Repayment Records:`, repayments.map(r => `[Date: ${r.transaction_date.slice(0, 10)} | Asal: ₹${r.asal_amount} | Vatti: ₹${r.vatti_amount} | Total Paid: ₹${r.total_paid} | Balance: ₹${r.remaining_balance}]`));
    }
    console.log(`  - My Loan Data:`, JSON.stringify(myLoans, null, 2));
  }
}

runTests().catch(console.error);
