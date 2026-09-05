const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_placeholder';

console.log('--- RAZORPAY COMPREHENSIVE END-TO-END TEST SUITE ---');
console.log('Target Base URL:', BASE_URL);
console.log('Razorpay Key ID:', KEY_ID);

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Create a customer session
  console.log('\n[1] Creating customer session...');
  const custEmail = `customer_${Date.now()}@test.com`;
  const custRes = await fetch(`${BASE_URL}/api/auth/customer-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: custEmail, name: 'Razorpay Test Customer', phone: '9876543210' })
  });
  const custCookie = custRes.headers.get('set-cookie');
  assert(custRes.ok, `Customer login successful (${custRes.status})`);

  // 2. Create an admin session
  console.log('\n[2] Creating admin session...');
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@fatafat.com', password: 'admin', role: 'admin' })
  });
  const adminCookie = adminRes.headers.get('set-cookie');
  assert(adminRes.ok, `Admin login successful (${adminRes.status})`);

  // 3. Create a test order
  console.log('\n[3] Creating a test order via /api/orders...');
  const testOrderId = `FT${Date.now()}`;
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(custCookie ? { 'Cookie': custCookie } : {})
    },
    body: JSON.stringify({
      orderId: testOrderId,
      items: [
        { productId: 'test-item-1', name: 'Luxury Wine', price: 999, quantity: 2 }
      ],
      total: 1998,
      subtotal: 1998,
      deliveryFee: 0,
      paymentMethod: 'Razorpay',
      address: {
        name: 'Razorpay Test Customer',
        mobile: '9876543210',
        house: 'Flat 101',
        street: 'Main Road',
        area: 'Nawabganj',
        city: 'Unnao',
        pincode: '209859'
      }
    })
  });
  const orderData = await orderRes.json();
  const createdOrderId = orderData.order?.id || testOrderId;
  assert(orderRes.ok && orderData.success, `Order created with ID #${createdOrderId}`);

  // 4. Create Razorpay order via /api/payments/razorpay/create-order
  console.log('\n[4] Creating Razorpay order via /api/payments/razorpay/create-order...');
  const rzpOrderRes = await fetch(`${BASE_URL}/api/payments/razorpay/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(custCookie ? { 'Cookie': custCookie } : {})
    },
    body: JSON.stringify({ orderId: createdOrderId })
  });
  const rzpOrderData = await rzpOrderRes.json();
  assert(rzpOrderRes.ok && rzpOrderData.success, `Razorpay order API returned success`);
  assert(Boolean(rzpOrderData.orderId), `Received Razorpay orderId: ${rzpOrderData.orderId}`);
  assert(rzpOrderData.amount === 199800, `Amount in paise is 199800 (₹1998)`);
  assert(rzpOrderData.currency === 'INR', `Currency is INR`);
  assert(!rzpOrderData.keySecret, `Secret is NEVER returned to client`);

  const rzpOrderId = rzpOrderData.orderId;
  const fakePaymentId = `pay_test_${Date.now()}`;

  // 5. Test Invalid Signature Rejection
  console.log('\n[5] Testing invalid signature rejection on /api/payments/razorpay/verify...');
  const invalidVerifyRes = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(custCookie ? { 'Cookie': custCookie } : {})
    },
    body: JSON.stringify({
      orderId: createdOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: 'invalid_fraudulent_signature_12345'
    })
  });
  const invalidVerifyData = await invalidVerifyRes.json();
  assert(!invalidVerifyRes.ok && invalidVerifyRes.status === 400, `Invalid signature correctly rejected with HTTP 400 (${invalidVerifyData.error})`);

  // Verify order is NOT marked as paid
  const checkOrderUnpaidRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}`, {
    headers: custCookie ? { 'Cookie': custCookie } : {}
  });
  const checkOrderUnpaid = await checkOrderUnpaidRes.json();
  assert(checkOrderUnpaid.paymentStatus !== 'PAID', `Order paymentStatus remains unpaid after failed verification`);

  // 6. Test Valid HMAC Signature Verification
  console.log('\n[6] Testing valid HMAC-SHA256 signature verification...');
  const validSignature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${rzpOrderId}|${fakePaymentId}`)
    .digest('hex');

  const validVerifyRes = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(custCookie ? { 'Cookie': custCookie } : {})
    },
    body: JSON.stringify({
      orderId: createdOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: validSignature
    })
  });
  const validVerifyData = await validVerifyRes.json();
  assert(validVerifyRes.ok && validVerifyData.success, `Valid signature verified successfully (${validVerifyData.message})`);
  assert(validVerifyData.order?.paymentStatus === 'PAID', `Verified order paymentStatus is PAID`);
  assert(validVerifyData.order?.status === 'Confirmed', `Verified order status is Confirmed`);
  assert(validVerifyData.order?.razorpayPaymentId === fakePaymentId, `Saved razorpayPaymentId matches`);
  assert(validVerifyData.order?.razorpayOrderId === rzpOrderId, `Saved razorpayOrderId matches`);

  // 7. Test Verification Idempotency (Re-submitting duplicate verification)
  console.log('\n[7] Testing duplicate verification idempotency...');
  const dupeVerifyRes = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(custCookie ? { 'Cookie': custCookie } : {})
    },
    body: JSON.stringify({
      orderId: createdOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: validSignature
    })
  });
  const dupeVerifyData = await dupeVerifyRes.json();
  assert(dupeVerifyRes.ok && dupeVerifyData.success, `Duplicate verification handles idempotently without error`);

  // 8. Test Webhook: Invalid Signature Rejection
  console.log('\n[8] Testing Webhook Invalid Signature Rejection on /api/payments/razorpay/webhook...');
  const invalidWebhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_webhook_test_${Date.now()}`,
          order_id: rzpOrderId,
          amount: 199800,
          currency: 'INR',
          status: 'captured',
          method: 'upi'
        }
      }
    }
  });

  const invalidWebhookRes = await fetch(`${BASE_URL}/api/payments/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'invalid_webhook_sig'
    },
    body: invalidWebhookPayload
  });
  assert(!invalidWebhookRes.ok && invalidWebhookRes.status === 400, `Invalid webhook signature rejected with HTTP 400`);

  // 9. Test Webhook: Valid Signature Processing (payment.captured on a second order)
  console.log('\n[9] Testing Webhook Valid Signature for payment.captured on new order...');
  const webhookOrderId = `FT_WH_${Date.now()}`;
  const order2Res = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(custCookie ? { 'Cookie': custCookie } : {})
    },
    body: JSON.stringify({
      orderId: webhookOrderId,
      items: [{ productId: 'item-2', name: 'Gourmet Chocolate', price: 500, quantity: 1 }],
      total: 500,
      paymentMethod: 'Razorpay',
      address: { name: 'Webhook Customer', mobile: '9998887776', pincode: '209859' }
    })
  });
  const order2Data = await order2Res.json();
  const createdOrder2Id = order2Data.order?.id || webhookOrderId;

  // Create RZP order for order 2
  const rzpOrder2Res = await fetch(`${BASE_URL}/api/payments/razorpay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(custCookie ? { 'Cookie': custCookie } : {}) },
    body: JSON.stringify({ orderId: createdOrder2Id })
  });
  const rzpOrder2Data = await rzpOrder2Res.json();
  const rzpOrder2Id = rzpOrder2Data.orderId;
  const webhookPayId = `pay_wh_${Date.now()}`;

  const validWebhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: webhookPayId,
          order_id: rzpOrder2Id,
          amount: 50000,
          currency: 'INR',
          status: 'captured',
          method: 'card',
          notes: { orderId: createdOrder2Id }
        }
      }
    }
  });

  const validWebhookSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(validWebhookPayload)
    .digest('hex');

  const webhookRes = await fetch(`${BASE_URL}/api/payments/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validWebhookSignature
    },
    body: validWebhookPayload
  });
  const webhookData = await webhookRes.json();
  assert(webhookRes.ok && webhookData.received, `Valid webhook accepted (${webhookData.event})`);

  // Verify second order is now PAID
  const checkOrder2Res = await fetch(`${BASE_URL}/api/orders/${createdOrder2Id}`, {
    headers: custCookie ? { 'Cookie': custCookie } : {}
  });
  const checkOrder2 = await checkOrder2Res.json();
  assert(checkOrder2.paymentStatus === 'PAID', `Webhook successfully marked order #${createdOrder2Id} as PAID`);
  assert(checkOrder2.status === 'Confirmed', `Webhook successfully updated order status to Confirmed`);

  // 10. Test Webhook Idempotency (Sending duplicate webhook)
  console.log('\n[10] Testing Webhook duplicate delivery idempotency...');
  const dupeWebhookRes = await fetch(`${BASE_URL}/api/payments/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validWebhookSignature
    },
    body: validWebhookPayload
  });
  const dupeWebhookData = await dupeWebhookRes.json();
  assert(dupeWebhookRes.ok && dupeWebhookData.received, `Duplicate webhook handled idempotently`);

  // 11. Test Webhook: payment.failed event
  console.log('\n[11] Testing Webhook payment.failed event...');
  const failedWebhookPayload = JSON.stringify({
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: `pay_failed_${Date.now()}`,
          order_id: `order_fake_${Date.now()}`,
          amount: 50000,
          currency: 'INR',
          status: 'failed',
          error_description: 'Card declined by issuing bank'
        }
      }
    }
  });
  const failedWebhookSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(failedWebhookPayload)
    .digest('hex');

  const failedWebhookRes = await fetch(`${BASE_URL}/api/payments/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': failedWebhookSig
    },
    body: failedWebhookPayload
  });
  assert(failedWebhookRes.ok, `payment.failed webhook event processed without error`);

  // 12. Test Admin Payments API endpoint
  console.log('\n[12] Testing Admin /api/payments view...');
  const adminPayRes = await fetch(`${BASE_URL}/api/payments`, {
    headers: adminCookie ? { 'Cookie': adminCookie } : {}
  });
  const adminPayData = await adminPayRes.json();
  assert(adminPayRes.ok && Array.isArray(adminPayData), `Admin payments API returned ${adminPayData.length} records`);
  
  const foundOrder1InAdmin = adminPayData.find(p => String(p.orderId).toLowerCase() === String(createdOrderId).toLowerCase());
  assert(Boolean(foundOrder1InAdmin), `Order #${createdOrderId} visible in Admin payment transactions`);
  if (foundOrder1InAdmin) {
    assert(foundOrder1InAdmin.status === 'PAID', `Admin payment status is PAID`);
    assert(foundOrder1InAdmin.razorpayPaymentId === fakePaymentId, `Admin record has razorpayPaymentId: ${foundOrder1InAdmin.razorpayPaymentId}`);
    assert(foundOrder1InAdmin.razorpayOrderId === rzpOrderId, `Admin record has razorpayOrderId: ${foundOrder1InAdmin.razorpayOrderId}`);
  }

  console.log('\n========================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
