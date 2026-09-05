import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DEPRECATED: Manual UPI QR generation has been decommissioned.
 * Payments are now handled natively via Razorpay Standard Checkout modal.
 */
export async function GET() {
  return NextResponse.json({
    error: 'Manual UPI QR generation has been decommissioned. Please use Razorpay Standard Checkout.',
    deprecated: true
  }, { status: 410 });
}

