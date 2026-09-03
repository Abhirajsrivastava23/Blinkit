const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function runDeliverySyncTest() {
  console.log('========================================================================');
  console.log('STARTING DELIVERY-PARTNER ORDER-STATUS SYNCHRONIZATION E2E TEST');
  console.log('========================================================================\n');

  // 1. Admin Login to setup partner & assignment
  const adminLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  console.log('1. Admin Login -> HTTP', adminLoginRes.status);
  const adminCookie = adminLoginRes.headers.get('set-cookie');

  // 2. Rider Login / Setup
  const riderPartnerId = 'DP-SYNC-RIDER-1';
  const riderEmail = 'rider.sync.test@fatafat.com';
  const riderPassword = 'riderpassword123';

  await fetch(baseUrl + '/api/admin/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: riderPartnerId,
      name: 'Rider Sync Tester',
      phone: '9988112233',
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
  if (!riderCookie) throw new Error('Failed to get rider session cookie');

  // 3. Customer Signup / Login
  const customerEmail = 'customer.sync.' + Date.now() + '@fatafat.com';
  const custLoginRes = await fetch(baseUrl + '/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, phone: '9876543210', name: 'Customer Sync Tester' })
  });
  console.log('3. Customer Login -> HTTP', custLoginRes.status);
  const custCookie = custLoginRes.headers.get('set-cookie');

  // 4. Customer Creates Order
  const orderId = 'FT' + Math.floor(100000 + Math.random() * 900000);
  const createOrderRes = await fetch(baseUrl + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
    body: JSON.stringify({
      id: orderId,
      items: [{ productId: 'choco-9', name: 'Peppermint Dark Chocolate Squares', price: 249, quantity: 1, image: '' }],
      address: { name: 'Customer Sync Tester', mobile: '9876543210', house: '404', street: 'Fulfillment Ave', area: 'Tech Zone', city: 'Noida', pincode: '201301' },
      deliveryOption: 'ASAP',
      deliveryTimeSlot: 'Within 15 mins',
      pricing: { subtotal: 249, deliveryFee: 0, discount: 0, total: 249 },
      paymentMethod: 'UPI'
    })
  });
  const createOrderData = await createOrderRes.json();
  console.log('4. Order Created -> ID: ' + orderId + ', Initial Status: ' + createOrderData.order.status);
  const deliveryOtp = createOrderData.order.deliveryOtp;
  console.log('   Generated Delivery OTP: ' + deliveryOtp);

  // 5. Submit Payment & Admin Confirms
  const fakeJpgBuffer = Buffer.alloc(5 * 1024, 0xFF);
  const fakeBlob = new Blob([fakeJpgBuffer], { type: 'image/jpeg' });
  const proofFormData = new FormData();
  proofFormData.append('orderId', orderId);
  proofFormData.append('paymentId', 'pay-' + orderId);
  proofFormData.append('amount', '249');
  proofFormData.append('utr', '998877665544');
  proofFormData.append('file', fakeBlob, 'screenshot.jpg');

  await fetch(baseUrl + '/api/payments/submit', {
    method: 'POST',
    headers: { 'Cookie': custCookie },
    body: proofFormData
  });

  await fetch(baseUrl + '/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      orderId: orderId,
      paymentId: 'pay-' + orderId,
      action: 'approve'
    })
  });

  // Assign Rider
  await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: orderId,
      updates: {
        assignedPartnerId: riderPartnerId,
        assignedPartnerName: 'Rider Sync Tester',
        status: 'Assigned'
      }
    })
  });
  console.log('5. Order Paid & Assigned to Rider ' + riderPartnerId);

  // 6. Test Step: Rider Accepts Order -> status: Accepted
  const acceptRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Accepted' }
    })
  });
  const acceptData = await acceptRes.json();
  console.log('6. Rider Accepts Order -> HTTP', acceptRes.status, 'DB Status:', acceptData.order?.status);

  // Verify Customer My Orders & Details reflection
  const custOrdersAfterAccept = await fetch(baseUrl + '/api/orders', { headers: { 'Cookie': custCookie } }).then(r => r.json());
  const custDetailAfterAccept = await fetch(baseUrl + '/api/orders/' + orderId, { headers: { 'Cookie': custCookie } }).then(r => r.json());
  console.log('   Customer My Orders Status ->', custOrdersAfterAccept[0]?.status);
  console.log('   Customer Order Detail Status ->', custDetailAfterAccept?.status);

  // 7. Test Step: Rider Hub Pickup -> status: Picked Up
  const pickupRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({
      id: orderId,
      updates: {
        status: 'Picked Up',
        verifiedItemIds: ['choco-9'],
        boxSealVerified: true
      }
    })
  });
  const pickupData = await pickupRes.json();
  console.log('7. Rider Hub Pickup -> HTTP', pickupRes.status, 'DB Status:', pickupData.order?.status);

  const custOrdersAfterPickup = await fetch(baseUrl + '/api/orders', { headers: { 'Cookie': custCookie } }).then(r => r.json());
  const custDetailAfterPickup = await fetch(baseUrl + '/api/orders/' + orderId, { headers: { 'Cookie': custCookie } }).then(r => r.json());
  console.log('   Customer My Orders Status ->', custOrdersAfterPickup[0]?.status);
  console.log('   Customer Order Detail Status ->', custDetailAfterPickup?.status);

  // 8. Test Step: Rider Starts Transit -> status: Out for Delivery
  const transitRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Out for Delivery' }
    })
  });
  const transitData = await transitRes.json();
  console.log('8. Rider Out for Delivery -> HTTP', transitRes.status, 'DB Status:', transitData.order?.status);

  const custOrdersAfterTransit = await fetch(baseUrl + '/api/orders', { headers: { 'Cookie': custCookie } }).then(r => r.json());
  const custDetailAfterTransit = await fetch(baseUrl + '/api/orders/' + orderId, { headers: { 'Cookie': custCookie } }).then(r => r.json());
  console.log('   Customer My Orders Status ->', custOrdersAfterTransit[0]?.status);
  console.log('   Customer Order Detail Status ->', custDetailAfterTransit?.status);

  // 9. Test Step: Rider Completes Delivery with OTP -> status: Delivered
  const completeRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({
      id: orderId,
      updates: {
        status: 'Delivered',
        otpCode: deliveryOtp,
        otp_verified: true
      }
    })
  });
  const completeData = await completeRes.json();
  console.log('9. Rider Confirms Delivered -> HTTP', completeRes.status, 'DB Status:', completeData.order?.status);

  const custOrdersAfterDelivered = await fetch(baseUrl + '/api/orders', { headers: { 'Cookie': custCookie } }).then(r => r.json());
  const custDetailAfterDelivered = await fetch(baseUrl + '/api/orders/' + orderId, { headers: { 'Cookie': custCookie } }).then(r => r.json());
  console.log('   Customer My Orders Status ->', custOrdersAfterDelivered[0]?.status);
  console.log('   Customer Order Detail Status ->', custDetailAfterDelivered?.status);

  const allPassed = (
    acceptData.order?.status === 'Accepted' &&
    custOrdersAfterAccept[0]?.status === 'Accepted' &&
    custDetailAfterAccept?.status === 'Accepted' &&
    pickupData.order?.status === 'Picked Up' &&
    custOrdersAfterPickup[0]?.status === 'Picked Up' &&
    custDetailAfterPickup?.status === 'Picked Up' &&
    transitData.order?.status === 'Out for Delivery' &&
    custOrdersAfterTransit[0]?.status === 'Out for Delivery' &&
    custDetailAfterTransit?.status === 'Out for Delivery' &&
    completeData.order?.status === 'Delivered' &&
    custOrdersAfterDelivered[0]?.status === 'Delivered' &&
    custDetailAfterDelivered?.status === 'Delivered'
  );

  if (allPassed) {
    console.log('\n========================================================================');
    console.log('>>> RIDER STATUS UPDATE → DB → CUSTOMER MY ORDERS/TRACKING SYNC PASSED 100%! <<<');
    console.log('========================================================================');
  } else {
    console.error('FAIL: Status synchronization verification failed.');
    process.exit(1);
  }
}

runDeliverySyncTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
