const { db } = require('../src/data/db');

async function ensureTestProduct() {
  const testProd = {
    id: 'rzp-test-product-2',
    name: 'Razorpay ₹2 Test Product',
    category: 'celebrations',
    subCategory: 'Test Gateway',
    price: 2,
    originalPrice: 2,
    discount: 0,
    rating: 5.0,
    reviewCount: 1,
    image: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '10-15 mins',
    egglessAvailable: false,
    isEgglessDefault: false,
    inStock: true,
    description: 'TEMPORARY TEST PRODUCT: Used for verifying live Razorpay Standard Checkout in production. Exact charge: ₹2.00.',
    occasions: ['Testing']
  };

  try {
    const existing = await db.getProductById('rzp-test-product-2');
    if (!existing) {
      console.log('Creating test product in DB...');
      await db.createProduct(testProd);
      console.log('Test product created in DB.');
    } else {
      console.log('Test product already exists in DB.');
    }
  } catch (err) {
    console.warn('Could not upsert via DB helper (JSON fallback will serve it):', err.message);
  }
}

ensureTestProduct().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
