import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    const body = await request.json().catch(() => ({}));

    const code = String(body.code || '').trim().toUpperCase();
    const subtotal = Number(body.subtotal) || 0;

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Please enter a coupon code.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    if (subtotal <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Add items to cart before applying coupon.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // Customer identity for targeted validation
    const customerInfo = session ? {
      userId: session.userId,
      email: session.email,
      phone: (session as any).phone
    } : undefined;

    const validation = await db.validateCoupon(code, subtotal, customerInfo);

    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, error: validation.error || 'Invalid coupon code.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const coupon = validation.coupon;

    return NextResponse.json({
      valid: true,
      discountAmount: validation.discountAmount || 0,
      discountType: coupon?.discountType || 'percentage',
      discountValue: coupon?.discountValue || 0,
      minSpend: coupon?.minSpend || 0,
      message: 'Coupon applied successfully'
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error validating coupon:', err);
    return NextResponse.json(
      { valid: false, error: 'Server error while validating coupon.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
