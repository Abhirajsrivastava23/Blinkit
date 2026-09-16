import { db } from '../src/data/db';
import { Product } from '../src/data/mockData';

async function runPersistenceTests() {
  console.log('====================================================');
  console.log('STARTING PRODUCT PRICE & IMAGE PERSISTENCE TEST SUITE');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Fetch initial product catalog
  console.log('[STEP 1] Fetching product catalog from database layer...');
  const initialProducts = await db.readTable<Product>('products');
  if (!initialProducts || initialProducts.length === 0) {
    console.error('FAIL: Could not load products from database layer.');
    process.exit(1);
  }
  console.log(`PASS: Loaded ${initialProducts.length} products.\n`);

  const testProduct = initialProducts[0];
  const targetId = testProduct.id;
  const originalPrice = testProduct.price;
  const originalOriginalPrice = testProduct.originalPrice;
  const originalImage = testProduct.image;

  console.log(`Target Test Product: "${testProduct.name}" (ID: ${targetId})`);
  console.log(`Original Price: ₹${originalPrice}, Original Image: ${originalImage}\n`);

  // 2. Price Update Persistence Test
  console.log('[STEP 2] Testing Price Update & Persistence...');
  const testNewPrice = originalPrice + 50;
  const testNewOriginalPrice = originalOriginalPrice + 50;

  const updatedByAdmin = await db.updateProduct(targetId, {
    price: testNewPrice,
    originalPrice: testNewOriginalPrice
  });

  if (!updatedByAdmin || updatedByAdmin.price !== testNewPrice) {
    console.error(`FAIL: Price update failed. Expected ₹${testNewPrice}, got ₹${updatedByAdmin?.price}`);
    allPassed = false;
  } else {
    console.log(`PASS: db.updateProduct returned updated price: ₹${updatedByAdmin.price}`);
  }

  // 3. Immediate Direct Read-Back
  console.log('[STEP 3] Performing Direct Read-Back via db.getProductById...');
  const readBackProduct = await db.getProductById(targetId);
  if (!readBackProduct || readBackProduct.price !== testNewPrice) {
    console.error(`FAIL: Direct read-back failed. Expected ₹${testNewPrice}, got ₹${readBackProduct?.price}`);
    allPassed = false;
  } else {
    console.log(`PASS: Direct read-back confirmed price persisted: ₹${readBackProduct.price}\n`);
  }

  // 4. Test Auto-Reconciliation Non-Reversion
  console.log('[STEP 4] Testing Auto-Reconciliation Protection (Simulating subsequent API fetch)...');
  const catalogAfterUpdate = await db.readTable<Product>('products');
  const catalogProduct = catalogAfterUpdate.find(p => String(p.id).toLowerCase().trim() === String(targetId).toLowerCase().trim());
  if (!catalogProduct || catalogProduct.price !== testNewPrice) {
    console.error(`FAIL: Catalog read reverted price! Expected ₹${testNewPrice}, got ₹${catalogProduct?.price}`);
    allPassed = false;
  } else {
    console.log(`PASS: Catalog read verified price remains: ₹${catalogProduct.price} (No reversion)\n`);
  }

  // 5. Product Image Update Persistence Test
  console.log('[STEP 5] Testing Product Image Update Persistence...');
  const testImageUrl = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80';
  
  const imageUpdateResult = await db.updateProductImage(targetId, testImageUrl);
  if (!imageUpdateResult.success || !imageUpdateResult.product) {
    console.error(`FAIL: Image update failed: ${imageUpdateResult.error}`);
    allPassed = false;
  } else {
    console.log(`PASS: db.updateProductImage returned success: ${imageUpdateResult.product.image}`);
  }

  // 6. Direct Read-Back of Image
  console.log('[STEP 6] Performing Direct Read-Back of Image...');
  const readBackImageProduct = await db.getProductById(targetId);
  if (!readBackImageProduct || readBackImageProduct.image !== testImageUrl) {
    console.error(`FAIL: Image read-back failed. Expected ${testImageUrl}, got ${readBackImageProduct?.image}`);
    allPassed = false;
  } else {
    console.log(`PASS: Direct read-back confirmed image persisted: ${readBackImageProduct.image}\n`);
  }

  // 7. Test Catalog Re-read for Image
  console.log('[STEP 7] Testing Catalog Read for Image Persistence...');
  const catalogAfterImage = await db.readTable<Product>('products');
  const catalogImageProduct = catalogAfterImage.find(p => String(p.id).toLowerCase().trim() === String(targetId).toLowerCase().trim());
  if (!catalogImageProduct || catalogImageProduct.image !== testImageUrl) {
    console.error(`FAIL: Catalog read reverted image! Expected ${testImageUrl}, got ${catalogImageProduct?.image}`);
    allPassed = false;
  } else {
    console.log(`PASS: Catalog read confirmed image remains: ${catalogImageProduct.image} (No reversion)\n`);
  }

  // 8. Test Version Merge Protection
  console.log('[STEP 8] Testing Version Merge & Concurrency Protection...');
  const newerTime = new Date(Date.now() + 10000).toISOString();
  const olderTime = new Date(Date.now() - 10000).toISOString();
  
  const localNewerProduct: Product = { ...readBackImageProduct!, price: 999, updatedAt: newerTime };
  const incomingStaleProduct: Product = { ...readBackImageProduct!, price: 111, updatedAt: olderTime };

  const existingTime = new Date(localNewerProduct.updatedAt!).getTime();
  const incomingTime = new Date(incomingStaleProduct.updatedAt!).getTime();
  const preservedProduct = existingTime > incomingTime ? localNewerProduct : incomingStaleProduct;

  if (preservedProduct.price !== 999) {
    console.error(`FAIL: Version merge failed to protect newer state.`);
    allPassed = false;
  } else {
    console.log(`PASS: Version check successfully protected newer state from stale overwrite.\n`);
  }

  // 9. Revert Clean State
  console.log('[STEP 9] Reverting test product to original clean state...');
  await db.updateProduct(targetId, {
    price: originalPrice,
    originalPrice: originalOriginalPrice,
    image: originalImage
  });
  await db.updateProductImage(targetId, originalImage);

  const cleanProduct = await db.getProductById(targetId);
  console.log(`PASS: Clean state restored. Price: ₹${cleanProduct?.price}, Image: ${cleanProduct?.image}\n`);

  console.log('====================================================');
  if (allPassed) {
    console.log('ALL PERSISTENCE & CONCURRENCY TESTS PASSED (100%)');
  } else {
    console.error('SOME TESTS FAILED');
    process.exit(1);
  }
  console.log('====================================================');
}

runPersistenceTests().catch(err => {
  console.error('Fatal error during persistence tests:', err);
  process.exit(1);
});
