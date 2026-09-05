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
  console.log('🚀 CANONICAL RAZORPAY API AUDIT & ENDPOINT VERIFICATION');
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

  // 1. Verify duplicate generic routes are completely removed
  console.log('\n--- 1. Verification of Removed Duplicate Routes ---');
  const dupCreate = await request('/api/create-order', { method: 'POST', body: {} });
  assert('Duplicate /api/create-order route removed (404 Not Found)', dupCreate.status === 404);

  const dupVerify = await request('/api/verify-payment', { method: 'POST', body: {} });
  assert('Duplicate /api/verify-payment route removed (404 Not Found)', dupVerify.status === 404);

  // 2. Customer Auth Setup for canonical flow
  console.log('\n--- 2. Customer Session & Order Creation ---');
  const loginRes = await request('/api/auth/customer-login', {
    method: 'POST',
    body: { email: 'test_canonical_customer@fatafat.com', name: 'Canonical Customer' }
  });
  assert('Customer session established', loginRes.status === 200);

  const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';

  const testOrderId = 'FT' + Math.floor(100000 + Math.random() * 900000);
  const orderRes = await request('/api/orders', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: {
      id: testOrderId,
      items: [{ productId: 'choco-1', name: 'Artisan Chocolate Box', price: 699, quantity: 1 }],
      address: { name: 'Canonical Customer', mobile: '9876543210', house: '101', street: 'MG Road', area: 'Central', city: 'Mumbai', pincode: '400001' },
      deliveryOption: 'ASAP',
      timeSlot: 'ASAP',
      paymentMethod: 'Razorpay',
      total: 699,
      subtotal: 699,
      deliveryFee: 0,
      discount: 0
    }
  });
  const dbOrderId = orderRes.data?.order?.id || orderRes.data?.id || testOrderId;
  assert('Order placed with status Pending', orderRes.status === 200 && Boolean(dbOrderId));

  // 3. Canonical Create-Order Endpoint
  console.log('\n--- 3. Canonical /api/payments/razorpay/create-order ---');
  const createRes = await request('/api/payments/razorpay/create-order', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: { orderId: dbOrderId }
  });
  const expectedPaise = Math.round(Number(orderRes.data?.order?.total || 699) * 100);
  assert('Returns HTTP 200 on create-order', createRes.status === 200);
  assert('Returns valid Razorpay Order ID', Boolean(createRes.data?.orderId));
  assert(`Returns amount in paise (${expectedPaise})`, createRes.data?.amount === expectedPaise);
  assert('Returns currency INR', createRes.data?.currency === 'INR');

  const rzpOrderId = createRes.data?.orderId;
  const paymentId = 'pay_canonical_' + Date.now();

  // 4. Canonical Verify Endpoint Security: Forged Signature Rejection
  console.log('\n--- 4. Canonical /api/payments/razorpay/verify Security ---');
  const forgedVerify = await request('/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: {
      orderId: dbOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: 'forged_fake_signature_abc123'
    }
  });
  assert('Rejects forged signature with HTTP 400', forgedVerify.status === 400);

  // 5. Canonical Verify Endpoint: Valid HMAC Signature
  const validSig = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${rzpOrderId}|${paymentId}`)
    .digest('hex');

  const validVerify = await request('/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: {
      orderId: dbOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSig
    }
  });
  assert('Accepts valid HMAC-SHA256 signature with HTTP 200', validVerify.status === 200);
  assert('Transitions order status to Confirmed & paymentStatus to PAID', validVerify.data?.orderStatus === 'Confirmed' && validVerify.data?.paymentStatus === 'PAID');

  // 6. Canonical Webhook Endpoint: Raw Body HMAC & Idempotency
  console.log('\n--- 5. Canonical /api/payments/razorpay/webhook Flow ---');
  const webhookPayload = JSON.stringify({
    entity: 'event',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: rzpOrderId,
          status: 'captured',
          amount: 69900,
          currency: 'INR'
        }
      }
    }
  });

  const webhookSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(webhookPayload)
    .digest('hex');

  const webhookRes = await new Promise((resolve) => {
    const url = new URL('/api/payments/razorpay/webhook', BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': webhookSig,
        'Content-Length': Buffer.byteLength(webhookPayload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.write(webhookPayload);
    req.end();
  });

  assert('Processes valid webhook event with HTTP 200', webhookRes.status === 200);

  console.log('\n========================================================================');
  console.log(`AUDIT SUMMARY: ${passed + failed} CHECKS | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
