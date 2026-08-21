const fetch = require('node:http').request;

function apiCall(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000${path}`;
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = fetch(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Extract token from Set-Cookie header
function getSessionToken(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  const match = setCookie[0].match(/fatafat_session_token=([^;]+)/);
  return match ? match[1] : '';
}

async function runTests() {
  console.log('=== STARTING SECURITY & AUTH SYSTEM VALIDATION ===');

  // 1. Admin authentication test
  console.log('\n1. Testing Admin login...');
  const loginAdminRes = await apiCall('/api/auth/login', 'POST', {
    emailOrId: 'superadmin@fatafat.com',
    password: 'admin123'
  });
  console.log(`- Status: ${loginAdminRes.status}`);
  if (loginAdminRes.status !== 200 || !loginAdminRes.body.success) {
    console.error('Admin login failed!');
    process.exit(1);
  }
  const adminToken = getSessionToken(loginAdminRes.headers);
  console.log(`- Admin token acquired: ${adminToken.slice(0, 15)}...`);

  // 2. Partner authentication test
  console.log('\n2. Testing Delivery Partner login...');
  const loginRiderRes = await apiCall('/api/auth/login', 'POST', {
    emailOrId: 'DP-001',
    password: 'rider123'
  });
  console.log(`- Status: ${loginRiderRes.status}`);
  if (loginRiderRes.status !== 200 || !loginRiderRes.body.success) {
    console.error('Rider login failed!');
    process.exit(1);
  }
  const riderToken = getSessionToken(loginRiderRes.headers);
  console.log(`- Rider token acquired: ${riderToken.slice(0, 15)}...`);

  // 3. Security Role Gating on Admin Partners List
  console.log('\n3. Testing API Gating (Partners list)...');
  
  // A. Access with Rider token
  const listAsRider = await apiCall('/api/admin/partners', 'GET', null, {
    'Authorization': `Bearer ${riderToken}`
  });
  console.log(`- Accessing Admin API as Rider: Status = ${listAsRider.status} (Expected: 403)`);
  if (listAsRider.status !== 403) {
    console.error('Security Failure: Rider accessed admin list!');
    process.exit(1);
  }

  // B. Access with Admin token
  const listAsAdmin = await apiCall('/api/admin/partners', 'GET', null, {
    'Authorization': `Bearer ${adminToken}`
  });
  console.log(`- Accessing Admin API as Admin: Status = ${listAsAdmin.status} (Expected: 200)`);
  if (listAsAdmin.status !== 200) {
    console.error('Admin list fetch failed!');
    process.exit(1);
  }
  console.log(`- Current partner accounts: ${listAsAdmin.body.length}`);

  // 4. CRUD Test: Admin creates a new partner
  console.log('\n4. Testing CRUD: Admin creating partner...');
  const newPartnerId = 'DP-TEST-99';
  const createRes = await apiCall('/api/admin/partners', 'POST', {
    id: newPartnerId,
    name: 'Automation Test Rider',
    email: 'test_rider@fatafat.com',
    password: 'tempPassword123',
    phone: '9888877777',
    locationId: 'nawabganj-unnao',
    locationName: 'Nawabganj, Unnao'
  }, {
    'Authorization': `Bearer ${adminToken}`
  });
  console.log(`- Create Partner Status: ${createRes.status}`);
  if (createRes.status !== 200 || !createRes.body.success) {
    console.error('Partner creation failed!');
    process.exit(1);
  }
  console.log(`- Created partner details: ID=${createRes.body.partner.id}, Role=${createRes.body.partner.role}`);

  // 5. Verify the new partner shows in the list and can authenticate
  console.log('\n5. Testing new partner authentication...');
  const testRiderLogin = await apiCall('/api/auth/login', 'POST', {
    emailOrId: newPartnerId,
    password: 'tempPassword123'
  });
  console.log(`- New Partner login status: ${testRiderLogin.status}`);
  if (testRiderLogin.status !== 200) {
    console.error('New partner failed to log in!');
    process.exit(1);
  }
  const testRiderToken = getSessionToken(testRiderLogin.headers);

  // 6. Test inventory issue reporting
  console.log('\n6. Testing stock report filing from partner session...');
  const reportRes = await apiCall('/api/delivery/issues', 'POST', {
    productId: 'cake-1',
    productName: 'Chocolate Truffle Cake',
    reason: 'Product damaged',
    availableQty: 2,
    requestedQty: 5
  }, {
    'Authorization': `Bearer ${testRiderToken}`
  });
  console.log(`- Report submit status: ${reportRes.status}`);
  if (reportRes.status !== 200 || !reportRes.body.success) {
    console.error('Failed to submit inventory report!');
    process.exit(1);
  }
  console.log(`- Saved report ID: ${reportRes.body.report.id}, Filed By: ${reportRes.body.report.partnerId}`);

  // 7. Verify reports list access gating
  console.log('\n7. Testing Admin reports list visibility...');
  const adminIssues = await apiCall('/api/admin/issues', 'GET', null, {
    'Authorization': `Bearer ${adminToken}`
  });
  const riderIssues = await apiCall('/api/admin/issues', 'GET', null, {
    'Authorization': `Bearer ${testRiderToken}`
  });
  
  console.log(`- Admin accessing issues list: Status = ${adminIssues.status} (Reports count: ${adminIssues.body.length})`);
  console.log(`- Rider accessing admin issues list: Status = ${riderIssues.status} (Expected: 403)`);

  if (adminIssues.status !== 200 || riderIssues.status !== 403) {
    console.error('Reports endpoint access validation failed!');
    process.exit(1);
  }

  // 8. CRUD Cleanup: Admin deletes the test partner
  console.log('\n8. Cleaning up: Admin deleting test partner...');
  const deleteRes = await apiCall(`/api/admin/partners?id=${newPartnerId}`, 'DELETE', null, {
    'Authorization': `Bearer ${adminToken}`
  });
  console.log(`- Delete Status: ${deleteRes.status}`);
  if (deleteRes.status !== 200 || !deleteRes.body.success) {
    console.error('Failed to clean up test partner!');
    process.exit(1);
  }

  console.log('\n=== SECURITY & AUTH SYSTEM FULLY COMPLIANT AND VERIFIED ===');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
