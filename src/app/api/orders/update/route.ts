import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const body = await request.json();
    const { id, updates } = body;
    
    if (!id || !updates) {
      return NextResponse.json({ error: 'Order id and updates are required' }, { status: 400 });
    }

    const orders = db.readTable<any>('orders') || [];
    const idx = orders.findIndex((o: any) => o.id === id);
    
    if (idx === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const targetOrder = orders[idx];

    // Enforce role checks and status progression security
    if (session.role === 'delivery_partner') {
      // 1. Is it assigned to this partner?
      if (targetOrder.assignedPartnerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden: You cannot modify orders assigned to other partners.' }, { status: 403 });
      }

      // 2. Limit what fields can be updated
      const allowedKeys = ['status', 'failedReason', 'failedComment', 'arrivedNotify', 'otpVerified'];
      const updateKeys = Object.keys(updates);
      const isKeysAllowed = updateKeys.every(k => allowedKeys.includes(k));
      if (!isKeysAllowed) {
        return NextResponse.json({ error: 'Forbidden: Delivery partners can only modify delivery operations status fields.' }, { status: 403 });
      }

      // 3. Limit what statuses can be set
      const allowedStatuses = ['Accepted', 'Picked Up', 'Out for Delivery', 'Delivered', 'Failed Delivery', 'Cancelled'];
      if (updates.status && !allowedStatuses.includes(updates.status)) {
        return NextResponse.json({ error: `Forbidden: Delivery partners cannot transition order to status: ${updates.status}` }, { status: 403 });
      }
    } else if (session.role !== 'admin') {
      // Non-partner/non-admin users (e.g. guests/customers) cannot update order statuses via this endpoint
      return NextResponse.json({ error: 'Forbidden: Unauthorized role' }, { status: 403 });
    }
    
    orders[idx] = {
      ...targetOrder,
      ...updates
    };
    
    db.writeTable('orders', orders);
    return NextResponse.json({ success: true, order: orders[idx] });
  } catch (err) {
    console.error('Error updating order on server:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
