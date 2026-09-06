import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { validateRole } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required to reject refunds.' }, { status: 403 });
    }

    const { id: rawId } = await params;
    const cleanId = decodeURIComponent(rawId || '').trim();

    if (!cleanId) {
      return NextResponse.json({ error: 'Refund Request ID is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({})) as {
      reason?: string;
    };

    const adminReason = String(body.reason || 'Rejected after review by store administration.').trim();

    // 1. Fetch Refund Request from PostgreSQL
    const refundReq = await db.getRefundRequestById(cleanId);
    if (!refundReq) {
      return NextResponse.json({ error: `Refund request "${cleanId}" not found.` }, { status: 404 });
    }

    if (refundReq.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Cannot reject a refund request that has already been refunded via Razorpay.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 2. Update PostgreSQL record
    const updatedRefund = await db.updateRefundRequest(cleanId, {
      status: 'REJECTED',
      adminReason,
      reviewedAt: now
    });

    // 3. Update Order statusHistory
    const cleanOrderId = String(refundReq.orderId).replace(/^#+/, '').trim();
    const order = await db.getOrderById(cleanOrderId);
    if (order) {
      const hist = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
      hist.push({
        previousStatus: String(order.status || 'Delivered'),
        newStatus: String(order.status || 'Delivered'),
        changedByUserId: adminSession.email,
        changedByRole: 'admin',
        timestamp: now,
        action: `Refund Request Rejected by Admin`,
        note: adminReason
      });
      await db.updateOrder(cleanOrderId, {
        statusHistory: hist,
        updatedAt: now
      });
    }

    // 4. Audit Logging
    db.logActivity(
      adminSession.email,
      `Rejected Refund Request for Order #${cleanOrderId} (Reason: ${adminReason})`,
      cleanOrderId,
      'Pending Refund',
      'Refund Rejected'
    );

    return NextResponse.json({
      success: true,
      message: 'Refund request has been rejected.',
      status: 'REJECTED',
      refundRequest: updatedRefund
    });
  } catch (err) {
    console.error('Refund rejection error:', err);
    return NextResponse.json({ error: 'Internal server error while rejecting refund request.' }, { status: 500 });
  }
}
