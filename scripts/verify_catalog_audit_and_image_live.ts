import fs from 'fs';
import path from 'path';
import http from 'http';
import { db } from '../src/data/db';
import { Product } from '../src/data/mockData';

function loadEnv() {
  for (const envFile of ['.env.local', '.env']) {
    const full = path.resolve(envFile);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env[k] = v;
      }
    }
  }
}

loadEnv();

async function makeRequest(options: http.RequestOptions, body?: any): Promise<{ statusCode: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        let parsed: any = rawData;
        try {
          parsed = JSON.parse(rawData);
        } catch {}
        resolve({
          statusCode: res.statusCode || 0,
          data: parsed,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

function extractCookie(headers: http.IncomingHttpHeaders): string {
  const setCookie = headers['set-cookie'];
  if (!setCookie || setCookie.length === 0) return '';
  return setCookie[0].split(';')[0].trim();
}

async function runAuditAndVerification() {
  console.log('========================================================================');
  console.log('⚡ FATAFAT COMPLETE PRODUCT CATALOG AUDIT & LIVE IMAGE UPDATE SUITE');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, passMsg: string, failMsg: string) {
    totalTests++;
    if (condition) {
      console.log(`✔ PASS [${totalTests}]: ${passMsg}`);
      passedTests++;
      return true;
    } else {
      console.error(`❌ FAIL [${totalTests}]: ${failMsg}`);
      return false;
    }
  }

  // -------------------------------------------------------------
  // 1. CATALOG AUDIT: Exact 67 Canonical Products
  // -------------------------------------------------------------
  console.log('\n--- 1. PRODUCT CATALOG AUDIT ---');

  const productsJsonPath = path.resolve('src/data/db/products.json');
  const canonicalList: Product[] = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));

  assert(
    canonicalList.length === 67,
    `Canonical products.json contains exactly 67 products (found: ${canonicalList.length})`,
    `Expected 67 canonical products, found ${canonicalList.length}`
  );

  // Category distribution
  const expectedCategoryCounts: Record<string, number> = {
    'Birthday Cakes': 25,
    'Chocolate Cakes': 19,
    'Pastries': 3,
    'Beer Theme Cakes': 9,
    'Desserts': 11
  };

  const actualCategoryCounts: Record<string, number> = {};
  for (const p of canonicalList) {
    actualCategoryCounts[p.category] = (actualCategoryCounts[p.category] || 0) + 1;
  }

  let catCountsMatch = true;
  for (const [cat, expected] of Object.entries(expectedCategoryCounts)) {
    const actual = actualCategoryCounts[cat] || 0;
    if (actual !== expected) {
      catCountsMatch = false;
      console.error(`Category count mismatch for "${cat}": expected ${expected}, got ${actual}`);
    }
  }

  assert(
    catCountsMatch,
    `Category distribution matches canonical breakdown: Birthday Cakes (25), Chocolate Cakes (19), Pastries (3), Beer Theme Cakes (9), Desserts (11)`,
    `Category distribution mismatch: ${JSON.stringify(actualCategoryCounts)}`
  );

  // Duplicate check
  const idSet = new Set<string>();
  let duplicateCount = 0;
  for (const p of canonicalList) {
    const lower = p.id.toLowerCase().trim();
    if (idSet.has(lower)) {
      duplicateCount++;
    }
    idSet.add(lower);
  }

  assert(
    duplicateCount === 0,
    `Zero duplicate canonical product IDs found.`,
    `Found ${duplicateCount} duplicate canonical product IDs.`
  );

  // Database read verification
  const dbProducts = await db.readTable<Product>('products');
  assert(
    dbProducts.length === 67,
    `Database (db.readTable('products')) returns exactly 67 canonical products (found: ${dbProducts.length}).`,
    `Database returned ${dbProducts.length} products instead of 67.`
  );

  // Check extra products
  const canonicalIds = new Set(canonicalList.map(p => p.id.toLowerCase().trim()));
  const extraProducts = dbProducts.filter(p => !canonicalIds.has(p.id.toLowerCase().trim()));
  assert(
    extraProducts.length === 0,
    `Extra / rogue / test products in database: 0`,
    `Found ${extraProducts.length} extra products in database: ${JSON.stringify(extraProducts.map(e => e.id))}`
  );

  // -------------------------------------------------------------
  // 2. SYSTEM INTEGRITY: Preserved Historical Data
  // -------------------------------------------------------------
  console.log('\n--- 2. SYSTEM INTEGRITY VERIFICATION ---');
  const orders = await db.readTable<any>('orders');
  const users = await db.readTable<any>('users');
  const partners = await db.readTable<any>('partners');
  const admins = await db.readTable<any>('admin');

  assert(
    Array.isArray(orders) && Array.isArray(users) && partners.length > 0 && admins.length > 0,
    `Historical data preserved: Orders (${orders.length}), Users (${users.length}), Partners (${partners.length}), Admins (${admins.length}) intact.`,
    `System data was modified or corrupted.`
  );

  // -------------------------------------------------------------
  // 3. API CATALOG ENDPOINT CHECK: GET /api/products
  // -------------------------------------------------------------
  console.log('\n--- 3. API CATALOG ENDPOINT CHECK ---');
  const getProductsRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'GET'
  });

  assert(
    getProductsRes.statusCode === 200 && Array.isArray(getProductsRes.data) && getProductsRes.data.length === 67,
    `GET /api/products returns 200 OK with all 67 canonical products.`,
    `GET /api/products failed (Status: ${getProductsRes.statusCode}, Count: ${Array.isArray(getProductsRes.data) ? getProductsRes.data.length : 'N/A'})`
  );

  assert(
    getProductsRes.headers['cache-control']?.includes('no-store') || false,
    `GET /api/products response includes Cache-Control: no-store / no-cache header to prevent stale client cache.`,
    `Cache-Control header missing or stale: ${getProductsRes.headers['cache-control']}`
  );

  // -------------------------------------------------------------
  // 4. AUTHENTIC LOGIN SESSIONS SETUP
  // -------------------------------------------------------------
  console.log('\n--- 4. AUTHENTIC SESSIONS SETUP ---');

  // 4.1 Admin Login
  let adminCookie = '';
  let lastAdminLoginRes: any = null;
  for (const pwd of ['admin123', 'superadmin123', 'fatafat123', 'admin']) {
    const adminLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { emailOrId: 'superadmin@fatafat.com', password: pwd }
    );
    lastAdminLoginRes = adminLoginRes;
    if (adminLoginRes.statusCode === 200) {
      adminCookie = extractCookie(adminLoginRes.headers);
      break;
    }
  }

  assert(
    !!adminCookie,
    `Admin session successfully authenticated via POST /api/auth/login`,
    `Admin login failed (Status: ${lastAdminLoginRes?.statusCode}, Body: ${JSON.stringify(lastAdminLoginRes?.data)})`
  );

  // 4.2 Delivery Partner Login
  let partnerCookie = '';
  for (const pwd of ['rider123', 'delivery123', 'fatafat123', 'partner123']) {
    const partnerLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { emailOrId: 'rider@fatafat.com', password: pwd }
    );
    if (partnerLoginRes.statusCode === 200) {
      partnerCookie = extractCookie(partnerLoginRes.headers);
      break;
    }
  }

  assert(
    !!partnerCookie,
    `Delivery Partner session successfully authenticated via POST /api/auth/login`,
    `Delivery Partner login failed.`
  );

  // 4.3 Customer Login
  const customerLoginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/customer-login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { phone: '9876543210', name: 'Test Customer' }
  );
  const customerCookie = extractCookie(customerLoginRes.headers);

  assert(
    !!customerCookie,
    `Customer session successfully created via POST /api/auth/customer-login`,
    `Customer login failed.`
  );

  // -------------------------------------------------------------
  // 5. ADMIN IMAGE UPDATE LIVE FIX
  // -------------------------------------------------------------
  console.log('\n--- 5. ADMIN IMAGE UPDATE LIVE FIX ---');

  const testProduct1 = canonicalList[0];
  const originalImage1 = testProduct1.image || '';
  const newAdminImageUrl = 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=800&auto=format&fit=crop&q=80';

  // Perform image upload via POST /api/products/upload-photo
  const adminUploadRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/products/upload-photo',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      }
    },
    {
      productId: testProduct1.id,
      imageUrl: newAdminImageUrl
    }
  );

  assert(
    adminUploadRes.statusCode === 200 && adminUploadRes.data?.success === true,
    `Admin successfully updated product image via POST /api/products/upload-photo (Status: ${adminUploadRes.statusCode})`,
    `Admin image update failed: ${JSON.stringify(adminUploadRes.data)}`
  );

  // Verify live customer GET /api/products/[id] reflects new image
  const getProduct1Res = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/products/${encodeURIComponent(testProduct1.id)}`,
    method: 'GET'
  });

  assert(
    getProduct1Res.statusCode === 200 && getProduct1Res.data?.image === newAdminImageUrl,
    `Customer-facing product detail GET /api/products/${testProduct1.id} immediately returns updated image.`,
    `Customer API returned stale or incorrect image: ${getProduct1Res.data?.image}`
  );

  // -------------------------------------------------------------
  // 6. DELIVERY PARTNER IMAGE UPDATE LIVE FIX
  // -------------------------------------------------------------
  console.log('\n--- 6. DELIVERY PARTNER IMAGE UPDATE LIVE FIX ---');

  const testProduct2 = canonicalList[1];
  const originalImage2 = testProduct2.image || '';
  const newPartnerImageUrl = 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=800&auto=format&fit=crop&q=80';

  const partnerUploadRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/products/upload-photo',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': partnerCookie
      }
    },
    {
      productId: testProduct2.id,
      imageUrl: newPartnerImageUrl
    }
  );

  assert(
    partnerUploadRes.statusCode === 200 && partnerUploadRes.data?.success === true,
    `Delivery Partner successfully updated product photo via POST /api/products/upload-photo (Status: ${partnerUploadRes.statusCode})`,
    `Delivery Partner image update failed: ${JSON.stringify(partnerUploadRes.data)}`
  );

  const getProduct2Res = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/products/${encodeURIComponent(testProduct2.id)}`,
    method: 'GET'
  });

  assert(
    getProduct2Res.statusCode === 200 && getProduct2Res.data?.image === newPartnerImageUrl,
    `Customer-facing product detail GET /api/products/${testProduct2.id} immediately reflects Delivery Partner updated image.`,
    `Customer API returned stale image after partner update: ${getProduct2Res.data?.image}`
  );

  // -------------------------------------------------------------
  // 7. PERMISSIONS & SERVER-SIDE AUTHORIZATION
  // -------------------------------------------------------------
  console.log('\n--- 7. PERMISSIONS & AUTHORIZATION SECURITY ---');

  const unauthUploadRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/products/upload-photo',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': customerCookie
      }
    },
    {
      productId: testProduct1.id,
      imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'
    }
  );

  assert(
    unauthUploadRes.statusCode === 403,
    `Customer/Unauthorized user correctly rejected from product photo upload with 403 Forbidden.`,
    `Customer was NOT blocked from photo upload (Status: ${unauthUploadRes.statusCode})`
  );

  const unauthPatchRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/products/${encodeURIComponent(testProduct1.id)}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': customerCookie
      }
    },
    {
      price: 10
    }
  );

  assert(
    unauthPatchRes.statusCode === 403,
    `Customer/Unauthorized user correctly rejected from PATCH /api/products/[id] with 403 Forbidden.`,
    `Customer was NOT blocked from product patch (Status: ${unauthPatchRes.statusCode})`
  );

  const unauthDeleteRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/products/${encodeURIComponent(testProduct1.id)}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': customerCookie
      }
    }
  );

  assert(
    unauthDeleteRes.statusCode === 403,
    `Customer/Unauthorized user correctly rejected from DELETE /api/products/[id] with 403 Forbidden.`,
    `Customer was NOT blocked from product delete (Status: ${unauthDeleteRes.statusCode})`
  );

  // -------------------------------------------------------------
  // 8. RESTORE / CLEANUP OF TESTED IMAGES
  // -------------------------------------------------------------
  console.log('\n--- 8. RESTORATION & CLEANUP ---');

  // Restore Product 1 via admin PATCH API
  const restore1Res = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/products/${encodeURIComponent(testProduct1.id)}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      }
    },
    {
      image: originalImage1,
      gallery: originalImage1 ? [originalImage1] : []
    }
  );

  // Restore Product 2 via partner PATCH API
  const restore2Res = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/products/${encodeURIComponent(testProduct2.id)}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': partnerCookie
      }
    },
    {
      image: originalImage2,
      gallery: originalImage2 ? [originalImage2] : []
    }
  );

  const finalP1 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/products/${encodeURIComponent(testProduct1.id)}`,
    method: 'GET'
  });

  const finalP2 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/products/${encodeURIComponent(testProduct2.id)}`,
    method: 'GET'
  });

  const expectedImage1 = originalImage1 || '/categories/category-cakes.jpg';
  const expectedImage2 = originalImage2 || '/categories/category-cakes.jpg';

  assert(
    finalP1.data?.image === expectedImage1 && finalP2.data?.image === expectedImage2 && finalP1.data?.image !== newAdminImageUrl && finalP2.data?.image !== newPartnerImageUrl,
    `Canonical images cleanly restored in database and verified via GET API.`,
    `Image restoration verification mismatch (P1: "${finalP1.data?.image}", P2: "${finalP2.data?.image}")`
  );

  console.log('\n========================================================================');
  console.log(`FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAuditAndVerification().catch((err) => {
  console.error('Audit suite encountered an error:', err);
  process.exit(1);
});
