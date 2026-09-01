'use server';

import { db } from '@/data/db';

/**
 * POST /api/payments/test/confirm
 * 
 * DEVELOPMENT ONLY - Test payment confirmation
 * 
 * Used for testing checkout flow WITHOUT real payment gateway
 * 
 * SECURITY:
 * ⚠️ ONLY available in development mode (NODE_ENV === 'development')
 * ⚠️ Returns 403 in production
 * ⚠️ Should NEVER be used for real payments
 * ⚠️ Protected by environment check
 * 
 * Usage (Development Only):
 * POST /api/payments/test/confirm
 * {
 *   "paymentId": "PAY-abc123",
 *   "status": "PAID",
 *   "transactionReference": "TXN-xyz789"
 * }
 */
export async function POST(request: Request) {
  try {
    // =========================================
    // SECURITY: ONLY IN DEVELOPMENT
    // =========================================
    if (process.env.NODE_ENV === 'production') {
      console.error('SECURITY: Test payment endpoint called in production!');
      return Response.json(
        { error: 'Test endpoint not available in production' },
        { status: 403 }
      );
    }

    const body = await request.json() as {
      paymentId?: string;
      status?: string;
      transactionReference?: string;
      orderId?: string;
    };

    const { paymentId, status, transactionReference, orderId } = body;

    if (!paymentId || !status) {
      return Response.json(
        { error: 'Missing required fields: paymentId, status' },
        { status: 400 }
      );
    }

    if (!['PAID', 'FAILED'].includes(status)) {
      return Response.json(
        { error: 'Invalid status. Must be PAID or FAILED' },
        { status: 400 }
      );
    }

    // =========================================
    // 1. FETCH PAYMENT
    // =========================================
    let payment: Record<string, unknown> | null = null;
    try {
      payment = await db.getPaymentById(paymentId);
    } catch (err) {
      console.error('Error fetching payment:', err);
      return Response.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (!payment) {
      return Response.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // =========================================
    // 2. UPDATE PAYMENT STATUS
    // =========================================
    try {
      if (status === 'PAID') {
        const txRef = transactionReference || `TEST-TXN-${Date.now()}`;
        await db.updatePaymentWithReference(paymentId, txRef, 'PAID');

        // Also update order to CONFIRMED
        const orderIdToUpdate = orderId || (payment.orderId as string);
        const now = new Date().toISOString();
        await db.query(
          `UPDATE orders 
           SET status = $1, "paymentStatus" = $2, "updatedAt" = $3
           WHERE id = $4`,
          ['CONFIRMED', 'PAID', now, orderIdToUpdate]
        );
      } else if (status === 'FAILED') {
        await db.markPaymentFailed(paymentId, 'Test payment failed');
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
      return Response.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      );
    }

    // =========================================
    // 3. RETURN RESULT
    // =========================================
    return Response.json({
      success: true,
      message: `Test payment ${status} - Development mode only`,
      paymentId,
      status,
      testMode: true,
      warningDevelopmentOnlyEndpoint:
        'This endpoint only works in development. It will fail in production.',
    });
  } catch (error) {
    console.error('Test payment error:', error);
    return Response.json(
      { error: 'Failed to process test payment' },
      { status: 500 }
    );
  }
}
