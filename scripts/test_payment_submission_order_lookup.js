/**
 * Test Suite: Payment Submission & Order Lookup Resilience
 * Verifies that orders are never "Not Found" before, during, or after payment submission.
 */

const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function runTests() {
  console.log('========================================================================');
  console.log('       FATAFAT PAYMENT SUBMISSION & ORDER LOOKUP SUITE                  ');
  console.log('========================================================================\n');

  // 1. Authenticate Customer
  console.log('--- SETUP: CUSTOMER AUTHENTICATION ---');
  const custPhone = '98765' + Math.floor(10000 + Math.random() * 90000);
  const authRes = await request('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: custPhone, name: 'Payment Flow Tester' })
  });
  assert(authRes.ok, 'Customer authenticated');
  const custCookie = authRes.headers.get('set-cookie') || '';

  // 2. Place Order
  console.log('\n--- PHASE 1: PLACE ORDER ---');
  const orderRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: custCookie },
    body: JSON.stringify({
      items: [{ productId: 'cake-1', name: 'Dutch Truffle Cake', category: 'cakes', price: 549, quantity: 1 }],
      address: { name: 'Payment Flow Tester', mobile: custPhone, house: 'Flat 101', street: 'MG Road', area: 'Civil Lines', city: 'Lucknow', pincode: '226001' },
      deliveryOption: 'ASAP'
    })
  });
  assert(orderRes.ok && orderRes.data.order?.id, 'Order created successfully');
  const orderId = orderRes.data.order.id;
  console.log(`  Created Order ID: ${orderId}`);

  // 3. Test Order Lookup with Various Formats
  console.log('\n--- PHASE 2: RESILIENT ORDER LOOKUP BEFORE PAYMENT ---');
  
  // Clean ID lookup
  const cleanLookup = await request(`/api/orders/${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(cleanLookup.ok && cleanLookup.data.id === orderId, `Clean ID lookup /api/orders/${orderId} succeeded (200 OK)`);

  // URL-encoded # lookup (%23ID)
  const hashLookup = await request(`/api/orders/%23${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(hashLookup.ok && hashLookup.data.id === orderId, `Hash-prefixed lookup /api/orders/%23${orderId} succeeded (200 OK)`);

  // Lowercase lookup
  const lowerLookup = await request(`/api/orders/${orderId.toLowerCase()}`, {
    headers: { Cookie: custCookie }
  });
  assert(lowerLookup.ok && lowerLookup.data.id === orderId, `Lowercase lookup /api/orders/${orderId.toLowerCase()} succeeded (200 OK)`);

  // 4. Submit Payment Proof (Multipart Form Data Simulation)
  console.log('\n--- PHASE 3: PAYMENT PROOF SUBMISSION ---');
  const utrValue = '123456789012';
  
  // Create multipart boundary and body manually
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const dummyBase64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const fileBuffer = Buffer.from(dummyBase64Png, 'base64');
  
  const bodyParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="orderId"\r\n\r\n${orderId}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="paymentId"\r\n\r\npay-${orderId}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="amount"\r\n\r\n598\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="utr"\r\n\r\n${utrValue}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="proof.png"\r\nContent-Type: image/png\r\n\r\n`,
  ];
  
  const part1 = Buffer.from(bodyParts.join(''));
  const partEnd = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullMultipartBody = Buffer.concat([part1, fileBuffer, partEnd]);

  const submitRes = await request('/api/payments/submit', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Cookie: custCookie
    },
    body: fullMultipartBody
  });

  assert(submitRes.ok, `Payment submission returned HTTP 200 (not 404): ${submitRes.status}`);
  assert(submitRes.data?.success === true, 'Payment submission response has success: true');
  assert(submitRes.data?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Payment status updated to PAYMENT_VERIFICATION_PENDING');

  // 5. Test Order Lookup AFTER Payment Submission
  console.log('\n--- PHASE 4: RESILIENT ORDER LOOKUP AFTER PAYMENT ---');
  
  const postSubmitLookup = await request(`/api/orders/${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(postSubmitLookup.ok, `Post-submit lookup /api/orders/${orderId} returned 200 OK (NOT 404)`);
  assert(postSubmitLookup.data.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Order paymentStatus is PAYMENT_VERIFICATION_PENDING');
  assert(postSubmitLookup.data.utr === utrValue, `Order UTR matches submitted UTR: ${utrValue}`);

  // Test with encoded hash again
  const postSubmitHashLookup = await request(`/api/orders/%23${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(postSubmitHashLookup.ok, `Post-submit lookup /api/orders/%23${orderId} returned 200 OK`);

  // 6. Admin Payment Approval
  console.log('\n--- PHASE 5: ADMIN APPROVAL FLOW ---');
  const adminRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminRes.ok, 'Super Admin authenticated');
  const adminCookie = adminRes.headers.get('set-cookie') || '';

  const verifyRes = await request('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      orderId,
      paymentId: `pay-${orderId}`,
      action: 'approve'
    })
  });
  assert(verifyRes.ok && verifyRes.data.success, 'Admin approved payment');

  // Customer fetches approved order
  const approvedLookup = await request(`/api/orders/${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(approvedLookup.ok, `Customer lookup of approved order returned 200 OK`);
  assert(approvedLookup.data.paymentStatus === 'PAID', 'Order paymentStatus transitioned to PAID');
  assert(approvedLookup.data.status === 'Confirmed', 'Order status transitioned to Confirmed');

  console.log('\n========================================================================');
  console.log(`PAYMENT SUBMISSION SUITE: ${passed} PASSED, ${failed} FAILED across ${passed + failed} Tests`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error in payment submission test suite:', err);
  process.exit(1);
});
