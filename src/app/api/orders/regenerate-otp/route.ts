import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== 'customer' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized session role' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const cleanId = String(id).trim();
    const order = await db.getOrderById(cleanId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const cId = String(order.customerId || '').toLowerCase().trim();
    const cEmail = String(order.customerEmail || '').toLowerCase().trim();
    const sId = String(session.userId || '').toLowerCase().trim();
    const sEmail = String(session.email || '').toLowerCase().trim();

    if (session.role !== 'admin' && cId !== sId && cId !== sEmail && (!cEmail || cEmail !== sEmail)) {
      return NextResponse.json({ error: 'Forbidden: You do not own this order.' }, { status: 403 });
    }

    // Generate new 6-digit OTP valid for 2 hours
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const historyList = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    historyList.push({
      previousStatus: String(order.status || 'Out for Delivery'),
      newStatus: String(order.status || 'Out for Delivery'),
      changedByUserId: session.userId || session.email,
      changedByRole: session.role,
      timestamp: now,
      action: 'Regenerated Delivery OTP'
    });

    await db.updateOrder(cleanId, {
      deliveryOtp: newOtp,
      otpExpiresAt: expiresAt,
      otpFailedAttempts: 0,
      statusHistory: historyList
    });

    return NextResponse.json({ success: true, deliveryOtp: newOtp });
  } catch (err) {
    console.error('Error regenerating OTP:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

