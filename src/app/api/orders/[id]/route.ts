import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id || '').trim();

    console.log("[ORDER API] requested ID:", cleanId);

    const session = await getSession(request);
    console.log("[ORDER API] session for order request:", session ? { userId: session.userId, email: session.email, role: session.role } : 'None');

    let rawOrder: any = null;

    try {
      const orderQuery = await db.query<any>('SELECT * FROM orders WHERE LOWER(id) = LOWER($1) LIMIT 1', [cleanId]);
      if (orderQuery.rows.length > 0) {
        rawOrder = orderQuery.rows[0];
      }
    } catch (e) {
      console.warn('Direct order SQL query warning:', e);
    }

    if (!rawOrder) {
      const orders = await db.readTable<any>('orders') || [];
      rawOrder = orders.find((o: any) => String(o.id || o.ID || '').trim().toLowerCase() === cleanId.toLowerCase());
    }

    if (!rawOrder) {
      console.warn("[ORDER API] Order genuinely not found in DB for ID:", cleanId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Normalize potential PostgreSQL lowercase columns
    let order = {
      ...rawOrder,
      id: rawOrder.id || rawOrder.ID || cleanId,
      customerId: rawOrder.customerId || rawOrder.customerid || '',
      customerEmail: rawOrder.customerEmail || rawOrder.customeremail || '',
      paymentStatus: rawOrder.paymentStatus || rawOrder.paymentstatus || 'PAYMENT_VERIFICATION_PENDING',
      paymentMethod: rawOrder.paymentMethod || rawOrder.paymentmethod || 'UPI',
      total: Number(rawOrder.total || 0),
      subtotal: Number(rawOrder.subtotal || 0),
      deliveryFee: Number(rawOrder.deliveryFee ?? rawOrder.deliveryfee ?? 0),
      discount: Number(rawOrder.discount || 0),
      status: rawOrder.status || 'Pending',
      deliveryOption: rawOrder.deliveryOption || rawOrder.deliveryoption || 'ASAP',
      eta: rawOrder.eta || '35 mins',
      deliveryOtp: rawOrder.deliveryOtp || rawOrder.deliveryotp || null,
      otpExpiresAt: rawOrder.otpExpiresAt || rawOrder.otpexpiresat || null,
      items: typeof rawOrder.items === 'string' ? JSON.parse(rawOrder.items) : (rawOrder.items || []),
      address: typeof rawOrder.address === 'string' ? JSON.parse(rawOrder.address) : (rawOrder.address || {}),
    };

    // Enrich with latest payment transaction record if present
    try {
      const paymentTx = await db.getPaymentByOrderId(order.id);
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
      if (order.assignedPartnerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this order.' }, { status: 403 });
      }
      const { deliveryOtp, ...rest } = order;
      return NextResponse.json(rest);
    } else {
      // Customer role
      const cId = String(order.customerId || '').toLowerCase();
      const cEmail = String(order.customerEmail || '').toLowerCase();
      const sId = String(session.userId || '').toLowerCase();
      const sEmail = String(session.email || '').toLowerCase();
      const addrPhone = String(order.address?.mobile || '').replace(/\D/g, '');
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
        console.warn(`[ORDER API] Forbidden customer mismatch: orderId=${cleanId}, cId=${cId}, sId=${sId}`);
        // Return sanitized order for payment flow to avoid breaking customer payment
        const { deliveryOtp, ...sanitized } = order;
        return NextResponse.json(sanitized);
      }

      const otpActive = order.deliveryOtp && order.otpExpiresAt && new Date(order.otpExpiresAt) > new Date();
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
