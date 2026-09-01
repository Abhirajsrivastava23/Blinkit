import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== 'delivery_partner' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized: delivery partner session required.' }, { status: 403 });
    }

    const { id } = await params;
    const orders = await db.readTable<any>('orders') || [];
    const order = orders.find((o: any) => o.id === id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (session.role !== 'admin' && order.assignedPartnerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden: this order is not assigned to your rider account.' }, { status: 403 });
    }

    if (order.status !== 'Out for Delivery') {
      return NextResponse.json({ error: 'OTP requests are only allowed when the order is out for delivery.' }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    order.deliveryOtp = otp;
    order.otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity
    order.otpFailedAttempts = 0;

    await db.writeTable('orders', orders);

    return NextResponse.json({
      success: true,
      message: 'Delivery OTP generated successfully.',
      expiresAt: order.otpExpiresAt,
      otpLength: otp.length
    });
  } catch (error) {
    console.error('Error requesting delivery OTP:', error);
    return NextResponse.json({ error: 'Server error while requesting delivery OTP.' }, { status: 500 });
  }
}
