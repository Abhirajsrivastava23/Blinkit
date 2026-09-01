import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const { id } = await params;
    let order: any = null;

    try {
      const orderQuery = await db.query<any>('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
      if (orderQuery.rows.length > 0) {
        order = orderQuery.rows[0];
      }
    } catch (e) {
      console.warn('Direct order SQL query warning:', e);
    }

    if (!order) {
      const orders = await db.readTable<any>('orders') || [];
      order = orders.find((o: any) => o.id === id);
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Enrich with latest payment transaction record if present
    const paymentTx = await db.getPaymentByOrderId(order.id);
    if (paymentTx) {
      order = {
        ...order,
        paymentStatus: paymentTx.status || order.paymentStatus,
        utr: paymentTx.utr || order.utr,
        proofImageUrl: paymentTx.proofImageUrl || order.proofImageUrl,
        paymentSubmittedAt: paymentTx.submittedAt || order.paymentSubmittedAt,
        paymentVerifiedAt: paymentTx.verifiedAt || order.paymentVerifiedAt,
        paymentRejectedAt: paymentTx.rejectedAt || order.paymentRejectedAt,
        rejectionReason: paymentTx.rejectionReason || order.rejectionReason,
      };
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
      const cId = String(order.customerId || '').toLowerCase();
      const cEmail = String(order.customerEmail || '').toLowerCase();
      const sId = String(session.userId || '').toLowerCase();
      const sEmail = String(session.email || '').toLowerCase();

      if (cId !== sEmail && cId !== sId && cEmail !== sEmail && cEmail !== sId) {
        return NextResponse.json({ error: 'Forbidden: You do not own this order.' }, { status: 403 });
      }

      const otpActive = order.deliveryOtp && order.otpExpiresAt && new Date(order.otpExpiresAt) > new Date();
      if (order.status !== 'Out for Delivery' && order.status !== 'Delivered' && !otpActive) {
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
