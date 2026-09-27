import { db } from '@/data/db';
import { validateRole } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/payments/[id]/verify
 * 
 * Server-side manual payment verification endpoint (Admin only).
 * Automated online payment verifications must go through /api/payments/razorpay/verify
 * with cryptographic HMAC-SHA256 signature verification.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return Response.json(
        { error: 'Unauthorized: Admin authorization required to manually verify payments. Online payments must verify via /api/payments/razorpay/verify with HMAC signatures.' },
        { status: 403 }
      );
    }

    const { id: paymentId } = await params;
    const body = await request.json().catch(() => ({})) as {
      customerId?: string;
      transactionReference?: string;
      providerResponse?: Record<string, unknown>;
    };

    const { customerId, transactionReference, providerResponse } = body;

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
      return Response.json(
        { error: 'Payment verification failed' },
        { status: 500 }
      );
    }

    if (!payment) {
      return Response.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // =========================================
    // 2. FETCH ORDER AND VERIFY
    // =========================================
    const rawOrderId = (payment.orderId as string) || cleanPaymentId.replace(/^pay-/, '');
    let cleanOrderId = String(rawOrderId).trim();
    while (cleanOrderId.includes('%23') || cleanOrderId.includes('%20') || cleanOrderId.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(cleanOrderId);
        if (decoded === cleanOrderId) break;
        cleanOrderId = decoded;
      } catch {
        break;
      }
    }
    cleanOrderId = cleanOrderId.replace(/^#+/, '').trim();
    let order: Record<string, unknown> | null = null;

    try {
      order = await db.getOrderById(cleanOrderId) || await db.getOrderById(rawOrderId);
      if (!order) {
        return Response.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      return Response.json(
        { error: 'Payment verification failed' },
        { status: 500 }
      );
    }

    // =========================================
    // 3. VERIFY AMOUNT MATCHES
    // =========================================
    const paymentAmount = Number(payment.amount || 0);
    const orderTotal = Number(order?.total || 0);

    if (Math.abs(paymentAmount - orderTotal) > 0.01 && paymentAmount > 0) {
      console.error(`SECURITY: Amount mismatch for payment ${paymentId}. Payment: ${paymentAmount}, Order: ${orderTotal}`);
      return Response.json(
        { error: 'Payment amount does not match order total' },
        { status: 400 }
      );
    }

    // =========================================
    // 4. MARK PAYMENT AS PAID
    // =========================================
    const finalTransactionRef = transactionReference || `TXN-ADMIN-${Date.now()}`;
    
    try {
      await db.updatePaymentWithReference(cleanPaymentId, finalTransactionRef, 'PAID');
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      return Response.json(
        { error: 'Failed to confirm payment' },
        { status: 500 }
      );
    }

    // =========================================
    // 5. UPDATE ORDER STATUS TO CONFIRMED
    // =========================================
    const now = new Date().toISOString();
    try {
      await db.updateOrder(cleanOrderId, {
        status: 'Confirmed',
        paymentStatus: 'PAID',
        paymentVerifiedAt: now,
        updatedAt: now
      });
    } catch (err) {
      console.error('Error updating order status:', err);
    }

    db.logActivity(
      adminSession.email || 'Admin',
      `Manual Payment Verified for Order #${cleanOrderId}`,
      cleanOrderId,
      String(order.paymentStatus || 'PENDING'),
      'PAID'
    );

    return Response.json({
      success: true,
      status: 'PAID',
      paymentId: cleanPaymentId,
      orderId: cleanOrderId,
      message: 'Payment verified successfully by administrator. Order confirmed.',
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return Response.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}

