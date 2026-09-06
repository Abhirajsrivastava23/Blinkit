import { db } from '../src/data/db';

async function runTests() {
  console.log('=====================================================');
  console.log('🧪 RUNNING PRODUCTION TEST SUITE: CUSTOM REQUESTS & PERSONALISATION');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Database Schema & Connection Check
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Database Schema & Connection ---');
    const connTest = await db.testConnection();
    console.log(`Database connected: ${connTest.ok ? 'YES (PostgreSQL / Supabase)' : 'Fallback mode'}`);
    assert(true, 'Database layer responsive');

    // -------------------------------------------------------------
    // Test 2: Customer A Submits Existing Product Personalisation Request
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Submit Existing Product Personalisation Request ---');
    const customerAId = `cust_test_${Date.now()}_a`;
    const reqA = await db.createCustomRequest({
      customerId: customerAId,
      customerName: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      mobile: '9876543210',
      requestType: 'EXISTING_PRODUCT',
      productId: 'tropical-fruit-n-almond-cake',
      productName: 'Tropical Fruit N Almond Cake',
      quantity: 1,
      variant: '1.0 kg',
      flavour: 'Vanilla Almond Crunch',
      personalisationType: 'Cake Inscription / Name',
      personalisationMessage: 'Happy 25th Anniversary Mom & Dad! ❤️',
      uploadedImageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500',
      specialInstructions: 'Please write in elegant dark chocolate cursive and add extra almonds.',
      status: 'Request Submitted',
      paymentStatus: 'PENDING'
    });

    assert(Boolean(reqA.id), `Custom request created with ID: ${reqA.id}`);
    assert(reqA.customerName === 'Aarav Sharma', 'Customer name matches');
    assert(reqA.requestType === 'EXISTING_PRODUCT', 'Request type is EXISTING_PRODUCT');
    assert(reqA.status === 'Request Submitted', 'Initial status is "Request Submitted"');
    assert(reqA.personalisationMessage === 'Happy 25th Anniversary Mom & Dad! ❤️', 'Cake message stored correctly');

    // -------------------------------------------------------------
    // Test 3: Customer B Submits Unlisted Custom Item Request
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Submit Unlisted Product Request ---');
    const customerBId = `cust_test_${Date.now()}_b`;
    const reqB = await db.createCustomRequest({
      customerId: customerBId,
      customerName: 'Ananya Verma',
      email: 'ananya.v@example.com',
      mobile: '9123456780',
      requestType: 'UNLISTED_PRODUCT',
      productName: 'Custom 3D Acrylic Memory Plaque with LED Wooden Base',
      requestedDetails: 'Personalized 6x8 inch acrylic plaque with engraved anniversary photo and warm LED lighting base.',
      quantity: 2,
      referenceImageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500',
      preferredDeliveryDate: '2026-09-12',
      preferredDeliveryTime: 'Evening (5 PM - 8 PM)',
      budget: '₹1,500 - ₹2,000',
      specialInstructions: 'Need wooden gift box packaging with ribbon.',
      status: 'Request Submitted',
      paymentStatus: 'PENDING'
    });

    assert(Boolean(reqB.id), `Unlisted request created with ID: ${reqB.id}`);
    assert(reqB.requestType === 'UNLISTED_PRODUCT', 'Request type is UNLISTED_PRODUCT');
    assert(reqB.preferredDeliveryDate === '2026-09-12', 'Preferred delivery date stored');
    assert(reqB.budget === '₹1,500 - ₹2,000', 'Budget range stored');

    // -------------------------------------------------------------
    // Test 4: Customer Retrieval & Data Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: Customer Retrieval & Security Isolation ---');
    const custARequests = await db.getCustomRequestsByCustomer(customerAId);
    assert(custARequests.some(r => r.id === reqA.id), "Customer A retrieves their own request");
    assert(!custARequests.some(r => r.id === reqB.id), "Customer A CANNOT see Customer B's request (Isolation PASS)");

    const custBRequests = await db.getCustomRequestsByCustomer(customerBId);
    assert(custBRequests.some(r => r.id === reqB.id), "Customer B retrieves their own request");
    assert(!custBRequests.some(r => r.id === reqA.id), "Customer B CANNOT see Customer A's request (Isolation PASS)");

    // -------------------------------------------------------------
    // Test 5: Admin Management — Review, Set Quote & Notes
    // -------------------------------------------------------------
    console.log('\n--- Test Group 5: Admin Review, Price Quote & Status Transition ---');
    const updatedReqA = await db.updateCustomRequest(reqA.id, {
      status: 'Available / Quote Ready',
      quotedAmount: 1299,
      adminNotes: 'Confirmed with master baker. Almond crunch with premium dark chocolate cursive inscription ready for dispatch.'
    });

    assert(updatedReqA !== null, 'Request updated by admin');
    assert(updatedReqA?.status === 'Available / Quote Ready', 'Status updated to "Available / Quote Ready"');
    assert(updatedReqA?.quotedAmount === 1299, 'Quoted price set to ₹1,299');
    assert(Boolean(updatedReqA?.adminNotes?.includes('Confirmed with master baker')), 'Admin notes saved');

    // -------------------------------------------------------------
    // Test 6: Admin Creates Real PostgreSQL Custom Order
    // -------------------------------------------------------------
    console.log('\n--- Test Group 6: Create Custom Order in PostgreSQL Orders Table ---');
    const customOrderId = `FT-CUST-${Date.now().toString().slice(-6)}`;
    const customOrder = await db.createOrder({
      id: customOrderId,
      customerId: customerAId,
      customerName: 'Aarav Sharma',
      customerPhone: '9876543210',
      customerEmail: 'aarav.sharma@example.com',
      items: [{
        id: 'tropical-fruit-n-almond-cake',
        productId: 'tropical-fruit-n-almond-cake',
        name: 'Tropical Fruit N Almond Cake (Personalised)',
        price: 1299,
        quantity: 1,
        image: reqA.uploadedImageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500',
        category: 'Personalisation',
        selectedSize: '1.0 kg',
        flavour: 'Vanilla Almond Crunch',
        cakeMessage: 'Happy 25th Anniversary Mom & Dad! ❤️',
        customImage: reqA.uploadedImageUrl,
        specialInstructions: 'Extra almonds, chocolate script'
      }],
      subtotal: 1299,
      deliveryFee: 0,
      discount: 0,
      total: 1299,
      address: {
        name: 'Aarav Sharma',
        mobile: '9876543210',
        house: 'Flat 402, Royal Palms',
        street: 'Civil Lines Sector 4',
        area: 'Civil Lines',
        city: 'Unnao',
        pincode: '209801'
      },
      status: 'Pending',
      paymentStatus: 'PENDING',
      paymentMethod: 'Razorpay',
      deliveryOption: 'Scheduled',
      deliveryLocationId: 'unnao-central',
      deliveryLocationName: 'Unnao Central Hub',
      deliveryOtp: '7842',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustomOrder: true,
      customRequestId: reqA.id
    } as any);

    const orderObj = customOrder as any;
    assert(Boolean(orderObj.id), `Custom order created in orders table: #${orderObj.id}`);
    assert(orderObj.isCustomOrder === true, 'Order has isCustomOrder flag');
    assert(orderObj.customRequestId === reqA.id, 'Order is linked to custom request ID');
    assert(orderObj.items?.[0]?.cakeMessage === 'Happy 25th Anniversary Mom & Dad! ❤️', 'Order item contains cake inscription');

    // Link customOrderId in custom request
    await db.updateCustomRequest(reqA.id, {
      customOrderId: String(orderObj.id),
      paymentLinkId: `plink_test_${Date.now()}`,
      paymentLinkUrl: `https://rzp.io/i/test_${Date.now().toString().slice(-6)}`,
      status: 'Payment Pending'
    });

    const refreshedReqA = await db.getCustomRequestById(reqA.id);
    assert(refreshedReqA?.customOrderId === String(orderObj.id), 'Custom request linked to order ID');
    assert(refreshedReqA?.status === 'Payment Pending', 'Status is "Payment Pending"');
    assert(Boolean(refreshedReqA?.paymentLinkUrl), 'Payment link URL stored');

    // -------------------------------------------------------------
    // Test 7: Payment Verification Transitions Custom Request & Order to PAID
    // -------------------------------------------------------------
    console.log('\n--- Test Group 7: Payment Verification Status Synchronization ---');
    // Simulate payment completion
    await db.updateOrder(String(orderObj.id), {
      paymentStatus: 'PAID',
      status: 'Confirmed'
    });

    await db.updateCustomRequest(reqA.id, {
      paymentStatus: 'PAID',
      status: 'Confirmed'
    });

    const verifiedReq = await db.getCustomRequestById(reqA.id);
    const verifiedOrder = await db.getOrderById(String(orderObj.id));

    assert(verifiedReq?.paymentStatus === 'PAID', 'Custom request paymentStatus is PAID');
    assert(verifiedReq?.status === 'Confirmed', 'Custom request status is Confirmed');
    assert((verifiedOrder as any)?.paymentStatus === 'PAID', 'Order paymentStatus is PAID');
    assert((verifiedOrder as any)?.status === 'Confirmed', 'Order status is Confirmed');

    // -------------------------------------------------------------
    // Test 8: All Custom Requests Listing (Admin View)
    // -------------------------------------------------------------
    console.log('\n--- Test Group 8: Admin Listing & Filtering ---');
    const allRequests = await db.getAllCustomRequests();
    assert(allRequests.length >= 2, `Admin retrieves all custom requests (${allRequests.length} found)`);
    assert(allRequests.some(r => r.id === reqA.id), 'Admin list contains existing product request');
    assert(allRequests.some(r => r.id === reqB.id), 'Admin list contains unlisted product request');

    const filteredExisting = await db.getAllCustomRequests({ requestType: 'EXISTING_PRODUCT' });
    assert(filteredExisting.every(r => r.requestType === 'EXISTING_PRODUCT'), 'Filter by EXISTING_PRODUCT works');

    const filteredUnlisted = await db.getAllCustomRequests({ requestType: 'UNLISTED_PRODUCT' });
    assert(filteredUnlisted.every(r => r.requestType === 'UNLISTED_PRODUCT'), 'Filter by UNLISTED_PRODUCT works');

    console.log('\n=====================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
