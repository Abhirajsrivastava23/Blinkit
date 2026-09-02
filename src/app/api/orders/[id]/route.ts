import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id || '').trim();

    const session = await getSession(request);

    let order = await db.getOrderById(cleanId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Enrich with latest payment transaction record if present
    try {
      const paymentTx = await db.getPaymentByOrderId(String(order.id));
      if (paymentTx) {
        order = {
          ...order,
          paymentStatus: (paymentTx.status as any) || order.paymentStatus,
          utr: (paymentTx.utr as any) || order.utr,
          proofImageUrl: (paymentTx.proofImageUrl as any) || order.proofImageUrl,
          paymentSubmittedAt: (paymentTx.submittedAt as any) || order.paymentSubmittedAt,
          paymentVerifiedAt: (paymentTx.verifiedAt as any) || order.paymentVerifiedAt,
          paymentRejectedAt: (paymentTx.rejectedAt as any) || order.paymentRejectedAt,
          rejectionReason: (paymentTx.rejectionReason as any) || order.rejectionReason,
        };
      }
    } catch (payLookupErr) {
      console.warn('Payment lookup warning in order API:', payLookupErr);
    }

    if (!session) {
      // If payment is pending verification or active, allow public payment viewing for this specific order ID without sensitive OTP
      const { deliveryOtp, ...sanitized } = order;
      return NextResponse.json(sanitized);
    }

    // Role-based authorization
    if (session.role === 'admin') {
      return NextResponse.json(order);
    } else if (session.role === 'delivery_partner') {
      const assignedId = String(order.assignedPartnerId || '').toLowerCase().trim();
      const sId = String(session.userId || '').toLowerCase().trim();
      const sEmail = String(session.email || '').toLowerCase().trim();

      if (!assignedId || (assignedId !== sId && assignedId !== sEmail)) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this order.' }, { status: 403 });
      }
      const { deliveryOtp, ...rest } = order;
      return NextResponse.json(rest);
    } else {
      // Customer role
      const cId = String(order.customerId || '').toLowerCase().trim();
      const cEmail = String(order.customerEmail || '').toLowerCase().trim();
      const sId = String(session.userId || '').toLowerCase().trim();
      const sEmail = String(session.email || '').toLowerCase().trim();
      const orderAddr = (order.address && typeof order.address === 'object') ? order.address as Record<string, unknown> : {};
      const addrPhone = String(orderAddr.mobile || '').replace(/\D/g, '');
      const sPhone = sId.replace(/\D/g, '');

      const isOwner = (
        !cId || 
        cId === sId || 
        cId === sEmail || 
        (cEmail && sEmail && cEmail === sEmail) || 
        (addrPhone && sPhone && addrPhone === sPhone) ||
        (addrPhone && sId.includes(addrPhone))
      );

      if (!isOwner && session.role !== 'admin') {
        // Return sanitized order for payment flow to avoid breaking customer payment
        const { deliveryOtp, ...sanitized } = order;
        return NextResponse.json(sanitized);
      }

      const otpActive = order.deliveryOtp && order.otpExpiresAt && new Date(String(order.otpExpiresAt)) > new Date();
      if (order.status !== 'Out for Delivery' && order.status !== 'Delivered' && !otpActive) {
        const masked = { ...order, deliveryOtp: '******' };
        return NextResponse.json(masked);
      }

      return NextResponse.json(order);
    }
  } catch (err) {
    console.error('Error fetching order details:', err);
    return NextResponse.json({ error: 'Server error fetching order' }, { status: 500 });
  }
}

