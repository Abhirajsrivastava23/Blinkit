import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DEPRECATED: Manual UPI payment proof submission has been decommissioned.
 * Payments are now processed securely via Razorpay Standard Checkout (/api/payments/razorpay/create-order).
 */
export async function POST() {
  return NextResponse.json({
    error: 'Manual UPI proof submission has been decommissioned. Please use Razorpay Standard Checkout to complete your payment.',
    deprecated: true,
    gateway: 'RAZORPAY',
    createOrderUrl: '/api/payments/razorpay/create-order'
  }, { status: 410 });
}

