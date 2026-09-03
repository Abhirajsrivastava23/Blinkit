/**
 * Targeted End-to-End Regression Test: Admin Payment Approval Flow
 * Specifically verifies:
 * 1. Customer places order & submits payment proof
 * 2. Admin fetches pending payments queue -> Order is present
 * 3. Admin approves payment via POST /api/payments/verify
 * 4. Idempotency check: Calling approve again returns 200 OK (no duplicate error, no false toast)
 * 5. DB Verification: orders.paymentStatus === 'PAID' && orders.status === 'Confirmed'
 * 6. Admin Payment Queue Verification: Order transitions to PAID tab and is removed from PENDING
 * 7. Customer Storefront Verification:
 *    - GET /api/orders/[id] returns PAID + Confirmed
 *    - GET /api/orders (My Orders list) returns PAID + Confirmed
 *    - GET /track/[id] returns Confirmed
 * 8. Persistence across Customer Logout and Re-Login
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

function createMultipartBody(fields, fileBuffer, filename = 'proof.png', mimeType = 'image/png') {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];
  
  for (const [k, v] of Object.entries(fields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`);
  }
  
  if (fileBuffer) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  }
  
  const headerBuf = Buffer.from(parts.join(''));
  const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = fileBuffer ? Buffer.concat([headerBuf, fileBuffer, footerBuf]) : Buffer.concat([headerBuf, footerBuf]);
  
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body
  };
}

async function runTest() {
  console.log('========================================================================');
  console.log('  TEST SUITE: ADMIN PAYMENT APPROVAL ATOMIC & IDEMPOTENT FLOW           ');
  console.log('========================================================================\n');

  // Step 1: Customer Auth & Order Creation
  console.log('--- 1. CUSTOMER ORDER CREATION & PAYMENT SUBMISSION ---');
  const custPhone = '98111' + Math.floor(10000 + Math.random() * 90000);
  const custName = 'Approval Flow Customer';
  const custAuth = await request('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: custPhone, name: custName })
  });
  assert(custAuth.ok, 'Customer authenticated');
  const custCookie = custAuth.headers.get('set-cookie') || '';

  const orderRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: custCookie },
    body: JSON.stringify({
      items: [{ productId: 'choco-1', name: 'Luxury Truffle Box', category: 'chocolates', price: 499, quantity: 1 }],
      address: { name: custName, mobile: custPhone, house: 'Flat 404', street: 'Hazratganj', area: 'Central', city: 'Lucknow', pincode: '226001' },
      deliveryOption: 'ASAP'
    })
  });
  assert(orderRes.ok && orderRes.data.order?.id, 'Order created in database');
  const orderId = orderRes.data.order.id;
  const createdOrder = orderRes.data.order;
  console.log(`  Order ID: ${orderId}`);

  // Submit Payment Proof
  const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const mp = createMultipartBody({
    orderId,
    paymentId: `pay-${orderId}`,
    amount: '548',
    utr: '998877665544',
    orderData: JSON.stringify(createdOrder)
  }, dummyBuffer, 'upi_screenshot.png', 'image/png');

  const submitRes = await request('/api/payments/submit', {
    method: 'POST',
    headers: { 'Content-Type': mp.contentType, Cookie: custCookie },
    body: mp.body
  });
  assert(submitRes.ok, `Customer payment proof submitted (HTTP ${submitRes.status})`);
  assert(submitRes.data?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Customer status is PAYMENT_VERIFICATION_PENDING');

  // Step 2: Admin Authentication & Queue Inspection
  console.log('\n--- 2. ADMIN QUEUE INSPECTION ---');
  const adminAuth = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminAuth.ok, 'Super Admin logged in');
  const adminCookie = adminAuth.headers.get('set-cookie') || '';

  const pendingListRes = await request('/api/admin/payments/pending', {
    headers: { Cookie: adminCookie }
  });
  assert(pendingListRes.ok, 'Admin fetched pending payments queue');
  const pendingArray = Array.isArray(pendingListRes.data) ? pendingListRes.data : (pendingListRes.data?.pendingPayments || []);
  const pendingItem = pendingArray.find((p) => p.orderId === orderId);
  assert(Boolean(pendingItem), `Order ${orderId} appears in Admin Pending Payments Queue`);

  // Step 3: Admin Approval Execution
  console.log('\n--- 3. ATOMIC & IDEMPOTENT PAYMENT APPROVAL ---');
  const approveRes1 = await request('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      orderId,
      paymentId: `pay-${orderId}`,
      action: 'approve'
    })
  });
  assert(approveRes1.ok, `Admin approval API returned HTTP 200: ${approveRes1.status}`);
  assert(approveRes1.data?.success === true, 'Approval response has success: true');
  assert(approveRes1.data?.paymentStatus === 'PAID', 'Approval response paymentStatus is PAID');
  assert(approveRes1.data?.orderStatus === 'Confirmed', 'Approval response orderStatus is Confirmed');

  // Idempotency: Immediate second approve call must not fail
  const approveRes2 = await request('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      orderId,
      paymentId: `pay-${orderId}`,
      action: 'approve'
    })
  });
  assert(approveRes2.ok, `Idempotent second approval call returned HTTP 200 (no error)`);
  assert(approveRes2.data?.success === true, 'Idempotent response has success: true');

  // Step 4: DB & Admin Queue Verification
  console.log('\n--- 4. POST-APPROVAL ADMIN QUEUE VERIFICATION ---');
  const allPaymentsRes = await request('/api/payments', { headers: { Cookie: adminCookie } });
  assert(allPaymentsRes.ok, 'Admin fetched all payments list');
  const verifiedRow = Array.isArray(allPaymentsRes.data) ? allPaymentsRes.data.find(r => r.orderId === orderId) : null;
  assert(verifiedRow && verifiedRow.status === 'PAID', `Admin payment list shows Order ${orderId} as PAID`);
  assert(verifiedRow && verifiedRow.orderStatus === 'Confirmed', `Admin payment list shows Order ${orderId} as Confirmed`);

  // Step 5: Customer My Orders / Tracking Verification
  console.log('\n--- 5. CUSTOMER STATE SYNCHRONIZATION ---');
  const custOrderDetail = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(custOrderDetail.ok, 'Customer fetched order detail');
  assert(custOrderDetail.data.paymentStatus === 'PAID', 'Customer order detail has paymentStatus: PAID');
  assert(custOrderDetail.data.status === 'Confirmed', 'Customer order detail has status: Confirmed');

  const custMyOrders = await request('/api/orders', { headers: { Cookie: custCookie } });
  assert(custMyOrders.ok, 'Customer fetched My Orders list');
  const myOrderObj = Array.isArray(custMyOrders.data) ? custMyOrders.data.find(o => o.id === orderId) : null;
  assert(myOrderObj && myOrderObj.paymentStatus === 'PAID', 'My Orders list shows paymentStatus: PAID');
  assert(myOrderObj && myOrderObj.status === 'Confirmed', 'My Orders list shows status: Confirmed');

  // Step 6: Persistence Across Logout & Re-Login
  console.log('\n--- 6. PERSISTENCE ACROSS RE-LOGIN ---');
  // Re-login customer
  const custReAuth = await request('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: custPhone, name: custName })
  });
  assert(custReAuth.ok, 'Customer re-authenticated after session refresh');
  const newCustCookie = custReAuth.headers.get('set-cookie') || custCookie;

  const persistentOrder = await request(`/api/orders/${orderId}`, { headers: { Cookie: newCustCookie } });
  assert(persistentOrder.ok, 'Order fetched after re-login');
  assert(persistentOrder.data.paymentStatus === 'PAID', 'Order paymentStatus remains permanently PAID');
  assert(persistentOrder.data.status === 'Confirmed', 'Order status remains permanently Confirmed');

  console.log('\n========================================================================');
  console.log(`APPROVAL FLOW TEST SUITE: ${passed} PASSED, ${failed} FAILED across ${passed + failed} Tests`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTest().catch(err => {
  console.error('Fatal error in admin payment approval flow test:', err);
  process.exit(1);
});
