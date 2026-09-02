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

    const rowsMap = new Map<string, any>();

    for (const payment of paymentList) {
      const order = orders.find((o: any) => String(o.id).toLowerCase() === String(payment.orderId).toLowerCase());
      const user = userMap.get(String(payment.customerId).toLowerCase()) || null;
      const orderAddr = order?.address && typeof order.address === 'object' ? order.address : {};

      const row = {
        id: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        customerName: user?.name || orderAddr.name || 'Customer',
        customerEmail: user?.email || order?.customerEmail || payment.customerId,
        customerPhone: user?.phone || orderAddr.mobile || orderAddr.phone || '',
        amount: Number(payment.amount || order?.total || 0),
        status: payment.status || order?.paymentStatus || 'PENDING',
        utr: payment.utr || order?.utr || '',
        proofImageUrl: payment.proofImageUrl || order?.proofImageUrl || '',
        submittedAt: payment.submittedAt || order?.paymentSubmittedAt || payment.createdAt,
        verifiedAt: payment.verifiedAt || order?.paymentVerifiedAt,
        verifiedBy: payment.verifiedBy,
        rejectedAt: payment.rejectedAt || order?.paymentRejectedAt,
        rejectedBy: payment.rejectedBy,
        rejectionReason: payment.rejectionReason || order?.rejectionReason,
        orderStatus: order?.status || 'Pending',
        orderAmount: order?.total || payment.amount,
        updatedAt: payment.updatedAt || order?.updatedAt,
      };
      rowsMap.set(String(payment.orderId).toLowerCase(), row);
    }

    // Merge any orders with pending payment proof that may not have a payment_transactions row yet
    for (const order of orders) {
      const orderKey = String(order.id).toLowerCase();
      const isPendingProof = order.paymentStatus === 'PAYMENT_VERIFICATION_PENDING' || (order.utr && order.paymentStatus !== 'PAID');
      if (isPendingProof && !rowsMap.has(orderKey)) {
        const user = userMap.get(String(order.customerId || '').toLowerCase()) || null;
        const orderAddr = order.address && typeof order.address === 'object' ? order.address : {};
        rowsMap.set(orderKey, {
          id: `pay-${order.id}`,
          orderId: order.id,
          customerId: order.customerId,
          customerName: user?.name || orderAddr.name || 'Customer',
          customerEmail: user?.email || order.customerEmail || '',
          customerPhone: user?.phone || orderAddr.mobile || orderAddr.phone || '',
          amount: Number(order.total || 0),
          status: 'PAYMENT_VERIFICATION_PENDING',
          utr: order.utr || '',
          proofImageUrl: order.proofImageUrl || '',
          submittedAt: order.paymentSubmittedAt || order.createdAt,
          verifiedAt: order.paymentVerifiedAt,
          verifiedBy: undefined,
          rejectedAt: order.paymentRejectedAt,
          rejectedBy: undefined,
          rejectionReason: order.rejectionReason,
          orderStatus: order.status || 'Pending',
          orderAmount: order.total,
          updatedAt: order.updatedAt,
        });
      }
    }

    const rows = Array.from(rowsMap.values()).sort((a: any, b: any) => {
      const timeA = new Date(a.submittedAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
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

