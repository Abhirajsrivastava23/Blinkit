import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let cleanId = String(id || '').trim();
    while (cleanId.includes('%23') || cleanId.includes('%20') || cleanId.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(cleanId);
        if (decoded === cleanId) break;
        cleanId = decoded;
      } catch {
        break;
      }
    }
    cleanId = cleanId.replace(/^#+/, '').trim();

    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Session required to view order details.' },
        { status: 401 }
      );
    }

    let order = await db.getOrderById(cleanId);
    if (!order) {
      order = await db.getOrderById(id);
    }
    if (!order && cleanId.startsWith('FT')) {
      order = await db.getOrderById('#' + cleanId);
    }
    if (!order && !cleanId.startsWith('FT')) {
      order = await db.getOrderById('FT' + cleanId);
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Enrich with latest payment transaction record if present
    try {
      const paymentTx = await db.getPaymentByOrderId(String(order.id));
      if (paymentTx) {
        let canonicalPaymentStatus = order.paymentStatus || paymentTx.status || 'NOT_STARTED';
        const orderPayUpper = String(order.paymentStatus || '').toUpperCase();
        const pPayUpper = String(paymentTx.status || '').toUpperCase();
        const orderStatusUpper = String(order.status || '').toUpperCase();

        if (orderPayUpper === 'PAID' || pPayUpper === 'PAID' || orderStatusUpper === 'CONFIRMED' || orderStatusUpper === 'PREPARING' || orderStatusUpper === 'PACKED' || orderStatusUpper === 'OUT FOR DELIVERY' || orderStatusUpper === 'DELIVERED') {
          canonicalPaymentStatus = 'PAID';
        } else if (orderPayUpper === 'REJECTED' || pPayUpper === 'REJECTED') {
          canonicalPaymentStatus = 'REJECTED';
        } else if (orderPayUpper === 'PAYMENT_VERIFICATION_PENDING' || pPayUpper === 'PAYMENT_VERIFICATION_PENDING') {
          canonicalPaymentStatus = 'PAYMENT_VERIFICATION_PENDING';
        }

        order = {
          ...order,
          paymentStatus: canonicalPaymentStatus,
          utr: order.utr || paymentTx.utr || '',
          proofImageUrl: order.proofImageUrl || paymentTx.proofImageUrl || '',
          paymentSubmittedAt: order.paymentSubmittedAt || paymentTx.submittedAt,
          paymentVerifiedAt: order.paymentVerifiedAt || paymentTx.verifiedAt,
          paymentRejectedAt: order.paymentRejectedAt || paymentTx.rejectedAt,
          rejectionReason: order.rejectionReason || paymentTx.rejectionReason,
        };
      }
    } catch (payLookupErr) {
      console.warn('Payment lookup warning in order API:', payLookupErr);
    }

    // Role-based authorization
    if (session.role === 'admin' || session.role === 'super_admin') {
      try {
        const refunds = await db.getRefundRequestsByOrderId(String(order.id));
        if (refunds && refunds.length > 0) {
          order = {
            ...order,
            refund: refunds[0],
            refundStatus: refunds[0].status,
            refundAmount: refunds[0].amount,
            refundReason: refunds[0].reason,
            razorpayRefundId: refunds[0].razorpayRefundId
          };
        }
      } catch (refErr) {
        console.warn('Refund lookup warning in admin order API:', refErr);
      }
      return NextResponse.json(order);
    } else if (session.role === 'delivery_partner') {
      const assignedId = String(order.assignedPartnerId || '').toLowerCase().trim();
      const sId = String(session.userId || '').toLowerCase().trim();
      const sEmail = String(session.email || '').toLowerCase().trim();

      let isAssigned = (assignedId && (assignedId === sId || assignedId === sEmail));
      if (!isAssigned && assignedId) {
        try {
          const partnerRec = await db.getPartnerById(session.userId) || await db.getPartnerById(session.email);
          if (partnerRec) {
            const pId = String(partnerRec.id || '').toLowerCase().trim();
            const pPhone = String(partnerRec.phone || '').replace(/\D/g, '');
            const aPhone = assignedId.replace(/\D/g, '');
            if (assignedId === pId || (pPhone && aPhone && (assignedId === pPhone || aPhone === pPhone))) {
              isAssigned = true;
            }
          }
        } catch {}
      }

      if (!isAssigned) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this order.' }, { status: 403 });
      }
      const { deliveryOtp, ...rest } = order;
      return NextResponse.json(rest);
    } else if (session.role === 'customer') {
      const cId = String(order.customerId || '').toLowerCase().trim();
      const cEmail = String(order.customerEmail || '').toLowerCase().trim();
      const sId = String(session.userId || '').toLowerCase().trim();
      const sEmail = String(session.email || '').toLowerCase().trim();
      const orderAddr = (order.address && typeof order.address === 'object') ? order.address as Record<string, unknown> : {};
      const addrPhone = String(orderAddr.mobile || orderAddr.phone || '').replace(/\D/g, '');
      const sPhone = sId.replace(/\D/g, '');

      let profilePhone = '';
      try {
        const users = await db.readTable<any>('users') || [];
        const userObj = users.find((u: any) =>
          (u.userId && String(u.userId).toLowerCase() === sId) ||
          (u.email && String(u.email).toLowerCase() === sEmail)
        );
        if (userObj?.phone) {
          profilePhone = String(userObj.phone).replace(/\D/g, '');
        }
      } catch {}

      const isOwner = (
        (cId && (cId === sId || cId === sEmail)) ||
        (cEmail && sEmail && (cEmail === sEmail || cEmail === sId)) ||
        (addrPhone && sPhone && (addrPhone === sPhone || sPhone.includes(addrPhone) || addrPhone.includes(sPhone))) ||
        (addrPhone && profilePhone && (addrPhone === profilePhone || profilePhone.includes(addrPhone) || addrPhone.includes(profilePhone)))
      );

      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to view this order.' }, { status: 403 });
      }

      return NextResponse.json({
        ...order,
        deliveryOtp: order.deliveryOtp || (order as any).deliveryotp || null
      });
    }

    return NextResponse.json({ error: 'Forbidden: Unauthorized session role.' }, { status: 403 });
  } catch (err) {
    console.error('Error fetching order details:', err);
    return NextResponse.json({ error: 'Server error fetching order' }, { status: 500 });
  }
}


