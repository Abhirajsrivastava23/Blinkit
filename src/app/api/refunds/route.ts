import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderIdParam = searchParams.get('orderId');

    const isAdmin = session.role === 'admin' || session.role === 'super_admin';

    // 1. Query for a specific order
    if (orderIdParam) {
      const cleanOrderId = orderIdParam.replace(/^#+/, '').trim();
      const requests = await db.getRefundRequestsByOrderId(cleanOrderId);

      if (!isAdmin && requests.length > 0) {
        const sessionUserId = String(session.userId || '').toLowerCase();
        const sessionEmail = String(session.email || '').toLowerCase();

        const belongsToUser = requests.some(r => {
          const cId = String(r.customerId || '').toLowerCase();
          const cEmail = String(r.customerEmail || '').toLowerCase();
          return (cId && (cId === sessionUserId || cId === sessionEmail)) ||
                 (cEmail && (cEmail === sessionEmail || cEmail === sessionUserId));
        });

        if (!belongsToUser) {
          // Check order ownership directly as fallback
          const order = await db.getOrderById(cleanOrderId);
          const orderCust = String(order?.customerId || '').toLowerCase();
          const orderEmail = String(order?.customerEmail || '').toLowerCase();
          if (orderCust !== sessionUserId && orderEmail !== sessionEmail) {
            return NextResponse.json({ error: 'Forbidden: Unauthorized access to order refund records.' }, { status: 403 });
          }
        }
      }

      return NextResponse.json({
        success: true,
        refundRequests: requests
      });
    }

    // 2. Query all refund requests for the authenticated customer
    if (!isAdmin) {
      const requests = await db.getRefundRequestsByCustomerId(session.userId || session.email);
      return NextResponse.json({
        success: true,
        refundRequests: requests
      });
    }

    // 3. Admin gets all requests
    const allRequests = await db.getAllRefundRequests();
    return NextResponse.json({
      success: true,
      refundRequests: allRequests
    });
  } catch (err) {
    console.error('Error fetching refund requests:', err);
    return NextResponse.json({ error: 'Internal server error retrieving refund records.' }, { status: 500 });
  }
}
