import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const { id } = await params;
    const orders = await db.readTable<any>('orders') || [];
    const order = orders.find((o: any) => o.id === id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Role-based authorization
    if (session.role === 'admin') {
      return NextResponse.json(order);
    } else if (session.role === 'delivery_partner') {
      if (order.assignedPartnerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this order.' }, { status: 403 });
      }
      // Sanitise: strip deliveryOtp for delivery partner
      const { deliveryOtp, ...rest } = order;
      return NextResponse.json(rest);
    } else if (session.role === 'customer') {
      if (
        order.customerId.toLowerCase() !== session.email.toLowerCase() &&
        order.customerId.toLowerCase() !== session.userId.toLowerCase()
      ) {
        return NextResponse.json({ error: 'Forbidden: You do not own this order.' }, { status: 403 });
      }
      // Sanitise: mask deliveryOtp if not Out for Delivery or later
      if (order.status !== 'Out for Delivery' && order.status !== 'Delivered') {
        const masked = { ...order, deliveryOtp: '******' };
        return NextResponse.json(masked);
      }
      return NextResponse.json(order);
    }

    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  } catch (err) {
    console.error('Error fetching order details:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
