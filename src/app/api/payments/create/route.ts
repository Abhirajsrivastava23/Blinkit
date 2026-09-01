import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Customer session required. Please log in.' }, { status: 401 });
    }

    const body = await request.json() as {
      orderId?: string;
      customerId?: string;
      amount?: number;
      paymentMethod?: string;
    };

    const { orderId } = body;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const cleanOrderId = decodeURIComponent(String(orderId)).trim();
    let order: any = null;
    try {
      const orderQuery = await db.query<any>('SELECT * FROM orders WHERE LOWER(id) = LOWER($1) LIMIT 1', [cleanOrderId]);
      if (orderQuery.rows.length > 0) {
        order = orderQuery.rows[0];
      }
    } catch (e) {
      console.warn('Order lookup warning in create payment:', e);
    }

    if (!order) {
      const orders = await db.readTable<any>('orders') || [];
      order = orders.find((o: any) => String(o.id || o.ID || '').trim().toLowerCase() === cleanOrderId.toLowerCase());
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const orderCustomer = String(order.customerId || '').toLowerCase();
    const orderEmail = String(order.customerEmail || '').toLowerCase();
    const sId = String(session.userId || '').toLowerCase();
    const sEmail = String(session.email || '').toLowerCase();

    if (session.role !== 'admin' && orderCustomer !== sId && orderCustomer !== sEmail && orderEmail !== sEmail && orderEmail !== sId) {
      return NextResponse.json({ error: 'Unauthorized: Order does not belong to this customer.' }, { status: 403 });
    }

    const serverTotal = Number(order.total || 0);
    const now = new Date().toISOString();

    // Check if payment transaction already exists
    let existingPayment = await db.getPaymentByOrderId(orderId);
    if (existingPayment) {
      return NextResponse.json({
        success: true,
        payment: {
          id: existingPayment.id,
          orderId: existingPayment.orderId,
          amount: Number(existingPayment.amount || serverTotal),
          currency: existingPayment.currency || 'INR',
          status: existingPayment.status,
          method: existingPayment.method || 'UPI',
          createdAt: existingPayment.createdAt,
        }
      });
    }

    const paymentId = `pay-${orderId}-${Date.now()}`;
    await db.query(
      `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, "createdAt", "updatedAt", "attemptCount")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT ("orderId") DO UPDATE SET amount = $4, "updatedAt" = $10`,
      [paymentId, orderId, session.userId, serverTotal, 'INR', 'NOT_STARTED', 'UPI', 'MANUAL_UPI', now, now, 0]
    );

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentId,
        orderId,
        amount: serverTotal,
        currency: 'INR',
        status: 'NOT_STARTED',
        method: 'UPI',
        createdAt: now,
      }
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Failed to create payment transaction.' }, { status: 500 });
  }
}
