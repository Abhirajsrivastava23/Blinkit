const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Read secret from .env / .env.local
let envSecret = process.env.RAZORPAY_KEY_SECRET;
let envWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!envSecret || !envWebhookSecret) {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    const secretMatch = envContent.match(/RAZORPAY_KEY_SECRET=["']?([^"'\r\n]+)/);
    const webhookMatch = envContent.match(/RAZORPAY_WEBHOOK_SECRET=["']?([^"'\r\n]+)/);
    if (secretMatch && !envSecret) envSecret = secretMatch[1];
    if (webhookMatch && !envWebhookSecret) envWebhookSecret = webhookMatch[1];
  } catch {}
}

const KEY_SECRET = envSecret || 'Exu52JSFtzFtar9AwgZEE57H';
const WEBHOOK_SECRET = envWebhookSecret || 'fatafat_rzp_webhook_secret_789';

async function request(reqPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const postData = options.body ? JSON.stringify(options.body) : null;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('========================================================================');
  console.log('🧪 RAZORPAY ₹2 TEST PRODUCT & ORDER END-TO-END FLOW VERIFICATION');
  console.log('========================================================================');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${extra}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra}`);
      failed++;
    }
  }

  // 1. Verify ₹2 Test Product in Catalog
  console.log('\n--- 1. Catalog Lookup for ₹2 Test Product ---');
  const prodRes = await request('/api/products/rzp-test-product-2');
  assert('Product /api/products/rzp-test-product-2 returns HTTP 200', prodRes.status === 200);
  assert('Product name is "Razorpay ₹2 Test Product"', prodRes.data?.name === 'Razorpay ₹2 Test Product');
  assert('Product price is exactly ₹2.00', Number(prodRes.data?.price) === 2);
  assert('Product inStock is true', prodRes.data?.inStock === true);

  // 2. Customer Authentication
  console.log('\n--- 2. Customer Authentication & Session ---');
  const loginRes = await request('/api/auth/customer-login', {
    method: 'POST',
    body: { email: 'live_tester_rzp2@fatafat.com', name: 'Razorpay Live Tester' }
  });
  assert('Customer Login returns HTTP 200', loginRes.status === 200);
  const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';

  // 3. Create ₹2 Order
  console.log('\n--- 3. Order Placement for ₹2 Test Product ---');
  const testOrderId = 'FT' + Math.floor(100000 + Math.random() * 900000);
  const orderRes = await request('/api/orders', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: {
      id: testOrderId,
      items: [{
        productId: 'rzp-test-product-2',
        name: 'Razorpay ₹2 Test Product',
        price: 2,
        quantity: 1
      }],
      address: {
        name: 'Razorpay Live Tester',
        mobile: '9876543210',
        house: '12',
        street: 'MG Road',
        area: 'Nawabganj',
        city: 'Unnao',
        pincode: '209859'
      },
      deliveryOption: 'ASAP',
      paymentMethod: 'Razorpay'
    }
  });

  const orderData = orderRes.data?.order || orderRes.data;
  assert('Order created with HTTP 200', orderRes.status === 200);
  assert('Order ID generated', Boolean(orderData?.id));
  assert('Order total is exactly ₹2.00', Number(orderData?.total) === 2);
  assert('Order initial status is "Pending"', orderData?.status === 'Pending');
  assert('Order initial paymentStatus is "PENDING"', orderData?.paymentStatus === 'PENDING');

  const cleanOrderId = String(orderData?.id || testOrderId).replace(/^#+/, '').trim();

  // 4. Create Razorpay Gateway Order (200 Paise = ₹2.00)
  console.log('\n--- 4. Razorpay Gateway Order Creation (/api/payments/razorpay/create-order) ---');
  const rzpOrderRes = await request('/api/payments/razorpay/create-order', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: { orderId: cleanOrderId }
  });

  assert('Razorpay create-order returns HTTP 200', rzpOrderRes.status === 200);
  assert('Razorpay Order ID generated', Boolean(rzpOrderRes.data?.orderId));
  assert('Razorpay amount in paise is exactly 200 (>= 100 paise minimum)', rzpOrderRes.data?.amount === 200);
  assert('Currency is INR', rzpOrderRes.data?.currency === 'INR');

  const rzpOrderId = rzpOrderRes.data?.orderId;
  const paymentId = 'pay_live_test_' + Date.now();

  // 5. Fraudulent Signature Rejection Check
  console.log('\n--- 5. Security Check: Invalid Signature Rejection ---');
  const invalidSigRes = await request('/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: {
      orderId: cleanOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: 'fake_tampered_signature_xyz'
    }
  });
  assert('Rejects invalid signature with HTTP 400', invalidSigRes.status === 400);

  // 6. Valid HMAC-SHA256 Signature Verification
  console.log('\n--- 6. Server-Side HMAC-SHA256 Signature Verification ---');
  const validSignature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${rzpOrderId}|${paymentId}`)
    .digest('hex');

  const verifyRes = await request('/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: {
      orderId: cleanOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature
    }
  });

  assert('Signature verification returns HTTP 200 OK', verifyRes.status === 200);
  assert('Order paymentStatus updated to PAID', verifyRes.data?.paymentStatus === 'PAID');
  assert('Order status updated to Confirmed', verifyRes.data?.orderStatus === 'Confirmed');

  // 7. Idempotency Check on Repeated Verification
  console.log('\n--- 7. Idempotency Verification ---');
  const repeatVerifyRes = await request('/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: {
      orderId: cleanOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature
    }
  });
  assert('Repeated verification returns HTTP 200 idempotently', repeatVerifyRes.status === 200);

  // 8. Verify Customer Orders View
  console.log('\n--- 8. Customer Order Record Verification ---');
  const customerOrdersRes = await request('/api/orders', {
    method: 'GET',
    headers: { Cookie: cookie }
  });
  const myOrders = Array.isArray(customerOrdersRes.data) ? customerOrdersRes.data : [];
  const foundOrder = myOrders.find((o) => String(o.id).replace(/^#+/, '') === cleanOrderId);
  assert('Order visible in Customer My Orders', Boolean(foundOrder));
  assert('Customer view reflects status "Confirmed" and paymentStatus "PAID"', foundOrder?.status === 'Confirmed' && foundOrder?.paymentStatus === 'PAID');
  assert('Customer view reflects total ₹2.00', Number(foundOrder?.total) === 2);

  // 9. Admin Login & Payment Data Verification
  console.log('\n--- 9. Admin Live Orders & Payment Data Verification ---');
  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { emailOrId: 'admin@fatafat.com', password: 'admin123' }
  });
  const adminCookie = adminLoginRes.headers['set-cookie'] ? adminLoginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';

  const adminPaymentsRes = await request('/api/payments', {
    method: 'GET',
    headers: { Cookie: adminCookie }
  });
  const allTx = Array.isArray(adminPaymentsRes.data?.payments) ? adminPaymentsRes.data.payments : (Array.isArray(adminPaymentsRes.data) ? adminPaymentsRes.data : []);
  const matchingTx = allTx.find((tx) => String(tx.orderId).replace(/^#+/, '') === cleanOrderId);
  assert('Payment transaction recorded in Admin Payments list', Boolean(matchingTx));
  assert('Transaction provider is RAZORPAY', matchingTx?.provider === 'RAZORPAY');
  assert('Transaction status is PAID', matchingTx?.status === 'PAID');
  assert('Transaction amount is ₹2.00', Number(matchingTx?.amount) === 2);

  console.log('\n========================================================================');
  console.log(`₹2 FLOW TEST SUMMARY: ${passed + failed} CHECKS | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
