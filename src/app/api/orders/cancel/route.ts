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

    const orders = await db.readTable<any>('orders') || [];
    const orderIndex = orders.findIndex((o: { id: string }) => o.id === orderId);

    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[orderIndex];

    // AUTHORIZATION CHECK: Customer can only cancel their own orders
    if (session.role === 'customer') {
      const cId = order.customerId ? order.customerId.toLowerCase() : '';
      const sId = session.userId ? session.userId.toLowerCase() : '';
      const sEmail = session.email ? session.email.toLowerCase() : '';

      if (cId !== sId && cId !== sEmail) {
        return NextResponse.json(
          { error: 'You are not authorized to cancel this order' },
          { status: 403 }
        );
      }
    }

    // BUSINESS RULE CHECK: Cancellation is NOT allowed once status becomes "Preparing" or later
    const cancellableStatuses = ['Pending', 'Confirmed'];
    const currentStatus = order.status || 'Pending';

    if (!cancellableStatuses.includes(currentStatus)) {
      return NextResponse.json(
        {
          error: `This order can no longer be cancelled because it has moved to "${currentStatus}" status.`,
          status: currentStatus,
          code: 'CANCELLATION_UNAVAILABLE'
        },
        { status: 400 }
      );
    }

    // ADMIN OVERRIDE: Admins can cancel orders in any status
    if (session.role !== 'admin' && !cancellableStatuses.includes(currentStatus)) {
      return NextResponse.json(
        { error: `Only admin can cancel orders in "${currentStatus}" status` },
        { status: 403 }
      );
    }

    // Update order with cancellation info
    const now = new Date().toISOString();
    orders[orderIndex] = {
      ...order,
      status: 'Cancelled',
      paymentStatus: 'COMPLETED', // Payment was already taken, can't refund in this mock
      cancellationReason: reason || 'Customer requested cancellation',
      cancelledAt: now,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          previousStatus: currentStatus,
          newStatus: 'Cancelled',
          changedByUserId: session.userId || session.email || 'system',
          changedByRole: session.role,
          timestamp: now,
          reason: reason || 'Customer requested cancellation'
        }
      ]
    };

    await db.writeTable('orders', orders);

    return NextResponse.json({
      message: 'Order cancelled successfully',
      order: orders[orderIndex]
    });
  } catch (err) {
    console.error('Error cancelling order:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
