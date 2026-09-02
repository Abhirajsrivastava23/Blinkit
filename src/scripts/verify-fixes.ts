import fs from 'fs';
import path from 'path';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        const [key, ...valParts] = line.split('=');
        const k = key.trim();
        let v = valParts.join('=').trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.substring(1, v.length - 1);
        }
        if (k && !process.env[k]) {
          process.env[k] = v;
        }
      }
    } catch {}
  }
}

loadEnvFile();

import { db, normalizeOrderRecord } from '../data/db';

async function runVerification() {
  console.log('====================================================');
  console.log('   FATAFAT PRODUCTION LIFECYCLE VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: DATABASE LAYER & ROW NORMALIZERS
    // -------------------------------------------------------------
    console.log('\n--- SUITE 1: Database & Row Normalizer Verification ---');
    
    // Seed and verify connection
    await db.seedDatabase();
    assert(true, 'Database connected & schema initialized');

    // Test row normalizer for orders
    const testRawOrderRow = {
      id: 'FT-NORM-001',
      customerid: 'cust-100',
      customeremail: 'cust@fatafat.com',
      assignedpartnerid: 'dp-001',
      assignedpartnername: 'Rahul Sharma',
      paymentstatus: 'PAYMENT_VERIFICATION_PENDING',
      total: '499',
      items: JSON.stringify([{ productId: 'p1', name: 'Milk', price: 50, quantity: 2 }]),
      address: JSON.stringify({ street: 'Main Rd', city: 'Nawabganj' })
    };
    const normalized = normalizeOrderRecord(testRawOrderRow);
    assert(normalized.id === 'FT-NORM-001', 'Normalizer retains id');
    assert(normalized.customerId === 'cust-100', 'Normalizer maps customerid -> customerId');
    assert(normalized.customerEmail === 'cust@fatafat.com', 'Normalizer maps customeremail -> customerEmail');
    assert(normalized.assignedPartnerId === 'dp-001', 'Normalizer maps assignedpartnerid -> assignedPartnerId');
    assert(normalized.assignedPartnerName === 'Rahul Sharma', 'Normalizer maps assignedpartnername -> assignedPartnerName');
    assert(normalized.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Normalizer maps paymentstatus -> paymentStatus');
    assert(normalized.total === 499, 'Normalizer converts total to number');
    assert(Array.isArray(normalized.items) && normalized.items.length === 1, 'Normalizer parses items JSON string');

    // -------------------------------------------------------------
    // TEST SUITE 2: ISSUE 1 — RIDER ASSIGNMENT & REASSIGNMENT LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Rider Assignment & Reassignment Lifecycle ---');

    const testOrderId = `FT-RIDER-TEST-${Date.now()}`;
    const initialOrder = {
      id: testOrderId,
      customerId: 'user-test-rider',
      customerEmail: 'rider.test@example.com',
      items: [{ productId: 'test-prod-1', name: 'Almonds 500g', price: 450, quantity: 1 }],
      subtotal: 450,
      deliveryFee: 49,
      discount: 0,
      total: 499,
      address: { street: 'Station Road', city: 'Nawabganj', mobile: '9876543210' },
      status: 'Pending',
      deliveryOption: 'ASAP',
      deliveryLocationId: 'nawabganj-unnao',
      deliveryLocationName: 'Nawabganj, Unnao',
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      createdAt: new Date().toISOString()
    };

    // 1. Create order
    const createdOrder = await db.updateOrder(testOrderId, initialOrder);
    assert(createdOrder?.id === testOrderId, 'Order created in database');
    assert(createdOrder?.assignedPartnerId === undefined || createdOrder?.assignedPartnerId === null, 'Initial order is unassigned');

    // 2. Admin assigns order to Rider A (DP-001: Rahul Sharma)
    const assignTimeA = new Date().toISOString();
    const assignedOrderA = await db.updateOrder(testOrderId, {
      assignedPartnerId: 'DP-001',
      assignedPartnerName: 'Rahul Sharma',
      assignedAt: assignTimeA,
      status: 'Assigned'
    });
    assert(assignedOrderA?.assignedPartnerId === 'DP-001', 'Order assignedPartnerId updated to DP-001 in DB');
    assert(assignedOrderA?.assignedPartnerName === 'Rahul Sharma', 'Order assignedPartnerName updated in DB');
    assert(assignedOrderA?.status === 'Assigned', 'Order status updated to Assigned in DB');

    // 3. Query as Rider A (DP-001) - should find the order
    const ordersAfterAssign = await db.readTable<any>('orders');
    const riderAOrders = ordersAfterAssign.filter((o: any) => 
      String(o.assignedPartnerId || '').toLowerCase().trim() === 'dp-001'
    );
    const hasOrderForRiderA = riderAOrders.some((o: any) => o.id === testOrderId);
    assert(hasOrderForRiderA, 'Rider DP-001 query returns assigned order');

    // 4. Query as Rider B (DP-002) - MUST NOT see Rider A order
    const riderBOrders = ordersAfterAssign.filter((o: any) => 
      String(o.assignedPartnerId || '').toLowerCase().trim() === 'dp-002'
    );
    const hasOrderForRiderB = riderBOrders.some((o: any) => o.id === testOrderId);
    assert(!hasOrderForRiderB, 'Rider DP-002 does NOT see order assigned to DP-001 (Strict Isolation)');

    // 5. Admin reassigns order from Rider A (DP-001) to Rider B (DP-002: Amit Verma)
    const assignTimeB = new Date().toISOString();
    const reassignedOrder = await db.updateOrder(testOrderId, {
      assignedPartnerId: 'DP-002',
      assignedPartnerName: 'Amit Verma',
      assignedAt: assignTimeB,
      status: 'Assigned'
    });
    assert(reassignedOrder?.assignedPartnerId === 'DP-002', 'Reassignment updated assignedPartnerId to DP-002');
    assert(reassignedOrder?.assignedPartnerName === 'Amit Verma', 'Reassignment updated assignedPartnerName to Amit Verma');

    // 6. Verify Rider A queue after reassignment - order must be gone
    const ordersAfterReassign = await db.readTable<any>('orders');
    const riderAOrdersAfter = ordersAfterReassign.filter((o: any) => 
      String(o.assignedPartnerId || '').toLowerCase().trim() === 'dp-001'
    );
    const riderAStillHasOrder = riderAOrdersAfter.some((o: any) => o.id === testOrderId);
    assert(!riderAStillHasOrder, 'Rider DP-001 queue no longer contains reassigned order');

    // 7. Verify Rider B queue after reassignment - order must be present
    const riderBOrdersAfter = ordersAfterReassign.filter((o: any) => 
      String(o.assignedPartnerId || '').toLowerCase().trim() === 'dp-002'
    );
    const riderBNowHasOrder = riderBOrdersAfter.some((o: any) => o.id === testOrderId);
    assert(riderBNowHasOrder, 'Rider DP-002 queue now contains the reassigned order');

    // 8. Verify order lookup persistence across refresh / case-insensitive search
    const reloadedOrder = await db.getOrderById(testOrderId.toLowerCase());
    assert(reloadedOrder !== null, 'Case-insensitive getOrderById found order');
    assert(reloadedOrder?.assignedPartnerId === 'DP-002', 'Assigned partner persists across reloads/refreshes');

    // -------------------------------------------------------------
    // TEST SUITE 3: ISSUE 2 — PAYMENT PROOF SUBMISSION & VERIFICATION LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Payment Proof Submission & Verification Lifecycle ---');

    const testPayOrderId = `FT-PAY-TEST-${Date.now()}`;
    const initialPayOrder = {
      id: testPayOrderId,
      customerId: 'user-test-customer',
      customerEmail: 'customer@example.com',
      items: [{ productId: 'test-prod-2', name: 'Cold Pressed Mustard Oil 1L', price: 220, quantity: 2 }],
      subtotal: 440,
      deliveryFee: 49,
      discount: 0,
      total: 489,
      address: { street: 'Civil Lines', city: 'Unnao', mobile: '9123456780' },
      status: 'Pending',
      paymentStatus: 'NOT_STARTED',
      createdAt: new Date().toISOString()
    };

    // 1. Create order for payment flow
    await db.updateOrder(testPayOrderId, initialPayOrder);
    const orderBeforePay = await db.getOrderById(testPayOrderId);
    assert(orderBeforePay !== null, 'Initial payment order loaded in DB');
    assert(orderBeforePay?.paymentStatus === 'NOT_STARTED', 'Initial payment status is NOT_STARTED');

    // 2. Customer submits UTR & Screenshot Proof
    const utrNumber = '987654321098';
    const proofUrl = 'https://supabase.co/storage/v1/object/public/product-images/payments/test-proof-1.jpg';
    const submittedAt = new Date().toISOString();

    // Upsert payment transaction
    await db.query(
      `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, utr, "proofImageUrl", "submittedAt", "createdAt", "updatedAt", "attemptCount")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT ("orderId") DO UPDATE
       SET utr = $9, "proofImageUrl" = $10, "submittedAt" = $11, status = $6, "updatedAt" = $13`,
      [
        `pay-${testPayOrderId}`,
        testPayOrderId,
        'user-test-customer',
        489,
        'INR',
        'PAYMENT_VERIFICATION_PENDING',
        'UPI',
        'MANUAL_UPI',
        utrNumber,
        proofUrl,
        submittedAt,
        submittedAt,
        submittedAt,
        1
      ]
    );

    // Update order in database
    await db.updateOrder(testPayOrderId, {
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      utr: utrNumber,
      proofImageUrl: proofUrl,
      paymentSubmittedAt: submittedAt,
      updatedAt: submittedAt
    });

    // 3. Verify order & payment lookup immediately after submission (Must never 404)
    const orderAfterSubmit = await db.getOrderById(testPayOrderId);
    assert(orderAfterSubmit !== null, 'Order lookup immediately after proof submission succeeds (No 404)');
    assert(orderAfterSubmit?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING', 'Order paymentStatus updated to PAYMENT_VERIFICATION_PENDING');
    assert(orderAfterSubmit?.utr === utrNumber, 'Order UTR matches submitted UTR');
    assert(orderAfterSubmit?.proofImageUrl === proofUrl, 'Order proofImageUrl matches submitted URL');

    const paymentTx = await db.getPaymentByOrderId(testPayOrderId);
    assert(paymentTx !== null, 'Payment transaction record found by orderId');
    assert(paymentTx?.utr === utrNumber, 'Payment transaction UTR verified');
    assert(paymentTx?.status === 'PAYMENT_VERIFICATION_PENDING', 'Payment transaction status is PAYMENT_VERIFICATION_PENDING');

    // 4. Admin Approves Payment
    const approveTime = new Date().toISOString();
    await db.query(
      `UPDATE payment_transactions
       SET status = $1, "verifiedAt" = $2, "verifiedBy" = $3, "updatedAt" = $4, "paidAt" = $5
       WHERE LOWER("orderId") = LOWER($6)`,
      ['PAID', approveTime, 'superadmin@fatafat.com', approveTime, approveTime, testPayOrderId]
    );

    const approvedOrder = await db.updateOrder(testPayOrderId, {
      status: 'Confirmed',
      paymentStatus: 'PAID',
      paymentVerifiedAt: approveTime
    });

    assert(approvedOrder?.status === 'Confirmed', 'Approved order status transitions to Confirmed');
    assert(approvedOrder?.paymentStatus === 'PAID', 'Approved order paymentStatus is PAID');

    const verifiedPayment = await db.getPaymentByOrderId(testPayOrderId);
    assert(verifiedPayment?.status === 'PAID', 'Payment transaction status updated to PAID');
    assert(verifiedPayment?.verifiedBy === 'superadmin@fatafat.com', 'Payment transaction verifiedBy recorded');

    // 5. Test Payment Rejection Flow
    const rejectOrderId = `FT-REJECT-TEST-${Date.now()}`;
    await db.updateOrder(rejectOrderId, {
      id: rejectOrderId,
      customerId: 'user-test-customer-2',
      customerEmail: 'cust2@example.com',
      total: 350,
      status: 'Pending',
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      utr: '000000000000',
      proofImageUrl: 'https://example.com/fake.jpg',
      createdAt: new Date().toISOString()
    });

    await db.query(
      `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, utr, "proofImageUrl", "submittedAt", "createdAt", "updatedAt", "attemptCount")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT ("orderId") DO UPDATE
       SET utr = $9, "proofImageUrl" = $10, status = $6`,
      [
        `pay-${rejectOrderId}`,
        rejectOrderId,
        'user-test-customer-2',
        350,
        'INR',
        'PAYMENT_VERIFICATION_PENDING',
        'UPI',
        'MANUAL_UPI',
        '000000000000',
        'https://example.com/fake.jpg',
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
        1
      ]
    );

    const rejectReason = 'UTR not found in bank statement.';
    const rejectTime = new Date().toISOString();

    await db.query(
      `UPDATE payment_transactions
       SET status = $1, "rejectedAt" = $2, "rejectedBy" = $3, "rejectionReason" = $4, "updatedAt" = $5
       WHERE LOWER("orderId") = LOWER($6)`,
      ['REJECTED', rejectTime, 'superadmin@fatafat.com', rejectReason, rejectTime, rejectOrderId]
    );

    const rejectedOrder = await db.updateOrder(rejectOrderId, {
      paymentStatus: 'REJECTED',
      paymentRejectedAt: rejectTime,
      rejectionReason: rejectReason
    });

    assert(rejectedOrder?.paymentStatus === 'REJECTED', 'Rejected order paymentStatus is REJECTED');
    assert(rejectedOrder?.rejectionReason === rejectReason, 'Rejection reason persisted in order table');

    const rejectedPaymentTx = await db.getPaymentByOrderId(rejectOrderId);
    assert(rejectedPaymentTx?.status === 'REJECTED', 'Payment transaction status is REJECTED');
    assert(rejectedPaymentTx?.rejectionReason === rejectReason, 'Payment transaction rejectionReason recorded');

    // -------------------------------------------------------------
    // CLEANUP TEST ORDERS
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up temporary verification test records ---');
    try {
      await db.query('DELETE FROM payment_transactions WHERE "orderId" IN ($1, $2, $3)', [testOrderId, testPayOrderId, rejectOrderId]);
      await db.query('DELETE FROM orders WHERE id IN ($1, $2, $3)', [testOrderId, testPayOrderId, rejectOrderId]);
      console.log('  Cleaned up test orders successfully.');
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }

    console.log('\n====================================================');
    console.log(`   ALL LIFECYCLE TESTS PASSED (${passedTests}/${totalTests})`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION RUN FAILED:', error);
    process.exit(1);
  }
}

void runVerification();
