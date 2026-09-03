/**
 * FATAFAT WELLNESS PUBLICATION STATE INTEGRATION TEST SUITE
 * 
 * Verifies:
 * 1. Admin publication of Wellness (published = true).
 * 2. Database persistence of publication state in PostgreSQL and memory.
 * 3. /api/auth/me returns wellnessPublished: true.
 * 4. /api/categories includes 'wellness'.
 * 5. Admin unpublication of Wellness (published = false).
 * 6. /api/auth/me returns wellnessPublished: false for unauthenticated / customer sessions.
 * 7. /api/categories excludes 'wellness' for customer sessions.
 * 8. /api/products with category=wellness is blocked with 403 for non-admins when unpublished.
 * 9. Direct product lookup /api/products/[id] for wellness products returns 404 when unpublished.
 * 10. Order creation with wellness items is rejected when unpublished.
 * 11. Re-publishing restores full normal visibility.
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
  console.log('       FATAFAT WELLNESS PUBLICATION STATE VERIFICATION SUITE            ');
  console.log('========================================================================\n');

  // 1. Authenticate Admin
  console.log('--- SETUP: AUTHENTICATION ---');
  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminLoginRes.ok && adminLoginRes.data.success, 'Super Admin authenticated');
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  // Authenticate Customer
  const custPhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const custRes = await request('/api/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ phone: custPhone, name: 'Wellness Tester' })
  });
  assert(custRes.ok && custRes.data.success, 'Customer authenticated');
  const custCookie = custRes.headers.get('set-cookie')?.split(';')[0] || '';

  // 2. Publish Wellness
  console.log('\n--- PHASE 1: ADMIN PUBLISHES WELLNESS ---');
  const pubRes = await request('/api/admin/wellness-settings', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ published: true })
  });
  assert(pubRes.ok && pubRes.data.published === true, 'Admin set publication state: published = true');

  // Verify /api/auth/me for unauthenticated / guest
  const meGuestPub = await request('/api/auth/me');
  assert(meGuestPub.data && meGuestPub.data.wellnessPublished === true, 'Guest /api/auth/me reflects wellnessPublished = true');

  // Verify /api/auth/me for customer
  const meCustPub = await request('/api/auth/me', { headers: { Cookie: custCookie } });
  assert(meCustPub.data && meCustPub.data.wellnessPublished === true, 'Customer /api/auth/me reflects wellnessPublished = true');

  // Verify /api/categories includes wellness
  const catPubRes = await request('/api/categories');
  const hasWellnessInCatPub = Array.isArray(catPubRes.data) && catPubRes.data.some(c => c.id === 'wellness' || c.slug === 'wellness');
  assert(hasWellnessInCatPub, 'Published state: /api/categories contains wellness category');

  // 3. Unpublish Wellness
  console.log('\n--- PHASE 2: ADMIN UNPUBLISHES WELLNESS ---');
  const unpubRes = await request('/api/admin/wellness-settings', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ published: false })
  });
  assert(unpubRes.ok && unpubRes.data.published === false, 'Admin set publication state: published = false');

  // Verify /api/auth/me reflects unpublished state immediately
  const meGuestUnpub = await request('/api/auth/me');
  assert(meGuestUnpub.data && meGuestUnpub.data.wellnessPublished === false, 'Guest /api/auth/me reflects wellnessPublished = false');

  const meCustUnpub = await request('/api/auth/me', { headers: { Cookie: custCookie } });
  assert(meCustUnpub.data && meCustUnpub.data.wellnessPublished === false, 'Customer /api/auth/me reflects wellnessPublished = false');

  // Verify /api/categories excludes wellness for customer/public
  const catUnpubRes = await request('/api/categories');
  const hasWellnessInCatUnpub = Array.isArray(catUnpubRes.data) && catUnpubRes.data.some(c => c.id === 'wellness' || c.slug === 'wellness');
  assert(!hasWellnessInCatUnpub, 'Unpublished state: /api/categories strictly EXCLUDES wellness category');

  // Verify public /api/products excludes wellness items
  const prodUnpubRes = await request('/api/products');
  const hasWellnessInProd = Array.isArray(prodUnpubRes.data) && prodUnpubRes.data.some(p => p.category === 'wellness');
  assert(!hasWellnessInProd, 'Unpublished state: /api/products strictly EXCLUDES wellness products');

  // Verify direct request for wellness category query is blocked (403)
  const directCatReq = await request('/api/products?category=wellness');
  assert(directCatReq.status === 403, 'Unpublished state: Direct category=wellness request is rejected with 403 Forbidden');

  // Verify direct single product lookup for wellness item returns 404 when unpublished
  const singleProdUnpub = await request('/api/products/well-1');
  assert(singleProdUnpub.status === 404, 'Unpublished state: Direct /api/products/well-1 returns 404 Not Found');

  // Verify non-wellness product lookup continues to work normally (200)
  const nonWellnessProd = await request('/api/products/choco-9');
  assert(nonWellnessProd.status === 200 && nonWellnessProd.data.id === 'choco-9', 'Unpublished state: Non-wellness products remain fully accessible (200)');

  // Verify Admin can still access wellness items via admin session
  const adminProdView = await request('/api/products/well-1', { headers: { Cookie: adminCookie } });
  assert(adminProdView.status === 200 && adminProdView.data.id === 'well-1', 'Unpublished state: Super Admin can still inspect wellness products');

  // Verify order with wellness item is rejected during checkout
  const orderBlockedRes = await request('/api/orders', {
    method: 'POST',
    headers: { Cookie: custCookie },
    body: JSON.stringify({
      items: [{ productId: 'well-1', name: 'Durex Mutual Climax', category: 'wellness', price: 380, quantity: 1 }],
      address: { name: 'Wellness Tester', mobile: custPhone, house: '1', street: 'A', area: 'B', city: 'C', pincode: '226001' }
    })
  });
  assert(orderBlockedRes.status === 403, 'Unpublished state: Order placement with wellness items is strictly BLOCKED (403)');

  // 4. Re-publish Wellness
  console.log('\n--- PHASE 3: ADMIN RE-PUBLISHES WELLNESS ---');
  const repubRes = await request('/api/admin/wellness-settings', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ published: true })
  });
  assert(repubRes.ok && repubRes.data.published === true, 'Admin re-published wellness');

  const meRepub = await request('/api/auth/me');
  assert(meRepub.data && meRepub.data.wellnessPublished === true, 'Re-published: /api/auth/me reflects wellnessPublished = true');

  const catRepub = await request('/api/categories');
  const hasWellnessRepub = Array.isArray(catRepub.data) && catRepub.data.some(c => c.id === 'wellness' || c.slug === 'wellness');
  assert(hasWellnessRepub, 'Re-published: /api/categories contains wellness again');

  // 5. Leave in Unpublished state as requested
  console.log('\n--- PHASE 4: FINAL CLEANUP - UNPUBLISH WELLNESS ---');
  const finalUnpub = await request('/api/admin/wellness-settings', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ published: false })
  });
  assert(finalUnpub.ok && finalUnpub.data.published === false, 'Final State: Admin successfully set published = false');

  const finalMe = await request('/api/auth/me');
  assert(finalMe.data && finalMe.data.wellnessPublished === false, 'Final State: /api/auth/me confirms wellnessPublished = false');

  console.log('\n========================================================================');
  console.log(`WELLNESS PUBLICATION SUITE: ${passed} PASSED, ${failed} FAILED across ${passed + failed} Tests`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error in wellness publication test suite:', err);
  process.exit(1);
});
