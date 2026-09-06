async function verifyProduction() {
  console.log('=== VERIFYING PRODUCTION LIVE CATALOG & DB HEALTH ===\n');

  const prodBase = 'https://www.fatafatapp.me';

  // 1. Check DB Health
  console.log('[STEP 1] Checking DB Health on production...');
  try {
    const healthRes = await fetch(`${prodBase}/api/db-health?_t=${Date.now()}`, { cache: 'no-store' });
    const healthData = await healthRes.json();
    console.log('DB Health Response:', healthData);
    if (healthData.postgresConnected) {
      console.log(`✓ PostgreSQL Connected! Latency: ${healthData.latencyMs}ms, Products Count: ${healthData.productCount}`);
    } else {
      console.log('ℹ PostgreSQL status:', healthData.message);
    }
  } catch (err) {
    console.error('DB Health check failed:', err);
  }

  // 2. Fetch Catalog Products
  console.log('\n[STEP 2] Fetching live catalog from /api/products...');
  try {
    const prodRes = await fetch(`${prodBase}/api/products?_t=${Date.now()}`, { cache: 'no-store' });
    const products = await prodRes.json();
    console.log(`✓ Fetched ${products.length} products from /api/products`);
    
    // Sample a few products
    const sample = products.slice(0, 3);
    for (const p of sample) {
      console.log(`- Product: "${p.name}", Price: ₹${p.price}, MRP: ₹${p.originalPrice || p.price}, Stock: ${p.inStock ? 'In Stock' : 'Out of Stock'}`);
    }
  } catch (err) {
    console.error('Failed to fetch /api/products:', err);
  }

  // 3. Check specific product detail
  console.log('\n[STEP 3] Fetching specific product detail for "tropical-fruit-n-almond-cake"...');
  try {
    const detailRes = await fetch(`${prodBase}/api/products/tropical-fruit-n-almond-cake?_t=${Date.now()}`, { cache: 'no-store' });
    if (detailRes.ok) {
      const detail = await detailRes.json();
      console.log('✓ Product detail loaded successfully:', {
        id: detail.id,
        name: detail.name,
        price: detail.price,
        originalPrice: detail.originalPrice,
        inStock: detail.inStock
      });
    } else {
      console.error('Failed to load product detail, status:', detailRes.status);
    }
  } catch (err) {
    console.error('Detail fetch error:', err);
  }

  console.log('\n=== LIVE PRODUCTION CHECK COMPLETE ===');
}

verifyProduction().catch(console.error);
