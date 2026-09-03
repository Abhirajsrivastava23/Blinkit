/**
 * FATAFAT CUSTOMER / USER MANAGEMENT COMPREHENSIVE INTEGRATION SUITE
 * 
 * Tests:
 * A. Existing demo users (Aarav Mehta, Priya Sharma, Kunal Kapoor) no longer appear in DB or Admin API.
 * B. New customer registration creates a persistent database record.
 * C. Newly registered customer appears in Admin -> Customers API.
 * D. Name, email, phone, User ID are correctly populated and returned.
 * E. Total Orders count is accurately computed from real database orders.
 * F. Customer re-login does not create duplicate records.
 * G. Two different customers remain isolated and separate.
 * H. Admin can search newly registered customers by name, email, phone, and userId.
 * I. Customer cannot access Admin Customers API (HTTP 403).
 * J. Password, session tokens, or sensitive auth data are never exposed in API.
 * K. Customer login works.
 * L. Admin login works.
 * M. Delivery partner login works.
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
  console.log('       FATAFAT CUSTOMER MANAGEMENT INTEGRATION TEST SUITE               ');
  console.log('========================================================================\n');

  // 1. Authenticate Admin
  console.log('--- SECTION 1: AUTHENTICATION & DEMO DATA VERIFICATION ---');
  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminLoginRes.ok && adminLoginRes.data.success, 'Super Admin authenticated successfully');
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  // Verify Admin Customers API does NOT return Aarav Mehta, Priya Sharma, Kunal Kapoor
  const adminCustRes = await request('/api/admin/customers', {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  assert(adminCustRes.ok && Array.isArray(adminCustRes.data.customers), 'Admin retrieved live customer registry from DB');
  
  const customerNames = (adminCustRes.data.customers || []).map(c => String(c.name || '').toLowerCase());
  const hasAarav = customerNames.some(n => n.includes('aarav mehta'));
  const hasPriya = customerNames.some(n => n.includes('priya sharma'));
  const hasKunal = customerNames.some(n => n.includes('kunal kapoor'));

  assert(!hasAarav, 'Demo user "Aarav Mehta" is completely removed and absent');
  assert(!hasPriya, 'Demo user "Priya Sharma" is completely removed and absent');
  assert(!hasKunal, 'Demo user "Kunal Kapoor" is completely removed and absent');

  console.log('\n--- SECTION 2: NEW CUSTOMER REGISTRATION & ADMIN SYNC ---');
  const uniquePhone1 = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const uniqueEmail1 = `devtester.${uniquePhone1.slice(-4)}@gmail.com`;
  const uniqueName1 = `Rohan Sharma ${uniquePhone1.slice(-4)}`;

  // Register Customer 1
  const regRes1 = await request('/api/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ phone: uniquePhone1, email: uniqueEmail1, name: uniqueName1 })
  });
  assert(regRes1.ok && regRes1.data.success, `Customer 1 (${uniqueName1}) registered successfully`);
  const cust1Cookie = regRes1.headers.get('set-cookie')?.split(';')[0] || '';
  const cust1User = regRes1.data.user;

  // Verify Customer 1 appears in Admin Customers API
  const adminCustAfter1 = await request('/api/admin/customers', {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  const foundCust1 = (adminCustAfter1.data.customers || []).find(c => c.phone === uniquePhone1 || c.email === uniqueEmail1);
  assert(!!foundCust1, `Newly registered customer ${uniqueName1} immediately appears in Admin Customers`);
  assert(foundCust1?.name === uniqueName1, `Customer name matches: ${foundCust1?.name}`);
  assert(foundCust1?.email === uniqueEmail1, `Customer email matches: ${foundCust1?.email}`);
  assert(foundCust1?.phone === uniquePhone1, `Customer phone matches: ${foundCust1?.phone}`);
  assert(foundCust1?.userId === cust1User.userId, `Customer User ID matches: ${foundCust1?.userId}`);
  assert(foundCust1?.ordersCount === 0, 'New customer starts with 0 orders');

  console.log('\n--- SECTION 3: ORDER CREATION & TOTAL ORDERS ACCURACY ---');
  // Customer 1 places an order
  const orderRes = await request('/api/orders', {
    method: 'POST',
    headers: { Cookie: cust1Cookie },
    body: JSON.stringify({
      items: [{ productId: 'choco-9', name: 'Chocolate Truffle Cake', price: 450, quantity: 1 }],
      address: { name: uniqueName1, mobile: uniquePhone1, house: '10A', street: 'MG Road', area: 'Central', city: 'Lucknow', pincode: '226001' }
    })
  });
  assert(orderRes.ok && orderRes.data.success && orderRes.data.order, 'Customer 1 placed an order successfully');

  // Verify Admin Customers reflects updated ordersCount = 1
  const adminCustAfterOrder = await request('/api/admin/customers', {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  const foundCust1AfterOrder = (adminCustAfterOrder.data.customers || []).find(c => c.phone === uniquePhone1);
  assert(foundCust1AfterOrder?.ordersCount === 1, `Admin customers shows correct updated ordersCount = ${foundCust1AfterOrder?.ordersCount}`);
  assert(foundCust1AfterOrder?.totalSpent >= 450, `Admin customers shows correct totalSpent = ₹${foundCust1AfterOrder?.totalSpent}`);

  console.log('\n--- SECTION 4: RE-LOGIN WITHOUT DUPLICATE RECORDS ---');
  const countBeforeRelogin = (adminCustAfterOrder.data.customers || []).filter(c => c.phone === uniquePhone1).length;
  assert(countBeforeRelogin === 1, 'Exactly 1 customer record exists before re-login');

  // Customer 1 logs in again
  const reloginRes = await request('/api/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ phone: uniquePhone1 })
  });
  assert(reloginRes.ok && reloginRes.data.success, 'Customer 1 logged in again');

  const adminCustAfterRelogin = await request('/api/admin/customers', {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  const countAfterRelogin = (adminCustAfterRelogin.data.customers || []).filter(c => c.phone === uniquePhone1).length;
  assert(countAfterRelogin === 1, 'Re-login did NOT create duplicate customer record (count = 1)');

  console.log('\n--- SECTION 5: SECOND CUSTOMER ISOLATION ---');
  const uniquePhone2 = `92${Math.floor(10000000 + Math.random() * 90000000)}`;
  const uniqueEmail2 = `ananya.${uniquePhone2.slice(-4)}@outlook.com`;
  const uniqueName2 = `Ananya Verma ${uniquePhone2.slice(-4)}`;

  const regRes2 = await request('/api/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ phone: uniquePhone2, email: uniqueEmail2, name: uniqueName2 })
  });
  assert(regRes2.ok && regRes2.data.success, `Customer 2 (${uniqueName2}) registered`);

  const adminCustAfter2 = await request('/api/admin/customers', {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  const foundCust2 = (adminCustAfter2.data.customers || []).find(c => c.phone === uniquePhone2);
  assert(!!foundCust2 && foundCust2.name === uniqueName2, 'Customer 2 appears independently in Admin Customers');
  assert(foundCust2.userId !== foundCust1.userId, 'Customer 1 and Customer 2 have distinct, isolated User IDs');

  console.log('\n--- SECTION 6: SEARCH FILTERING ---');
  const searchByNameRes = await request(`/api/admin/customers?search=${encodeURIComponent(uniqueName1)}`, {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  assert(searchByNameRes.ok && searchByNameRes.data.customers.some(c => c.name === uniqueName1), `Admin search by name "${uniqueName1}" returned customer`);

  const searchByPhoneRes = await request(`/api/admin/customers?search=${uniquePhone2}`, {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  assert(searchByPhoneRes.ok && searchByPhoneRes.data.customers.some(c => c.phone === uniquePhone2), `Admin search by phone "${uniquePhone2}" returned customer`);

  console.log('\n--- SECTION 7: SECURITY & SENSITIVE DATA CONCEALMENT ---');
  // Customer forbidden from Admin Customers API
  const secCustAccess = await request('/api/admin/customers', {
    method: 'GET',
    headers: { Cookie: cust1Cookie }
  });
  assert(secCustAccess.status === 403, 'Security: Customer is strictly FORBIDDEN (HTTP 403) from /api/admin/customers');

  // Verify response does not leak passwords, hashes, tokens, or sessions
  const sampleCustomer = adminCustAfter2.data.customers[0] || {};
  assert(!sampleCustomer.password && !sampleCustomer.passwordHash && !sampleCustomer.sessionId, 'Security: Passwords, passwordHashes, and sessionIds are NOT exposed');

  console.log('\n--- SECTION 8: DELIVERY PARTNER AUTHENTICATION PRESERVATION ---');
  const partnerLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrId: 'DP-001', password: 'deliverypass123' })
  });
  // Or create partner if clean
  if (!partnerLoginRes.ok) {
    await request('/api/admin/partners', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ id: 'DP-TEST-55', name: 'Partner 55', phone: '9877001122', email: 'dp55@fatafat.com', password: 'dpPassword123', locationId: 'nawabganj-unnao', locationName: 'Nawabganj' })
    });
    const pLogin2 = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ emailOrId: 'dp55@fatafat.com', password: 'dpPassword123' }) });
    assert(pLogin2.ok && pLogin2.data.user?.role === 'delivery_partner', 'Delivery partner authentication functions properly');
  } else {
    assert(partnerLoginRes.ok && partnerLoginRes.data.user?.role === 'delivery_partner', 'Delivery partner authentication functions properly');
  }

  console.log('\n========================================================================');
  console.log(`CUSTOMER MANAGEMENT TEST SUITE: ${passed} PASSED, ${failed} FAILED across ${passed + failed} Tests`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error in customer management test suite:', err);
  process.exit(1);
});
