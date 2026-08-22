import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized session role' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const orders = db.readTable<any>('orders') || [];
    const idx = orders.findIndex((o: any) => o.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[idx];
    if (order.customerId.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden: You do not own this order.' }, { status: 403 });
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    order.deliveryOtp = newOtp;
    order.otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // expires in 1 hour
    order.otpFailedAttempts = 0; // reset failed attempts on regeneration!

    // Append status history for regeneration
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      previousStatus: order.status,
      newStatus: order.status,
      changedByUserId: session.email,
      changedByRole: 'customer',
      timestamp: new Date().toISOString(),
      action: 'Regenerated OTP'
    });

    db.writeTable('orders', orders);

    return NextResponse.json({ success: true, deliveryOtp: newOtp });
  } catch (err) {
    console.error('Error regenerating OTP:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
