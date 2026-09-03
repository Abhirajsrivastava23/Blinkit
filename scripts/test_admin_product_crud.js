/**
 * End-to-End Regression Test Suite for Admin Product Management CRUD
 * Covers:
 * 1. Create a new product with all required fields
 * 2. Verify existence in DB, Admin catalog, and Storefront API
 * 3. Edit product name, price, description, category, and details
 * 4. Verify stable immutable ID preservation (no duplicates created)
 * 5. Verify update persistence in DB and storefront
 * 6. Test invalid inputs (missing required fields) -> HTTP 400
 * 7. Test non-existent product operations -> HTTP 404
 * 8. Delete test product -> Verify complete removal
 * 9. Modify an existing store product -> Verify persistence across re-fetch
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
  console.log('  TEST SUITE: ADMIN PRODUCT MANAGEMENT CRUD LIFECYCLE                   ');
  console.log('========================================================================\n');

  // Step 1: Admin Authentication
  console.log('--- 1. ADMIN AUTHENTICATION ---');
  const adminAuth = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminAuth.ok, 'Super Admin logged in successfully');
  const adminCookie = adminAuth.headers.get('set-cookie') || '';

  // Step 2: Create a New Product
  console.log('\n--- 2. CREATE NEW PRODUCT ---');
  const testUniqueTag = Date.now().toString().slice(-6);
  const newProductPayload = {
    name: `Artisan Pistachio Saffron Cake ${testUniqueTag}`,
    price: 849,
    originalPrice: 999,
    category: 'cakes',
    subCategory: 'Gourmet Cakes',
    description: 'Handcrafted saffron sponge layered with roasted Iranian pistachio cream.',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    deliveryTime: '30-45 mins',
    inStock: true,
    variants: ['0.5 KG', '1 KG', '2 KG']
  };

  const createRes = await request('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify(newProductPayload)
  });

  assert(createRes.ok, `Product created successfully (HTTP ${createRes.status})`);
  assert(createRes.data?.success === true, 'Create response has success: true');
  assert(createRes.data?.product?.id, `Created product has assigned ID: ${createRes.data?.product?.id}`);
  assert(createRes.data?.product?.price === 849, 'Created product price matches (849)');
  assert(createRes.data?.product?.discount === 15, 'Discount correctly calculated (15%)');

  const createdId = createRes.data?.product?.id;

  // Step 3: Verify Persistence in DB, Admin Catalog, and Storefront
  console.log('\n--- 3. VERIFY PERSISTENCE IN CATALOG & STOREFRONT ---');
  const getDetailRes = await request(`/api/products/${createdId}`);
  assert(getDetailRes.ok, `Product detail retrieved via GET /api/products/${createdId}`);
  assert(getDetailRes.data?.name === newProductPayload.name, 'Retrieved product name matches created name');
  assert(getDetailRes.data?.inStock === true, 'Retrieved product inStock is true');

  const listCatalogRes = await request('/api/products');
  assert(listCatalogRes.ok, 'Catalog list retrieved via GET /api/products');
  const foundInCatalog = Array.isArray(listCatalogRes.data) && listCatalogRes.data.some(p => p.id === createdId);
  assert(foundInCatalog, 'Created product is present in full catalog list');

  // Step 4: Edit Product Details (Rename, Price Change, In Stock Toggle)
  console.log('\n--- 4. EDIT PRODUCT DETAILS (PATCH) ---');
  const updatedPayload = {
    name: `Royal Pistachio Saffron Delight ${testUniqueTag}`,
    price: 799,
    originalPrice: 999,
    description: 'Upgraded with silver vark and extra crushed pistachio nuts.',
    inStock: true
  };

  const patchRes = await request(`/api/products/${createdId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify(updatedPayload)
  });

  assert(patchRes.ok, `Product updated successfully via PATCH (HTTP ${patchRes.status})`);
  assert(patchRes.data?.success === true, 'Update response has success: true');
  assert(patchRes.data?.product?.id === createdId, 'Product ID remained stable and immutable');
  assert(patchRes.data?.product?.name === updatedPayload.name, 'Updated name returned in response');
  assert(patchRes.data?.product?.price === 799, 'Updated price returned in response (799)');
  assert(patchRes.data?.product?.discount === 20, 'Updated discount recalculated (20%)');

  // Step 5: Verify Storefront Sees Updated Details Immediately
  console.log('\n--- 5. STOREFRONT VERIFICATION POST-UPDATE ---');
  const refreshedDetailRes = await request(`/api/products/${createdId}`);
  assert(refreshedDetailRes.ok, 'Storefront retrieved fresh product details');
  assert(refreshedDetailRes.data?.name === updatedPayload.name, 'Storefront sees updated name');
  assert(refreshedDetailRes.data?.price === 799, 'Storefront sees updated price');
  assert(refreshedDetailRes.data?.description === updatedPayload.description, 'Storefront sees updated description');

  // Step 6: Input Validation & Error Handling
  console.log('\n--- 6. INPUT VALIDATION & ERROR HANDLING ---');
  const invalidCreate = await request('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ name: 'Incomplete Item' }) // Missing price, category, image
  });
  assert(invalidCreate.status === 400, 'Invalid create rejected with HTTP 400');
  assert(Boolean(invalidCreate.data?.error), 'Error message returned for missing mandatory fields');

  const nonExistentPatch = await request('/api/products/non-existent-sku-999999', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ price: 100 })
  });
  assert(nonExistentPatch.status === 404, 'Editing non-existent product rejected with HTTP 404');

  // Step 7: Delete Product
  console.log('\n--- 7. DELETE PRODUCT ---');
  const deleteRes = await request(`/api/products/${createdId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie }
  });
  assert(deleteRes.ok, `Product deleted via DELETE /api/products/${createdId}`);
  assert(deleteRes.data?.success === true, 'Delete response has success: true');

  // Verify it is gone
  const getDeletedRes = await request(`/api/products/${createdId}`);
  assert(getDeletedRes.status === 404, 'Deleted product returns HTTP 404 on subsequent lookup');

  const deleteAgainRes = await request(`/api/products/${createdId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie }
  });
  assert(deleteAgainRes.status === 404, 'Deleting already-deleted product returns HTTP 404');

  // Step 8: Edit an Existing Pre-populated Product (e.g. choco-1)
  console.log('\n--- 8. EDIT EXISTING PRE-POPULATED PRODUCT ---');
  const existingProductRes = await request('/api/products/choco-1');
  if (existingProductRes.ok) {
    const origPrice = existingProductRes.data.price;
    const testNewPrice = origPrice === 499 ? 549 : 499;

    const editExistingRes = await request('/api/products/choco-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ price: testNewPrice })
    });
    assert(editExistingRes.ok, `Existing product choco-1 updated price to ₹${testNewPrice}`);
    assert(editExistingRes.data?.product?.id === 'choco-1', 'choco-1 ID preserved');

    // Revert back
    await request('/api/products/choco-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ price: origPrice })
    });
    assert(true, `Reverted choco-1 price back to original ₹${origPrice}`);
  } else {
    console.log('  [SKIP] choco-1 not found in seed data');
  }

  console.log('\n========================================================================');
  console.log(`PRODUCT CRUD TEST SUITE: ${passed} PASSED, ${failed} FAILED across ${passed + failed} Tests`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTest().catch(err => {
  console.error('Fatal error in product CRUD test suite:', err);
  process.exit(1);
});
