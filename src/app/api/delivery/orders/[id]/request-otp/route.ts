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
    const cleanId = String(id || '').trim();
    const order = await db.getOrderById(cleanId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const assignedId = String(order.assignedPartnerId || '').trim().toLowerCase();
    const sId = String(session.userId || '').trim().toLowerCase();
    const sEmail = String(session.email || '').trim().toLowerCase();

    if (session.role !== 'admin' && assignedId && assignedId !== sId && assignedId !== sEmail) {
      return NextResponse.json({ error: 'Forbidden: this order is not assigned to your rider account.' }, { status: 403 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    await db.updateOrder(cleanId, {
      deliveryOtp: otp,
      otpExpiresAt: expiresAt,
      otpFailedAttempts: 0
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery OTP generated successfully.',
      expiresAt: expiresAt,
      otpLength: otp.length
    });
  } catch (error) {
    console.error('Error requesting delivery OTP:', error);
    return NextResponse.json({ error: 'Server error while requesting delivery OTP.' }, { status: 500 });
  }
}
