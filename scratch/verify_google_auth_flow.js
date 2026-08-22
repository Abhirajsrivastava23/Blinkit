const http = require('node:http');

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

    const req = http.request(options, (res) => {
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

function parseCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return setCookie[0].split(';')[0];
}

async function run() {
  console.log('=== STARTING SECURITY & GOOGLE AUTH FLOW VALIDATION ===');

  // Test 1: Unauthenticated checkout / order creation blocks
  console.log('\nTest 1: Unauthenticated POST /api/orders order placement check...');
  const orderId = 'FT-SECURE-' + Math.floor(1000 + Math.random() * 9000);
  const payload = {
    id: orderId,
    customerId: 'hack_email@fatafat.com',
    items: [{ productId: 'cake-1', name: 'Chocolate Cake', quantity: 1, price: 500 }],
    total: 550
  };

  const unauthRes = await apiCall('/api/orders', 'POST', payload);
  console.log('Unauthenticated POST status (expected 403):', unauthRes.status);
  if (unauthRes.status !== 403) {
    console.error('FAILED: Server allowed unauthenticated order placement!');
    process.exit(1);
  }

  // Test 2: Only Customer Role can place orders
  console.log('\nTest 2: Non-Customer (Delivery Partner) order placement check...');
  // Log in Rider
  const riderLogin = await apiCall('/api/auth/login', 'POST', {
    emailOrId: 'rider@fatafat.com',
    password: 'rider123'
  });
  const riderCookie = parseCookie(riderLogin);
  const riderId = riderLogin.body.user.deliveryPartnerId;
  console.log('Rider authenticated. Cookie:', riderCookie);

  const riderPostRes = await apiCall('/api/orders', 'POST', payload, { 'Cookie': riderCookie });
  console.log('Rider order POST status (expected 403):', riderPostRes.status, riderPostRes.body);
  if (riderPostRes.status !== 403) {
    console.error('FAILED: Server allowed delivery partner to create a new order!');
    process.exit(1);
  }

  // Test 3: Authenticated Customer Order placement & ownership check
  console.log('\nTest 3: Authenticated Customer A order placement & ownership verification...');
  // Log in Customer A
  const custALogin = await apiCall('/api/auth/customer-login', 'POST', {
    email: 'client.1234@fatafat.com',
    phone: '9876541234',
    name: 'Client A'
  });
  const custACookie = parseCookie(custALogin);
  console.log('Customer A authenticated. Cookie:', custACookie);

  // Post order as Customer A with a different customerId in payload to test spoof check
  const spoofPayload = {
    ...payload,
    customerId: 'spoofed_customer_id'
  };

  const custAPostRes = await apiCall('/api/orders', 'POST', spoofPayload, { 'Cookie': custACookie });
  if (custAPostRes.status !== 200) {
    console.error('Customer A order placement failed:', custAPostRes.status, custAPostRes.body);
    process.exit(1);
  }
  
  console.log('Customer A order placed successfully.');
  const savedOrder = custAPostRes.body;
  console.log('Order customerId in server response:', savedOrder.customerId);
  
  if (savedOrder.customerId === 'spoofed_customer_id') {
    console.error('FAILED: Server trusted client-provided customerId!');
    process.exit(1);
  }
  console.log('PASSED: Server forced customerId to match the authenticated session!');

  // Test 4: Customer A can access their own order
  console.log('\nTest 4: Customer A reads own order details...');
  const readA = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': custACookie });
  console.log('Customer A read status:', readA.status);
  if (readA.status !== 200) {
    console.error('FAILED: Customer A cannot read own order!');
    process.exit(1);
  }
  console.log('Customer A OTP read check (expected ******):', readA.body.deliveryOtp);
  if (readA.body.deliveryOtp !== '******') {
    console.error('FAILED: Customer A read unmasked OTP before dispatch!');
    process.exit(1);
  }

  // Test 5: Customer B cannot access Customer A's order
  console.log('\nTest 5: Customer B attempts to read Customer A\'s order...');
  const custBLogin = await apiCall('/api/auth/customer-login', 'POST', {
    email: 'client.5678@fatafat.com',
    phone: '9876545678',
    name: 'Client B'
  });
  const custBCookie = parseCookie(custBLogin);
  console.log('Customer B authenticated. Cookie:', custBCookie);

  const readB = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': custBCookie });
  console.log('Customer B read status (expected 403):', readB.status);
  if (readB.status !== 403) {
    console.error('FAILED: Customer B was allowed to access Customer A\'s order details!');
    process.exit(1);
  }
  console.log('PASSED: Customer B access blocked.');

  // Test 6: Delivery Partner privacy verification (cannot read customerId profile info beyond delivery details)
  console.log('\nTest 6: Delivery Partner reads order details...');
  const readRider = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': riderCookie });
  console.log('Rider read status (expected 403 because not assigned yet):', readRider.status);
  if (readRider.status !== 403) {
    console.error('FAILED: Unassigned Rider allowed to read order details!');
    process.exit(1);
  }

  console.log('\nAssigning order to rider...');
  // Log in Admin
  const adminLogin = await apiCall('/api/auth/login', 'POST', {
    emailOrId: 'superadmin@fatafat.com',
    password: 'admin123'
  });
  const adminCookie = parseCookie(adminLogin);
  
  // Progress status to Assigned with rider ID
  await apiCall('/api/orders/update', 'POST', { id: orderId, updates: { status: 'Confirmed' } }, { 'Cookie': adminCookie });
  await apiCall('/api/orders/update', 'POST', { id: orderId, updates: { status: 'Preparing' } }, { 'Cookie': adminCookie });
  await apiCall('/api/orders/update', 'POST', { id: orderId, updates: { status: 'Packed' } }, { 'Cookie': adminCookie });
  await apiCall('/api/orders/update', 'POST', { id: orderId, updates: { status: 'Ready for Delivery' } }, { 'Cookie': adminCookie });
  await apiCall('/api/orders/update', 'POST', { id: orderId, updates: { status: 'Waiting for Partner' } }, { 'Cookie': adminCookie });
  await apiCall('/api/orders/update', 'POST', { id: orderId, updates: { status: 'Assigned', assignedPartnerId: riderId } }, { 'Cookie': adminCookie });

  console.log('Rider reading assigned order...');
  const readRiderAssigned = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': riderCookie });
  console.log('Rider read status:', readRiderAssigned.status);
  if (readRiderAssigned.status !== 200) {
    console.error('FAILED: Assigned rider cannot read order details!');
    process.exit(1);
  }
  console.log('Rider OTP read check (expected undefined/omitted):', readRiderAssigned.body.deliveryOtp);
  if (readRiderAssigned.body.deliveryOtp !== undefined) {
    console.error('FAILED: OTP code leaked to Rider payload!');
    process.exit(1);
  }
  console.log('PASSED: Rider payload does not contain OTP.');

  // Test 7: Customer cannot access /admin pages or /delivery-partner page APIs
  console.log('\nTest 7: Customer role access blocks to Admin and Delivery portals...');
  const readAdminIssues = await apiCall('/api/admin/issues', 'GET', null, { 'Cookie': custACookie });
  console.log('Customer accessing /api/admin/issues (expected 403):', readAdminIssues.status);
  if (readAdminIssues.status !== 403) {
    console.error('FAILED: Customer bypassed Admin portal role validation!');
    process.exit(1);
  }

  const readRiderDispatches = await apiCall('/api/delivery/orders', 'GET', null, { 'Cookie': custACookie });
  console.log('Customer accessing /api/delivery/orders (expected 403):', readRiderDispatches.status);
  if (readRiderDispatches.status !== 403) {
    console.error('FAILED: Customer bypassed Delivery portal role validation!');
    process.exit(1);
  }
  console.log('PASSED: Role validation blocks verified.');

  console.log('\n=== ALL SECURITY AND AUTH OWNERSHIP VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

run();
