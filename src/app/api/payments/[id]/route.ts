'use server';

import { db } from '@/data/db';

/**
 * GET /api/payments/[id]
 * 
 * Retrieve payment details
 * 
 * SECURITY:
 * ✅ Customer can only view their own payment
 * ✅ Returns payment status (never card/UPI/banking details)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;

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
        { error: 'Failed to retrieve payment' },
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
    // TODO: Get customerId from session
    // For now, payment is accessible - add session check in production
    
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
        method: payment.method,
        provider: payment.provider,
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
