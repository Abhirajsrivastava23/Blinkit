import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { validateRole } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || '';
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

    let requests = await db.getAllRefundRequests(statusFilter ? { status: statusFilter } : undefined);

    // Fetch orders to enrich details if needed
    const allOrders = await db.getOrders().catch(() => []);
    const orderMap = new Map<string, any>();
    for (const o of allOrders) {
      const oid = String(o.id || '').replace(/^#+/, '').trim().toLowerCase();
      orderMap.set(oid, o);
    }

    let enriched = requests.map((req) => {
      const cleanOid = String(req.orderId).replace(/^#+/, '').trim().toLowerCase();
      const linkedOrder = orderMap.get(cleanOid);
      return {
        ...req,
        order: linkedOrder || null
      };
    });

    if (searchQuery) {
      enriched = enriched.filter((r) => {
        const idMatch = r.id.toLowerCase().includes(searchQuery);
        const orderMatch = r.orderId.toLowerCase().includes(searchQuery);
        const custMatch = (r.customerEmail || '').toLowerCase().includes(searchQuery) || (r.customerId || '').toLowerCase().includes(searchQuery);
        const rzpPayMatch = (r.razorpayPaymentId || '').toLowerCase().includes(searchQuery);
        const rzpRefMatch = (r.razorpayRefundId || '').toLowerCase().includes(searchQuery);
        const reasonMatch = (r.reason || '').toLowerCase().includes(searchQuery);
        const custNameMatch = (r.order?.address?.name || '').toLowerCase().includes(searchQuery);
        return idMatch || orderMatch || custMatch || rzpPayMatch || rzpRefMatch || reasonMatch || custNameMatch;
      });
    }

    return NextResponse.json({
      success: true,
      refundRequests: enriched,
      totalCount: enriched.length
    });
  } catch (err) {
    console.error('Admin refunds fetch error:', err);
    return NextResponse.json({ error: 'Failed to retrieve refund requests for admin dashboard.' }, { status: 500 });
  }
}
