import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin session required.' }, { status: 401 });
    }

    const body = await request.json() as {
      paymentId?: string;
      orderId?: string;
      action?: 'approve' | 'reject';
      reason?: string;
    };

    const { paymentId, orderId, action, reason } = body;
    if (!paymentId || !orderId || !action) {
      return NextResponse.json({ error: 'Payment ID, order ID, and action are required.' }, { status: 400 });
    }

    const payment = await db.getPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    if (String(payment.orderId) !== orderId) {
      return NextResponse.json({ error: 'Payment does not belong to this order.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      await db.query(
        `UPDATE payment_transactions
         SET status = $1,
             "verifiedAt" = $2,
             "verifiedBy" = $3,
             "updatedAt" = $4,
             "paidAt" = $5
         WHERE id = $6`,
        ['PAID', now, session.email, now, now, paymentId]
      );

      await db.query(
        `UPDATE orders
         SET status = $1,
             "paymentStatus" = $2,
             "updatedAt" = $3
         WHERE id = $4`,
        ['CONFIRMED', 'PAID', now, orderId]
      );

      return NextResponse.json({ success: true, status: 'PAID', message: 'Payment approved and order confirmed.' });
    }

    if (action === 'reject') {
      const rejectionReason = (reason || 'Payment proof did not match the submitted order details.').trim();
      await db.query(
        `UPDATE payment_transactions
         SET status = $1,
             "rejectedAt" = $2,
             "rejectedBy" = $3,
             "rejectionReason" = $4,
             "updatedAt" = $5
         WHERE id = $6`,
        ['REJECTED', now, session.email, rejectionReason, now, paymentId]
      );

      await db.query(
        `UPDATE orders
         SET "paymentStatus" = $1,
             "updatedAt" = $2
         WHERE id = $3`,
        ['REJECTED', now, orderId]
      );

      return NextResponse.json({ success: true, status: 'REJECTED', message: 'Payment rejected and order payment status updated.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Admin payment verification error:', error);
    return NextResponse.json({ error: 'Failed to process payment verification.' }, { status: 500 });
  }
}
