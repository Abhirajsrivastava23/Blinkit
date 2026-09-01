import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'delivery_partner') {
      return NextResponse.json({ error: 'Unauthorized: delivery partner session required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const otpInput = String(body?.otp || '').trim();

    if (!otpInput || otpInput.length !== 6) {
      return NextResponse.json({ error: 'Valid 6-digit OTP is required.' }, { status: 400 });
    }

    const orders = await db.readTable<any>('orders') || [];
    const order = orders.find((o: any) => o.id === id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.assignedPartnerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden: this order is not assigned to your rider account.' }, { status: 403 });
    }

    if (!order.deliveryOtp) {
      return NextResponse.json({ error: 'No active OTP has been generated for this order.' }, { status: 400 });
    }

    if (order.otpExpiresAt && new Date(order.otpExpiresAt) < new Date()) {
      order.deliveryOtp = null;
      order.otpExpiresAt = null;
      await db.writeTable('orders', orders);
      return NextResponse.json({ error: 'OTP has expired. Ask the customer to regenerate it.' }, { status: 400 });
    }

    if (order.deliveryOtp !== otpInput) {
      order.otpFailedAttempts = (order.otpFailedAttempts || 0) + 1;
      await db.writeTable('orders', orders);
      return NextResponse.json({ error: 'Incorrect OTP. Please verify the number provided by the customer.' }, { status: 400 });
    }

    order.otpFailedAttempts = 0;
    order.deliveryOtp = null;
    order.otpExpiresAt = null;
    order.delivery_otp_verified = true;
    order.otp_verified_at = new Date().toISOString();
    order.verified_by_partner_id = session.userId;

    await db.writeTable('orders', orders);

    return NextResponse.json({
      success: true,
      message: 'Delivery OTP verified successfully.'
    });
  } catch (error) {
    console.error('Error verifying delivery OTP:', error);
    return NextResponse.json({ error: 'Server error while verifying delivery OTP.' }, { status: 500 });
  }
}
