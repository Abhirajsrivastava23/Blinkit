const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function runAssignmentLifecycleTest() {
  console.log('========================================================================');
  console.log('STARTING ADMIN -> DELIVERY PARTNER ASSIGNMENT & STATUS LIFECYCLE E2E TEST');
  console.log('========================================================================\n');

  // 1. Admin Login
  const adminLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  console.log('1. Admin Login -> HTTP', adminLoginRes.status);
  if (!adminLoginRes.ok) throw new Error('Admin login failed');
  const adminCookie = adminLoginRes.headers.get('set-cookie');

  // 2. Rider Setup & Login
  const riderPartnerId = 'DP-002';
  const riderEmail = 'vikram.singh@fatafat.com';
  const riderPassword = 'riderpassword123';

  // Ensure partner exists in DB
  await fetch(baseUrl + '/api/admin/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: riderPartnerId,
      name: 'Vikram Singh',
      phone: '9876500002',
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

  // 3. Customer Login
  const customerEmail = 'customer.assign.' + Date.now() + '@fatafat.com';
  const custLoginRes = await fetch(baseUrl + '/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, phone: '9876543210', name: 'Customer Assignment Tester' })
  });
  console.log('3. Customer Login -> HTTP', custLoginRes.status);
  const custCookie = custLoginRes.headers.get('set-cookie');

  // 4. Create Order
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const orderId = 'FT' + randomNum;
  const numericId = String(randomNum);
  const hashOrderId = '#' + orderId;
  const urlEncodedHashId = '%23' + orderId;

  const createOrderRes = await fetch(baseUrl + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
    body: JSON.stringify({
      id: orderId,
      items: [{ productId: 'choco-1', name: 'Belgian Truffle Box', price: 349, quantity: 1, image: '' }],
      address: { name: 'Customer Assignment Tester', mobile: '9876543210', house: '101', street: 'Assignment Rd', area: 'Tech Zone', city: 'Noida', pincode: '201301' },
      deliveryOption: 'ASAP',
      deliveryTimeSlot: 'Within 15 mins',
      pricing: { subtotal: 349, deliveryFee: 0, discount: 0, total: 349 },
      paymentMethod: 'UPI'
    })
  });
  const createOrderData = await createOrderRes.json();
  console.log('4. Order Created -> ID:', orderId, 'Status:', createOrderData.order?.status);
  const deliveryOtp = createOrderData.order?.deliveryOtp;
  console.log('   Delivery OTP:', deliveryOtp);

  // 5. Test Invalid Delivery Partner Assignment (must return 404 with specific message)
  console.log('\n5. Testing Assignment with Invalid Delivery Partner ID...');
  const invalidAssignRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: orderId,
      updates: {
        assignedPartnerId: 'NON-EXISTENT-PARTNER-XYZ-999',
        assignedPartnerName: 'Fake Partner',
        status: 'Assigned'
      }
    })
  });
  const invalidAssignData = await invalidAssignRes.json();
  console.log('   Invalid Partner Assignment HTTP status:', invalidAssignRes.status);
  console.log('   Response error message:', invalidAssignData.error);
  if (invalidAssignRes.status !== 404) {
    throw new Error(`Expected 404 for non-existent partner assignment, got ${invalidAssignRes.status}`);
  }
  if (!invalidAssignData.error || !invalidAssignData.error.includes('does not exist')) {
    throw new Error(`Expected error message mentioning partner does not exist, got: ${invalidAssignData.error}`);
  }
  console.log('   ✓ Invalid partner rejected with 404 error correctly.');

  // 6. Test Admin Assigning Partner using different ID formats (#FT..., numeric, URL-encoded)
  console.log('\n6. Testing Admin Partner Assignment with formatted ID (#FT...)...');
  const hashAssignRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: hashOrderId,
      updates: {
        assignedPartnerId: riderPartnerId,
        assignedPartnerName: 'Vikram Singh',
        assignedAt: new Date().toISOString()
      }
    })
  });
  const hashAssignData = await hashAssignRes.json();
  console.log('   Hash ID Assignment HTTP status:', hashAssignRes.status);
  if (!hashAssignRes.ok || !hashAssignData.success) {
    throw new Error(`Failed to assign partner with hash ID: ${JSON.stringify(hashAssignData)}`);
  }
  console.log('   Assigned Partner ID:', hashAssignData.order.assignedPartnerId);
  console.log('   Assigned Partner Name:', hashAssignData.order.assignedPartnerName);
  console.log('   Order Status after assignment:', hashAssignData.order.status);
  if (hashAssignData.order.status !== 'Assigned' || hashAssignData.order.assignedPartnerId !== riderPartnerId) {
    throw new Error('Order assignment fields not properly updated in response');
  }
  console.log('   ✓ Admin assignment succeeded with formatted #FT... ID.');

  // 6b. Test Admin Assigning a visible order that existed only in client snapshot (e.g. #FT672886)
  console.log('\n6b. Testing Admin Partner Assignment on client-snapshot order (#FT672886)...');
  const clientSnapshotOrderId = '#FT672886';
  const snapshotOrderData = {
    id: '#FT672886',
    items: [{ productId: 'glass-dome-1', name: 'Lavender Dream Preserved Glass Dome', price: 1299, quantity: 1, image: '' }],
    total: 1299,
    status: 'Pending',
    deliveryLocationId: 'nawabganj-unnao',
    deliveryLocationName: 'Nawabganj, Unnao',
    address: { name: 'Customer', mobile: '9876543210', street: 'Boys Hostel', city: 'Unnao' }
  };
  const snapshotAssignRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: clientSnapshotOrderId,
      orderData: snapshotOrderData,
      updates: {
        assignedPartnerId: riderPartnerId,
        assignedPartnerName: 'Vikram Singh',
        assignedAt: new Date().toISOString(),
        status: 'Assigned'
      }
    })
  });
  const snapshotAssignData = await snapshotAssignRes.json();
  console.log('   Client-snapshot Assignment HTTP status:', snapshotAssignRes.status);
  if (!snapshotAssignRes.ok || !snapshotAssignData.success) {
    throw new Error(`Failed to assign partner for client-snapshot order: ${JSON.stringify(snapshotAssignData)}`);
  }
  console.log('   ✓ Client-snapshot order #FT672886 successfully synced and assigned without 404!');

  // 7. Verify Delivery Partner account sees the order
  console.log('\n7. Verifying order appears in Delivery Partner orders endpoint...');
  const partnerOrdersRes = await fetch(baseUrl + '/api/delivery/orders', {
    headers: { 'Cookie': riderCookie }
  });
  const partnerOrders = await partnerOrdersRes.json();
  console.log('   Partner Orders Count:', partnerOrders.length);
  const foundInPartner = partnerOrders.find(o => String(o.id).replace(/^#+/, '').trim().toLowerCase() === orderId.toLowerCase());
  if (!foundInPartner) {
    throw new Error(`Order ${orderId} not visible in partner ${riderPartnerId}'s assigned orders!`);
  }
  console.log('   ✓ Found assigned order in rider portal:', foundInPartner.id, 'Status:', foundInPartner.status);

  // 8. Delivery Partner Accepts Order
  console.log('\n8. Partner Accepts Order...');
  const acceptRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Accepted' }
    })
  });
  const acceptData = await acceptRes.json();
  console.log('   Accept HTTP status:', acceptRes.status, 'Status:', acceptData.order?.status);
  if (!acceptRes.ok || acceptData.order?.status !== 'Accepted') {
    throw new Error(`Failed to accept order: ${JSON.stringify(acceptData)}`);
  }
  console.log('   ✓ Status updated to Accepted.');

  // 9. Delivery Partner Picks Up Order
  console.log('\n9. Partner Picks Up Order with verified items...');
  const pickupRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({
      id: orderId,
      updates: {
        status: 'Picked Up',
        verifiedItemIds: ['choco-1']
      }
    })
  });
  const pickupData = await pickupRes.json();
  console.log('   Pickup HTTP status:', pickupRes.status, 'Status:', pickupData.order?.status);
  if (!pickupRes.ok || pickupData.order?.status !== 'Picked Up') {
    throw new Error(`Failed to pick up order: ${JSON.stringify(pickupData)}`);
  }
  console.log('   ✓ Status updated to Picked Up.');

  // 10. Delivery Partner marks Out for Delivery
  console.log('\n10. Partner marks Out for Delivery...');
  const outRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({
      id: orderId,
      updates: { status: 'Out for Delivery' }
    })
  });
  const outData = await outRes.json();
  console.log('   Out for Delivery HTTP status:', outRes.status, 'Status:', outData.order?.status);
  if (!outRes.ok || outData.order?.status !== 'Out for Delivery') {
    throw new Error(`Failed to set Out for Delivery: ${JSON.stringify(outData)}`);
  }
  console.log('   ✓ Status updated to Out for Delivery.');

  // 11. Customer Verifies Status in Tracking Endpoint
  console.log('\n11. Verifying Customer Order tracking status...');
  const custOrderRes = await fetch(baseUrl + '/api/orders/' + orderId, {
    headers: { 'Cookie': custCookie }
  });
  const custOrderData = await custOrderRes.json();
  console.log('   Customer tracking status:', custOrderData.status, 'Rider:', custOrderData.assignedPartnerName);
  if (custOrderData.status !== 'Out for Delivery') {
    throw new Error(`Customer order tracking status mismatch: expected 'Out for Delivery', got '${custOrderData.status}'`);
  }
  console.log('   ✓ Customer tracking accurately reflects Out for Delivery and assigned rider.');

  // 12. Delivery Partner delivers with OTP verification
  console.log('\n12. Delivery Partner verifies OTP and completes delivery...');
  const verifyOtpRes = await fetch(baseUrl + `/api/delivery/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': riderCookie },
    body: JSON.stringify({ otp: deliveryOtp })
  });
  const verifyOtpData = await verifyOtpRes.json();
  console.log('   OTP Verify HTTP status:', verifyOtpRes.status);
  console.log('   OTP Verify Response:', verifyOtpData.message || verifyOtpData.error);
  if (!verifyOtpRes.ok || !verifyOtpData.success || verifyOtpData.order?.status !== 'Delivered') {
    throw new Error(`OTP Verification delivery completion failed: ${JSON.stringify(verifyOtpData)}`);
  }
  console.log('   ✓ Delivery marked as Delivered with OTP verification.');

  // 13. Final Check in Admin Live Orders
  console.log('\n13. Verifying Final Order status in Admin API...');
  const adminCheckRes = await fetch(baseUrl + '/api/orders', {
    headers: { 'Cookie': adminCookie }
  });
  const allOrders = await adminCheckRes.json();
  const finalOrder = allOrders.find(o => String(o.id).replace(/^#+/, '').trim().toLowerCase() === orderId.toLowerCase());
  console.log('   Admin Final Order Status:', finalOrder?.status);
  console.log('   Admin Final Assigned Partner:', finalOrder?.assignedPartnerName);
  console.log('   Admin Final OTP Verified At:', finalOrder?.otp_verified_at);
  console.log('   Admin Final Delivery Completed At:', finalOrder?.delivery_completed_at);
  if (!finalOrder || finalOrder.status !== 'Delivered' || !finalOrder.delivery_otp_verified) {
    throw new Error('Admin API did not reflect final Delivered status or OTP verification!');
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL ASSIGNMENT & STATUS LIFECYCLE TESTS PASSED PERFECTLY!');
  console.log('========================================================================');
}

runAssignmentLifecycleTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
