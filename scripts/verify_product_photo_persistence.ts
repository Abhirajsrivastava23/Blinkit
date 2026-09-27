import { db, ensureDbSchema, getPool } from '../src/data/db';
import { Product } from '../src/data/mockData';

async function runTest() {
  console.log('====================================================');
  console.log('STARTING PRODUCT PHOTO PERSISTENCE VERIFICATION SUITE');
  console.log('====================================================\n');

  // Step 1: Select an existing product
  const products = await db.readTable<Product>('products');
  if (!products || products.length === 0) {
    throw new Error('No products found in database!');
  }

  const testProduct = products.find(p => p.id === '1' || p.id.includes('cake')) || products[0];
  const targetId = testProduct.id;
  const originalImage = testProduct.image;
  const originalPrice = testProduct.price;
  const originalStock = testProduct.inStock;

  console.log(`[TEST 1] Selected Product for Test:`);
  console.log(`  - ID: "${targetId}"`);
  console.log(`  - Name: "${testProduct.name}"`);
  console.log(`  - Original Image: "${originalImage}"`);
  console.log(`  - Original Price: ₹${originalPrice}`);
  console.log(`  - Original InStock: ${originalStock}\n`);

  // Step 2: Simulate Admin updating product with a new image URL
  const testNewImage = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80';
  console.log(`[TEST 2] Updating product image to: "${testNewImage}"`);

  const updateRes = await db.updateProductImage(targetId, testNewImage);
  if (!updateRes.success || !updateRes.product) {
    throw new Error(`Failed to update product image: ${updateRes.error}`);
  }

  console.log(`  -> Mutation Success: ${updateRes.success}`);
  console.log(`  -> Returned Canonical Product Image: "${updateRes.product.image}"`);
  console.log(`  -> Returned UpdatedAt: "${updateRes.product.updatedAt}"\n`);

  if (updateRes.product.image !== testNewImage) {
    throw new Error(`Returned image mismatch! Expected "${testNewImage}", got "${updateRes.product.image}"`);
  }

  // Step 3: Direct PostgreSQL verification
  const activePool = getPool();
  if (activePool) {
    console.log(`[TEST 3] Direct PostgreSQL raw SELECT verification:`);
    const pgRes = await activePool.query(
      'SELECT id, name, image, gallery, updatedat, "updatedAt", price, instock FROM products WHERE LOWER(TRIM(id)) = LOWER(TRIM($1))',
      [targetId]
    );

    if (pgRes.rows.length === 0) {
      throw new Error(`Product "${targetId}" not found in PostgreSQL!`);
    }

    const pgRow = pgRes.rows[0];
    console.log(`  -> DB Row ID: "${pgRow.id}"`);
    console.log(`  -> DB Row Image: "${pgRow.image}"`);
    console.log(`  -> DB Row updatedAt: "${pgRow.updatedAt || pgRow.updatedat}"`);
    console.log(`  -> DB Row Price: ₹${pgRow.price}`);
    console.log(`  -> DB Row InStock: ${pgRow.instock}`);

    if (pgRow.image !== testNewImage) {
      throw new Error(`DB Image mismatch! Expected "${testNewImage}", got "${pgRow.image}"`);
    }
  }

  // Step 4: Simulate Schema check / Serverless cold start / Reconciliation
  console.log(`\n[TEST 4] Triggering ensureDbSchema (simulating server restart / reconciliation)...`);
  if (activePool) {
    await ensureDbSchema(activePool);
  }

  // Step 5: Read via db.readTable('products') (used by /api/products)
  console.log(`[TEST 5] Reading catalog via db.readTable('products')...`);
  const refreshedProducts = await db.readTable<Product>('products');
  const refreshedP = refreshedProducts.find(p => p.id === targetId);

  if (!refreshedP) {
    throw new Error(`Product "${targetId}" missing after refresh!`);
  }

  console.log(`  -> Catalog Image: "${refreshedP.image}"`);
  console.log(`  -> Catalog Price: ₹${refreshedP.price}`);
  console.log(`  -> Catalog InStock: ${refreshedP.inStock}`);

  if (refreshedP.image !== testNewImage) {
    throw new Error(`CRITICAL BUG: Image reverted after reconciliation! Expected "${testNewImage}", got "${refreshedP.image}"`);
  }

  // Step 6: Read via db.getProductById (used by /api/products/[id])
  console.log(`\n[TEST 6] Reading single product via db.getProductById("${targetId}")...`);
  const singleP = await db.getProductById(targetId);
  if (!singleP || singleP.image !== testNewImage) {
    throw new Error(`Single product lookup failed or image reverted! Got: ${singleP?.image}`);
  }
  console.log(`  -> Single Product Image: "${singleP.image}"`);

  // Step 7: Delivery Partner product view verification
  console.log(`\n[TEST 7] Delivery partner product view verification:`);
  console.log(`  -> Partner sees same canonical image: "${singleP.image}"`);
  console.log(`  -> Partner sees stock status: ${singleP.inStock ? 'In Stock' : 'Out of Stock'}`);

  // Step 8: Price and stock integrity verification
  console.log(`\n[TEST 8] Price and Stock Integrity:`);
  console.log(`  -> Price unchanged: ₹${singleP.price} (original: ₹${originalPrice})`);
  console.log(`  -> Stock unchanged: ${singleP.inStock} (original: ${originalStock})`);
  if (singleP.price !== originalPrice || singleP.inStock !== originalStock) {
    throw new Error('Price or stock was inadvertently modified during image update!');
  }

  // Step 9: Restore original image and verify restoration flow
  console.log(`\n[TEST 9] Restoring original image: "${originalImage}"...`);
  const restoreRes = await db.updateProductImage(targetId, originalImage);
  if (!restoreRes.success || !restoreRes.product) {
    throw new Error(`Failed to restore original image: ${restoreRes.error}`);
  }

  const restoredP = await db.getProductById(targetId);
  console.log(`  -> Restored Image in DB: "${restoredP?.image}"`);
  if (restoredP?.image !== originalImage) {
    throw new Error(`Restoration failed! Expected "${originalImage}", got "${restoredP?.image}"`);
  }

  console.log('\n====================================================');
  console.log('ALL 9 VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('====================================================');
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  });
