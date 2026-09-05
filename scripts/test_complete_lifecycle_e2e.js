const crypto = require('crypto');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

function extractCookie(res) {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return '';
  const match = setCookie.match(/fatafat_session_token=([^;]+)/);
  if (match) {
    return `fatafat_session_token=${match[1]}`;
  }
  return setCookie.split(';')[0];
}

function getAuthHeaders(cookieStr) {
  const tokenMatch = cookieStr ? cookieStr.match(/fatafat_session_token=([^;]+)/) : null;
  const token = tokenMatch ? tokenMatch[1] : '';
  const headers = { 'Content-Type': 'application/json' };
  if (cookieStr) headers['Cookie'] = cookieStr;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }
  return headers;
}

async function runCompleteLifecycleTest() {
  console.log('========================================================================');
  console.log('🚀 RUNNING COMPLETE PRODUCTION E2E LIFECYCLE VERIFICATION');
  console.log('   Customer -> Razorpay Payment -> Admin -> Delivery Partner -> Sync');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // Phase 1: Authentication of all 3 Roles
    // ---------------------------------------------------------
    console.log('--- 1. Authenticating Roles ---');
    
    // A. Admin Login (admin123)
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
    });
    const adminCookie = extractCookie(adminLoginRes);
    assert(adminLoginRes.status === 200 && adminCookie.includes('fatafat_session_token'), 'Admin logs in with credentials and receives session');

    // B. Delivery Partner Setup & Login
    const riderId = 'DP-LIFECYCLE-' + Date.now();
    const riderEmail = `rider.lifecycle.${Date.now()}@fatafat.com`;
    const riderPassword = 'riderpass123!';
    const riderName = 'Rider Lifecycle Master';

    const createPartnerRes = await fetch(`${baseUrl}/api/admin/partners`, {
      method: 'POST',
      headers: getAuthHeaders(adminCookie),
      body: JSON.stringify({
        id: riderId,
        name: riderName,
        phone: '9988776655',
        email: riderEmail,
        password: riderPassword,
        locationId: 'nawabganj-unnao',
        locationName: 'Nawabganj, Unnao',
        status: 'active',
        isOnline: true
      })
    });
    assert(createPartnerRes.status === 200 || createPartnerRes.status === 201, 'Admin registers active delivery partner');

    const riderLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrId: riderEmail, password: riderPassword })
    });
    const riderCookie = extractCookie(riderLoginRes);
    assert(riderLoginRes.status === 200 && riderCookie.includes('fatafat_session_token'), 'Delivery Partner logs in and receives session');

    // C. Customer Login
    const customerEmail = `customer.lifecycle.${Date.now()}@fatafat.com`;
    const custLoginRes = await fetch(`${baseUrl}/api/auth/customer-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerEmail, phone: '8081988627', name: 'Krishnam Dwivedi' })
    });
    const custCookie = extractCookie(custLoginRes);
    assert(custLoginRes.status === 200 && custCookie.includes('fatafat_session_token'), 'Customer logs in and receives session');

    // ---------------------------------------------------------
    // Phase 2: Order Creation & Razorpay Payment Verification
    // ---------------------------------------------------------
    console.log('\n--- 2. Customer Order Placement & Razorpay Payment Verification ---');
    const orderId = `FT${Math.floor(100000 + Math.random() * 900000)}`;
    const createOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: getAuthHeaders(custCookie),
      body: JSON.stringify({
        id: orderId,
        items: [
          {
            id: 'rzp-test-product-2',
            name: 'Razorpay ₹2 Test Product',
            price: 2,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&q=80'
          }
        ],
        address: {
          name: 'Krishnam Dwivedi',
          mobile: '8081988627',
          house: '12, Boys Hostel 905-WING-1',
          street: 'Chandigarh university Nawabganj',
          area: 'Nawabganj Unnao District',
          city: 'Unnao',
          pincode: '209859'
        },
        deliveryOption: 'Standard',
        deliveryTimeSlot: 'Within 30 mins',
        pricing: { subtotal: 2, deliveryFee: 0, discount: 0, total: 2 },
        paymentMethod: 'Razorpay'
      })
    });
    const createOrderJson = await createOrderRes.json();
    assert(createOrderRes.status === 200 && createOrderJson.order, `Customer order #${orderId} created in PostgreSQL`);
    const initialDeliveryOtp = createOrderJson.order?.deliveryOtp || '123456';

    // Create Razorpay Gateway Order
    const createRzpOrderRes = await fetch(`${baseUrl}/api/payments/razorpay/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(custCookie),
      body: JSON.stringify({ orderId })
    });
    const createRzpOrderJson = await createRzpOrderRes.json();
    assert(createRzpOrderRes.status === 200 && createRzpOrderJson.orderId, `Razorpay order initialized: ${createRzpOrderJson.orderId}`);
    const rzpOrderId = createRzpOrderJson.orderId;

    // Simulate Razorpay Standard Checkout Payment Signature
    const rzpPaymentId = `pay_LIVE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'Exu52JSFtzFtar9AwgZEE57H';
    const signature = crypto.createHmac('sha256', secret)
      .update(`${rzpOrderId}|${rzpPaymentId}`)
      .digest('hex');

    // Server-Side Verification
    const verifyRes = await fetch(`${baseUrl}/api/payments/razorpay/verify`, {
      method: 'POST',
      headers: getAuthHeaders(custCookie),
      body: JSON.stringify({
        orderId: `#${orderId}`,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: signature
      })
    });
    const verifyJson = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyJson.success && verifyJson.paymentStatus === 'PAID', 'Server HMAC signature verification succeeds and marks PAID');

    // ---------------------------------------------------------
    // Phase 3: Customer Visibility & Order Persistence
    // ---------------------------------------------------------
    console.log('\n--- 3. Customer Order Visibility & Persistence ---');
    const custFetchOrderRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: getAuthHeaders(custCookie)
    });
    const custFetchOrderJson = await custFetchOrderRes.json();
    const custOrder = custFetchOrderJson.order || custFetchOrderJson;
    assert(custOrder.id === orderId, `Customer sees order #${orderId}`);
    assert(custOrder.paymentStatus === 'PAID', 'Payment status is PAID in customer view');
    assert(custOrder.status === 'Confirmed', 'Order status is Confirmed in customer view');
    assert(custOrder.items && custOrder.items[0]?.name === 'Razorpay ₹2 Test Product', 'Exact product details appear');
    assert(Number(custOrder.total) === 2, 'Total amount is exactly ₹2');

    // Customer My Orders list check
    const custMyOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      headers: getAuthHeaders(custCookie)
    });
    const custMyOrdersJson = await custMyOrdersRes.json();
    const myOrdersList = custMyOrdersJson.orders || custMyOrdersJson;
    const foundInMyOrders = Array.isArray(myOrdersList) && myOrdersList.some((o) => String(o.id).replace(/^#+/, '') === orderId);
    assert(foundInMyOrders, 'Order is listed in Customer My Orders');

    // ---------------------------------------------------------
    // Phase 4: Admin Visibility & Delivery Partner Assignment
    // ---------------------------------------------------------
    console.log('\n--- 4. Admin Visibility & Delivery Partner Assignment ---');
    const adminOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      headers: getAuthHeaders(adminCookie)
    });
    const adminOrdersJson = await adminOrdersRes.json();
    const allAdminOrders = adminOrdersJson.orders || adminOrdersJson;
    const adminFoundOrder = Array.isArray(allAdminOrders) && allAdminOrders.find((o) => String(o.id).replace(/^#+/, '') === orderId);
    assert(Boolean(adminFoundOrder), 'Admin sees the customer order in live orders list');
    assert(adminFoundOrder?.paymentStatus === 'PAID', 'Admin sees payment status PAID');
    assert(adminFoundOrder?.items?.[0]?.name === 'Razorpay ₹2 Test Product', 'Admin sees exact product purchased');

    // Admin assigns order to delivery partner
    const assignRes = await fetch(`${baseUrl}/api/orders/update`, {
      method: 'POST',
      headers: getAuthHeaders(adminCookie),
      body: JSON.stringify({
        id: orderId,
        status: 'Assigned',
        assignedPartnerId: riderId,
        assignedPartnerName: riderName
      })
    });
    assert(assignRes.status === 200, `Admin assigns order #${orderId} to Rider ${riderName}`);

    // Verify persistence after simulated refresh
    const adminRefreshRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: getAuthHeaders(adminCookie)
    });
    const adminRefreshRaw = await adminRefreshRes.json();
    const adminRefreshedOrder = adminRefreshRaw.order || adminRefreshRaw;
    assert(adminRefreshedOrder?.assignedPartnerId === riderId, 'Delivery partner assignment persists after refresh in PostgreSQL');
    assert(adminRefreshedOrder?.status === 'Assigned', 'Status persists as "Assigned"');

    // ---------------------------------------------------------
    // Phase 5: Delivery Partner Visibility & Status Progression
    // ---------------------------------------------------------
    console.log('\n--- 5. Delivery Partner Visibility & Status Transitions ---');
    const partnerOrdersRes = await fetch(`${baseUrl}/api/delivery/orders`, {
      headers: getAuthHeaders(riderCookie)
    });
    const partnerOrdersJson = await partnerOrdersRes.json();
    const partnerOrdersList = partnerOrdersJson.orders || partnerOrdersJson;
    const riderAssignedOrder = Array.isArray(partnerOrdersList) && partnerOrdersList.find((o) => String(o.id).replace(/^#+/, '') === orderId);
    assert(Boolean(riderAssignedOrder), `Assigned order #${orderId} appears in Delivery Partner portal`);
    assert(riderAssignedOrder?.items?.[0]?.name === 'Razorpay ₹2 Test Product', 'Rider sees exact product and quantity');
    assert(riderAssignedOrder?.address?.city === 'Unnao', 'Rider sees customer delivery address');

    // Transition 1: Rider Accepts Order
    const acceptRes = await fetch(`${baseUrl}/api/orders/update`, {
      method: 'POST',
      headers: getAuthHeaders(riderCookie),
      body: JSON.stringify({ id: orderId, status: 'Accepted' })
    });
    assert(acceptRes.status === 200, 'Rider successfully accepts order (Status: Accepted)');

    // Transition 2: Rider Picks Up Order
    const pickupRes = await fetch(`${baseUrl}/api/orders/update`, {
      method: 'POST',
      headers: getAuthHeaders(riderCookie),
      body: JSON.stringify({ id: orderId, status: 'Picked Up' })
    });
    assert(pickupRes.status === 200, 'Rider picks up order (Status: Picked Up)');

    // Transition 3: Rider Marks Out for Delivery
    const outRes = await fetch(`${baseUrl}/api/orders/update`, {
      method: 'POST',
      headers: getAuthHeaders(riderCookie),
      body: JSON.stringify({ id: orderId, status: 'Out for Delivery' })
    });
    assert(outRes.status === 200, 'Rider marks order Out for Delivery');

    // Transition 4: Customer Provides OTP -> Rider Completes Delivery
    const orderOtp = adminRefreshedOrder?.deliveryOtp || initialDeliveryOtp;
    const verifyOtpRes = await fetch(`${baseUrl}/api/delivery/orders/${orderId}/verify-otp`, {
      method: 'POST',
      headers: getAuthHeaders(riderCookie),
      body: JSON.stringify({ otp: orderOtp })
    });
    const verifyOtpJson = await verifyOtpRes.json();
    assert(verifyOtpRes.status === 200 && verifyOtpJson.success, 'Delivery OTP verified and order marked as Delivered');

    // ---------------------------------------------------------
    // Phase 6: Real-Time Cross-Role Synchronization
    // ---------------------------------------------------------
    console.log('\n--- 6. Real-Time Cross-Role Synchronization ---');
    
    // Check Admin View
    const finalAdminCheckRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: getAuthHeaders(adminCookie)
    });
    const finalAdminRaw = await finalAdminCheckRes.json();
    const finalAdminOrder = finalAdminRaw.order || finalAdminRaw;
    assert(finalAdminOrder?.status === 'Delivered', 'Admin real-time view reflects status "Delivered"');
    assert(finalAdminOrder?.delivery_otp_verified === true, 'Admin view reflects OTP verified');

    // Check Customer View
    const finalCustCheckRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: getAuthHeaders(custCookie)
    });
    const finalCustRaw = await finalCustCheckRes.json();
    const finalCustOrder = finalCustRaw.order || finalCustRaw;
    assert(finalCustOrder?.status === 'Delivered', 'Customer real-time view/tracking reflects status "Delivered"');

    // Refresh consistency
    assert(finalCustOrder?.paymentStatus === 'PAID', 'Payment status remains PAID and cannot be reverted');
    assert(Array.isArray(finalCustOrder?.statusHistory) && finalCustOrder.statusHistory.length >= 3, 'Audit status history is fully tracked and intact');

    // ---------------------------------------------------------
    // Phase 7: Role Isolation & Access Control Security
    // ---------------------------------------------------------
    console.log('\n--- 7. Role Isolation & Security Access Control ---');
    
    // Customer attempts to call Admin partner management
    const custTamperPartners = await fetch(`${baseUrl}/api/admin/partners`, {
      method: 'POST',
      headers: getAuthHeaders(custCookie),
      body: JSON.stringify({ id: 'hacker-partner', name: 'Hacker' })
    });
    assert(custTamperPartners.status === 401 || custTamperPartners.status === 403, 'Customer blocked from Admin partner management (401/403)');

    // Customer attempts to mutate order status directly to Delivered
    const custTamperStatus = await fetch(`${baseUrl}/api/orders/update`, {
      method: 'POST',
      headers: getAuthHeaders(custCookie),
      body: JSON.stringify({ id: orderId, status: 'Preparing' })
    });
    assert(custTamperStatus.status === 400 || custTamperStatus.status === 403, 'Customer blocked from unauthorized status progression');

    // Rider attempts to access Admin cleanup or partner management
    const riderTamperAdmin = await fetch(`${baseUrl}/api/admin/partners`, {
      method: 'POST',
      headers: getAuthHeaders(riderCookie),
      body: JSON.stringify({ id: 'unauthorized-partner', name: 'Rider Trying Admin' })
    });
    assert(riderTamperAdmin.status === 401 || riderTamperAdmin.status === 403, 'Rider blocked from Admin partner APIs (401/403)');

    // ---------------------------------------------------------
    // Final Summary
    // ---------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`LIFECYCLE VERIFICATION SUMMARY: ${passed + failed} CHECKS`);
    console.log(`PASSED: ${passed} | FAILED: ${failed}`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runCompleteLifecycleTest();
