/**
 * Comprehensive Razorpay End-to-End Flow & Security Test Suite
 */

const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const fs = require('fs');
const path = require('path');

// Read from .env / .env.local if available
let envSecret = process.env.RAZORPAY_KEY_SECRET;
if (!envSecret) {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    const match = envContent.match(/RAZORPAY_KEY_SECRET=["']?([^"'\r\n]+)/);
    if (match) envSecret = match[1];
  } catch {}
}

const KEY_SECRET = envSecret || 'Exu52JSFtzFtar9AwgZEE57H';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'fatafat_rzp_webhook_secret_789';

let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${message} ${details ? '-> ' + details : ''}`);
    failures.push({ message, details });
  }
}

function computeSignature(orderId, paymentId, secret) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

function computeWebhookSignature(bodyString, secret) {
  return crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('🚀 RAZORPAY PAYMENT GATEWAY END-TO-END VERIFICATION');
  console.log('======================================================\n');

  // Phase 0: Authentication
  console.log('--- Phase 0: Authentication Setup ---');
  const custTimestamp = Date.now();
  const customerEmail = `rzp.test.${custTimestamp}@fatafat.com`;
  const customerPhone = '98765' + Math.floor(10000 + Math.random() * 90000);

  const custLoginRes = await fetch(BASE_URL + '/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, phone: customerPhone, name: 'Razorpay Test Customer' })
  });
  assert(custLoginRes.status === 200, 'Customer Login returns 200 OK');
  const customerCookie = custLoginRes.headers.get('set-cookie');
  assert(Boolean(customerCookie), 'Customer Session cookie acquired');

  const adminLoginRes = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminLoginRes.status === 200, 'Admin Login returns 200 OK');
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  assert(Boolean(adminCookie), 'Admin Session cookie acquired');

  // Test 1: Order Creation
  console.log('\n--- Test 1: Order Creation via Checkout Flow ---');
  const testOrderId = 'FT' + Math.floor(100000 + Math.random() * 900000);
  const orderRes = await fetch(BASE_URL + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      id: testOrderId,
      items: [
        {
          id: 'cake-belgian-chocolate',
          productId: 'cake-belgian-chocolate',
          name: 'Belgian Chocolate Truffle Cake',
          price: 649,
          quantity: 1,
          image: '/images/products/belgian-chocolate.jpg'
        }
      ],
      address: {
        name: 'Razorpay Test Customer',
        mobile: customerPhone,
        house: 'Flat 4B',
        street: 'Kalyan Marg',
        area: 'Nawabganj',
        city: 'Unnao',
        pincode: '209859'
      },
      deliveryOption: 'ASAP',
      paymentMethod: 'Razorpay'
    })
  });
  assert(orderRes.status === 200, 'Customer creates order successfully');
  const orderData = await orderRes.json();
  const testOrderAmount = orderData?.order?.total || 649;
  assert(orderData.success === true && orderData.order?.status === 'Pending', 'Order created with initial status "Pending"');
  assert(orderData.order?.paymentMethod === 'Razorpay', 'Order paymentMethod is set to "Razorpay"');

  // Test 2: Razorpay Order Creation (Paise Conversion)
  console.log('\n--- Test 2: Razorpay Order Creation (/api/payments/razorpay/create-order) ---');
  const createOrderRes = await fetch(BASE_URL + '/api/payments/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ orderId: testOrderId })
  });
  assert(createOrderRes.status === 200, 'Razorpay create-order API returns 200 OK');
  const createOrderData = await createOrderRes.json();
  const rzpOrderId = createOrderData.orderId;
  const expectedPaise = Math.round(testOrderAmount * 100);
  assert(Boolean(rzpOrderId), `Generated Razorpay Order ID: ${rzpOrderId}`);
  assert(createOrderData.amount === expectedPaise, `Amount converted to paise: ${createOrderData.amount} paise (₹${testOrderAmount})`);

  // Test 3: Security: Fraudulent / Invalid Signature Rejection
  console.log('\n--- Test 3: Security: Fraudulent / Invalid Signature Rejection ---');
  const fakePaymentId = `pay_${Date.now()}_fake`;
  const fakeSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

  const fraudRes = await fetch(BASE_URL + '/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      orderId: testOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: fakeSignature
    })
  });
  assert(fraudRes.status === 400, 'Server correctly rejected invalid HMAC signature with HTTP 400');

  // Test 4: Server-Side HMAC-SHA256 Signature Verification
  console.log('\n--- Test 4: Server-Side HMAC-SHA256 Signature Verification ---');
  const validPaymentId = `pay_${Date.now()}_valid`;
  const validSignature = computeSignature(rzpOrderId, validPaymentId, KEY_SECRET);

  const verifyRes = await fetch(BASE_URL + '/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      orderId: testOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature
    })
  });
  assert(verifyRes.status === 200, 'Razorpay verify API returned 200 OK for valid signature');
  const verifyData = await verifyRes.json();
  assert(verifyData.success === true && verifyData.paymentStatus === 'PAID', 'Order paymentStatus updated to PAID');
  assert(verifyData.orderStatus === 'Confirmed', 'Order status updated to Confirmed upon payment verification');

  // Test 5: Idempotency on Repeated Verification
  console.log('\n--- Test 5: Idempotency on Repeated Verification ---');
  const repeatRes = await fetch(BASE_URL + '/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      orderId: testOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature
    })
  });
  assert(repeatRes.status === 200, 'Repeated verification returned HTTP 200 idempotently');

  // Test 6: Webhook Processing (payment.captured)
  console.log('\n--- Test 6: Webhook Processing (payment.captured) ---');
  const webhookOrderId = 'FT' + Math.floor(100000 + Math.random() * 900000);
  const wOrderRes = await fetch(BASE_URL + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      id: webhookOrderId,
      items: [{ id: 'wellness-item', productId: 'wellness-item', name: 'Item', price: 200, quantity: 1 }],
      address: { name: 'WH User', mobile: customerPhone, street: 'Road', city: 'Unnao', pincode: '209801' },
      deliveryOption: 'ASAP',
      paymentMethod: 'Razorpay'
    })
  });
  assert(wOrderRes.status === 200, 'Created second order for webhook testing');

  const wRzpRes = await fetch(BASE_URL + '/api/payments/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ orderId: webhookOrderId })
  });
  const webhookRzpOrderId = (await wRzpRes.json()).orderId;
  const webhookPaymentId = `pay_wh_${Date.now()}`;

  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: webhookPaymentId,
          order_id: webhookRzpOrderId,
          amount: 24900,
          status: 'captured',
          method: 'upi',
          notes: { dbOrderId: webhookOrderId }
        }
      }
    }
  });

  const webhookSig = computeWebhookSignature(webhookPayload, WEBHOOK_SECRET);

  const webhookRes = await fetch(BASE_URL + '/api/payments/razorpay/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': webhookSig
    },
    body: webhookPayload
  });
  assert(webhookRes.status === 200, 'Webhook payment.captured processed with HTTP 200');

  // Verify order updated in DB via webhook
  const whCheckRes = await fetch(BASE_URL + `/api/orders/${webhookOrderId}`, { headers: { 'Cookie': customerCookie } });
  const whCheckData = await whCheckRes.json();
  assert(whCheckData.paymentStatus === 'PAID' && whCheckData.status === 'Confirmed', 'Order confirmed and marked PAID via Webhook');

  // Test 7: Webhook Security: Invalid Signature Rejection
  console.log('\n--- Test 7: Webhook Security: Invalid Signature Rejection ---');
  const invalidWebhookRes = await fetch(BASE_URL + '/api/payments/razorpay/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'invalid_signature_hex'
    },
    body: webhookPayload
  });
  assert(invalidWebhookRes.status === 400, 'Webhook rejected invalid HMAC signature with HTTP 400');

  // Test 8: Admin Payments & Settings API Verification
  console.log('\n--- Test 8: Admin Payments & Settings API Verification ---');
  const paymentsRes = await fetch(BASE_URL + '/api/payments', { headers: { 'Cookie': adminCookie } });
  assert(paymentsRes.status === 200, 'Admin /api/payments returns 200 OK');
  const paymentsList = await paymentsRes.json();
  assert(Array.isArray(paymentsList), 'Admin payments API returns list of transactions');
  const matchTx = paymentsList.find(p => String(p.orderId) === String(testOrderId));
  assert(Boolean(matchTx && matchTx.status === 'PAID' && matchTx.provider === 'RAZORPAY'), 'Transaction listed in admin with provider: RAZORPAY and status: PAID');

  const settingsRes = await fetch(BASE_URL + '/api/admin/payment-settings', { headers: { 'Cookie': adminCookie } });
  assert(settingsRes.status === 200, 'Admin /api/admin/payment-settings returns 200 OK');
  const settingsData = await settingsRes.json();
  assert(settingsData.provider === 'RAZORPAY' && settingsData.status === 'ACTIVE', 'Payment settings returns ACTIVE Razorpay provider info');

  // Test 9: Legacy UPI Proof Routes Decommissioning Check (HTTP 410)
  console.log('\n--- Test 9: Legacy UPI Proof Routes Decommissioning Check ---');
  const submitRes = await fetch(BASE_URL + '/api/payments/submit', { method: 'POST' });
  assert(submitRes.status === 410, 'Legacy /api/payments/submit returned HTTP 410 Gone (Decommissioned)');

  const legacyVerifyRes = await fetch(BASE_URL + '/api/payments/verify', { method: 'POST' });
  assert(legacyVerifyRes.status === 410, 'Legacy /api/payments/verify returned HTTP 410 Gone (Decommissioned)');

  const qrRes = await fetch(BASE_URL + '/api/payments/qr');
  assert(qrRes.status === 410, 'Legacy /api/payments/qr returned HTTP 410 Gone (Decommissioned)');

  const uploadRes = await fetch(BASE_URL + '/api/payments/upload-proof', { method: 'POST' });
  assert(uploadRes.status === 410, 'Legacy /api/payments/upload-proof returned HTTP 410 Gone (Decommissioned)');

  // Summary
  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    console.error('Failed test details:', failures);
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test suite error:', err);
  process.exit(1);
});
