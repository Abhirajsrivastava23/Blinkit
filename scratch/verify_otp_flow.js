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
  console.log('--- STARTING COMPREHENSIVE END-TO-END VALIDATION ---');
  
  // 1. Login Customer A
  console.log('\n1. Logging in Customer A...');
  const custARes = await apiCall('/api/auth/customer-login', 'POST', {
    email: 'client.1234@fatafat.com',
    phone: '9876541234',
    name: 'Client A'
  });
  if (custARes.status !== 200) {
    console.error('Customer A login failed:', custARes.status, custARes.body);
    process.exit(1);
  }
  const custACookie = parseCookie(custARes);
  console.log('Customer A authenticated successfully. Cookie:', custACookie);

  // 2. Login Customer B
  console.log('\n2. Logging in Customer B...');
  const custBRes = await apiCall('/api/auth/customer-login', 'POST', {
    email: 'client.5678@fatafat.com',
    phone: '9876545678',
    name: 'Client B'
  });
  if (custBRes.status !== 200) {
    console.error('Customer B login failed:', custBRes.status, custBRes.body);
    process.exit(1);
  }
  const custBCookie = parseCookie(custBRes);
  console.log('Customer B authenticated successfully. Cookie:', custBCookie);

  // 3. Login Admin
  console.log('\n3. Logging in Admin...');
  const adminRes = await apiCall('/api/auth/login', 'POST', {
    emailOrId: 'superadmin@fatafat.com',
    password: 'admin123'
  });
  if (adminRes.status !== 200) {
    console.error('Admin login failed:', adminRes.status, adminRes.body);
    process.exit(1);
  }
  const adminCookie = parseCookie(adminRes);
  console.log('Admin authenticated successfully. Cookie:', adminCookie);

  // 4. Login Delivery Partner
  console.log('\n4. Logging in Delivery Partner...');
  const riderRes = await apiCall('/api/auth/login', 'POST', {
    emailOrId: 'rider@fatafat.com',
    password: 'rider123'
  });
  if (riderRes.status !== 200) {
    console.error('Rider login failed:', riderRes.status, riderRes.body);
    process.exit(1);
  }
  const riderCookie = parseCookie(riderRes);
  const riderId = riderRes.body.user.deliveryPartnerId;
  console.log('Rider authenticated successfully. Cookie:', riderCookie, 'ID:', riderId);

  // 5. Create Order as Customer A
  console.log('\n5. Creating new order as Customer A...');
  const orderId = 'FT-TEST-' + Math.floor(1000 + Math.random() * 9000);
  const orderPayload = {
    id: orderId,
    customerId: 'client.1234@fatafat.com',
    items: [
      { productId: 'cake-1', name: 'Chocolate Cake', quantity: 1, price: 500 }
    ],
    subtotal: 500,
    deliveryFee: 50,
    discount: 0,
    total: 550,
    address: {
      name: 'Client A',
      mobile: '9876541234',
      house: 'R-12',
      street: 'Chandigarh Road',
      area: 'Chandigarh University',
      city: 'Chandigarh University, Uttar Pradesh',
      pincode: '140413'
    },
    status: 'Pending',
    assignedPartnerId: riderId,
    assignedPartnerName: 'Rider Partner'
  };

  const createRes = await apiCall('/api/orders', 'POST', orderPayload, {
    'Cookie': custACookie
  });
  if (createRes.status !== 200) {
    console.error('Failed to create order:', createRes.status, createRes.body);
    process.exit(1);
  }
  console.log('Order created successfully. Order ID:', orderId);
  const serverOtp = createRes.body.deliveryOtp;
  console.log('OTP generated on server:', serverOtp);

  // 6. Verify Access Rules
  console.log('\n6. Verifying Access Rules...');
  
  // 6.1 Customer A reads own order (should be masked since status is Pending)
  console.log('6.1 Customer A reads own order...');
  const readA = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': custACookie });
  if (readA.status !== 200) {
    console.error('Customer A failed to read own order:', readA.status);
    process.exit(1);
  }
  console.log('Customer A OTP view (masked):', readA.body.deliveryOtp);
  if (readA.body.deliveryOtp !== '******') {
    console.error('Security Failure: OTP must be masked prior to Out for Delivery');
    process.exit(1);
  }

  // 6.2 Customer B reads Customer A order (should be forbidden 403)
  console.log('6.2 Customer B reads Customer A order...');
  const readB = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': custBCookie });
  console.log('Customer B read status (expected 403):', readB.status);
  if (readB.status !== 403) {
    console.error('Security Failure: Customer B should be forbidden to access Customer A\'s order');
    process.exit(1);
  }

  // 6.3 Rider reads assigned order (OTP must be undefined/stripped)
  console.log('6.3 Rider reads assigned order...');
  const readRider = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': riderCookie });
  if (readRider.status !== 200) {
    console.error('Rider failed to read assigned order:', readRider.status);
    process.exit(1);
  }
  console.log('Rider OTP view (expected undefined):', readRider.body.deliveryOtp);
  if (readRider.body.deliveryOtp !== undefined) {
    console.error('Security Failure: Delivery Partner must never receive OTP in API response');
    process.exit(1);
  }

  // 6.4 Admin reads order (OTP must be actual generated code)
  console.log('6.4 Admin reads order...');
  const readAdmin = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': adminCookie });
  if (readAdmin.status !== 200) {
    console.error('Admin failed to read order:', readAdmin.status);
    process.exit(1);
  }
  console.log('Admin OTP view:', readAdmin.body.deliveryOtp);
  if (readAdmin.body.deliveryOtp !== serverOtp) {
    console.error('Failed: Admin did not receive correct OTP');
    process.exit(1);
  }

  // 7. Progress order to Out for Delivery (Rider actions)
  console.log('\n7. Progressing order steps...');
  
  // 7.0 Admin progresses order from Pending to Assigned
  const adminProgressSteps = ['Confirmed', 'Preparing', 'Packed', 'Ready for Delivery', 'Waiting for Partner', 'Assigned'];
  for (const nextStatus of adminProgressSteps) {
    console.log(`Admin progressing status to: ${nextStatus}`);
    const progressRes = await apiCall('/api/orders/update', 'POST', {
      id: orderId,
      updates: { status: nextStatus }
    }, { 'Cookie': adminCookie });
    if (progressRes.status !== 200) {
      console.error(`Admin failed to progress status to ${nextStatus}:`, progressRes.status, progressRes.body);
      process.exit(1);
    }
  }

  // 7.1 Rider Accepts Order
  console.log('7.1 Accept Order...');
  const acceptRes = await apiCall('/api/orders/update', 'POST', {
    id: orderId,
    updates: { status: 'Accepted' }
  }, { 'Cookie': riderCookie });
  if (acceptRes.status !== 200) {
    console.error('Rider failed to accept order:', acceptRes.status, acceptRes.body);
    process.exit(1);
  }

  // 7.2 Rider Picks Up Order (Requires checklist items and box verification)
  console.log('7.2 Pick Up Order...');
  const pickupRes = await apiCall('/api/orders/update', 'POST', {
    id: orderId,
    updates: {
      status: 'Picked Up',
      verifiedItemIds: ['cake-1'],
      boxSealVerified: true
    }
  }, { 'Cookie': riderCookie });
  if (pickupRes.status !== 200) {
    console.error('Rider failed to pick up order:', pickupRes.status, pickupRes.body);
    process.exit(1);
  }

  // 7.3 Rider Starts Transit (Out for Delivery)
  console.log('7.3 Start Transit (Out for Delivery)...');
  const transitRes = await apiCall('/api/orders/update', 'POST', {
    id: orderId,
    updates: { status: 'Out for Delivery' }
  }, { 'Cookie': riderCookie });
  if (transitRes.status !== 200) {
    console.error('Rider failed to start transit:', transitRes.status, transitRes.body);
    process.exit(1);
  }

  // 8. Verify Customer A sees OTP now
  console.log('\n8. Verifying Customer A can read OTP now...');
  const readAAfterDispatch = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': custACookie });
  console.log('Customer A OTP view after dispatch:', readAAfterDispatch.body.deliveryOtp);
  if (readAAfterDispatch.body.deliveryOtp !== serverOtp) {
    console.error('Failed: Customer did not receive unmasked OTP after transit start');
    process.exit(1);
  }

  // 9. Verify OTP Checks and Lock Rate Limits
  console.log('\n9. Testing OTP checks and Lock Rate Limits...');
  
  // 9.1 Mismatch check
  console.log('9.1 Attempting delivery with wrong OTP "000000"...');
  const wrongOtpRes = await apiCall('/api/orders/update', 'POST', {
    id: orderId,
    updates: { status: 'Delivered', otpCode: '000000' }
  }, { 'Cookie': riderCookie });
  console.log('Wrong OTP response (expected 400):', wrongOtpRes.status, wrongOtpRes.body.error);
  if (wrongOtpRes.status !== 400) {
    process.exit(1);
  }

  // 9.2 Attempt 4 more times to reach the lock threshold
  for (let i = 1; i <= 4; i++) {
    console.log(`9.2.${i} Attempting delivery with wrong OTP "111111"...`);
    const res = await apiCall('/api/orders/update', 'POST', {
      id: orderId,
      updates: { status: 'Delivered', otpCode: '111111' }
    }, { 'Cookie': riderCookie });
    if (res.status !== 400) {
      console.error('Unexpected status on wrong attempt:', res.status);
      process.exit(1);
    }
  }

  // 9.3 6th attempt should return 429 Blocked
  console.log('9.3 Attempting 6th time to trigger lock...');
  const blockedRes = await apiCall('/api/orders/update', 'POST', {
    id: orderId,
    updates: { status: 'Delivered', otpCode: '111111' }
  }, { 'Cookie': riderCookie });
  console.log('6th attempt response (expected 429):', blockedRes.status, blockedRes.body.error);
  if (blockedRes.status !== 429) {
    console.error('Security Failure: Rate limit lock was not enforced');
    process.exit(1);
  }

  // 10. Customer A Regenerates OTP
  console.log('\n10. Customer A regenerates OTP to reset rate limits...');
  const regenRes = await apiCall('/api/orders/regenerate-otp', 'POST', {
    id: orderId
  }, { 'Cookie': custACookie });
  if (regenRes.status !== 200) {
    console.error('Failed to regenerate OTP:', regenRes.status, regenRes.body);
    process.exit(1);
  }
  const newServerOtp = regenRes.body.deliveryOtp;
  console.log('New generated OTP:', newServerOtp);

  // 11. Rider completes delivery with the correct new OTP
  console.log('\n11. Rider completes delivery with new correct OTP...');
  const completeRes = await apiCall('/api/orders/update', 'POST', {
    id: orderId,
    updates: { status: 'Delivered', otpCode: newServerOtp }
  }, { 'Cookie': riderCookie });
  if (completeRes.status !== 200) {
    console.error('Failed to complete delivery with correct OTP:', completeRes.status, completeRes.body);
    process.exit(1);
  }
  console.log('Rider successfully completed delivery!');

  // 11.1 Check details
  const finalOrder = await apiCall(`/api/orders/${orderId}`, 'GET', null, { 'Cookie': custACookie });
  console.log('Final Order Status:', finalOrder.body.status);
  console.log('Final Order OTP Verified Status:', finalOrder.body.delivery_otp_verified);
  console.log('Final Order Completed At:', finalOrder.body.delivery_completed_at);
  if (finalOrder.body.status !== 'Delivered' || !finalOrder.body.delivery_otp_verified) {
    console.error('Failed to update status to Delivered or verify OTP');
    process.exit(1);
  }

  // 12. Admin Emergency Override Validation
  console.log('\n12. Testing Admin Emergency Override...');
  
  // 12.1 Create order 2
  const orderId2 = 'FT-TEST-' + Math.floor(1000 + Math.random() * 9000);
  orderPayload.id = orderId2;
  await apiCall('/api/orders', 'POST', orderPayload, { 'Cookie': custACookie });
  await apiCall('/api/orders/update', 'POST', { id: orderId2, updates: { status: 'Accepted' } }, { 'Cookie': riderCookie });
  await apiCall('/api/orders/update', 'POST', { id: orderId2, updates: { status: 'Picked Up', verifiedItemIds: ['cake-1'], boxSealVerified: true } }, { 'Cookie': riderCookie });
  await apiCall('/api/orders/update', 'POST', { id: orderId2, updates: { status: 'Out for Delivery' } }, { 'Cookie': riderCookie });

  // 12.2 Admin attempts override without reason (expected 400)
  console.log('12.2 Admin attempts override without reason...');
  const overrideFail = await apiCall('/api/orders/update', 'POST', {
    id: orderId2,
    updates: { status: 'Delivered' }
  }, { 'Cookie': adminCookie });
  console.log('Override fail status (expected 400):', overrideFail.status, overrideFail.body.error);
  if (overrideFail.status !== 400) {
    process.exit(1);
  }

  // 12.3 Admin completes override with reason
  console.log('12.3 Admin executes override with reason "Client phone battery dead"...');
  const overrideSuccess = await apiCall('/api/orders/update', 'POST', {
    id: orderId2,
    updates: { status: 'Delivered', adminOverrideReason: 'Client phone battery dead' }
  }, { 'Cookie': adminCookie });
  if (overrideSuccess.status !== 200) {
    console.error('Admin failed override:', overrideSuccess.status, overrideSuccess.body);
    process.exit(1);
  }
  console.log('Admin override executed successfully!');
  console.log('Override Audit details:', overrideSuccess.body.order.adminOverride);

  console.log('\n=== ALL SECURE ORDERS & OTP VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

run();
