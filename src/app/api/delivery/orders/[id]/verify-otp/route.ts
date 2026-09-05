import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== 'delivery_partner' && session.role !== 'admin' && session.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized: delivery partner session required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const otpInput = String(body?.otp || '').trim();

    if (!otpInput || otpInput.length !== 6) {
      return NextResponse.json({ error: 'Valid 6-digit OTP is required.' }, { status: 400 });
    }

    const cleanId = String(id || '').trim();
    const order = await db.getOrderById(cleanId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const assignedId = String(order.assignedPartnerId || '').trim().toLowerCase();
    const sId = String(session.userId || '').trim().toLowerCase();
    const sEmail = String(session.email || '').trim().toLowerCase();

    let isAllowedPartner = false;
    if (session.role === 'admin' || session.role === 'super_admin' || !assignedId) {
      isAllowedPartner = true;
    } else if (assignedId === sId || assignedId === sEmail) {
      isAllowedPartner = true;
    } else {
      try {
        const partnerRec = await db.getPartnerById(session.userId) || await db.getPartnerById(session.email);
        if (partnerRec) {
          const pId = String(partnerRec.id || '').toLowerCase().trim();
          const pPhone = String(partnerRec.phone || '').replace(/\D/g, '');
          const aPhone = assignedId.replace(/\D/g, '');
          if (assignedId === pId || (pPhone && aPhone && (assignedId === pPhone || aPhone === pPhone))) {
            isAllowedPartner = true;
          }
        }
      } catch {}
    }

    if (!isAllowedPartner) {
      return NextResponse.json({ error: 'Forbidden: this order is not assigned to your rider account.' }, { status: 403 });
    }

    if (!order.deliveryOtp) {
      return NextResponse.json({ error: 'No active OTP has been generated for this order.' }, { status: 400 });
    }

    if (order.otpExpiresAt && new Date(String(order.otpExpiresAt)) < new Date()) {
      await db.updateOrder(cleanId, { deliveryOtp: null, otpExpiresAt: null });
      return NextResponse.json({ error: 'OTP has expired. Ask the customer to regenerate it.' }, { status: 400 });
    }

    if (String(order.deliveryOtp).trim() !== otpInput) {
      const failedAttempts = (Number(order.otpFailedAttempts) || 0) + 1;
      await db.updateOrder(cleanId, { otpFailedAttempts: failedAttempts });
      return NextResponse.json({ error: 'Incorrect OTP. Please verify the number provided by the customer.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const historyList = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    historyList.push({
      previousStatus: String(order.status || 'Out for Delivery'),
      newStatus: 'Delivered',
      changedByUserId: session.userId,
      changedByRole: session.role,
      timestamp: now
    });

    const updated = await db.updateOrder(cleanId, {
      otpFailedAttempts: 0,
      delivery_otp_verified: true,
      otp_verified_at: now,
      verified_by_partner_id: session.userId,
      status: 'Delivered',
      delivery_completed_at: now,
      statusHistory: historyList
    });

    return NextResponse.json({
      success: true,
      order: updated,
      message: 'Delivery OTP verified successfully and order marked as Delivered.'
    });
  } catch (error) {
    console.error('Error verifying delivery OTP:', error);
    return NextResponse.json({ error: 'Server error while verifying delivery OTP.' }, { status: 500 });
  }
}
