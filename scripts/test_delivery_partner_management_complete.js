const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookie(cookieArray, name) {
  for (const c of cookieArray) {
    const match = c.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

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

async function run() {
  console.log('=== STARTING COMPLETE DELIVERY PARTNER MANAGEMENT & SYNC TEST ===\n');

  let adminSessionToken = '';
  let partnerSessionToken = '';
  let customerSessionToken = '';
  const testPartnerId = `DP-TEST-${Date.now().toString().slice(-4)}`;
  const testPartnerEmail = `priyal_${Date.now()}@gmail.com`;
  const testPartnerPhone = `98765${Math.floor(10000 + Math.random() * 90000)}`;
  const testPartnerPassword = 'SecureRiderPassword123!';
  const testOrderId = `FT-TEST-DELIV-${Date.now()}`;

  // -------------------------------------------------------------
  // PHASE 1: Security & Role Guard Verification
  // -------------------------------------------------------------
  console.log('--- Phase 1: Security & Authorization Protection ---');

  const unauthGet = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/partners',
    method: 'GET'
  });
  assert(unauthGet.status === 403, `Unauthenticated GET /api/admin/partners returned 403 (got ${unauthGet.status})`);

  const unauthPost = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/partners',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { id: 'DP-HACK', name: 'Hacker', email: 'hacker@hack.com', password: '123' });
  assert(unauthPost.status === 403, `Unauthenticated POST /api/admin/partners returned 403 (got ${unauthPost.status})`);

  const unauthDelete = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/partners?id=DP-001',
    method: 'DELETE'
  });
  assert(unauthDelete.status === 403, `Unauthenticated DELETE /api/admin/partners returned 403 (got ${unauthDelete.status})`);

  // -------------------------------------------------------------
  // PHASE 2: Admin Login & Session Token Acquisition
  // -------------------------------------------------------------
  console.log('\n--- Phase 2: Admin Login & Active Session Validation ---');

  let adminLoginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { emailOrId: 'superadmin@fatafat.com', password: 'superadmin123' });

  if (adminLoginRes.status !== 200) {
    adminLoginRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { emailOrId: 'admin@fatafat.com', password: 'admin123' });
  }

  assert(adminLoginRes.status === 200, `Admin logged in successfully (status: ${adminLoginRes.status})`);
  adminSessionToken = extractCookie(adminLoginRes.cookies, 'fatafat_session_token');
  assert(!!adminSessionToken, `Admin session cookie extracted: ${adminSessionToken}`);

  const adminHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `fatafat_session_token=${adminSessionToken}`,
    'Authorization': `Bearer ${adminSessionToken}`
  };

  // -------------------------------------------------------------
  // PHASE 3: Create Delivery Partner via Admin API
  // -------------------------------------------------------------
  console.log('\n--- Phase 3: Create Delivery Partner & Database Persistence ---');

  const createPartnerRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/partners',
    method: 'POST',
    headers: adminHeaders
  }, {
    id: testPartnerId,
    name: 'Priyal Sharma',
    phone: testPartnerPhone,
    email: testPartnerEmail,
    password: testPartnerPassword,
    locationId: 'nawabganj-unnao',
    locationName: 'Nawabganj, Unnao',
    status: 'Active',
    isOnline: true
  });

  assert(createPartnerRes.status === 200, `Admin created partner returned 200 (got ${createPartnerRes.status})`);
  assert(createPartnerRes.data?.success === true, 'Partner creation returned success: true');
  assert(createPartnerRes.data?.partner?.id === testPartnerId, `Returned partner id matches ${testPartnerId}`);
  assert(!createPartnerRes.data?.partner?.passwordHash, 'Password hash is excluded from partner response');

  // Verify list includes new partner
  const listPartnersRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/partners',
    method: 'GET',
    headers: adminHeaders
  });
  assert(listPartnersRes.status === 200, 'GET /api/admin/partners returned 200');
  const foundInList = Array.isArray(listPartnersRes.data) && listPartnersRes.data.some(p => p.id === testPartnerId);
  assert(foundInList, `Newly created partner ${testPartnerId} is present in admin partner list`);

  // -------------------------------------------------------------
  // PHASE 4: Partner Authentication & Multi-Identifier Login
  // -------------------------------------------------------------
  console.log('\n--- Phase 4: Delivery Partner Login (by ID, Email, Phone) ---');

  // Login by ID
  const partnerLoginById = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { emailOrId: testPartnerId, password: testPartnerPassword });
  assert(partnerLoginById.status === 200, `Partner login by ID (${testPartnerId}) succeeded`);
  partnerSessionToken = extractCookie(partnerLoginById.cookies, 'fatafat_session_token');
  assert(!!partnerSessionToken, `Partner session token received: ${partnerSessionToken}`);

  // Login by Email
  const partnerLoginByEmail = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { emailOrId: testPartnerEmail, password: testPartnerPassword });
  assert(partnerLoginByEmail.status === 200, `Partner login by Email (${testPartnerEmail}) succeeded`);

  // Login by Phone
  const partnerLoginByPhone = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { emailOrId: testPartnerPhone, password: testPartnerPassword });
  assert(partnerLoginByPhone.status === 200, `Partner login by Phone (${testPartnerPhone}) succeeded`);

  const partnerHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `fatafat_session_token=${partnerSessionToken}`,
    'Authorization': `Bearer ${partnerSessionToken}`
  };

  // -------------------------------------------------------------
  // PHASE 5: Customer Creates Order & Admin Assigns to Partner
  // -------------------------------------------------------------
  console.log('\n--- Phase 5: Order Creation & Admin Partner Assignment ---');

  const customerLoginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/customer-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'customer.test@fatafat.com', name: 'Customer Test User' });
  customerSessionToken = extractCookie(customerLoginRes.cookies, 'fatafat_session_token');

  const customerHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `fatafat_session_token=${customerSessionToken}`,
    'Authorization': `Bearer ${customerSessionToken}`
  };

  const createOrderRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders',
    method: 'POST',
    headers: customerHeaders
  }, {
    id: testOrderId,
    customerId: 'customer-test-101',
    customerEmail: 'customer.test@fatafat.com',
    items: [
      { productId: 'prod-1', name: 'Organic Bananas', price: 49, quantity: 2, image: '/bananas.jpg' }
    ],
    address: { name: 'Customer Test', mobile: '9999988888', house: '12B', street: 'MG Road', area: 'Nawabganj', city: 'Unnao', pincode: '209801' },
    subtotal: 98,
    deliveryFee: 15,
    discount: 0,
    total: 113,
    status: 'Pending',
    deliveryOption: 'ASAP',
    deliveryTimeSlot: 'Within 15 mins',
    eta: '15 mins',
    deliveryLocationId: 'nawabganj-unnao',
    deliveryLocationName: 'Nawabganj, Unnao',
    paymentStatus: 'PAID',
    paymentMethod: 'UPI'
  });
  assert(createOrderRes.status === 200, `Customer created order ${testOrderId} (status: ${createOrderRes.status})`);

  // Admin assigns order to test partner
  const assignRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders/update',
    method: 'POST',
    headers: adminHeaders
  }, {
    id: testOrderId,
    updates: {
      assignedPartnerId: testPartnerId,
      assignedPartnerName: 'Priyal Sharma'
    }
  });

  assert(assignRes.status === 200, `Admin assigned order to partner returned 200 (got ${assignRes.status})`);
  assert(assignRes.data?.order?.assignedPartnerId === testPartnerId, `Order assignedPartnerId persisted as ${testPartnerId}`);
  assert(assignRes.data?.order?.status === 'Assigned', `Order status transitioned to 'Assigned'`);

  // -------------------------------------------------------------
  // PHASE 6: Partner Dashboard Synchronization & Lifecycle Transitions
  // -------------------------------------------------------------
  console.log('\n--- Phase 6: Partner Order Visibility & Full Delivery Lifecycle ---');

  // Partner queries their assigned orders
  const partnerOrdersRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/delivery/orders',
    method: 'GET',
    headers: partnerHeaders
  });

  assert(partnerOrdersRes.status === 200, `Partner fetched delivery orders (status: ${partnerOrdersRes.status})`);
  const orderInPartnerDashboard = Array.isArray(partnerOrdersRes.data) && partnerOrdersRes.data.some(o => o.id === testOrderId);
  assert(orderInPartnerDashboard, `Assigned order ${testOrderId} is immediately visible in partner dashboard`);

  // Step 1: Partner Accepts Order
  const acceptRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders/update',
    method: 'POST',
    headers: partnerHeaders
  }, {
    id: testOrderId,
    updates: { status: 'Accepted' }
  });
  assert(acceptRes.status === 200, `Partner accepted order -> 200 (status: ${acceptRes.data?.order?.status})`);

  // Step 2: Partner Confirms Pickup
  const pickupRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders/update',
    method: 'POST',
    headers: partnerHeaders
  }, {
    id: testOrderId,
    updates: {
      status: 'Picked Up',
      verifiedItemIds: ['prod-1'],
      boxSealVerified: true
    }
  });
  assert(pickupRes.status === 200, `Partner picked up order -> 200 (status: ${pickupRes.data?.order?.status})`);

  // Step 3: Partner Out for Delivery
  const outForDeliveryRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders/update',
    method: 'POST',
    headers: partnerHeaders
  }, {
    id: testOrderId,
    updates: { status: 'Out for Delivery' }
  });
  assert(outForDeliveryRes.status === 200, `Partner out for delivery -> 200 (status: ${outForDeliveryRes.data?.order?.status})`);

  // Step 4: OTP Verification & Delivery Completion
  const requestOtpRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/delivery/orders/${testOrderId}/request-otp`,
    method: 'POST',
    headers: partnerHeaders
  });
  assert(requestOtpRes.status === 200, `Requested delivery OTP (status: ${requestOtpRes.status})`);

  // Fetch current order from DB to get the generated OTP
  const orderDetailsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/orders/${testOrderId}`,
    method: 'GET',
    headers: adminHeaders
  });
  const otp = orderDetailsRes.data?.deliveryOtp;
  assert(!!otp && otp.length === 6, `Generated 6-digit delivery OTP: ${otp}`);

  // Partner verifies OTP
  const verifyOtpRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/delivery/orders/${testOrderId}/verify-otp`,
    method: 'POST',
    headers: partnerHeaders
  }, { otp });

  assert(verifyOtpRes.status === 200, `Delivery OTP verified successfully -> 200`);
  assert(verifyOtpRes.data?.order?.status === 'Delivered', `Final order status verified as 'Delivered'`);
  assert(verifyOtpRes.data?.order?.delivery_otp_verified === true, `delivery_otp_verified flag is true`);

  // -------------------------------------------------------------
  // PHASE 7: Partner Deactivation, Deletion & Table Integrity
  // -------------------------------------------------------------
  console.log('\n--- Phase 7: Partner Edit, Deactivation, & Atomic Deletion ---');

  // Edit Partner details
  const editPartnerRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/partners',
    method: 'POST',
    headers: adminHeaders
  }, {
    id: testPartnerId,
    name: 'Priyal Sharma (Senior Dispatch)',
    phone: testPartnerPhone,
    email: testPartnerEmail,
    locationId: 'nawabganj-unnao',
    status: 'Active'
  });
  assert(editPartnerRes.status === 200, `Partner details updated -> 200`);
  assert(editPartnerRes.data?.partner?.name === 'Priyal Sharma (Senior Dispatch)', `Partner name updated to Senior Dispatch`);

  // Deactivate Partner
  const deactivateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/partners',
    method: 'POST',
    headers: adminHeaders
  }, {
    id: testPartnerId,
    name: 'Priyal Sharma (Senior Dispatch)',
    email: testPartnerEmail,
    status: 'Inactive'
  });
  assert(deactivateRes.status === 200, `Partner deactivated -> 200`);

  // Inactive partner login rejected
  const inactiveLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { emailOrId: testPartnerId, password: testPartnerPassword });
  assert(inactiveLogin.status === 403, `Inactive partner login rejected with 403 (got ${inactiveLogin.status})`);

  // Delete Partner atomically
  const deletePartnerRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/partners?id=${testPartnerId}`,
    method: 'DELETE',
    headers: adminHeaders
  });
  assert(deletePartnerRes.status === 200, `Admin deleted partner -> 200 (message: ${deletePartnerRes.data?.message})`);

  // Verify partner no longer in list
  const finalListRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/partners',
    method: 'GET',
    headers: adminHeaders
  });
  const partnerStillExists = Array.isArray(finalListRes.data) && finalListRes.data.some(p => p.id === testPartnerId);
  assert(!partnerStillExists, `Deleted partner ${testPartnerId} is confirmed removed from database`);

  // Verify other partners are still present (not wiped by table delete)
  const remainingPartnersCount = Array.isArray(finalListRes.data) ? finalListRes.data.length : 0;
  assert(remainingPartnersCount > 0, `Other delivery partners remain intact in database (count: ${remainingPartnersCount})`);

  console.log(`\n======================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
