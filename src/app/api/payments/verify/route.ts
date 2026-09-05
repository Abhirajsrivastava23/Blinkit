import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DEPRECATED: Manual payment verification has been decommissioned.
 * Payments are verified server-side with HMAC-SHA256 signatures via (/api/payments/razorpay/verify).
 */
export async function POST() {
  return NextResponse.json({
    error: 'Manual payment verification has been decommissioned. Payments are verified automatically via Razorpay HMAC signature verification.',
    deprecated: true,
    gateway: 'RAZORPAY',
    verifyUrl: '/api/payments/razorpay/verify'
  }, { status: 410 });
}

