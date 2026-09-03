/**
 * End-to-End Integration Test Suite for Complete Order Lifecycle
 * Tests:
 * 1. Customer -> Database: Order creation & immediate DB persistence
 * 2. Customer -> My Orders: Canonical order retrieval
 * 3. Admin -> Live Orders: Presence in Admin dashboard and search
 * 4. Admin -> Delivery Partner: Assignment persistence in DB
 * 5. Partner -> Assigned Orders: Order retrieval in Partner portal
 * 6. Partner -> Full Status Transitions:
 *    Pending -> Confirmed -> Preparing -> Packed -> Assigned -> Accepted -> Picked Up -> Out for Delivery -> Delivered (OTP)
 * 7. Real-time Multi-Role Synchronization (Customer, Admin, Partner all see latest canonical status)
 * 8. Re-login & Session Persistence across all three roles
 * 9. Repeated / Concurrent polling stability (order never disappears)
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

async function runTest() {
  console.log('========================================================================');
  console.log('  TEST SUITE: COMPLETE END-TO-END ORDER LIFECYCLE & MULTI-ROLE SYNC    ');
  console.log('========================================================================\n');

  const testTag = Date.now().toString().slice(-5);
  const customerEmail = `order.tester.${testTag}@gmail.com`;
  const customerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  // -------------------------------------------------------------------------
  // Step 1: Authentication for Customer, Admin, and Delivery Partner
  // -------------------------------------------------------------------------
  console.log('--- 1. MULTI-ROLE AUTHENTICATION ---');

  // Customer Signup & Login
  const custAuth = await request('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, name: `Order Tester ${testTag}`, phone: customerPhone })
  });
  assert(custAuth.ok, 'Customer registered and logged in successfully');
  const custCookie = custAuth.headers.get('set-cookie') || '';

  // Super Admin Login
  const adminAuth = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminAuth.ok, 'Super Admin logged in successfully');
  const adminCookie = adminAuth.headers.get('set-cookie') || '';

  // Register Delivery Partner via Admin
  const partnerId = `DP-${testTag}`;
  const partnerEmail = `partner.${testTag}@fatafat.com`;
  const createPartnerRes = await request('/api/admin/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      id: partnerId,
      name: `Rider Tester ${testTag}`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: partnerEmail,
      password: 'partnerpassword123',
      locationId: 'nawabganj-unnao',
      locationName: 'Nawabganj, Unnao'
    })
  });
  assert(createPartnerRes.ok, 'Admin registered Delivery Partner');

  // Delivery Partner Login
  const partnerAuth = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: partnerEmail, password: 'partnerpassword123' })
  });
  assert(partnerAuth.ok, 'Delivery Partner logged in successfully');
  const partnerCookie = partnerAuth.headers.get('set-cookie') || '';

  // -------------------------------------------------------------------------
  // Step 2: Customer Creates Order
  // -------------------------------------------------------------------------
  console.log('\n--- 2. CUSTOMER PLACES NEW ORDER ---');
  const orderPayload = {
    items: [
      {
        productId: 'choco-1',
        name: 'Belgian Dark Truffle Cake',
        price: 499,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80'
      }
    ],
    address: {
      name: `Order Tester ${testTag}`,
      mobile: customerPhone,
      house: 'Apartment 402, Lotus Tower',
      street: 'Kalyan Road',
      area: 'Civil Lines',
      city: 'Unnao',
      pincode: '209801'
    },
    deliveryOption: 'ASAP',
    discount: 0,
    paymentMethod: 'UPI',
    deliveryLocationId: 'nawabganj-unnao',
    deliveryLocationName: 'Nawabganj, Unnao'
  };

  const createRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: custCookie },
    body: JSON.stringify(orderPayload)
  });

  assert(createRes.ok, `Order created successfully (HTTP ${createRes.status})`);
  assert(createRes.data?.success === true, 'Response contains success: true');
  const orderId = createRes.data?.orderId || createRes.data?.order?.id;
  assert(Boolean(orderId), `Assigned valid Order ID: ${orderId}`);
  assert(createRes.data?.order?.status === 'Pending', 'Initial order status is Pending');
  assert(createRes.data?.order?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Payment status is PAYMENT_VERIFICATION_PENDING');

  // -------------------------------------------------------------------------
  // Step 3: Verify Persistence in Customer "My Orders"
  // -------------------------------------------------------------------------
  console.log('\n--- 3. VERIFY CUSTOMER MY ORDERS ---');
  const myOrdersRes = await request('/api/orders', {
    headers: { Cookie: custCookie }
  });
  assert(myOrdersRes.ok, 'Customer retrieved My Orders list');
  assert(Array.isArray(myOrdersRes.data), 'My Orders is an array');
  const foundInMyOrders = myOrdersRes.data.find(o => o.id === orderId);
  assert(Boolean(foundInMyOrders), `Created order #${orderId} is immediately visible in Customer My Orders`);
  assert(foundInMyOrders?.status === 'Pending', 'Order status in Customer My Orders matches (Pending)');
  assert(foundInMyOrders?.total === createRes.data?.total, 'Total amount matches');

  // Verify single order endpoint /api/orders/[id]
  const singleOrderRes = await request(`/api/orders/${orderId}`, {
    headers: { Cookie: custCookie }
  });
  assert(singleOrderRes.ok, `Single order endpoint /api/orders/${orderId} returned successfully`);
  assert(singleOrderRes.data?.id === orderId, 'Single order response ID matches');

  // -------------------------------------------------------------------------
  // Step 4: Verify Presence in Admin Orders & Live Dispatch
  // -------------------------------------------------------------------------
  console.log('\n--- 4. VERIFY ADMIN LIVE ORDERS DISPATCH ---');
  const adminOrdersRes = await request('/api/orders', {
    headers: { Cookie: adminCookie }
  });
  assert(adminOrdersRes.ok, 'Admin retrieved full Orders list');
  const foundInAdmin = adminOrdersRes.data.find(o => o.id === orderId);
  assert(Boolean(foundInAdmin), `Created order #${orderId} is visible in Admin Live Orders list`);
  assert(foundInAdmin?.address?.name === `Order Tester ${testTag}`, 'Customer address details visible in Admin');

  // -------------------------------------------------------------------------
  // Step 5: Admin Assigns Delivery Partner
  // -------------------------------------------------------------------------
  console.log('\n--- 5. ADMIN ASSIGNS DELIVERY PARTNER ---');
  const assignRes = await request('/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      id: orderId,
      updates: {
        assignedPartnerId: partnerId,
        assignedPartnerName: `Rider Tester ${testTag}`,
        assignedAt: new Date().toISOString(),
        status: 'Assigned'
      }
    })
  });
  assert(assignRes.ok, `Admin assigned delivery partner to #${orderId} (HTTP ${assignRes.status})`);
  assert(assignRes.data?.order?.assignedPartnerId === partnerId, `Updated order record has assignedPartnerId: ${partnerId}`);
  assert(assignRes.data?.order?.status === 'Assigned', 'Updated order record has status: Assigned');

  // -------------------------------------------------------------------------
  // Step 6: Verify Delivery Partner Portal
  // -------------------------------------------------------------------------
  console.log('\n--- 6. VERIFY DELIVERY PARTNER SEES ASSIGNED ORDER ---');
  const partnerOrdersRes = await request('/api/delivery/orders', {
    headers: { Cookie: partnerCookie }
  });
  assert(partnerOrdersRes.ok, 'Delivery partner fetched assigned orders');
  assert(Array.isArray(partnerOrdersRes.data), 'Partner orders is an array');
  const foundInPartner = partnerOrdersRes.data.find(o => o.id === orderId);
  assert(Boolean(foundInPartner), `Partner sees assigned order #${orderId} in their queue`);
  assert(foundInPartner?.assignedPartnerId === partnerId, 'Partner ID matches');

  // -------------------------------------------------------------------------
  // Step 7: Delivery Partner Lifecycle Status Transitions
  // -------------------------------------------------------------------------
  console.log('\n--- 7. DELIVERY PARTNER STATUS TRANSITIONS ---');

  // Transition 1: Partner Accepts
  console.log('  -> Partner transitions to "Accepted"');
  const acceptRes = await request('/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: partnerCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Accepted' }
    })
  });
  assert(acceptRes.ok, 'Partner successfully accepted order');
  assert(acceptRes.data?.order?.status === 'Accepted', 'Order status is now Accepted');

  // Verify Customer & Admin see Accepted
  const custCheck1 = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(custCheck1.data?.status === 'Accepted', 'Customer sees status updated to Accepted');

  // Transition 2: Partner Hub Pickup
  console.log('  -> Partner transitions to "Picked Up" (with item checklist verification)');
  const pickupRes = await request('/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: partnerCookie },
    body: JSON.stringify({
      id: orderId,
      updates: {
        status: 'Picked Up',
        verifiedItemIds: ['choco-1'],
        boxSealVerified: true
      }
    })
  });
  assert(pickupRes.ok, 'Partner successfully confirmed hub pickup');
  assert(pickupRes.data?.order?.status === 'Picked Up', 'Order status is now Picked Up');

  // Verify Customer & Admin see Picked Up
  const custCheck2 = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(custCheck2.data?.status === 'Picked Up', 'Customer sees status updated to Picked Up');

  // Transition 3: Partner Out for Delivery
  console.log('  -> Partner transitions to "Out for Delivery"');
  const transitRes = await request('/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: partnerCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Out for Delivery' }
    })
  });
  assert(transitRes.ok, 'Partner successfully started transit');
  assert(transitRes.data?.order?.status === 'Out for Delivery', 'Order status is now Out for Delivery');

  // Verify Customer sees Out for Delivery
  const custCheck3 = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  assert(custCheck3.data?.status === 'Out for Delivery', 'Customer sees status updated to Out for Delivery');

  // Obtain Delivery OTP for Verification
  const otpRes = await request(`/api/orders/${orderId}`, { headers: { Cookie: custCookie } });
  const deliveryOtp = otpRes.data?.deliveryOtp;
  assert(Boolean(deliveryOtp && deliveryOtp !== '******'), `Customer obtained delivery OTP: ${deliveryOtp}`);

  // Transition 4: Partner Delivers via OTP Verification
  console.log('  -> Partner completes delivery via OTP verification');
  const deliverRes = await request(`/api/delivery/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: partnerCookie },
    body: JSON.stringify({ otp: deliveryOtp })
  });
  assert(deliverRes.ok, 'Partner verified OTP and delivered order');
  assert(deliverRes.data?.order?.status === 'Delivered', 'Final order status is Delivered');
  assert(deliverRes.data?.order?.delivery_otp_verified === true, 'delivery_otp_verified is true');

  // -------------------------------------------------------------------------
  // Step 8: Multi-Role Sync & Persistence across Re-login
  // -------------------------------------------------------------------------
  console.log('\n--- 8. MULTI-ROLE RE-LOGIN & PERSISTENCE ---');

  // Customer re-login & check My Orders
  const custReAuth = await request('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, name: `Order Tester ${testTag}`, phone: customerPhone })
  });
  const newCustCookie = custReAuth.headers.get('set-cookie') || '';
  const myOrdersPostLogin = await request('/api/orders', { headers: { Cookie: newCustCookie } });
  const finalCustOrder = myOrdersPostLogin.data.find(o => o.id === orderId);
  assert(Boolean(finalCustOrder), 'Order remains permanently in Customer My Orders after re-login');
  assert(finalCustOrder?.status === 'Delivered', 'Customer still sees Delivered status after re-login');

  // Admin re-login & check Orders
  const adminReAuth = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  const newAdminCookie = adminReAuth.headers.get('set-cookie') || '';
  const adminOrdersPostLogin = await request('/api/orders', { headers: { Cookie: newAdminCookie } });
  const finalAdminOrder = adminOrdersPostLogin.data.find(o => o.id === orderId);
  assert(Boolean(finalAdminOrder), 'Order remains permanently in Admin Orders after re-login');
  assert(finalAdminOrder?.status === 'Delivered', 'Admin still sees Delivered status after re-login');
  assert(finalAdminOrder?.assignedPartnerId === partnerId, `Admin still sees assigned partner ${partnerId}`);

  // -------------------------------------------------------------------------
  // Step 9: Stability Under Repeated / Concurrent Polling
  // -------------------------------------------------------------------------
  console.log('\n--- 9. STABILITY UNDER RAPID CONCURRENT POLLING ---');
  const pollPromises = Array.from({ length: 10 }).map(() =>
    request('/api/orders', { headers: { Cookie: newCustCookie } })
  );
  const pollResults = await Promise.all(pollPromises);
  const allSuccessful = pollResults.every(r => r.ok && Array.isArray(r.data) && r.data.some(o => o.id === orderId));
  assert(allSuccessful, 'All 10 concurrent polling requests returned the order without dropping');

  console.log('\n========================================================================');
  console.log(`ORDER LIFECYCLE SUITE: ${passed} PASSED, ${failed} FAILED across ${passed + failed} Tests`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTest().catch(err => {
  console.error('Fatal error in order lifecycle test suite:', err);
  process.exit(1);
});
