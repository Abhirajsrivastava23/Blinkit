/**
 * Comprehensive Test Suite: Payment Proof Submission & Order Lookup End-to-End
 * Covers:
 * 1. Customer Authentication
 * 2. Order Creation
 * 3. Resilient Multi-Format Order Lookup (#FT..., %23FT..., FT..., ft...)
 * 4. Multipart Payment Proof Submission
 * 5. DB Persistence & Verification
 * 6. Customer Order Status (PAYMENT_VERIFICATION_PENDING)
 * 7. Admin Payment Queue Verification (/api/admin/payments/pending)
 * 8. Admin Rejection with Reason
 * 9. Customer Status after Rejection
 * 10. Customer Re-submission of Corrected Proof
 * 11. Admin Approval (/api/payments/verify)
 * 12. Customer Status after Approval (PAID / Confirmed)
 * 13. Invalid Non-Existent Order Error Verification (404)
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

async function runTests() {
  console.log('========================================================================');
  console.log('  FATAFAT PAYMENT SUBMISSION & COMPLETE LIFECYCLE AUDIT                 ');
  console.log('========================================================================\n');

  // 1. Authenticate Customer
  console.log('--- 1. CUSTOMER AUTHENTICATION ---');
  const custPhone = '98765' + Math.floor(10000 + Math.random() * 90000);
  const authRes = await request('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: custPhone, name: 'Production Flow Tester' })
  });
  assert(authRes.ok, 'Customer authenticated successfully');
  const custCookie = authRes.headers.get('set-cookie') || '';

  // 2. Place Order
  console.log('\n--- 2. ORDER CREATION ---');
  const orderRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: custCookie },
    body: JSON.stringify({
      items: [{ productId: 'cake-1', name: 'Dutch Truffle Cake', category: 'cakes', price: 549, quantity: 1 }],
      address: { name: 'Production Flow Tester', mobile: custPhone, house: 'Flat 101', street: 'MG Road', area: 'Civil Lines', city: 'Lucknow', pincode: '226001' },
      deliveryOption: 'ASAP'
    })
  });
  assert(orderRes.ok && orderRes.data.order?.id, 'Order created successfully in database');
  const createdOrder = orderRes.data.order;
  const orderId = createdOrder.id;
  console.log(`  Order ID: ${orderId}`);

  // 3. Multi-Format Resilient Lookup
  console.log('\n--- 3. MULTI-FORMAT ORDER LOOKUP ---');
  const cleanLookup = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(cleanLookup.ok && cleanLookup.data.id === orderId, `Clean ID lookup /api/orders/${orderId} returned 200 OK`);

  const hashLookup = await request(`/api/orders/%23${orderId}`, { headers: { Cookie: custCookie } });
  assert(hashLookup.ok && hashLookup.data.id === orderId, `Hash encoded lookup /api/orders/%23${orderId} returned 200 OK`);

  const lowerLookup = await request(`/api/orders/${orderId.toLowerCase()}`, { headers: { Cookie: custCookie } });
  assert(lowerLookup.ok && lowerLookup.data.id === orderId, `Lowercase lookup /api/orders/${orderId.toLowerCase()} returned 200 OK`);

  // 4. Payment Proof Submission
  console.log('\n--- 4. MULTIPART PAYMENT PROOF SUBMISSION ---');
  const dummyBase64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const dummyBuffer = Buffer.from(dummyBase64Png, 'base64');
  
  const mp1 = createMultipartBody({
    orderId,
    paymentId: `pay-${orderId}`,
    amount: '598',
    utr: '123456789012',
    orderData: JSON.stringify(createdOrder)
  }, dummyBuffer, 'payment_receipt.png', 'image/png');

  const submitRes1 = await request('/api/payments/submit', {
    method: 'POST',
    headers: { 'Content-Type': mp1.contentType, Cookie: custCookie },
    body: mp1.body
  });

  assert(submitRes1.ok, `Payment submission returned HTTP 200: ${submitRes1.status}`);
  assert(submitRes1.data?.success === true, 'Response contains success: true');
  assert(submitRes1.data?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Payment status set to PAYMENT_VERIFICATION_PENDING');

  // 5. Customer Status Verification
  console.log('\n--- 5. CUSTOMER ORDER STATUS AFTER SUBMISSION ---');
  const custAfterSubmit = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(custAfterSubmit.ok, 'Customer order retrieved after submission');
  assert(custAfterSubmit.data.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Order paymentStatus is PAYMENT_VERIFICATION_PENDING');
  assert(custAfterSubmit.data.utr === '123456789012', 'UTR stored correctly');

  // 6. Admin Payment Queue Presence
  console.log('\n--- 6. ADMIN PAYMENT QUEUE VERIFICATION ---');
  const adminRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminRes.ok, 'Admin authenticated');
  const adminCookie = adminRes.headers.get('set-cookie') || '';

  const pendingRes = await request('/api/admin/payments/pending', { headers: { Cookie: adminCookie } });
  assert(pendingRes.ok, 'Admin pending queue retrieved (200 OK)');
  const pendingList = Array.isArray(pendingRes.data) ? pendingRes.data : (pendingRes.data?.pendingPayments || []);
  const inQueue = pendingList.some((p) => p.orderId === orderId);
  assert(inQueue, `Order ${orderId} appears in Admin Pending Payments Queue`);

  // 7. Admin Rejection Flow
  console.log('\n--- 7. ADMIN REJECTION FLOW ---');
  const rejectionMsg = 'UTR not visible on bank slip. Please upload full slip.';
  const rejectRes = await request('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      orderId,
      paymentId: `pay-${orderId}`,
      action: 'reject',
      rejectionReason: rejectionMsg
    })
  });
  assert(rejectRes.ok && rejectRes.data.success, 'Admin rejected payment with reason');

  const custAfterReject = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(custAfterReject.ok, 'Customer retrieved rejected order');
  assert(custAfterReject.data.paymentStatus === 'REJECTED', 'Order paymentStatus transitioned to REJECTED');
  assert(custAfterReject.data.rejectionReason === rejectionMsg, 'Rejection reason visible to customer');

  // 8. Customer Re-submission
  console.log('\n--- 8. CUSTOMER CORRECTED RE-SUBMISSION ---');
  const mp2 = createMultipartBody({
    orderId,
    paymentId: `pay-${orderId}`,
    amount: '598',
    utr: '987654321098',
    orderData: JSON.stringify(custAfterReject.data)
  }, dummyBuffer, 'corrected_receipt.png', 'image/png');

  const submitRes2 = await request('/api/payments/submit', {
    method: 'POST',
    headers: { 'Content-Type': mp2.contentType, Cookie: custCookie },
    body: mp2.body
  });
  assert(submitRes2.ok && submitRes2.data.success, 'Corrected proof re-submitted successfully (200 OK)');

  const custAfterResubmit = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(custAfterResubmit.data.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Payment status reset to PAYMENT_VERIFICATION_PENDING');
  assert(custAfterResubmit.data.utr === '987654321098', 'Corrected UTR updated');

  // 9. Admin Approval Flow
  console.log('\n--- 9. ADMIN APPROVAL FLOW ---');
  const approveRes = await request('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      orderId,
      paymentId: `pay-${orderId}`,
      action: 'approve'
    })
  });
  assert(approveRes.ok && approveRes.data.success, 'Admin approved payment');

  const custAfterApprove = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(custAfterApprove.ok, 'Customer retrieved approved order');
  assert(custAfterApprove.data.paymentStatus === 'PAID', 'Order paymentStatus is PAID');
  assert(custAfterApprove.data.status === 'Confirmed', 'Order status is Confirmed');

  // 10. Non-Existent Order Submission Error Check
  console.log('\n--- 10. NON-EXISTENT ORDER ERROR CHECK ---');
  const nonExistentMp = createMultipartBody({
    orderId: 'FTNONEXISTENT999999',
    paymentId: 'pay-NONEXISTENT',
    amount: '100',
    utr: '000000000000'
  }, dummyBuffer, 'fake.png', 'image/png');

  const nonExistentRes = await request('/api/payments/submit', {
    method: 'POST',
    headers: { 'Content-Type': nonExistentMp.contentType, Cookie: custCookie },
    body: nonExistentMp.body
  });
  assert(nonExistentRes.status === 404, `Non-existent order properly returned HTTP 404: ${nonExistentRes.status}`);
  assert(nonExistentRes.data?.error === 'Order not found in records.', 'Error message correctly states "Order not found in records."');

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
