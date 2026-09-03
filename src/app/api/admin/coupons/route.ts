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

/**
 * GET /api/admin/coupons
 * Returns full list of coupons for Admin management
 */
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin session required.' }, { status: 403, headers: noStoreHeaders });
    }

    const coupons = await db.getCoupons(true); // include inactive

    return NextResponse.json({
      success: true,
      count: coupons.length,
      coupons
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error fetching admin coupons:', err);
    return NextResponse.json({ error: 'Server error retrieving coupons.' }, { status: 500, headers: noStoreHeaders });
  }
}

/**
 * POST /api/admin/coupons
 * Create or update a coupon
 */
export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin session required.' }, { status: 403, headers: noStoreHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const rawCode = String(body.code || '').trim().toUpperCase();

    if (!rawCode) {
      return NextResponse.json({ error: 'Coupon code is required.' }, { status: 400, headers: noStoreHeaders });
    }

    const discountType = String(body.discountType || 'percentage').toLowerCase() === 'flat' ? 'flat' : 'percentage';
    const discountValue = Number(body.discountValue);

    if (isNaN(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'Valid positive discount value is required.' }, { status: 400, headers: noStoreHeaders });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%.' }, { status: 400, headers: noStoreHeaders });
    }

    const targetAudience = String(body.targetAudience || 'ALL').toUpperCase() === 'SELECTED' ? 'SELECTED' : 'ALL';
    let selectedCustomerIds: string[] = [];
    if (targetAudience === 'SELECTED' && Array.isArray(body.selectedCustomerIds)) {
      selectedCustomerIds = body.selectedCustomerIds.map((id: any) => String(id).trim()).filter(Boolean);
      if (selectedCustomerIds.length === 0) {
        return NextResponse.json({ error: 'Please select at least 1 customer for targeted coupon.' }, { status: 400, headers: noStoreHeaders });
      }
    }

    const couponId = body.id || `coupon-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const couponPayload = {
      id: couponId,
      code: rawCode,
      discountType,
      discountValue,
      minSpend: body.minSpend ? Number(body.minSpend) : 0,
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
      startDate: body.startDate || null,
      expiryDate: body.expiryDate || null,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
      perCustomerLimit: body.perCustomerLimit ? Number(body.perCustomerLimit) : null,
      targetAudience,
      selectedCustomerIds,
      createdBy: session.email
    };

    const savedCoupon = await db.upsertCoupon(couponPayload);

    db.logActivity(
      session.email,
      `Created/Updated Promo Coupon ${rawCode}`,
      rawCode,
      'COUPONS',
      JSON.stringify({ discountType, discountValue, targetAudience })
    );

    return NextResponse.json({
      success: true,
      coupon: savedCoupon,
      message: 'Coupon saved successfully.'
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error creating/updating coupon:', err);
    return NextResponse.json({ error: 'Server error saving coupon.' }, { status: 500, headers: noStoreHeaders });
  }
}
