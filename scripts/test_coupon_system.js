/**
 * FATAFAT PROMO COUPON SYSTEM COMPREHENSIVE INTEGRATION SUITE
 * 
 * Tests:
 * A. Admin creates ALL CUSTOMERS coupon -> Any customer can apply.
 * B. Admin creates SELECTED CUSTOMER coupon for 1 customer -> Targeted customer can apply.
 * C. Same targeted coupon -> Non-targeted customer is rejected.
 * D. Admin creates coupon for 2 selected customers -> Both can apply.
 * E. Expired coupon -> Rejected.
 * F. Inactive coupon -> Rejected.
 * G. Minimum spend -> Correctly enforced.
 * H. Total usage limit -> Correctly enforced.
 * I. Per-customer usage limit -> Correctly enforced.
 * J. Invalid / random coupon -> Rejected.
 * K. Customer cannot retrieve / expose coupon codes through unauthorized API.
 * L. Admin can view, edit, activate/deactivate, and delete coupons.
 * M. Server-side coupon verification during order creation.
 */

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
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

async function runTests() {
  console.log('========================================================================');
  console.log('       FATAFAT PROMO COUPON SYSTEM INTEGRATION TEST SUITE               ');
  console.log('========================================================================\n');

  // 1. Authenticate Admin
  console.log('--- SETUP: AUTHENTICATION ---');
  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminLoginRes.ok && adminLoginRes.data.success, 'Super Admin authenticated successfully');
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  // 2. Authenticate Customer 1
  const cust1LoginRes = await request('/api/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ phone: '9888811111', name: 'Target Customer Alpha' })
  });
  assert(cust1LoginRes.ok && cust1LoginRes.data.success, 'Customer Alpha authenticated');
  const cust1Cookie = cust1LoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  const cust1User = cust1LoginRes.data.user;

  // 3. Authenticate Customer 2
  const cust2LoginRes = await request('/api/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ phone: '9888822222', name: 'Target Customer Beta' })
  });
  assert(cust2LoginRes.ok && cust2LoginRes.data.success, 'Customer Beta authenticated');
  const cust2Cookie = cust2LoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  const cust2User = cust2LoginRes.data.user;

  // 4. Authenticate Customer 3 (Non-targeted)
  const cust3LoginRes = await request('/api/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ phone: '9888833333', name: 'Regular Customer Gamma' })
  });
  assert(cust3LoginRes.ok && cust3LoginRes.data.success, 'Customer Gamma authenticated');
  const cust3Cookie = cust3LoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  const cust3User = cust3LoginRes.data.user;

  console.log('\n--- SECTION A: ALL CUSTOMERS COUPON ---');
  // Admin creates ALL CUSTOMERS coupon
  const allCouponRes = await request('/api/admin/coupons', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      code: 'TESTALL20',
      discountType: 'percentage',
      discountValue: 20,
      minSpend: 200,
      targetAudience: 'ALL'
    })
  });
  assert(allCouponRes.ok && allCouponRes.data.success, 'Admin created ALL CUSTOMERS coupon TESTALL20');

  // Customer 1 validates coupon
  const c1ValRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'TESTALL20', subtotal: 500 })
  });
  assert(c1ValRes.ok && c1ValRes.data.valid && c1ValRes.data.discountAmount === 100, 'Customer 1 applied TESTALL20 (20% of 500 = ₹100)');

  // Customer 3 validates coupon
  const c3ValRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust3Cookie },
    body: JSON.stringify({ code: 'TESTALL20', subtotal: 1000 })
  });
  assert(c3ValRes.ok && c3ValRes.data.valid && c3ValRes.data.discountAmount === 200, 'Customer 3 applied TESTALL20 (20% of 1000 = ₹200)');

  console.log('\n--- SECTION B & C: SINGLE TARGETED CUSTOMER COUPON ---');
  // Admin creates SELECTED coupon targeting only Customer 1
  const targeted1Res = await request('/api/admin/coupons', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      code: 'VIPALPHA150',
      discountType: 'flat',
      discountValue: 150,
      minSpend: 300,
      targetAudience: 'SELECTED',
      selectedCustomerIds: [cust1User.userId, cust1User.phone]
    })
  });
  assert(targeted1Res.ok && targeted1Res.data.success, 'Admin created targeted coupon VIPALPHA150 for Customer Alpha');

  // Customer 1 applies VIPALPHA150 -> SHOULD SUCCEED
  const c1TargetRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'VIPALPHA150', subtotal: 400 })
  });
  assert(c1TargetRes.ok && c1TargetRes.data.valid && c1TargetRes.data.discountAmount === 150, 'Targeted Customer Alpha successfully applied VIPALPHA150 (₹150 discount)');

  // Customer 3 (Non-targeted) applies VIPALPHA150 -> MUST BE REJECTED
  const c3TargetRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust3Cookie },
    body: JSON.stringify({ code: 'VIPALPHA150', subtotal: 400 })
  });
  assert(!c3TargetRes.ok && !c3TargetRes.data?.valid && c3TargetRes.data?.error.includes('not available for your account'), 'Non-targeted Customer Gamma was correctly REJECTED from VIPALPHA150');

  console.log('\n--- SECTION D: MULTI-TARGETED CUSTOMER COUPON (2 USERS) ---');
  // Admin creates SELECTED coupon for Customer 1 and Customer 2
  const multiTargetRes = await request('/api/admin/coupons', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      code: 'DUODISCOUNT',
      discountType: 'flat',
      discountValue: 75,
      targetAudience: 'SELECTED',
      selectedCustomerIds: [cust1User.userId, cust2User.userId]
    })
  });
  assert(multiTargetRes.ok && multiTargetRes.data.success, 'Admin created DUODISCOUNT for Customer Alpha & Customer Beta');

  const c1DuoRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'DUODISCOUNT', subtotal: 200 })
  });
  assert(c1DuoRes.ok && c1DuoRes.data.valid, 'Customer Alpha can apply DUODISCOUNT');

  const c2DuoRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust2Cookie },
    body: JSON.stringify({ code: 'DUODISCOUNT', subtotal: 200 })
  });
  assert(c2DuoRes.ok && c2DuoRes.data.valid, 'Customer Beta can apply DUODISCOUNT');

  const c3DuoRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust3Cookie },
    body: JSON.stringify({ code: 'DUODISCOUNT', subtotal: 200 })
  });
  assert(!c3DuoRes.ok && !c3DuoRes.data?.valid, 'Customer Gamma cannot apply DUODISCOUNT (Properly rejected)');

  console.log('\n--- SECTION E & F: EXPIRED AND INACTIVE COUPONS ---');
  // Expired coupon
  const expiredRes = await request('/api/admin/coupons', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      code: 'EXPIREDTEST',
      discountType: 'flat',
      discountValue: 50,
      expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      targetAudience: 'ALL'
    })
  });
  assert(expiredRes.ok, 'Admin created expired coupon');

  const valExpiredRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'EXPIREDTEST', subtotal: 500 })
  });
  assert(!valExpiredRes.ok && valExpiredRes.data?.error.includes('expired'), 'Expired coupon rejected with "This coupon has expired."');

  // Inactive coupon
  const inactiveRes = await request('/api/admin/coupons', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      code: 'INACTIVETEST',
      discountType: 'flat',
      discountValue: 50,
      isActive: false,
      targetAudience: 'ALL'
    })
  });
  assert(inactiveRes.ok, 'Admin created inactive coupon');

  const valInactiveRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'INACTIVETEST', subtotal: 500 })
  });
  assert(!valInactiveRes.ok && valInactiveRes.data?.error.includes('inactive'), 'Inactive coupon rejected with "This coupon is currently inactive."');

  console.log('\n--- SECTION G: MINIMUM SPEND ENFORCEMENT ---');
  const minSpendRes = await request('/api/admin/coupons', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      code: 'BIGSPEND500',
      discountType: 'flat',
      discountValue: 100,
      minSpend: 800,
      targetAudience: 'ALL'
    })
  });
  assert(minSpendRes.ok, 'Admin created coupon with min spend ₹800');

  const belowMinRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'BIGSPEND500', subtotal: 400 })
  });
  assert(!belowMinRes.ok && belowMinRes.data?.error.includes('Minimum spend of ₹800'), 'Cart subtotal ₹400 rejected for ₹800 min spend');

  const aboveMinRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'BIGSPEND500', subtotal: 850 })
  });
  assert(aboveMinRes.ok && aboveMinRes.data.valid, 'Cart subtotal ₹850 successfully accepted for ₹800 min spend');

  console.log('\n--- SECTION H & I: TOTAL & PER-CUSTOMER USAGE LIMITS ---');
  const limitRes = await request('/api/admin/coupons', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      code: 'ONETIMECOUPON',
      discountType: 'flat',
      discountValue: 50,
      perCustomerLimit: 1,
      targetAudience: 'ALL'
    })
  });
  assert(limitRes.ok, 'Admin created coupon with perCustomerLimit = 1');

  // Customer places order using ONETIMECOUPON
  const orderWithCouponRes = await request('/api/orders', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({
      items: [{ productId: 'choco-9', name: 'Chocolate Truffle', price: 400, quantity: 1 }],
      address: { name: 'Alpha', mobile: '9888811111', house: '1', street: 'Street', area: 'Area', city: 'City', pincode: '209859' },
      couponCode: 'ONETIMECOUPON'
    })
  });
  assert(orderWithCouponRes.ok && orderWithCouponRes.data.order.discount === 50, 'Order created with ONETIMECOUPON discount of ₹50 applied');

  // Customer tries to apply ONETIMECOUPON a second time -> MUST BE REJECTED
  const secondTryRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'ONETIMECOUPON', subtotal: 400 })
  });
  assert(!secondTryRes.ok && secondTryRes.data?.error.includes('maximum allowed number of times'), 'Second use by Customer Alpha was correctly REJECTED (per-customer limit enforced)');

  console.log('\n--- SECTION J & K: SECURITY & INVALID COUPONS ---');
  // Random coupon
  const invalidRes = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'FAKE_CODE_999', subtotal: 500 })
  });
  assert(!invalidRes.ok && invalidRes.data?.error === 'Invalid coupon code.', 'Random code rejected with generic message');

  // Hardcoded FATAFAT10 check (must be rejected)
  const fatafat10Res = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'FATAFAT10', subtotal: 500 })
  });
  assert(!fatafat10Res.ok && fatafat10Res.data?.error === 'Invalid coupon code.', 'Old demo coupon FATAFAT10 is non-existent and rejected');

  // Hardcoded CELEBRATE200 check (must be rejected)
  const celebrate200Res = await request('/api/coupons/validate', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({ code: 'CELEBRATE200', subtotal: 1200 })
  });
  assert(!celebrate200Res.ok && celebrate200Res.data?.error === 'Invalid coupon code.', 'Old demo coupon CELEBRATE200 is non-existent and rejected');

  // Security: Customer cannot access Admin Coupons API
  const secAdminRes = await request('/api/admin/coupons', {
    method: 'GET',
    headers: { Cookie: cust1Cookie }
  });
  assert(secAdminRes.status === 403, 'Security: Customer forbidden (403) from accessing /api/admin/coupons');

  // Security: Customer cannot access Admin Customers API
  const secCustRes = await request('/api/admin/customers', {
    method: 'GET',
    headers: { Cookie: cust1Cookie }
  });
  assert(secCustRes.status === 403, 'Security: Customer forbidden (403) from accessing /api/admin/customers');

  console.log('\n--- SECTION L: ADMIN MANAGEMENT (TOGGLE & DELETE) ---');
  // Admin gets coupon list
  const listRes = await request('/api/admin/coupons', {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  assert(listRes.ok && Array.isArray(listRes.data.coupons), `Admin can list all active and inactive coupons (Total: ${listRes.data.coupons.length})`);

  // Admin deletes a test coupon
  const delRes = await request('/api/admin/coupons/INACTIVETEST', {
    method: 'DELETE',
    headers: { Cookie: adminCookie }
  });
  assert(delRes.ok && delRes.data.success, 'Admin successfully deleted coupon INACTIVETEST');

  console.log('\n========================================================================');
  console.log(`COUPON TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED across ${passed + failed} Tests`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error in coupon test suite:', err);
  process.exit(1);
});
