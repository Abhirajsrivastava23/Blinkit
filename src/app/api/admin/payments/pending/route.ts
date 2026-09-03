import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 1. Strict Admin Authorization Check
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    // 2. Fetch fresh orders and payment transactions from DB
    const orders = await db.readTable<any>('orders') || [];
    const rawPayments = await db.readTable<any>('payment_transactions') || [];
    const users = await db.readTable<any>('users') || [];

    const userMap = new Map<string, any>();
    for (const u of users) {
      if (u.userId) userMap.set(String(u.userId).toLowerCase(), u);
      if (u.email) userMap.set(String(u.email).toLowerCase(), u);
    }

    const paymentMap = new Map<string, any>();
    for (const p of rawPayments) {
      if (p.orderId) {
        paymentMap.set(String(p.orderId).toLowerCase(), p);
      }
    }

    // 3. Filter orders that have pending payment verification
    const pendingOrders = orders.filter((o: any) => {
      const orderPayStatus = String(o.paymentStatus || '').toUpperCase();
      const p = paymentMap.get(String(o.id).toLowerCase());
      const txStatus = p ? String(p.status || '').toUpperCase() : '';

      return (
        orderPayStatus === 'PAYMENT_VERIFICATION_PENDING' ||
        txStatus === 'PAYMENT_VERIFICATION_PENDING' ||
        ((o.utr || p?.utr) && orderPayStatus !== 'PAID' && orderPayStatus !== 'REJECTED' && txStatus !== 'PAID' && txStatus !== 'REJECTED')
      );
    });

    // 4. Build sanitized response list
    const results = pendingOrders.map((order: any) => {
      const paymentTx = paymentMap.get(String(order.id).toLowerCase()) || {};
      const user = userMap.get(String(order.customerId || '').toLowerCase()) || 
                   userMap.get(String(order.customerEmail || '').toLowerCase()) || null;

      const orderAddr = (order.address && typeof order.address === 'object') ? order.address : {};

      // Items summary
      const itemsList = Array.isArray(order.items) ? order.items : [];
      const sanitizedItems = itemsList.map((item: any) => ({
        productId: item.productId || item.id || '',
        name: item.name || 'Product',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        image: item.image || item.imageUrl || '',
        unit: item.unit || '',
      }));

      const utr = paymentTx.utr || order.utr || '';
      const proofImageUrl = paymentTx.proofImageUrl || order.proofImageUrl || '';
      const submittedAt = paymentTx.submittedAt || order.paymentSubmittedAt || paymentTx.createdAt || order.createdAt;

      return {
        id: paymentTx.id || `pay-${order.id}`,
        orderId: order.id,
        customerId: order.customerId,
        customerName: orderAddr.name || user?.name || (order.customerEmail ? order.customerEmail.split('@')[0] : 'Customer'),
        customerEmail: order.customerEmail || user?.email || '',
        customerPhone: orderAddr.mobile || orderAddr.phone || user?.phone || '',
        amount: Number(order.total || paymentTx.amount || 0),
        subtotal: Number(order.subtotal || 0),
        deliveryFee: Number(order.deliveryFee || 0),
        discount: Number(order.discount || 0),
        status: 'PAYMENT_VERIFICATION_PENDING',
        orderStatus: order.status || 'Pending',
        utr: utr,
        proofImageUrl: proofImageUrl,
        submittedAt: submittedAt,
        orderCreatedAt: order.createdAt,
        itemsCount: itemsList.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0),
        items: sanitizedItems,
        deliveryLocationName: order.deliveryLocationName || 'Nawabganj, Unnao',
        deliveryOption: order.deliveryOption || 'ASAP',
      };
    });

    // Sort newest submission first
    results.sort((a, b) => {
      const timeA = new Date(a.submittedAt || a.orderCreatedAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.orderCreatedAt || 0).getTime();
      return timeB - timeA;
    });

    const resHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    return NextResponse.json({
      success: true,
      count: results.length,
      pendingPayments: results,
    }, { headers: resHeaders });
  } catch (error) {
    console.error('Error fetching admin pending payments:', error);
    return NextResponse.json({ error: 'Internal server error retrieving pending payments.' }, { status: 500 });
  }
}
