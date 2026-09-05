const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function runOtpVisibilityTestSuite() {
  console.log('========================================================================');
  console.log(`RUNNING DELIVERY OTP VISIBILITY & ROLE ISOLATION TEST SUITE`);
  console.log(`Target: ${baseUrl}`);
  console.log('========================================================================\n');

  // 1. Admin Login
  const adminLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  console.log('1. Admin Login -> HTTP', adminLoginRes.status);
  const adminCookie = adminLoginRes.headers.get('set-cookie');

  // 2. Rider Login / Setup
  const riderPartnerId = 'DP-OTP-TEST-RIDER';
  const riderEmail = 'rider.otp.test@fatafat.com';
  const riderPassword = 'riderpassword123';

  await fetch(baseUrl + '/api/admin/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: riderPartnerId,
      name: 'Rider OTP Tester',
      phone: '9988112244',
      email: riderEmail,
      password: riderPassword,
      locationId: 'nawabganj-unnao',
      locationName: 'Nawabganj, Unnao'
    })
  });

  const riderLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: riderEmail, password: riderPassword })
  });
  console.log('2. Rider Login -> HTTP', riderLoginRes.status);
  const riderCookie = riderLoginRes.headers.get('set-cookie');

  // 3. Customer A (Owner) Login
  const customerAEmail = 'cust.owner.' + Date.now() + '@fatafat.com';
  const customerAPhone = '9876543210';
  const custALoginRes = await fetch(baseUrl + '/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerAEmail, phone: customerAPhone, name: 'Customer Owner' })
  });
  console.log('3. Customer A (Owner) Login -> HTTP', custALoginRes.status);
  const custACookie = custALoginRes.headers.get('set-cookie');

  // 4. Customer B (Different Customer) Login
  const customerBEmail = 'cust.other.' + Date.now() + '@fatafat.com';
  const customerBPhone = '9123456780';
  const custBLoginRes = await fetch(baseUrl + '/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerBEmail, phone: customerBPhone, name: 'Customer Other' })
  });
  console.log('4. Customer B (Other) Login -> HTTP', custBLoginRes.status);
  const custBCookie = custBLoginRes.headers.get('set-cookie');

  // 5. Customer A Creates Order
  const orderId = 'FT' + Math.floor(100000 + Math.random() * 900000);
  const createOrderRes = await fetch(baseUrl + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custACookie },
    body: JSON.stringify({
      id: orderId,
      items: [{ productId: 'choco-9', name: 'Peppermint Dark Chocolate Squares', price: 249, quantity: 1, image: '' }],
      address: { name: 'Customer Owner', mobile: customerAPhone, house: '404', street: 'Fulfillment Ave', area: 'Tech Zone', city: 'Noida', pincode: '201301' },
      deliveryOption: 'ASAP',
      deliveryTimeSlot: 'Within 15 mins',
      pricing: { subtotal: 249, deliveryFee: 0, discount: 0, total: 249 },
      paymentMethod: 'UPI'
    })
  });
  const createOrderData = await createOrderRes.json();
  const canonicalOtp = createOrderData.order.deliveryOtp;
  console.log(`\n5. Order Created -> ID: ${orderId}, Canonical OTP in DB: "${canonicalOtp}"`);
  if (!canonicalOtp || canonicalOtp.length < 4) {
    throw new Error(`Invalid canonical OTP generated: ${canonicalOtp}`);
  }

  // 6. Verification: Customer A calls GET /api/orders (My Orders List)
  console.log('\n--- CHECK 1: Customer A calls GET /api/orders (My Orders List) ---');
  const myOrdersRes = await fetch(baseUrl + '/api/orders', {
    headers: { 'Cookie': custACookie }
  });
  const myOrders = await myOrdersRes.json();
  const foundOrderInList = myOrders.find((o) => o.id === orderId);
  console.log('List API OTP for Order:', foundOrderInList?.deliveryOtp);
  if (!foundOrderInList || foundOrderInList.deliveryOtp !== canonicalOtp) {
    throw new Error(`FAIL: Customer A My Orders list does not show canonical OTP! Expected: ${canonicalOtp}, Got: ${foundOrderInList?.deliveryOtp}`);
  }
  console.log(`✔ PASS: Customer A sees canonical delivery OTP "${foundOrderInList.deliveryOtp}" in My Orders list.`);

  // 7. Verification: Customer A calls GET /api/orders/[id] (Detail/Tracking API)
  console.log(`\n--- CHECK 2: Customer A calls GET /api/orders/${orderId} (Order Details / Tracking) ---`);
  const detailRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
    headers: { 'Cookie': custACookie }
  });
  const detailOrder = await detailRes.json();
  console.log('Detail API OTP for Order:', detailOrder.deliveryOtp);
  if (detailOrder.deliveryOtp !== canonicalOtp) {
    throw new Error(`FAIL: Customer A Order Detail API does not show canonical OTP! Expected: ${canonicalOtp}, Got: ${detailOrder.deliveryOtp}`);
  }
  console.log(`✔ PASS: Customer A sees canonical delivery OTP "${detailOrder.deliveryOtp}" in Order Detail API.`);

  // 8. Verification: Unauthenticated user calls GET /api/orders/[id]
  console.log(`\n--- CHECK 3: Unauthenticated request to GET /api/orders/${orderId} ---`);
  const unauthRes = await fetch(`${baseUrl}/api/orders/${orderId}`);
  const unauthOrder = await unauthRes.json();
  console.log('Unauthenticated API deliveryOtp:', unauthOrder.deliveryOtp);
  if (unauthOrder.deliveryOtp) {
    throw new Error(`SECURITY FAIL: Unauthenticated user can see deliveryOtp! Value: ${unauthOrder.deliveryOtp}`);
  }
  console.log('✔ PASS: Unauthenticated user cannot see deliveryOtp (stripped / protected).');

  // 9. Verification: Customer B (Other Customer) calls GET /api/orders/[id]
  console.log(`\n--- CHECK 4: Customer B (Other Customer) calls GET /api/orders/${orderId} ---`);
  const custBDetailRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
    headers: { 'Cookie': custBCookie }
  });
  const custBDetail = await custBDetailRes.json();
  console.log('Customer B API deliveryOtp:', custBDetail.deliveryOtp);
  if (custBDetail.deliveryOtp) {
    throw new Error(`SECURITY FAIL: Customer B can see Customer A deliveryOtp! Value: ${custBDetail.deliveryOtp}`);
  }
  console.log('✔ PASS: Customer B cannot see Customer A deliveryOtp (isolated).');

  // 10. Verification: Delivery Partner calls GET /api/delivery/orders
  console.log(`\n--- CHECK 5: Delivery Partner calls GET /api/delivery/orders ---`);
  // First assign rider to this order
  await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: orderId,
      updates: {
        assignedPartnerId: riderPartnerId,
        assignedPartnerName: 'Rider OTP Tester',
        status: 'Assigned'
      }
    })
  });

  const partnerOrdersRes = await fetch(baseUrl + '/api/delivery/orders', {
    headers: { 'Cookie': riderCookie }
  });
  const partnerOrders = await partnerOrdersRes.json();
  const riderOrderView = partnerOrders.find((o) => o.id === orderId);
  console.log('Rider Order List deliveryOtp:', riderOrderView?.deliveryOtp);
  if (riderOrderView && riderOrderView.deliveryOtp) {
    throw new Error(`SECURITY FAIL: Delivery Partner order list exposed secret deliveryOtp! Value: ${riderOrderView.deliveryOtp}`);
  }
  console.log('✔ PASS: Delivery Partner order list does NOT expose secret deliveryOtp.');

  // 11. Verification: Status Progression and Customer OTP Persistence
  console.log('\n--- CHECK 6: Progress Status to Out for Delivery and verify Customer OTP persistence ---');
  await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ id: orderId, updates: { status: 'Accepted' } })
  });
  await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ id: orderId, updates: { status: 'Picked Up' } })
  });
  await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ id: orderId, updates: { status: 'Out for Delivery' } })
  });

  // Re-check Customer A view during Out for Delivery
  const myOrdersOut = await (await fetch(baseUrl + '/api/orders', { headers: { 'Cookie': custACookie } })).json();
  const orderOut = myOrdersOut.find((o) => o.id === orderId);
  console.log('Customer A OTP while Out for Delivery:', orderOut?.deliveryOtp);
  if (orderOut?.deliveryOtp !== canonicalOtp) {
    throw new Error(`FAIL: Customer A OTP changed or disappeared during Out for Delivery! Expected: ${canonicalOtp}, Got: ${orderOut?.deliveryOtp}`);
  }
  console.log('✔ PASS: Customer A OTP remains perfectly visible and intact during Out for Delivery.');

  // 12. Verification: Delivery Partner verifies OTP to complete delivery
  console.log(`\n--- CHECK 7: Delivery Partner verifies with canonical OTP "${canonicalOtp}" ---`);
  const verifyRes = await fetch(`${baseUrl}/api/delivery/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ otp: canonicalOtp })
  });
  const verifyData = await verifyRes.json();
  console.log('Verify OTP Status:', verifyRes.status, 'Response:', verifyData);

  if (!verifyRes.ok || !verifyData.success) {
    throw new Error(`FAIL: Delivery Partner verification rejected the canonical OTP! Error: ${JSON.stringify(verifyData)}`);
  }
  console.log('✔ PASS: Delivery Partner verified and completed delivery using the EXACT same canonical OTP shown to customer.');

  // 13. Final Check: Order is marked Delivered
  const finalDetailRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
    headers: { 'Cookie': custACookie }
  });
  const finalDetail = await finalDetailRes.json();
  console.log('Final Order Status in Customer Account:', finalDetail.status);
  if (finalDetail.status !== 'Delivered') {
    throw new Error(`FAIL: Order status is not Delivered! Status: ${finalDetail.status}`);
  }
  console.log('✔ PASS: Final Order is Delivered successfully.');

  console.log('\n========================================================================');
  console.log('>>> ALL 7 DELIVERY OTP VISIBILITY & SECURITY CHECKS PASSED 100%! <<<');
  console.log('========================================================================\n');
}

runOtpVisibilityTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
