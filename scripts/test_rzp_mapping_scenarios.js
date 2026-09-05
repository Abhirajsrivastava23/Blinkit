const crypto = require('crypto');

async function runMappingTests() {
  console.log('========================================================================');
  console.log('🧪 TESTING RAZORPAY PAYMENT-TO-ORDER MAPPING & RECONCILIATION SCENARIOS');
  console.log('========================================================================\n');

  const BASE_URL = 'http://localhost:3000';
  const keySecret = 'Exu52JSFtzFtar9AwgZEE57H';

  // 1. Create a customer session
  const loginRes = await fetch(`${BASE_URL}/api/auth/customer-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'krishnam@example.com', name: 'Krishnam Dwivedi' })
  });
  const cookie = loginRes.headers.get('set-cookie') || '';

  // 2. Create Order with explicit reference #FT972003
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      id: 'FT972003',
      items: [{ productId: 'rzp-test-product-2', id: 'rzp-test-product-2', name: 'Razorpay ₹2 Test Product', price: 2, quantity: 1 }],
      address: { name: 'Krishnam Dwivedi', street: 'Boys Hostel', city: 'Nawabganj', state: 'UP', pincode: '209859', mobile: '8081988627' },
      paymentMethod: 'Razorpay'
    })
  });
  const orderData = await orderRes.json();
  console.log('Step 1: Created Order #FT972003 -> Status:', orderRes.status, 'Total:', orderData.total);

  // 3. Create Razorpay order
  const createRzpRes = await fetch(`${BASE_URL}/api/payments/razorpay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ orderId: 'FT972003' })
  });
  const createRzpData = await createRzpRes.json();
  console.log('Step 2: Created Razorpay Order -> rzpOrderId:', createRzpData.orderId);

  const rzpOrderId = createRzpData.orderId;
  const mockPaymentId = 'pay_TYM7K0CTjxZ8xY';

  // Generate valid signature
  const validSignature = crypto.createHmac('sha256', keySecret).update(`${rzpOrderId}|${mockPaymentId}`).digest('hex');

  // Scenario A: Verification with clean orderId: "FT972003"
  const verifyResA = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      orderId: 'FT972003',
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature
    })
  });
  const verifyDataA = await verifyResA.json();
  console.log('Scenario A (Verify with orderId FT972003) -> Status:', verifyResA.status, 'Result:', verifyDataA.status, 'Success:', verifyDataA.success);

  // Scenario B: Verification with hash prefix orderId: "#FT972003"
  const verifyResB = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      orderId: '#FT972003',
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature
    })
  });
  const verifyDataB = await verifyResB.json();
  console.log('Scenario B (Verify with #FT972003 idempotent) -> Status:', verifyResB.status, 'AlreadyProcessed:', verifyDataB.alreadyProcessed || verifyDataB.success);

  // Scenario C: Verification with NO orderId (resolving purely by razorpay_order_id)
  const verifyResC = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature
    })
  });
  const verifyDataC = await verifyResC.json();
  console.log('Scenario C (Verify without orderId, pure rzp_order_id) -> Status:', verifyResC.status, 'Success:', verifyDataC.success);

  // Scenario D: Check GET /api/orders/FT972003
  const checkOrderRes = await fetch(`${BASE_URL}/api/orders/FT972003`, {
    headers: { 'Cookie': cookie }
  });
  const checkOrderData = await checkOrderRes.json();
  console.log('Scenario D (Fetch /api/orders/FT972003) -> PaymentStatus:', checkOrderData.paymentStatus, 'Status:', checkOrderData.status, 'PaymentId:', checkOrderData.razorpayPaymentId);

  const allPassed = verifyResA.ok && verifyResB.ok && verifyResC.ok && checkOrderData.paymentStatus === 'PAID' && checkOrderData.status === 'Confirmed' && checkOrderData.razorpayPaymentId === mockPaymentId;

  console.log('\n========================================================================');
  console.log(allPassed ? '✅ ALL MAPPING & RECONCILIATION SCENARIOS PASSED (100%)' : '❌ SOME TESTS FAILED');
  console.log('========================================================================');
  if (!allPassed) process.exit(1);
}

runMappingTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
