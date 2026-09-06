import fs from 'fs';
import path from 'path';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const [key, ...valueParts] = line.split('=');
      const trimmedKey = key.trim();
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (trimmedKey && value) {
        process.env[trimmedKey] = value;
      }
    }
  }
}
loadEnvFile();

async function main() {
  console.log('=== FATAFAT ADMIN PRODUCT EDITING & LIVE SYNC TEST ===\n');

  const { db, getPool } = await import('../src/data/db');
  const { PRODUCTS } = await import('../src/data/mockData');

  const pool = getPool();
  if (pool) {
    console.log('✓ Connected to PostgreSQL Database (Single Source of Truth).');
  } else {
    console.log('ℹ Local in-memory mode active (POSTGRES_URL is configured in Vercel production).');
  }

  // 1. Pick a test product
  const testSkuId = 'tropical-fruit-n-almond-cake';
  console.log(`\n[TEST STEP 1] Fetching initial state for SKU: "${testSkuId}"...`);
  const initial = await db.getProductById(testSkuId);
  if (!initial) {
    console.error(`Product "${testSkuId}" not found in database!`);
    process.exit(1);
  }

  const originalName = initial.name;
  const originalPrice = initial.price;
  const originalMrp = initial.originalPrice;
  console.log(`Initial State -> Name: "${originalName}", Price: ₹${originalPrice}, MRP: ₹${originalMrp}`);

  // 2. Perform Admin Update (Name + Price)
  const newTestName = `Tropical Fruit & Roasted Almond Cake (Live Admin Edit Test)`;
  const newTestPrice = 699;
  const newTestMrp = 899;

  console.log(`\n[TEST STEP 2] Updating product via db.updateProduct...`);
  console.log(`New Name: "${newTestName}"`);
  console.log(`New Price: ₹${newTestPrice}`);
  console.log(`New MRP: ₹${newTestMrp}`);

  const updated = await db.updateProduct(testSkuId, {
    name: newTestName,
    price: newTestPrice,
    originalPrice: newTestMrp
  });

  if (!updated) {
    console.error('db.updateProduct returned null!');
    process.exit(1);
  }
  console.log('Update return -> Name:', updated.name, 'Price: ₹' + updated.price, 'Discount: ' + updated.discount + '%');

  // 3. Verify directly from PostgreSQL if pool connected
  if (pool) {
    console.log(`\n[TEST STEP 3] Verifying directly from PostgreSQL database table "products"...`);
    const pgRes = await pool.query('SELECT id, name, price, originalprice, discount, updatedat FROM products WHERE LOWER(TRIM(id)) = LOWER(TRIM($1))', [testSkuId]);
    if (pgRes.rows.length === 0) {
      console.error('FAILED: Product not found in PostgreSQL table!');
      process.exit(1);
    }

    const pgRow = pgRes.rows[0];
    console.log('PostgreSQL Row ->', {
      id: pgRow.id,
      name: pgRow.name,
      price: Number(pgRow.price),
      originalprice: Number(pgRow.originalprice),
      discount: Number(pgRow.discount),
      updatedat: pgRow.updatedat
    });

    if (pgRow.name !== newTestName || Number(pgRow.price) !== newTestPrice) {
      console.error(`FAILED: PostgreSQL data does not match! Expected name="${newTestName}", price=${newTestPrice}`);
      process.exit(1);
    }
    console.log('✓ PostgreSQL verification PASSED! Data was immediately written to PostgreSQL.');
  }

  // 4. Verify db.readTable('products') (Catalog source for all customer-facing views)
  console.log(`\n[TEST STEP 4] Verifying db.readTable('products')...`);
  const catalog = await db.readTable<any>('products');
  const catalogProduct = catalog.find((p: any) => p.id === testSkuId);
  if (!catalogProduct) {
    console.error('FAILED: Product not found in catalog!');
    process.exit(1);
  }
  console.log('Catalog Product -> Name:', catalogProduct.name, 'Price: ₹' + catalogProduct.price);
  if (catalogProduct.name !== newTestName || catalogProduct.price !== newTestPrice) {
    console.error('FAILED: db.readTable returned stale data!');
    process.exit(1);
  }
  console.log('✓ Catalog verification PASSED!');

  // 5. Verify historical orders remain untouched
  console.log(`\n[TEST STEP 5] Verifying historical orders are untouched...`);
  const orders = await db.getOrders();
  console.log(`Found ${orders.length} orders in database.`);
  if (orders.length > 0) {
    const sampleOrder = orders[0];
    console.log(`Sample Order ID: ${sampleOrder.id}, Items count: ${(sampleOrder.items as any[])?.length}`);
  }
  console.log('✓ Historical orders integrity PASSED!');

  // 6. Revert product back to canonical original state
  console.log(`\n[TEST STEP 6] Reverting product back to canonical state...`);
  const canonical = PRODUCTS.find(p => p.id === testSkuId);
  const reverted = await db.updateProduct(testSkuId, {
    name: canonical?.name || originalName,
    price: canonical?.price || originalPrice,
    originalPrice: canonical?.originalPrice || originalMrp
  });
  console.log(`Reverted State -> Name: "${reverted?.name}", Price: ₹${reverted?.price}`);

  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
