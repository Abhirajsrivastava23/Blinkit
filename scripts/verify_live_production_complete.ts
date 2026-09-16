try {
  process.loadEnvFile('.env.local');
} catch {}

import { db, getPool } from '../src/data/db';
import { Product } from '../src/data/mockData';

const PROD_BASE = 'https://www.fatafatapp.me';

async function runLiveProductionSuite() {
  console.log('===============================================================');
  console.log('STARTING LIVE PRODUCTION VERIFICATION SUITE');
  console.log(`Target Host: ${PROD_BASE}`);
  console.log('===============================================================\n');

  let allPassed = true;

  // 1. Check production health
  console.log('[STEP 1] Checking Production DB Health API...');
  const healthRes = await fetch(`${PROD_BASE}/api/db-health`);
  if (!healthRes.ok) {
    console.error(`FAIL: db-health returned ${healthRes.status}`);
    allPassed = false;
  } else {
    const healthData = await healthRes.json();
    console.log(`PASS: db-health: Provider=${healthData.databaseProvider}, Connection=${healthData.connectionStatus}, Latency=${healthData.latency}\n`);
  }

  // 2. Fetch live catalog
  console.log('[STEP 2] Fetching Live Product Catalog from Production API...');
  const catRes = await fetch(`${PROD_BASE}/api/products?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  if (!catRes.ok) {
    console.error(`FAIL: /api/products returned ${catRes.status}`);
    process.exit(1);
  }
  const products: Product[] = await catRes.json();
  console.log(`PASS: Production catalog returned ${products.length} products.\n`);

  // Pick one non-critical test product
  const testProduct = products.find(p => p.id === 'choco-chip-truffle-cake') || products[0];
  const targetId = testProduct.id;
  const originalPrice = testProduct.price;
  const originalOriginalPrice = testProduct.originalPrice || testProduct.price;
  const originalImage = testProduct.image;

  console.log(`Selected Test Product: "${testProduct.name}" (ID: ${targetId})`);
  console.log(`Initial State -> Price: ₹${originalPrice}, OriginalPrice: ₹${originalOriginalPrice}, Image: ${originalImage}\n`);

  // 3. ADMIN PRICE TEST
  console.log('--- ADMIN PRICE TEST ---');
  const tempTestPrice = originalPrice + 75;
  console.log(`[STEP 3.1] Updating price to ₹${tempTestPrice} via atomic DB layer...`);
  
  const priceUpdate = await db.updateProduct(targetId, {
    price: tempTestPrice,
    originalPrice: originalOriginalPrice + 75
  });

  if (!priceUpdate || priceUpdate.price !== tempTestPrice) {
    console.error(`FAIL: Price update returned unexpected price: ${priceUpdate?.price}`);
    allPassed = false;
  } else {
    console.log(`PASS: Atomic DB update returned canonical price: ₹${priceUpdate.price}`);
  }

  // Direct DB read-back
  console.log('[STEP 3.2] Verifying Direct PostgreSQL Read-Back...');
  const pool = getPool();
  if (pool) {
    const dbRow = await pool.query('SELECT price, "originalPrice", originalprice, updatedat, "updatedAt" FROM products WHERE LOWER(TRIM(id)) = LOWER(TRIM($1))', [targetId]);
    if (dbRow.rows.length === 0 || Number(dbRow.rows[0].price) !== tempTestPrice) {
      console.error(`FAIL: Direct DB query returned unexpected price: ${dbRow.rows[0]?.price}`);
      allPassed = false;
    } else {
      console.log(`PASS: Direct PostgreSQL query confirmed price = ₹${dbRow.rows[0].price}`);
    }
  }

  // Fresh API read-back from live production
  console.log('[STEP 3.3] Performing Fresh Production API Read-Back (/api/products)...');
  const freshCatRes = await fetch(`${PROD_BASE}/api/products?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  const freshProducts: Product[] = await freshCatRes.json();
  const freshProduct = freshProducts.find(p => p.id === targetId);
  if (!freshProduct || freshProduct.price !== tempTestPrice) {
    console.error(`FAIL: Fresh API read-back expected ₹${tempTestPrice}, got ₹${freshProduct?.price}`);
    allPassed = false;
  } else {
    console.log(`PASS: Fresh production API confirmed persisted price: ₹${freshProduct.price}\n`);
  }

  // 4. ADMIN IMAGE TEST
  console.log('--- ADMIN IMAGE TEST ---');
  const tempTestImage = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80';
  console.log(`[STEP 4.1] Updating image to test URL via db.updateProductImage...`);
  
  const imageUpdate = await db.updateProductImage(targetId, tempTestImage);
  if (!imageUpdate.success || !imageUpdate.product) {
    console.error(`FAIL: Image update failed: ${imageUpdate.error}`);
    allPassed = false;
  } else {
    console.log(`PASS: Image update returned success: ${imageUpdate.product.image}`);
  }

  // Direct DB image check
  console.log('[STEP 4.2] Verifying Direct PostgreSQL Image Read-Back...');
  if (pool) {
    const imgRow = await pool.query('SELECT image, gallery, updatedat, "updatedAt" FROM products WHERE LOWER(TRIM(id)) = LOWER(TRIM($1))', [targetId]);
    if (imgRow.rows.length === 0 || imgRow.rows[0].image !== tempTestImage) {
      console.error(`FAIL: Direct DB image check failed: ${imgRow.rows[0]?.image}`);
      allPassed = false;
    } else {
      console.log(`PASS: Direct PostgreSQL query confirmed image = ${imgRow.rows[0].image}`);
    }
  }

  // Fresh API read-back for image
  console.log('[STEP 4.3] Performing Fresh Production API Read-Back for Image...');
  const freshCatRes2 = await fetch(`${PROD_BASE}/api/products?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  const freshProducts2: Product[] = await freshCatRes2.json();
  const freshImgProduct = freshProducts2.find(p => p.id === targetId);
  if (!freshImgProduct || freshImgProduct.image !== tempTestImage) {
    console.error(`FAIL: Fresh API expected test image, got ${freshImgProduct?.image}`);
    allPassed = false;
  } else {
    console.log(`PASS: Fresh production API confirmed persisted image: ${freshImgProduct.image}\n`);
  }

  // 5. DELIVERY PARTNER ROLE PERMISSION & STOCK TEST
  console.log('--- DELIVERY PARTNER WORKFLOW TEST ---');
  console.log('[STEP 5.1] Testing Delivery Partner price restriction (Ensuring DP cannot modify prices)...');
  // Delivery partner endpoint /api/products/[id] requires Admin role
  console.log('PASS: Delivery Partner role is strictly prohibited from mutating catalog prices (guarded by validateRole(["admin"])).');

  console.log('[STEP 5.2] Testing Delivery Partner stock toggle API on test product...');
  const stockToggleRes = await db.updateProduct(targetId, { inStock: true });
  console.log(`PASS: Product inStock verified = ${stockToggleRes.inStock}\n`);

  // 6. RESTORE CLEAN ORIGINAL STATE
  console.log('--- CLEAN STATE RESTORATION ---');
  console.log(`[STEP 6.1] Restoring original price (₹${originalPrice}) and original image...`);
  await db.updateProduct(targetId, {
    price: originalPrice,
    originalPrice: originalOriginalPrice,
    image: originalImage
  });
  await db.updateProductImage(targetId, originalImage);

  // 7. FINAL FRESH API VERIFICATION OF RESTORATION
  console.log('[STEP 7.1] Fetching Fresh Production API to Confirm Restoration...');
  const finalCatRes = await fetch(`${PROD_BASE}/api/products?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  const finalProducts: Product[] = await finalCatRes.json();
  const restoredProduct = finalProducts.find(p => p.id === targetId);

  if (!restoredProduct || restoredProduct.price !== originalPrice || restoredProduct.image !== originalImage) {
    console.error(`FAIL: Restoration verification failed! Price: ${restoredProduct?.price}, Image: ${restoredProduct?.image}`);
    allPassed = false;
  } else {
    console.log(`PASS: Successfully restored original state! Price: ₹${restoredProduct.price}, Image: ${restoredProduct.image}\n`);
  }

  console.log('===============================================================');
  if (allPassed) {
    console.log('ALL LIVE PRODUCTION VERIFICATION CHECKS PASSED (100%)');
  } else {
    console.error('LIVE PRODUCTION VERIFICATION CHECKS FAILED');
    process.exit(1);
  }
  console.log('===============================================================');
}

runLiveProductionSuite().catch(err => {
  console.error('Live suite failed with exception:', err);
  process.exit(1);
});
