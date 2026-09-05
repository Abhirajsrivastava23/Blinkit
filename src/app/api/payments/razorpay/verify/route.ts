import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      orderId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    const rawOrderId = String(body.orderId || '').trim();
    const razorpayOrderId = String(body.razorpay_order_id || '').trim();
    const razorpayPaymentId = String(body.razorpay_payment_id || '').trim();
    const razorpaySignature = String(body.razorpay_signature || '').trim();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({
        error: 'Missing required Razorpay payment verification parameters.',
        success: false
      }, { status: 400 });
    }

    // 1. Multi-Stage Authoritative Order Resolution
    let cleanOrderId = rawOrderId;
    while (cleanOrderId.includes('%23') || cleanOrderId.includes('%20') || cleanOrderId.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(cleanOrderId);
        if (decoded === cleanOrderId) break;
        cleanOrderId = decoded;
      } catch {
        break;
      }
    }
    cleanOrderId = cleanOrderId.replace(/^#+/, '').trim();

    let targetOrder: Record<string, any> | null = null;

    // A. Lookup by internal Order ID variants
    if (cleanOrderId) {
      targetOrder = await db.getOrderById(cleanOrderId);
      if (!targetOrder) targetOrder = await db.getOrderById(rawOrderId);
      if (!targetOrder && cleanOrderId.startsWith('FT')) {
        targetOrder = await db.getOrderById(cleanOrderId.replace(/^FT/i, ''));
      }
      if (!targetOrder && !cleanOrderId.startsWith('FT')) {
        targetOrder = await db.getOrderById('FT' + cleanOrderId);
      }
      if (!targetOrder && !cleanOrderId.startsWith('#')) {
        targetOrder = await db.getOrderById('#' + cleanOrderId);
      }
    }

    // B. Lookup by Razorpay Order ID
    if (!targetOrder && razorpayOrderId) {
      targetOrder = await db.getOrderByRazorpayOrderId(razorpayOrderId);
    }

    // C. Lookup by Razorpay Payment ID
    if (!targetOrder && razorpayPaymentId) {
      targetOrder = await db.getOrderByRazorpayPaymentId(razorpayPaymentId);
    }

    // D. Lookup from payment_transactions table
    if (!targetOrder && razorpayOrderId) {
      const paymentTx = await db.getPaymentByRazorpayOrderId(razorpayOrderId);
      if (paymentTx?.orderId) {
        targetOrder = await db.getOrderById(String(paymentTx.orderId));
      }
    }

    // E. Lookup from in-memory / readTable orders list
    if (!targetOrder) {
      const allOrders = await db.readTable<any>('orders').catch(() => []);
      targetOrder = allOrders.find((o: any) => {
        const oid = String(o.id || '').replace(/^#+/, '').trim().toLowerCase();
        const oRzp = String(o.razorpayOrderId || o.razorpayorderid || '').trim();
        const oPay = String(o.razorpayPaymentId || o.razorpaypaymentid || o.paymentId || '').trim();
        return (
          (cleanOrderId && oid === cleanOrderId.toLowerCase()) ||
          (cleanOrderId && (oid.includes(cleanOrderId.toLowerCase()) || cleanOrderId.toLowerCase().includes(oid))) ||
          (razorpayOrderId && oRzp === razorpayOrderId) ||
          (razorpayPaymentId && oPay === razorpayPaymentId)
        );
      }) || null;
    }

    // F. Direct Gateway Reconciliation fallback: Query Razorpay API for notes / receipt if order was not in DB
    if (!targetOrder && (razorpayOrderId || razorpayPaymentId)) {
      const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
      const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
      if (keyId && keySecret) {
        try {
          const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          let rzpOrderInfo: any = null;
          if (razorpayOrderId) {
            const rzpRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
              headers: { 'Authorization': authHeader },
              signal: AbortSignal.timeout(5000)
            });
            if (rzpRes.ok) rzpOrderInfo = await rzpRes.json();
          }

          const extractedOrderId = rzpOrderInfo?.notes?.dbOrderId || rzpOrderInfo?.notes?.orderId || rzpOrderInfo?.receipt;
          if (extractedOrderId) {
            targetOrder = await db.getOrderById(String(extractedOrderId));
          }
        } catch (fetchErr) {
          console.warn('[RAZORPAY RECONCILIATION WARNING] Could not fetch order info from Razorpay API:', fetchErr);
        }
      }
    }

    if (!targetOrder) {
      return NextResponse.json({
        error: `Order corresponding to payment ${razorpayPaymentId} not found in records.`,
        success: false
      }, { status: 404 });
    }

    // 2. Cross-check client Razorpay Order ID against our database-stored Razorpay Order ID
    const dbStoredRzpOrderId = String(targetOrder.razorpayOrderId || '').trim();
    if (dbStoredRzpOrderId && dbStoredRzpOrderId !== razorpayOrderId) {
      console.warn(`[RAZORPAY VERIFY SECURITY WARNING] Client supplied Razorpay order ID "${razorpayOrderId}" does not match database-stored order ID "${dbStoredRzpOrderId}" for order #${targetOrder.id}`);
      return NextResponse.json({
        error: 'Payment verification failed: Razorpay Order ID mismatch with database record.',
        success: false
      }, { status: 400 });
    }

    const authoritativeRzpOrderId = dbStoredRzpOrderId || razorpayOrderId;

    // 3. Server-Side HMAC-SHA256 Signature Verification using authoritative DB Razorpay Order ID
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!keySecret) {
      return NextResponse.json({
        error: 'Razorpay secret key not configured on server.',
        success: false
      }, { status: 500 });
    }
    const payload = `${authoritativeRzpOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(razorpaySignature, 'utf8');

    const isSignatureValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isSignatureValid) {
      console.warn(`[RAZORPAY VERIFY SECURITY WARNING] Invalid signature received for Razorpay Order: ${authoritativeRzpOrderId}, Payment: ${razorpayPaymentId}`);
      return NextResponse.json({
        error: 'Payment verification failed: Invalid digital signature.',
        success: false
      }, { status: 400 });
    }

    const authoritativeOrderId = String(targetOrder.id).replace(/^#+/, '').trim();
    const now = new Date().toISOString();

    // 3. Idempotency check: If order is already confirmed & paid, return success immediately
    const isAlreadyPaid = (targetOrder.paymentStatus === 'PAID' || targetOrder.status === 'Confirmed') && targetOrder.razorpayPaymentId === razorpayPaymentId;
    if (isAlreadyPaid) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        status: 'PAID',
        paymentStatus: 'PAID',
        orderStatus: 'Confirmed',
        orderId: authoritativeOrderId,
        razorpayPaymentId,
        razorpayOrderId,
        order: targetOrder,
        message: 'Payment already verified and recorded.'
      });
    }

    // 4. Update status history
    const hist = Array.isArray(targetOrder.statusHistory) ? [...targetOrder.statusHistory] : [];
    hist.push({
      previousStatus: String(targetOrder.status || 'Pending'),
      newStatus: 'Confirmed',
      changedByUserId: String(targetOrder.customerId || 'customer'),
      changedByRole: 'customer',
      timestamp: now,
      action: `Razorpay Online Payment Verified (Payment ID: ${razorpayPaymentId})`
    });

    // 5. Atomically update Order in PostgreSQL
    const updatedOrder = await db.updateOrder(authoritativeOrderId, {
      status: 'Confirmed',
      paymentStatus: 'PAID',
      paymentMethod: 'Razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentVerifiedAt: now,
      updatedAt: now,
      statusHistory: hist
    });

    // 6. Atomically upsert Payment Transaction in PostgreSQL
    const updatedPaymentTx = await db.upsertPaymentTransaction({
      id: `pay-${authoritativeOrderId}`,
      orderId: authoritativeOrderId,
      customerId: String(targetOrder.customerId || targetOrder.customerEmail || 'customer'),
      amount: Number(targetOrder.total || 0),
      currency: 'INR',
      status: 'PAID',
      method: 'Razorpay',
      provider: 'RAZORPAY',
      transactionReference: razorpayPaymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      verifiedAt: now,
      paidAt: now,
      createdAt: (targetOrder.createdAt as string) || now
    });

    db.logActivity(
      String(targetOrder.customerId || targetOrder.customerEmail || 'Customer'),
      `Razorpay Payment Verified for Order #${authoritativeOrderId}`,
      authoritativeOrderId,
      String(targetOrder.paymentStatus || 'PENDING'),
      'PAID'
    );

    return NextResponse.json({
      success: true,
      status: 'PAID',
      paymentStatus: 'PAID',
      orderStatus: 'Confirmed',
      orderId: authoritativeOrderId,
      razorpayPaymentId,
      razorpayOrderId,
      updatedAt: now,
      order: updatedOrder || targetOrder,
      payment: updatedPaymentTx,
      message: 'Payment verified and order confirmed successfully.'
    });
  } catch (error) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json({
      error: 'Internal error during payment signature verification.',
      success: false
    }, { status: 500 });
  }
}
