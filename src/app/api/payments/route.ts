import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const rawPayments = await db.readTable<any>('payment_transactions') || [];
    const paymentList = [...rawPayments].sort((a: any, b: any) => {
      const timeA = new Date(a.submittedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const orders = await db.readTable<any>('orders') || [];
    const userMap = new Map<string, any>();
    const users = await db.readTable<any>('users') || [];
    for (const user of users) {
      userMap.set(String(user.userId || user.email).toLowerCase(), user);
    }

    const rows = paymentList.map((payment: any) => {
      const order = orders.find((o: any) => String(o.id).toLowerCase() === String(payment.orderId).toLowerCase());
      const user = userMap.get(String(payment.customerId).toLowerCase()) || null;

      return {
        id: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        customerName: user?.name || (order?.address && typeof order.address === 'object' ? (order.address as any).name : 'Customer'),
        customerEmail: user?.email || (order?.customerEmail) || payment.customerId,
        customerPhone: user?.phone || (order?.address && typeof order.address === 'object' ? (order.address as any).mobile : ''),
        amount: Number(payment.amount || order?.total || 0),
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
      const sId = String(session.userId || '').toLowerCase();
      const sEmail = String(session.email || '').toLowerCase();
      return NextResponse.json(rows.filter((row) => String(row.customerId).toLowerCase() === sId || String(row.customerEmail).toLowerCase() === sEmail));
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

