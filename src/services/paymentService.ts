/**
 * Payment Service
 * 
 * Handles all payment-related operations.
 * Designed as a clean abstraction layer that can work with different payment providers later.
 * Currently uses an "internal" provider model.
 * 
 * IMPORTANT:
 * - This service never directly marks payments as PAID without verification
 * - All payment logic is server-side
 * - Payment verification must happen before order confirmation
 * - No fake/automatic payment success
 */

import crypto from 'crypto';

export type PaymentStatus = 'PENDING' | 'PAYMENT_VERIFICATION_PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'FAILED' | 'CANCELLED' | 'REFUND_PENDING' | 'REFUNDED';
export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking' | 'Internal';
export type PaymentProvider = 'internal'; // Will extend this for real providers

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: 'INR';
  status: PaymentStatus;
  method: PaymentMethod;
  provider: PaymentProvider;
  transactionReference?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  failureReason?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: PaymentStatus;
  transactionReference?: string;
  failureReason?: string;
}

/**
 * PaymentService
 * 
 * Clean abstraction for payment operations
 */
class PaymentServiceClass {
  private readonly salt = process.env['AUTH_SECRET'] || 'fatafat_salt';

  /**
   * Create a new payment transaction
   * 
   * Called when customer initiates checkout
   * Creates PENDING payment record
   */
  createPayment(
    orderId: string,
    customerId: string,
    amount: number,
    method: PaymentMethod
  ): Payment {
    const paymentId = `PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    return {
      id: paymentId,
      orderId,
      customerId,
      amount,
      currency: 'INR',
      status: 'PENDING',
      method,
      provider: 'internal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attemptCount: 0,
    };
  }

  /**
   * Mark payment as PROCESSING
   * 
   * Called when payment form is submitted and processing begins
   */
  markProcessing(payment: Payment): Payment {
    return {
      ...payment,
      status: 'PROCESSING',
      lastAttemptAt: new Date().toISOString(),
      attemptCount: payment.attemptCount + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate payment verification reference
   * 
   * In production, this would be from the actual payment gateway
   * For now, we generate a reference and later verify it server-side
   */
  generateTransactionReference(): string {
    return `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Verify payment (server-side verification)
   * 
   * CRITICAL: This must verify the payment with the actual payment processor
   * For now, it's a placeholder for the verification logic
   * 
   * In production:
   * - Query the payment gateway with transactionReference
   * - Verify the amount matches
   * - Verify the customer matches
   * - Verify the status
   * - Only mark as PAID if all checks pass
   * 
   * Never trust client-provided payment status
   */
  async verifyPayment(
    transactionReference: string,
    expectedAmount: number,
    customerId: string
  ): Promise<PaymentVerificationResult> {
    // TODO: In production, implement actual payment gateway verification
    // Example (pseudocode):
    // 
    // const gatewayResponse = await paymentGateway.getTransactionStatus(transactionReference);
    // if (gatewayResponse.amount !== expectedAmount) {
    //   return { verified: false, status: 'FAILED', failureReason: 'Amount mismatch' };
    // }
    // if (gatewayResponse.customerId !== customerId) {
    //   return { verified: false, status: 'FAILED', failureReason: 'Customer mismatch' };
    // }
    // if (gatewayResponse.status === 'success') {
    //   return { verified: true, status: 'PAID', transactionReference };
    // }
    // return { verified: false, status: gatewayResponse.status, failureReason: gatewayResponse.failureMessage };

    // For now, placeholder that requires explicit verification
    // This should never mark a payment as PAID without real verification
    return {
      verified: false,
      status: 'PENDING',
      failureReason: 'Payment gateway integration not yet implemented. Use test payment endpoints for development.',
    };
  }

  /**
   * Mark payment as PAID
   * 
   * ONLY called after verification is successful
   * Never call this without proper verification
   */
  markPaid(payment: Payment, transactionReference: string): Payment {
    return {
      ...payment,
      status: 'PAID',
      transactionReference,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Mark payment as FAILED
   * 
   * Called when payment verification fails or customer's payment is declined
   */
  markFailed(payment: Payment, reason: string): Payment {
    return {
      ...payment,
      status: 'FAILED',
      failureReason: reason,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Mark payment as CANCELLED
   * 
   * Called when customer cancels payment
   */
  markCancelled(payment: Payment): Payment {
    return {
      ...payment,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Request refund
   * 
   * Called when order is cancelled after payment
   * Marks payment as REFUND_PENDING
   * Actual refund processing would be done separately
   */
  requestRefund(payment: Payment): Payment {
    if (payment.status !== 'PAID') {
      throw new Error(`Cannot refund payment with status ${payment.status}`);
    }

    return {
      ...payment,
      status: 'REFUND_PENDING',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Mark refund as completed
   * 
   * Called after actual refund has been processed
   */
  markRefunded(payment: Payment): Payment {
    return {
      ...payment,
      status: 'REFUNDED',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get payment status display text
   */
  getStatusText(status: PaymentStatus): string {
    const statusMap: Record<PaymentStatus, string> = {
      'PENDING': 'Payment Pending',
      'PAYMENT_VERIFICATION_PENDING': 'Payment Verification Pending',
      'PROCESSING': 'Processing Payment...',
      'PAID': 'Payment Successful',
      'REJECTED': 'Payment Rejected',
      'FAILED': 'Payment Failed',
      'CANCELLED': 'Payment Cancelled',
      'REFUND_PENDING': 'Refund Pending',
      'REFUNDED': 'Refunded',
    };
    return statusMap[status] || 'Unknown';
  }

  /**
   * Check if payment is confirmed (PAID)
   */
  isPaid(payment: Payment): boolean {
    return payment.status === 'PAID';
  }

  /**
   * Check if payment can be retried
   */
  canRetry(payment: Payment): boolean {
    return payment.status === 'FAILED' && payment.attemptCount < 3;
  }

  /**
   * Validate payment amount
   * 
   * Ensure amount matches expected order total
   */
  validateAmount(payment: Payment, expectedAmount: number): boolean {
    return Math.abs(payment.amount - expectedAmount) < 0.01; // floating point comparison
  }
}

// Export singleton instance
export const paymentService = new PaymentServiceClass();

export default paymentService;
