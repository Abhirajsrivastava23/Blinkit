import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/payments/[id]
 * 
 * Retrieve payment details
 * 
 * SECURITY:
 * ✅ Customer can only view their own payment
 * ✅ Admin/Super Admin can view any payment
 * ✅ Returns payment status (never card/UPI/banking details)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return Response.json(
        { error: 'Unauthorized: Session required to view payment details.' },
        { status: 401 }
      );
    }

    const { id: paymentId } = await params;

    if (!paymentId) {
      return Response.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    let cleanPaymentId = String(paymentId || '').trim();
    while (cleanPaymentId.includes('%23') || cleanPaymentId.includes('%20') || cleanPaymentId.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(cleanPaymentId);
        if (decoded === cleanPaymentId) break;
        cleanPaymentId = decoded;
      } catch {
        break;
      }
    }
    cleanPaymentId = cleanPaymentId.replace(/^#+/, '').trim();

    // =========================================
    // 1. FETCH PAYMENT FROM DATABASE
    // =========================================
    let payment: Record<string, unknown> | null = null;
    try {
      payment = await db.getPaymentById(cleanPaymentId) || await db.getPaymentById(paymentId) || await db.getPaymentByOrderId(cleanPaymentId);
    } catch (err) {
      console.error('Error fetching payment:', err);
    }

    if (!payment) {
      try {
        const orders = await db.readTable<any>('orders') || [];
        const order = orders.find((o: any) => String(o.id || '').toLowerCase() === cleanPaymentId.toLowerCase() || String(o.id || '').toLowerCase() === String(paymentId).toLowerCase());
        if (order) {
          payment = {
            id: `pay-${order.id}`,
            orderId: order.id,
            customerId: order.customerId || order.customerEmail,
            customerEmail: order.customerEmail,
            amount: order.total,
            currency: 'INR',
            status: order.paymentStatus || 'PAYMENT_VERIFICATION_PENDING',
            method: order.paymentMethod || 'UPI',
            provider: 'MANUAL_UPI',
            createdAt: order.createdAt,
            updatedAt: order.updatedAt || order.createdAt,
            paidAt: order.paymentVerifiedAt || null,
            attemptCount: 1
          };
        }
      } catch (err) {
        console.error('Error fallback reading order for payment:', err);
      }
    }

    if (!payment) {
      return Response.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // =========================================
    // 2. VERIFY ROLE & CUSTOMER OWNERSHIP
    // =========================================
    if (session.role !== 'admin' && session.role !== 'super_admin') {
      const sId = String(session.userId || '').toLowerCase().trim();
      const sEmail = String(session.email || '').toLowerCase().trim();
      const payCustId = String(payment.customerId || '').toLowerCase().trim();
      const payCustEmail = String(payment.customerEmail || '').toLowerCase().trim();

      let isOwner = (
        (payCustId && (payCustId === sId || payCustId === sEmail)) ||
        (payCustEmail && (payCustEmail === sEmail || payCustEmail === sId))
      );

      if (!isOwner && payment.orderId) {
        try {
          const ord = await db.getOrderById(String(payment.orderId));
          if (ord) {
            const ordCust = String(ord.customerId || '').toLowerCase().trim();
            const ordEmail = String(ord.customerEmail || '').toLowerCase().trim();
            if (ordCust === sId || ordCust === sEmail || ordEmail === sEmail || ordEmail === sId) {
              isOwner = true;
            }
          }
        } catch {}
      }

      if (!isOwner) {
        return Response.json(
          { error: 'Forbidden: You do not have permission to view this payment.' },
          { status: 403 }
        );
      }
    }
    
    // =========================================
    // 3. RETURN PAYMENT STATUS (SAFE FIELDS ONLY)
    // =========================================
    return Response.json({
      success: true,
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method || 'Razorpay',
        provider: payment.provider || 'RAZORPAY',
        razorpayOrderId: payment.razorpayOrderId || null,
        razorpayPaymentId: payment.razorpayPaymentId || payment.transactionReference || null,
        transactionReference: payment.transactionReference || payment.razorpayPaymentId || null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        paidAt: payment.paidAt || null,
        failureReason: payment.failureReason || null,
        attemptCount: payment.attemptCount,
      }
    });
  } catch (error) {
    console.error('Payment retrieval error:', error);
    return Response.json(
      { error: 'Failed to retrieve payment' },
      { status: 500 }
    );
  }
}

