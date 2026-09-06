import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, RefundRequestRecord } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Please sign in to request a refund.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as {
      orderId?: string;
      reason?: string;
      notes?: string;
    };

    const rawOrderId = String(body.orderId || '').trim();
    const reason = String(body.reason || '').trim();
    const notes = String(body.notes || '').trim();

    if (!rawOrderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    if (!reason || reason.length < 3) {
      return NextResponse.json({ error: 'Please provide a valid reason for the refund request.' }, { status: 400 });
    }

    const cleanOrderId = rawOrderId.replace(/^#+/, '').trim();

    // 1. Fetch Order from PostgreSQL database
    let order: Record<string, any> | null = await db.getOrderById(cleanOrderId);
    if (!order) {
      order = await db.getOrderById(rawOrderId);
    }
    if (!order) {
      return NextResponse.json({ error: `Order #${cleanOrderId} not found.` }, { status: 404 });
    }

    // 2. Ownership verification: Ensure the authenticated customer owns this order
    const isCustomer = session.role === 'customer';
    if (isCustomer) {
      const sessionUserId = String(session.userId || '').toLowerCase().trim();
      const sessionEmail = String(session.email || '').toLowerCase().trim();
      const orderCustomerId = String(order.customerId || '').toLowerCase().trim();
      const orderCustomerEmail = String(order.customerEmail || '').toLowerCase().trim();

      const isOwner = (orderCustomerId && (orderCustomerId === sessionUserId || orderCustomerId === sessionEmail)) ||
                      (orderCustomerEmail && (orderCustomerEmail === sessionEmail || orderCustomerEmail === sessionUserId));

      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden: You are not authorized to request a refund for this order.' }, { status: 403 });
      }
    }

    // 3. Eligibility Checks (Server-Side Source of Truth)
    const paymentStatus = String(order.paymentStatus || '').toUpperCase();
    const isPaid = paymentStatus === 'PAID' || paymentStatus === 'COMPLETED';
    if (!isPaid) {
      return NextResponse.json({ error: 'Only paid orders are eligible for refund requests.' }, { status: 400 });
    }

    const totalAmount = Number(order.total || 0);
    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Order total amount is invalid for refund.' }, { status: 400 });
    }

    // Strict Status Validation: Self-service refund is ONLY permitted before kitchen preparation begins
    const rawStatus = String(order.status || '').trim();
    const normStatus = rawStatus.toLowerCase();

    const nonEligibleStatuses = [
      'preparing',
      'packed',
      'ready for delivery',
      'waiting for partner',
      'assigned',
      'accepted',
      'picked up',
      'out for delivery',
      'delivered',
      'cancelled'
    ];

    if (nonEligibleStatuses.includes(normStatus)) {
      if (normStatus === 'cancelled') {
        return NextResponse.json({ error: 'This order is already cancelled.' }, { status: 400 });
      }
      if (normStatus === 'delivered') {
        return NextResponse.json({
          error: 'Order has already been delivered. For damaged, defective, or incorrect products, please contact Customer Support with photo proof within 2 hours of delivery.'
        }, { status: 400 });
      }
      return NextResponse.json({
        error: `Cancellation and refund cannot be requested once order preparation has begun (Current state: "${rawStatus}"). For urgent assistance, please contact Customer Support.`
      }, { status: 400 });
    }

    // 4. Duplicate Prevention: Check if a request already exists for this order
    const existingRequests = await db.getRefundRequestsByOrderId(cleanOrderId);
    const activeExisting = existingRequests.find(r => 
      r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REFUNDED'
    );

    if (activeExisting) {
      return NextResponse.json({
        error: `A refund request is already ${activeExisting.status.toLowerCase()} for order #${cleanOrderId}.`,
        existingRequest: activeExisting,
        alreadyExists: true
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const fullReason = notes ? `${reason} — ${notes}` : reason;
    const paymentId = String(order.razorpayPaymentId || order.paymentId || '').trim();

    // 5. Create new Refund Request record in PostgreSQL
    const newRefundRequest: RefundRequestRecord = {
      id: `rfnd_req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      orderId: cleanOrderId,
      customerId: String(order.customerId || session.userId),
      customerEmail: order.customerEmail || session.email || '',
      amount: totalAmount,
      reason: fullReason,
      status: 'PENDING',
      razorpayPaymentId: paymentId || undefined,
      requestedAt: now,
      metadata: {
        orderTotal: totalAmount,
        deliveryOption: order.deliveryOption,
        deliveryLocation: order.deliveryLocationName,
        orderStatus: order.status,
        itemCount: Array.isArray(order.items) ? order.items.length : 0
      }
    };

    const saved = await db.createRefundRequest(newRefundRequest);

    db.logActivity(
      String(session.email || session.userId || 'Customer'),
      `Refund requested for Order #${cleanOrderId} (₹${totalAmount})`,
      cleanOrderId,
      'Delivered / Paid',
      'Refund Requested'
    );

    return NextResponse.json({
      success: true,
      message: 'Your refund request has been submitted successfully and is pending review.',
      refundRequest: saved
    });
  } catch (err) {
    console.error('Refund request creation error:', err);
    return NextResponse.json({ error: 'Internal server error processing refund request.' }, { status: 500 });
  }
}
