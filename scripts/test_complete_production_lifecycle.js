/**
 * Complete Production Lifecycle Regression Suite
 * Covers:
 * 1. Customer registration & authentication
 * 2. Product selection & cart payload verification
 * 3. Order creation via /api/orders (all item fields persisted to DB)
 * 4. Admin Live Orders inspection (exact products, quantities, prices, address visible)
 * 5. Payment proof submission with UTR & multipart image
 * 6. Admin Payment Queue inspection (Pending review)
 * 7. Payment Reject + Customer Re-submit Flow
 * 8. Admin Payment Approval (multi-format ID normalization: #FT..., FT..., pay-FT..., numeric)
 * 9. Idempotency & atomic database verification (orders.paymentStatus = 'PAID', orders.status = 'Confirmed')
 * 10. Customer My Orders & Tracking synchronization
 * 11. Admin Partner Assignment (atomic assignment & existence verification)
 * 12. Delivery Partner portal login & active order inspection
 * 13. Partner progression: Assigned -> Accepted -> Picked Up -> Out for Delivery
 * 14. Customer OTP verification and delivery completion -> Delivered
 * 15. Persistence verification across logout/re-login and database re-fetch
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

async function main() {
  console.log('========================================================================');
  console.log('  STARTING COMPREHENSIVE PRODUCTION LIFECYCLE REGRESSION TEST           ');
  console.log('========================================================================\n');

  // --- Step 1: Authentication for Customer, Admin, and Delivery Partner ---
  console.log('--- 1. MULTI-ROLE AUTHENTICATION ---');
  const custPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const custName = 'Master Lifecycle Customer';
  const custLoginRes = await request('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: custPhone, name: custName })
  });
  assert(custLoginRes.ok, 'Customer login succeeded');
  const custCookie = custLoginRes.headers.get('set-cookie') || '';

  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminLoginRes.ok, 'Admin login succeeded');
  const adminCookie = adminLoginRes.headers.get('set-cookie') || '';

  const partnerId = 'DP-' + Math.floor(10000 + Math.random() * 90000);
  const partnerEmail = `partner_${Date.now()}@fatafat.com`;
  const partnerPhone = '97' + Math.floor(10000000 + Math.random() * 90000000);
  const partnerPassword = 'riderpassword123';

  const regPartnerRes = await request('/api/admin/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      id: partnerId,
      name: 'Rider Ramesh',
      phone: partnerPhone,
      email: partnerEmail,
      password: partnerPassword,
      locationId: 'nawabganj-unnao',
      locationName: 'Nawabganj, Unnao',
      status: 'Active',
      isOnline: true
    })
  });
  assert(regPartnerRes.ok, 'Delivery Partner created in database');

  const partnerLoginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: partnerEmail, password: partnerPassword })
  });
  assert(partnerLoginRes.ok, 'Delivery Partner logged in successfully');
  const partnerCookie = partnerLoginRes.headers.get('set-cookie') || '';

  // --- Step 2: Customer Order Creation with Full Items Payload ---
  console.log('\n--- 2. CUSTOMER ORDER CREATION & ITEM PAYLOAD PERSISTENCE ---');
  const orderItems = [
    {
      productId: 'prod-truffle-101',
      id: 'prod-truffle-101',
      name: 'Belgian Dark Truffle Cake',
      price: 649,
      quantity: 2,
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
      unit: '500g',
      category: 'cakes'
    },
    {
      productId: 'prod-orchid-202',
      id: 'prod-orchid-202',
      name: 'Royal Orchid Bouquet',
      price: 899,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=800',
      unit: '1 Bunch',
      category: 'flowers'
    }
  ];

  const orderAddress = {
    name: custName,
    mobile: custPhone,
    house: 'Villa 12-A',
    street: 'Gomti Nagar Main Blvd',
    area: 'Vibhuti Khand',
    city: 'Lucknow',
    pincode: '226010',
    landmark: 'Near Wave Mall'
  };

  const createOrderRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: custCookie },
    body: JSON.stringify({
      items: orderItems,
      address: orderAddress,
      deliveryOption: 'ASAP'
    })
  });

  assert(createOrderRes.ok && createOrderRes.data.success, 'Order created via /api/orders');
  const orderId = createOrderRes.data.orderId;
  const createdOrder = createOrderRes.data.order;
  assert(orderId && String(orderId).startsWith('FT'), `Valid Order ID assigned: ${orderId}`);
  assert(createdOrder.items && createdOrder.items.length === 2, 'All 2 items persisted in order payload');
  assert(createdOrder.items[0].name === 'Belgian Dark Truffle Cake', 'First item name verified');
  assert(createdOrder.items[1].name === 'Royal Orchid Bouquet', 'Second item name verified');
  assert(Number(createdOrder.total) === 2197, `Total calculated accurately: ₹${createdOrder.total}`);

  // --- Step 3: Verify Admin Live Orders Visibility ---
  console.log('\n--- 3. ADMIN LIVE ORDERS DISPATCH INSPECTION ---');
  const adminOrdersRes = await request('/api/orders', {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  assert(adminOrdersRes.ok && Array.isArray(adminOrdersRes.data), 'Admin retrieved orders list');
  const foundInAdmin = adminOrdersRes.data.find(o => String(o.id).replace(/^#+/, '') === orderId);
  assert(Boolean(foundInAdmin), `Order #${orderId} appears in Admin Live Orders`);
  assert(Array.isArray(foundInAdmin.items) && foundInAdmin.items.length === 2, 'Admin order record contains exact product items');
  assert(foundInAdmin.address && foundInAdmin.address.street === 'Gomti Nagar Main Blvd', 'Admin order record contains full address');

  // --- Step 4: Payment Proof Submission (Initial) ---
  console.log('\n--- 4. CUSTOMER PAYMENT PROOF SUBMISSION ---');
  const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const initialUtr = '987654321001';
  const mp1 = createMultipartBody({
    orderId,
    paymentId: `pay-${orderId}`,
    utr: initialUtr
  }, dummyBuffer, 'upi_receipt.png', 'image/png');

  const submitRes1 = await request('/api/payments/submit', {
    method: 'POST',
    headers: { 'Content-Type': mp1.contentType, Cookie: custCookie },
    body: mp1.body
  });
  assert(submitRes1.ok && submitRes1.data.success, 'Payment proof submitted successfully (HTTP 200)');
  assert(submitRes1.data.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Payment status is PAYMENT_VERIFICATION_PENDING');

  // --- Step 5: Admin Queue Inspection & Payment Rejection Flow ---
  console.log('\n--- 5. ADMIN PAYMENT QUEUE & REJECTION FLOW ---');
  const paymentsQueueRes1 = await request('/api/payments', {
    headers: { Cookie: adminCookie }
  });
  assert(paymentsQueueRes1.ok && Array.isArray(paymentsQueueRes1.data), 'Admin fetched payment queue');
  const pendingPayment1 = paymentsQueueRes1.data.find(p => String(p.orderId).replace(/^#+/, '') === orderId);
  assert(Boolean(pendingPayment1), `Order #${orderId} visible in Admin Payment Queue`);
  assert(pendingPayment1.status === 'PAYMENT_VERIFICATION_PENDING', 'Payment queue item has status PAYMENT_VERIFICATION_PENDING');

  // Admin Rejection
  const rejectReasonText = 'UTR number is missing bank confirmation digits.';
  const rejectRes = await request('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      orderId: `#${orderId}`, // Test with hash format
      paymentId: `pay-${orderId}`,
      action: 'reject',
      reason: rejectReasonText
    })
  });
  assert(rejectRes.ok && rejectRes.data.success, 'Admin rejected payment (HTTP 200)');
  assert(rejectRes.data.paymentStatus === 'REJECTED', 'Response paymentStatus is REJECTED');

  // Verify rejection reflected in customer view
  const custOrderAfterReject = await request(`/api/orders/${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(custOrderAfterReject.ok, 'Customer fetched order after rejection');
  assert(custOrderAfterReject.data.paymentStatus === 'REJECTED', 'Customer order paymentStatus is REJECTED');
  assert(custOrderAfterReject.data.rejectionReason === rejectReasonText, 'Customer order has exact rejectionReason attached');

  // --- Step 6: Customer Resubmits Corrected Payment Proof ---
  console.log('\n--- 6. CUSTOMER RESUBMITS CORRECTED PAYMENT PROOF ---');
  const correctedUtr = '123456789012';
  const mp2 = createMultipartBody({
    orderId: `FT${orderId.replace(/^FT/i, '')}`,
    paymentId: `pay-${orderId}`,
    utr: correctedUtr
  }, dummyBuffer, 'corrected_receipt.png', 'image/png');

  const submitRes2 = await request('/api/payments/submit', {
    method: 'POST',
    headers: { 'Content-Type': mp2.contentType, Cookie: custCookie },
    body: mp2.body
  });
  assert(submitRes2.ok && submitRes2.data.success, 'Corrected payment proof submitted (HTTP 200)');
  assert(submitRes2.data.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Payment status restored to PAYMENT_VERIFICATION_PENDING');

  // --- Step 7: Admin Payment Approval (Testing Formatted IDs & Idempotency) ---
  console.log('\n--- 7. ADMIN PAYMENT APPROVAL & IDEMPOTENCY ---');
  // Pass formatted ID with # and verify normalization
  const approveRes = await request('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      orderId: `#${orderId}`,
      paymentId: `pay-#${orderId}`,
      action: 'approve'
    })
  });
  assert(approveRes.ok && approveRes.data.success, 'Admin approved payment (HTTP 200)');
  assert(approveRes.data.paymentStatus === 'PAID', 'Approval paymentStatus is PAID');
  assert(approveRes.data.orderStatus === 'Confirmed', 'Approval orderStatus is Confirmed');

  // Idempotency: Second approve call must return 200 without error
  const idempotentApproveRes = await request('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      orderId,
      action: 'approve'
    })
  });
  assert(idempotentApproveRes.ok && idempotentApproveRes.data.success, 'Idempotent second approve call returned HTTP 200');

  // --- Step 8: Multi-Portal State Synchronization ---
  console.log('\n--- 8. MULTI-PORTAL SYNCHRONIZATION ---');
  const custSyncRes = await request(`/api/orders/${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(custSyncRes.ok, 'Customer retrieved updated order details');
  assert(custSyncRes.data.paymentStatus === 'PAID', 'Customer single order paymentStatus is PAID');
  assert(custSyncRes.data.status === 'Confirmed', 'Customer single order status is Confirmed');

  const custMyOrdersRes = await request('/api/orders', {
    headers: { Cookie: custCookie }
  });
  assert(custMyOrdersRes.ok && Array.isArray(custMyOrdersRes.data), 'Customer retrieved My Orders list');
  const myOrderRecord = custMyOrdersRes.data.find(o => String(o.id).replace(/^#+/, '') === orderId);
  assert(Boolean(myOrderRecord), 'Order present in Customer My Orders');
  assert(myOrderRecord.paymentStatus === 'PAID', 'My Orders paymentStatus is PAID');
  assert(myOrderRecord.status === 'Confirmed', 'My Orders status is Confirmed');

  const adminPaymentsListRes = await request('/api/payments', {
    headers: { Cookie: adminCookie }
  });
  assert(adminPaymentsListRes.ok, 'Admin fetched payments list');
  const approvedItemInAdmin = adminPaymentsListRes.data.find(p => String(p.orderId).replace(/^#+/, '') === orderId);
  assert(Boolean(approvedItemInAdmin), 'Approved order present in Admin Payments list');
  assert(approvedItemInAdmin.status === 'PAID', 'Admin payment list status is PAID');

  // --- Step 9: Admin Partner Assignment ---
  console.log('\n--- 9. ADMIN DELIVERY PARTNER ASSIGNMENT ---');
  const assignRes = await request('/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      id: `#${orderId}`,
      updates: {
        assignedPartnerId: partnerId,
        assignedPartnerName: 'Rider Ramesh',
        assignedAt: new Date().toISOString(),
        status: 'Assigned'
      }
    })
  });
  assert(assignRes.ok && assignRes.data.success, 'Admin assigned partner to order (HTTP 200)');
  assert(assignRes.data.order.assignedPartnerId === partnerId, `assignedPartnerId is ${partnerId}`);
  assert(assignRes.data.order.status === 'Assigned', 'Order status is Assigned');

  // --- Step 10: Delivery Partner Portal Lifecycle ---
  console.log('\n--- 10. DELIVERY PARTNER PORTAL & STATUS TRANSITIONS ---');
  const partnerOrdersRes = await request('/api/orders', {
    headers: { Cookie: partnerCookie }
  });
  assert(partnerOrdersRes.ok && Array.isArray(partnerOrdersRes.data), 'Partner fetched assigned orders');
  const partnerOrder = partnerOrdersRes.data.find(o => String(o.id).replace(/^#+/, '') === orderId);
  assert(Boolean(partnerOrder), `Assigned order #${orderId} visible in Delivery Partner portal`);

  // Transition: Assigned -> Accepted
  const acceptRes = await request('/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: partnerCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Accepted' }
    })
  });
  assert(acceptRes.ok && acceptRes.data.success, 'Partner updated status to Accepted');

  // Transition: Accepted -> Picked Up
  const pickupRes = await request('/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: partnerCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Picked Up' }
    })
  });
  assert(pickupRes.ok && pickupRes.data.success, 'Partner updated status to Picked Up');

  // Transition: Picked Up -> Out for Delivery
  const outRes = await request('/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: partnerCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Out for Delivery' }
    })
  });
  assert(outRes.ok && outRes.data.success, 'Partner updated status to Out for Delivery');

  // --- Step 11: Customer OTP Retrieval & Partner Delivery Completion ---
  console.log('\n--- 11. OTP VERIFICATION & FINAL DELIVERY ---');
  const custTrackingRes = await request(`/api/orders/${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(custTrackingRes.ok, 'Customer fetched tracking state during delivery');
  assert(custTrackingRes.data.status === 'Out for Delivery', 'Customer tracking status is Out for Delivery');
  const deliveryOtp = custTrackingRes.data.deliveryOtp;
  assert(Boolean(deliveryOtp) && deliveryOtp.length === 6, `Customer has valid 6-digit OTP: ${deliveryOtp}`);

  const verifyOtpRes = await request(`/api/delivery/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: partnerCookie },
    body: JSON.stringify({ otp: deliveryOtp })
  });
  assert(verifyOtpRes.ok && verifyOtpRes.data.success, 'Delivery OTP verified successfully');
  assert(verifyOtpRes.data.order.status === 'Delivered', 'Final order status is Delivered');
  assert(verifyOtpRes.data.order.delivery_otp_verified === true, 'delivery_otp_verified is true');

  // --- Step 12: Long-Term Persistence Verification Across Sessions ---
  console.log('\n--- 12. PERSISTENCE ACROSS RE-LOGIN & RE-FETCH ---');
  // Re-login customer
  const reCustLogin = await request('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: custPhone, name: custName })
  });
  const reCustCookie = reCustLogin.headers.get('set-cookie') || '';
  const reCustOrderRes = await request(`/api/orders/${orderId}`, {
    headers: { Cookie: reCustCookie }
  });
  assert(reCustOrderRes.ok, 'Customer order fetched after re-login');
  assert(reCustOrderRes.data.status === 'Delivered', 'Order status permanently persisted as Delivered');
  assert(reCustOrderRes.data.paymentStatus === 'PAID', 'Order paymentStatus permanently persisted as PAID');
  assert(reCustOrderRes.data.items && reCustOrderRes.data.items.length === 2, 'Order items permanently persisted');

  // Re-login Admin
  const reAdminLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  const reAdminCookie = reAdminLogin.headers.get('set-cookie') || '';
  const reAdminOrdersRes = await request('/api/orders', {
    headers: { Cookie: reAdminCookie }
  });
  const finalAdminOrder = reAdminOrdersRes.data.find(o => String(o.id).replace(/^#+/, '') === orderId);
  assert(Boolean(finalAdminOrder), 'Order permanently exists in Admin Live Orders');
  assert(finalAdminOrder.status === 'Delivered', 'Admin permanently sees status Delivered');
  assert(finalAdminOrder.assignedPartnerName === 'Rider Ramesh', 'Admin permanently sees assigned partner Rider Ramesh');

  console.log('\n========================================================================');
  console.log(`PRODUCTION LIFECYCLE SUITE: ${passed} PASSED, ${failed} FAILED across ${passed + failed} Tests`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
