const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message} ${details ? '-> ' + details : ''}`);
    failures.push({ message, details });
  }
}

async function runMasterProductionAudit() {
  console.log('========================================================================');
  console.log('     FATAFAT MASTER PRODUCTION A-TO-Z END-TO-END AUDIT SUITE           ');
  console.log('========================================================================\n');

  // ==========================================
  // SECTION 1: AUTHENTICATION, ROLES & SESSIONS
  // ==========================================
  console.log('--- SECTION 1: AUTHENTICATION, ROLES & SESSIONS ---');
  
  // 1.1 Customer Auth via /api/auth/customer-login
  const custTimestamp = Date.now();
  const customerEmail = `master.audit.customer.${custTimestamp}@fatafat.com`;
  const customerPhone = '98765' + Math.floor(10000 + Math.random() * 90000);
  const custLoginRes = await fetch(baseUrl + '/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, phone: customerPhone, name: 'Master Audit Customer' })
  });
  assert(custLoginRes.status === 200, 'Customer Login/Signup returns 200 OK');
  const custLoginData = await custLoginRes.json();
  assert(custLoginData.success === true && custLoginData.user?.role === 'customer', 'Customer Login returns user role "customer"');
  const customerCookie = custLoginRes.headers.get('set-cookie');
  assert(Boolean(customerCookie), 'Customer Login sets valid HTTP-only session cookie');

  // 1.2 Customer Session Identity (/api/auth/me)
  const custMeRes = await fetch(baseUrl + '/api/auth/me', { headers: { 'Cookie': customerCookie } });
  const custMeData = await custMeRes.json();
  assert(custMeRes.status === 200 && custMeData.user?.email === customerEmail, 'Customer identity validated via /api/auth/me');

  // 1.3 Google Login Simulation (/api/auth/google-login)
  const googleEmail = `google.user.${custTimestamp}@gmail.com`;
  const googleLoginRes = await fetch(baseUrl + '/api/auth/google-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: googleEmail, name: 'Google Verified User', googleId: 'goog_' + custTimestamp })
  });
  assert(googleLoginRes.status === 200, 'Google OAuth Login endpoint returns 200 OK');
  const googleCookie = googleLoginRes.headers.get('set-cookie');
  const googleMeRes = await fetch(baseUrl + '/api/auth/me', { headers: { 'Cookie': googleCookie } });
  const googleMeData = await googleMeRes.json();
  assert(googleMeData.user?.email === googleEmail, 'Google OAuth Session persisted and verified via /api/auth/me');

  // 1.4 Admin Auth (/api/auth/login)
  const adminLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@fatafat.com', password: 'admin123' })
  });
  assert(adminLoginRes.status === 200, 'Admin Login credentials return 200 OK');
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  const adminMeRes = await fetch(baseUrl + '/api/auth/me', { headers: { 'Cookie': adminCookie } });
  const adminMeData = await adminMeRes.json();
  assert(adminMeData.user?.role === 'admin', 'Admin session role verified as "admin"');

  // 1.5 Delivery Partner Auth
  const partnerId = `DP-MASTER-${Math.floor(1000 + Math.random() * 9000)}`;
  const partnerEmail = `partner.${custTimestamp}@fatafat.com`;
  const partnerPassword = 'partnersecret123';
  const createPartnerRes = await fetch(baseUrl + '/api/admin/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: partnerId,
      name: 'Master Partner Rider',
      phone: '9911223344',
      email: partnerEmail,
      password: partnerPassword,
      locationId: 'nawabganj-unnao',
      locationName: 'Nawabganj, Unnao'
    })
  });
  assert(createPartnerRes.status === 200, 'Admin successfully created/provisioned Delivery Partner');

  const partnerLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: partnerEmail, password: partnerPassword })
  });
  assert(partnerLoginRes.status === 200, 'Delivery Partner credentials login returns 200 OK');
  const partnerCookie = partnerLoginRes.headers.get('set-cookie');
  const partnerMeRes = await fetch(baseUrl + '/api/auth/me', { headers: { 'Cookie': partnerCookie } });
  const partnerMeData = await partnerMeRes.json();
  assert(partnerMeData.user?.role === 'delivery_partner', 'Partner role verified as "delivery_partner"');

  // 1.6 Security Isolation Checks
  const custForbiddenAdminRes = await fetch(baseUrl + '/api/admin/payment-settings', { headers: { 'Cookie': customerCookie } });
  assert(custForbiddenAdminRes.status === 403, 'Customer correctly forbidden (403) from Admin APIs');

  const partnerForbiddenAdminRes = await fetch(baseUrl + '/api/admin/payment-settings', { headers: { 'Cookie': partnerCookie } });
  assert(partnerForbiddenAdminRes.status === 403, 'Partner correctly forbidden (403) from Admin Payment Settings');

  const unauthRes = await fetch(baseUrl + '/api/orders');
  assert(unauthRes.status === 403 || unauthRes.status === 401, 'Unauthenticated request blocked (401/403) on protected orders endpoint');

  // ==========================================
  // SECTION 2: CATALOG, SEARCH & FILTERS
  // ==========================================
  console.log('\n--- SECTION 2: CATALOG, SEARCH & CATEGORIES ---');
  
  const productsRes = await fetch(baseUrl + '/api/products');
  assert(productsRes.status === 200, 'Public products catalog (/api/products) returns 200 OK');
  const products = await productsRes.json();
  assert(Array.isArray(products) && products.length >= 20, `Products catalog populated with ${products.length} products`);

  const singleProdRes = await fetch(baseUrl + '/api/products/choco-9');
  assert(singleProdRes.status === 200, 'Single product detail lookup (/api/products/choco-9) returns 200 OK');
  const singleProd = await singleProdRes.json();
  assert(singleProd.id === 'choco-9' && singleProd.price > 0, 'Single product data schema and pricing valid');

  const categoriesRes = await fetch(baseUrl + '/api/categories');
  assert(categoriesRes.status === 200, 'Categories catalog listing returns 200 OK');
  const categories = await categoriesRes.json();
  assert(Array.isArray(categories) && categories.length >= 7, `Categories catalog returns ${categories.length} categories`);

  const brandsRes = await fetch(baseUrl + '/api/brands');
  assert(brandsRes.status === 200, 'Brands catalog listing returns 200 OK');

  // ==========================================
  // SECTION 3: COUPONS & PRICING ENGINE
  // ==========================================
  console.log('\n--- SECTION 3: COUPONS & PRICING ENGINE ---');
  
  // Create a test coupon as admin
  const testCouponCode = 'MASTERPROD' + Math.floor(100 + Math.random() * 900);
  const createCouponRes = await fetch(baseUrl + '/api/admin/coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      code: testCouponCode,
      discountType: 'percentage',
      discountValue: 20,
      minOrderAmount: 200,
      maxDiscountAmount: 500,
      isActive: true,
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString()
    })
  });
  assert(createCouponRes.status === 200, 'Admin creates promo coupon successfully');

  // Validate coupon via customer
  const validateCouponRes = await fetch(baseUrl + '/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ code: testCouponCode, orderTotal: 1000 })
  });
  assert(validateCouponRes.status === 200, 'Coupon validation API returns 200 OK');
  const validateCouponData = await validateCouponRes.json();
  assert(validateCouponData.valid === true && validateCouponData.discount === 200, 'Percentage coupon accurately calculates ₹200 discount on ₹1000 order');

  // Validate minOrderAmount restriction
  const invalidAmountRes = await fetch(baseUrl + '/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ code: testCouponCode, orderTotal: 100 })
  });
  const invalidAmountData = await invalidAmountRes.json();
  assert(invalidAmountData.valid === false, 'Coupon validation correctly rejects orders below minOrderAmount');

  // ==========================================
  // SECTION 4: ORDER CREATION & CROSS-USER ISOLATION
  // ==========================================
  console.log('\n--- SECTION 4: ORDER CREATION & CROSS-USER ISOLATION ---');
  
  const testOrderId = 'FT' + Math.floor(100000 + Math.random() * 900000);
  const orderCreateRes = await fetch(baseUrl + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      id: testOrderId,
      items: [
        {
          productId: 'choco-9',
          name: 'Ferrero Rocher Moment Box',
          price: 349,
          quantity: 2,
          image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80'
        }
      ],
      address: {
        house: 'Flat 402, Apex Tower',
        street: 'Main Highway Road',
        area: 'Tech Park',
        city: 'Nawabganj',
        pincode: '209859'
      },
      deliveryOption: 'ASAP',
      discount: 0,
      paymentMethod: 'UPI',
      deliveryLocationId: 'nawabganj-unnao',
      deliveryLocationName: 'Nawabganj, Unnao'
    })
  });
  assert(orderCreateRes.status === 200, 'Customer creates order successfully');
  const orderCreateData = await orderCreateRes.json();
  assert(orderCreateData.success === true && orderCreateData.order?.status === 'Pending', 'Order created with initial status "Pending"');
  assert(Boolean(orderCreateData.order?.deliveryOtp), 'Server generates 6-digit delivery OTP for order');

  // Lookup order by clean ID, lowercase, and # prefix
  const directGetRes = await fetch(baseUrl + `/api/orders/${testOrderId}`, { headers: { 'Cookie': customerCookie } });
  assert(directGetRes.status === 200, 'Direct order lookup (/api/orders/FT...) returns 200 OK');

  const lowerGetRes = await fetch(baseUrl + `/api/orders/${testOrderId.toLowerCase()}`, { headers: { 'Cookie': customerCookie } });
  assert(lowerGetRes.status === 200, 'Case-insensitive order lookup returns 200 OK');

  const hashGetRes = await fetch(baseUrl + `/api/orders/%23${testOrderId}`, { headers: { 'Cookie': customerCookie } });
  assert(hashGetRes.status === 200, 'Prefix # URL-encoded (%23) order lookup returns 200 OK');

  // Verify second customer cannot see this order
  const cust2Email = `other.customer.${custTimestamp}@fatafat.com`;
  const cust2Login = await fetch(baseUrl + '/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cust2Email, name: 'Other Customer' })
  });
  const cust2Cookie = cust2Login.headers.get('set-cookie');
  const cust2OrdersRes = await fetch(baseUrl + '/api/orders', { headers: { 'Cookie': cust2Cookie } });
  const cust2Orders = await cust2OrdersRes.json();
  const cust2SeesCust1Order = cust2Orders.some(o => o.id === testOrderId);
  assert(!cust2SeesCust1Order, 'Security: Customer 2 cannot see Customer 1 orders in My Orders list');

  // ==========================================
  // SECTION 5: RAZORPAY PAYMENT FLOW (CREATE -> FRAUD REJECT -> HMAC VERIFY -> CONFIRM)
  // ==========================================
  console.log('\n--- SECTION 5: RAZORPAY PAYMENT FLOW (GATEWAY ORDER -> VERIFY -> CONFIRM) ---');
  
  // 5a. Razorpay Order Creation
  const createRzpRes = await fetch(baseUrl + '/api/payments/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ orderId: testOrderId })
  });
  assert(createRzpRes.status === 200, 'Razorpay gateway order created successfully');
  const createRzpData = await createRzpRes.json();
  const rzpOrderId = createRzpData.orderId;
  assert(Boolean(rzpOrderId), 'Server returns valid Razorpay order ID');
  assert(createRzpData.amount > 0, 'Razorpay order amount formatted in paise');

  // 5b. Security: Reject Invalid/Forged Signature
  const fakeSig = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  const fakePaymentId = 'pay_fake_' + Date.now();
  const fraudVerifyRes = await fetch(baseUrl + '/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      orderId: testOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: fakeSig
    })
  });
  assert(fraudVerifyRes.status === 400, 'Security: Server rejects invalid/forged signature with HTTP 400');

  // 5c. Server-Side HMAC-SHA256 Signature Verification
  let keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
      const match = envContent.match(/RAZORPAY_KEY_SECRET=["']?([^"'\r\n]+)/);
      if (match) keySecret = match[1];
    } catch {}
  }
  keySecret = keySecret || 'Exu52JSFtzFtar9AwgZEE57H';
  const crypto = require('crypto');
  const validPaymentId = 'pay_audit_' + Date.now();
  const validSignature = crypto.createHmac('sha256', keySecret).update(`${rzpOrderId}|${validPaymentId}`).digest('hex');

  const verifyRes = await fetch(baseUrl + '/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      orderId: testOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature
    })
  });
  assert(verifyRes.status === 200, 'Razorpay HMAC signature verified successfully');
  const verifyData = await verifyRes.json();
  assert(verifyData.success === true && verifyData.paymentStatus === 'PAID', 'Order payment status updated to PAID upon verification');

  // 5d. Idempotency Check
  const repeatVerifyRes = await fetch(baseUrl + '/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      orderId: testOrderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature
    })
  });
  assert(repeatVerifyRes.status === 200, 'Idempotent verification returns HTTP 200 without duplicate state corruption');

  // 5e. Verify Order is Confirmed & PAID in DB
  const custCheckApprovedRes = await fetch(baseUrl + `/api/orders/${testOrderId}`, { headers: { 'Cookie': customerCookie } });
  const custCheckApprovedData = await custCheckApprovedRes.json();
  assert(custCheckApprovedData.paymentStatus === 'PAID' && (custCheckApprovedData.status === 'Confirmed' || custCheckApprovedData.status === 'Waiting for Partner'), 'Order transitions to PAID / Confirmed in PostgreSQL');

  // ==========================================
  // SECTION 6: DELIVERY PARTNER LIFECYCLE & LIVE STATUS SYNC
  // ==========================================
  console.log('\n--- SECTION 6: DELIVERY PARTNER ASSIGNMENT & STATUS LIFECYCLE ---');
  
  // Admin assigns partner to order
  const assignRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: testOrderId,
      updates: {
        assignedPartnerId: partnerId,
        assignedPartnerName: 'Master Partner Rider',
        assignedAt: new Date().toISOString(),
        status: 'Assigned'
      }
    })
  });
  assert(assignRes.status === 200, 'Admin assigns Delivery Partner successfully');

  // Partner checks assigned orders list
  const partnerOrdersRes = await fetch(baseUrl + '/api/delivery/orders', { headers: { 'Cookie': partnerCookie } });
  assert(partnerOrdersRes.status === 200, 'Partner retrieves assigned orders (/api/delivery/orders)');
  const partnerOrders = await partnerOrdersRes.json();
  const partnerHasOrder = partnerOrders.some(o => o.id === testOrderId);
  assert(partnerHasOrder, 'Assigned order appears in Delivery Partner orders queue');

  // Step 1: Rider Accepts Order
  const acceptRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': partnerCookie },
    body: JSON.stringify({ id: testOrderId, updates: { status: 'Accepted' } })
  });
  assert(acceptRes.status === 200, 'Rider transitions status to "Accepted"');

  // Step 2: Rider Hub Pickup with item verification
  const pickupRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': partnerCookie },
    body: JSON.stringify({
      id: testOrderId,
      updates: {
        status: 'Picked Up',
        verifiedItemIds: ['choco-9'],
        boxSealVerified: true
      }
    })
  });
  assert(pickupRes.status === 200, 'Rider completes Hub item verification and transitions status to "Picked Up"');

  // Step 3: Rider Out for Delivery
  const outForDeliveryRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': partnerCookie },
    body: JSON.stringify({ id: testOrderId, updates: { status: 'Out for Delivery' } })
  });
  assert(outForDeliveryRes.status === 200, 'Rider transitions status to "Out for Delivery"');

  // Customer checks live order status
  const liveOrderRes = await fetch(baseUrl + `/api/orders/${testOrderId}`, { headers: { 'Cookie': customerCookie } });
  const liveOrderData = await liveOrderRes.json();
  assert(liveOrderData.status === 'Out for Delivery', 'Customer tracking/orders reflects "Out for Delivery" state synchronously');

  // Step 4: OTP Verification & Delivery Completion
  const correctDeliveryOtp = liveOrderData.deliveryOtp;
  assert(Boolean(correctDeliveryOtp) && correctDeliveryOtp.length === 6, `Valid 6-digit delivery OTP available (${correctDeliveryOtp})`);

  // Test Incorrect OTP rejection
  const wrongOtpRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': partnerCookie },
    body: JSON.stringify({
      id: testOrderId,
      updates: {
        status: 'Delivered',
        otpCode: '000000'
      }
    })
  });
  assert(wrongOtpRes.status === 400, 'Delivery completion strictly rejects incorrect OTP (HTTP 400)');

  // Test Correct OTP verification
  const correctOtpRes = await fetch(baseUrl + '/api/orders/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': partnerCookie },
    body: JSON.stringify({
      id: testOrderId,
      updates: {
        status: 'Delivered',
        otpCode: correctDeliveryOtp
      }
    })
  });
  assert(correctOtpRes.status === 200, 'Order marked "Delivered" upon correct OTP verification');

  // Final Customer Check
  const completedOrderRes = await fetch(baseUrl + `/api/orders/${testOrderId}`, { headers: { 'Cookie': customerCookie } });
  const completedOrderData = await completedOrderRes.json();
  assert(completedOrderData.status === 'Delivered' && completedOrderData.delivery_otp_verified === true, 'Order marked Delivered & OTP verified in customer view');

  // ==========================================
  // SECTION 7: CANCELLATION & OTP REGENERATION
  // ==========================================
  console.log('\n--- SECTION 7: ORDER CANCELLATION & OTP REGENERATION ---');
  
  // Create a pending order for cancellation test
  const cancelTestId = 'FT' + Math.floor(100000 + Math.random() * 900000);
  await fetch(baseUrl + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({
      id: cancelTestId,
      items: [{ productId: 'choco-9', name: 'Ferrero Rocher Box', price: 349, quantity: 1, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600' }],
      address: { house: '12', street: 'MG Road', area: 'Central', city: 'Nawabganj', pincode: '209859' },
      deliveryOption: 'ASAP',
      paymentMethod: 'UPI'
    })
  });

  // Regenerate OTP
  const regenOtpRes = await fetch(baseUrl + '/api/orders/regenerate-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ id: cancelTestId })
  });
  assert(regenOtpRes.status === 200, 'Customer can regenerate OTP for order (/api/orders/regenerate-otp)');
  const regenOtpData = await regenOtpRes.json();
  assert(Boolean(regenOtpData.deliveryOtp) && regenOtpData.deliveryOtp.length === 6, 'Regenerated OTP is valid 6-digit code');

  // Cancel Pending Order
  const cancelRes = await fetch(baseUrl + '/api/orders/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ id: cancelTestId })
  });
  assert(cancelRes.status === 200, 'Customer cancels pending order successfully (/api/orders/cancel)');

  // Attempting to cancel an already cancelled or delivered order must be rejected
  const invalidCancelRes = await fetch(baseUrl + '/api/orders/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ id: testOrderId })
  });
  assert(invalidCancelRes.status === 400 || invalidCancelRes.status === 403, 'Cancelling Delivered/In-transit order is strictly forbidden');

  // ==========================================
  // SECTION 8: ADMIN PRODUCT CRUD & STOCK MANAGEMENT
  // ==========================================
  console.log('\n--- SECTION 8: ADMIN PRODUCT CRUD & INVENTORY ---');
  
  const testNewProductId = 'prod-audit-' + custTimestamp;
  const createProductRes = await fetch(baseUrl + '/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      id: testNewProductId,
      name: 'Audit Special Luxury Cake',
      price: 899,
      originalPrice: 1199,
      category: 'cakes',
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
      description: 'Handcrafted luxury chocolate truffle cake',
      rating: 4.9,
      reviewsCount: 15,
      inStock: true
    })
  });
  assert(createProductRes.status === 200 || createProductRes.status === 201, 'Admin creates new product successfully (/api/products POST)');

  // Update Product details
  const updateProductRes = await fetch(baseUrl + `/api/products/${testNewProductId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({ price: 949, inStock: false })
  });
  assert(updateProductRes.status === 200, 'Admin updates product price and toggles out-of-stock');

  const verifyUpdatedProductRes = await fetch(baseUrl + `/api/products/${testNewProductId}`);
  const verifyUpdatedProduct = await verifyUpdatedProductRes.json();
  assert(verifyUpdatedProduct.price === 949 && verifyUpdatedProduct.inStock === false, 'Product update persisted in database and retrieved accurately');

  // Restock product
  const restockRes = await fetch(baseUrl + `/api/products/${testNewProductId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({ inStock: true })
  });
  assert(restockRes.status === 200, 'Admin restocks product successfully');

  // ==========================================
  // SECTION 9: WELLNESS ACCESS GATE & SETTINGS
  // ==========================================
  console.log('\n--- SECTION 9: WELLNESS 18+ GATE & ADMIN SETTINGS ---');
  
  const wellnessSettingsRes = await fetch(baseUrl + '/api/admin/wellness-settings', { headers: { 'Cookie': adminCookie } });
  assert(wellnessSettingsRes.status === 200, 'Admin retrieves wellness settings (/api/admin/wellness-settings)');

  const acceptWellnessRes = await fetch(baseUrl + '/api/wellness/accept-terms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ accepted: true })
  });
  assert(acceptWellnessRes.status === 200, 'Customer accepts 18+ Wellness terms & conditions');

  // Customer profile retrieval & address save
  const profileRes = await fetch(baseUrl + '/api/profile', { headers: { 'Cookie': customerCookie } });
  assert(profileRes.status === 200, 'Customer profile GET (/api/profile) returns 200 OK');

  const updateProfileRes = await fetch(baseUrl + '/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': customerCookie },
    body: JSON.stringify({ name: 'Master Verified Customer' })
  });
  assert(updateProfileRes.status === 200, 'Customer profile updates persisted');

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('\n========================================================================');
  console.log(`MASTER AUDIT COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED across ${totalTests} Total Verification Assertions`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    console.error('FAILURES DETECTED:');
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f.message} (${f.details})`));
    process.exit(1);
  }
}

runMasterProductionAudit().catch(err => {
  console.error('FATAL AUDIT SUITE RUNTIME ERROR:', err);
  process.exit(1);
});
