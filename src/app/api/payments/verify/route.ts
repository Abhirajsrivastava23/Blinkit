import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    if ((!paymentId && !orderId) || !action) {
      return NextResponse.json({ error: 'Payment ID or Order ID, and action are required.' }, { status: 400 });
    }

    let payment = paymentId ? await db.getPaymentById(paymentId) : null;
    if (!payment && orderId) {
      payment = await db.getPaymentByOrderId(orderId);
    }

    const resolvedOrderId = orderId || (payment?.orderId as string);
    if (!resolvedOrderId) {
      return NextResponse.json({ error: 'Order ID could not be identified.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const orders = await db.readTable<any>('orders') || [];
    const ordIdx = orders.findIndex((o: any) => o.id === resolvedOrderId);

    if (action === 'approve') {
      if (payment) {
        try {
          await db.query(
            `UPDATE payment_transactions
             SET status = $1,
                 "verifiedAt" = $2,
                 "verifiedBy" = $3,
                 "updatedAt" = $4,
                 "paidAt" = $5
             WHERE id = $6`,
            ['PAID', now, session.email, now, now, payment.id]
          );
        } catch (e) {
          console.warn('payment_transactions approve query warning:', e);
        }
        await db.updatePaymentStatus(payment.id as string, 'PAID', { verifiedBy: session.email, verifiedAt: now });
      }

      try {
        await db.query(
          `UPDATE orders
           SET status = $1,
               "paymentStatus" = $2,
               "updatedAt" = $3
           WHERE id = $4`,
          ['Confirmed', 'PAID', now, resolvedOrderId]
        );
      } catch (e) {
        console.warn('orders approve query warning:', e);
      }

      if (ordIdx >= 0) {
        const hist = orders[ordIdx].statusHistory || [];
        hist.push({
          previousStatus: orders[ordIdx].status,
          newStatus: 'Confirmed',
          changedByUserId: session.email,
          changedByRole: 'admin',
          timestamp: now,
          action: 'Payment Verified and Order Confirmed'
        });
        orders[ordIdx] = {
          ...orders[ordIdx],
          status: 'Confirmed',
          paymentStatus: 'PAID',
          paymentVerifiedAt: now,
          updatedAt: now,
          statusHistory: hist
        };
        await db.writeTable('orders', orders);
      }

      return NextResponse.json({ success: true, status: 'PAID', message: 'Payment approved and order confirmed.' });
    }

    if (action === 'reject') {
      const rejectionReason = (reason || 'Payment proof did not match the submitted order details.').trim();
      if (payment) {
        try {
          await db.query(
            `UPDATE payment_transactions
             SET status = $1,
                 "rejectedAt" = $2,
                 "rejectedBy" = $3,
                 "rejectionReason" = $4,
                 "updatedAt" = $5
             WHERE id = $6`,
            ['REJECTED', now, session.email, rejectionReason, now, payment.id]
          );
        } catch (e) {
          console.warn('payment_transactions reject query warning:', e);
        }
        await db.updatePaymentStatus(payment.id as string, 'REJECTED', { rejectedBy: session.email, rejectedAt: now, rejectionReason });
      }

      try {
        await db.query(
          `UPDATE orders
           SET "paymentStatus" = $1,
               "updatedAt" = $2
           WHERE id = $3`,
          ['REJECTED', now, resolvedOrderId]
        );
      } catch (e) {
        console.warn('orders reject query warning:', e);
      }

      if (ordIdx >= 0) {
        const hist = orders[ordIdx].statusHistory || [];
        hist.push({
          previousStatus: orders[ordIdx].status,
          newStatus: orders[ordIdx].status,
          changedByUserId: session.email,
          changedByRole: 'admin',
          timestamp: now,
          action: `Payment Proof Rejected: ${rejectionReason}`
        });
        orders[ordIdx] = {
          ...orders[ordIdx],
          paymentStatus: 'REJECTED',
          paymentRejectedAt: now,
          rejectionReason,
          updatedAt: now,
          statusHistory: hist
        };
        await db.writeTable('orders', orders);
      }

      return NextResponse.json({ success: true, status: 'REJECTED', message: 'Payment rejected and order payment status updated.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Admin payment verification error:', error);
    return NextResponse.json({ error: 'Failed to process payment verification.' }, { status: 500 });
  }
}
