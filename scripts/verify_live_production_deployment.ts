import { getPool } from '../src/data/db';

const PROD_BASE = 'https://www.fatafatapp.me';

async function runLiveAudit() {
  console.log('===============================================================');
  console.log('LIVE VERCEL PRODUCTION PERSISTENCE & DEPLOYMENT VERIFICATION');
  console.log(`Base URL: ${PROD_BASE}`);
  console.log('===============================================================\n');

  // Step 1: Admin Authentication
  console.log('[STEP 1] Authenticating Admin on Live Production...');
  const adminLoginRes = await fetch(`${PROD_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });

  const adminSetCookie = adminLoginRes.headers.get('set-cookie');
  const adminCookie = adminSetCookie ? adminSetCookie.split(';')[0] : '';
  const adminData = await adminLoginRes.json();
  console.log(`  -> Admin Login Status: ${adminLoginRes.status}, User: ${adminData.user?.name || adminData.user?.email}`);
  if (!adminLoginRes.ok || !adminCookie) {
    throw new Error('Admin authentication failed on production!');
  }

  // Step 2: Delivery Partner Authentication
  console.log('\n[STEP 2] Authenticating Delivery Partner on Live Production...');
  const dpLoginRes = await fetch(`${PROD_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'DP-001', password: 'rider123' })
  });

  const dpSetCookie = dpLoginRes.headers.get('set-cookie');
  const dpCookie = dpSetCookie ? dpSetCookie.split(';')[0] : '';
  const dpData = await dpLoginRes.json();
  console.log(`  -> Delivery Partner Login Status: ${dpLoginRes.status}, User: ${dpData.user?.name || dpData.user?.id}`);

  // Step 3: Select Target Product
  const targetId = 'tropical-fruit-n-almond-cake';
  console.log(`\n[STEP 3] Fetching baseline product details for "${targetId}"...`);
  const initialRes = await fetch(`${PROD_BASE}/api/products/${encodeURIComponent(targetId)}?_t=${Date.now()}`, { cache: 'no-store' });
  if (!initialRes.ok) {
    throw new Error(`Failed to load target product detail: HTTP ${initialRes.status}`);
  }
  const initialProduct = await initialRes.json();
  const originalImage = initialProduct.image;
  const originalPrice = initialProduct.price;
  const originalStock = initialProduct.inStock;

  console.log(`  - Target Product ID: "${initialProduct.id}"`);
  console.log(`  - Product Name: "${initialProduct.name}"`);
  console.log(`  - Original Image: "${originalImage}"`);
  console.log(`  - Original Price: ₹${originalPrice}`);
  console.log(`  - Original InStock: ${originalStock}`);

  // Step 4: Admin Updates Product Image on Live Production
  const newTestImageUrl = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80';
  console.log(`\n[STEP 4] Admin updating image to: "${newTestImageUrl}"...`);

  const updateRes = await fetch(`${PROD_BASE}/api/products/upload-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': adminCookie
    },
    body: JSON.stringify({
      productId: targetId,
      imageUrl: newTestImageUrl
    })
  });

  const updateData = await updateRes.json();
  console.log(`  -> Update HTTP Status: ${updateRes.status}`);
  console.log(`  -> Update Success: ${updateData.success}`);
  console.log(`  -> Returned Canonical Image: "${updateData.imageUrl || updateData.product?.image}"`);

  if (!updateRes.ok || !updateData.success) {
    throw new Error(`Admin photo update failed: ${JSON.stringify(updateData)}`);
  }

  // Step 5: Direct PostgreSQL Verification
  console.log(`\n[STEP 5] Direct PostgreSQL Database Persistence Verification...`);
  const pool = getPool();
  if (pool) {
    const pgRes = await pool.query(
      'SELECT id, name, image, gallery, "updatedAt", updatedat, price, instock FROM products WHERE LOWER(TRIM(id)) = LOWER(TRIM($1))',
      [targetId]
    );
    if (pgRes.rows.length > 0) {
      const row = pgRes.rows[0];
      console.log(`  -> PostgreSQL Row Image: "${row.image}"`);
      console.log(`  -> PostgreSQL Row updatedAt: "${row.updatedAt || row.updatedat}"`);
      console.log(`  -> PostgreSQL Row Price: ₹${row.price}`);
      if (row.image !== newTestImageUrl) {
        throw new Error(`PostgreSQL row image mismatch! Expected "${newTestImageUrl}", got "${row.image}"`);
      }
      console.log(`  -> PostgreSQL Persistence: PASS`);
    } else {
      console.warn('  -> Could not query PostgreSQL row directly from local connection');
    }
  }

  // Step 6: Verify from /api/products catalog endpoint on production
  console.log(`\n[STEP 6] Verifying from live /api/products catalog endpoint...`);
  const catRes = await fetch(`${PROD_BASE}/api/products?_t=${Date.now()}`, { cache: 'no-store' });
  const catProducts = await catRes.json();
  const catProduct = catProducts.find((p: any) => p.id === targetId);
  console.log(`  -> Catalog Image: "${catProduct?.image}"`);
  if (catProduct?.image !== newTestImageUrl) {
    throw new Error(`Catalog image mismatch! Expected "${newTestImageUrl}", got "${catProduct?.image}"`);
  }

  // Step 7: Verify from /api/products/[id] detail endpoint on production
  console.log(`\n[STEP 7] Verifying from live /api/products/${encodeURIComponent(targetId)} endpoint...`);
  const detailRes = await fetch(`${PROD_BASE}/api/products/${encodeURIComponent(targetId)}?_t=${Date.now()}`, { cache: 'no-store' });
  const detailProduct = await detailRes.json();
  console.log(`  -> Detail Image: "${detailProduct?.image}"`);
  if (detailProduct?.image !== newTestImageUrl) {
    throw new Error(`Detail image mismatch! Expected "${newTestImageUrl}", got "${detailProduct?.image}"`);
  }

  // Step 8: Wait 8 seconds to simulate time lapse & background requests
  console.log(`\n[STEP 8] Waiting 8 seconds to verify image does NOT revert over time...`);
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Step 9: Re-verify after time delay (simulating browser refresh / new request)
  console.log(`\n[STEP 9] Re-fetching after 8 seconds (browser refresh simulation)...`);
  const delayedRes = await fetch(`${PROD_BASE}/api/products/${encodeURIComponent(targetId)}?_t=${Date.now()}`, { cache: 'no-store' });
  const delayedProduct = await delayedRes.json();
  console.log(`  -> Image after delay: "${delayedProduct?.image}"`);
  if (delayedProduct?.image !== newTestImageUrl) {
    throw new Error(`CRITICAL: Image reverted after delay! Got "${delayedProduct?.image}"`);
  }
  console.log(`  -> Refresh & Delay Persistence: PASS`);

  // Step 10: Verify Delivery Partner View
  console.log(`\n[STEP 10] Verifying Delivery Partner View...`);
  const dpViewRes = await fetch(`${PROD_BASE}/api/products?_t=${Date.now()}`, {
    headers: dpCookie ? { 'Cookie': dpCookie } : {},
    cache: 'no-store'
  });
  const dpProducts = await dpViewRes.json();
  const dpProduct = dpProducts.find((p: any) => p.id === targetId);
  console.log(`  -> Delivery Partner sees image: "${dpProduct?.image}"`);
  console.log(`  -> Delivery Partner sees stock: ${dpProduct?.inStock ? 'In Stock' : 'Out of Stock'}`);
  if (dpProduct?.image !== newTestImageUrl) {
    throw new Error(`Delivery partner image mismatch! Got: ${dpProduct?.image}`);
  }
  console.log(`  -> Delivery Partner View: PASS`);

  // Step 11: Restore Original Image as Admin
  console.log(`\n[STEP 11] Restoring Original Image ("${originalImage}")...`);
  const restoreRes = await fetch(`${PROD_BASE}/api/products/upload-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': adminCookie
    },
    body: JSON.stringify({
      productId: targetId,
      imageUrl: originalImage
    })
  });
  const restoreData = await restoreRes.json();
  console.log(`  -> Restore Status: ${restoreRes.status}, Success: ${restoreData.success}`);

  // Final verification of rollback
  const finalRes = await fetch(`${PROD_BASE}/api/products/${encodeURIComponent(targetId)}?_t=${Date.now()}`, { cache: 'no-store' });
  const finalProduct = await finalRes.json();
  console.log(`  -> Final Product Image in DB: "${finalProduct?.image}"`);
  if (finalProduct?.image !== originalImage) {
    throw new Error(`Rollback verification failed! Expected "${originalImage}", got "${finalProduct?.image}"`);
  }
  console.log(`  -> Rollback Verification: PASS`);

  console.log('\n===============================================================');
  console.log('ALL LIVE PRODUCTION CHECKS COMPLETED AND PASSED!');
  console.log('===============================================================');
}

runLiveAudit()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\nLIVE PRODUCTION ERROR:', err);
    process.exit(1);
  });
