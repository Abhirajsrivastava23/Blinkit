import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const paymentRows = await db.query<any>(
      'SELECT * FROM payment_transactions ORDER BY "submittedAt" DESC NULLS LAST, "createdAt" DESC'
    );

    const orders = await db.readTable<any>('orders') || [];
    const userMap = new Map<string, any>();
    const users = await db.readTable<any>('users') || [];
    for (const user of users) {
      userMap.set(String(user.userId || user.email), user);
    }

    const rows = paymentRows.rows.map((payment: any) => {
      const order = orders.find((o: any) => String(o.id) === String(payment.orderId));
      const user = userMap.get(String(payment.customerId)) || null;

      return {
        id: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        customerName: user?.name || 'Customer',
        customerEmail: user?.email || payment.customerId,
        customerPhone: user?.phone || '',
        amount: Number(payment.amount || 0),
        status: payment.status,
        utr: payment.utr,
        proofImageUrl: payment.proofImageUrl,
        submittedAt: payment.submittedAt || payment.createdAt,
        verifiedAt: payment.verifiedAt,
        verifiedBy: payment.verifiedBy,
        rejectedAt: payment.rejectedAt,
        rejectedBy: payment.rejectedBy,
        rejectionReason: payment.rejectionReason,
        orderStatus: order?.status || 'Pending',
        orderAmount: order?.total || payment.amount,
        updatedAt: payment.updatedAt,
      };
    });

    if (session.role === 'customer') {
      return NextResponse.json(rows.filter((row) => String(row.customerId) === session.userId || String(row.customerEmail) === session.email));
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error('List payment submissions error:', error);
    return NextResponse.json({ error: 'Failed to retrieve payment submissions.' }, { status: 500 });
  }
}
