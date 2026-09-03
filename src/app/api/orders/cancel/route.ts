import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';

/**
 * Cancel an order - Customer-initiated or Admin-initiated
 * 
 * Business Rules:
 * - Customers can only cancel their own orders
 * - Orders can ONLY be cancelled if status is "Pending" or "Confirmed"
 * - Once status becomes "Preparing" or later, cancellation is NOT allowed
 * - Admin can override these rules
 * - Cancellation must be validated server-side
 */
export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const cleanId = decodeURIComponent(String(orderId || '')).replace(/^#/, '').trim();
    const order = await db.getOrderById(cleanId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // AUTHORIZATION CHECK: Customer can only cancel their own orders
    if (session.role === 'customer') {
      const cId = String(order.customerId || '').toLowerCase().trim();
      const cEmail = String(order.customerEmail || '').toLowerCase().trim();
      const sId = String(session.userId || '').toLowerCase().trim();
      const sEmail = String(session.email || '').toLowerCase().trim();

      if (cId !== sId && cId !== sEmail && (!cEmail || cEmail !== sEmail)) {
        return NextResponse.json(
          { error: 'You are not authorized to cancel this order' },
          { status: 403 }
        );
      }
    }

    // BUSINESS RULE CHECK: Cancellation is NOT allowed once status becomes "Preparing" or later
    const cancellableStatuses: string[] = ['Pending', 'Confirmed'];
    const currentStatus = String(order.status || 'Pending');

    if (session.role !== 'admin' && !cancellableStatuses.includes(currentStatus)) {
      return NextResponse.json(
        {
          error: `This order can no longer be cancelled because it has moved to "${currentStatus}" status.`,
          status: currentStatus,
          code: 'CANCELLATION_UNAVAILABLE'
        },
        { status: 400 }
      );
    }

    // Update order with cancellation info
    const now = new Date().toISOString();
    const hist = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    hist.push({
      previousStatus: currentStatus,
      newStatus: 'Cancelled',
      changedByUserId: session.userId || session.email || 'system',
      changedByRole: session.role,
      timestamp: now,
      action: reason || 'Customer requested cancellation'
    });

    const updated = await db.updateOrder(cleanId, {
      status: 'Cancelled',
      cancellationReason: reason || 'Customer requested cancellation',
      cancelledAt: now,
      statusHistory: hist
    });

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order: updated
    });
  } catch (err) {
    console.error('Error cancelling order:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
