import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DEPRECATED: Manual payment verification queue has been decommissioned.
 * All payments are verified online via Razorpay Gateway (/api/payments).
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    count: 0,
    pendingPayments: [],
    message: 'Manual payment queue has been decommissioned. All transactions are logged and verified automatically via Razorpay.'
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}

