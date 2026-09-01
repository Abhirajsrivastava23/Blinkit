import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== 'customer' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized: Customer session required.' }, { status: 401 });
    }

    const body = await request.json() as {
      orderId?: string;
      paymentId?: string;
      amount?: number;
      utr?: string;
      proofImageUrl?: string;
    };

    const { orderId, paymentId, utr, proofImageUrl } = body;

    if (!orderId || !utr || !proofImageUrl) {
      return NextResponse.json({ error: 'Order ID, UTR, and payment proof image are required.' }, { status: 400 });
    }

    const trimmedUtr = String(utr).trim();
    if (!trimmedUtr) {
      return NextResponse.json({ error: 'UTR is required.' }, { status: 400 });
    }

    let order: any = null;
    try {
      const orderQuery = await db.query<any>('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
      if (orderQuery.rows.length > 0) {
        order = orderQuery.rows[0];
      }
    } catch (e) {
      console.warn('Order query warning in payment submit:', e);
    }

    if (!order) {
      const orders = await db.readTable<any>('orders') || [];
      order = orders.find((o: any) => o.id === orderId);
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const orderCustomer = String(order.customerId || '').toLowerCase();
    const orderEmail = String(order.customerEmail || '').toLowerCase();
    const sId = String(session.userId || '').toLowerCase();
    const sEmail = String(session.email || '').toLowerCase();

    if (session.role !== 'admin' && orderCustomer !== sId && orderCustomer !== sEmail && orderEmail !== sEmail && orderEmail !== sId) {
      return NextResponse.json({ error: 'You are not authorized to submit payment for this order.' }, { status: 403 });
    }

    const serverTotal = Number(order.total || 0);
    const now = new Date().toISOString();

    let payment = paymentId ? await db.getPaymentById(paymentId) : null;
    if (!payment) {
      payment = await db.getPaymentByOrderId(orderId);
    }

    if (payment) {
      try {
        await db.query(
          `UPDATE payment_transactions
           SET utr = $1,
               "proofImageUrl" = $2,
               status = $3,
               "submittedAt" = $4,
               "updatedAt" = $5,
               "paymentProofType" = $6,
               metadata = COALESCE(metadata, '{}'::jsonb) || $7::jsonb
           WHERE id = $8`,
          [
            trimmedUtr,
            proofImageUrl,
            'PAYMENT_VERIFICATION_PENDING',
            now,
            now,
            'image',
            JSON.stringify({ proofSubmittedAt: now, proofSource: 'manual_upi' }),
            payment.id,
          ]
        );
      } catch (payUpErr) {
        console.warn('payment_transactions update warning:', payUpErr);
      }
    } else {
      const newPayId = paymentId || `pay-${orderId}-${Date.now()}`;
      try {
        await db.query(
          `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, utr, "proofImageUrl", "submittedAt", "createdAt", "updatedAt", "attemptCount", metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT ("orderId") DO UPDATE
           SET utr = $9, "proofImageUrl" = $10, "submittedAt" = $11, status = $6, "updatedAt" = $13`,
          [
            newPayId,
            orderId,
            session.userId,
            serverTotal,
            'INR',
            'PAYMENT_VERIFICATION_PENDING',
            'UPI',
            'MANUAL_UPI',
            trimmedUtr,
            proofImageUrl,
            now,
            now,
            now,
            1,
            JSON.stringify({ proofSubmittedAt: now, proofSource: 'manual_upi' }),
          ]
        );
      } catch (payInsErr) {
        console.warn('payment_transactions insert warning:', payInsErr);
      }
    }

    try {
      await db.query(
        `UPDATE orders
         SET "paymentStatus" = $1,
             "updatedAt" = $2
         WHERE id = $3`,
        ['PAYMENT_VERIFICATION_PENDING', now, orderId]
      );
    } catch (ordUpErr) {
      console.warn('orders update warning:', ordUpErr);
    }

    const allOrders = await db.readTable<any>('orders') || [];
    const ordIdx = allOrders.findIndex((o: any) => o.id === orderId);
    if (ordIdx >= 0) {
      allOrders[ordIdx] = {
        ...allOrders[ordIdx],
        paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
        utr: trimmedUtr,
        proofImageUrl,
        paymentSubmittedAt: now,
        updatedAt: now
      };
      await db.writeTable('orders', allOrders);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted successfully. Your payment is under review by our team.',
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      orderId,
      utr: trimmedUtr,
      proofImageUrl,
    });
  } catch (error) {
    console.error('Manual UPI proof submission error:', error);
    return NextResponse.json({ error: 'Failed to submit payment proof.' }, { status: 500 });
  }
}
