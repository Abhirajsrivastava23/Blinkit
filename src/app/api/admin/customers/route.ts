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
 * GET /api/admin/customers
 * Returns searchable list of registered customers for Admin Coupon Targeting
 */
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin session required.' }, { status: 403, headers: noStoreHeaders });
    }

    const rawUsers = await db.readTable<any>('users') || [];
    const customers = rawUsers
      .filter((u: any) => !u.role || u.role === 'customer')
      .map((u: any) => ({
        userId: String(u.userId || u.id || u.phone || u.email || ''),
        name: String(u.name || (u.email ? u.email.split('@')[0] : 'Customer')),
        email: String(u.email || ''),
        phone: String(u.phone || ''),
        createdAt: u.createdAt || null,
        wellnessAccessStatus: u.wellnessAccessStatus || 'NOT_REQUESTED'
      }));

    return NextResponse.json({
      success: true,
      count: customers.length,
      customers
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error fetching customers for admin:', err);
    return NextResponse.json({ error: 'Server error fetching customers.' }, { status: 500, headers: noStoreHeaders });
  }
}
