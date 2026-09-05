import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DEPRECATED: Manual payment screenshot uploads are no longer used.
 * Payments are handled directly via Razorpay Standard Checkout.
 */
export async function POST() {
  return NextResponse.json({
    error: 'Payment screenshot uploads are decommissioned. Please complete payment using Razorpay checkout.',
    deprecated: true
  }, { status: 410 });
}

