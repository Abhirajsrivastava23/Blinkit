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

    const cleanOrderId = decodeURIComponent(String(resolvedOrderId) || '').trim();
    const now = new Date().toISOString();
    const targetOrder = await db.getOrderById(cleanOrderId);

    if (!targetOrder) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (action === 'approve') {
      const updatedPaymentTx = await db.upsertPaymentTransaction({
        id: String(payment?.id || `pay-${targetOrder.id}`),
        orderId: String(targetOrder.id),
        customerId: String(targetOrder.customerId || targetOrder.customerEmail || 'customer'),
        amount: Number(targetOrder.total || payment?.amount || 0),
        status: 'PAID',
        verifiedAt: now,
        verifiedBy: session.email,
        paidAt: now,
        utr: String(targetOrder.utr || payment?.utr || ''),
        proofImageUrl: String(targetOrder.proofImageUrl || payment?.proofImageUrl || '')
      });

      const hist = Array.isArray(targetOrder.statusHistory) ? [...targetOrder.statusHistory] : [];
      hist.push({
        previousStatus: String(targetOrder.status),
        newStatus: 'Confirmed',
        changedByUserId: session.email,
        changedByRole: 'admin',
        timestamp: now,
        action: 'Payment Verified and Order Confirmed'
      });

      const updatedOrder = await db.updateOrder(cleanOrderId, {
        status: 'Confirmed',
        paymentStatus: 'PAID',
        paymentVerifiedAt: now,
        statusHistory: hist
      });

      db.logActivity(
        session.email,
        `Approved Payment for Order #${targetOrder.id}`,
        String(targetOrder.id),
        String(targetOrder.paymentStatus || 'PENDING'),
        'PAID'
      );

      return NextResponse.json({
        success: true,
        status: 'PAID',
        paymentStatus: 'PAID',
        orderStatus: 'Confirmed',
        orderId: targetOrder.id,
        updatedAt: now,
        order: updatedOrder,
        payment: updatedPaymentTx,
        message: 'Payment approved and order confirmed.'
      });
    }

    if (action === 'reject') {
      const rejectionReason = (reason || 'Payment proof did not match the submitted order details.').trim();
      const updatedPaymentTx = await db.upsertPaymentTransaction({
        id: String(payment?.id || `pay-${targetOrder.id}`),
        orderId: String(targetOrder.id),
        customerId: String(targetOrder.customerId || targetOrder.customerEmail || 'customer'),
        amount: Number(targetOrder.total || payment?.amount || 0),
        status: 'REJECTED',
        rejectedAt: now,
        rejectedBy: session.email,
        rejectionReason,
        utr: String(targetOrder.utr || payment?.utr || ''),
        proofImageUrl: String(targetOrder.proofImageUrl || payment?.proofImageUrl || '')
      });

      const hist = Array.isArray(targetOrder.statusHistory) ? [...targetOrder.statusHistory] : [];
      hist.push({
        previousStatus: String(targetOrder.status),
        newStatus: String(targetOrder.status),
        changedByUserId: session.email,
        changedByRole: 'admin',
        timestamp: now,
        action: `Payment Proof Rejected: ${rejectionReason}`
      });

      const updatedOrder = await db.updateOrder(cleanOrderId, {
        paymentStatus: 'REJECTED',
        paymentRejectedAt: now,
        rejectionReason,
        statusHistory: hist
      });

      db.logActivity(
        session.email,
        `Rejected Payment for Order #${targetOrder.id}`,
        String(targetOrder.id),
        'PAYMENT_VERIFICATION_PENDING',
        `REJECTED (${rejectionReason})`
      );

      return NextResponse.json({
        success: true,
        status: 'REJECTED',
        paymentStatus: 'REJECTED',
        orderStatus: targetOrder.status || 'Pending',
        orderId: targetOrder.id,
        rejectionReason,
        updatedAt: now,
        order: updatedOrder,
        payment: updatedPaymentTx,
        message: 'Payment rejected and order payment status updated.'
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Admin payment verification error:', error);
    return NextResponse.json({ error: 'Failed to process payment verification.' }, { status: 500 });
  }
}
