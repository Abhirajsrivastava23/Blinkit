'use server';

import { db } from '@/data/db';

/**
 * POST /api/payments/retry
 * 
 * Retry a failed payment
 * 
 * Allows customer to retry a failed payment up to 3 times total
 * Increments attempt counter
 * Resets payment status to PENDING for retry
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      paymentId: string;
      customerId?: string;
    };

    const { paymentId, customerId } = body;

    if (!paymentId) {
      return Response.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // =========================================
    // 1. FETCH PAYMENT FROM DATABASE
    // =========================================
    let payment: Record<string, unknown> | null = null;
    try {
      payment = await db.getPaymentById(paymentId);
    } catch (err) {
      console.error('Error fetching payment:', err);
      return Response.json(
        { error: 'Failed to process retry' },
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
    // 2. VERIFY CUSTOMER OWNERSHIP
    // =========================================
    if (customerId && payment.customerId !== customerId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // =========================================
    // 3. VERIFY PAYMENT CAN BE RETRIED
    // =========================================
    const status = payment.status as string;
    if (status !== 'FAILED') {
      return Response.json(
        { error: `Cannot retry payment with status: ${status}` },
        { status: 400 }
      );
    }

    const attemptCount = (payment.attemptCount as number) || 0;
    if (attemptCount >= 3) {
      return Response.json(
        { error: 'Maximum retry attempts (3) reached. Please contact support.' },
        { status: 400 }
      );
    }

    // =========================================
    // 4. INCREMENT RETRY COUNTER
    // =========================================
    try {
      await db.incrementPaymentRetry(paymentId);
    } catch (err) {
      console.error('Error incrementing retry counter:', err);
      return Response.json(
        { error: 'Failed to process retry' },
        { status: 500 }
      );
    }

    // =========================================
    // 5. RETURN UPDATED PAYMENT FOR RETRY
    // =========================================
    return Response.json({
      success: true,
      message: 'Payment retry initialized',
      paymentId,
      attemptCount: attemptCount + 1,
      maxAttempts: 3,
    });
  } catch (error) {
    console.error('Payment retry error:', error);
    return Response.json(
      { error: 'Failed to process payment retry' },
      { status: 500 }
    );
  }
}
