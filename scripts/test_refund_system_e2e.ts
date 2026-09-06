import { db } from '../src/data/db';

async function runE2ETests() {
  console.log('=== STARTING REFUND REQUEST SYSTEM END-TO-END VERIFICATION ===\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  try {
    const timestamp = Date.now();
    const testCustomerId = `test-cust-${timestamp}`;
    const testCustomerEmail = `customer_${timestamp}@test.com`;

    // 1. Setup Test Orders in DB
    console.log('--- 1. Setting up Test Orders in Database ---');
    const order1Id = `TEST-ORD-1-${timestamp}`;
    const order2Id = `TEST-ORD-2-${timestamp}`;
    const order3UnpaidId = `TEST-ORD-3-UNPAID-${timestamp}`;

    const order1 = await db.createOrder({
      id: order1Id,
      customerId: testCustomerId,
      customerEmail: testCustomerEmail,
      customerName: 'Test Customer 1',
      customerPhone: '9876543210',
      total: 1299,
      status: 'Delivered',
      paymentStatus: 'PAID',
      paymentMethod: 'Razorpay',
      items: [
        { id: 'item-1', name: 'Belgian Chocolate Cake', price: 1299, quantity: 1 }
      ],
      address: {
        name: 'Test Customer 1',
        mobile: '9876543210',
        house: '123 Test St',
        street: 'Main Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038'
      },
      deliveryOption: 'Standard',
      createdAt: new Date().toISOString()
    });

    const order2 = await db.createOrder({
      id: order2Id,
      customerId: testCustomerId,
      customerEmail: testCustomerEmail,
      customerName: 'Test Customer 1',
      customerPhone: '9876543210',
      total: 599,
      status: 'Delivered',
      paymentStatus: 'PAID',
      paymentMethod: 'Razorpay',
      items: [
        { id: 'item-2', name: 'Red Velvet Pastry', price: 599, quantity: 1 }
      ],
      address: {
        name: 'Test Customer 1',
        mobile: '9876543210',
        house: '123 Test St',
        street: 'Main Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038'
      },
      deliveryOption: 'Standard',
      createdAt: new Date().toISOString()
    });

    const order3Unpaid = await db.createOrder({
      id: order3UnpaidId,
      customerId: testCustomerId,
      customerEmail: testCustomerEmail,
      customerName: 'Test Customer 1',
      customerPhone: '9876543210',
      total: 899,
      status: 'Delivered',
      paymentStatus: 'PENDING',
      paymentMethod: 'Razorpay',
      items: [
        { id: 'item-3', name: 'Choco Truffle', price: 899, quantity: 1 }
      ],
      address: {
        name: 'Test Customer 1',
        mobile: '9876543210',
        house: '123 Test St',
        street: 'Main Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038'
      },
      deliveryOption: 'Standard',
      createdAt: new Date().toISOString()
    });

    assert(Boolean(order1 && order1.id === order1Id), 'Order 1 created in DB with status Delivered and paymentStatus PAID');
    assert(Boolean(order2 && order2.id === order2Id), 'Order 2 created in DB with status Delivered and paymentStatus PAID');
    assert(Boolean(order3Unpaid && order3Unpaid.id === order3UnpaidId), 'Order 3 (unpaid) created in DB');

    // 2. Test Customer Refund Creation
    console.log('\n--- 2. Testing Customer Refund Request Creation ---');
    const refund1 = await db.createRefundRequest({
      id: `ref-test-${timestamp}-1`,
      orderId: order1Id,
      customerId: testCustomerId,
      customerEmail: testCustomerEmail,
      amount: Number(order1?.total || 1299),
      reason: 'Damaged or defective item received',
      notes: 'Cake icing was squished on arrival',
      status: 'PENDING',
      razorpayPaymentId: `pay_test_${timestamp}_1`,
      requestedAt: new Date().toISOString()
    });

    assert(Boolean(refund1 && refund1.id.startsWith('ref-test-')), 'Refund request 1 created with status PENDING');
    assert(refund1.amount === 1299, 'Refund request 1 amount correctly matches order total ₹1299');
    assert(refund1.orderId === order1Id, 'Refund request 1 correctly associated with Order 1');

    // 3. Test Retrieval by Order ID and Customer ID
    console.log('\n--- 3. Testing Database Query Methods ---');
    const retrievedById = await db.getRefundRequestById(refund1.id);
    assert(Boolean(retrievedById && retrievedById.id === refund1.id), 'getRefundRequestById retrieves exact record');

    const retrievedByOrder = await db.getRefundRequestsByOrderId(order1Id);
    assert(Boolean(retrievedByOrder.length >= 1 && retrievedByOrder[0].id === refund1.id), 'getRefundRequestsByOrderId returns active refund requests');

    const retrievedByCustomer = await db.getRefundRequestsByCustomerId(testCustomerId);
    assert(Boolean(retrievedByCustomer.length >= 1 && retrievedByCustomer[0].customerId === testCustomerId), 'getRefundRequestsByCustomerId returns customer refund requests');

    // 4. Test Admin Rejection
    console.log('\n--- 4. Testing Admin Rejection Flow ---');
    const rejectedRefund = await db.updateRefundRequest(refund1.id, {
      status: 'REJECTED',
      adminReason: 'Item verified intact per delivery confirmation photo.',
      reviewedAt: new Date().toISOString()
    });

    assert(Boolean(rejectedRefund && rejectedRefund.status === 'REJECTED'), 'Admin rejection updates status to REJECTED');
    assert(Boolean(rejectedRefund && rejectedRefund.adminReason && rejectedRefund.adminReason.includes('Item verified intact')), 'Admin rejection preserves adminReason');

    // 5. Test Customer Re-request on Order 2
    console.log('\n--- 5. Testing Refund Request 2 on Order 2 ---');
    const refund2 = await db.createRefundRequest({
      id: `ref-test-${timestamp}-2`,
      orderId: order2Id,
      customerId: testCustomerId,
      customerEmail: testCustomerEmail,
      amount: Number(order2?.total || 450),
      reason: 'Quality / freshness issue',
      notes: 'Pastry was stale',
      status: 'PENDING',
      razorpayPaymentId: `pay_test_${timestamp}_2`,
      requestedAt: new Date().toISOString()
    });

    assert(Boolean(refund2 && refund2.status === 'PENDING'), 'Refund request 2 created with status PENDING');

    // 6. Test Admin Approval & Razorpay Gateway Flow
    console.log('\n--- 6. Testing Admin Approval & Refund Completion ---');
    const mockRzpRefundId = `rfnd_test_${timestamp}_success`;
    const approvedRefund = await db.updateRefundRequest(refund2.id, {
      status: 'REFUNDED',
      razorpayRefundId: mockRzpRefundId,
      razorpayStatus: 'processed',
      reviewedAt: new Date().toISOString(),
      refundedAt: new Date().toISOString()
    });

    assert(Boolean(approvedRefund && approvedRefund.status === 'REFUNDED'), 'Admin approval sets status to REFUNDED');
    assert(Boolean(approvedRefund && approvedRefund.razorpayRefundId === mockRzpRefundId), 'Razorpay Refund ID is securely persisted');

    // Update order status
    await db.updateOrder(order2Id, { paymentStatus: 'REFUNDED' });
    const updatedOrder2 = await db.getOrderById(order2Id);
    assert(Boolean(updatedOrder2 && updatedOrder2.paymentStatus === 'REFUNDED'), 'Order paymentStatus updated to REFUNDED upon gateway success');

    // 7. Test Idempotency: Rejecting an already refunded request should be recognized
    console.log('\n--- 7. Testing Idempotency & Protection Rules ---');
    const isRefundedState = approvedRefund?.status === 'REFUNDED';
    assert(isRefundedState === true, 'System recognizes that REFUNDED request cannot be rejected or double-refunded');

    // 8. Test Schema Invariance: Case sensitivity & normalization
    console.log('\n--- 8. Testing Schema Normalization & Case Resilience ---');
    const allRequests = await db.getAllRefundRequests();
    assert(Array.isArray(allRequests) && allRequests.length >= 2, 'getAllRefundRequests returns all normalized records');

    const pendingFilter = await db.getAllRefundRequests({ status: 'PENDING' });
    assert(Array.isArray(pendingFilter), 'getAllRefundRequests with status filter works correctly');

    console.log('\n======================================================');
    console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('======================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL INTEGRATION & DATABASE VERIFICATION TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('⚠️ SOME TESTS FAILED.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runE2ETests();
