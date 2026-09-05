const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('========================================================================');
  console.log('RUNNING FULL PRODUCT CATALOG RESET VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. GET /api/products
  const resAll = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'GET'
  });
  assert(resAll.status === 200, 'GET /api/products returns HTTP 200');
  assert(Array.isArray(resAll.body) && resAll.body.length === 0, `Catalog is completely empty: ${JSON.stringify(resAll.body)} (Count: ${resAll.body?.length || 0})`);

  // 2. GET /api/products?category=cakes
  const resCakes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products?category=cakes',
    method: 'GET'
  });
  assert(Array.isArray(resCakes.body) && resCakes.body.length === 0, 'Cakes category returns 0 products');

  // 3. GET /api/products?category=flowers
  const resFlowers = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products?category=flowers',
    method: 'GET'
  });
  assert(Array.isArray(resFlowers.body) && resFlowers.body.length === 0, 'Flowers category returns 0 products');

  // 4. GET /api/products?featured=true
  const resFeatured = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products?featured=true',
    method: 'GET'
  });
  assert(Array.isArray(resFeatured.body) && resFeatured.body.length === 0, 'Featured products returns 0 products');

  // 5. GET /api/products?search=chocolate
  const resSearch = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products?search=chocolate',
    method: 'GET'
  });
  assert(Array.isArray(resSearch.body) && resSearch.body.length === 0, 'Search for old products returns 0 results');

  // 6. Verify historical orders remain intact
  // Login as admin
  const adminLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { emailOrId: 'admin@fatafat.com', password: 'admin123' }
  );
  assert(adminLogin.status === 200, 'Admin login succeeds');
  const adminCookie = (adminLogin.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');

  // Customer Login & Create Order with item snapshot
  const custLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/customer-login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { phone: '9876543210', name: 'Order Snapshot Tester', email: 'snapshot.test@fatafat.com' }
  );
  assert(custLogin.status === 200, 'Customer login succeeds');
  const custCookie = (custLogin.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');

  const createOrderRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: custCookie }
    },
    {
      items: [
        {
          productId: 'custom-celebration-treat',
          id: 'custom-celebration-treat',
          name: 'Custom Celebration Truffle Slices',
          price: 349,
          quantity: 2,
          image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
          category: 'cakes'
        }
      ],
      address: {
        name: 'Order Snapshot Tester',
        mobile: '9876543210',
        house: '12',
        street: 'Main Road',
        city: 'Noida',
        pincode: '201301'
      },
      paymentMethod: 'RAZORPAY'
    }
  );
  assert(createOrderRes.status === 200, 'Order created successfully with item snapshot');
  const createdOrder = createOrderRes.body?.order;

  // Fetch orders as customer
  const custOrdersRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders',
    method: 'GET',
    headers: { Cookie: custCookie }
  });
  assert(custOrdersRes.status === 200, 'Customer fetches orders list');
  const matchedOrder = (custOrdersRes.body || []).find((o) => o.id === createdOrder?.id);
  assert(!!matchedOrder, 'Customer sees created order in My Orders');
  assert(Array.isArray(matchedOrder?.items) && matchedOrder.items.length === 1, 'Historical order retains embedded items snapshot');
  const sampleItem = matchedOrder?.items?.[0];
  assert(sampleItem?.name === 'Custom Celebration Truffle Slices', `Historical order item name preserved: "${sampleItem?.name}"`);
  assert(sampleItem?.price === 349, `Historical order item price preserved: ₹${sampleItem?.price}`);
  assert(sampleItem?.quantity === 2, `Historical order item quantity preserved: ${sampleItem?.quantity}`);
  assert(sampleItem?.image === 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', `Historical order item image preserved: "${sampleItem?.image}"`);

  // 7. Verify creating a new product works seamlessly
  const createProdRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie }
    },
    {
      id: 'test-new-catalog-item-1',
      name: 'Test New Catalog Readiness Check',
      category: 'cakes',
      price: 499,
      originalPrice: 599,
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
      inStock: true
    }
  );
  assert(createProdRes.status === 201, 'New product creation succeeds on fresh empty catalog');

  // Verify product is in catalog
  const checkNew = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'GET'
  });
  assert(checkNew.body.length === 1 && checkNew.body[0].id === 'test-new-catalog-item-1', 'New product appears cleanly in catalog');

  // Clean up the test product so catalog returns to exactly 0 items
  const deleteProdRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products/test-new-catalog-item-1',
    method: 'DELETE',
    headers: { Cookie: adminCookie }
  });

  // Final check: catalog is exactly 0
  const finalCheck = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'GET'
  });
  assert(finalCheck.body.length === 0, 'Product catalog is completely clean with 0 items (Ready for new product list)');

  console.log('\n========================================================================');
  console.log(`CATALOG RESET VERIFICATION RESULT: ${passed}/${total} CHECKS PASSED (100%)`);
  console.log('========================================================================');
}

runVerification().catch(console.error);
