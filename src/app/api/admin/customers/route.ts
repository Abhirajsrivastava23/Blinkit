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
 * Returns live customer records from the database with actual order counts and total spend
 */
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin session required.' }, { status: 403, headers: noStoreHeaders });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

    // 1. Fetch real users from database
    const rawUsers = await db.getUsers(searchQuery);
    
    // Filter to customer role
    const customerUsers = rawUsers.filter((u: any) => !u.role || u.role === 'customer');

    // 2. Fetch real orders from database to accurately compute ordersCount & totalSpent
    const allOrders = await db.readTable<any>('orders') || [];

    // Map order counts & spend by customer identifiers
    const customerList = customerUsers.map((u: any) => {
      const uId = String(u.userId || '').toLowerCase().trim();
      const uEmail = String(u.email || '').toLowerCase().trim();
      const uPhone = String(u.phone || '').replace(/\D/g, '');

      // Find all matching orders
      const userOrders = allOrders.filter((ord: any) => {
        const ordCustId = String(ord.customerId || '').toLowerCase().trim();
        const ordCustEmail = String(ord.customerEmail || '').toLowerCase().trim();
        const ordPhone = String(ord.address?.mobile || '').replace(/\D/g, '');

        return (
          (uId && ordCustId === uId) ||
          (uEmail && ordCustEmail === uEmail) ||
          (uPhone && ordPhone && uPhone === ordPhone)
        );
      });

      const totalSpent = userOrders.reduce((sum: number, ord: any) => {
        const orderTotal = Number(ord.total) || 0;
        return sum + orderTotal;
      }, 0);

      return {
        userId: String(u.userId || ''),
        name: String(u.name || (u.email ? u.email.split('@')[0] : 'Customer')),
        email: String(u.email || ''),
        phone: String(u.phone || ''),
        createdAt: u.createdAt || null,
        lastLoginAt: u.lastLoginAt || null,
        ordersCount: userOrders.length,
        totalSpent: Math.round(totalSpent),
        wellnessAccessStatus: u.wellnessAccessStatus || 'NOT_REQUESTED',
        addressesCount: Array.isArray(u.addresses) ? u.addresses.length : 0
      };
    });

    return NextResponse.json({
      success: true,
      count: customerList.length,
      customers: customerList,
      timestamp: new Date().toISOString()
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error fetching admin customers registry:', err);
    return NextResponse.json({ error: 'Server error retrieving customers.' }, { status: 500, headers: noStoreHeaders });
  }
}
