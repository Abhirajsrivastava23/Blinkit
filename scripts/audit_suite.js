const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function runAudit() {
  console.log('========================================================================');
  console.log('    FATAFAT PRODUCTION A-TO-Z COMPLETE VERIFICATION AUDIT SUITE        ');
  console.log('========================================================================\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function record(name, pass, details = '') {
    if (pass) {
      results.passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      results.failed++;
      console.error(`  [FAIL] ${name} -> ${details}`);
    }
    results.tests.push({ name, pass, details });
  }

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION & ROLE ISOLATION AUDIT
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: AUTHENTICATION & ROLE SECURITY ISOLATION ---');

  // Customer A
  const custAEmail = `audit.cust.a.${Date.now()}@fatafat.com`;
  const custALoginRes = await fetch(`${baseUrl}/api/auth/customer-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: custAEmail, phone: '9811223344', name: 'Customer Audit User A' })
  });
  const custACookie = custALoginRes.headers.get('set-cookie');
  record('Customer A Signup / Login', custALoginRes.status === 200 && !!custACookie);

  // Customer B
  const custBEmail = `audit.cust.b.${Date.now()}@fatafat.com`;
  const custBLoginRes = await fetch(`${baseUrl}/api/auth/customer-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: custBEmail, phone: '9822334455', name: 'Customer Audit User B' })
  });
  const custBCookie = custBLoginRes.headers.get('set-cookie');
  record('Customer B Signup / Login', custBLoginRes.status === 200 && !!custBCookie);

  // Admin
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  record('Admin Authentication', adminLoginRes.status === 200 && !!adminCookie);

  // Delivery Partner
  const riderId = `DP-AUDIT-${Math.floor(100 + Math.random() * 900)}`;
  const riderEmail = `${riderId.toLowerCase()}@fatafat.com`;
  await fetch(`${baseUrl}/api/admin/partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: riderId,
      name: 'Rider Audit Tester',
      phone: '9833445566',
      email: riderEmail,
      password: 'partnerpassword123',
      locationId: 'nawabganj-unnao',
      locationName: 'Nawabganj, Unnao'
    })
  });

  const riderLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: riderEmail, password: 'partnerpassword123' })
  });
  const riderCookie = riderLoginRes.headers.get('set-cookie');
  record('Delivery Partner Authentication', riderLoginRes.status === 200 && !!riderCookie);

  // Session Verification
  const meCust = await fetch(`${baseUrl}/api/auth/me`, { headers: { 'Cookie': custACookie } }).then(r => r.json());
  record('Customer Session Identity (/api/auth/me)', meCust.authenticated && meCust.user?.role === 'customer');

  const meAdmin = await fetch(`${baseUrl}/api/auth/me`, { headers: { 'Cookie': adminCookie } }).then(r => r.json());
  record('Admin Session Identity (/api/auth/me)', meAdmin.authenticated && meAdmin.user?.role === 'admin');

  const meRider = await fetch(`${baseUrl}/api/auth/me`, { headers: { 'Cookie': riderCookie } }).then(r => r.json());
  record('Rider Session Identity (/api/auth/me)', meRider.authenticated && meRider.user?.role === 'delivery_partner');

  // Role Security Isolation
  const custAccessAdminApi = await fetch(`${baseUrl}/api/admin/payment-settings`, { headers: { 'Cookie': custACookie } });
  record('Security: Customer Blocked from Admin APIs (403)', custAccessAdminApi.status === 403);

  const riderAccessAdminApi = await fetch(`${baseUrl}/api/admin/payment-settings`, { headers: { 'Cookie': riderCookie } });
  record('Security: Delivery Partner Blocked from Admin APIs (403)', riderAccessAdminApi.status === 403);

  const unauthAccessAdminApi = await fetch(`${baseUrl}/api/admin/payment-settings`);
  record('Security: Unauthenticated Blocked from Admin APIs (403/401)', unauthAccessAdminApi.status === 403 || unauthAccessAdminApi.status === 401);

  // -------------------------------------------------------------------------
  // 2. STOREFRONT CATALOG, SEARCH & PROFILE AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: STOREFRONT CATALOG, SEARCH & PROFILE ---');

  const productsRes = await fetch(`${baseUrl}/api/products`);
  const productsData = await productsRes.json();
  record('Public Product Catalog Listing (/api/products)', productsRes.status === 200 && Array.isArray(productsData) && productsData.length > 0);

  const singleProdRes = await fetch(`${baseUrl}/api/products/choco-9`);
  const singleProdData = await singleProdRes.json();
  record('Single Product Detail Retrieval (/api/products/choco-9)', singleProdRes.status === 200 && singleProdData?.id === 'choco-9');

  const categoriesRes = await fetch(`${baseUrl}/api/categories`);
  const categoriesData = await categoriesRes.json();
  record('Categories Catalog Listing (/api/categories)', categoriesRes.status === 200 && Array.isArray(categoriesData) && categoriesData.length > 0);

  const brandsRes = await fetch(`${baseUrl}/api/brands`);
  const brandsData = await brandsRes.json();
  record('Brands Catalog Listing (/api/brands)', brandsRes.status === 200 && Array.isArray(brandsData) && brandsData.length > 0);

  // Customer Profile & Address Management
  const profileGetRes = await fetch(`${baseUrl}/api/profile`, { headers: { 'Cookie': custACookie } });
  const profileGetData = await profileGetRes.json();
  record('Customer Profile GET (/api/profile)', profileGetRes.status === 200 && profileGetData?.user?.email === custAEmail);

  const newAddress = {
    id: `addr-${Date.now()}`,
    name: 'Customer Audit User A',
    mobile: '9811223344',
    house: '101',
    street: 'Audit Street',
    area: 'Tech City',
    city: 'Noida',
    pincode: '201301',
    landmark: 'Near Tower 1'
  };

  const profileUpdateRes = await fetch(`${baseUrl}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({
      phone: '9811223344',
      addresses: [newAddress]
    })
  });
  const profileUpdateData = await profileUpdateRes.json();
  record('Customer Address & Profile Update (/api/profile)', profileUpdateRes.status === 200 && Array.isArray(profileUpdateData?.user?.addresses));

  // -------------------------------------------------------------------------
  // 3. ORDER CREATION & CROSS-USER ISOLATION AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: ORDER CREATION & CROSS-USER ISOLATION ---');

  const orderAId = `FT${Math.floor(100000 + Math.random() * 900000)}`;
  const orderARes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({
      id: orderAId,
      items: [{ productId: 'choco-9', name: 'Peppermint Dark Chocolate Squares', price: 249, quantity: 1, image: '' }],
      address: newAddress,
      deliveryOption: 'ASAP',
      deliveryTimeSlot: 'Within 15 mins',
      pricing: { subtotal: 249, deliveryFee: 0, discount: 0, total: 249 },
      paymentMethod: 'UPI'
    })
  });
  const orderAData = await orderARes.json();
  record('Customer A Order Creation (/api/orders)', orderARes.status === 200 && orderAData?.order?.id === orderAId);
  const deliveryOtp = orderAData?.order?.deliveryOtp;

  // Customer A retrieves own order
  const custAGetOrder = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: { 'Cookie': custACookie } });
  record('Customer A Access Own Order (/api/orders/[id])', custAGetOrder.status === 200);

  // Case-insensitive and leading # lookup test
  const custALowerLookup = await fetch(`${baseUrl}/api/orders/${orderAId.toLowerCase()}`, { headers: { 'Cookie': custACookie } });
  record('Case-Insensitive Order Lookup (lowercase)', custALowerLookup.status === 200);

  const custAPrefixLookup = await fetch(`${baseUrl}/api/orders/%23${orderAId}`, { headers: { 'Cookie': custACookie } });
  record('Prefix # Order Lookup (%23ID)', custAPrefixLookup.status === 200);

  // Cross-Customer Isolation: Customer B cannot see Customer A's order in My Orders
  const custBOrders = await fetch(`${baseUrl}/api/orders`, { headers: { 'Cookie': custBCookie } }).then(r => r.json());
  const foundOrderAInB = custBOrders.some((o) => o.id === orderAId);
  record('Security: Customer B Cannot See Customer A Orders in My Orders', !foundOrderAInB);

  // Cross-Customer Isolation: Customer B cannot cancel Customer A's order
  const custBCancelA = await fetch(`${baseUrl}/api/orders/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custBCookie },
    body: JSON.stringify({ id: orderAId, updates: { status: 'Cancelled' } })
  });
  record('Security: Customer B Forbidden from Cancelling Customer A Order (403)', custBCancelA.status === 403);

  // -------------------------------------------------------------------------
  // 4. RAZORPAY GATEWAY PAYMENT FLOW (CREATE -> FRAUD REJECT -> HMAC VERIFY)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: RAZORPAY PAYMENT LIFECYCLE (CREATE -> VERIFY -> CONFIRM) ---');

  // 4a. Razorpay Order Creation
  const rzpOrderRes = await fetch(`${baseUrl}/api/payments/razorpay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({ orderId: orderAId })
  });
  const rzpOrderData = await rzpOrderRes.json();
  const rzpOrderId = rzpOrderData?.orderId;
  record('Razorpay Gateway Order Creation (/api/payments/razorpay/create-order)', rzpOrderRes.status === 200 && Boolean(rzpOrderId));

  // 4b. Security Check: Invalid HMAC Signature Rejection
  const fakeSig = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  const fraudVerifyRes = await fetch(`${baseUrl}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({
      orderId: orderAId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: `pay_fake_${Date.now()}`,
      razorpay_signature: fakeSig
    })
  });
  record('Security: Server Rejects Invalid Signature with HTTP 400', fraudVerifyRes.status === 400);

  // 4c. Server-Side HMAC-SHA256 Signature Verification
  let keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
      const match = envContent.match(/RAZORPAY_KEY_SECRET=["']?([^"'\r\n]+)/);
      if (match) keySecret = match[1];
    } catch {}
  }
  keySecret = keySecret || 'Exu52JSFtzFtar9AwgZEE57H';
  const crypto = require('crypto');
  const validPaymentId = `pay_audit_${Date.now()}`;
  const validSignature = crypto.createHmac('sha256', keySecret).update(`${rzpOrderId}|${validPaymentId}`).digest('hex');

  const verifyRes = await fetch(`${baseUrl}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({
      orderId: orderAId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature
    })
  });
  const verifyData = await verifyRes.json();
  record('Razorpay HMAC Signature Server-Side Verification', verifyRes.status === 200 && verifyData.paymentStatus === 'PAID');

  // 4d. Idempotency Check
  const repeatVerifyRes = await fetch(`${baseUrl}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({
      orderId: orderAId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature
    })
  });
  record('Idempotency on Repeated Razorpay Verification', repeatVerifyRes.status === 200);

  // 4e. Customer Status is PAID / Confirmed in PostgreSQL
  const custAfterApprove = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: { 'Cookie': custACookie } }).then(r => r.json());
  record('Customer Order State is PAID / Confirmed in DB', custAfterApprove.paymentStatus === 'PAID' && custAfterApprove.status === 'Confirmed');

  // -------------------------------------------------------------------------
  // 5. DELIVERY PARTNER LIFECYCLE & MULTI-CLIENT SYNCHRONIZATION
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 5: DELIVERY PARTNER FULL FULFILLMENT & LIVE SYNC ---');

  // Assign Order to Rider
  const assignRes = await fetch(`${baseUrl}/api/orders/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: orderAId,
      updates: {
        assignedPartnerId: riderId,
        assignedPartnerName: 'Rider Audit Tester',
        status: 'Assigned'
      }
    })
  });
  record('Admin Assigns Order to Delivery Partner', assignRes.status === 200);

  // Rider views assigned orders
  const riderOrders = await fetch(`${baseUrl}/api/delivery/orders`, { headers: { 'Cookie': riderCookie } }).then(r => r.json());
  const foundInRiderOrders = riderOrders.some((o) => o.id === orderAId);
  record('Delivery Partner Retrieves Assigned Order (/api/delivery/orders)', foundInRiderOrders);

  // Step 1: Rider Accepts Order
  const riderAcceptRes = await fetch(`${baseUrl}/api/orders/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ id: orderAId, updates: { status: 'Accepted' } })
  });
  const riderAcceptData = await riderAcceptRes.json();
  const custAfterAccept = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: { 'Cookie': custACookie } }).then(r => r.json());
  record('Rider Accepts -> DB: Accepted -> Customer: Accepted', riderAcceptData.order?.status === 'Accepted' && custAfterAccept.status === 'Accepted');

  // Step 2: Rider Hub Pickup
  const riderPickupRes = await fetch(`${baseUrl}/api/orders/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ id: orderAId, updates: { status: 'Picked Up', verifiedItemIds: ['choco-9'], boxSealVerified: true } })
  });
  const riderPickupData = await riderPickupRes.json();
  const custAfterPickup = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: { 'Cookie': custACookie } }).then(r => r.json());
  record('Rider Hub Pickup -> DB: Picked Up -> Customer: Picked Up', riderPickupData.order?.status === 'Picked Up' && custAfterPickup.status === 'Picked Up');

  // Step 3: Rider Starts Transit (Out for Delivery)
  const riderTransitRes = await fetch(`${baseUrl}/api/orders/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ id: orderAId, updates: { status: 'Out for Delivery' } })
  });
  const riderTransitData = await riderTransitRes.json();
  const custAfterTransit = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: { 'Cookie': custACookie } }).then(r => r.json());
  record('Rider Out for Delivery -> DB: Out for Delivery -> Customer: Out for Delivery', riderTransitData.order?.status === 'Out for Delivery' && custAfterTransit.status === 'Out for Delivery');

  // Step 4: Rider Completes Delivery with OTP
  const riderDeliveredRes = await fetch(`${baseUrl}/api/orders/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ id: orderAId, updates: { status: 'Delivered', otpCode: deliveryOtp, otp_verified: true } })
  });
  const riderDeliveredData = await riderDeliveredRes.json();
  const custAfterDelivered = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: { 'Cookie': custACookie } }).then(r => r.json());
  record('Rider Delivered with OTP -> DB: Delivered -> Customer: Delivered', riderDeliveredData.order?.status === 'Delivered' && custAfterDelivered.status === 'Delivered');

  // Customer A cancels order before preparing (create separate test order)
  const cancelTestOrderId = `FT${Math.floor(100000 + Math.random() * 900000)}`;
  await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({
      id: cancelTestOrderId,
      items: [{ productId: 'choco-9', name: 'Peppermint Dark Chocolate Squares', price: 249, quantity: 1, image: '' }],
      address: newAddress,
      deliveryOption: 'ASAP',
      pricing: { subtotal: 249, deliveryFee: 0, discount: 0, total: 249 }
    })
  });

  const cancelRes = await fetch(`${baseUrl}/api/orders/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({ orderId: cancelTestOrderId, reason: 'Test customer cancellation' })
  });
  const cancelData = await cancelRes.json();
  record('Customer Cancels Pending Order (/api/orders/cancel)', cancelRes.status === 200 && cancelData.order?.status === 'Cancelled');

  // Customer regenerates delivery OTP
  const regenOtpRes = await fetch(`${baseUrl}/api/orders/regenerate-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({ id: orderAId })
  });
  const regenOtpData = await regenOtpRes.json();
  record('Customer Regenerates Delivery OTP (/api/orders/regenerate-otp)', regenOtpRes.status === 200 && typeof regenOtpData.deliveryOtp === 'string');

  // -------------------------------------------------------------------------
  // 6. ADMIN DASHBOARD & SETTINGS AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 6: ADMIN DASHBOARD & SETTINGS ---');

  const adminCountsRes = await fetch(`${baseUrl}/api/admin/clean-reset`, { headers: { 'Cookie': adminCookie } });
  const adminCountsData = await adminCountsRes.json();
  record('Admin Live Counts & Metric Bar (/api/admin/clean-reset)', adminCountsRes.status === 200 && typeof adminCountsData.counts?.orders === 'number');

  const adminPaymentSettingsGet = await fetch(`${baseUrl}/api/admin/payment-settings`, { headers: { 'Cookie': adminCookie } });
  record('Admin Payment Settings GET', adminPaymentSettingsGet.status === 200);

  const adminPaymentSettingsPost = await fetch(`${baseUrl}/api/admin/payment-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({ upiId: '8081988627@pthdfc' })
  });
  record('Admin Payment Settings POST (UPI ID Config)', adminPaymentSettingsPost.status === 200);

  const adminWellnessGet = await fetch(`${baseUrl}/api/admin/wellness-settings`, { headers: { 'Cookie': adminCookie } });
  record('Admin Wellness Settings GET', adminWellnessGet.status === 200);

  // -------------------------------------------------------------------------
  // 7. EDGE CASES, INPUT SANITIZATION & SECURITY AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 7: EDGE CASES, SANITIZATION & CONCURRENCY ---');

  // Invalid order ID lookup
  const nonExistentOrder = await fetch(`${baseUrl}/api/orders/NON_EXISTENT_ORDER_999`, { headers: { 'Cookie': custACookie } });
  record('Edge Case: Non-Existent Order Lookup (404)', nonExistentOrder.status === 404);

  // Malformed empty update body
  const emptyUpdate = await fetch(`${baseUrl}/api/orders/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({})
  });
  record('Edge Case: Empty Order Update Body Handled (400)', emptyUpdate.status === 400);

  // Password-protected reset rejection on invalid password
  const invalidResetPass = await fetch(`${baseUrl}/api/admin/clean-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({ action: 'ORDERS', confirmationText: 'DELETE', password: 'incorrect_password' })
  });
  record('Security: Reset Rejected on Wrong Admin Password (401)', invalidResetPass.status === 401);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`AUDIT COMPLETE: ${results.passed} PASSED, ${results.failed} FAILED across ${results.tests.length} Total Verification Tests`);
  console.log('========================================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
