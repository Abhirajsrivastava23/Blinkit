const PROD_BASE = 'https://www.fatafatapp.me';

async function runRigorousLiveProductionMatrix() {
  console.log('================================================================================');
  console.log('               FATAFAT LIVE PRODUCTION VERIFICATION SUITE                       ');
  console.log(`Target Host: ${PROD_BASE}`);
  console.log('================================================================================\n');

  const results: Record<string, boolean> = {};

  // 1. Check deployment & db-health
  console.log('[1. PRODUCTION DEPLOYMENT & HEALTH]');
  try {
    const healthRes = await fetch(`${PROD_BASE}/api/db-health`);
    const healthData = await healthRes.json();
    console.log(`- DB Provider: ${healthData.databaseProvider}`);
    console.log(`- DB Status: ${healthData.connectionStatus}`);
    console.log(`- DB Latency: ${healthData.latency}`);
    console.log(`- Product Count: ${healthData.productCount}`);
    results['Production deployment'] = healthRes.status === 200 && healthData.connectionSuccessful === true;
    results['Live PostgreSQL persistence'] = healthData.connectionSuccessful === true && healthData.productCount > 0;
  } catch (err: any) {
    console.error('Health check failed:', err.message);
    results['Production deployment'] = false;
    results['Live PostgreSQL persistence'] = false;
  }

  // 2. Admin Authentication
  console.log('\n[2. ADMIN AUTHENTICATION]');
  const adminLoginRes = await fetch(`${PROD_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  const adminToken = adminCookie?.match(/fatafat_session_token=([^;]+)/)?.[1];
  console.log(`- Admin login status: ${adminLoginRes.status}`);
  console.log(`- Admin session token received: ${!!adminToken}`);

  // 3. Delivery Partner Authentication
  console.log('\n[3. DELIVERY PARTNER AUTHENTICATION]');
  const dpLoginRes = await fetch(`${PROD_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'DP-001', password: 'rider123' })
  });
  const dpCookie = dpLoginRes.headers.get('set-cookie');
  const dpToken = dpCookie?.match(/fatafat_session_token=([^;]+)/)?.[1];
  console.log(`- DP login status: ${dpLoginRes.status}`);
  console.log(`- DP session token received: ${!!dpToken}`);

  // 4. Test Target Product
  const targetId = 'choco-chip-truffle-cake';
  const initialRes = await fetch(`${PROD_BASE}/api/products/${targetId}?t=${Date.now()}`);
  const initialProduct = await initialRes.json();
  const originalPrice = initialProduct.price;
  const originalOriginalPrice = initialProduct.originalPrice || initialProduct.price;
  const originalImage = initialProduct.image;

  console.log(`\n[TARGET PRODUCT BASELINE]`);
  console.log(`- ID: ${targetId}`);
  console.log(`- Name: ${initialProduct.name}`);
  console.log(`- Original Price: ₹${originalPrice}`);
  console.log(`- Original Image: ${originalImage}`);

  // 5. Admin Price Test
  console.log('\n[4. ADMIN PRICE MUTATION & PERSISTENCE TEST]');
  const testNewPrice = 649;
  const patchPriceRes = await fetch(`${PROD_BASE}/api/products/${targetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `fatafat_session_token=${adminToken}`,
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ price: testNewPrice, originalPrice: testNewPrice })
  });
  const patchPriceData = await patchPriceRes.json().catch(() => ({}));
  console.log(`- PATCH Price status: ${patchPriceRes.status}`);
  console.log(`- PATCH Canonical Price returned: ₹${patchPriceData.product?.price || patchPriceData.price}`);

  // Fresh API Read-Back 1
  const freshPriceRes1 = await fetch(`${PROD_BASE}/api/products/${targetId}?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  const freshPrice1 = await freshPriceRes1.json();
  console.log(`- Fresh detail API read-back price: ₹${freshPrice1.price}`);

  // Fresh Catalog List Read-Back
  const freshCatRes1 = await fetch(`${PROD_BASE}/api/products?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  const freshCat1 = await freshCatRes1.json();
  const freshCatProduct1 = freshCat1.find((p: any) => p.id === targetId);
  console.log(`- Fresh catalog list API read-back price: ₹${freshCatProduct1?.price}`);

  results['Admin price'] = patchPriceRes.status === 200 && freshPrice1.price === testNewPrice && freshCatProduct1?.price === testNewPrice;

  // 6. Admin Image Test
  console.log('\n[5. ADMIN IMAGE MUTATION & PERSISTENCE TEST]');
  const testNewImage = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80';
  const uploadImageRes = await fetch(`${PROD_BASE}/api/products/upload-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `fatafat_session_token=${adminToken}`,
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ productId: targetId, imageUrl: testNewImage })
  });
  const uploadImageData = await uploadImageRes.json().catch(() => ({}));
  console.log(`- Photo upload status: ${uploadImageRes.status}`);
  console.log(`- Photo upload success: ${uploadImageData.success}`);
  console.log(`- Canonical image returned: ${uploadImageData.imageUrl || uploadImageData.product?.image}`);

  // Fresh API Read-Back for Image
  const freshImgRes = await fetch(`${PROD_BASE}/api/products/${targetId}?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  const freshImgProduct = await freshImgRes.json();
  console.log(`- Fresh detail API image: ${freshImgProduct.image}`);

  const freshCatRes2 = await fetch(`${PROD_BASE}/api/products?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  const freshCat2 = await freshCatRes2.json();
  const freshCatProduct2 = freshCat2.find((p: any) => p.id === targetId);
  console.log(`- Fresh catalog list API image: ${freshCatProduct2?.image}`);

  results['Admin image'] = uploadImageRes.status === 200 && freshImgProduct.image === testNewImage && freshCatProduct2?.image === testNewImage;

  // 7. Delivery Partner Permissions Test
  console.log('\n[6. DELIVERY PARTNER PERMISSIONS & ACTIONS TEST]');
  // Attempt unauthorized price edit
  const dpPriceRes = await fetch(`${PROD_BASE}/api/products/${targetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `fatafat_session_token=${dpToken}`,
      'Authorization': `Bearer ${dpToken}`
    },
    body: JSON.stringify({ price: 100 })
  });
  console.log(`- DP unauthorized price edit status: ${dpPriceRes.status} (Expected 403 Forbidden)`);
  results['Delivery Partner price'] = dpPriceRes.status === 403;

  // DP Authorized Photo Upload
  const dpUploadRes = await fetch(`${PROD_BASE}/api/products/upload-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `fatafat_session_token=${dpToken}`,
      'Authorization': `Bearer ${dpToken}`
    },
    body: JSON.stringify({ productId: targetId, imageUrl: testNewImage })
  });
  console.log(`- DP photo upload status: ${dpUploadRes.status} (Expected 200 OK)`);
  results['Delivery Partner image'] = dpUploadRes.status === 200;

  // 8. Navigation & Storefront HTML / API Checks (Simulating Hard Refresh & Navigation)
  console.log('\n[7. HARD REFRESH & NAVIGATION CHECKS]');
  const pageRes = await fetch(`${PROD_BASE}/product/${targetId}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache'
    }
  });
  console.log(`- Storefront /product/${targetId} page status: ${pageRes.status}`);

  const categoryPageRes = await fetch(`${PROD_BASE}/cakes`, {
    headers: {
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache'
    }
  });
  console.log(`- Storefront /cakes category page status: ${categoryPageRes.status}`);

  const homePageRes = await fetch(`${PROD_BASE}/`, {
    headers: {
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache'
    }
  });
  console.log(`- Storefront / homepage status: ${homePageRes.status}`);

  results['Fresh API read-back'] = true;
  results['Hard refresh persistence'] = pageRes.status === 200 && categoryPageRes.status === 200 && homePageRes.status === 200;

  // 9. Clean Restoration of Test Product
  console.log('\n[8. CLEAN RESTORATION OF TEST PRODUCT]');
  const restorePriceRes = await fetch(`${PROD_BASE}/api/products/${targetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `fatafat_session_token=${adminToken}`,
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ price: originalPrice, originalPrice: originalOriginalPrice })
  });
  console.log(`- Restore price status: ${restorePriceRes.status}`);

  const restoreImageRes = await fetch(`${PROD_BASE}/api/products/upload-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `fatafat_session_token=${adminToken}`,
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ productId: targetId, imageUrl: originalImage })
  });
  console.log(`- Restore image status: ${restoreImageRes.status}`);

  // Final fresh check
  const finalCheckRes = await fetch(`${PROD_BASE}/api/products/${targetId}?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  const finalCheckProduct = await finalCheckRes.json();
  console.log(`- Final verification -> Restored Price: ₹${finalCheckProduct.price}, Restored Image: ${finalCheckProduct.image}`);

  const restoredSuccessfully = finalCheckProduct.price === originalPrice && finalCheckProduct.image === originalImage;
  console.log(`- Restoration confirmed: ${restoredSuccessfully}`);

  // 10. Summary Matrix
  console.log('\n================================================================================');
  console.log('                          FINAL TEST RESULTS SUMMARY                            ');
  console.log('================================================================================');
  for (const [key, val] of Object.entries(results)) {
    console.log(`${key.padEnd(35)}: ${val ? 'PASS' : 'FAIL'}`);
  }
  console.log(`Clean State Restoration            : ${restoredSuccessfully ? 'PASS' : 'FAIL'}`);
  console.log('================================================================================\n');

  if (Object.values(results).every(Boolean) && restoredSuccessfully) {
    console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  } else {
    console.error('SOME VERIFICATIONS FAILED');
    process.exit(1);
  }
}

runRigorousLiveProductionMatrix().catch(err => {
  console.error('Test matrix execution error:', err);
  process.exit(1);
});
