import { NextResponse } from 'next/server';
import { db } from '../../../../../data/db';
import { getSession } from '../../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * DELETE /api/admin/coupons/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin session required.' }, { status: 403, headers: noStoreHeaders });
    }

    const { id } = await params;
    const cleanId = String(id || '').trim();

    if (!cleanId) {
      return NextResponse.json({ error: 'Coupon ID is required.' }, { status: 400, headers: noStoreHeaders });
    }

    const coupon = await db.getCouponById(cleanId) || await db.getCouponByCode(cleanId);
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404, headers: noStoreHeaders });
    }

    await db.deleteCoupon(String(coupon.id));

    db.logActivity(
      session.email,
      `Deleted Promo Coupon ${coupon.code}`,
      String(coupon.code),
      'COUPONS',
      'DELETED'
    );

    return NextResponse.json({
      success: true,
      message: `Coupon ${coupon.code} deleted successfully.`
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    return NextResponse.json({ error: 'Server error deleting coupon.' }, { status: 500, headers: noStoreHeaders });
  }
}

/**
 * PATCH /api/admin/coupons/[id]
 * Toggle active status or update specific fields
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin session required.' }, { status: 403, headers: noStoreHeaders });
    }

    const { id } = await params;
    const cleanId = String(id || '').trim();
    const coupon = await db.getCouponById(cleanId) || await db.getCouponByCode(cleanId);

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404, headers: noStoreHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const updated = {
      ...coupon,
      ...body,
      id: coupon.id,
      code: body.code ? String(body.code).trim().toUpperCase() : coupon.code,
      updatedAt: new Date().toISOString()
    };

    const saved = await db.upsertCoupon(updated);

    return NextResponse.json({
      success: true,
      coupon: saved,
      message: 'Coupon updated successfully.'
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error updating coupon:', err);
    return NextResponse.json({ error: 'Server error updating coupon.' }, { status: 500, headers: noStoreHeaders });
  }
}
